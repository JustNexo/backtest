import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { formatPrice } from '../../utils/formatters';

interface SessionsLayerProps {
  chart: IChartApi | null;
  candleSeries: ISeriesApi<'Candlestick'> | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const SessionsLayer: React.FC<SessionsLayerProps> = ({
  chart,
  candleSeries,
  containerRef,
}) => {
  const { visibleCandles, sessionsSettings, symbolInfo } = useChart();
  const [, setTick] = useState(0);

  // 60 FPS sync during chart zoom/pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !chart) return;

    let rafId: number | null = null;
    let wheelTimer: any = null;

    const tickFrame = () => {
      setTick((t) => (t + 1) % 1000000);
      rafId = requestAnimationFrame(tickFrame);
    };

    const startActiveSync = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(tickFrame);
      }
    };

    const stopActiveSync = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const handleMouseDown = () => startActiveSync();
    const handleMouseUp = () => {
      stopActiveSync();
      setTick((t) => (t + 1) % 1000000);
    };
    const handleWheel = () => {
      startActiveSync();
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        stopActiveSync();
        setTick((t) => (t + 1) % 1000000);
      }, 300);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: true });

    const handleTimeRangeChange = () => {
      setTick((t) => (t + 1) % 1000000);
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);

    return () => {
      stopActiveSync();
      if (wheelTimer) clearTimeout(wheelTimer);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      try {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
      } catch (e) {}
    };
  }, [chart, containerRef]);

  // Compute session segments
  const sessionSegments = useMemo(() => {
    if (!sessionsSettings.enabled || !visibleCandles || visibleCandles.length === 0) {
      return [];
    }

    const segments: Array<{
      sessionId: string;
      name: string;
      label: string;
      color: string;
      bgOpacity: number;
      showHighLow: boolean;
      showLabel: boolean;
      startCandle: typeof visibleCandles[0];
      endCandle: typeof visibleCandles[0];
      high: number;
      low: number;
    }> = [];

    // Group candles by UTC day
    const candlesByDay = new Map<number, typeof visibleCandles>();
    for (const c of visibleCandles) {
      const dayStart = Math.floor(c.time / 86400) * 86400;
      let dayList = candlesByDay.get(dayStart);
      if (!dayList) {
        dayList = [];
        candlesByDay.set(dayStart, dayList);
      }
      dayList.push(c);
    }

    // Filter to last N days if maxDays is set
    let allowedDays = Array.from(candlesByDay.keys()).sort((a, b) => a - b);
    const maxDays = sessionsSettings.maxDays ?? 3;
    if (maxDays > 0 && allowedDays.length > maxDays) {
      allowedDays = allowedDays.slice(-maxDays);
    }
    const allowedDaysSet = new Set(allowedDays);

    const activeSessions = Object.values(sessionsSettings.sessions).filter((s) => s.enabled);

    candlesByDay.forEach((dayCandles, dayStart) => {
      if (!allowedDaysSet.has(dayStart)) return;

      for (const sess of activeSessions) {
        const startSec = dayStart + sess.startHour * 3600 + sess.startMinute * 60;
        let endSec = dayStart + sess.endHour * 3600 + sess.endMinute * 60;
        if (endSec <= startSec) {
          endSec += 86400; // Overnight session
        }

        const inSession = dayCandles.filter((c) => c.time >= startSec && c.time <= endSec);
        if (inSession.length > 0) {
          let high = -Infinity;
          let low = Infinity;
          for (const c of inSession) {
            if (c.high > high) high = c.high;
            if (c.low < low) low = c.low;
          }

          segments.push({
            sessionId: sess.id,
            name: sess.name,
            label: sess.label || (sess.id === 'asia' ? 'Tokyo' : sess.id === 'london' ? 'London' : sess.id === 'lunch' ? 'Lunch' : sess.id === 'newyork' ? 'NY' : sess.name.split(' ')[0]),
            color: sess.color,
            bgOpacity: sess.bgOpacity || 0.08,
            showHighLow: sess.showHighLow && sessionsSettings.showHighLow,
            showLabel: sess.showLabel && sessionsSettings.showLabels,
            startCandle: inSession[0],
            endCandle: inSession[inSession.length - 1],
            high,
            low,
          });
        }
      }
    });

    return segments;
  }, [visibleCandles, sessionsSettings]);

  if (!sessionsSettings.enabled || !chart || !candleSeries || sessionSegments.length === 0) {
    return null;
  }

  const container = containerRef.current;
  const containerWidth = container?.clientWidth || 800;
  const containerHeight = container?.clientHeight || 600;
  const isBoxStyle = (sessionsSettings.renderStyle || 'box') === 'box';
  const showMidline = !!sessionsSettings.showMidline;
  const extendLines = !!sessionsSettings.extendHighLow;
  const isDetailed = sessionsSettings.highLowStyle === 'detailed';

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden"
      style={{ width: containerWidth, height: containerHeight }}
    >
      {sessionSegments.map((seg, idx) => {
        const startX = chart.timeScale().timeToCoordinate(seg.startCandle.time as Time);
        const endX = chart.timeScale().timeToCoordinate(seg.endCandle.time as Time);

        if (startX === null && endX === null) return null;

        const x1 = startX !== null ? startX : -100;
        const x2 = endX !== null ? endX : containerWidth + 100;

        const left = Math.min(x1, x2) - 3;
        const width = Math.max(8, Math.abs(x2 - x1) + 6);

        const highY = candleSeries.priceToCoordinate(seg.high);
        const lowY = candleSeries.priceToCoordinate(seg.low);

        if (highY === null || lowY === null) return null;

        const boxTop = Math.min(highY, lowY);
        const boxBottom = Math.max(highY, lowY);
        const boxHeight = Math.max(4, boxBottom - boxTop);
        const midY = (boxTop + boxBottom) / 2;

        return (
          <g key={`${seg.sessionId}_${idx}`}>
            {isBoxStyle ? (
              /* CLEAN RANGE BOX: Wraps only session candles High to Low */
              <g>
                <rect
                  x={left}
                  y={boxTop}
                  width={width}
                  height={boxHeight}
                  rx={0}
                  fill={seg.color}
                  fillOpacity={seg.bgOpacity}
                  stroke={seg.color}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  strokeOpacity={0.85}
                />

                {/* Optional 50% Equilibrium (EQ) midline */}
                {showMidline && (
                  <line
                    x1={left}
                    y1={midY}
                    x2={left + width}
                    y2={midY}
                    stroke={seg.color}
                    strokeWidth={1}
                    strokeDasharray="2 3"
                    strokeOpacity={0.4}
                  />
                )}

                {/* Optional Extended High/Low lines into future */}
                {extendLines && (
                  <>
                    <line
                      x1={left + width}
                      y1={boxTop}
                      x2={containerWidth}
                      y2={boxTop}
                      stroke={seg.color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                    <line
                      x1={left + width}
                      y1={boxBottom}
                      x2={containerWidth}
                      y2={boxBottom}
                      stroke={seg.color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                  </>
                )}

                {/* Clean Session Name placed OUTSIDE ABOVE the Box (TradingView style) */}
                {seg.showLabel && (
                  <text
                    x={left + 4}
                    y={boxTop - 4}
                    fill={seg.color}
                    fontSize="10"
                    fontFamily="sans-serif"
                    fontWeight="600"
                    className="select-none tracking-wide"
                  >
                    {seg.label}
                  </text>
                )}

                {/* Detailed High/Low Price Tag if requested */}
                {seg.showHighLow && isDetailed && (
                  <>
                    <text
                      x={left + width - 4}
                      y={boxTop - 3}
                      textAnchor="end"
                      fill={seg.color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="500"
                      className="select-none opacity-80"
                    >
                      H: {formatPrice(seg.high, symbolInfo.pricePrecision)}
                    </text>
                    <text
                      x={left + width - 4}
                      y={boxBottom + 10}
                      textAnchor="end"
                      fill={seg.color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="500"
                      className="select-none opacity-80"
                    >
                      L: {formatPrice(seg.low, symbolInfo.pricePrecision)}
                    </text>
                  </>
                )}
              </g>
            ) : (
              /* VERTICAL COLUMN MODE */
              <g>
                <rect
                  x={left}
                  y={0}
                  width={width}
                  height={containerHeight}
                  fill={seg.color}
                  fillOpacity={seg.bgOpacity}
                />
                <line
                  x1={left}
                  y1={0}
                  x2={left}
                  y2={containerHeight}
                  stroke={seg.color}
                  strokeWidth={1}
                  strokeOpacity={0.35}
                  strokeDasharray="2 4"
                />
                <line
                  x1={left + width}
                  y1={0}
                  x2={left + width}
                  y2={containerHeight}
                  stroke={seg.color}
                  strokeWidth={1}
                  strokeOpacity={0.35}
                  strokeDasharray="2 4"
                />

                {seg.showHighLow && (
                  <>
                    <line
                      x1={left}
                      y1={boxTop}
                      x2={left + width}
                      y2={boxTop}
                      stroke={seg.color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={left}
                      y1={boxBottom}
                      x2={left + width}
                      y2={boxBottom}
                      stroke={seg.color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    {isDetailed && (
                      <text
                        x={left + 4}
                        y={boxTop - 3}
                        fill={seg.color}
                        fontSize="9"
                        fontFamily="monospace"
                        className="select-none opacity-80"
                      >
                        {seg.name.split(' ')[0]} H: {formatPrice(seg.high, symbolInfo.pricePrecision)}
                      </text>
                    )}
                  </>
                )}

                {seg.showLabel && (
                  <g transform={`translate(${left + 4}, 20)`}>
                    <rect
                      x={0}
                      y={0}
                      width={seg.name.split(' ')[0].length * 6 + 10}
                      height={14}
                      rx={3}
                      fill="#131722"
                      fillOpacity={0.8}
                      stroke={seg.color}
                      strokeWidth={1}
                    />
                    <text
                      x={5}
                      y={10}
                      fill={seg.color}
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight="600"
                      className="select-none"
                    >
                      {seg.name.split(' ')[0]}
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
