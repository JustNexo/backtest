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
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { Timeframe } from '../../types/chart';
import { formatPercent, formatPrice, formatVolume } from '../../utils/formatters';

interface TopBarProps {
  onOpenSettings: () => void;
  onOpenDateModal: () => void;
}

const TIMEFRAMES: Array<{ tf: Timeframe; label: string }> = [
  { tf: '1m', label: '1m' },
  { tf: '3m', label: '3m' },
  { tf: '5m', label: '5m' },
  { tf: '15m', label: '15m' },
  { tf: '30m', label: '30m' },
  { tf: '1h', label: '1ч' },
  { tf: '2h', label: '2ч' },
  { tf: '4h', label: '4ч' },
  { tf: '1d', label: '1Д' },
  { tf: '1w', label: '1Н' },
];

export const TopBar: React.FC<TopBarProps> = ({ onOpenSettings, onOpenDateModal }) => {
  const {
    symbol,
    timeframe,
    setTimeframe,
    isLoading,
    currentCandle,
    replay,
    startReplaySelection,
    exitReplay,
    showFractals,
    setShowFractals,
  } = useChart();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);

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

  return (
    <header className="h-12 border-b border-[#2a2e39] bg-[#131722] flex items-center justify-between px-3 shrink-0 select-none z-10">
      {/* Left: Symbol & Stats */}
      <div className="flex items-center gap-3">
        {/* Symbol badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#1e222d] border border-[#2a2e39] rounded-lg">
          <div className="w-5 h-5 rounded-full bg-[#f7931a] flex items-center justify-center font-bold text-black text-xs shadow-sm">
            ₿
          </div>
          <span className="font-semibold text-sm tracking-wide text-white font-mono">
            {symbol}
          </span>
          <span className="px-1.5 py-0.2 bg-[#2a2e39] text-[10px] font-semibold text-tv-yellow rounded uppercase tracking-wider">
            PERP
          </span>
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
          <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1">
              <span className="text-tv-textMuted">O:</span>
              <span className="text-white">{formatPrice(currentCandle.open)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-tv-textMuted">H:</span>
              <span className="text-white">{formatPrice(currentCandle.high)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-tv-textMuted">L:</span>
              <span className="text-white">{formatPrice(currentCandle.low)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-tv-textMuted">C:</span>
              <span className={isBullish ? 'text-tv-green font-semibold' : 'text-tv-red font-semibold'}>
                {formatPrice(currentCandle.close)}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 font-medium ${
                isBullish ? 'text-tv-green' : 'text-tv-red'
              }`}
            >
              {isBullish ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{formatPercent(candleChangePercent)}</span>
              <span>({formatPrice(candleChange, 1)})</span>
            </div>
            <div className="flex items-center gap-1 text-tv-textMuted">
              <span>Vol:</span>
              <span className="text-tv-text">{formatVolume(currentCandle.volume)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Center: Timeframe Selector */}
      <div className="flex items-center gap-0.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg p-0.5">
        {TIMEFRAMES.map((item) => (
          <button
            key={item.tf}
            onClick={() => setTimeframe(item.tf)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              timeframe === item.tf
                ? 'bg-tv-blue text-white shadow-sm font-semibold'
                : 'text-tv-text hover:text-white hover:bg-tv-surfaceHover'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Right: Tools & Actions */}
      <div className="flex items-center gap-2">
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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            replay.isActive || replay.isSelectingCutPoint
              ? 'bg-tv-blue text-white shadow-md shadow-tv-blue/25 ring-1 ring-white/20'
              : 'bg-[#1e222d] border border-[#2a2e39] text-tv-text hover:text-white hover:bg-tv-surfaceHover'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Симулятор рынка</span>
          <span className="text-[10px] px-1 bg-black/20 rounded font-mono">R</span>
        </button>

        {/* Indicators Dropdown (Fractals, etc.) */}
        <div className="relative">
          <button
            onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
            title="Индикаторы графика (Фракталы и скрипты)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showFractals || isIndicatorsOpen
                ? 'bg-tv-blue text-white'
                : 'bg-[#1e222d] border border-[#2a2e39] text-tv-text hover:text-white hover:bg-tv-surfaceHover'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Индикаторы</span>
            {showFractals && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          {isIndicatorsOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2 z-30 space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-tv-textMuted border-b border-[#2a2e39]">
                Встроенные индикаторы
              </div>

              {/* Fractals Toggle */}
              <button
                onClick={() => {
                  setShowFractals(!showFractals);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
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

        {/* Go To Date (2 years history jump) */}
        <button
          onClick={onOpenDateModal}
          title="Перейти к дате (глубокая история за 2+ года)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-tv-text hover:text-white hover:bg-tv-surfaceHover transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Дата</span>
        </button>

        <div className="w-[1px] h-5 bg-[#2a2e39]" />

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Настройки свечей и графика"
          className="p-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-tv-text hover:text-white hover:bg-tv-surfaceHover transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
          className="p-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-tv-text hover:text-white hover:bg-tv-surfaceHover transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
