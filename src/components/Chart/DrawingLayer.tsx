import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { DrawingObject, DrawingPoint } from '../../types/chart';
import { formatPrice } from '../../utils/formatters';
import { X } from 'lucide-react';

interface DrawingLayerProps {
  chart: IChartApi | null;
  candleSeries: ISeriesApi<'Candlestick'> | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  chart,
  candleSeries,
  containerRef,
}) => {
  const { activeTool, setActiveTool, drawings, addDrawing, removeDrawing } = useChart();

  // Temporary points during drawing
  const [startPoint, setStartPoint] = useState<DrawingPoint | null>(null);
  const [currentMousePoint, setCurrentMousePoint] = useState<DrawingPoint | null>(null);

  // Force re-render on chart pan/zoom
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();
    const handleRangeChange = () => setTick((t) => t + 1);
    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chart]);

  // Convert mouse event coordinates to chart time & price
  const getPointFromEvent = useCallback(
    (e: React.MouseEvent): DrawingPoint | null => {
      if (!chart || !candleSeries || !containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const time = chart.timeScale().coordinateToTime(x);
      const price = candleSeries.coordinateToPrice(y);

      if (time === null || price === null || isNaN(price)) return null;
      return { time: Number(time), price: Number(price.toFixed(1)) };
    },
    [chart, candleSeries, containerRef]
  );

  // Handle click to create points
  const handleLayerClick = (e: React.MouseEvent) => {
    if (activeTool === 'cursor') return;

    const pt = getPointFromEvent(e);
    if (!pt) return;

    if (activeTool === 'horizontal') {
      addDrawing({
        id: `horz_${Date.now()}`,
        type: 'horizontal',
        points: [pt],
        color: '#f7a600',
      });
      setActiveTool('cursor');
      setStartPoint(null);
      setCurrentMousePoint(null);
    } else if (activeTool === 'rectangle' || activeTool === 'trendline') {
      if (!startPoint) {
        // First click
        setStartPoint(pt);
      } else {
        // Second click
        addDrawing({
          id: `${activeTool}_${Date.now()}`,
          type: activeTool,
          points: [startPoint, pt],
          color: activeTool === 'rectangle' ? '#2962ff' : '#089981',
        });
        setStartPoint(null);
        setCurrentMousePoint(null);
        setActiveTool('cursor');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'cursor' || !startPoint) return;
    const pt = getPointFromEvent(e);
    if (pt) {
      setCurrentMousePoint(pt);
    }
  };

  // Convert chart time & price to pixel coordinates
  const getCoordinates = (p: DrawingPoint): { x: number | null; y: number | null } => {
    if (!chart || !candleSeries) return { x: null, y: null };
    const x = chart.timeScale().timeToCoordinate(p.time as Time);
    const y = candleSeries.priceToCoordinate(p.price);
    return {
      x: x !== null ? Number(x) : null,
      y: y !== null ? Number(y) : null,
    };
  };

  const isDrawing = activeTool !== 'cursor';

  return (
    <div
      onClick={handleLayerClick}
      onMouseMove={handleMouseMove}
      className={`absolute inset-0 z-10 ${
        isDrawing ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <svg className="w-full h-full overflow-hidden">
        {/* Render Saved Drawings */}
        {drawings.map((drawing) => {
          if (drawing.type === 'rectangle' && drawing.points.length >= 2) {
            const p1 = getCoordinates(drawing.points[0]);
            const p2 = getCoordinates(drawing.points[1]);
            if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
              return null;
            }

            const minX = Math.min(p1.x, p2.x);
            const maxX = Math.max(p1.x, p2.x);
            const minY = Math.min(p1.y, p2.y);
            const maxY = Math.max(p1.y, p2.y);
            const width = Math.max(2, maxX - minX);
            const height = Math.max(2, maxY - minY);

            return (
              <g key={drawing.id} className="group">
                <rect
                  x={minX}
                  y={minY}
                  width={width}
                  height={height}
                  fill="rgba(41, 98, 255, 0.22)"
                  stroke={drawing.color || '#2962ff'}
                  strokeWidth="1.5"
                  className="transition-opacity hover:fill-[rgba(41,98,255,0.35)] cursor-pointer pointer-events-auto"
                />
                {/* Delete button on hover */}
                <g
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDrawing(drawing.id);
                  }}
                  transform={`translate(${maxX - 16}, ${minY + 4})`}
                >
                  <circle cx="6" cy="6" r="8" fill="#1e222d" stroke="#f23645" strokeWidth="1" />
                  <line x1="3" y1="3" x2="9" y2="9" stroke="#f23645" strokeWidth="1.5" />
                  <line x1="9" y1="3" x2="3" y2="9" stroke="#f23645" strokeWidth="1.5" />
                </g>
              </g>
            );
          }

          if (drawing.type === 'horizontal' && drawing.points.length >= 1) {
            const p = getCoordinates(drawing.points[0]);
            if (p.y === null) return null;

            return (
              <g key={drawing.id} className="group">
                <line
                  x1="0"
                  y1={p.y}
                  x2="100%"
                  y2={p.y}
                  stroke={drawing.color || '#f7a600'}
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                  className="cursor-pointer pointer-events-auto"
                />
                <g
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDrawing(drawing.id);
                  }}
                  transform={`translate(60, ${p.y - 8})`}
                >
                  <rect x="0" y="0" width="16" height="16" rx="4" fill="#1e222d" stroke="#f23645" />
                  <line x1="4" y1="4" x2="12" y2="12" stroke="#f23645" strokeWidth="1.5" />
                  <line x1="12" y1="4" x2="4" y2="12" stroke="#f23645" strokeWidth="1.5" />
                </g>
              </g>
            );
          }

          if (drawing.type === 'trendline' && drawing.points.length >= 2) {
            const p1 = getCoordinates(drawing.points[0]);
            const p2 = getCoordinates(drawing.points[1]);
            if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
              return null;
            }

            return (
              <g key={drawing.id} className="group">
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={drawing.color || '#089981'}
                  strokeWidth="2"
                  className="cursor-pointer pointer-events-auto"
                />
                <circle cx={p1.x} cy={p1.y} r="3" fill={drawing.color || '#089981'} />
                <circle cx={p2.x} cy={p2.y} r="3" fill={drawing.color || '#089981'} />
              </g>
            );
          }

          return null;
        })}

        {/* Live Preview while Drawing */}
        {startPoint && currentMousePoint && (
          <>
            {activeTool === 'rectangle' && (() => {
              const p1 = getCoordinates(startPoint);
              const p2 = getCoordinates(currentMousePoint);
              if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return null;

              const minX = Math.min(p1.x, p2.x);
              const maxX = Math.max(p1.x, p2.x);
              const minY = Math.min(p1.y, p2.y);
              const maxY = Math.max(p1.y, p2.y);

              return (
                <rect
                  x={minX}
                  y={minY}
                  width={Math.max(2, maxX - minX)}
                  height={Math.max(2, maxY - minY)}
                  fill="rgba(41, 98, 255, 0.25)"
                  stroke="#2962ff"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              );
            })()}

            {activeTool === 'trendline' && (() => {
              const p1 = getCoordinates(startPoint);
              const p2 = getCoordinates(currentMousePoint);
              if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return null;

              return (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#089981"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              );
            })()}
          </>
        )}
      </svg>
    </div>
  );
};
