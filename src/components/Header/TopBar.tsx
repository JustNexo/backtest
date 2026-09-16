import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Settings,
  Calendar,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronDown,
  Check,
  FolderKanban,
  Shield,
  Clock,
  Activity,
  Search,
  SlidersHorizontal,
  Newspaper,
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { Timeframe } from '../../types/chart';
import { SupportedSymbol, SUPPORTED_SYMBOLS, AssetClass, isMarketOpen } from '../../types/session';
import { NewsImportance } from '../../types/news';
import { formatCurrency, formatPercent, formatPrice } from '../../utils/formatters';
import { SessionSettingsModal } from '../Chart/SessionSettingsModal';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenDateModal: () => void;
}

const TIMEFRAME_GROUPS = [
  {
    title: 'Минуты',
    items: [
      { tf: '1m' as Timeframe, label: '1м' },
      { tf: '3m' as Timeframe, label: '3м' },
      { tf: '5m' as Timeframe, label: '5м' },
      { tf: '15m' as Timeframe, label: '15м' },
      { tf: '30m' as Timeframe, label: '30м' },
    ],
  },
  {
    title: 'Часы',
    items: [
      { tf: '1h' as Timeframe, label: '1ч' },
      { tf: '2h' as Timeframe, label: '2ч' },
      { tf: '4h' as Timeframe, label: '4ч' },
    ],
  },
  {
    title: 'Дни и недели',
    items: [
      { tf: '1d' as Timeframe, label: '1Д' },
      { tf: '1w' as Timeframe, label: '1Н' },
    ],
  },
];

const FAVORITE_TIMEFRAMES: Array<{ tf: Timeframe; label: string }> = [
  { tf: '1m', label: '1м' },
  { tf: '5m', label: '5м' },
  { tf: '15m', label: '15м' },
  { tf: '1h', label: '1ч' },
  { tf: '4h', label: '4ч' },
  { tf: '1d', label: '1Д' },
];

const ASSET_TABS: Array<{ id: AssetClass | 'all'; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'forex', label: 'Forex' },
  { id: 'indices', label: 'Индексы' },
  { id: 'metals', label: 'Металлы' },
  { id: 'crypto', label: 'Крипто' },
];

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
    newsFilter,
    updateNewsFilter,
    toggleNews,
  } = useChart();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isSessionSettingsOpen, setIsSessionSettingsOpen] = useState(false);
  const [isSymbolMenuOpen, setIsSymbolMenuOpen] = useState(false);
  const [isTfMenuOpen, setIsTfMenuOpen] = useState(false);
  const [isPropPopOpen, setIsPropPopOpen] = useState(false);
  const [isNewsMenuOpen, setIsNewsMenuOpen] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [assetTab, setAssetTab] = useState<AssetClass | 'all'>('all');

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

  const marketStatus = useMemo(() => isMarketOpen(symbol), [symbol]);

  const filteredSymbols = useMemo(() => {
    const list = Object.values(SUPPORTED_SYMBOLS);
    return list.filter((s) => {
      if (assetTab !== 'all' && s.assetClass !== assetTab) return false;
      if (symbolSearch.trim()) {
        const q = symbolSearch.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.baseAsset.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assetTab, symbolSearch]);

  return (
    <header className="h-11 border-b border-[#242731] bg-[#131722] flex items-center justify-between px-2.5 shrink-0 select-none z-30 font-sans">
      {/* Left Group */}
      <div className="flex items-center gap-1">
        {/* Sessions / Cabinet button (FX Replay Terminal Switcher) */}
        <button
          onClick={() => setCurrentView('cabinet')}
          title="Открыть Личный Кабинет трекера сессий (FX Replay)"
          className="flex items-center gap-2 px-2.5 py-1 bg-[#1a1e29] hover:bg-[#242731] border border-[#2e3240] hover:border-[#3d4354] rounded transition-all text-xs font-medium cursor-pointer shadow-sm group"
        >
          <div className="flex items-center gap-1.5 font-mono font-semibold text-[#2962ff]">
            <FolderKanban className="w-3.5 h-3.5 group-hover:scale-105 transition-transform text-[#2962ff]" />
            <span className="tracking-wide">СЕССИИ</span>
          </div>
          {activeSession ? (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#d1d4dc] border-l border-[#2e3240] pl-2">
              <span className="text-white font-medium truncate max-w-[120px]">{activeSession.name}</span>
              <span className="text-[#787b86]">({new Date(activeSession.startDate * 1000).getUTCFullYear()})</span>
            </div>
          ) : (
            <span className="text-[10px] text-[#787b86] font-mono border-l border-[#2e3240] pl-1.5 uppercase">
              Кабинет
            </span>
          )}
        </button>

        <div className="w-[1px] h-4 bg-[#242731] mx-1" />

        {/* Symbol Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsSymbolMenuOpen(!isSymbolMenuOpen);
              setIsTfMenuOpen(false);
              setIsPropPopOpen(false);
              setIsNewsMenuOpen(false);
              setIsIndicatorsOpen(false);
            }}
            className="flex items-center gap-2 px-2 py-1 hover:bg-[#1e222d] rounded transition-colors cursor-pointer"
            title="Сменить торговый инструмент"
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  marketStatus.isOpen ? 'bg-[#089981]' : 'bg-[#f23645]'
                }`}
                title={marketStatus.statusText}
              />
              <span className="font-semibold text-xs text-white font-mono tracking-wide">
                {symbol}
              </span>
            </div>
            <span className="text-[10px] text-[#787b86] hidden lg:inline font-sans">
              {symbolInfo.name}
            </span>
            <ChevronDown className="w-3 h-3 text-[#787b86]" />
          </button>

          {isSymbolMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-80 bg-[#181b24] border border-[#2a2e39] rounded-lg shadow-2xl p-2 z-50 animate-in fade-in duration-100">
              {/* Search Bar */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-[#787b86] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value)}
                  placeholder="Поиск инструмента..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#131722] border border-[#242731] focus:border-[#2962ff] rounded text-xs text-white placeholder-[#787b86] outline-none"
                  autoFocus
                />
              </div>

              {/* Asset Class Filter Tabs */}
              <div className="flex items-center gap-1 pb-2 mb-1 border-b border-[#242731] overflow-x-auto">
                {ASSET_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAssetTab(tab.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      assetTab === tab.id
                        ? 'bg-[#2962ff] text-white'
                        : 'text-[#787b86] hover:text-white hover:bg-[#1e222d]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Symbols List */}
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {filteredSymbols.map((item) => {
                  const isSelected = symbol === item.symbol;
                  const itemStatus = isMarketOpen(item.symbol);
                  return (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        setSymbol(item.symbol);
                        setIsSymbolMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#2962ff]/20 text-white'
                          : 'hover:bg-[#1e222d] text-[#d1d4dc]'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-left">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            itemStatus.isOpen ? 'bg-[#089981]' : 'bg-[#f23645]'
                          }`}
                        />
                        <div>
                          <div className="font-semibold font-mono text-white text-xs">
                            {item.symbol}
                          </div>
                          <div className="text-[10px] text-[#787b86] truncate max-w-[170px]">
                            {item.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right font-mono">
                        <span className="text-[10px] text-[#787b86]">
                          {itemStatus.statusText}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#2962ff]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-[#242731] mx-1" />

        {/* Flat Timeframe Bar */}
        <div className="flex items-center gap-0.5">
          {FAVORITE_TIMEFRAMES.map((f) => (
            <button
              key={f.tf}
              onClick={() => setTimeframe(f.tf)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                timeframe === f.tf
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* More Timeframes Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsTfMenuOpen(!isTfMenuOpen);
                setIsSymbolMenuOpen(false);
                setIsPropPopOpen(false);
                setIsNewsMenuOpen(false);
                setIsIndicatorsOpen(false);
              }}
              className="p-1 text-[#787b86] hover:text-white hover:bg-[#1e222d] rounded transition-colors cursor-pointer"
              title="Все таймфреймы"
            >
              <ChevronDown className="w-3 h-3" />
            </button>

            {isTfMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-[#181b24] border border-[#2a2e39] rounded-lg shadow-2xl p-1.5 z-50 divide-y divide-[#242731]">
                {TIMEFRAME_GROUPS.map((group) => (
                  <div key={group.title} className="py-1 first:pt-0 last:pb-0">
                    <div className="px-2 py-0.5 text-[9px] font-semibold uppercase text-[#787b86]">
                      {group.title}
                    </div>
                    <div className="grid grid-cols-2 gap-0.5 mt-0.5">
                      {group.items.map((item) => (
                        <button
                          key={item.tf}
                          onClick={() => {
                            setTimeframe(item.tf);
                            setIsTfMenuOpen(false);
                          }}
                          className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                            timeframe === item.tf
                              ? 'bg-[#2962ff] text-white font-medium'
                              : 'text-[#d1d4dc] hover:bg-[#1e222d]'
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
        </div>

        <div className="w-[1px] h-4 bg-[#242731] mx-1" />

        {/* Indicators Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsIndicatorsOpen(!isIndicatorsOpen);
              setIsSymbolMenuOpen(false);
              setIsTfMenuOpen(false);
              setIsPropPopOpen(false);
              setIsNewsMenuOpen(false);
            }}
            title="Индикаторы графика"
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              showFractals || sessionsSettings.enabled || isIndicatorsOpen
                ? 'bg-[#242731] text-white'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#2962ff]" />
            <span className="hidden xl:inline">Индикаторы</span>
          </button>

          {isIndicatorsOpen && (
            <div className="absolute left-0 top-full mt-1 w-60 bg-[#181b24] border border-[#2a2e39] rounded-lg shadow-2xl p-1.5 z-50 space-y-0.5">
              <div className="px-2 py-1 text-[9px] font-semibold uppercase text-[#787b86] border-b border-[#242731]">
                Индикаторы
              </div>

              <div
                className={`w-full flex items-center justify-between px-2.5 py-1 rounded text-xs transition-colors ${
                  sessionsSettings.enabled ? 'bg-[#2962ff]/20 text-white font-medium' : 'text-[#d1d4dc] hover:bg-[#1e222d]'
                }`}
              >
                <button
                  onClick={toggleSessions}
                  className="flex-1 flex items-center justify-between text-left cursor-pointer py-0.5"
                >
                  <span>Торговые сессии (Killzones)</span>
                  {sessionsSettings.enabled && <Check className="w-3.5 h-3.5 text-[#2962ff] mr-1" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSessionSettingsOpen(true);
                    setIsIndicatorsOpen(false);
                  }}
                  title="Настройки торговых сессий (цвета, стиль, часы)"
                  className="p-1 text-[#787b86] hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setShowFractals(!showFractals)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                  showFractals ? 'bg-[#2962ff]/20 text-white font-medium' : 'text-[#d1d4dc] hover:bg-[#1e222d]'
                }`}
              >
                <span>Фракталы Билла Вильямса</span>
                {showFractals && <Check className="w-3.5 h-3.5 text-[#2962ff]" />}
              </button>

              <button
                onClick={toggleVolume}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                  showVolume ? 'bg-[#2962ff]/20 text-white font-medium' : 'text-[#d1d4dc] hover:bg-[#1e222d]'
                }`}
              >
                <span>Объемы (Volume Bar)</span>
                {showVolume && <Check className="w-3.5 h-3.5 text-[#2962ff]" />}
              </button>
            </div>
          )}
        </div>

        {/* Economic News Toggle & Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNewsMenuOpen(!isNewsMenuOpen);
              setIsSymbolMenuOpen(false);
              setIsTfMenuOpen(false);
              setIsPropPopOpen(false);
              setIsIndicatorsOpen(false);
            }}
            title="Экономический календарь новостей"
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              newsFilter.enabled
                ? 'bg-[#242731] text-white'
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5 text-[#f7a600]" />
            <span className="hidden xl:inline">
              Новости {newsFilter.enabled ? `(${newsFilter.minImportance.toUpperCase()})` : 'Выкл'}
            </span>
          </button>

          {isNewsMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#181b24] border border-[#2a2e39] rounded-lg shadow-2xl p-2 z-50 space-y-1.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#242731]">
                <span className="text-[10px] font-semibold uppercase text-[#787b86]">Новости на графике</span>
                <button
                  onClick={toggleNews}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    newsFilter.enabled ? 'bg-[#089981] text-white' : 'bg-[#242731] text-[#787b86]'
                  }`}
                >
                  {newsFilter.enabled ? 'ВКЛ' : 'ВЫКЛ'}
                </button>
              </div>

              <div className="text-[10px] text-[#787b86] pt-1">Фильтр важности:</div>
              <div className="grid grid-cols-3 gap-1">
                {(['high', 'medium', 'low'] as NewsImportance[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => updateNewsFilter({ minImportance: lvl, enabled: true })}
                    className={`py-1 rounded text-[10px] font-medium transition-colors ${
                      newsFilter.minImportance === lvl && newsFilter.enabled
                        ? 'bg-[#2962ff] text-white font-bold'
                        : 'bg-[#131722] text-[#787b86] hover:text-white'
                    }`}
                  >
                    {lvl === 'high' ? '🔴 High' : lvl === 'medium' ? '🟠 Med+' : '🟡 All'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-[#242731] mx-1" />

        {/* Bar Replay Button */}
        <button
          onClick={() => {
            if (replay.isActive || replay.isSelectingCutPoint) {
              exitReplay();
            } else {
              startReplaySelection();
            }
          }}
          title="Симулятор рынка (Bar Replay) — горячая клавиша R"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
            replay.isActive
              ? 'bg-[#2962ff] text-white shadow-sm font-semibold'
              : replay.isSelectingCutPoint
              ? 'bg-[#f59e0b] text-black shadow-sm font-semibold'
              : 'text-[#d1d4dc] hover:text-white hover:bg-[#1e222d]'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>{replay.isActive ? 'Симуляция ВКЛ' : replay.isSelectingCutPoint ? 'Выберите срез' : 'Replay'}</span>
          <span className="text-[10px] opacity-70 font-mono">R</span>
        </button>
      </div>

      {/* Center: Clean Monospace OHLCV Ticker */}
      {currentCandle && (
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">O</span>
            <span className="text-white">{formatPrice(currentCandle.open, symbolInfo.precision)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">H</span>
            <span className="text-white">{formatPrice(currentCandle.high, symbolInfo.precision)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">L</span>
            <span className="text-white">{formatPrice(currentCandle.low, symbolInfo.precision)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">C</span>
            <span className={isBullish ? 'text-[#089981] font-semibold' : 'text-[#f23645] font-semibold'}>
              {formatPrice(currentCandle.close, symbolInfo.precision)}
            </span>
          </div>
          <div className={`flex items-center gap-0.5 text-[11px] ${isBullish ? 'text-[#089981]' : 'text-[#f23645]'}`}>
            {isBullish ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{formatPercent(candleChangePercent)}</span>
          </div>
        </div>
      )}

      {/* Right Group: Prop Challenge Meter & Controls */}
      <div className="flex items-center gap-1">
        {/* Prop Firm Meter (Minimal, clean badge) */}
        {propFirmRules.enabled && (
          <div className="relative">
            <button
              onClick={() => {
                setIsPropPopOpen(!isPropPopOpen);
                setIsSymbolMenuOpen(false);
                setIsTfMenuOpen(false);
                setIsNewsMenuOpen(false);
                setIsIndicatorsOpen(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1 text-xs font-mono hover:bg-[#1e222d] rounded transition-colors cursor-pointer"
              title="Статус проп-челленджа"
            >
              <Shield className="w-3.5 h-3.5 text-[#2962ff]" />
              <span className="text-[#787b86] hidden xl:inline">День:</span>
              <span className={dailyUsedRatio > 80 ? 'text-[#f23645] font-bold' : 'text-[#d1d4dc]'}>
                {formatCurrency(propFirmEvaluation.dailyLossUsd, 0)}/{formatCurrency(propFirmEvaluation.dailyLimitUsd, 0)}
              </span>
              <span className="text-[#242731]">|</span>
              <span className="text-[#787b86] hidden xl:inline">Цель:</span>
              <span className="text-[#089981]">
                {formatCurrency(propFirmEvaluation.currentProfitUsd, 0, { showPlus: true })}
              </span>
              <ChevronDown className="w-3 h-3 text-[#787b86]" />
            </button>

            {isPropPopOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-[#181b24] border border-[#2a2e39] rounded-lg shadow-2xl p-3 z-50 space-y-2.5 font-sans">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#242731]">
                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                    {propFirmRules.preset.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => {
                      setIsPropPopOpen(false);
                      setCurrentView('cabinet');
                    }}
                    className="text-[11px] text-[#2962ff] hover:underline"
                  >
                    В кабинет →
                  </button>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#787b86]">Дневной лимит ({propFirmRules.dailyLossLimitPercent}%):</span>
                      <span className={dailyUsedRatio > 80 ? 'text-[#f23645] font-bold' : 'text-white'}>
                        {formatCurrency(propFirmEvaluation.dailyLossUsd, 0)} / {formatCurrency(propFirmEvaluation.dailyLimitUsd, 0)}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[#131722] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${dailyUsedRatio}%` }}
                        className={`h-full ${dailyUsedRatio > 80 ? 'bg-[#f23645]' : 'bg-[#089981]'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#787b86]">Макс. просадка ({propFirmRules.overallLossLimitPercent}%):</span>
                      <span className={overallUsedRatio > 80 ? 'text-[#f23645] font-bold' : 'text-white'}>
                        {formatCurrency(propFirmEvaluation.overallDrawdownUsd, 0)} / {formatCurrency(propFirmEvaluation.overallLimitUsd, 0)}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[#131722] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${overallUsedRatio}%` }}
                        className={`h-full ${overallUsedRatio > 80 ? 'bg-[#f23645]' : 'bg-[#089981]'}`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#787b86]">Цель прибыли ({propFirmRules.profitTargetPercent}%):</span>
                      <span className="text-[#089981] font-semibold">
                        {formatCurrency(propFirmEvaluation.currentProfitUsd, 0, { showPlus: true })} / {formatCurrency(propFirmEvaluation.profitTargetUsd, 0)}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[#131722] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${targetCompletedRatio}%` }}
                        className="h-full bg-[#2962ff]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onOpenDateModal}
          title="Перейти к конкретной дате"
          className="p-1.5 text-[#787b86] hover:text-white hover:bg-[#1e222d] rounded transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          title="Настройки графика"
          className="p-1.5 text-[#787b86] hover:text-white hover:bg-[#1e222d] rounded transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          title="На весь экран"
          className="p-1.5 text-[#787b86] hover:text-white hover:bg-[#1e222d] rounded transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <SessionSettingsModal
        isOpen={isSessionSettingsOpen}
        onClose={() => setIsSessionSettingsOpen(false)}
      />
    </header>
  );
};
