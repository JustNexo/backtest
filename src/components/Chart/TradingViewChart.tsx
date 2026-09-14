import React, { useEffect, useRef, useCallback } from 'react';
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
} from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { formatCurrency, formatPercent, formatPrice } from '../../utils/formatters';
import { Scissors } from 'lucide-react';

export const TradingViewChart: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Price line references
  const entryLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);

  const {
    visibleCandles,
    candleColors,
    themeSettings,
    replay,
    cutAtTime,
    cancelReplaySelection,
    activePosition,
    riskSettings,
    balance,
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
          bottom: 0.2, // leave room for volume
        },
      },
      timeScale: {
        borderColor: themeSettings.borderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 3,
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
      priceScaleId: '', // overlay
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

    // Responsive resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update theme & grid options
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: themeSettings.backgroundColor },
        textColor: themeSettings.textColor,
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
      },
    });
  }, [themeSettings]);

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
  }, [visibleCandles, candleColors.volumeUpColor, candleColors.volumeDownColor]);

  // Update Active Position Price Lines (Entry, SL, TP)
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    // Clean up old lines
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

    if (!activePosition) return;

    const { side, entryPrice, stopLoss, takeProfit, size, notionalValue } = activePosition;

    // 1. Entry Line
    entryLineRef.current = series.createPriceLine({
      price: entryPrice,
      color: '#2962ff',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: `${side.toUpperCase()} ${size} BTC @ ${formatPrice(entryPrice)}`,
    });

    // 2. Stop Loss Line
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

    // 3. Take Profit Line
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

    return () => {
      if (entryLineRef.current) series.removePriceLine(entryLineRef.current);
      if (slLineRef.current) series.removePriceLine(slLineRef.current);
      if (tpLineRef.current) series.removePriceLine(tpLineRef.current);
    };
  }, [activePosition, balance]);

  // Click handler on chart for Cut / Scissors Mode
  const handleChartClick = useCallback(() => {
    if (!replay.isSelectingCutPoint || !chartRef.current) return;

    // Get time coordinate under crosshair
    const subscribeHandler = (param: any) => {
      if (param.time) {
        cutAtTime(Number(param.time));
        chartRef.current?.unsubscribeClick(subscribeHandler);
      }
    };

    chartRef.current.subscribeClick(subscribeHandler);
  }, [replay.isSelectingCutPoint, cutAtTime]);

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
        onClick={handleChartClick}
        className={`w-full h-full relative ${
          replay.isSelectingCutPoint ? 'cursor-crosshair' : 'cursor-default'
        }`}
      />
    </div>
  );
};
