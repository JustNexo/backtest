import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Candle,
  CandleColorSettings,
  DrawingObject,
  DrawingTool,
  OrderSetupPreview,
  PropFirmFeeSettings,
  ReplayState,
  ThemeSettings,
  Timeframe,
} from '../types/chart';
import {
  BacktestMetrics,
  ClosedTrade,
  LimitOrder,
  Position,
  PositionSide,
  RiskSettings,
} from '../types/trading';
import {
  fetchHistoricalDateRange,
  getCandlesForTimeframe,
  sanitizeCandles,
} from '../services/marketData';
import {
  calculateMetrics,
  calculateRiskPosition,
  closePositionManually,
  DEFAULT_PROP_FIRM_SETTINGS,
  evaluatePositionWithCandle,
  openPosition as engineOpenPosition,
} from '../services/tradeEngine';
import {
  DEFAULT_CANDLE_COLORS,
  DEFAULT_RISK_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  loadStoredCandleColors,
  loadStoredPropFirmSettings,
  loadStoredRiskSettings,
  loadStoredThemeSettings,
  loadStoredTimezone,
  saveStoredCandleColors,
  saveStoredPropFirmSettings,
  saveStoredRiskSettings,
  saveStoredThemeSettings,
  saveStoredTimezone,
} from '../services/storage';

interface ChartContextType {
  symbol: string;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  isLoading: boolean;
  allCandles: Candle[];
  visibleCandles: Candle[];
  currentCandle: Candle | null;
  
  // Replay
  replay: ReplayState;
  startReplaySelection: () => void;
  cancelReplaySelection: () => void;
  cutAtTime: (timestampSeconds: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speedMs: number) => void;
  exitReplay: () => void;
  jumpToTimestamp: (timestampSeconds: number) => Promise<void>;
  scrubToIndex: (index: number) => void;

  // Settings
  candleColors: CandleColorSettings;
  updateCandleColors: (colors: Partial<CandleColorSettings>) => void;
  resetCandleColors: () => void;
  themeSettings: ThemeSettings;
  updateThemeSettings: (theme: Partial<ThemeSettings>) => void;
  feeSettings: PropFirmFeeSettings;
  updateFeeSettings: (fees: Partial<PropFirmFeeSettings>) => void;

  // Trading & Risk
  balance: number;
  initialBalance: number;
  activePosition: Position | null;
  limitOrders: LimitOrder[];
  closedTrades: ClosedTrade[];
  metrics: BacktestMetrics;
  riskSettings: RiskSettings;
  updateRiskSettings: (settings: Partial<RiskSettings>) => void;
  executeTrade: (side: PositionSide, customSl?: number, customTp?: number) => boolean;
  addLimitOrder: (side: PositionSide, limitPrice: number, customSl?: number, customTp?: number) => boolean;
  cancelLimitOrder: (id: string) => void;
  closeActivePosition: () => void;
  resetBacktest: () => void;

  // Chart drag updates
  updateActivePositionSL: (newSl: number) => void;
  updateActivePositionTP: (newTp: number) => void;
  updateLimitOrderPrice: (id: string, newPrice: number) => void;
  updateLimitOrderSL: (id: string, newSl: number) => void;
  updateLimitOrderTP: (id: string, newTp: number) => void;

  // Drawing Tools
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  drawings: DrawingObject[];
  addDrawing: (drawing: DrawingObject) => void;
  updateDrawing: (id: string, updated: Partial<DrawingObject>) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;

  // Indicators
  showFractals: boolean;
  setShowFractals: (show: boolean) => void;

  // Timezone
  timezone: string;
  setTimezone: (tz: string) => void;

  // Pre-trade Order Setup (Draggable SL/TP before opening position)
  orderSetup: OrderSetupPreview;
  updateOrderSetup: (setup: Partial<OrderSetupPreview>) => void;
}

const ChartContext = createContext<ChartContextType | null>(null);

export const ChartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const symbol = 'BTCUSDT.P';
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allCandles, setAllCandles] = useState<Candle[]>([]);

  // Replay State
  const [replay, setReplay] = useState<ReplayState>({
    isActive: false,
    isSelectingCutPoint: false,
    currentCutTime: null,
    currentIndex: -1,
    isPlaying: false,
    playbackSpeed: 500, // 500ms per candle default
  });

  // Settings State
  const [candleColors, setCandleColors] = useState<CandleColorSettings>(loadStoredCandleColors);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(loadStoredThemeSettings);
  const [feeSettings, setFeeSettings] = useState<PropFirmFeeSettings>(loadStoredPropFirmSettings);

  // Trading & Paper Backtest State
  const initialBalance = 10000;
  const [balance, setBalance] = useState<number>(initialBalance);
  const [activePosition, setActivePosition] = useState<Position | null>(null);
  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings>(loadStoredRiskSettings);

  // Drawings
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);

  // Indicators
  const [showFractals, setShowFractals] = useState<boolean>(false);

  // Timezone
  const [timezone, setTimezoneState] = useState<string>(loadStoredTimezone);
  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    saveStoredTimezone(tz);
  }, []);

  // Pre-trade Order Setup (Draggable SL/TP on chart before opening position)
  const [orderSetup, setOrderSetup] = useState<OrderSetupPreview>({
    enabled: true,
    side: 'long',
    orderType: 'market',
    entryPrice: 65000,
    stopLoss: 64500,
    takeProfit: 66500,
  });

  const updateOrderSetup = useCallback((setup: Partial<OrderSetupPreview>) => {
    setOrderSetup((prev) => ({ ...prev, ...setup }));
  }, []);

  // Timer ref for playback
  const playIntervalRef = useRef<number | null>(null);

  // Load candles when timeframe changes (keeping replay cut timestamp in sync!)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const targetTs = replay.isActive && replay.currentCutTime ? replay.currentCutTime : null;

    getCandlesForTimeframe(timeframe, { targetTimestamp: targetTs })
      .then((data) => {
        if (!isMounted) return;
        setAllCandles(data);
        setIsLoading(false);

        // If in replay mode, adjust currentIndex to match currentCutTime
        setReplay((prev) => {
          if (!prev.isActive || prev.currentCutTime === null) {
            return {
              ...prev,
              currentIndex: data.length - 1,
            };
          }

          // Find the last candle whose time is <= prev.currentCutTime
          let idx = -1;
          for (let i = 0; i < data.length; i++) {
            if (data[i].time <= prev.currentCutTime!) {
              idx = i;
            } else {
              break;
            }
          }

          if (idx === -1) idx = 0;

          return {
            ...prev,
            currentIndex: idx,
          };
        });
      })
      .catch((err) => {
        console.error('Error loading candles:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [timeframe]); // depends on timeframe

  // Sliced visible candles
  const visibleCandles = useMemo(() => {
    if (allCandles.length === 0) return [];
    if (!replay.isActive) return allCandles;
    const end = Math.max(1, Math.min(replay.currentIndex + 1, allCandles.length));
    return allCandles.slice(0, end);
  }, [allCandles, replay.isActive, replay.currentIndex]);

  const currentCandle = useMemo(() => {
    if (visibleCandles.length === 0) return null;
    return visibleCandles[visibleCandles.length - 1];
  }, [visibleCandles]);

  // Keep orderSetup entryPrice and levels reasonable when candle or timeframe changes
  useEffect(() => {
    if (!currentCandle) return;
    const curPrice = currentCandle.close;
    setOrderSetup((prev) => {
      // If major discrepancy (> 15% distance, e.g. switched timeframe to 2024 or initial load)
      const diffRatio = Math.abs(curPrice - prev.entryPrice) / (curPrice || 1);
      if (diffRatio > 0.15 || prev.entryPrice === 65000) {
        const slDist = Math.round(curPrice * 0.008 * 10) / 10;
        const tpDist = Math.round(slDist * 2 * 10) / 10;
        return {
          ...prev,
          entryPrice: curPrice,
          stopLoss: prev.side === 'long' ? Math.round((curPrice - slDist) * 10) / 10 : Math.round((curPrice + slDist) * 10) / 10,
          takeProfit: prev.side === 'long' ? Math.round((curPrice + tpDist) * 10) / 10 : Math.round((curPrice - tpDist) * 10) / 10,
        };
      }
      // If market order, entry price tracks current candle close
      if (prev.orderType === 'market' && prev.entryPrice !== curPrice) {
        return {
          ...prev,
          entryPrice: curPrice,
        };
      }
      return prev;
    });
  }, [currentCandle?.close]);

  // Evaluate limit orders and active position when new candle appears (in replay or forward step)
  const processCandleTick = useCallback(
    (candle: Candle) => {
      // 1. Check Pending Limit Orders
      setLimitOrders((prevOrders) => {
        const remaining: LimitOrder[] = [];
        for (const order of prevOrders) {
          let triggered = false;
          if (order.side === 'long' && candle.low <= order.limitPrice) {
            triggered = true;
          } else if (order.side === 'short' && candle.high >= order.limitPrice) {
            triggered = true;
          }

          if (triggered) {
            // Fill limit order
            const newPos = engineOpenPosition(
              order.side,
              order.limitPrice,
              order.size,
              order.stopLoss,
              order.takeProfit,
              candle.time,
              feeSettings
            );
            setActivePosition(newPos);
          } else {
            remaining.push(order);
          }
        }
        return remaining;
      });

      // 2. Check Active Position
      setActivePosition((pos) => {
        if (!pos) return null;

        const evalResult = evaluatePositionWithCandle(pos, candle, feeSettings);
        if (evalResult.isClosed && evalResult.closedTrade) {
          const trade = evalResult.closedTrade;
          setClosedTrades((prev) => [trade, ...prev]);
          setBalance((prev) => Number((prev + trade.netPnl).toFixed(2)));
          return null;
        } else if (evalResult.updatedPosition) {
          return evalResult.updatedPosition;
        }
        return pos;
      });
    },
    [feeSettings]
  );

  // Replay Actions
  const startReplaySelection = useCallback(() => {
    setReplay((prev) => ({
      ...prev,
      isSelectingCutPoint: true,
      isPlaying: false,
    }));
  }, []);

  const cancelReplaySelection = useCallback(() => {
    setReplay((prev) => ({
      ...prev,
      isSelectingCutPoint: false,
    }));
  }, []);

  const cutAtTime = useCallback(
    (timestampSeconds: number) => {
      if (allCandles.length === 0) return;
      let idx = -1;
      for (let i = 0; i < allCandles.length; i++) {
        if (allCandles[i].time <= timestampSeconds) {
          idx = i;
        } else {
          break;
        }
      }
      if (idx === -1) idx = 0;
      const finalTime = allCandles[idx]?.time ?? timestampSeconds;

      setReplay({
        isActive: true,
        isSelectingCutPoint: false,
        currentCutTime: finalTime,
        currentIndex: idx,
        isPlaying: false,
        playbackSpeed: 500,
      });
    },
    [allCandles]
  );

  const stepForward = useCallback(() => {
    setReplay((prev) => {
      if (!prev.isActive || prev.currentIndex >= allCandles.length - 1) {
        return prev;
      }
      const nextIdx = prev.currentIndex + 1;
      const nextCandle = allCandles[nextIdx];
      const nextTime = nextCandle?.time ?? prev.currentCutTime;

      // Evaluate limit orders & active position
      if (nextCandle) {
        processCandleTick(nextCandle);
      }

      return {
        ...prev,
        currentIndex: nextIdx,
        currentCutTime: nextTime,
      };
    });
  }, [allCandles, processCandleTick]);

  const stepBackward = useCallback(() => {
    setReplay((prev) => {
      if (!prev.isActive || prev.currentIndex <= 0) {
        return prev;
      }
      const prevIdx = prev.currentIndex - 1;
      const prevCandle = allCandles[prevIdx];
      return {
        ...prev,
        currentIndex: prevIdx,
        currentCutTime: prevCandle?.time ?? prev.currentCutTime,
        isPlaying: false,
      };
    });
  }, [allCandles]);

  const togglePlay = useCallback(() => {
    setReplay((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  }, []);

  const setPlaybackSpeed = useCallback((speedMs: number) => {
    setReplay((prev) => ({
      ...prev,
      playbackSpeed: speedMs,
    }));
  }, []);

  const exitReplay = useCallback(() => {
    setReplay({
      isActive: false,
      isSelectingCutPoint: false,
      currentCutTime: null,
      currentIndex: allCandles.length - 1,
      isPlaying: false,
      playbackSpeed: 500,
    });
  }, [allCandles.length]);

  const scrubToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= allCandles.length) return;
      const candle = allCandles[index];
      setReplay((prev) => ({
        ...prev,
        currentIndex: index,
        currentCutTime: candle.time,
        isPlaying: false,
      }));
    },
    [allCandles]
  );

  const jumpToTimestamp = useCallback(
    async (timestampSeconds: number) => {
      setIsLoading(true);
      try {
        const fetched = await fetchHistoricalDateRange(timeframe, timestampSeconds);
        setAllCandles(fetched);
        let idx = -1;
        for (let i = 0; i < fetched.length; i++) {
          if (fetched[i].time <= timestampSeconds) {
            idx = i;
          } else {
            break;
          }
        }
        if (idx === -1) idx = 0;

        setReplay({
          isActive: true,
          isSelectingCutPoint: false,
          currentCutTime: fetched[idx]?.time || timestampSeconds,
          currentIndex: idx,
          isPlaying: false,
          playbackSpeed: 500,
        });
      } catch (err) {
        console.error('Jump to timestamp failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [timeframe]
  );

  // Playback timer effect
  useEffect(() => {
    if (replay.isPlaying && replay.isActive) {
      playIntervalRef.current = window.setInterval(() => {
        setReplay((prev) => {
          if (prev.currentIndex >= allCandles.length - 1) {
            return { ...prev, isPlaying: false };
          }
          const nextIdx = prev.currentIndex + 1;
          const nextCandle = allCandles[nextIdx];
          if (nextCandle) {
            processCandleTick(nextCandle);
          }
          return {
            ...prev,
            currentIndex: nextIdx,
            currentCutTime: nextCandle?.time ?? prev.currentCutTime,
          };
        });
      }, replay.playbackSpeed);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [replay.isPlaying, replay.isActive, replay.playbackSpeed, allCandles, processCandleTick]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (replay.isActive) {
          togglePlay();
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (replay.isActive) {
          stepForward();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (replay.isActive) {
          stepBackward();
        }
      } else if (e.key === 'r' || e.key === 'к' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (replay.isActive) {
            exitReplay();
          } else {
            startReplaySelection();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replay.isActive, togglePlay, stepForward, stepBackward, exitReplay, startReplaySelection]);

  // Settings handlers
  const updateCandleColors = useCallback((colors: Partial<CandleColorSettings>) => {
    setCandleColors((prev) => {
      const next = { ...prev, ...colors };
      saveStoredCandleColors(next);
      return next;
    });
  }, []);

  const resetCandleColors = useCallback(() => {
    setCandleColors(DEFAULT_CANDLE_COLORS);
    saveStoredCandleColors(DEFAULT_CANDLE_COLORS);
  }, []);

  const updateThemeSettings = useCallback((theme: Partial<ThemeSettings>) => {
    setThemeSettings((prev) => {
      const next = { ...prev, ...theme };
      saveStoredThemeSettings(next);
      return next;
    });
  }, []);

  const updateFeeSettings = useCallback((fees: Partial<PropFirmFeeSettings>) => {
    setFeeSettings((prev) => {
      const next = { ...prev, ...fees };
      saveStoredPropFirmSettings(next);
      return next;
    });
  }, []);

  const updateRiskSettings = useCallback((risk: Partial<RiskSettings>) => {
    setRiskSettings((prev) => {
      const next = { ...prev, ...risk };
      saveStoredRiskSettings(next);
      return next;
    });
  }, []);

  // Trading Actions
  const executeTrade = useCallback(
    (side: PositionSide, customSl?: number, customTp?: number): boolean => {
      if (!currentCandle) return false;
      const entryPrice = currentCandle.close;

      let sl = customSl;
      let tp = customTp;

      if (!sl) {
        sl = side === 'long' ? entryPrice * 0.992 : entryPrice * 1.008;
      }
      if (!tp) {
        const slDist = Math.abs(entryPrice - sl);
        tp = side === 'long' ? entryPrice + slDist * riskSettings.defaultTpRatio : entryPrice - slDist * riskSettings.defaultTpRatio;
      }

      const riskCalc = calculateRiskPosition(balance, riskSettings, entryPrice, sl, tp);
      if (!riskCalc.isValid || riskCalc.sizeBtc <= 0) {
        console.warn('Invalid position calculation:', riskCalc.error);
        return false;
      }

      if (activePosition) {
        const closed = closePositionManually(
          activePosition,
          entryPrice,
          currentCandle.time,
          feeSettings
        );
        setClosedTrades((prev) => [closed, ...prev]);
        setBalance((prev) => Number((prev + closed.netPnl).toFixed(2)));
      }

      const newPos = engineOpenPosition(
        side,
        entryPrice,
        riskCalc.sizeBtc,
        Number(sl.toFixed(1)),
        Number(tp.toFixed(1)),
        currentCandle.time,
        feeSettings
      );

      setActivePosition(newPos);
      return true;
    },
    [currentCandle, balance, riskSettings, activePosition, feeSettings]
  );

  const addLimitOrder = useCallback(
    (side: PositionSide, limitPrice: number, customSl?: number, customTp?: number): boolean => {
      if (limitPrice <= 0) return false;

      let sl = customSl;
      let tp = customTp;

      if (!sl) {
        sl = side === 'long' ? limitPrice * 0.992 : limitPrice * 1.008;
      }
      if (!tp) {
        const slDist = Math.abs(limitPrice - sl);
        tp = side === 'long' ? limitPrice + slDist * riskSettings.defaultTpRatio : limitPrice - slDist * riskSettings.defaultTpRatio;
      }

      const riskCalc = calculateRiskPosition(balance, riskSettings, limitPrice, sl, tp);
      if (!riskCalc.isValid || riskCalc.sizeBtc <= 0) {
        console.warn('Invalid limit order calculation:', riskCalc.error);
        return false;
      }

      const order: LimitOrder = {
        id: `limit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        side,
        limitPrice: Number(limitPrice.toFixed(1)),
        size: riskCalc.sizeBtc,
        stopLoss: Number(sl.toFixed(1)),
        takeProfit: Number(tp.toFixed(1)),
        createdTime: currentCandle?.time || Math.floor(Date.now() / 1000),
        riskUsd: riskCalc.riskUsd,
      };

      setLimitOrders((prev) => [...prev, order]);
      return true;
    },
    [balance, riskSettings, currentCandle]
  );

  const cancelLimitOrder = useCallback((id: string) => {
    setLimitOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const closeActivePosition = useCallback(() => {
    if (!activePosition || !currentCandle) return;
    const closed = closePositionManually(
      activePosition,
      currentCandle.close,
      currentCandle.time,
      feeSettings
    );
    setClosedTrades((prev) => [closed, ...prev]);
    setBalance((prev) => Number((prev + closed.netPnl).toFixed(2)));
    setActivePosition(null);
  }, [activePosition, currentCandle, feeSettings]);

  const resetBacktest = useCallback(() => {
    setBalance(initialBalance);
    setActivePosition(null);
    setLimitOrders([]);
    setClosedTrades([]);
  }, []);

  // Real-time draggable line updates
  const updateActivePositionSL = useCallback((newSl: number) => {
    setActivePosition((prev) => {
      if (!prev) return null;
      return { ...prev, stopLoss: Number(newSl.toFixed(1)) };
    });
  }, []);

  const updateActivePositionTP = useCallback((newTp: number) => {
    setActivePosition((prev) => {
      if (!prev) return null;
      return { ...prev, takeProfit: Number(newTp.toFixed(1)) };
    });
  }, []);

  const updateLimitOrderPrice = useCallback((id: string, newPrice: number) => {
    setLimitOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, limitPrice: Number(newPrice.toFixed(1)) } : o))
    );
  }, []);

  const updateLimitOrderSL = useCallback((id: string, newSl: number) => {
    setLimitOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, stopLoss: Number(newSl.toFixed(1)) } : o))
    );
  }, []);

  const updateLimitOrderTP = useCallback((id: string, newTp: number) => {
    setLimitOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, takeProfit: Number(newTp.toFixed(1)) } : o))
    );
  }, []);

  const metrics = useMemo(() => {
    return calculateMetrics(closedTrades, initialBalance);
  }, [closedTrades, initialBalance]);

  // Drawing Handlers
  const addDrawing = useCallback((drawing: DrawingObject) => {
    setDrawings((prev) => [...prev, drawing]);
  }, []);

  const updateDrawing = useCallback((id: string, updated: Partial<DrawingObject>) => {
    setDrawings((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updated } : d))
    );
  }, []);

  const removeDrawing = useCallback((id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearDrawings = useCallback(() => {
    setDrawings([]);
  }, []);

  const value = {
    symbol,
    timeframe,
    setTimeframe,
    isLoading,
    allCandles,
    visibleCandles,
    currentCandle,
    replay,
    startReplaySelection,
    cancelReplaySelection,
    cutAtTime,
    stepForward,
    stepBackward,
    togglePlay,
    setPlaybackSpeed,
    exitReplay,
    jumpToTimestamp,
    scrubToIndex,
    candleColors,
    updateCandleColors,
    resetCandleColors,
    themeSettings,
    updateThemeSettings,
    feeSettings,
    updateFeeSettings,
    balance,
    initialBalance,
    activePosition,
    limitOrders,
    closedTrades,
    metrics,
    riskSettings,
    updateRiskSettings,
    executeTrade,
    addLimitOrder,
    cancelLimitOrder,
    closeActivePosition,
    resetBacktest,
    updateActivePositionSL,
    updateActivePositionTP,
    updateLimitOrderPrice,
    updateLimitOrderSL,
    updateLimitOrderTP,
    activeTool,
    setActiveTool,
    drawings,
    addDrawing,
    updateDrawing,
    removeDrawing,
    clearDrawings,
    showFractals,
    setShowFractals,
    timezone,
    setTimezone,
    orderSetup,
    updateOrderSetup,
  };

  return <ChartContext.Provider value={value}>{children}</ChartContext.Provider>;
};

export const useChart = (): ChartContextType => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a ChartProvider');
  }
  return context;
};
