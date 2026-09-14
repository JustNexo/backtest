import React, { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Candle,
  CandleColorSettings,
  DrawingObject,
  DrawingTool,
  PropFirmFeeSettings,
  ReplayState,
  ThemeSettings,
  Timeframe,
} from '../types/chart';
import {
  BacktestMetrics,
  ClosedTrade,
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
  saveStoredCandleColors,
  saveStoredPropFirmSettings,
  saveStoredRiskSettings,
  saveStoredThemeSettings,
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
  closedTrades: ClosedTrade[];
  metrics: BacktestMetrics;
  riskSettings: RiskSettings;
  updateRiskSettings: (settings: Partial<RiskSettings>) => void;
  executeTrade: (side: PositionSide, customSl?: number, customTp?: number) => boolean;
  closeActivePosition: () => void;
  resetBacktest: () => void;

  // Drawing Tools
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  drawings: DrawingObject[];
  addDrawing: (drawing: DrawingObject) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
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
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [riskSettings, setRiskSettings] = useState<RiskSettings>(loadStoredRiskSettings);

  // Drawings
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);

  // Timer ref for playback
  const playIntervalRef = useRef<number | null>(null);

  // Load candles when timeframe changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getCandlesForTimeframe(timeframe)
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

          let idx = data.findIndex((c) => c.time >= prev.currentCutTime!);
          if (idx === -1) idx = data.length - 1;
          if (idx > 0 && data[idx].time > prev.currentCutTime!) {
            idx = idx - 1;
          }

          return {
            ...prev,
            currentIndex: idx >= 0 ? idx : data.length - 1,
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
  }, [timeframe]);

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

  // Evaluate active position when new candle appears (in replay or forward step)
  const checkPositionAgainstCandle = useCallback(
    (candle: Candle) => {
      if (!activePosition) return;

      const evalResult = evaluatePositionWithCandle(activePosition, candle, feeSettings);
      if (evalResult.isClosed && evalResult.closedTrade) {
        // Trade closed by SL or TP
        const trade = evalResult.closedTrade;
        setClosedTrades((prev) => [trade, ...prev]);
        setBalance((prev) => Number((prev + trade.netPnl).toFixed(2)));
        setActivePosition(null);
      } else if (evalResult.updatedPosition) {
        setActivePosition(evalResult.updatedPosition);
      }
    },
    [activePosition, feeSettings]
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
      let idx = allCandles.findIndex((c) => c.time >= timestampSeconds);
      if (idx === -1) idx = allCandles.length - 1;
      if (idx > 0 && allCandles[idx].time > timestampSeconds) {
        idx = idx - 1;
      }
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

      // Evaluate active position on next candle
      if (nextCandle) {
        checkPositionAgainstCandle(nextCandle);
      }

      return {
        ...prev,
        currentIndex: nextIdx,
        currentCutTime: nextTime,
      };
    });
  }, [allCandles, checkPositionAgainstCandle]);

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
        let idx = fetched.findIndex((c) => c.time >= timestampSeconds);
        if (idx === -1) idx = fetched.length - 1;
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
            checkPositionAgainstCandle(nextCandle);
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
  }, [replay.isPlaying, replay.isActive, replay.playbackSpeed, allCandles, checkPositionAgainstCandle]);

  // Keyboard shortcuts: Space (Play/Pause), ArrowRight (Next), ArrowLeft (Prev), R (Replay toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing inside an input or textarea
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

      // Default SL distance if not explicitly provided
      let sl = customSl;
      let tp = customTp;

      if (!sl) {
        // Default 0.8% distance
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

      // If existing position open, close it first
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
    setClosedTrades([]);
  }, []);

  const metrics = useMemo(() => {
    return calculateMetrics(closedTrades, initialBalance);
  }, [closedTrades, initialBalance]);

  // Drawing Handlers
  const addDrawing = useCallback((drawing: DrawingObject) => {
    setDrawings((prev) => [...prev, drawing]);
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
    closedTrades,
    metrics,
    riskSettings,
    updateRiskSettings,
    executeTrade,
    closeActivePosition,
    resetBacktest,
    activeTool,
    setActiveTool,
    drawings,
    addDrawing,
    removeDrawing,
    clearDrawings,
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
