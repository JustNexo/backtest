import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  IPriceLine,
  Time,
  createSeriesMarkers,
} from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { formatCurrency, formatDateTime, formatPercent, formatPrice, formatTickMark, TIMEZONE_OPTIONS } from '../../utils/formatters';
import { calculateRiskPosition } from '../../services/tradeEngine';
import { Scissors, GripVertical, X, Globe, ChevronDown, Check } from 'lucide-react';
import { DrawingLayer } from './DrawingLayer';

interface DragState {
  type:
    | 'pos_sl'
    | 'pos_tp'
    | 'limit_price'
    | 'limit_sl'
    | 'limit_tp'
    | 'preview_sl'
    | 'preview_tp'
    | 'preview_entry';
  orderId?: string;
}

export const TradingViewChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Active Position lines
  const entryLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);

  // Pre-trade Order Setup preview lines (draggable before opening trade)
  const previewEntryLineRef = useRef<IPriceLine | null>(null);
  const previewSlLineRef = useRef<IPriceLine | null>(null);
  const previewTpLineRef = useRef<IPriceLine | null>(null);

  // Limit order lines map: orderId -> [limitLine, slLine, tpLine]
  const limitLinesMapRef = useRef<Map<string, IPriceLine[]>>(new Map());

  // Fractals markers reference
  const fractalsMarkersRef = useRef<any>(null);

  // Render tick to keep overlay handles locked to coordinates on chart pan/zoom
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isTzDropdownOpen, setIsTzDropdownOpen] = useState(false);
  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
  const [candleSeriesInstance, setCandleSeriesInstance] = useState<ISeriesApi<'Candlestick'> | null>(null);

  const {
    visibleCandles,
    candleColors,
    themeSettings,
    replay,
    cutAtTime,
    cancelReplaySelection,
    activePosition,
    limitOrders,
    balance,
    riskSettings,
    showFractals,
    timezone,
    setTimezone,
    orderSetup,
    updateOrderSetup,
    updateActivePositionSL,
    updateActivePositionTP,
    updateLimitOrderPrice,
    updateLimitOrderSL,
    updateLimitOrderTP,
    cancelLimitOrder,
  } = useChart();

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: themeSettings.backgroundColor },
        textColor: themeSettings.textColor,
        fontSize: 12,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif",
      },
      localization: {
        timeFormatter: (ts: number) => formatDateTime(ts, timezone),
        dateFormat: 'yyyy-MM-dd',
      },
      grid: {
        vertLines: {
          visible: themeSettings.showVerticalGrid,
          color: themeSettings.gridColor,
          style: LineStyle.SparseDotted,
        },
        horzLines: {
          visible: themeSettings.showHorizontalGrid,
          color: themeSettings.gridColor,
          style: LineStyle.SparseDotted,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#787b86',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2a2e39',
        },
        horzLine: {
          width: 1,
          color: '#787b86',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#2a2e39',
        },
      },
      rightPriceScale: {
        borderColor: themeSettings.borderColor,
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: themeSettings.borderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 14,
        barSpacing: 8,
        minBarSpacing: 3,
        tickMarkFormatter: (time: any, tickMarkType: any) => formatTickMark(time, tickMarkType, timezone),
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: candleColors.upColor,
      downColor: candleColors.downColor,
      borderVisible: candleColors.showBorders,
      borderUpColor: candleColors.borderUpColor,
      borderDownColor: candleColors.borderDownColor,
      wickVisible: candleColors.showWicks,
      wickUpColor: candleColors.wickUpColor,
      wickDownColor: candleColors.wickDownColor,
      priceFormat: {
        type: 'price',
        precision: 1,
        minMove: 0.1,
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    setChartInstance(chart);
    setCandleSeriesInstance(candleSeries);

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      forceUpdate();
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      forceUpdate();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      setChartInstance(null);
      setCandleSeriesInstance(null);
    };
  }, []);

  // Update theme & localization
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: themeSettings.backgroundColor },
        textColor: themeSettings.textColor,
      },
      localization: {
        timeFormatter: (ts: number) => formatDateTime(ts, timezone),
      },
      grid: {
        vertLines: {
          visible: themeSettings.showVerticalGrid,
          color: themeSettings.gridColor,
        },
        horzLines: {
          visible: themeSettings.showHorizontalGrid,
          color: themeSettings.gridColor,
        },
      },
      rightPriceScale: {
        borderColor: themeSettings.borderColor,
      },
      timeScale: {
        borderColor: themeSettings.borderColor,
        tickMarkFormatter: (time: any, tickMarkType: any) => formatTickMark(time, tickMarkType, timezone),
      },
    });
  }, [themeSettings, timezone]);

  // Update candle colors
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    candleSeriesRef.current.applyOptions({
      upColor: candleColors.upColor,
      downColor: candleColors.downColor,
      borderVisible: candleColors.showBorders,
      borderUpColor: candleColors.borderUpColor,
      borderDownColor: candleColors.borderDownColor,
      wickVisible: candleColors.showWicks,
      wickUpColor: candleColors.wickUpColor,
      wickDownColor: candleColors.wickDownColor,
    });
  }, [candleColors]);

  // Update candle data & volume data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || visibleCandles.length === 0) return;

    const formattedCandles = visibleCandles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const formattedVolume = visibleCandles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? candleColors.volumeUpColor : candleColors.volumeDownColor,
    }));

    candleSeriesRef.current.setData(formattedCandles);
    volumeSeriesRef.current.setData(formattedVolume);
    forceUpdate();
  }, [visibleCandles, candleColors.volumeUpColor, candleColors.volumeDownColor]);

  // Update Williams Fractals Indicator Markers
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    if (!showFractals) {
      if (fractalsMarkersRef.current) {
        fractalsMarkersRef.current.setMarkers([]);
      }
      return;
    }

    const markers: any[] = [];
    const len = visibleCandles.length;
    for (let i = 2; i < len - 2; i++) {
      const c = visibleCandles[i];
      if (
        c.high > visibleCandles[i - 2].high &&
        c.high > visibleCandles[i - 1].high &&
        c.high > visibleCandles[i + 1].high &&
        c.high > visibleCandles[i + 2].high
      ) {
        markers.push({
          time: c.time as Time,
          position: 'aboveBar',
          color: '#089981',
          shape: 'arrowDown',
          text: '▲',
        });
      }

      if (
        c.low < visibleCandles[i - 2].low &&
        c.low < visibleCandles[i - 1].low &&
        c.low < visibleCandles[i + 1].low &&
        c.low < visibleCandles[i + 2].low
      ) {
        markers.push({
          time: c.time as Time,
          position: 'belowBar',
          color: '#f23645',
          shape: 'arrowUp',
          text: '▼',
        });
      }
    }

    if (!fractalsMarkersRef.current) {
      fractalsMarkersRef.current = createSeriesMarkers(candleSeriesRef.current, markers);
    } else {
      fractalsMarkersRef.current.setMarkers(markers);
    }
  }, [showFractals, visibleCandles]);

  // Update Active Position Price Lines
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    if (entryLineRef.current) {
      series.removePriceLine(entryLineRef.current);
      entryLineRef.current = null;
    }
    if (slLineRef.current) {
      series.removePriceLine(slLineRef.current);
      slLineRef.current = null;
    }
    if (tpLineRef.current) {
      series.removePriceLine(tpLineRef.current);
      tpLineRef.current = null;
    }

    if (activePosition) {
      const { side, entryPrice, stopLoss, takeProfit, size } = activePosition;

      entryLineRef.current = series.createPriceLine({
        price: entryPrice,
        color: '#2962ff',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${side.toUpperCase()} ${size} BTC @ ${formatPrice(entryPrice)}`,
      });

      if (stopLoss !== null) {
        const slDist = Math.abs(entryPrice - stopLoss);
        const slLossUsd = slDist * size;
        const slLossPercent = (slLossUsd / balance) * 100;

        slLineRef.current = series.createPriceLine({
          price: stopLoss,
          color: '#f23645',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL: ${formatPrice(stopLoss)} (-$${slLossUsd.toFixed(1)} / -${slLossPercent.toFixed(1)}%)`,
        });
      }

      if (takeProfit !== null) {
        const tpDist = Math.abs(takeProfit - entryPrice);
        const tpProfitUsd = tpDist * size;
        const slDist = stopLoss !== null ? Math.abs(entryPrice - stopLoss) : 0;
        const rr = slDist > 0 ? (tpDist / slDist).toFixed(2) : '-';

        tpLineRef.current = series.createPriceLine({
          price: takeProfit,
          color: '#089981',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP: ${formatPrice(takeProfit)} (+$${tpProfitUsd.toFixed(1)} / ${rr}R)`,
        });
      }
    }

    forceUpdate();

    return () => {
      if (entryLineRef.current) series.removePriceLine(entryLineRef.current);
      if (slLineRef.current) series.removePriceLine(slLineRef.current);
      if (tpLineRef.current) series.removePriceLine(tpLineRef.current);
    };
  }, [activePosition, balance]);

  // Update Pre-trade Order Setup Preview Lines (Draggable SL/TP before opening trade)
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    if (previewEntryLineRef.current) {
      series.removePriceLine(previewEntryLineRef.current);
      previewEntryLineRef.current = null;
    }
    if (previewSlLineRef.current) {
      series.removePriceLine(previewSlLineRef.current);
      previewSlLineRef.current = null;
    }
    if (previewTpLineRef.current) {
      series.removePriceLine(previewTpLineRef.current);
      previewTpLineRef.current = null;
    }

    // Only show preview if NO active position is currently open
    if (!activePosition && orderSetup.enabled) {
      const { side, orderType: oType, entryPrice, stopLoss, takeProfit } = orderSetup;
      const riskCalc = calculateRiskPosition(balance, riskSettings, entryPrice, stopLoss, takeProfit);

      // 1. Preview Entry Line
      previewEntryLineRef.current = series.createPriceLine({
        price: entryPrice,
        color: oType === 'limit' ? '#f7a600' : '#2962ff',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ПРЕДПРОСМОТР ВХОДА (${side.toUpperCase()} ${riskCalc.sizeBtc} BTC)`,
      });

      // 2. Preview Stop Loss Line
      previewSlLineRef.current = series.createPriceLine({
        price: stopLoss,
        color: '#f23645',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ПРЕДПРОСМОТР SL (-$${riskCalc.riskUsd} / -${riskSettings.riskPercent}%)`,
      });

      // 3. Preview Take Profit Line
      previewTpLineRef.current = series.createPriceLine({
        price: takeProfit,
        color: '#089981',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ПРЕДПРОСМОТР TP (+$${riskCalc.potentialProfitUsd} / ${riskCalc.riskRewardRatio}R)`,
      });
    }

    forceUpdate();

    return () => {
      if (previewEntryLineRef.current) series.removePriceLine(previewEntryLineRef.current);
      if (previewSlLineRef.current) series.removePriceLine(previewSlLineRef.current);
      if (previewTpLineRef.current) series.removePriceLine(previewTpLineRef.current);
    };
  }, [activePosition, orderSetup, balance, riskSettings]);

  // Update Limit Order Price Lines
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    limitLinesMapRef.current.forEach((lines) => {
      lines.forEach((l) => series.removePriceLine(l));
    });
    limitLinesMapRef.current.clear();

    limitOrders.forEach((order) => {
      const lines: IPriceLine[] = [];

      const limitLine = series.createPriceLine({
        price: order.limitPrice,
        color: '#f7a600',
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `LIMIT ${order.side.toUpperCase()}: ${formatPrice(order.limitPrice)} (${order.size} BTC)`,
      });
      lines.push(limitLine);

      if (order.stopLoss !== null) {
        const slLine = series.createPriceLine({
          price: order.stopLoss,
          color: '#f23645',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `LIMIT SL: ${formatPrice(order.stopLoss)}`,
        });
        lines.push(slLine);
      }

      if (order.takeProfit !== null) {
        const tpLine = series.createPriceLine({
          price: order.takeProfit,
          color: '#089981',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `LIMIT TP: ${formatPrice(order.takeProfit)}`,
        });
        lines.push(tpLine);
      }

      limitLinesMapRef.current.set(order.id, lines);
    });

    forceUpdate();

    return () => {
      limitLinesMapRef.current.forEach((lines) => {
        lines.forEach((l) => series.removePriceLine(l));
      });
      limitLinesMapRef.current.clear();
    };
  }, [limitOrders]);

  // Drag-and-drop mouse handlers for active positions, limit orders, and pre-trade preview
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !candleSeriesRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;

      const newPrice = candleSeriesRef.current.coordinateToPrice(relativeY);
      if (!newPrice || isNaN(newPrice) || newPrice <= 0) return;

      const roundedPrice = Number(newPrice.toFixed(1));

      // Active position dragging
      if (dragState.type === 'pos_sl') {
        updateActivePositionSL(roundedPrice);
      } else if (dragState.type === 'pos_tp') {
        updateActivePositionTP(roundedPrice);
      }
      // Limit order dragging
      else if (dragState.type === 'limit_price' && dragState.orderId) {
        updateLimitOrderPrice(dragState.orderId, roundedPrice);
      } else if (dragState.type === 'limit_sl' && dragState.orderId) {
        updateLimitOrderSL(dragState.orderId, roundedPrice);
      } else if (dragState.type === 'limit_tp' && dragState.orderId) {
        updateLimitOrderTP(dragState.orderId, roundedPrice);
      }
      // PRE-TRADE SETUP DRAGGING (BEFORE OPENING POSITION!)
      else if (dragState.type === 'preview_sl') {
        updateOrderSetup({ stopLoss: roundedPrice });
      } else if (dragState.type === 'preview_tp') {
        updateOrderSetup({ takeProfit: roundedPrice });
      } else if (dragState.type === 'preview_entry') {
        updateOrderSetup({ entryPrice: roundedPrice });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    dragState,
    updateActivePositionSL,
    updateActivePositionTP,
    updateLimitOrderPrice,
    updateLimitOrderSL,
    updateLimitOrderTP,
    updateOrderSetup,
  ]);

  // Click handler on chart for Cut / Scissors Mode
  useEffect(() => {
    if (!chartRef.current) return;

    const clickCallback = (param: any) => {
      if (replay.isSelectingCutPoint && param.time) {
        cutAtTime(Number(param.time));
      }
    };

    chartRef.current.subscribeClick(clickCallback);
    return () => {
      chartRef.current?.unsubscribeClick(clickCallback);
    };
  }, [replay.isSelectingCutPoint, cutAtTime]);

  // Coordinates calculation for draggable badges
  const series = candleSeriesRef.current;
  const posSlY = series && activePosition?.stopLoss ? series.priceToCoordinate(activePosition.stopLoss) : null;
  const posTpY = series && activePosition?.takeProfit ? series.priceToCoordinate(activePosition.takeProfit) : null;

  // Pre-trade setup preview coordinates
  const showPreview = !activePosition && orderSetup.enabled;
  const prevEntryY = series && showPreview ? series.priceToCoordinate(orderSetup.entryPrice) : null;
  const prevSlY = series && showPreview ? series.priceToCoordinate(orderSetup.stopLoss) : null;
  const prevTpY = series && showPreview ? series.priceToCoordinate(orderSetup.takeProfit) : null;

  // Pre-trade calculations for badge labels
  const prevCalc = useMemo(() => {
    return calculateRiskPosition(
      balance,
      riskSettings,
      orderSetup.entryPrice,
      orderSetup.stopLoss,
      orderSetup.takeProfit
    );
  }, [balance, riskSettings, orderSetup]);

  const currentTzObj = TIMEZONE_OPTIONS.find((t) => t.id === timezone) || TIMEZONE_OPTIONS[0];

  return (
    <div className="relative w-full h-full flex flex-col bg-tv-bg overflow-hidden select-none">
      {/* Cut Selection Banner Overlay */}
      {replay.isSelectingCutPoint && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-tv-blue text-white rounded-lg shadow-xl animate-pulse font-medium text-sm">
          <Scissors className="w-4 h-4 animate-bounce" />
          <span>Кликните на любую свечу на графике, чтобы обрезать график и начать симуляцию</span>
          <button
            onClick={cancelReplaySelection}
            className="ml-2 px-2 py-0.5 bg-black/30 hover:bg-black/50 text-xs rounded transition-colors"
          >
            Отмена (Esc)
          </button>
        </div>
      )}

      {/* Chart Canvas */}
      <div
        ref={containerRef}
        className={`w-full h-full relative ${
          replay.isSelectingCutPoint ? 'cursor-crosshair' : 'cursor-default'
        }`}
      />

      {/* INTERACTIVE DRAGGABLE BADGES OVERLAY */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* ========================================================================= */}
        {/* 1. PRE-TRADE ORDER SETUP (DRAGGABLE BEFORE OPENING POSITION!)             */}
        {/* ========================================================================= */}
        {showPreview && (
          <>
            {/* Draggable Preview Stop Loss Handle */}
            {prevSlY !== null && (
              <div
                style={{ top: `${prevSlY}px` }}
                className="absolute left-16 -translate-y-1/2 pointer-events-auto z-20 flex items-center group cursor-ns-resize select-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragState({ type: 'preview_sl' });
                }}
                title="Зажмите и тяните для настройки Stop Loss ДО входа в позицию"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f23645]/95 hover:bg-[#f23645] text-white text-[11px] font-mono font-bold rounded-lg shadow-xl border border-white/30 transition-all group-hover:scale-105">
                  <GripVertical className="w-3.5 h-3.5 opacity-80" />
                  <span>SL: ${formatPrice(orderSetup.stopLoss)}</span>
                  <span className="text-[10px] opacity-80 pl-1 border-l border-white/30">
                    -${prevCalc.riskUsd} (-{riskSettings.riskPercent}%)
                  </span>
                  <span className="text-[9px] bg-black/30 px-1 py-0.2 rounded font-sans uppercase">
                    Тянуть
                  </span>
                </div>
              </div>
            )}

            {/* Draggable Preview Take Profit Handle */}
            {prevTpY !== null && (
              <div
                style={{ top: `${prevTpY}px` }}
                className="absolute left-16 -translate-y-1/2 pointer-events-auto z-20 flex items-center group cursor-ns-resize select-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragState({ type: 'preview_tp' });
                }}
                title="Зажмите и тяните для настройки Take Profit ДО входа в позицию"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#089981]/95 hover:bg-[#089981] text-white text-[11px] font-mono font-bold rounded-lg shadow-xl border border-white/30 transition-all group-hover:scale-105">
                  <GripVertical className="w-3.5 h-3.5 opacity-80" />
                  <span>TP: ${formatPrice(orderSetup.takeProfit)}</span>
                  <span className="text-[10px] opacity-80 pl-1 border-l border-white/30">
                    +${prevCalc.potentialProfitUsd} ({prevCalc.riskRewardRatio}R)
                  </span>
                  <span className="text-[9px] bg-black/30 px-1 py-0.2 rounded font-sans uppercase">
                    Тянуть
                  </span>
                </div>
              </div>
            )}

            {/* Draggable Preview Limit Entry Handle (if Limit order selected) */}
            {prevEntryY !== null && orderSetup.orderType === 'limit' && (
              <div
                style={{ top: `${prevEntryY}px` }}
                className="absolute left-16 -translate-y-1/2 pointer-events-auto z-20 flex items-center group cursor-ns-resize select-none"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragState({ type: 'preview_entry' });
                }}
                title="Зажмите и тяните для изменения цены лимитного ордера"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f7a600]/95 hover:bg-[#f7a600] text-black text-[11px] font-mono font-bold rounded-lg shadow-xl border border-black/30 transition-all group-hover:scale-105">
                  <GripVertical className="w-3.5 h-3.5 opacity-80" />
                  <span>
                    ВХОД LIMIT: ${formatPrice(orderSetup.entryPrice)} ({prevCalc.sizeBtc} BTC)
                  </span>
                  <span className="text-[9px] bg-black/20 px-1 py-0.2 rounded font-sans uppercase">
                    Тянуть
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* 2. ACTIVE POSITION HANDLES                                                */}
        {/* ========================================================================= */}
        {posSlY !== null && activePosition?.stopLoss && (
          <div
            style={{ top: `${posSlY}px` }}
            className="absolute left-16 -translate-y-1/2 pointer-events-auto z-20 flex items-center group cursor-ns-resize select-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragState({ type: 'pos_sl' });
            }}
            title="Перетащите вверх или вниз для изменения Stop Loss"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f23645]/90 hover:bg-[#f23645] text-white text-[11px] font-mono font-bold rounded-lg shadow-lg border border-white/20 transition-all group-hover:scale-105">
              <GripVertical className="w-3.5 h-3.5 opacity-80" />
              <span>SL: ${formatPrice(activePosition.stopLoss)}</span>
              <span className="text-[10px] opacity-80 pl-1 border-l border-white/30">
                -${(Math.abs(activePosition.entryPrice - activePosition.stopLoss) * activePosition.size).toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {posTpY !== null && activePosition?.takeProfit && (
          <div
            style={{ top: `${posTpY}px` }}
            className="absolute left-16 -translate-y-1/2 pointer-events-auto z-20 flex items-center group cursor-ns-resize select-none"
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragState({ type: 'pos_tp' });
            }}
            title="Перетащите вверх или вниз для изменения Take Profit"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#089981]/90 hover:bg-[#089981] text-white text-[11px] font-mono font-bold rounded-lg shadow-lg border border-white/20 transition-all group-hover:scale-105">
              <GripVertical className="w-3.5 h-3.5 opacity-80" />
              <span>TP: ${formatPrice(activePosition.takeProfit)}</span>
              <span className="text-[10px] opacity-80 pl-1 border-l border-white/30">
                +${(Math.abs(activePosition.takeProfit - activePosition.entryPrice) * activePosition.size).toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. PENDING LIMIT ORDERS HANDLES                                           */}
        {/* ========================================================================= */}
        {series &&
          limitOrders.map((order) => {
            const limitY = series.priceToCoordinate(order.limitPrice);
            const slY = order.stopLoss ? series.priceToCoordinate(order.stopLoss) : null;
            const tpY = order.takeProfit ? series.priceToCoordinate(order.takeProfit) : null;

            return (
              <React.Fragment key={order.id}>
                {limitY !== null && (
                  <div
                    style={{ top: `${limitY}px` }}
                    className="absolute left-20 -translate-y-1/2 pointer-events-auto z-20 flex items-center group cursor-ns-resize select-none"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({ type: 'limit_price', orderId: order.id });
                    }}
                    title="Перетащите для изменения цены лимитного ордера"
                  >
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f7a600]/95 hover:bg-[#f7a600] text-black text-[11px] font-mono font-bold rounded-lg shadow-lg border border-black/20 transition-all group-hover:scale-105">
                      <GripVertical className="w-3.5 h-3.5 opacity-70" />
                      <span>
                        LIMIT {order.side.toUpperCase()}: ${formatPrice(order.limitPrice)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelLimitOrder(order.id);
                        }}
                        title="Отменить лимитный ордер"
                        className="p-0.5 hover:bg-black/20 rounded ml-1"
                      >
                        <X className="w-3 h-3 text-black" />
                      </button>
                    </div>
                  </div>
                )}

                {slY !== null && order.stopLoss && (
                  <div
                    style={{ top: `${slY}px` }}
                    className="absolute left-24 -translate-y-1/2 pointer-events-auto z-20 flex items-center group cursor-ns-resize select-none"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({ type: 'limit_sl', orderId: order.id });
                    }}
                    title="Перетащите для изменения SL лимитного ордера"
                  >
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-[#f23645]/80 hover:bg-[#f23645] text-white text-[10px] font-mono font-semibold rounded shadow border border-white/20">
                      <GripVertical className="w-3 h-3 opacity-70" />
                      <span>SL: ${formatPrice(order.stopLoss)}</span>
                    </div>
                  </div>
                )}

                {tpY !== null && order.takeProfit && (
                  <div
                    style={{ top: `${tpY}px` }}
                    className="absolute left-24 -translate-y-1/2 pointer-events-auto z-20 flex items-center group cursor-ns-resize select-none"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDragState({ type: 'limit_tp', orderId: order.id });
                    }}
                    title="Перетащите для изменения TP лимитного ордера"
                  >
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-[#089981]/80 hover:bg-[#089981] text-white text-[10px] font-mono font-semibold rounded shadow border border-white/20">
                      <GripVertical className="w-3 h-3 opacity-70" />
                      <span>TP: ${formatPrice(order.takeProfit)}</span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
      </div>

      {/* ========================================================================= */}
      {/* 4. TRADINGVIEW TIMEZONE SELECTOR BADGE (Bottom-Right)                     */}
      {/* ========================================================================= */}
      <div className="absolute bottom-7 right-3 z-30 flex items-center select-none">
        <div className="relative">
          <button
            onClick={() => setIsTzDropdownOpen(!isTzDropdownOpen)}
            title="Выбрать часовой пояс времени графика"
            className="flex items-center gap-1 px-2 py-1 bg-[#1e222d]/90 hover:bg-[#2a2e39] backdrop-blur-md border border-[#2a2e39] text-tv-text hover:text-white rounded-lg text-[11px] font-mono transition-colors shadow-lg"
          >
            <Globe className="w-3 h-3 text-tv-blue" />
            <span>{currentTzObj.offset}</span>
            <ChevronDown className="w-3 h-3 text-tv-textMuted" />
          </button>

          {isTzDropdownOpen && (
            <div className="absolute bottom-full mb-2 right-0 w-64 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl py-1 z-40 max-h-72 overflow-y-auto">
              <div className="px-3 py-1 text-[10px] font-semibold text-tv-textMuted uppercase tracking-wider border-b border-[#2a2e39]">
                Часовой пояс (Timezone)
              </div>
              {TIMEZONE_OPTIONS.map((tz) => (
                <button
                  key={tz.id}
                  onClick={() => {
                    setTimezone(tz.id);
                    setIsTzDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    timezone === tz.id
                      ? 'bg-tv-blue/20 text-tv-blue font-semibold'
                      : 'hover:bg-tv-surfaceHover text-tv-text hover:text-white'
                  }`}
                >
                  <span className="truncate">{tz.label}</span>
                  {timezone === tz.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Drawing Layer (Rectangles, Lines, Levels) */}
      <DrawingLayer
        chart={chartInstance}
        candleSeries={candleSeriesInstance}
        containerRef={containerRef}
      />
    </div>
  );
};
