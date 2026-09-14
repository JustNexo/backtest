import React, { useState } from 'react';
import {
  Scissors,
  Settings,
  Calendar,
  RotateCcw,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Loader2,
  Layers,
  Activity,
  Briefcase,
  ChevronDown,
  Check,
  FolderKanban,
  Shield,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { Timeframe } from '../../types/chart';
import { SupportedSymbol, SUPPORTED_SYMBOLS } from '../../types/session';
import { formatCurrency, formatPercent, formatPrice, formatVolume } from '../../utils/formatters';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenDateModal: () => void;
}

const TIMEFRAME_GROUPS = [
  {
    title: 'Секунды',
    items: [
      { tf: '1s' as Timeframe, label: '1 сек' },
      { tf: '10s' as Timeframe, label: '10 сек' },
    ],
  },
  {
    title: 'Минуты',
    items: [
      { tf: '1m' as Timeframe, label: '1 мин' },
      { tf: '3m' as Timeframe, label: '3 мин' },
      { tf: '5m' as Timeframe, label: '5 мин' },
      { tf: '15m' as Timeframe, label: '15 мин' },
      { tf: '30m' as Timeframe, label: '30 мин' },
    ],
  },
  {
    title: 'Часы',
    items: [
      { tf: '1h' as Timeframe, label: '1 час' },
      { tf: '2h' as Timeframe, label: '2 часа' },
      { tf: '4h' as Timeframe, label: '4 часа' },
    ],
  },
  {
    title: 'Дни и недели',
    items: [
      { tf: '1d' as Timeframe, label: '1 день' },
      { tf: '1w' as Timeframe, label: '1 неделя' },
    ],
  },
];

const FAVORITE_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

export const TopBar: React.FC<TopBarProps> = ({ onOpenSettings, onOpenDateModal }) => {
  const {
    symbol,
    setSymbol,
    symbolInfo,
    timeframe,
    setTimeframe,
    isLoading,
    currentCandle,
    replay,
    startReplaySelection,
    exitReplay,
    showFractals,
    setShowFractals,
    showVolume,
    toggleVolume,
    sessionsSettings,
    toggleSessions,
    activeSession,
    setCurrentView,
    propFirmEvaluation,
    propFirmRules,
  } = useChart();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isSymbolMenuOpen, setIsSymbolMenuOpen] = useState(false);
  const [isTfMenuOpen, setIsTfMenuOpen] = useState(false);
  const [isPropPopOpen, setIsPropPopOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  const candleChange = currentCandle
    ? currentCandle.close - currentCandle.open
    : 0;
  const candleChangePercent = currentCandle && currentCandle.open > 0
    ? (candleChange / currentCandle.open) * 100
    : 0;
  const isBullish = candleChange >= 0;

  // Prop firm meters
  const dailyUsedRatio =
    propFirmEvaluation.dailyLimitUsd > 0
      ? Math.min(100, (propFirmEvaluation.dailyLossUsd / propFirmEvaluation.dailyLimitUsd) * 100)
      : 0;
  const overallUsedRatio =
    propFirmEvaluation.overallLimitUsd > 0
      ? Math.min(100, (propFirmEvaluation.overallDrawdownUsd / propFirmEvaluation.overallLimitUsd) * 100)
      : 0;
  const targetCompletedRatio =
    propFirmEvaluation.profitTargetUsd > 0
      ? Math.min(100, Math.max(0, (propFirmEvaluation.currentProfitUsd / propFirmEvaluation.profitTargetUsd) * 100))
      : 0;

  return (
    <header className="h-12 border-b border-[#2a2e39] bg-[#131722] flex items-center justify-between px-3 shrink-0 select-none z-30 font-sans">
      {/* Left: Navigation to Sessions, Symbol & Timeframes */}
      <div className="flex items-center gap-2.5">
        {/* Back to Sessions / Dashboard button */}
        <button
          onClick={() => setCurrentView('cabinet')}
          title="Открыть Личный Кабинет трекера сессий (FX Replay)"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e222d] border border-[#2a2e39] hover:border-tv-blue/70 text-white rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer group"
        >
          <FolderKanban className="w-3.5 h-3.5 text-tv-blue group-hover:scale-110 transition-transform" />
          <span className="font-semibold hidden sm:inline">Сессии</span>
          {activeSession && (
            <span className="text-[10px] text-tv-yellow font-mono px-1.5 py-0.2 bg-black/40 rounded font-bold hidden lg:inline">
              {activeSession.name.slice(0, 14)}
            </span>
          )}
        </button>

        <div className="w-[1px] h-5 bg-[#2a2e39]" />

        {/* Interactive Symbol Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsSymbolMenuOpen(!isSymbolMenuOpen);
              setIsTfMenuOpen(false);
              setIsPropPopOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1 bg-[#1e222d] border border-[#2a2e39] hover:border-white/30 rounded-lg transition-colors cursor-pointer"
            title="Сменить актив (BTC, ETH, SOL)"
          >
            <div
              style={{ backgroundColor: symbolInfo.color }}
              className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-black text-[10px] shadow-sm"
            >
              {symbolInfo.icon}
            </div>
            <span className="font-semibold text-xs tracking-wide text-white font-mono">
              {symbol}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-tv-textMuted" />
          </button>

          {isSymbolMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-60 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-tv-textMuted border-b border-[#2a2e39]">
                Выберите инструмент
              </div>
              {(Object.keys(SUPPORTED_SYMBOLS) as SupportedSymbol[]).map((s) => {
                const info = SUPPORTED_SYMBOLS[s];
                const isCurrent = s === symbol;
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setSymbol(s);
                      setIsSymbolMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      isCurrent ? 'bg-tv-blue/20 text-white font-bold' : 'hover:bg-[#131722] text-tv-text'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        style={{ backgroundColor: info.color }}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-black font-bold text-xs"
                      >
                        {info.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-mono text-white text-xs">{info.symbol}</div>
                        <div className="text-[10px] text-tv-textMuted">{info.name}</div>
                      </div>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-tv-blue" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Timeframe Selector Dropdown Menu (FX Replay / TradingView style) */}
        <div className="relative">
          <div className="flex items-center bg-[#1e222d] border border-[#2a2e39] rounded-lg p-0.5">
            {/* Quick starred favorites */}
            {FAVORITE_TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  timeframe === tf
                    ? 'bg-tv-blue text-white font-semibold shadow-sm'
                    : 'text-tv-text hover:text-white hover:bg-tv-surfaceHover'
                }`}
              >
                {tf}
              </button>
            ))}

            {/* Dropdown chevron trigger */}
            <button
              onClick={() => {
                setIsTfMenuOpen(!isTfMenuOpen);
                setIsSymbolMenuOpen(false);
                setIsPropPopOpen(false);
              }}
              title="Все таймфреймы (Секунды, Минуты, Часы, Дни)"
              className="px-1.5 py-1 text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover rounded transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Categorized Timeframe Dropdown Menu */}
          {isTfMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2 z-50 divide-y divide-[#2a2e39]/60 animate-in fade-in zoom-in-95 duration-100">
              {TIMEFRAME_GROUPS.map((group) => (
                <div key={group.title} className="py-1.5 first:pt-0 last:pb-0">
                  <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tv-textMuted">
                    {group.title}
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {group.items.map((item) => (
                      <button
                        key={item.tf}
                        onClick={() => {
                          setTimeframe(item.tf);
                          setIsTfMenuOpen(false);
                        }}
                        className={`flex items-center justify-between px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                          timeframe === item.tf
                            ? 'bg-tv-blue text-white font-semibold'
                            : 'hover:bg-[#131722] text-tv-text'
                        }`}
                      >
                        <span>{item.label}</span>
                        {timeframe === item.tf && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loading spinner */}
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-tv-textMuted animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-tv-blue" />
            <span>Загрузка...</span>
          </div>
        )}

        {/* OHLCV ticker bar */}
        {currentCandle && (
          <div className="hidden xl:flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1">
              <span className="text-tv-textMuted">O:</span>
              <span className="text-white">${formatPrice(currentCandle.open, symbolInfo.precision)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-tv-textMuted">H:</span>
              <span className="text-white">${formatPrice(currentCandle.high, symbolInfo.precision)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-tv-textMuted">L:</span>
              <span className="text-white">${formatPrice(currentCandle.low, symbolInfo.precision)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-tv-textMuted">C:</span>
              <span className={isBullish ? 'text-[#089981] font-semibold' : 'text-tv-red font-semibold'}>
                ${formatPrice(currentCandle.close, symbolInfo.precision)}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 font-medium ${
                isBullish ? 'text-[#089981]' : 'text-tv-red'
              }`}
            >
              {isBullish ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{formatPercent(candleChangePercent)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Right: Prop Firm Status Pill, Replay Toggle & Tools */}
      <div className="flex items-center gap-2">
        {/* Sleek Prop Firm Status Pill (Integrated directly into TopBar!) */}
        {propFirmRules.enabled && (
          <div className="relative">
            <button
              onClick={() => {
                setIsPropPopOpen(!isPropPopOpen);
                setIsSymbolMenuOpen(false);
                setIsTfMenuOpen(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1 bg-[#1e222d] border border-[#2a2e39] hover:border-white/30 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              title="Показать статус проп-челленджа"
            >
              <Shield className="w-3.5 h-3.5 text-tv-blue" />
              <span className="text-tv-textMuted hidden 2xl:inline">День:</span>
              <span className={dailyUsedRatio > 80 ? 'text-tv-red font-bold' : 'text-white'}>
                -${formatCurrency(propFirmEvaluation.dailyLossUsd, 0)} / -${formatCurrency(propFirmEvaluation.dailyLimitUsd, 0)}
              </span>
              <span className="text-tv-textMuted mx-0.5">|</span>
              <span className="text-tv-textMuted hidden 2xl:inline">Цель:</span>
              <span className="text-[#089981] font-semibold">
                +${formatCurrency(propFirmEvaluation.currentProfitUsd, 0)} / +${formatCurrency(propFirmEvaluation.profitTargetUsd, 0)}
              </span>
              <ChevronDown className="w-3 h-3 text-tv-textMuted" />
            </button>

            {/* Popover with full breakdown and meters */}
            {isPropPopOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-4 z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-100 font-sans">
                <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-tv-blue" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      {propFirmRules.preset.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsPropPopOpen(false);
                      setCurrentView('cabinet');
                    }}
                    className="text-[11px] text-tv-blue hover:underline cursor-pointer font-medium"
                  >
                    В кабинет →
                  </button>
                </div>

                {/* Daily loss meter */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-tv-textMuted">Дневной убыток (лимит {propFirmRules.dailyLossLimitPercent}%):</span>
                    <span className={dailyUsedRatio > 80 ? 'text-tv-red font-bold' : 'text-white'}>
                      ${formatCurrency(propFirmEvaluation.dailyLossUsd, 0)} / ${formatCurrency(propFirmEvaluation.dailyLimitUsd, 0)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#131722] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${dailyUsedRatio}%` }}
                      className={`h-full rounded-full transition-all ${
                        dailyUsedRatio > 80 ? 'bg-tv-red' : dailyUsedRatio > 50 ? 'bg-tv-yellow' : 'bg-[#089981]'
                      }`}
                    />
                  </div>
                </div>

                {/* Overall Drawdown meter */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-tv-textMuted">Макс. просадка (лимит {propFirmRules.overallLossLimitPercent}%):</span>
                    <span className={overallUsedRatio > 80 ? 'text-tv-red font-bold' : 'text-white'}>
                      ${formatCurrency(propFirmEvaluation.overallDrawdownUsd, 0)} / ${formatCurrency(propFirmEvaluation.overallLimitUsd, 0)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#131722] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${overallUsedRatio}%` }}
                      className={`h-full rounded-full transition-all ${
                        overallUsedRatio > 80 ? 'bg-tv-red' : 'bg-[#089981]'
                      }`}
                    />
                  </div>
                </div>

                {/* Profit Target meter */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-tv-textMuted">Цель прибыли ({propFirmRules.profitTargetPercent}%):</span>
                    <span className="text-[#089981] font-bold">
                      ${formatCurrency(propFirmEvaluation.currentProfitUsd, 0)} / ${formatCurrency(propFirmEvaluation.profitTargetUsd, 0)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#131722] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${targetCompletedRatio}%` }}
                      className="h-full bg-tv-blue rounded-full transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bar Replay Toggle Button */}
        <button
          onClick={() => {
            if (replay.isActive || replay.isSelectingCutPoint) {
              exitReplay();
            } else {
              startReplaySelection();
            }
          }}
          title="Симулятор рынка (Bar Replay) — горячая клавиша R"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            replay.isActive || replay.isSelectingCutPoint
              ? 'bg-tv-blue text-white shadow-md shadow-tv-blue/25 ring-1 ring-white/20'
              : 'bg-[#1e222d] border border-[#2a2e39] text-tv-text hover:text-white hover:bg-tv-surfaceHover'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Симулятор</span>
          <span className="text-[10px] px-1 bg-black/20 rounded font-mono">R</span>
        </button>

        {/* Indicators Dropdown (Fractals) */}
        <div className="relative">
          <button
            onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
            title="Индикаторы графика"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              showFractals || sessionsSettings.enabled || isIndicatorsOpen
                ? 'bg-tv-blue text-white'
                : 'bg-[#1e222d] border border-[#2a2e39] text-tv-text hover:text-white hover:bg-tv-surfaceHover'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Индикаторы</span>
            {(showFractals || sessionsSettings.enabled) && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          {isIndicatorsOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in duration-100">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-tv-textMuted border-b border-[#2a2e39]">
                Встроенные индикаторы
              </div>

              {/* Sessions Toggle */}
              <button
                onClick={() => {
                  toggleSessions();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  sessionsSettings.enabled
                    ? 'bg-tv-blue/20 text-white font-medium'
                    : 'hover:bg-[#131722] text-tv-text'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="font-semibold">Сессии рынка (Sessions)</span>
                  <span className="text-[10px] text-tv-textMuted">Азия, Лондон, Нью-Йорк</span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    sessionsSettings.enabled ? 'bg-tv-blue' : 'bg-[#363a45]'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                      sessionsSettings.enabled ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>

              {/* Volume Toggle */}
              <button
                onClick={() => {
                  toggleVolume();
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  showVolume
                    ? 'bg-tv-blue/20 text-white font-medium'
                    : 'hover:bg-[#131722] text-tv-text'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="font-semibold">Объемы торгов (Volume)</span>
                  <span className="text-[10px] text-tv-textMuted">Гистограмма внизу графика</span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    showVolume ? 'bg-tv-blue' : 'bg-[#363a45]'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                      showVolume ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>

              {/* Fractals Toggle */}
              <button
                onClick={() => {
                  setShowFractals(!showFractals);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  showFractals
                    ? 'bg-tv-blue/20 text-white font-medium'
                    : 'hover:bg-[#131722] text-tv-text'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="font-semibold">Фракталы (Williams Fractals)</span>
                  <span className="text-[10px] text-tv-textMuted">Пики (▲) и впадины (▼)</span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    showFractals ? 'bg-tv-blue' : 'bg-[#363a45]'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                      showFractals ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Go To Date */}
        <button
          onClick={onOpenDateModal}
          title="Перейти к дате (глубокая история за 2+ года)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-tv-text hover:text-white hover:bg-tv-surfaceHover transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Дата</span>
        </button>

        <div className="w-[1px] h-5 bg-[#2a2e39]" />

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Настройки свечей и графика"
          className="p-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-tv-text hover:text-white hover:bg-tv-surfaceHover transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
          className="p-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-tv-text hover:text-white hover:bg-tv-surfaceHover transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
