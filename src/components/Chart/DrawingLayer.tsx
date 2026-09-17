import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { Candle, DrawingObject, DrawingPoint } from '../../types/chart';
import { formatPrice } from '../../utils/formatters';
import { Trash2, Copy, Check, X, Settings, Bookmark, Lock, Unlock } from 'lucide-react';
import { DrawingSettingsModal } from './DrawingSettingsModal';
import {
  loadStoredDrawingDefaults,
  loadStoredDrawingTemplates,
  DEFAULT_DRAWING_SETTINGS,
} from '../../services/storage';

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
  | 'horz_price'
  | 'pos_target'
  | 'pos_stop'
  | 'pos_entry'
  | 'pos_left'
  | 'pos_right';

interface DragState {
  drawingId: string;
  handle: HandleType;
  startMousePoint: DrawingPoint;
  initialPoints: DrawingPoint[];
  initialRiskReward?: { entryPrice: number; stopLossPrice: number; takeProfitPrice: number };
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

function distToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number }
): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function findSnappedOHLC(
  rawTime: number,
  rawPrice: number,
  candles: Candle[],
  tf: string
): { time: number; price: number; type: 'high' | 'low' | 'open' | 'close'; candle: Candle } | null {
  if (!candles || candles.length === 0) return null;

  // Binary search for nearest candle in time
  let low = 0;
  let high = candles.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (candles[mid].time < rawTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const indices = [low - 1, low, low + 1].filter((i) => i >= 0 && i < candles.length);
  if (indices.length === 0) return null;

  let bestCandle = candles[indices[0]];
  let bestDist = Math.abs(bestCandle.time - rawTime);
  for (const idx of indices) {
    const dist = Math.abs(candles[idx].time - rawTime);
    if (dist < bestDist) {
      bestDist = dist;
      bestCandle = candles[idx];
    }
  }

  const tfSec = getTimeframeSeconds(tf);
  // Snap if within 25 bars distance
  if (bestDist > tfSec * 25) return null;

  const ohlc = [
    { type: 'high' as const, level: bestCandle.high },
    { type: 'low' as const, level: bestCandle.low },
    { type: 'close' as const, level: bestCandle.close },
    { type: 'open' as const, level: bestCandle.open },
  ];

  ohlc.sort((a, b) => Math.abs(a.level - rawPrice) - Math.abs(b.level - rawPrice));
  const closest = ohlc[0];

  return {
    time: bestCandle.time,
    price: Number(closest.level.toFixed(1)),
    type: closest.type,
    candle: bestCandle,
  };
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
    magnetMode,
    symbolInfo,
    pushDrawingHistory,
    executeTrade,
    balance,
    riskSettings,
  } = useChart();

  const [dragState, setDragState] = useState<DragState | null>(null);
  const preDragSnapshotRef = useRef<DrawingObject[] | null>(null);
  const hasMovedDuringDragRef = useRef<boolean>(false);

  // Settings modal & templates state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [modalDrawing, setModalDrawing] = useState<DrawingObject | null>(null);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  // Temporary points while initially creating a drawing
  const [startPoint, setStartPoint] = useState<DrawingPoint | null>(null);
  const [currentMousePoint, setCurrentMousePoint] = useState<DrawingPoint | null>(null);

  // Magnet visual indicator state
  const [activeSnap, setActiveSnap] = useState<{
    coord: { x: number; y: number };
    price: number;
    type: 'high' | 'low' | 'open' | 'close';
  } | null>(null);

  // Interaction guards and two-click tracking
  const preventDeselectRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const isMouseDownForCreationRef = useRef(false);
  const creationStartScreenRef = useRef<{ x: number; y: number } | null>(null);
  const clickStepRef = useRef<number>(0);
  const creationStartPtRef = useRef<DrawingPoint | null>(null);

  // Reset creation state whenever active tool switches
  useEffect(() => {
    clickStepRef.current = 0;
    creationStartPtRef.current = null;
    setStartPoint(null);
    setCurrentMousePoint(null);
    setActiveSnap(null);
  }, [activeTool]);

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

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Click anywhere outside to deselect active drawing (TradingView standard behavior)
  useEffect(() => {
    if (!selectedDrawingId) return;

    const handleGlobalPointerDown = (e: MouseEvent) => {
      // Don't deselect if settings modal is open
      if (isSettingsModalOpen) return;

      const target = e.target as HTMLElement | SVGElement | null;
      if (!target) return;

      // Clicked inside the floating toolbar -> keep selected
      if (toolbarRef.current && toolbarRef.current.contains(target as Node)) {
        return;
      }

      // Clicked inside the chart container: let chart.subscribeClick handle drawing selection
      if (containerRef.current && containerRef.current.contains(target as Node)) {
        return;
      }

      // Clicked on a drawing SVG shape or its resize handle -> keep selected
      if (target.closest('.tv-drawing-element') || target.closest('.tv-drawing-handle')) {
        return;
      }

      // Clicked inside any modal, popup or dialog -> keep selected
      if (target.closest('.tv-modal-content') || target.closest('[role="dialog"]')) {
        return;
      }

      // If actively dragging or creating -> keep selected
      if (dragState || isMouseDownForCreationRef.current) {
        return;
      }

      // The user clicked outside: empty chart canvas, candles, axes, or background:
      // Deselect immediately!
      setSelectedDrawingId(null);
      setIsTemplateMenuOpen(false);
    };

    window.addEventListener('mousedown', handleGlobalPointerDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalPointerDown);
    };
  }, [selectedDrawingId, isSettingsModalOpen, dragState, setSelectedDrawingId]);

  // Continuous 60 FPS synchronization during user interactions (zooming wheel, dragging canvas, dragging price/time axes)
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

    const handleMouseDown = () => {
      startActiveSync();
    };

    const handleMouseUp = () => {
      stopActiveSync();
      // Final update to guarantee pixel-perfect resting state
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
    container.addEventListener('touchstart', handleMouseDown, { passive: true });
    window.addEventListener('touchend', handleMouseUp, { passive: true });

    const timeScale = chart.timeScale();
    const handleRangeChange = () => setTick((t) => (t + 1) % 1000000);
    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);

    return () => {
      stopActiveSync();
      if (wheelTimer) clearTimeout(wheelTimer);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('touchend', handleMouseUp);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      timeScale.unsubscribeVisibleTimeRangeChange(handleRangeChange);
    };
  }, [containerRef, chart]);

  // Convert mouse event coordinates to chart time & price (resilient across whole canvas)
  const getPointFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent, forceNoMagnet?: boolean): DrawingPoint | null => {
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

      const rawNumTime = Number(time);
      const rawNumPrice = Number(price.toFixed(1));

      // Magnet logic: active if magnetMode is ON (unless Ctrl/Cmd is held) OR magnetMode is OFF and Ctrl/Cmd is held
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isMagnetActive = !forceNoMagnet && ((magnetMode && !isCtrlOrMeta) || (!magnetMode && isCtrlOrMeta));

      if (isMagnetActive) {
        const snap = findSnappedOHLC(rawNumTime, rawNumPrice, visibleCandles, timeframe);
        if (snap) {
          const snapX = chart.timeScale().timeToCoordinate(snap.time as Time);
          const snapY = candleSeries.priceToCoordinate(snap.price);
          if (snapX !== null && snapY !== null) {
            setActiveSnap({
              coord: { x: Number(snapX), y: Number(snapY) },
              price: snap.price,
              type: snap.type,
            });
            return { time: snap.time, price: snap.price };
          }
        }
      }

      setActiveSnap(null);
      return { time: rawNumTime, price: rawNumPrice };
    },
    [chart, candleSeries, containerRef, visibleCandles, timeframe, magnetMode]
  );

  // Convert chart time & price to pixel coordinates (smooth 60 FPS with logical interpolation)
  const getCoordinates = useCallback(
    (p: DrawingPoint): { x: number | null; y: number | null } => {
      if (!chart || !candleSeries) return { x: null, y: null };

      let xCoord: number | null = null;
      const rawX = chart.timeScale().timeToCoordinate(p.time as Time);
      if (rawX !== null) {
        xCoord = Number(rawX);
      } else if (visibleCandles.length > 0) {
        const first = visibleCandles[0];
        const last = visibleCandles[visibleCandles.length - 1];
        const tfSec = getTimeframeSeconds(timeframe);

        let logicalIndex: number;
        if (p.time >= first.time && p.time <= last.time) {
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
          const c = visibleCandles[idx];
          if (c.time === p.time) {
            logicalIndex = idx;
          } else if (idx > 0) {
            const prev = visibleCandles[idx - 1];
            const span = (c.time - prev.time) || tfSec;
            logicalIndex = (idx - 1) + (p.time - prev.time) / span;
          } else {
            logicalIndex = idx;
          }
        } else if (p.time > last.time) {
          logicalIndex = (visibleCandles.length - 1) + (p.time - last.time) / tfSec;
        } else {
          logicalIndex = (p.time - first.time) / tfSec;
        }

        const coord = chart.timeScale().logicalToCoordinate(logicalIndex as any);
        if (coord !== null) {
          xCoord = Number(coord);
        } else {
          const cX = chart.timeScale().timeToCoordinate(last.time as Time);
          if (cX !== null) {
            const extraBars = (p.time - last.time) / tfSec;
            const barSpacing = chart.timeScale().options().barSpacing || 8;
            xCoord = Number(cX) + extraBars * barSpacing;
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
      const defaults = loadStoredDrawingDefaults();
      const toolDefaults = defaults[activeTool] || DEFAULT_DRAWING_SETTINGS[activeTool] || {};
      const baseColor = toolDefaults.color || (activeTool === 'horizontal' ? '#f7a600' : '#2962ff');
      const fillCol = toolDefaults.fillColor || baseColor;
      const fillOp = toolDefaults.fillOpacity ?? 0.15;
      const rgba = hexOrRgbToRgba(fillCol, fillOp);

      if (activeTool === 'horizontal') {
        addDrawing({
          id: newId,
          type: 'horizontal',
          points: [p1],
          color: baseColor,
          lineWidth: toolDefaults.lineWidth || 1,
          lineStyle: toolDefaults.lineStyle || 'dashed',
          text: toolDefaults.text || '',
        });
      } else if (activeTool === 'rectangle') {
        addDrawing({
          id: newId,
          type: 'rectangle',
          points: [p1, p2],
          color: baseColor,
          fillColor: rgba,
          fillOpacity: fillOp,
          borderVisible: toolDefaults.borderVisible ?? true,
          fillVisible: toolDefaults.fillVisible ?? true,
          lineWidth: toolDefaults.lineWidth || 1,
          lineStyle: toolDefaults.lineStyle || 'solid',
          extendRight: toolDefaults.extendRight ?? false,
          extendLeft: toolDefaults.extendLeft ?? false,
          text: toolDefaults.text || '',
          textColor: toolDefaults.textColor || '#d1d4dc',
          fontSize: toolDefaults.fontSize || 12,
          textVAlign: toolDefaults.textVAlign || 'top',
          textHAlign: toolDefaults.textHAlign || 'left',
        });
      } else if (activeTool === 'trendline') {
        addDrawing({
          id: newId,
          type: 'trendline',
          points: [p1, p2],
          color: baseColor,
          lineWidth: toolDefaults.lineWidth || 2,
          lineStyle: toolDefaults.lineStyle || 'solid',
          extendRight: toolDefaults.extendRight ?? false,
          extendLeft: toolDefaults.extendLeft ?? false,
          text: toolDefaults.text || '',
        });
      } else if (activeTool === 'ray') {
        addDrawing({
          id: newId,
          type: 'ray',
          points: [p1, p2],
          color: baseColor,
          lineWidth: toolDefaults.lineWidth || 2,
          lineStyle: toolDefaults.lineStyle || 'solid',
          extendRight: true,
          text: toolDefaults.text || '',
        });
      } else if (activeTool === 'position_long' || activeTool === 'position_short') {
        const isLong = activeTool === 'position_long';
        const tfSec = getTimeframeSeconds(timeframe);
        const defaultDist = Math.max(p1.price * 0.01, 1);
        const slPrice = isLong
          ? Number((p1.price - defaultDist).toFixed(symbolInfo.pricePrecision || 1))
          : Number((p1.price + defaultDist).toFixed(symbolInfo.pricePrecision || 1));
        const tpPrice = isLong
          ? Number((p1.price + defaultDist * 2).toFixed(symbolInfo.pricePrecision || 1))
          : Number((p1.price - defaultDist * 2).toFixed(symbolInfo.pricePrecision || 1));
        const endT = p1.time + 25 * tfSec;

        addDrawing({
          id: newId,
          type: activeTool,
          points: [
            { time: p1.time, price: p1.price },
            { time: endT, price: p1.price },
          ],
          color: isLong ? '#089981' : '#f23645',
          riskReward: {
            entryPrice: p1.price,
            stopLossPrice: slPrice,
            takeProfitPrice: tpPrice,
          },
        });
      }

      setStartPoint(null);
      setCurrentMousePoint(null);
      setActiveSnap(null);
      clickStepRef.current = 0;
      creationStartPtRef.current = null;
      setActiveTool('cursor');
      setSelectedDrawingId(newId);

      setTimeout(() => {
        preventDeselectRef.current = false;
      }, 300);
    },
    [activeTool, addDrawing, setActiveTool, setSelectedDrawingId, timeframe, symbolInfo]
  );

  // Native chart canvas click subscriber: select drawing when clicked inside, deselect on blank area
  useEffect(() => {
    if (!chart || !candleSeries) return;

    const handleChartClick = (param: any) => {
      if (activeTool !== 'cursor' || dragState) return;
      if (!param || !param.point) return;

      const { x, y } = param.point;
      const containerW = containerRef.current?.clientWidth || 1000;

      for (let i = drawings.length - 1; i >= 0; i--) {
        const d = drawings[i];

        if (d.type === 'rectangle' && d.points.length >= 2) {
          const p1 = getCoordinates(d.points[0]);
          const p2 = getCoordinates(d.points[1]);
          if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
            const baseLeft = Math.min(p1.x, p2.x);
            const baseRight = Math.max(p1.x, p2.x);
            const top = Math.min(p1.y, p2.y);
            const bottom = Math.max(p1.y, p2.y);
            const left = d.extendLeft ? -10 : baseLeft;
            const right = d.extendRight ? containerW + 10 : baseRight;

            if (x >= left - 4 && x <= right + 4 && y >= top - 4 && y <= bottom + 4) {
              setSelectedDrawingId(d.id);
              return;
            }
          }
        }

        if ((d.type === 'position_long' || d.type === 'position_short') && d.points.length >= 2 && d.riskReward) {
          const p1 = getCoordinates(d.points[0]);
          const p2 = getCoordinates(d.points[1]);
          const entryY = candleSeries.priceToCoordinate(d.riskReward.entryPrice);
          const slY = candleSeries.priceToCoordinate(d.riskReward.stopLossPrice);
          const tpY = candleSeries.priceToCoordinate(d.riskReward.takeProfitPrice);

          if (p1.x !== null && p2.x !== null && entryY !== null && slY !== null && tpY !== null) {
            const left = Math.min(p1.x, p2.x);
            const right = Math.max(p1.x, p2.x);
            const minY = Math.min(entryY, slY, tpY);
            const maxY = Math.max(entryY, slY, tpY);

            if (x >= left - 6 && x <= right + 6 && y >= minY - 6 && y <= maxY + 6) {
              setSelectedDrawingId(d.id);
              return;
            }
          }
        }

        if (d.type === 'horizontal' && d.points.length >= 1) {
          const p = getCoordinates(d.points[0]);
          if (p.y !== null && Math.abs(y - p.y) <= 12) {
            setSelectedDrawingId(d.id);
            return;
          }
        }

        if ((d.type === 'trendline' || d.type === 'ray') && d.points.length >= 2) {
          const p1 = getCoordinates(d.points[0]);
          const p2 = getCoordinates(d.points[1]);
          if (p1.x !== null && p1.y !== null && p2.x !== null && p2.y !== null) {
            const dist = distToSegment({ x, y }, { x: p1.x, y: p1.y }, { x: p2.x, y: p2.y });
            if (dist <= 12) {
              setSelectedDrawingId(d.id);
              return;
            }
          }
        }
      }

      // Click landed on blank chart area: deselect active drawing
      setSelectedDrawingId(null);
      setIsTemplateMenuOpen(false);
    };

    chart.subscribeClick(handleChartClick);
    return () => {
      try {
        chart.unsubscribeClick(handleChartClick);
      } catch (e) {}
    };
  }, [chart, candleSeries, drawings, activeTool, dragState, containerRef, getCoordinates, setSelectedDrawingId]);

  const handleMouseDownCreation = (e: React.MouseEvent) => {
    if (activeTool === 'cursor') return;
    const pt = getPointFromEvent(e);
    if (!pt) return;

    isMouseDownForCreationRef.current = true;
    creationStartScreenRef.current = { x: e.clientX, y: e.clientY };
    creationStartPtRef.current = pt;

    if (clickStepRef.current === 0) {
      setCurrentMousePoint(pt);
    }
  };

  const handleMouseMoveCreation = (e: React.MouseEvent) => {
    const pt = getPointFromEvent(e);
    if (!pt) return;

    if (activeTool !== 'cursor') {
      if (clickStepRef.current === 1 && startPoint) {
        setCurrentMousePoint(pt);
      } else if (isMouseDownForCreationRef.current && creationStartScreenRef.current) {
        const dist = Math.hypot(
          e.clientX - creationStartScreenRef.current.x,
          e.clientY - creationStartScreenRef.current.y
        );
        if (dist > 10) {
          if (!startPoint && creationStartPtRef.current) {
            setStartPoint(creationStartPtRef.current);
          }
          setCurrentMousePoint(pt);
        }
      }
    }
  };

  const handleMouseUpCreation = (e: React.MouseEvent) => {
    if (activeTool === 'cursor') return;
    const pt = getPointFromEvent(e);
    if (!pt) return;

    if (activeTool === 'horizontal' || activeTool === 'position_long' || activeTool === 'position_short') {
      finalizeCreation(pt, pt);
      isMouseDownForCreationRef.current = false;
      creationStartScreenRef.current = null;
      creationStartPtRef.current = null;
      return;
    }

    if (creationStartScreenRef.current) {
      const dist = Math.hypot(
        e.clientX - creationStartScreenRef.current.x,
        e.clientY - creationStartScreenRef.current.y
      );

      // 1. Drag creation gesture (dist > 15px)
      if (dist > 15 && creationStartPtRef.current) {
        finalizeCreation(creationStartPtRef.current, pt);
        clickStepRef.current = 0;
        isMouseDownForCreationRef.current = false;
        creationStartScreenRef.current = null;
        creationStartPtRef.current = null;
        return;
      }
    }

    // 2. Click-to-click creation gesture (dist <= 15px)
    if (clickStepRef.current === 0) {
      // 1st click: anchor startPoint
      clickStepRef.current = 1;
      setStartPoint(pt);
      setCurrentMousePoint(pt);
    } else if (clickStepRef.current === 1) {
      // 2nd click: anchor endPoint and finalize
      if (startPoint) {
        finalizeCreation(startPoint, pt);
      }
      clickStepRef.current = 0;
      creationStartPtRef.current = null;
    }

    isMouseDownForCreationRef.current = false;
    creationStartScreenRef.current = null;
  };

  // Handle drawing layer clicks (deselect when cursor mode)
  const handleLayerClick = (e: React.MouseEvent) => {
    if (activeTool === 'cursor') {
      if (!preventDeselectRef.current && !wasDraggingRef.current) {
        setSelectedDrawingId(null);
      }
      return;
    }
    // Handled in mousedown/up for creation
    e.stopPropagation();
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

    preDragSnapshotRef.current = JSON.parse(JSON.stringify(drawings));
    hasMovedDuringDragRef.current = false;

    setDragState({
      drawingId,
      handle,
      startMousePoint: pt,
      initialPoints: [...drawing.points],
      initialRiskReward: drawing.riskReward ? { ...drawing.riskReward } : undefined,
    });
  };

  // Global mousemove & mouseup for drag/stretch transformation
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { drawingId, handle, startMousePoint, initialPoints } = dragState;
      const curPoint = getPointFromEvent(e, handle === 'move');
      if (!curPoint) return;

      hasMovedDuringDragRef.current = true;

      // Handle Position Tool transformations (Long & Short)
      if (handle.startsWith('pos_')) {
        const drawing = drawings.find((d) => d.id === drawingId);
        if (!drawing || !drawing.riskReward || !dragState.initialRiskReward) return;

        const initRR = dragState.initialRiskReward;
        const curPrice = curPoint.price;
        let newRR = { ...drawing.riskReward };
        let newPts = [...drawing.points];

        if (handle === 'pos_target') {
          newRR.takeProfitPrice = curPrice;
        } else if (handle === 'pos_stop') {
          newRR.stopLossPrice = curPrice;
        } else if (handle === 'pos_entry') {
          const delta = curPrice - initRR.entryPrice;
          newRR.entryPrice = curPrice;
          newRR.stopLossPrice = Number((initRR.stopLossPrice + delta).toFixed(symbolInfo.pricePrecision || 1));
          newRR.takeProfitPrice = Number((initRR.takeProfitPrice + delta).toFixed(symbolInfo.pricePrecision || 1));
          newPts[0] = { ...newPts[0], price: curPrice };
          newPts[1] = { ...newPts[1], price: curPrice };
        } else if (handle === 'pos_left') {
          newPts[0] = { ...newPts[0], time: curPoint.time };
        } else if (handle === 'pos_right') {
          newPts[1] = { ...newPts[1], time: curPoint.time };
        }

        updateDrawing(drawingId, {
          points: newPts,
          riskReward: newRR,
        });
        return;
      }

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
          price: Number((p.price + deltaPrice).toFixed(symbolInfo.pricePrecision || 1)),
        }));

        const drawing = drawings.find((d) => d.id === drawingId);
        if (drawing && (drawing.type === 'position_long' || drawing.type === 'position_short') && dragState.initialRiskReward) {
          const initRR = dragState.initialRiskReward;
          const newRR = {
            entryPrice: Number((initRR.entryPrice + deltaPrice).toFixed(symbolInfo.pricePrecision || 1)),
            stopLossPrice: Number((initRR.stopLossPrice + deltaPrice).toFixed(symbolInfo.pricePrecision || 1)),
            takeProfitPrice: Number((initRR.takeProfitPrice + deltaPrice).toFixed(symbolInfo.pricePrecision || 1)),
          };
          updateDrawing(drawingId, { points: newPoints, riskReward: newRR });
        } else {
          updateDrawing(drawingId, { points: newPoints });
        }
        return;
      }
    };

    const handleMouseUp = () => {
      if (hasMovedDuringDragRef.current && preDragSnapshotRef.current) {
        pushDrawingHistory(preDragSnapshotRef.current);
        preDragSnapshotRef.current = null;
        hasMovedDuringDragRef.current = false;
      }
      setDragState(null);
      setActiveSnap(null);
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
  }, [dragState, getPointFromEvent, updateDrawing, pushDrawingHistory]);

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

    if ((selectedDrawing.type === 'trendline' || selectedDrawing.type === 'ray') && selectedDrawing.points.length >= 2) {
      const p1 = getCoordinates(selectedDrawing.points[0]);
      const p2 = getCoordinates(selectedDrawing.points[1]);
      if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return null;

      const midX = (p1.x + p2.x) / 2;
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);

      const x = Math.max(10, Math.min(midX - 130, containerWidth - 340));
      const y = minY < 55 ? maxY + 14 : minY - 50;
      return { x, y };
    }

    if ((selectedDrawing.type === 'position_long' || selectedDrawing.type === 'position_short') && selectedDrawing.points.length >= 2 && selectedDrawing.riskReward) {
      const p1 = getCoordinates(selectedDrawing.points[0]);
      const p2 = getCoordinates(selectedDrawing.points[1]);
      const entryY = candleSeries?.priceToCoordinate(selectedDrawing.riskReward.entryPrice) ?? null;
      const slY = candleSeries?.priceToCoordinate(selectedDrawing.riskReward.stopLossPrice) ?? null;
      const tpY = candleSeries?.priceToCoordinate(selectedDrawing.riskReward.takeProfitPrice) ?? null;

      if (p1.x === null || p2.x === null || entryY === null || slY === null || tpY === null) return null;

      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(entryY, slY, tpY);
      const maxY = Math.max(entryY, slY, tpY);

      const x = Math.max(10, Math.min(minX + (maxX - minX) / 2 - 130, containerWidth - 340));
      const y = minY < 55 ? maxY + 14 : minY - 50;
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
            {activeTool === 'trendline' && 'Режим рисования: Трендовая линия / Отрезок (кликните 2 точки или протяните мышкой)'}
            {activeTool === 'ray' && 'Режим рисования: Луч (кликните начало и вторую точку или протяните мышкой)'}
            {activeTool === 'horizontal' && 'Режим рисования: Горизонтальный уровень (кликните по уровню цены)'}
          </span>
          {magnetMode && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-tv-blue/20 text-tv-blue border border-tv-blue/40 flex items-center gap-1">
              🧲 Магнит вкл
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveTool('cursor');
              setStartPoint(null);
              setCurrentMousePoint(null);
              setActiveSnap(null);
              clickStepRef.current = 0;
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

            const baseLeft = Math.min(p1.x, p2.x);
            const baseRight = Math.max(p1.x, p2.x);
            const top = Math.min(p1.y, p2.y);
            const bottom = Math.max(p1.y, p2.y);
            const containerW = containerRef.current?.clientWidth || 1000;

            const left = drawing.extendLeft ? -10 : baseLeft;
            const right = drawing.extendRight ? containerW + 10 : baseRight;
            const midX = (baseLeft + baseRight) / 2;
            const midY = (top + bottom) / 2;
            const width = Math.max(4, right - left);
            const height = Math.max(4, bottom - top);

            const fillColor = drawing.fillVisible !== false
              ? (drawing.fillColor || hexOrRgbToRgba(drawing.color || '#2962ff', drawing.fillOpacity ?? 0.15))
              : 'transparent';
            const strokeColor = drawing.borderVisible !== false
              ? (drawing.color || '#2962ff')
              : 'transparent';
            const strokeDash =
              drawing.lineStyle === 'dashed' ? '6 4' : drawing.lineStyle === 'dotted' ? '2 2' : undefined;

            return (
              <g key={drawing.id} className="select-none">
                {/* 1. Translucent Fill: NEVER blocks mouse events, 100% chart pan pass-through */}
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  fill={fillColor}
                  stroke="none"
                  pointerEvents="none"
                  className="pointer-events-none select-none"
                />

                {/* 2. Visual Border: crisp stroke */}
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={drawing.lineWidth || 1}
                  strokeDasharray={strokeDash}
                  pointerEvents="none"
                  className="pointer-events-none select-none"
                />

                {/* 3. Border Hit-Zone (14px stroke boundary): Click border to select, drag border to move */}
                <rect
                  x={left}
                  y={top}
                  width={width}
                  height={height}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={Math.max(14, (drawing.lineWidth || 1) + 12)}
                  pointerEvents="stroke"
                  onMouseDown={(e) => {
                    if (isSelected && !drawing.isLocked) {
                      e.stopPropagation();
                      preventDeselectRef.current = true;
                      handleStartDrag(e, drawing.id, 'move');
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrawingId(drawing.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrawingId(drawing.id);
                    setModalDrawing(drawing);
                    setIsSettingsModalOpen(true);
                  }}
                  className={`tv-drawing-element pointer-events-auto ${
                    isSelected ? (drawing.isLocked ? 'cursor-pointer' : 'cursor-move') : 'cursor-pointer'
                  }`}
                />

                {/* 4. Center Move Anchor: Sleek TradingView handle visible when selected */}
                {isSelected && !drawing.isLocked && width > 40 && height > 30 && (
                  <g
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      preventDeselectRef.current = true;
                      handleStartDrag(e, drawing.id, 'move');
                    }}
                    className="tv-drawing-handle cursor-move pointer-events-auto select-none"
                    transform={`translate(${midX - 14}, ${midY - 14})`}
                  >
                    <title>Зажмите и тяните для перемещения фигуры</title>
                    <rect
                      x="0"
                      y="0"
                      width="28"
                      height="28"
                      rx="7"
                      fill="#1e222d"
                      stroke={drawing.color || '#2962ff'}
                      strokeWidth="1.5"
                      className="shadow-xl"
                    />
                    <path
                      d="M14 6v16m-8-8h16M14 6l-2.5 2.5m2.5-2.5l2.5 2.5M14 22l-2.5-2.5m2.5 2.5l2.5-2.5M6 14l2.5-2.5M6 14l2.5 2.5M22 14l-2.5-2.5M22 14l2.5 2.5"
                      stroke={drawing.color || '#2962ff'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}

                {/* Optional Text Annotation inside / on the Rectangle */}
                {drawing.text && (
                  <text
                    x={
                      drawing.textHAlign === 'center'
                        ? (left + right) / 2
                        : drawing.textHAlign === 'right'
                        ? right - 8
                        : left + 8
                    }
                    y={
                      drawing.textVAlign === 'middle'
                        ? (top + bottom) / 2 + (drawing.fontSize || 12) / 3
                        : drawing.textVAlign === 'bottom'
                        ? bottom - 8
                        : top + (drawing.fontSize || 12) + 4
                    }
                    textAnchor={
                      drawing.textHAlign === 'center'
                        ? 'middle'
                        : drawing.textHAlign === 'right'
                        ? 'end'
                        : 'start'
                    }
                    fill={drawing.textColor || '#d1d4dc'}
                    fontSize={drawing.fontSize || 12}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    {drawing.text}
                  </text>
                )}

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
                      className="tv-drawing-handle cursor-nwse-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения размера (NW)</title>
                      <circle cx={left} cy={top} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={left} cy={top} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 2. Top-Center */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_n')}
                      className="tv-drawing-handle cursor-ns-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения высоты (N)</title>
                      <circle cx={midX} cy={top} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={midX} cy={top} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 3. Top-Right */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_ne')}
                      className="tv-drawing-handle cursor-nesw-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения размера (NE)</title>
                      <circle cx={right} cy={top} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={right} cy={top} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 4. Middle-Right */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_e')}
                      className="tv-drawing-handle cursor-ew-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения ширины (E)</title>
                      <circle cx={right} cy={midY} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={right} cy={midY} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 5. Bottom-Right */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_se')}
                      className="tv-drawing-handle cursor-nwse-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения размера (SE)</title>
                      <circle cx={right} cy={bottom} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={right} cy={bottom} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 6. Bottom-Center */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_s')}
                      className="tv-drawing-handle cursor-ns-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения высоты (S)</title>
                      <circle cx={midX} cy={bottom} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={midX} cy={bottom} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 7. Bottom-Left */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_sw')}
                      className="tv-drawing-handle cursor-nesw-resize pointer-events-auto"
                    >
                      <title>Тяните для изменения размера (SW)</title>
                      <circle cx={left} cy={bottom} r="14" fill="transparent" pointerEvents="all" />
                      <circle cx={left} cy={bottom} r="4.5" fill="#ffffff" stroke={drawing.color || '#2962ff'} strokeWidth="2" />
                    </g>

                    {/* 8. Middle-Left */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'rect_w')}
                      className="tv-drawing-handle cursor-ew-resize pointer-events-auto"
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
                {/* Wider invisible stroke for easy grabbing when selected */}
                <line
                  x1="0"
                  y1={p.y}
                  x2="100%"
                  y2={p.y}
                  stroke="transparent"
                  strokeWidth="14"
                  pointerEvents={isSelected ? 'stroke' : 'none'}
                  onMouseDown={(e) => {
                    if (isSelected && !drawing.isLocked) {
                      e.stopPropagation();
                      preventDeselectRef.current = true;
                      handleStartDrag(e, drawing.id, 'horz_price');
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrawingId(drawing.id);
                    setModalDrawing(drawing);
                    setIsSettingsModalOpen(true);
                  }}
                  className={`tv-drawing-element ${
                    isSelected ? (drawing.isLocked ? 'cursor-pointer' : 'cursor-ns-resize pointer-events-auto') : 'pointer-events-none'
                  }`}
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

                {/* Level badge: Click to select, drag when selected */}
                <g
                  onMouseDown={(e) => {
                    if (isSelected && !drawing.isLocked) {
                      e.stopPropagation();
                      preventDeselectRef.current = true;
                      handleStartDrag(e, drawing.id, 'horz_price');
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrawingId(drawing.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrawingId(drawing.id);
                    setModalDrawing(drawing);
                    setIsSettingsModalOpen(true);
                  }}
                  className={`tv-drawing-element tv-drawing-handle pointer-events-auto ${
                    isSelected ? (drawing.isLocked ? 'cursor-pointer' : 'cursor-ns-resize') : 'cursor-pointer'
                  }`}
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

          // TRENDLINE & RAY
          if ((drawing.type === 'trendline' || drawing.type === 'ray') && drawing.points.length >= 2) {
            const p1 = getCoordinates(drawing.points[0]);
            const p2 = getCoordinates(drawing.points[1]);
            if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) {
              return null;
            }

            const isRay = drawing.type === 'ray' || !!drawing.extendRight;
            let lineX2 = p2.x;
            let lineY2 = p2.y;

            if (isRay) {
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              if (Math.abs(dx) < 0.001) {
                lineY2 = dy >= 0 ? 3000 : -1000;
              } else if (dx > 0) {
                const m = dy / dx;
                lineX2 = Math.max(3000, p2.x + 1000);
                lineY2 = p1.y + m * (lineX2 - p1.x);
              } else {
                const m = dy / dx;
                lineX2 = Math.min(-1000, p2.x - 1000);
                lineY2 = p1.y + m * (lineX2 - p1.x);
              }
            }

            const defaultColor = isRay ? '#2962ff' : '#089981';
            const lineColor = drawing.color || defaultColor;

            return (
              <g key={drawing.id} className="select-none">
                {/* Wider invisible stroke for easy selection/move */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={lineX2}
                  y2={lineY2}
                  stroke="transparent"
                  strokeWidth="16"
                  pointerEvents={isSelected ? 'stroke' : 'none'}
                  onMouseDown={(e) => {
                    if (isSelected && !drawing.isLocked) {
                      e.stopPropagation();
                      preventDeselectRef.current = true;
                      handleStartDrag(e, drawing.id, 'move');
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrawingId(drawing.id);
                    setModalDrawing(drawing);
                    setIsSettingsModalOpen(true);
                  }}
                  className={`tv-drawing-element ${
                    isSelected ? (drawing.isLocked ? 'cursor-pointer' : 'cursor-move pointer-events-auto') : 'pointer-events-none'
                  }`}
                />
                {/* Visible Line / Ray */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={lineX2}
                  y2={lineY2}
                  stroke={lineColor}
                  strokeWidth={drawing.lineWidth || 2}
                  strokeDasharray={drawing.lineStyle === 'dashed' ? '6 3' : undefined}
                  className="pointer-events-none"
                />

                {/* Point 1 Handle (Начало) - visible only when selected */}
                {isSelected && (
                  <g
                    onMouseDown={(e) => handleStartDrag(e, drawing.id, 'line_p1')}
                    className="tv-drawing-handle cursor-pointer pointer-events-auto"
                  >
                    <title>Начало {isRay ? 'луча' : 'линии'} (зажмите и тяните)</title>
                    <circle cx={p1.x} cy={p1.y} r="14" fill="transparent" pointerEvents="all" />
                    <circle
                      cx={p1.x}
                      cy={p1.y}
                      r="5"
                      fill="#ffffff"
                      stroke={lineColor}
                      strokeWidth="2.5"
                    />
                  </g>
                )}

                {/* Point 2 Handle (Конец / Направление) - visible only when selected */}
                {isSelected && (
                  <g
                    onMouseDown={(e) => handleStartDrag(e, drawing.id, 'line_p2')}
                    className="tv-drawing-handle cursor-pointer pointer-events-auto"
                  >
                    <title>{isRay ? 'Вторая точка / направление луча' : 'Конец линии'} (зажмите и тяните)</title>
                    <circle cx={p2.x} cy={p2.y} r="14" fill="transparent" pointerEvents="all" />
                    <circle
                      cx={p2.x}
                      cy={p2.y}
                      r="5"
                      fill="#ffffff"
                      stroke={lineColor}
                      strokeWidth="2.5"
                    />
                  </g>
                )}
              </g>
            );
          }

          // POSITION TOOL (LONG & SHORT - TRADINGVIEW RISK/REWARD)
          if ((drawing.type === 'position_long' || drawing.type === 'position_short') && drawing.points.length >= 2 && drawing.riskReward) {
            const isLong = drawing.type === 'position_long';
            const p1 = getCoordinates(drawing.points[0]);
            const p2 = getCoordinates(drawing.points[1]);
            if (!candleSeries) return null;
            const entryY = candleSeries.priceToCoordinate(drawing.riskReward.entryPrice);
            const slY = candleSeries.priceToCoordinate(drawing.riskReward.stopLossPrice);
            const tpY = candleSeries.priceToCoordinate(drawing.riskReward.takeProfitPrice);

            if (p1.x === null || p2.x === null || entryY === null || slY === null || tpY === null) {
              return null;
            }

            const leftX = Math.min(p1.x, p2.x);
            const rightX = Math.max(p1.x, p2.x);
            const boxWidth = Math.max(70, rightX - leftX);
            const centerX = leftX + boxWidth / 2;

            // Geometry for Profit and Loss Boxes
            const profitTop = Math.min(tpY, entryY);
            const profitHeight = Math.max(2, Math.abs(tpY - entryY));

            const lossTop = Math.min(slY, entryY);
            const lossHeight = Math.max(2, Math.abs(slY - entryY));

            // Metrics calculation
            const entryP = drawing.riskReward.entryPrice;
            const slP = drawing.riskReward.stopLossPrice;
            const tpP = drawing.riskReward.takeProfitPrice;

            const stopDist = Math.abs(entryP - slP);
            const targetDist = Math.abs(tpP - entryP);
            const rrRatio = stopDist > 0 ? (targetDist / stopDist).toFixed(2) : '0.00';

            const stopPercent = entryP > 0 ? ((stopDist / entryP) * 100).toFixed(2) : '0.00';
            const targetPercent = entryP > 0 ? ((targetDist / entryP) * 100).toFixed(2) : '0.00';

            const estRiskUsd = (balance * (riskSettings.riskPercent / 100)).toFixed(1);
            const estProfitUsd = (parseFloat(estRiskUsd) * parseFloat(rrRatio)).toFixed(1);

            return (
              <g key={drawing.id} className="tv-drawing-element select-none">
                {/* Hit area when unselected */}
                <rect
                  x={leftX}
                  y={Math.min(tpY, slY, entryY)}
                  width={boxWidth}
                  height={Math.max(4, Math.max(tpY, slY, entryY) - Math.min(tpY, slY, entryY))}
                  fill="transparent"
                  pointerEvents={isSelected ? 'none' : 'all'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrawingId(drawing.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSelectedDrawingId(drawing.id);
                    setModalDrawing(drawing);
                    setIsSettingsModalOpen(true);
                  }}
                  className="cursor-pointer"
                />

                {/* 1. PROFIT BOX (Take Profit) */}
                <rect
                  x={leftX}
                  y={profitTop}
                  width={boxWidth}
                  height={profitHeight}
                  fill="rgba(8, 153, 129, 0.22)"
                  stroke="#089981"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  className="pointer-events-none"
                />

                {/* 2. LOSS BOX (Stop Loss) */}
                <rect
                  x={leftX}
                  y={lossTop}
                  width={boxWidth}
                  height={lossHeight}
                  fill="rgba(242, 54, 69, 0.22)"
                  stroke="#f23645"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                  className="pointer-events-none"
                />

                {/* 3. ENTRY LINE (Middle) */}
                <line
                  x1={leftX}
                  y1={entryY}
                  x2={leftX + boxWidth}
                  y2={entryY}
                  stroke="#2962ff"
                  strokeWidth="1.5"
                  className="pointer-events-none"
                />

                {/* 4. METRIC LABELS INSIDE BOXES */}
                {/* Target Label */}
                <g transform={`translate(${leftX + 8}, ${profitTop + 14})`} className="pointer-events-none">
                  <text fill="#089981" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    Цель: ${formatPrice(tpP, symbolInfo.precision)} (+{targetDist.toFixed(1)} / +{targetPercent}%)
                  </text>
                  <text y="12" fill="#089981" opacity="0.8" fontSize="9" fontFamily="monospace">
                    +${estProfitUsd} (+{rrRatio}R)
                  </text>
                </g>

                {/* Stop Label */}
                <g transform={`translate(${leftX + 8}, ${lossTop + lossHeight - 16})`} className="pointer-events-none">
                  <text fill="#f23645" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    Стоп: ${formatPrice(slP, symbolInfo.precision)} (-{stopDist.toFixed(1)} / -{stopPercent}%)
                  </text>
                  <text y="12" fill="#f23645" opacity="0.8" fontSize="9" fontFamily="monospace">
                    -${estRiskUsd} (-{riskSettings.riskPercent}%)
                  </text>
                </g>

                {/* Center Risk/Reward Badge & Trade Execution Button */}
                <g transform={`translate(${centerX}, ${entryY})`} className="pointer-events-auto">
                  <foreignObject
                    x="-80"
                    y="-13"
                    width="160"
                    height="28"
                    className="overflow-visible pointer-events-auto"
                  >
                    <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 bg-[#181b24]/95 hover:bg-[#181b24] border border-[#2a2e39] rounded-lg shadow-xl backdrop-blur-sm text-[10px] font-mono select-none">
                      <span className="text-[#787b86]">R:R</span>
                      <span className="font-bold text-white text-[11px]">{rrRatio}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          executeTrade(isLong ? 'long' : 'short', slP, tpP);
                        }}
                        title={`Открыть сделку ${isLong ? 'LONG' : 'SHORT'} со стопом $${slP} и тейком $${tpP}`}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-transform active:scale-95 cursor-pointer ${
                          isLong
                            ? 'bg-[#089981] hover:bg-[#089981]/80 text-white'
                            : 'bg-[#f23645] hover:bg-[#f23645]/80 text-white'
                        }`}
                      >
                        ⚡ Сделка
                      </button>
                    </div>
                  </foreignObject>
                </g>

                {/* Price Scale Badges on the right axis when selected */}
                {isSelected && (
                  <>
                    <g transform={`translate(${containerRef.current?.clientWidth ? containerRef.current.clientWidth - 56 : 950}, ${slY - 9})`} className="pointer-events-none">
                      <rect x="0" y="0" width="54" height="18" rx="3" fill="#f23645" />
                      <text x="27" y="12" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                        ${formatPrice(slP, symbolInfo.precision)}
                      </text>
                    </g>
                    <g transform={`translate(${containerRef.current?.clientWidth ? containerRef.current.clientWidth - 56 : 950}, ${tpY - 9})`} className="pointer-events-none">
                      <rect x="0" y="0" width="54" height="18" rx="3" fill="#089981" />
                      <text x="27" y="12" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                        ${formatPrice(tpP, symbolInfo.precision)}
                      </text>
                    </g>
                    <g transform={`translate(${containerRef.current?.clientWidth ? containerRef.current.clientWidth - 56 : 950}, ${entryY - 9})`} className="pointer-events-none">
                      <rect x="0" y="0" width="54" height="18" rx="3" fill="#2962ff" />
                      <text x="27" y="12" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                        ${formatPrice(entryP, symbolInfo.precision)}
                      </text>
                    </g>
                  </>
                )}

                {/* 5. INTERACTIVE HANDLES WHEN SELECTED */}
                {isSelected && !drawing.isLocked && (
                  <>
                    {/* Top Boundary Handle */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, isLong ? 'pos_target' : 'pos_stop')}
                      className="tv-drawing-handle cursor-ns-resize pointer-events-auto"
                    >
                      <circle cx={centerX} cy={isLong ? tpY : slY} r="14" fill="transparent" />
                      <circle
                        cx={centerX}
                        cy={isLong ? tpY : slY}
                        r="5"
                        fill="#ffffff"
                        stroke={isLong ? '#089981' : '#f23645'}
                        strokeWidth="2.5"
                      />
                    </g>

                    {/* Bottom Boundary Handle */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, isLong ? 'pos_stop' : 'pos_target')}
                      className="tv-drawing-handle cursor-ns-resize pointer-events-auto"
                    >
                      <circle cx={centerX} cy={isLong ? slY : tpY} r="14" fill="transparent" />
                      <circle
                        cx={centerX}
                        cy={isLong ? slY : tpY}
                        r="5"
                        fill="#ffffff"
                        stroke={isLong ? '#f23645' : '#089981'}
                        strokeWidth="2.5"
                      />
                    </g>

                    {/* Entry Line Handle */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'pos_entry')}
                      className="tv-drawing-handle cursor-ns-resize pointer-events-auto"
                    >
                      <circle cx={leftX + 16} cy={entryY} r="12" fill="transparent" />
                      <circle cx={leftX + 16} cy={entryY} r="4.5" fill="#ffffff" stroke="#2962ff" strokeWidth="2" />
                    </g>

                    {/* Left Width Resize Handle */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'pos_left')}
                      className="tv-drawing-handle cursor-ew-resize pointer-events-auto"
                    >
                      <circle cx={leftX} cy={entryY} r="12" fill="transparent" />
                      <circle cx={leftX} cy={entryY} r="4.5" fill="#ffffff" stroke="#787b86" strokeWidth="2" />
                    </g>

                    {/* Right Width Resize Handle */}
                    <g
                      onMouseDown={(e) => handleStartDrag(e, drawing.id, 'pos_right')}
                      className="tv-drawing-handle cursor-ew-resize pointer-events-auto"
                    >
                      <circle cx={leftX + boxWidth} cy={entryY} r="12" fill="transparent" />
                      <circle cx={leftX + boxWidth} cy={entryY} r="4.5" fill="#ffffff" stroke="#787b86" strokeWidth="2" />
                    </g>
                  </>
                )}
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
                <g>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#089981"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <circle cx={p1.x} cy={p1.y} r="5" fill="#ffffff" stroke="#089981" strokeWidth="2" />
                  <circle cx={p2.x} cy={p2.y} r="5" fill="#ffffff" stroke="#089981" strokeWidth="2" />
                </g>
              );
            })()}

            {activeTool === 'ray' && (() => {
              const p1 = getCoordinates(startPoint);
              const p2 = getCoordinates(currentMousePoint);
              if (p1.x === null || p1.y === null || p2.x === null || p2.y === null) return null;

              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              let endX = p2.x;
              let endY = p2.y;

              if (Math.abs(dx) < 0.001) {
                endY = dy >= 0 ? 3000 : -1000;
              } else if (dx > 0) {
                const m = dy / dx;
                endX = Math.max(3000, p2.x + 1000);
                endY = p1.y + m * (endX - p1.x);
              } else {
                const m = dy / dx;
                endX = Math.min(-1000, p2.x - 1000);
                endY = p1.y + m * (endX - p1.x);
              }

              return (
                <g>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={endX}
                    y2={endY}
                    stroke="#2962ff"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <circle cx={p1.x} cy={p1.y} r="5" fill="#ffffff" stroke="#2962ff" strokeWidth="2" />
                  <circle cx={p2.x} cy={p2.y} r="5" fill="#ffffff" stroke="#2962ff" strokeWidth="2" />
                </g>
              );
            })()}
          </>
        )}

        {/* ========================================================================= */}
        {/* 3. MAGNET SNAP VISUAL INDICATOR                                            */}
        {/* ========================================================================= */}
        {activeSnap && (
          <g className="pointer-events-none select-none">
            <circle
              cx={activeSnap.coord.x}
              cy={activeSnap.coord.y}
              r="9"
              fill="rgba(41, 98, 255, 0.25)"
              stroke="#2962ff"
              strokeWidth="1.5"
            />
            <circle
              cx={activeSnap.coord.x}
              cy={activeSnap.coord.y}
              r="3"
              fill="#ffffff"
            />
            <g transform={`translate(${activeSnap.coord.x + 12}, ${activeSnap.coord.y - 12})`}>
              <rect
                x="0"
                y="0"
                width="84"
                height="20"
                rx="4"
                fill="#181b24"
                stroke="#2962ff"
                strokeWidth="1"
                className="shadow-lg"
              />
              <text
                x="42"
                y="14"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {activeSnap.type.toUpperCase()}: ${formatPrice(activeSnap.price)}
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* ========================================================================= */}
      {/* 3. TRADINGVIEW FLOATING ACTION TOOLBAR FOR SELECTED DRAWING                */}
      {/* ========================================================================= */}
      {selectedDrawing && selectedToolbarPos && (
        <div
          ref={toolbarRef}
          style={{
            left: `${selectedToolbarPos.x}px`,
            top: `${selectedToolbarPos.y}px`,
          }}
          className="tv-floating-toolbar absolute pointer-events-auto z-40 bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-xl shadow-2xl p-1.5 flex items-center gap-2 select-none"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
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

          {/* Extend Right toggle for Rectangle */}
          {selectedDrawing.type === 'rectangle' && (
            <button
              onClick={() =>
                updateDrawing(selectedDrawing.id, {
                  extendRight: !selectedDrawing.extendRight,
                })
              }
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                selectedDrawing.extendRight
                  ? 'border-tv-blue bg-tv-blue/20 text-tv-blue font-medium'
                  : 'border-[#2a2e39] text-tv-textMuted hover:text-white'
              }`}
              title="Продлить прямоугольник вправо"
            >
              {selectedDrawing.extendRight ? 'Продлен ➔' : 'Вправо ➔'}
            </button>
          )}

          {/* Toggle Ray / Segment for lines and rays */}
          {(selectedDrawing.type === 'trendline' || selectedDrawing.type === 'ray') && (
            <button
              onClick={() => {
                const isRayNow = selectedDrawing.type === 'ray' || !!selectedDrawing.extendRight;
                updateDrawing(selectedDrawing.id, {
                  type: isRayNow ? 'trendline' : 'ray',
                  extendRight: !isRayNow,
                });
              }}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                selectedDrawing.type === 'ray' || selectedDrawing.extendRight
                  ? 'border-tv-blue bg-tv-blue/20 text-tv-blue font-medium'
                  : 'border-[#2a2e39] text-tv-textMuted hover:text-white'
              }`}
              title="Переключить: Отрезок (начало и конец) / Луч (бесконечный луч вправо)"
            >
              {selectedDrawing.type === 'ray' || selectedDrawing.extendRight ? 'Луч ➔' : 'Отрезок'}
            </button>
          )}

          {/* Templates Dropdown Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsTemplateMenuOpen(!isTemplateMenuOpen);
              }}
              title="Шаблоны оформления (Presets)"
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                isTemplateMenuOpen
                  ? 'bg-tv-blue/20 text-tv-blue'
                  : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            {isTemplateMenuOpen && (
              <div
                className="absolute left-0 bottom-full mb-2 w-48 bg-[#181b24] border border-[#2a2e39] rounded-xl shadow-2xl p-1.5 z-50 space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 text-[9px] font-semibold uppercase text-tv-textMuted border-b border-[#242731]">
                  Шаблоны ({selectedDrawing.type === 'rectangle' ? 'Прямоугольник' : 'Фигура'})
                </div>
                {loadStoredDrawingTemplates()
                  .filter((tpl) => tpl.tool === selectedDrawing.type)
                  .map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        updateDrawing(selectedDrawing.id, tpl.settings);
                        setIsTemplateMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-[#242731] text-[#d1d4dc] hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: tpl.settings.color || '#2962ff' }}
                        />
                        <span>{tpl.name}</span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Quick Trade Execution from toolbar for Position Tools */}
          {(selectedDrawing.type === 'position_long' || selectedDrawing.type === 'position_short') && selectedDrawing.riskReward && (
            <button
              onClick={() => {
                const isLong = selectedDrawing.type === 'position_long';
                executeTrade(
                  isLong ? 'long' : 'short',
                  selectedDrawing.riskReward!.stopLossPrice,
                  selectedDrawing.riskReward!.takeProfitPrice
                );
              }}
              title="Открыть сделку по текущим параметрам SL и TP"
              className="px-2.5 py-1 bg-[#2962ff] hover:bg-[#2962ff]/80 text-white rounded-lg text-xs font-bold font-mono transition-transform active:scale-95 flex items-center gap-1 shadow-md cursor-pointer"
            >
              <span>⚡ Открыть сделку</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => {
              setModalDrawing(selectedDrawing);
              setIsSettingsModalOpen(true);
            }}
            title="Все настройки (Двойной клик)"
            className="p-1.5 text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover rounded-lg transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Lock / Unlock Toggle Button */}
          <button
            onClick={() => {
              updateDrawing(selectedDrawing.id, {
                isLocked: !selectedDrawing.isLocked,
              });
            }}
            title={selectedDrawing.isLocked ? 'Разблокировать объект' : 'Заблокировать объект'}
            className={`p-1.5 rounded-lg transition-colors ${
              selectedDrawing.isLocked
                ? 'text-tv-yellow bg-tv-yellow/10'
                : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
            }`}
          >
            {selectedDrawing.isLocked ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
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

      {/* Settings Modal */}
      {isSettingsModalOpen && modalDrawing && (
        <DrawingSettingsModal
          isOpen={isSettingsModalOpen}
          drawing={modalDrawing}
          onClose={() => {
            setIsSettingsModalOpen(false);
            setModalDrawing(null);
          }}
          onUpdate={(id, updates) => {
            updateDrawing(id, updates);
            setModalDrawing((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
          }}
          pricePrecision={symbolInfo?.pricePrecision || 2}
        />
      )}
    </div>
  );
};
