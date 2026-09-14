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

    const activeSessions = Object.values(sessionsSettings.sessions).filter((s) => s.enabled);

    candlesByDay.forEach((dayCandles, dayStart) => {
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
            color: sess.color,
            bgOpacity: sess.bgOpacity,
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

        const left = Math.min(x1, x2) - 4;
        const width = Math.max(12, Math.abs(x2 - x1) + 8);

        const highY = candleSeries.priceToCoordinate(seg.high);
        const lowY = candleSeries.priceToCoordinate(seg.low);

        return (
          <g key={`${seg.sessionId}_${idx}`}>
            {/* Background vertical tint */}
            <rect
              x={left}
              y={0}
              width={width}
              height={containerHeight}
              fill={seg.color}
              fillOpacity={seg.bgOpacity}
            />

            {/* Session Left and Right Border lines */}
            <line
              x1={left}
              y1={0}
              x2={left}
              y2={containerHeight}
              stroke={seg.color}
              strokeWidth={1}
              strokeOpacity={0.4}
              strokeDasharray="2 4"
            />
            <line
              x1={left + width}
              y1={0}
              x2={left + width}
              y2={containerHeight}
              stroke={seg.color}
              strokeWidth={1}
              strokeOpacity={0.4}
              strokeDasharray="2 4"
            />

            {/* High / Low boundary levels */}
            {seg.showHighLow && highY !== null && (
              <g>
                <line
                  x1={left}
                  y1={highY}
                  x2={left + width}
                  y2={highY}
                  stroke={seg.color}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <text
                  x={left + 6}
                  y={highY - 4}
                  fill={seg.color}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none opacity-90"
                >
                  {seg.name.split(' ')[0]} H: ${formatPrice(seg.high, symbolInfo.precision)}
                </text>
              </g>
            )}

            {seg.showHighLow && lowY !== null && (
              <g>
                <line
                  x1={left}
                  y1={lowY}
                  x2={left + width}
                  y2={lowY}
                  stroke={seg.color}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <text
                  x={left + 6}
                  y={lowY + 11}
                  fill={seg.color}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none opacity-90"
                >
                  {seg.name.split(' ')[0]} L: ${formatPrice(seg.low, symbolInfo.precision)}
                </text>
              </g>
            )}

            {/* Top Session Title Label */}
            {seg.showLabel && (
              <g transform={`translate(${left + 6}, 22)`}>
                <rect
                  x={0}
                  y={0}
                  width={seg.name.length * 6.5 + 12}
                  height={16}
                  rx={4}
                  fill="#131722"
                  fillOpacity={0.85}
                  stroke={seg.color}
                  strokeWidth={1}
                />
                <text
                  x={6}
                  y={11}
                  fill={seg.color}
                  fontSize="9"
                  fontFamily="sans-serif"
                  fontWeight="600"
                  className="select-none"
                >
                  {seg.name}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
