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
  MarketSessionsSettings,
  CustomScript,
  ScriptOutput,
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
  SupportedSymbol,
  SymbolInfo,
  SUPPORTED_SYMBOLS,
  BacktestSession,
  PropFirmRuleSettings,
  DEFAULT_PROP_FIRM_PRESETS,
} from '../types/session';
import { NewsFilterSettings } from '../types/news';

import {
  fetchHistoricalDateRange,
  fetchLatestCandles,
  getCandlesForTimeframe,
  sanitizeCandles,
} from '../services/marketData';
import {
  calculateMetrics,
  calculateRiskPosition,
  closePositionManually,
  DEFAULT_PROP_FIRM_SETTINGS,
  evaluatePositionWithCandle,
  evaluatePropFirmRules,
  openPosition as engineOpenPosition,
  PropFirmEvaluationResult,
} from '../services/tradeEngine';
import {
  DEFAULT_CANDLE_COLORS,
  DEFAULT_RISK_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_SESSIONS_SETTINGS,
  loadStoredCandleColors,
  loadStoredPropFirmSettings,
  loadStoredRiskSettings,
  loadStoredThemeSettings,
  loadStoredTimezone,
  loadStoredSymbol,
  saveStoredSymbol,
  loadStoredSessions,
  saveStoredSessions,
  loadStoredActiveSessionId,
  saveStoredActiveSessionId,
  saveStoredCandleColors,
  saveStoredPropFirmSettings,
  saveStoredRiskSettings,
  saveStoredThemeSettings,
  saveStoredTimezone,
  loadStoredSessionsSettings,
  saveStoredSessionsSettings,
  loadStoredCustomScripts,
  saveStoredCustomScripts,
  loadStoredActiveScriptId,
  saveStoredActiveScriptId,
  loadStoredMagnetMode,
  saveStoredMagnetMode,
} from '../services/storage';
import { executeCustomScript } from '../services/scriptEngine';

interface ChartContextType {
  symbol: SupportedSymbol;
  setSymbol: (s: SupportedSymbol) => void;
  symbolInfo: SymbolInfo;
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
  jumpToTimestamp: (timestampSeconds: number, targetSymbol?: SupportedSymbol) => Promise<void>;
  scrubToIndex: (index: number) => void;

  // Settings
  candleColors: CandleColorSettings;
  updateCandleColors: (colors: Partial<CandleColorSettings>) => void;
  resetCandleColors: () => void;
  showVolume: boolean;
  setShowVolume: (show: boolean) => void;
  toggleVolume: () => void;
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
  selectedDrawingId: string | null;
  setSelectedDrawingId: (id: string | null) => void;
  drawings: DrawingObject[];
  addDrawing: (drawing: DrawingObject) => void;
  updateDrawing: (id: string, updated: Partial<DrawingObject>) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;
  undoDrawing: () => void;
  redoDrawing: () => void;
  canUndoDrawing: boolean;
  canRedoDrawing: boolean;
  pushDrawingHistory: (snapshot?: DrawingObject[]) => void;
  registerViewportCenterGetter: (getter: () => { time: number; price: number } | null) => void;
  getViewportCenter: () => { time: number; price: number } | null;
  magnetMode: boolean;
  setMagnetMode: (enabled: boolean) => void;
  toggleMagnetMode: () => void;

  // Indicators
  showFractals: boolean;
  setShowFractals: (show: boolean) => void;

  // Market Sessions & Killzones
  sessionsSettings: MarketSessionsSettings;
  updateSessionsSettings: (settings: Partial<MarketSessionsSettings>) => void;
  toggleSessions: () => void;

  // Custom Scripts (Pine / Script Engine)
  customScripts: CustomScript[];
  activeScript: CustomScript | null;
  scriptOutput: ScriptOutput | null;
  setActiveScript: (script: CustomScript | null) => void;
  runCustomScript: (code: string, scriptName?: string) => ScriptOutput;
  saveCustomScript: (script: CustomScript) => void;
  deleteCustomScript: (id: string) => void;
  clearScriptOutput: () => void;

  // Timezone
  timezone: string;
  setTimezone: (tz: string) => void;

  // Pre-trade Order Setup (Draggable SL/TP before opening position)
  orderSetup: OrderSetupPreview;
  updateOrderSetup: (setup: Partial<OrderSetupPreview>) => void;

  // Personal Cabinet & Session Manager (FX Replay style)
  sessions: BacktestSession[];
  activeSession: BacktestSession | null;
  activeSessionId: string | null;
  createSession: (params: {
    name: string;
    symbol: SupportedSymbol;
    startDate: number;
    endDate?: number | null;
    initialBalance: number;
    propFirm: PropFirmRuleSettings;
  }) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  resetSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => void;
  updateSessionPropFirm: (rules: PropFirmRuleSettings) => void;

  // Prop Firm Evaluation
  propFirmRules: PropFirmRuleSettings;
  updatePropFirmRules: (rules: Partial<PropFirmRuleSettings>) => void;
  propFirmEvaluation: PropFirmEvaluationResult;

  // View Navigation
  currentView: 'chart' | 'cabinet';
  setCurrentView: (view: 'chart' | 'cabinet') => void;

  // Economic News Calendar
  newsFilter: NewsFilterSettings;
  updateNewsFilter: (filter: Partial<NewsFilterSettings>) => void;
  toggleNews: () => void;

  // Cabinet Modal Visibility (backward compatible)
  isCabinetOpen: boolean;
  setIsCabinetOpen: (open: boolean) => void;

  // Viewport Focus Trigger (for explicit jumps only, without snapping on replay steps)
  viewportFocusTrigger: number;
  triggerViewportFocus: () => void;
}


const ChartContext = createContext<ChartContextType | null>(null);

export const ChartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Symbol State
  const [symbol, setSymbolState] = useState<SupportedSymbol>(() => {
    const stored = loadStoredSymbol();
    if (stored === 'ETHUSDT.P' || stored === 'SOLUSDT.P') return stored;
    return 'BTCUSDT.P';
  });

  const symbolInfo = useMemo(() => {
    return SUPPORTED_SYMBOLS[symbol] || SUPPORTED_SYMBOLS['BTCUSDT.P'];
  }, [symbol]);

  const setSymbol = useCallback((newSym: SupportedSymbol) => {
    setSymbolState(newSym);
    saveStoredSymbol(newSym);
  }, []);

  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allCandles, setAllCandles] = useState<Candle[]>([]);

  // Cabinet & Sessions View State
  const [sessions, setSessions] = useState<BacktestSession[]>(() => loadStoredSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => loadStoredActiveSessionId());
  const [currentView, setCurrentView] = useState<'chart' | 'cabinet'>('chart');
  const isCabinetOpen = currentView === 'cabinet';
  const setIsCabinetOpen = useCallback((open: boolean) => {
    setCurrentView(open ? 'cabinet' : 'chart');
  }, []);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  // Viewport Focus Trigger for explicit jumps only (not on step/play)
  const [viewportFocusTrigger, setViewportFocusTrigger] = useState<number>(0);
  const triggerViewportFocus = useCallback(() => {
    setViewportFocusTrigger((c) => c + 1);
  }, []);

  // Replay State
  const [replay, setReplay] = useState<ReplayState>({
    isActive: false,
    isSelectingCutPoint: false,
    currentCutTime: null,
    currentIndex: -1,
    isPlaying: false,
    playbackSpeed: 500,
  });

  // Settings State
  const [candleColors, setCandleColors] = useState<CandleColorSettings>(loadStoredCandleColors);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(loadStoredThemeSettings);
  const [feeSettings, setFeeSettings] = useState<PropFirmFeeSettings>(loadStoredPropFirmSettings);

  // Trading & Paper Backtest State
  const [initialBalance, setInitialBalance] = useState<number>(() => activeSession?.initialBalance || 100000);
  const [balance, setBalance] = useState<number>(() => activeSession?.currentBalance || 100000);
  const [activePosition, setActivePosition] = useState<Position | null>(() => activeSession?.activePosition || null);
  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>(() => activeSession?.limitOrders || []);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(() => activeSession?.trades || []);
  const [riskSettings, setRiskSettings] = useState<RiskSettings>(loadStoredRiskSettings);

  // Prop Firm Rules & Tracking
  const [propFirmRules, setPropFirmRules] = useState<PropFirmRuleSettings>(() => {
    if (activeSession?.propFirm) return activeSession.propFirm;
    return {
      enabled: true,
      ...DEFAULT_PROP_FIRM_PRESETS.funding_pips,
    };
  });

  const [dayStartBalance, setDayStartBalance] = useState<number>(() => activeSession?.dayStartBalance || initialBalance);
  const [dayStartTime, setDayStartTime] = useState<number>(() => activeSession?.dayStartTime || Math.floor(Date.now() / 1000));

  // Drawings
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [magnetMode, setMagnetModeState] = useState<boolean>(loadStoredMagnetMode);

  const setMagnetMode = useCallback((enabled: boolean) => {
    setMagnetModeState(enabled);
    saveStoredMagnetMode(enabled);
  }, []);

  const toggleMagnetMode = useCallback(() => {
    setMagnetModeState((prev) => {
      const next = !prev;
      saveStoredMagnetMode(next);
      return next;
    });
  }, []);

  // Indicators
  const [showFractals, setShowFractals] = useState<boolean>(false);

  // Market Sessions
  const [sessionsSettings, setSessionsSettings] = useState<MarketSessionsSettings>(loadStoredSessionsSettings);

  // Custom Scripts
  const [customScripts, setCustomScripts] = useState<CustomScript[]>(loadStoredCustomScripts);
  const [activeScript, setActiveScriptState] = useState<CustomScript | null>(() => {
    const activeId = loadStoredActiveScriptId();
    const stored = loadStoredCustomScripts();
    return stored.find((s) => s.id === activeId) || null;
  });
  const [scriptOutput, setScriptOutput] = useState<ScriptOutput | null>(null);

  // Timezone
  const [timezone, setTimezoneState] = useState<string>(loadStoredTimezone);
  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    saveStoredTimezone(tz);
  }, []);

  // Economic News Filter
  const [newsFilter, setNewsFilter] = useState<NewsFilterSettings>(() => ({
    enabled: true,
    minImportance: 'high',
    showCurrencies: [],
  }));
  const updateNewsFilter = useCallback((filter: Partial<NewsFilterSettings>) => {
    setNewsFilter((prev) => ({ ...prev, ...filter }));
  }, []);
  const toggleNews = useCallback(() => {
    setNewsFilter((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Pre-trade Order Setup

  const [orderSetup, setOrderSetup] = useState<OrderSetupPreview>({
    enabled: false,
    side: 'long',
    orderType: 'market',
    entryPrice: symbolInfo.defaultPrice,
    stopLoss: Number((symbolInfo.defaultPrice * 0.992).toFixed(symbolInfo.pricePrecision)),
    takeProfit: Number((symbolInfo.defaultPrice * 1.016).toFixed(symbolInfo.pricePrecision)),
  });

  const updateOrderSetup = useCallback((setup: Partial<OrderSetupPreview>) => {
    setOrderSetup((prev) => ({ ...prev, ...setup }));
  }, []);

  // Timer ref for playback
  const playIntervalRef = useRef<number | null>(null);
  const isSwitchingSessionRef = useRef<boolean>(false);

  // Load candles when symbol or timeframe changes
  useEffect(() => {
    if (isSwitchingSessionRef.current) return;

    let isMounted = true;
    setIsLoading(true);

    const activeTargetTime = (replay.isActive && replay.currentCutTime)
      ? replay.currentCutTime
      : (activeSession?.currentReplayTime || activeSession?.startDate || null);

    getCandlesForTimeframe(symbol, timeframe, { targetTimestamp: activeTargetTime })
      .then((data) => {
        if (!isMounted) return;
        setAllCandles(data);
        setIsLoading(false);

        setReplay((prev) => {
          const cutTime = (prev.isActive && prev.currentCutTime) ? prev.currentCutTime : activeTargetTime;
          if (!cutTime) {
            return {
              ...prev,
              currentIndex: data.length - 1,
            };
          }

          let idx = -1;
          for (let i = 0; i < data.length; i++) {
            if (data[i].time <= cutTime) {
              idx = i;
            } else {
              break;
            }
          }

          if (idx === -1) idx = 0;

          return {
            ...prev,
            isActive: Boolean(activeSession || prev.isActive),
            currentCutTime: data[idx]?.time || cutTime,
            currentIndex: idx,
          };
        });
      })
      .catch((err) => {
        console.error(`Error loading candles for ${symbol}:`, err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [symbol, timeframe, activeSession?.id]);

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

  // Keep orderSetup entryPrice and levels reasonable when candle changes
  useEffect(() => {
    if (!currentCandle) return;
    const curPrice = currentCandle.close;
    setOrderSetup((prev) => {
      const diffRatio = Math.abs(curPrice - prev.entryPrice) / (curPrice || 1);
      if (diffRatio > 0.15 || prev.entryPrice === 65000 || prev.entryPrice === 78000) {
        const slDist = Math.round(curPrice * 0.008 * 10) / 10;
        const tpDist = Math.round(slDist * 2 * 10) / 10;
        return {
          ...prev,
          entryPrice: curPrice,
          stopLoss: prev.side === 'long'
            ? Number((curPrice - slDist).toFixed(symbolInfo.pricePrecision))
            : Number((curPrice + slDist).toFixed(symbolInfo.pricePrecision)),
          takeProfit: prev.side === 'long'
            ? Number((curPrice + tpDist).toFixed(symbolInfo.pricePrecision))
            : Number((curPrice - tpDist).toFixed(symbolInfo.pricePrecision)),
        };
      }
      if (prev.orderType === 'market' && prev.entryPrice !== curPrice) {
        return {
          ...prev,
          entryPrice: curPrice,
        };
      }
      return prev;
    });
  }, [currentCandle?.close, symbolInfo.pricePrecision]);

  // Evaluate limit orders and active position when new candle appears
  const processCandleTick = useCallback(
    (candle: Candle) => {
      // 1. Check day rollover for prop firm daily tracking (00:00 UTC)
      const candleDay = new Date(candle.time * 1000).getUTCDate();
      const lastDay = dayStartTime ? new Date(dayStartTime * 1000).getUTCDate() : null;
      if (lastDay !== null && candleDay !== lastDay) {
        setDayStartBalance(balance);
        setDayStartTime(candle.time);
      }

      // 2. Check Pending Limit Orders
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

      // 3. Check Active Position
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
    [feeSettings, balance, dayStartTime]
  );

  // Live polling: updates the latest candle every 5 seconds when in live mode (not in replay)
  useEffect(() => {
    if (replay.isActive || isLoading) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const latest = await fetchLatestCandles(symbol, timeframe, 3);
        if (!isMounted || latest.length === 0) return;

        setAllCandles((prevCandles) => {
          if (prevCandles.length === 0) return prevCandles;
          const merged = sanitizeCandles([...prevCandles, ...latest]);
          const lastCandle = merged[merged.length - 1];
          if (lastCandle) {
            processCandleTick(lastCandle);
          }
          return merged;
        });
      } catch {
        // Silently catch background polling errors
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol, timeframe, replay.isActive, isLoading, processCandleTick]);

  // Prop Firm Evaluation
  const unrealizedNetPnl = activePosition?.unrealizedNetPnl || 0;
  const propFirmEvaluation: PropFirmEvaluationResult = useMemo(() => {
    return evaluatePropFirmRules(
      initialBalance,
      balance,
      dayStartBalance,
      unrealizedNetPnl,
      propFirmRules
    );
  }, [initialBalance, balance, dayStartBalance, unrealizedNetPnl, propFirmRules]);

  const updatePropFirmRules = useCallback((rules: Partial<PropFirmRuleSettings>) => {
    setPropFirmRules((prev) => ({ ...prev, ...rules }));
  }, []);

  // Session Management (FX Replay style)
  const createSession = useCallback(
    async (params: {
      name: string;
      symbol: SupportedSymbol;
      startDate: number;
      endDate?: number | null;
      initialBalance: number;
      propFirm: PropFirmRuleSettings;
    }) => {
      const newSession: BacktestSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: params.name,
        symbol: params.symbol,
        timeframe,
        startDate: params.startDate,
        endDate: params.endDate ?? null,
        currentReplayTime: params.startDate,
        initialBalance: params.initialBalance,
        currentBalance: params.initialBalance,
        peakBalance: params.initialBalance,
        dayStartBalance: params.initialBalance,
        dayStartTime: params.startDate,
        propFirm: params.propFirm,
        propFirmStatus: 'in_progress',
        breachReason: null,
        breachTime: null,
        passedTime: null,
        trades: [],
        activePosition: null,
        limitOrders: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      isSwitchingSessionRef.current = true;
      const updated = [newSession, ...sessions.filter((s) => s.id !== newSession.id)];
      setSessions(updated);
      saveStoredSessions(updated);
      setActiveSessionId(newSession.id);
      saveStoredActiveSessionId(newSession.id);

      setSymbolState(params.symbol);
      saveStoredSymbol(params.symbol);
      setInitialBalance(params.initialBalance);
      setBalance(params.initialBalance);
      setPropFirmRules(params.propFirm);
      setDayStartBalance(params.initialBalance);
      setDayStartTime(params.startDate);
      setClosedTrades([]);
      setActivePosition(null);
      setLimitOrders([]);

      // Jump to start date on chart and switch to chart view
      setCurrentView('chart');
      try {
        await jumpToTimestamp(params.startDate, params.symbol);
      } finally {
        setTimeout(() => {
          isSwitchingSessionRef.current = false;
        }, 300);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, timeframe]
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      const sess = sessions.find((s) => s.id === sessionId);
      if (!sess) return;

      isSwitchingSessionRef.current = true;
      setActiveSessionId(sess.id);
      saveStoredActiveSessionId(sess.id);

      setSymbolState(sess.symbol);
      saveStoredSymbol(sess.symbol);
      setInitialBalance(sess.initialBalance);
      setBalance(sess.currentBalance);
      setPropFirmRules(sess.propFirm);
      setDayStartBalance(sess.dayStartBalance || sess.initialBalance);
      setDayStartTime(sess.dayStartTime || sess.startDate);
      setClosedTrades(sess.trades || []);
      setActivePosition(sess.activePosition || null);
      setLimitOrders(sess.limitOrders || []);

      const targetTime = sess.currentReplayTime || sess.startDate;
      setCurrentView('chart');
      try {
        await jumpToTimestamp(targetTime, sess.symbol);
      } finally {
        setTimeout(() => {
          isSwitchingSessionRef.current = false;
        }, 300);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions]
  );

  const resetSession = useCallback(
    async (sessionId: string) => {
      const sess = sessions.find((s) => s.id === sessionId);
      if (!sess) return;

      const resetObj: BacktestSession = {
        ...sess,
        currentReplayTime: sess.startDate,
        currentBalance: sess.initialBalance,
        peakBalance: sess.initialBalance,
        dayStartBalance: sess.initialBalance,
        dayStartTime: sess.startDate,
        propFirmStatus: 'in_progress',
        breachReason: null,
        breachTime: null,
        passedTime: null,
        trades: [],
        activePosition: null,
        limitOrders: [],
        updatedAt: Date.now(),
      };

      const updated = sessions.map((s) => (s.id === sessionId ? resetObj : s));
      setSessions(updated);
      saveStoredSessions(updated);

      if (activeSessionId === sessionId) {
        setBalance(sess.initialBalance);
        setClosedTrades([]);
        setActivePosition(null);
        setLimitOrders([]);
        setDayStartBalance(sess.initialBalance);
        setDayStartTime(sess.startDate);
        await jumpToTimestamp(sess.startDate, sess.symbol);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, activeSessionId]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      saveStoredSessions(updated);
      if (activeSessionId === sessionId) {
        const next = updated[0]?.id || null;
        setActiveSessionId(next);
        saveStoredActiveSessionId(next);
      }
    },
    [sessions, activeSessionId]
  );

  const updateSessionPropFirm = useCallback(
    (rules: PropFirmRuleSettings) => {
      setPropFirmRules(rules);
      if (activeSessionId) {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, propFirm: rules, updatedAt: Date.now() } : s))
        );
      }
    },
    [activeSessionId]
  );

  // Sync session state to storage whenever trades/balance/orders change
  useEffect(() => {
    if (!activeSessionId) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            currentBalance: balance,
            peakBalance: Math.max(s.peakBalance || s.initialBalance, balance),
            dayStartBalance,
            dayStartTime,
            trades: closedTrades,
            activePosition,
            limitOrders,
            propFirmStatus: propFirmEvaluation.status,
            breachReason: propFirmEvaluation.breachReason,
            currentReplayTime: replay.currentCutTime || s.startDate,
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );
  }, [
    activeSessionId,
    balance,
    closedTrades,
    activePosition,
    limitOrders,
    propFirmEvaluation.status,
    propFirmEvaluation.breachReason,
    dayStartBalance,
    dayStartTime,
    replay.currentCutTime,
  ]);

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
      let idx = -1;
      for (let i = 0; i < allCandles.length; i++) {
        if (allCandles[i].time <= timestampSeconds) {
          idx = i;
        } else {
          break;
        }
      }

      if (idx === -1) idx = 0;

      setReplay({
        isActive: true,
        isSelectingCutPoint: false,
        currentCutTime: allCandles[idx]?.time || timestampSeconds,
        currentIndex: idx,
        isPlaying: false,
        playbackSpeed: 500,
      });
      triggerViewportFocus();
    },
    [allCandles, triggerViewportFocus]
  );

  const stepForward = useCallback(() => {
    setReplay((prev) => {
      if (!prev.isActive || prev.currentIndex >= allCandles.length - 1) {
        return prev;
      }
      const nextIdx = prev.currentIndex + 1;
      const nextCandle = allCandles[nextIdx];
      const nextTime = nextCandle?.time ?? prev.currentCutTime;

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
    async (timestampSeconds: number, targetSymbol?: SupportedSymbol) => {
      setIsLoading(true);
      const activeSym = targetSymbol || symbol;
      try {
        const fetched = await fetchHistoricalDateRange(activeSym, timeframe, timestampSeconds);
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
        triggerViewportFocus();
      } catch (err) {
        console.error('Jump to timestamp failed:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [symbol, timeframe, triggerViewportFocus]
  );

  // Playback timer effect
  useEffect(() => {
    if (replay.isPlaying && replay.isActive) {
      playIntervalRef.current = window.setInterval(() => {
        stepForward();
      }, replay.playbackSpeed);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [replay.isPlaying, replay.isActive, replay.playbackSpeed, stepForward]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === ' ' && replay.isActive) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight' && replay.isActive) {
        e.preventDefault();
        stepForward();
      } else if (e.key === 'ArrowLeft' && replay.isActive) {
        e.preventDefault();
        stepBackward();
      } else if (e.key.toLowerCase() === 'r') {
        if (!replay.isActive && !replay.isSelectingCutPoint) {
          startReplaySelection();
        } else if (replay.isSelectingCutPoint) {
          cancelReplaySelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replay.isActive, replay.isSelectingCutPoint, togglePlay, stepForward, stepBackward, startReplaySelection, cancelReplaySelection]);

  // Settings Actions
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

  const showVolume = candleColors.showVolume !== false;
  const setShowVolume = useCallback((show: boolean) => {
    updateCandleColors({ showVolume: show });
  }, [updateCandleColors]);

  const toggleVolume = useCallback(() => {
    updateCandleColors({ showVolume: !showVolume });
  }, [showVolume, updateCandleColors]);

  // Market Sessions Handlers
  const updateSessionsSettings = useCallback((settings: Partial<MarketSessionsSettings>) => {
    setSessionsSettings((prev) => {
      const next = {
        ...prev,
        ...settings,
        sessions: {
          ...prev.sessions,
          ...(settings.sessions || {}),
        },
      };
      saveStoredSessionsSettings(next);
      return next;
    });
  }, []);

  const toggleSessions = useCallback(() => {
    setSessionsSettings((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      saveStoredSessionsSettings(next);
      return next;
    });
  }, []);

  // Custom Scripts Handlers
  const setActiveScript = useCallback((script: CustomScript | null) => {
    setActiveScriptState(script);
    saveStoredActiveScriptId(script ? script.id : null);
    if (!script) {
      setScriptOutput(null);
    }
  }, []);

  const runCustomScript = useCallback((code: string, scriptName: string = 'Кастомный скрипт'): ScriptOutput => {
    const result = executeCustomScript(code, visibleCandles);
    setScriptOutput(result);
    if (result.success) {
      const scriptObj: CustomScript = {
        id: activeScript?.id || `script_${Date.now()}`,
        name: scriptName,
        code,
        updatedAt: Date.now(),
      };
      setActiveScriptState(scriptObj);
      saveStoredActiveScriptId(scriptObj.id);
    }
    return result;
  }, [visibleCandles, activeScript]);

  const saveCustomScript = useCallback((script: CustomScript) => {
    setCustomScripts((prev) => {
      const existingIdx = prev.findIndex((s) => s.id === script.id);
      let updated: CustomScript[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = script;
      } else {
        updated = [script, ...prev];
      }
      saveStoredCustomScripts(updated);
      return updated;
    });
  }, []);

  const deleteCustomScript = useCallback((id: string) => {
    setCustomScripts((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveStoredCustomScripts(updated);
      return updated;
    });
    if (activeScript?.id === id) {
      setActiveScript(null);
    }
  }, [activeScript, setActiveScript]);

  const clearScriptOutput = useCallback(() => {
    setScriptOutput(null);
    setActiveScriptState(null);
    saveStoredActiveScriptId(null);
  }, []);

  // Automatically re-run active script when visibleCandles change
  useEffect(() => {
    if (activeScript && scriptOutput?.success && visibleCandles.length > 0) {
      const result = executeCustomScript(activeScript.code, visibleCandles);
      setScriptOutput(result);
    }
  }, [visibleCandles.length, activeScript?.code]);

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
        tp = side === 'long'
          ? entryPrice + slDist * riskSettings.defaultTpRatio
          : entryPrice - slDist * riskSettings.defaultTpRatio;
      }

      const riskCalc = calculateRiskPosition(
        balance,
        riskSettings,
        entryPrice,
        sl,
        tp,
        symbolInfo.lotPrecision,
        symbolInfo.baseAsset
      );
      if (!riskCalc.isValid || riskCalc.sizeAsset <= 0) {
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
        riskCalc.sizeAsset,
        Number(sl.toFixed(symbolInfo.pricePrecision)),
        Number(tp.toFixed(symbolInfo.pricePrecision)),
        currentCandle.time,
        feeSettings
      );
      setActivePosition(newPos);
      return true;
    },
    [currentCandle, riskSettings, balance, symbolInfo, activePosition, feeSettings]
  );

  const addLimitOrder = useCallback(
    (side: PositionSide, limitPrice: number, customSl?: number, customTp?: number): boolean => {
      let sl = customSl;
      let tp = customTp;

      if (!sl) {
        sl = side === 'long' ? limitPrice * 0.992 : limitPrice * 1.008;
      }
      if (!tp) {
        const slDist = Math.abs(limitPrice - sl);
        tp = side === 'long'
          ? limitPrice + slDist * riskSettings.defaultTpRatio
          : limitPrice - slDist * riskSettings.defaultTpRatio;
      }

      const riskCalc = calculateRiskPosition(
        balance,
        riskSettings,
        limitPrice,
        sl,
        tp,
        symbolInfo.lotPrecision,
        symbolInfo.baseAsset
      );
      if (!riskCalc.isValid || riskCalc.sizeAsset <= 0) {
        return false;
      }

      const order: LimitOrder = {
        id: `limit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        side,
        limitPrice: Number(limitPrice.toFixed(symbolInfo.pricePrecision)),
        size: riskCalc.sizeAsset,
        stopLoss: Number(sl.toFixed(symbolInfo.pricePrecision)),
        takeProfit: Number(tp.toFixed(symbolInfo.pricePrecision)),
        createdTime: currentCandle ? currentCandle.time : Math.floor(Date.now() / 1000),
        riskUsd: riskCalc.riskUsd,
      };

      setLimitOrders((prev) => [order, ...prev]);
      return true;
    },
    [balance, riskSettings, symbolInfo, currentCandle]
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
  }, [initialBalance]);

  // Position & Order Drag updates
  const updateActivePositionSL = useCallback((newSl: number) => {
    setActivePosition((prev) => {
      if (!prev) return null;
      return { ...prev, stopLoss: newSl };
    });
  }, []);

  const updateActivePositionTP = useCallback((newTp: number) => {
    setActivePosition((prev) => {
      if (!prev) return null;
      return { ...prev, takeProfit: newTp };
    });
  }, []);

  const updateLimitOrderPrice = useCallback((id: string, newPrice: number) => {
    setLimitOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, limitPrice: newPrice } : o))
    );
  }, []);

  const updateLimitOrderSL = useCallback((id: string, newSl: number) => {
    setLimitOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, stopLoss: newSl } : o))
    );
  }, []);

  const updateLimitOrderTP = useCallback((id: string, newTp: number) => {
    setLimitOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, takeProfit: newTp } : o))
    );
  }, []);

  // Drawing Tools History & Undo/Redo
  const drawingsRef = useRef<DrawingObject[]>(drawings);
  drawingsRef.current = drawings;

  const undoStackRef = useRef<DrawingObject[][]>([]);
  const redoStackRef = useRef<DrawingObject[][]>([]);
  const [canUndoDrawing, setCanUndoDrawing] = useState<boolean>(false);
  const [canRedoDrawing, setCanRedoDrawing] = useState<boolean>(false);

  const updateUndoRedoAvailability = useCallback(() => {
    setCanUndoDrawing(undoStackRef.current.length > 0);
    setCanRedoDrawing(redoStackRef.current.length > 0);
  }, []);

  const pushDrawingHistory = useCallback((snapshot?: DrawingObject[]) => {
    const stateToPush = snapshot
      ? JSON.parse(JSON.stringify(snapshot))
      : JSON.parse(JSON.stringify(drawingsRef.current));
    undoStackRef.current.push(stateToPush);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    updateUndoRedoAvailability();
  }, [updateUndoRedoAvailability]);

  const undoDrawing = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current.pop()!;
    redoStackRef.current.push(JSON.parse(JSON.stringify(drawingsRef.current)));
    setDrawings(previous);
    setSelectedDrawingId(null);
    updateUndoRedoAvailability();
  }, [updateUndoRedoAvailability]);

  const redoDrawing = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(JSON.parse(JSON.stringify(drawingsRef.current)));
    setDrawings(next);
    setSelectedDrawingId(null);
    updateUndoRedoAvailability();
  }, [updateUndoRedoAvailability]);

  // Global Ctrl+Z / Cmd+Z / Ctrl+Y / Ctrl+Shift+Z listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';
      if (isInput) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redoDrawing();
        } else {
          undoDrawing();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoDrawing, redoDrawing]);

  // Deselect active drawing when switching timeframe
  useEffect(() => {
    setSelectedDrawingId(null);
  }, [timeframe]);

  const addDrawing = useCallback((drawing: DrawingObject) => {
    pushDrawingHistory();
    setDrawings((prev) => [...prev, drawing]);
  }, [pushDrawingHistory]);

  const updateDrawing = useCallback((id: string, updated: Partial<DrawingObject>) => {
    setDrawings((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updated } : d))
    );
  }, []);

  const removeDrawing = useCallback((id: string) => {
    pushDrawingHistory();
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    setSelectedDrawingId((cur) => (cur === id ? null : cur));
  }, [pushDrawingHistory]);

  const clearDrawings = useCallback(() => {
    if (drawingsRef.current.length === 0) return;
    pushDrawingHistory();
    setDrawings([]);
    setSelectedDrawingId(null);
  }, [pushDrawingHistory]);

  const viewportCenterGetterRef = useRef<(() => { time: number; price: number } | null) | null>(null);
  const registerViewportCenterGetter = useCallback((getter: () => { time: number; price: number } | null) => {
    viewportCenterGetterRef.current = getter;
  }, []);

  const getViewportCenter = useCallback(() => {
    if (viewportCenterGetterRef.current) {
      const pt = viewportCenterGetterRef.current();
      if (pt) return pt;
    }
    if (currentCandle) {
      return { time: currentCandle.time, price: currentCandle.close };
    }
    if (visibleCandles.length > 0) {
      const last = visibleCandles[visibleCandles.length - 1];
      return { time: last.time, price: last.close };
    }
    return null;
  }, [currentCandle, visibleCandles]);

  const metrics = useMemo(() => {
    return calculateMetrics(closedTrades, initialBalance);
  }, [closedTrades, initialBalance]);

  const value = {
    symbol,
    setSymbol,
    symbolInfo,
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
    showVolume,
    setShowVolume,
    toggleVolume,
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
    selectedDrawingId,
    setSelectedDrawingId,
    drawings,
    addDrawing,
    updateDrawing,
    removeDrawing,
    clearDrawings,
    undoDrawing,
    redoDrawing,
    canUndoDrawing,
    canRedoDrawing,
    pushDrawingHistory,
    magnetMode,
    setMagnetMode,
    toggleMagnetMode,
    showFractals,
    setShowFractals,
    sessionsSettings,
    updateSessionsSettings,
    toggleSessions,
    customScripts,
    activeScript,
    scriptOutput,
    setActiveScript,
    runCustomScript,
    saveCustomScript,
    deleteCustomScript,
    clearScriptOutput,
    timezone,
    setTimezone,
    orderSetup,
    updateOrderSetup,
    registerViewportCenterGetter,
    getViewportCenter,
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    loadSession,
    resetSession,
    deleteSession,
    updateSessionPropFirm,
    propFirmRules,
    updatePropFirmRules,
    propFirmEvaluation,
    currentView,
    setCurrentView,
    newsFilter,
    updateNewsFilter,
    toggleNews,
    isCabinetOpen,
    setIsCabinetOpen,
    viewportFocusTrigger,
    triggerViewportFocus,
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
