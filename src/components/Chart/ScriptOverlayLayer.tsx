import React, { useState, useEffect } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { formatPrice } from '../../utils/formatters';

interface ScriptOverlayLayerProps {
  chart: IChartApi | null;
  candleSeries: ISeriesApi<'Candlestick'> | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const ScriptOverlayLayer: React.FC<ScriptOverlayLayerProps> = ({
  chart,
  candleSeries,
  containerRef,
}) => {
  const { scriptOutput, symbolInfo } = useChart();
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

  if (!scriptOutput || !scriptOutput.boxes || scriptOutput.boxes.length === 0 || !chart || !candleSeries) {
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
      {scriptOutput.boxes.map((box) => {
        const startX = chart.timeScale().timeToCoordinate(box.startTime as Time);
        const endX = chart.timeScale().timeToCoordinate(box.endTime as Time);

        if (startX === null && endX === null) return null;

        const x1 = startX !== null ? startX : -100;
        const x2 = endX !== null ? endX : containerWidth + 100;

        const left = Math.min(x1, x2);
        const width = Math.max(10, Math.abs(x2 - x1));

        const highY = candleSeries.priceToCoordinate(box.high);
        const lowY = candleSeries.priceToCoordinate(box.low);

        if (highY === null && lowY === null) return null;

        const top = Math.min(highY ?? 0, lowY ?? containerHeight);
        const height = Math.max(4, Math.abs((lowY ?? containerHeight) - (highY ?? 0)));

        return (
          <g key={box.id}>
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              fill={box.color}
              fillOpacity={box.fillOpacity !== undefined ? box.fillOpacity : 0.2}
              stroke={box.color}
              strokeWidth={1}
              strokeDasharray="3 3"
              rx={2}
            />

            {box.label && (
              <text
                x={left + 4}
                y={top + 12}
                fill={box.color}
                fontSize="10"
                fontFamily="sans-serif"
                fontWeight="bold"
                className="select-none drop-shadow-sm"
              >
                {box.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
