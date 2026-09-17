import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  IPriceLine,
  Time,
  createSeriesMarkers,
} from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { formatDateTime, formatPrice, formatTickMark, formatVolume, TIMEZONE_OPTIONS, getTimeframeSeconds } from '../../utils/formatters';
import { calculateRiskPosition } from '../../services/tradeEngine';
import { SUPPORTED_SYMBOLS, SupportedSymbol } from '../../types/session';
import { Scissors, GripVertical, X, Globe, ChevronDown, Check, Eye, EyeOff, Settings } from 'lucide-react';
import { DrawingLayer } from './DrawingLayer';
import { SessionsLayer } from './SessionsLayer';
import { SessionSettingsModal } from './SessionSettingsModal';
import { ScriptOverlayLayer } from './ScriptOverlayLayer';
import { NewsLayer } from './NewsLayer';



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

  // Custom Script dynamically generated LineSeries map: lineId -> LineSeries
  const scriptLineSeriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  // Render tick to keep overlay handles locked to coordinates on chart pan/zoom
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isTzDropdownOpen, setIsTzDropdownOpen] = useState(false);
  const [isSessionSettingsOpen, setIsSessionSettingsOpen] = useState(false);
  const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
  const [candleSeriesInstance, setCandleSeriesInstance] = useState<ISeriesApi<'Candlestick'> | null>(null);

  const {
    symbol,
    timeframe,
    visibleCandles,
    currentCandle,
    candleColors,
    showVolume,
    toggleVolume,
    updateCandleColors,
    themeSettings,
    replay,
    cutAtTime,
    cancelReplaySelection,
    activePosition,
    limitOrders,
    balance,
    riskSettings,
    showFractals,
    sessionsSettings,
    toggleSessions,
    updateSessionsSettings,
    newsFilter,
    toggleNews,
    executeTrade,
    activeScript,
    scriptOutput,
    clearScriptOutput,
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
    symbolInfo,
    viewportFocusTrigger,
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
          bottom: showVolume ? 0.2 : 0.05,
        },
      },
      timeScale: {
        borderColor: themeSettings.borderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 25,
        barSpacing: 8,
        minBarSpacing: 3,
        allowBoldLabels: true,
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
      visible: showVolume,
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

    // Continuous 60 FPS synchronization for trading badges during gestures (wheel zoom, canvas drag, price scale drag)
    let rafId: number | null = null;
    let wheelTimer: any = null;

    let pendingPriceZoomDelta = 0;
    let priceZoomRafId: number | null = null;

    const tickFrame = () => {
      forceUpdate();
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

    const processSmoothPriceZoom = () => {
      const container = containerRef.current;
      if (!container || !candleSeries) {
        priceZoomRafId = null;
        return;
      }

      if (Math.abs(pendingPriceZoomDelta) < 0.1) {
        pendingPriceZoomDelta = 0;
        priceZoomRafId = null;
        return;
      }

      // Smoothly consume a portion of pending delta per frame (smooth ease-out damping)
      const step = pendingPriceZoomDelta * 0.22;
      pendingPriceZoomDelta -= step;

      const rightScale = chart.priceScale('right');
      const currentRange = rightScale.getVisibleRange();

      let minPrice = currentRange ? currentRange.from : null;
      let maxPrice = currentRange ? currentRange.to : null;

      if (minPrice === null || maxPrice === null || isNaN(minPrice) || isNaN(maxPrice)) {
        const timeScaleHeight = 28;
        const topPrice = candleSeries.coordinateToPrice(0);
        const bottomPrice = candleSeries.coordinateToPrice(container.clientHeight - timeScaleHeight);
        if (topPrice !== null && bottomPrice !== null) {
          minPrice = Math.min(topPrice, bottomPrice);
          maxPrice = Math.max(topPrice, bottomPrice);
        }
      }

      if (minPrice !== null && maxPrice !== null && maxPrice > minPrice) {
        // Gentle exponential factor (~3.5% zoom per standard 100px wheel tick)
        const factor = Math.exp(step * 0.00035);

        // Center smoothly around midpoint for balanced, predictable expansion
        const centerPrice = (minPrice + maxPrice) / 2;

        const newMin = centerPrice - (centerPrice - minPrice) * factor;
        const newMax = centerPrice + (maxPrice - centerPrice) * factor;

        if (newMax > newMin && newMin > 0) {
          rightScale.setAutoScale(false);
          rightScale.setVisibleRange({ from: newMin, to: newMax });
          forceUpdate();
        }
      }

      priceZoomRafId = requestAnimationFrame(processSmoothPriceZoom);
    };

    const handleMouseDown = () => {
      startActiveSync();
    };

    const handleMouseUp = () => {
      stopActiveSync();
      forceUpdate();
    };

    const handleWheel = (e: WheelEvent) => {
      startActiveSync();
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        stopActiveSync();
        forceUpdate();
      }, 300);

      // Check if mouse is over the right price scale column
      if (containerEl && candleSeries) {
        const rect = containerEl.getBoundingClientRect();
        const priceScaleWidth = Math.max(65, chart.priceScale('right').width() || 75);
        const timeScaleHeight = 28;
        const isOverPriceScale =
          e.clientX >= (rect.right - priceScaleWidth - 5) &&
          e.clientX <= rect.right + 10 &&
          e.clientY >= rect.top &&
          e.clientY <= (rect.bottom - timeScaleHeight);

        if (isOverPriceScale) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          let delta = e.deltaY;
          if (e.deltaMode === 1) {
            delta *= 28; // lines
          } else if (e.deltaMode === 2) {
            delta *= 80; // pages
          }

          // Clamp single wheel event to prevent huge jerks
          const clamped = Math.max(-120, Math.min(120, delta));
          pendingPriceZoomDelta = Math.max(-280, Math.min(280, pendingPriceZoomDelta + clamped));

          if (priceZoomRafId === null) {
            priceZoomRafId = requestAnimationFrame(processSmoothPriceZoom);
          }
        }
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        const priceScaleWidth = Math.max(65, chart.priceScale('right').width() || 75);
        if (e.clientX >= (rect.right - priceScaleWidth - 5)) {
          chart.priceScale('right').setAutoScale(true);
          forceUpdate();
        }
      }
    };

    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      containerEl.addEventListener('wheel', handleWheel, { passive: false, capture: true });
      containerEl.addEventListener('touchstart', handleMouseDown, { passive: true });
      window.addEventListener('touchend', handleMouseUp, { passive: true });
      containerEl.addEventListener('dblclick', handleDblClick);
    }

    const timeScale = chart.timeScale();
    const handleRangeChange = () => forceUpdate();
    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    timeScale.subscribeVisibleTimeRangeChange(handleRangeChange);

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
      forceUpdate();
    });

    if (containerEl) {
      resizeObserver.observe(containerEl);
    }

    return () => {
      stopActiveSync();
      if (wheelTimer) clearTimeout(wheelTimer);
      if (priceZoomRafId !== null) cancelAnimationFrame(priceZoomRafId);
      if (containerEl) {
        containerEl.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        containerEl.removeEventListener('wheel', handleWheel, true);
        containerEl.removeEventListener('touchstart', handleMouseDown);
        window.removeEventListener('touchend', handleMouseUp);
        containerEl.removeEventListener('dblclick', handleDblClick);
      }
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      timeScale.unsubscribeVisibleTimeRangeChange(handleRangeChange);
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

  // Update price precision when symbol changes
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const symInfo = SUPPORTED_SYMBOLS[symbol as SupportedSymbol] || SUPPORTED_SYMBOLS['BTCUSDT.P'];
    candleSeriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision: symInfo.pricePrecision,
        minMove: symInfo.minMove,
      },
    });
  }, [symbol]);

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

  // Update candle data, volume data, and volume visibility
  useEffect(() => {
    if (!candleSeriesRef.current || visibleCandles.length === 0) return;

    const formattedCandles = visibleCandles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const tfSec = getTimeframeSeconds(timeframe);
    const lastTime = visibleCandles[visibleCandles.length - 1].time;
    const futureWhitespace: Array<{ time: Time }> = [];
    for (let i = 1; i <= 60; i++) {
      futureWhitespace.push({
        time: (lastTime + i * tfSec) as Time,
      });
    }

    candleSeriesRef.current.setData([...formattedCandles, ...futureWhitespace] as any);

    if (volumeSeriesRef.current) {
      const isVolVisible = showVolume !== false;
      volumeSeriesRef.current.applyOptions({
        visible: isVolVisible,
      });

      if (chartRef.current) {
        chartRef.current.priceScale('right').applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: isVolVisible ? 0.2 : 0.05,
          },
        });
      }

      if (isVolVisible) {
        const formattedVolume = visibleCandles.map((c) => ({
          time: c.time as Time,
          value: c.volume,
          color: c.close >= c.open ? candleColors.volumeUpColor : candleColors.volumeDownColor,
        }));
        volumeSeriesRef.current.setData(formattedVolume);
      } else {
        volumeSeriesRef.current.setData([]);
      }
    }

    forceUpdate();
  }, [visibleCandles, showVolume, candleColors.volumeUpColor, candleColors.volumeDownColor]);

  // Viewport Focus: ONLY scrolls to real-time / cut candle on initial mount or explicit jump (NOT during step/play)
  const lastTriggerRef = useRef(viewportFocusTrigger);
  const hasInitiallyScrolledRef = useRef(false);

  useEffect(() => {
    if (!chartRef.current || visibleCandles.length === 0) return;

    if (!hasInitiallyScrolledRef.current) {
      hasInitiallyScrolledRef.current = true;
      lastTriggerRef.current = viewportFocusTrigger;
      requestAnimationFrame(() => {
        chartRef.current?.timeScale().scrollToPosition(0, false);
      });
      return;
    }

    if (viewportFocusTrigger !== lastTriggerRef.current) {
      lastTriggerRef.current = viewportFocusTrigger;
      requestAnimationFrame(() => {
        chartRef.current?.timeScale().scrollToPosition(0, false);
      });
    }
  }, [viewportFocusTrigger, visibleCandles.length]);

  // Combined Markers Effect: Williams Fractals + Custom Script Markers
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    const allMarkers: any[] = [];

    // 1. Williams Fractals
    if (showFractals) {
      const len = visibleCandles.length;
      for (let i = 2; i < len - 2; i++) {
        const c = visibleCandles[i];
        if (
          c.high > visibleCandles[i - 2].high &&
          c.high > visibleCandles[i - 1].high &&
          c.high > visibleCandles[i + 1].high &&
          c.high > visibleCandles[i + 2].high
        ) {
          allMarkers.push({
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
          allMarkers.push({
            time: c.time as Time,
            position: 'belowBar',
            color: '#f23645',
            shape: 'arrowUp',
            text: '▼',
          });
        }
      }
    }

    // 2. Custom Script Markers
    if (scriptOutput && scriptOutput.success && scriptOutput.markers.length > 0) {
      for (const m of scriptOutput.markers) {
        allMarkers.push({
          time: m.time as Time,
          position: m.position,
          shape: m.shape,
          color: m.color,
          text: m.text,
        });
      }
    }

    // Sort markers ascending by time (strict lightweight-charts requirement)
    allMarkers.sort((a, b) => Number(a.time) - Number(b.time));

    if (!fractalsMarkersRef.current) {
      fractalsMarkersRef.current = createSeriesMarkers(candleSeriesRef.current, allMarkers);
    } else {
      fractalsMarkersRef.current.setMarkers(allMarkers);
    }
  }, [showFractals, visibleCandles, scriptOutput]);

  // Dynamic Line Series for Custom Scripts
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Clean up existing script line series
    scriptLineSeriesMapRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (e) {}
    });
    scriptLineSeriesMapRef.current.clear();

    if (!scriptOutput || !scriptOutput.success || scriptOutput.lines.length === 0) {
      return;
    }

    // Add each plotted line
    scriptOutput.lines.forEach((line) => {
      try {
        const lineSeries = chart.addSeries(LineSeries, {
          color: line.color,
          lineWidth: (line.lineWidth as any) || 2,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          title: line.name,
        });
        const formattedData = line.data.map((d) => ({
          time: d.time as Time,
          value: d.value,
        }));
        lineSeries.setData(formattedData);
        scriptLineSeriesMapRef.current.set(line.id, lineSeries);
      } catch (err) {
        console.warn('Error adding custom script line series:', err);
      }
    });

    return () => {
      if (chartRef.current) {
        scriptLineSeriesMapRef.current.forEach((series) => {
          try {
            chartRef.current?.removeSeries(series);
          } catch (e) {}
        });
        scriptLineSeriesMapRef.current.clear();
      }
    };
  }, [scriptOutput]);

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
        title: `${side.toUpperCase()} ${size} ${symbolInfo.baseAsset} @ ${formatPrice(entryPrice, symbolInfo.precision)}`,
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
      const riskCalc = calculateRiskPosition(
        balance,
        riskSettings,
        entryPrice,
        stopLoss,
        takeProfit,
        symbolInfo.lotPrecision,
        symbolInfo.baseAsset
      );

      // 1. Preview Entry Line
      previewEntryLineRef.current = series.createPriceLine({
        price: entryPrice,
        color: oType === 'limit' ? '#f7a600' : '#2962ff',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ПРЕДПРОСМОТР ВХОДА (${side.toUpperCase()} ${riskCalc.sizeAsset} ${symbolInfo.baseAsset})`,
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
  }, [activePosition, orderSetup, balance, riskSettings, symbolInfo]);

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
        title: `LIMIT ${order.side.toUpperCase()}: ${formatPrice(order.limitPrice, symbolInfo.precision)} (${order.size} ${symbolInfo.baseAsset})`,
      });
      lines.push(limitLine);

      if (order.stopLoss !== null) {
        const slLine = series.createPriceLine({
          price: order.stopLoss,
          color: '#f23645',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `LIMIT SL: ${formatPrice(order.stopLoss, symbolInfo.precision)}`,
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
          title: `LIMIT TP: ${formatPrice(order.takeProfit, symbolInfo.precision)}`,
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
  }, [limitOrders, symbolInfo]);

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
      orderSetup.takeProfit,
      symbolInfo.lotPrecision,
      symbolInfo.baseAsset
    );
  }, [balance, riskSettings, orderSetup, symbolInfo]);

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

      {/* Top-Left Floating Header: Quick Buy/Sell & Symbol OHLC Legend (TradingView Style) */}
      <div className="absolute top-2.5 left-3 z-30 pointer-events-auto flex flex-col gap-1.5 select-none font-sans">
        {/* Row 1: TradingView Quick Buy / Sell Execution Bar */}
        <div className="flex items-center gap-2">
          <div className="flex items-stretch shadow-2xl rounded-lg overflow-hidden border border-[#2a2e39] bg-[#131722]/90 backdrop-blur-md">
            {/* SELL BUTTON */}
            <button
              onClick={() => {
                const price = currentCandle?.close || symbolInfo.defaultPrice;
                const sl = Number((price * 1.01).toFixed(symbolInfo.pricePrecision));
                const tp = Number((price * 0.98).toFixed(symbolInfo.pricePrecision));
                executeTrade('short', sl, tp);
              }}
              className="flex flex-col items-center justify-center px-3 py-1 bg-[#f23645]/90 hover:bg-[#f23645] text-white transition-all cursor-pointer border-r border-black/30 group active:scale-95"
              title="Быстрая продажа (Market SELL со стопом 1% и тейком 2%)"
            >
              <span className="text-[11px] font-bold font-mono group-hover:scale-105 transition-transform">
                {formatPrice(currentCandle?.close || symbolInfo.defaultPrice, symbolInfo.precision)}
              </span>
              <span className="text-[9px] font-sans uppercase font-bold opacity-80">SELL</span>
            </button>

            {/* LOT SIZE / QUANTITY */}
            <div className="px-2 py-1 flex items-center justify-center bg-[#181b24] text-[11px] font-mono text-white min-w-[48px] border-r border-black/30">
              <span>{symbolInfo.minLot}</span>
            </div>

            {/* BUY BUTTON */}
            <button
              onClick={() => {
                const price = currentCandle?.close || symbolInfo.defaultPrice;
                const sl = Number((price * 0.99).toFixed(symbolInfo.pricePrecision));
                const tp = Number((price * 1.02).toFixed(symbolInfo.pricePrecision));
                executeTrade('long', sl, tp);
              }}
              className="flex flex-col items-center justify-center px-3 py-1 bg-[#2962ff]/90 hover:bg-[#2962ff] text-white transition-all cursor-pointer group active:scale-95"
              title="Быстрая покупка (Market BUY со стопом 1% и тейком 2%)"
            >
              <span className="text-[11px] font-bold font-mono group-hover:scale-105 transition-transform">
                {formatPrice(currentCandle?.close || symbolInfo.defaultPrice, symbolInfo.precision)}
              </span>
              <span className="text-[9px] font-sans uppercase font-bold opacity-80">BUY</span>
            </button>
          </div>
        </div>

        {/* Row 2: Symbol Name & OHLC Ticker Values */}
        {currentCandle && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#d1d4dc] bg-[#131722]/60 backdrop-blur-xs px-2 py-0.5 rounded border border-white/[0.04] w-fit">
            <span className="font-bold text-white text-xs">{symbolInfo.name || symbol}</span>
            <span className="text-[#787b86]">·</span>
            <span className="text-white uppercase font-semibold">{timeframe}</span>
            <span className="text-[#787b86]">·</span>
            <span className="text-[#787b86]">O</span>
            <span className="text-white">{formatPrice(currentCandle.open, symbolInfo.precision)}</span>
            <span className="text-[#787b86]">H</span>
            <span className="text-white">{formatPrice(currentCandle.high, symbolInfo.precision)}</span>
            <span className="text-[#787b86]">L</span>
            <span className="text-white">{formatPrice(currentCandle.low, symbolInfo.precision)}</span>
            <span className="text-[#787b86]">C</span>
            <span
              className={
                currentCandle.close >= currentCandle.open ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'
              }
            >
              {formatPrice(currentCandle.close, symbolInfo.precision)}
            </span>
            <span
              className={`text-[11px] font-semibold ${
                currentCandle.close >= currentCandle.open ? 'text-[#089981]' : 'text-[#f23645]'
              }`}
            >
              {currentCandle.open > 0
                ? (((currentCandle.close - currentCandle.open) / currentCandle.open) * 100).toFixed(2)
                : '0.00'}
              %
            </span>
          </div>
        )}

        {/* Row 3: Active Indicators Legend with Eye Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Sessions Indicator Badge */}
          {sessionsSettings.enabled && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1e222d]/85 backdrop-blur-sm border border-[#2a2e39] rounded-md text-[11px] font-mono text-tv-text hover:bg-[#1e222d] transition-colors group shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-tv-blue" />
              <span className="text-tv-blue font-semibold font-sans">Сессии ICT</span>
              <button
                onClick={() => setIsSessionSettingsOpen(true)}
                title="Настройки индикатора сессий"
                className="p-0.5 text-tv-textMuted hover:text-white rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer ml-1"
              >
                <Settings className="w-3 h-3" />
              </button>
              <button
                onClick={() => toggleSessions()}
                title="Скрыть сессии"
                className="p-0.5 text-tv-textMuted hover:text-tv-red rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* News Calendar Indicator Badge */}
          {newsFilter.enabled && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1e222d]/85 backdrop-blur-sm border border-[#2a2e39] rounded-md text-[11px] font-mono text-tv-text hover:bg-[#1e222d] transition-colors group shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ab47bc]" />
              <span className="text-[#ab47bc] font-semibold font-sans">Новости ({newsFilter.minImportance.toUpperCase()})</span>
              <button
                onClick={() => toggleNews()}
                title="Скрыть новости"
                className="p-0.5 text-tv-textMuted hover:text-tv-red rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Volume Indicator Badge */}
          {showVolume && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1e222d]/85 backdrop-blur-sm border border-[#2a2e39] rounded-md text-[11px] font-mono text-tv-text hover:bg-[#1e222d] transition-colors group shadow-sm">
              <span className="text-tv-textMuted font-sans">Объем:</span>
              <span className="text-white font-semibold">
                {currentCandle ? formatVolume(currentCandle.volume) : '—'}
              </span>
              <button
                onClick={() => toggleVolume()}
                title="Скрыть гистограмму объемов"
                className="p-0.5 text-tv-textMuted hover:text-white rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer ml-1"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Fractals Indicator Badge */}
          {showFractals && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1e222d]/85 backdrop-blur-sm border border-[#2a2e39] rounded-md text-[11px] font-mono text-tv-text hover:bg-[#1e222d] transition-colors group shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#089981]" />
              <span className="text-white font-semibold font-sans">Фракталы</span>
              <button
                onClick={() => (window as any).__toggleFractals?.()}
                title="Индикатор фракталов активен"
                className="p-0.5 text-tv-textMuted hover:text-white rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Custom Script Indicator Legend Badge */}
          {activeScript && scriptOutput && scriptOutput.success && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1e222d]/85 backdrop-blur-sm border border-[#2a2e39] rounded-md text-[11px] font-mono text-tv-text hover:bg-[#1e222d] transition-colors group shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
              <span className="text-[#00e5ff] font-semibold font-sans">{activeScript.name}</span>
              <button
                onClick={() => clearScriptOutput()}
                title="Удалить пользовательский скрипт с графика"
                className="p-0.5 text-tv-textMuted hover:text-tv-red rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

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
                  <span>SL: ${formatPrice(orderSetup.stopLoss, symbolInfo.precision)}</span>
                  <span className="text-[10px] opacity-80 pl-1 border-l border-white/30">
                    -${prevCalc.riskUsd} (-{riskSettings.riskPercent}%)
                  </span>
                  <span className="text-[9px] bg-black/30 px-1 py-0.2 rounded font-sans uppercase">
                    Тянуть
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOrderSetup({ enabled: false });
                    }}
                    title="Скрыть предпросмотр ордера"
                    className="p-0.5 hover:bg-black/40 rounded ml-1 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
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
                  <span>TP: ${formatPrice(orderSetup.takeProfit, symbolInfo.precision)}</span>
                  <span className="text-[10px] opacity-80 pl-1 border-l border-white/30">
                    +${prevCalc.potentialProfitUsd} ({prevCalc.riskRewardRatio}R)
                  </span>
                  <span className="text-[9px] bg-black/30 px-1 py-0.2 rounded font-sans uppercase">
                    Тянуть
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOrderSetup({ enabled: false });
                    }}
                    title="Скрыть предпросмотр ордера"
                    className="p-0.5 hover:bg-black/40 rounded ml-1 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
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
                    ВХОД LIMIT: ${formatPrice(orderSetup.entryPrice, symbolInfo.precision)} ({prevCalc.sizeAsset} {symbolInfo.baseAsset})
                  </span>
                  <span className="text-[9px] bg-black/20 px-1 py-0.2 rounded font-sans uppercase">
                    Тянуть
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOrderSetup({ enabled: false });
                    }}
                    title="Скрыть предпросмотр ордера"
                    className="p-0.5 hover:bg-black/40 rounded ml-1 transition-colors"
                  >
                    <X className="w-3 h-3 text-black" />
                  </button>
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
              <span>SL: ${formatPrice(activePosition.stopLoss, symbolInfo.precision)}</span>
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
              <span>TP: ${formatPrice(activePosition.takeProfit, symbolInfo.precision)}</span>
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
                        LIMIT {order.side.toUpperCase()}: ${formatPrice(order.limitPrice, symbolInfo.precision)}
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
                      <span>SL: ${formatPrice(order.stopLoss, symbolInfo.precision)}</span>
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
                      <span>TP: ${formatPrice(order.takeProfit, symbolInfo.precision)}</span>
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

      {/* Market Sessions Layer (Tokyo, London, New York) */}
      <SessionsLayer
        chart={chartInstance}
        candleSeries={candleSeriesInstance}
        containerRef={containerRef}
      />

      {/* Market Sessions Settings Modal */}
      <SessionSettingsModal
        isOpen={isSessionSettingsOpen}
        onClose={() => setIsSessionSettingsOpen(false)}
      />

      {/* Custom Script Zones / Imbalances Layer */}
      <ScriptOverlayLayer
        chart={chartInstance}
        candleSeries={candleSeriesInstance}
        containerRef={containerRef}
      />

      {/* Interactive Drawing Layer (Rectangles, Lines, Levels) */}
      <DrawingLayer
        chart={chartInstance}
        candleSeries={candleSeriesInstance}
        containerRef={containerRef}
      />

      {/* Economic News Calendar Markers Layer */}
      <NewsLayer
        chart={chartInstance}
        chartWidth={containerRef.current?.clientWidth || 800}
      />
    </div>
  );
};

