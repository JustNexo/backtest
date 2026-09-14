import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { DrawingObject, DrawingPoint } from '../../types/chart';
import { formatPrice } from '../../utils/formatters';
import { Trash2, Copy, Check, X } from 'lucide-react';

interface DrawingLayerProps {
  chart: IChartApi | null;
  candleSeries: ISeriesApi<'Candlestick'> | null;
  containerRef: React.RefObject<HTMLDivElement>;
}

type HandleType =
  | 'move'
  | 'rect_nw'
  | 'rect_n'
  | 'rect_ne'
  | 'rect_e'
  | 'rect_se'
  | 'rect_s'
  | 'rect_sw'
  | 'rect_w'
  | 'line_p1'
  | 'line_p2'
  | 'horz_price';

interface DragState {
  drawingId: string;
  handle: HandleType;
  startMousePoint: DrawingPoint;
  initialPoints: DrawingPoint[];
}

const PALETTE_COLORS = [
  { name: 'Blue', stroke: '#2962ff', fill: 'rgba(41, 98, 255, 0.22)' },
  { name: 'Emerald', stroke: '#089981', fill: 'rgba(8, 153, 129, 0.22)' },
  { name: 'Red', stroke: '#f23645', fill: 'rgba(242, 54, 69, 0.22)' },
  { name: 'Amber', stroke: '#f7a600', fill: 'rgba(247, 166, 0, 0.22)' },
  { name: 'Purple', stroke: '#ab47bc', fill: 'rgba(171, 71, 188, 0.22)' },
  { name: 'Gray', stroke: '#9598a1', fill: 'rgba(149, 152, 161, 0.22)' },
];

function getTimeframeSeconds(tf: string): number {
  switch (tf) {
    case '1m': return 60;
    case '3m': return 180;
    case '5m': return 300;
    case '15m': return 900;
    case '30m': return 1800;
    case '1h': return 3600;
    case '2h': return 7200;
    case '4h': return 14400;
    case '1d': return 86400;
    case '1w': return 604800;
    default: return 300;
  }
}

function hexOrRgbToRgba(color: string, opacity: number): string {
  if (opacity === 0) return 'transparent';
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${opacity})`;
    }
  }
  return color;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  chart,
  candleSeries,
  containerRef,
}) => {
  const {
    activeTool,
    setActiveTool,
    selectedDrawingId,
    setSelectedDrawingId,
    drawings,
    addDrawing,
    updateDrawing,
    removeDrawing,
    visibleCandles,
    timeframe,
    registerViewportCenterGetter,
  } = useChart();

  const [dragState, setDragState] = useState<DragState | null>(null);

  // Temporary points while initially creating a drawing
  const [startPoint, setStartPoint] = useState<DrawingPoint | null>(null);
  const [currentMousePoint, setCurrentMousePoint] = useState<DrawingPoint | null>(null);

  // Interaction guards to prevent premature deselection
  const preventDeselectRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const isMouseDownForCreationRef = useRef(false);
  const creationStartScreenRef = useRef<{ x: number; y: number } | null>(null);

  // Force re-render on chart pan/zoom
  const [, setTick] = useState(0);

  // Register viewport center getter
  useEffect(() => {
    registerViewportCenterGetter(() => {
      if (!chart || !candleSeries || !containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      let time = chart.timeScale().coordinateToTime(centerX);
      if (time === null && visibleCandles.length > 0) {
        const logical = chart.timeScale().coordinateToLogical(centerX);
        if (logical !== null) {
          const roundIdx = Math.round(logical);
          if (roundIdx >= 0 && roundIdx < visibleCandles.length) {
            time = visibleCandles[roundIdx].time as Time;
          } else if (roundIdx >= visibleCandles.length) {
            const lastCandle = visibleCandles[visibleCandles.length - 1];
            const tfSec = getTimeframeSeconds(timeframe);
            const diffBars = roundIdx - (visibleCandles.length - 1);
            time = (lastCandle.time + diffBars * tfSec) as Time;
          } else {
            const firstCandle = visibleCandles[0];
            const tfSec = getTimeframeSeconds(timeframe);
            time = (firstCandle.time + roundIdx * tfSec) as Time;
          }
        }
      }

      const price = candleSeries.coordinateToPrice(centerY);
      if (time === null || price === null || isNaN(price)) return null;
      return { time: Number(time), price: Number(price.toFixed(1)) };
    });

    return () => {
      registerViewportCenterGetter(() => null);
    };
  }, [chart, candleSeries, containerRef, visibleCandles, timeframe, registerViewportCenterGetter]);

  // Click on empty chart to deselect active drawing (guarded so it NEVER deselects when interacting with a drawing or toolbar!)
  useEffect(() => {
    if (!chart) return;
    const handleClick = () => {
      if (preventDeselectRef.current || wasDraggingRef.current) {
        return;
      }
      if (activeTool === 'cursor') {
        setSelectedDrawingId(null);
      }
    };
    chart.subscribeClick(handleClick);
    return () => {
      chart.unsubscribeClick(handleClick);
    };
  }, [chart, activeTool, setSelectedDrawingId]);

  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();
    const handleRangeChange = () => setTick((t) => t + 1);
    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chart]);

  // Convert mouse event coordinates to chart time & price (resilient across whole canvas)
  const getPointFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent): DrawingPoint | null => {
      if (!chart || !candleSeries || !containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let time = chart.timeScale().coordinateToTime(x);
      if (time === null && visibleCandles.length > 0) {
        const logical = chart.timeScale().coordinateToLogical(x);
        if (logical !== null) {
          const roundIdx = Math.round(logical);
          if (roundIdx >= 0 && roundIdx < visibleCandles.length) {
            time = visibleCandles[roundIdx].time as Time;
          } else if (roundIdx >= visibleCandles.length) {
            const lastCandle = visibleCandles[visibleCandles.length - 1];
            const tfSec = getTimeframeSeconds(timeframe);
            const diffBars = roundIdx - (visibleCandles.length - 1);
            time = (lastCandle.time + diffBars * tfSec) as Time;
          } else {
            const firstCandle = visibleCandles[0];
            const tfSec = getTimeframeSeconds(timeframe);
            time = (firstCandle.time + roundIdx * tfSec) as Time;
          }
        }
      }

      const price = candleSeries.coordinateToPrice(y);
      if (time === null || price === null || isNaN(price)) return null;
      return { time: Number(time), price: Number(price.toFixed(1)) };
    },
    [chart, candleSeries, containerRef, visibleCandles, timeframe]
  );

  // Convert chart time & price to pixel coordinates
  const getCoordinates = useCallback(
    (p: DrawingPoint): { x: number | null; y: number | null } => {
      if (!chart || !candleSeries) return { x: null, y: null };

      let xCoord: number | null = null;
      const rawX = chart.timeScale().timeToCoordinate(p.time as Time);
      if (rawX !== null) {
        xCoord = Number(rawX);
      } else if (visibleCandles.length > 0) {
        let low = 0;
        let high = visibleCandles.length - 1;
        while (low <= high) {
          const mid = (low + high) >> 1;
          if (visibleCandles[mid].time < p.time) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        const idx = Math.min(Math.max(0, low), visibleCandles.length - 1);
        const candle = visibleCandles[idx];
        if (candle) {
          const cX = chart.timeScale().timeToCoordinate(candle.time as Time);
          if (cX !== null) {
            if (p.time > candle.time) {
              const tfSec = getTimeframeSeconds(timeframe);
              const extraBars = (p.time - candle.time) / tfSec;
              const barSpacing = chart.timeScale().options().barSpacing || 8;
              xCoord = Number(cX) + extraBars * barSpacing;
            } else {
              xCoord = Number(cX);
            }
          }
        }
      }

      const yCoord = candleSeries.priceToCoordinate(p.price);
      return {
        x: xCoord,
        y: yCoord !== null ? Number(yCoord) : null,
      };
    },
    [chart, candleSeries, visibleCandles, timeframe]
  );

  const finalizeCreation = useCallback(
    (p1: DrawingPoint, p2: DrawingPoint) => {
      preventDeselectRef.current = true;
      const newId = `${activeTool}_${Date.now()}`;

      if (activeTool === 'horizontal') {
        addDrawing({
          id: newId,
          type: 'horizontal',
          points: [p1],
          color: '#f7a600',
          lineWidth: 2,
        });
      } else if (activeTool === 'rectangle') {
        addDrawing({
          id: newId,
          type: 'rectangle',
          points: [p1, p2],
          color: '#2962ff',
          fillColor: 'rgba(41, 98, 255, 0.22)',
          fillOpacity: 0.22,
          lineWidth: 2,
          lineStyle: 'solid',
        });
      } else if (activeTool === 'trendline') {
        addDrawing({
          id: newId,
          type: 'trendline',
          points: [p1, p2],
          color: '#089981',
          lineWidth: 2,
        });
      }

      setStartPoint(null);
      setCurrentMousePoint(null);
      setActiveTool('cursor');
      setSelectedDrawingId(newId);

      setTimeout(() => {
        preventDeselectRef.current = false;
      }, 300);
    },
    [activeTool, addDrawing, setActiveTool, setSelectedDrawingId]
  );

  const handleMouseDownCreation = (e: React.MouseEvent) => {
    if (activeTool === 'cursor') return;
    const pt = getPointFromEvent(e);
    if (!pt) return;

    isMouseDownForCreationRef.current = true;
    creationStartScreenRef.current = { x: e.clientX, y: e.clientY };

    if (!startPoint) {
      setStartPoint(pt);
      setCurrentMousePoint(pt);
    }
  };

  const handleMouseMoveCreation = (e: React.MouseEvent) => {
    if (activeTool === 'cursor' || !startPoint) return;
    const pt = getPointFromEvent(e);
    if (pt) {
      setCurrentMousePoint(pt);
    }
  };

  const handleMouseUpCreation = (e: React.MouseEvent) => {
    if (activeTool === 'cursor' || !startPoint) return;
    const pt = getPointFromEvent(e);
    if (!pt) return;

    if (creationStartScreenRef.current) {
      const dx = Math.abs(e.clientX - creationStartScreenRef.current.x);
      const dy = Math.abs(e.clientY - creationStartScreenRef.current.y);
      if (dx > 12 || dy > 12) {
        finalizeCreation(startPoint, pt);
        isMouseDownForCreationRef.current = false;
        creationStartScreenRef.current = null;
        return;
      }
    }

    isMouseDownForCreationRef.current = false;
  };

  // Handle drawing creation clicks
  const handleLayerClick = (e: React.MouseEvent) => {
    if (activeTool === 'cursor') {
      if (!preventDeselectRef.current && !wasDraggingRef.current) {
        setSelectedDrawingId(null);
      }
      return;
    }

    const pt = getPointFromEvent(e);
    if (!pt) return;

    if (activeTool === 'horizontal') {
      finalizeCreation(pt, pt);
      return;
    }

    if (!startPoint) {
      // First click
      setStartPoint(pt);
      setCurrentMousePoint(pt);
    } else {
      // Second click -> finalize drawing and select it
      finalizeCreation(startPoint, pt);
    }
  };

  // Start dragging a handle or the whole drawing
  const handleStartDrag = (
    e: React.MouseEvent,
    drawingId: string,
    handle: HandleType
  ) => {
    e.stopPropagation();
    e.preventDefault();
    preventDeselectRef.current = true;
    wasDraggingRef.current = false;
    setSelectedDrawingId(drawingId);

    const pt = getPointFromEvent(e);
    if (!pt) return;

    const drawing = drawings.find((d) => d.id === drawingId);
    if (!drawing) return;

    setDragState({
      drawingId,
      handle,
      startMousePoint: pt,
      initialPoints: [...drawing.points],
    });
  };

  // Global mousemove & mouseup for drag/stretch transformation
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const curPoint = getPointFromEvent(e);
      if (!curPoint) return;

      const { drawingId, handle, startMousePoint, initialPoints } = dragState;

      // Handle Rectangle transformations
      if (handle.startsWith('rect_')) {
        const pA = initialPoints[0];
        const pB = initialPoints[1];
        const minT = Math.min(pA.time, pB.time);
        const maxT = Math.max(pA.time, pB.time);
        const minP = Math.min(pA.price, pB.price);
        const maxP = Math.max(pA.price, pB.price);

        let newPoints: DrawingPoint[] = initialPoints;

        switch (handle) {
          case 'rect_nw':
            newPoints = [
              { time: curPoint.time, price: curPoint.price },
              { time: maxT, price: minP },
            ];
            break;
          case 'rect_ne':
            newPoints = [
              { time: minT, price: minP },
              { time: curPoint.time, price: curPoint.price },
            ];
            break;
          case 'rect_se':
            newPoints = [
              { time: minT, price: maxP },
              { time: curPoint.time, price: curPoint.price },
            ];
            break;
          case 'rect_sw':
            newPoints = [
              { time: curPoint.time, price: curPoint.price },
              { time: maxT, price: maxP },
            ];
            break;
          case 'rect_n':
            newPoints = [
              { time: minT, price: curPoint.price },
              { time: maxT, price: minP },
            ];
            break;
          case 'rect_s':
            newPoints = [
              { time: minT, price: maxP },
              { time: maxT, price: curPoint.price },
            ];
            break;
          case 'rect_w':
            newPoints = [
              { time: curPoint.time, price: maxP },
              { time: maxT, price: minP },
            ];
            break;
          case 'rect_e':
            newPoints = [
              { time: minT, price: maxP },
              { time: curPoint.time, price: minP },
            ];
            break;
        }

        updateDrawing(drawingId, { points: newPoints });
        return;
      }

      // Handle Trendline endpoints
      if (handle === 'line_p1') {
        updateDrawing(drawingId, { points: [curPoint, initialPoints[1]] });
        return;
      }
      if (handle === 'line_p2') {
        updateDrawing(drawingId, { points: [initialPoints[0], curPoint] });
        return;
      }

      // Handle Horizontal Line
      if (handle === 'horz_price') {
        updateDrawing(drawingId, { points: [{ time: curPoint.time, price: curPoint.price }] });
        return;
      }

      // Handle 'move' (Translate whole drawing)
      if (handle === 'move') {
        const deltaTime = curPoint.time - startMousePoint.time;
        const deltaPrice = curPoint.price - startMousePoint.price;
        const newPoints = initialPoints.map((p) => ({
          time: p.time + deltaTime,
          price: Number((p.price + deltaPrice).toFixed(1)),
        }));
        updateDrawing(drawingId, { points: newPoints });
        return;
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setTimeout(() => {
        preventDeselectRef.current = false;
        wasDraggingRef.current = false;
      }, 250);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, getPointFromEvent, updateDrawing]);

  // Keyboard shortcut listeners (Escape to deselect, Delete to remove)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedDrawingId) return;
      if (e.key === 'Escape') {
        setSelectedDrawingId(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        removeDrawing(selectedDrawingId);
        setSelectedDrawingId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDrawingId, removeDrawing]);

  // Duplicate drawing helper
  const handleDuplicate = (d: DrawingObject) => {
    const tfSec = getTimeframeSeconds(timeframe);
    const newId = `${d.type}_${Date.now()}`;
    const shiftedPoints = d.points.map((p) => ({
      time: p.time + tfSec * 3,
      price: p.price,
    }));
    addDrawing({
      ...d,
      id: newId,
      points: shiftedPoints,
    });
    setSelectedDrawingId(newId);
  };

  // Selected drawing object
  const selectedDrawing = drawings.find((d) => d.id === selectedDrawingId);

  // Calculate Toolbar Position for selected drawing
  const selectedToolbarPos = (() => {
    if (!selectedDrawing) return null;
    const rect = containerRef.current?.getBoundingClientRect();
    const containerWidth = rect?.width || 800;

    if (selectedDrawing.type === 'rectangle' && selectedDrawing.points.length >= 2) {
      const p1 = getCoordinates(selectedDrawing.points[0]);
      const p2 = getCoordinates(selectedDrawing.points[1]);
      if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return null;

      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);

      const x = Math.max(10, Math.min(minX + (maxX - minX) / 2 - 130, containerWidth - 320));
      const y = minY < 55 ? maxY + 14 : minY - 50;
      return { x, y };
    }

    if (selectedDrawing.type === 'trendline' && selectedDrawing.points.length >= 2) {
      const p1 = getCoordinates(selectedDrawing.points[0]);
      const p2 = getCoordinates(selectedDrawing.points[1]);
      if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return null;

      const midX = (p1.x + p2.x) / 2;
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);

      const x = Math.max(10, Math.min(midX - 130, containerWidth - 320));
      const y = minY < 55 ? maxY + 14 : minY - 50;
      return { x, y };
    }

    if (selectedDrawing.type === 'horizontal' && selectedDrawing.points.length >= 1) {
      const p = getCoordinates(selectedDrawing.points[0]);
      if (p.y === null) return null;
      const x = 120;
      const y = p.y < 55 ? p.y + 14 : p.y - 50;
      return { x, y };
    }

    return null;
  })();

  const isCreating = activeTool !== 'cursor';

  return (
    <div
      onClick={handleLayerClick}
      onMouseDown={handleMouseDownCreation}
      onMouseMove={handleMouseMoveCreation}
      onMouseUp={handleMouseUpCreation}
      className={`absolute inset-0 z-20 ${
        isCreating ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Top Banner when in drawing mode */}
      {isCreating && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#1e222d]/95 backdrop-blur-md border border-tv-blue px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs">
          <span className="text-tv-blue font-semibold">
            {activeTool === 'rectangle' && 'Режим рисования: Прямоугольник (кликните 2 точки или протяните мышкой)'}
            {activeTool === 'trendline' && 'Режим рисования: Трендовая линия (кликните 2 точки или протяните мышкой)'}
            {activeTool === 'horizontal' && 'Режим рисования: Горизонтальный уровень (кликните по уровню цены)'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveTool('cursor');
              setStartPoint(null);
              setCurrentMousePoint(null);
            }}
            className="px-2.5 py-0.5 bg-[#2a2e39] hover:bg-[#363a45] text-white rounded text-[11px] font-medium transition-colors"
          >
            Отмена (Esc)
          </button>
        </div>
      )}

      <svg className="w-full h-full overflow-hidden">
        {/* ========================================================================= */}
        {/* 1. SAVED DRAWINGS                                                         */}
        {/* ========================================================================= */}
        {drawings.map((drawing) => {
          const isSelected = drawing.id === selectedDrawingId;

          // RECTANGLE
          if (drawing.type === 'rectangle' && drawing.points.length >= 2) {
            const p1 = getCoordinates(drawing.points[0]);
            const p2 = getCoordinates(drawing.points[1]);
            if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
              return null;
            }

            const left = Math.min(p1.x, p2.x);
            const right = Math.max(p1.x, p2.x);
            const top = Math.min(p1.y, p2.y);
            const bottom = Math.max(p1.y, p2.y);
            const midX = (left + right) / 2;
            const midY = (top + bottom) / 2;
            const width = Math.max(4, right - left);
            const height = Math.max(4, bottom - top);

            return (
              <g key={drawing.id} className="select-none">
                {/* Rectangle Body (Click to select, drag to translate) */}
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  fill={drawing.fillColor || 'rgba(41, 98, 255, 0.22)'}
                  pointerEvents="all"
                  stroke={drawing.color || '#2962ff'}
                  strokeWidth={drawing.lineWidth || 2}
                  strokeDasharray={drawing.lineStyle === 'dashed' ? '6 3' : undefined}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    preventDeselectRef.current = true;
                    handleStartDrag(e, drawing.id, 'move');
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    preventDeselectRef.current = true;
                    setSelectedDrawingId(drawing.id);
                  }}
                  className={`pointer-events-auto transition-colors ${
                    isSelected ? 'cursor-move' : 'cursor-pointer hover:opacity-90'
                  }`}
                />

                {/* Selected Bounding Indicator */}
                {isSelected && (
                  <rect
                    x={left - 2}
                    y={top - 2}
                    width={width + 4}
                    height={height + 4}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    className="pointer-events-none opacity-60"
                  />
                )}

                {/* 8 RESIZE / STRETCH HANDLES (Visible when selected) */}
                {isSelected && (
                  <>
                    {/* 1. Top-Left */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_nw')}
                      className="cursor-nwse-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения размера (NW)</title>
                      <circle cx={left} cy={top} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={left} cy={top} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 2. Top-Center */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_n')}
                      className="cursor-ns-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения высоты (N)</title>
                      <circle cx={midX} cy={top} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={midX} cy={top} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 3. Top-Right */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_ne')}
                      className="cursor-nesw-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения размера (NE)</title>
                      <circle cx={right} cy={top} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={right} cy={top} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 4. Middle-Right */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_e')}
                      className="cursor-ew-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения ширины (E)</title>
                      <circle cx={right} cy={midY} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={right} cy={midY} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 5. Bottom-Right */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_se')}
                      className="cursor-nwse-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения размера (SE)</title>
                      <circle cx={right} cy={bottom} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={right} cy={bottom} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 6. Bottom-Center */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_s')}
                      className="cursor-ns-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения высоты (S)</title>
                      <circle cx={midX} cy={bottom} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={midX} cy={bottom} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 7. Bottom-Left */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_sw')}
                      className="cursor-nesw-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения размера (SW)</title>
                      <circle cx={left} cy={bottom} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={left} cy={bottom} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 8. Middle-Left */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_w')}
                      className="cursor-ew-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения ширины (W)</title>
                      <circle cx={left} cy={midY} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={left} cy={midY} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>
                  </>
                )}
              </g>
            );
          }

          // HORIZONTAL LINE
          if (drawing.type === 'horizontal' && drawing.points.length >= 1) {
            const p = getCoordinates(drawing.points[0]);
            if (p.y === null) return null;

            return (
              <g key={drawing.id} className="select-none">
                {/* Wider invisible stroke for easy grabbing */}
                <line
                  x1="0"
                  y1={p.y}
                  x2="100%"
                  y2={p.y}
                  stroke="transparent"
                  strokeWidth="14"
                  pointerEvents="all"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    preventDeselectRef.current = true;
                    handleStartDrag(e, drawing.id, 'horz_price');
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    preventDeselectRef.current = true;
                    setSelectedDrawingId(drawing.id);
                  }}
                  className="cursor-ns-resize pointer-events-auto"
                />
                {/* Visible Line */}
                <line
                  x1="0"
                  y1={p.y}
                  x2="100%"
                  y2={p.y}
                  stroke={drawing.color || '#f7a600'}
                  strokeWidth={drawing.lineWidth || 2}
                  strokeDasharray={drawing.lineStyle === 'dashed' ? '6 3' : undefined}
                  className="pointer-events-none"
                />

                {/* Level badge */}
                <g
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    preventDeselectRef.current = true;
                    handleStartDrag(e, drawing.id, 'horz_price');
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    preventDeselectRef.current = true;
                    setSelectedDrawingId(drawing.id);
                  }}
                  className="cursor-ns-resize pointer-events-auto"
                  transform={`translate(60, ${p.y - 10})`}
                >
                  <rect
                    x="0"
                    y="0"
                    width="84"
                    height="20"
                    rx="4"
                    fill={drawing.color || '#f7a600'}
                    pointerEvents="all"
                    className="shadow-md"
                  />
                  <text
                    x="42"
                    y="14"
                    textAnchor="middle"
                    fill="#000000"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    ${formatPrice(drawing.points[0].price)}
                  </text>
                </g>
              </g>
            );
          }

          // TRENDLINE
          if (drawing.type === 'trendline' && drawing.points.length >= 2) {
            const p1 = getCoordinates(drawing.points[0]);
            const p2 = getCoordinates(drawing.points[1]);
            if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
              return null;
            }

            return (
              <g key={drawing.id} className="select-none">
                {/* Wider invisible stroke for easy selection/move */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="transparent"
                  strokeWidth="16"
                  pointerEvents="all"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    preventDeselectRef.current = true;
                    handleStartDrag(e, drawing.id, 'move');
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    preventDeselectRef.current = true;
                    setSelectedDrawingId(drawing.id);
                  }}
                  className="cursor-move pointer-events-auto"
                />
                {/* Visible Line */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={drawing.color || '#089981'}
                  strokeWidth={drawing.lineWidth || 2}
                  strokeDasharray={drawing.lineStyle === 'dashed' ? '6 3' : undefined}
                  className="pointer-events-none"
                />

                {/* Point 1 Handle */}
                <g
                  onMouseDown={(e) => handleStartDrag(e, drawing.id, 'line_p1')}
                  className="cursor-pointer pointer-events-auto"
                >
                  <title>Тяните точку 1 трендовой линии</title>
                  <circle cx={p1.x} cy={p1.y} r="14" fill="transparent" pointerEvents="all" />
                  <circle
                    cx={p1.x}
                    cy={p1.y}
                    r={isSelected ? '5.5' : '4'}
                    fill="#ffffff"
                    stroke={drawing.color || '#089981'}
                    strokeWidth="2"
                  />
                </g>

                {/* Point 2 Handle */}
                <g
                  onMouseDown={(e) => handleStartDrag(e, drawing.id, 'line_p2')}
                  className="cursor-pointer pointer-events-auto"
                >
                  <title>Тяните точку 2 трендовой линии</title>
                  <circle cx={p2.x} cy={p2.y} r="14" fill="transparent" pointerEvents="all" />
                  <circle
                    cx={p2.x}
                    cy={p2.y}
                    r={isSelected ? '5.5' : '4'}
                    fill="#ffffff"
                    stroke={drawing.color || '#089981'}
                    strokeWidth="2"
                  />
                </g>
              </g>
            );
          }

          return null;
        })}

        {/* ========================================================================= */}
        {/* 2. LIVE PREVIEW WHILE CREATING NEW DRAWING                                */}
        {/* ========================================================================= */}
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
                  strokeWidth="2"
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

      {/* ========================================================================= */}
      {/* 3. TRADINGVIEW FLOATING ACTION TOOLBAR FOR SELECTED DRAWING                */}
      {/* ========================================================================= */}
      {selectedDrawing && selectedToolbarPos && (
        <div
          style={{
            left: `${selectedToolbarPos.x}px`,
            top: `${selectedToolbarPos.y}px`,
          }}
          className="absolute pointer-events-auto z-40 bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-xl shadow-2xl p-1.5 flex items-center gap-2 select-none"
          onMouseDown={(e) => {
            e.stopPropagation();
            preventDeselectRef.current = true;
          }}
          onClick={(e) => {
            e.stopPropagation();
            preventDeselectRef.current = true;
          }}
        >
          {/* Color Palette Dots */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-[#2a2e39]">
            {PALETTE_COLORS.map((col) => (
              <button
                key={col.name}
                onClick={() => {
                  updateDrawing(selectedDrawing.id, {
                    color: col.stroke,
                    fillColor: col.fill,
                  });
                }}
                title={col.name}
                className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 flex items-center justify-center ${
                  selectedDrawing.color === col.stroke
                    ? 'border-white scale-105 shadow-md'
                    : 'border-white/20'
                }`}
                style={{ backgroundColor: col.stroke }}
              >
                {selectedDrawing.color === col.stroke && (
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                )}
              </button>
            ))}
          </div>

          {/* Opacity for Rectangle */}
          {selectedDrawing.type === 'rectangle' && (
            <div className="flex items-center gap-1 pr-1.5 border-r border-[#2a2e39]">
              {[0.12, 0.25, 0.5, 0].map((op) => (
                <button
                  key={op}
                  onClick={() => {
                    const baseColor = selectedDrawing.color || '#2962ff';
                    const rgba = hexOrRgbToRgba(baseColor, op);
                    updateDrawing(selectedDrawing.id, {
                      fillColor: rgba,
                      fillOpacity: op,
                    });
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                    (selectedDrawing.fillOpacity ?? 0.22) === op
                      ? 'bg-tv-blue text-white font-bold'
                      : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
                  }`}
                  title={`Прозрачность заливки: ${op === 0 ? 'Без заливки' : `${Math.round(op * 100)}%`}`}
                >
                  {op === 0 ? '0%' : `${Math.round(op * 100)}%`}
                </button>
              ))}
            </div>
          )}

          {/* Line Width (1px, 2px, 3px) */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-[#2a2e39]">
            {[1, 2, 3].map((w) => (
              <button
                key={w}
                onClick={() => updateDrawing(selectedDrawing.id, { lineWidth: w })}
                className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-mono transition-colors ${
                  (selectedDrawing.lineWidth || 2) === w
                    ? 'bg-tv-surfaceHover text-tv-blue font-bold border border-tv-blue/40'
                    : 'text-tv-textMuted hover:text-white'
                }`}
                title={`Толщина линии: ${w}px`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Line Style (Solid vs Dashed) */}
          <button
            onClick={() =>
              updateDrawing(selectedDrawing.id, {
                lineStyle: selectedDrawing.lineStyle === 'dashed' ? 'solid' : 'dashed',
              })
            }
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              selectedDrawing.lineStyle === 'dashed'
                ? 'border-tv-blue bg-tv-blue/20 text-tv-blue font-medium'
                : 'border-[#2a2e39] text-tv-textMuted hover:text-white'
            }`}
            title="Переключить стиль линии: Сплошная / Пунктирная"
          >
            {selectedDrawing.lineStyle === 'dashed' ? 'Пунктир' : 'Сплошная'}
          </button>

          {/* Duplicate Button */}
          <button
            onClick={() => handleDuplicate(selectedDrawing)}
            title="Дублировать объект"
            className="p-1.5 text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover rounded-lg transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              removeDrawing(selectedDrawing.id);
              setSelectedDrawingId(null);
            }}
            title="Удалить объект (клавиша Delete)"
            className="p-1.5 text-tv-red/80 hover:text-tv-red hover:bg-tv-red/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Close / Deselect Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDrawingId(null);
            }}
            title="Снять выделение (Esc)"
            className="p-1.5 text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover rounded-lg transition-colors border-l border-[#2a2e39] ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
