import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Scissors,
  X,
  Clock,
  ChevronDown,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { formatDateTime } from '../../utils/formatters';

const SPEED_OPTIONS = [
  { label: '0.1 сек / бар (10x)', value: 100 },
  { label: '0.25 сек / бар (4x)', value: 250 },
  { label: '0.5 сек / бар (2x)', value: 500 },
  { label: '1.0 сек / бар (1x)', value: 1000 },
  { label: '2.0 сек / бар (0.5x)', value: 2000 },
  { label: '3.0 сек / бар (0.3x)', value: 3000 },
];

export const ReplayToolbar: React.FC = () => {
  const {
    replay,
    stepForward,
    stepBackward,
    togglePlay,
    setPlaybackSpeed,
    startReplaySelection,
    exitReplay,
    currentCandle,
    allCandles,
    scrubToIndex,
  } = useChart();

  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  if (!replay.isActive && !replay.isSelectingCutPoint) {
    return null;
  }

  const currentSpeedLabel =
    SPEED_OPTIONS.find((s) => s.value === replay.playbackSpeed)?.label ||
    `${replay.playbackSpeed / 1000}s`;

  const totalCandles = allCandles.length;
  const currentIndex = replay.currentIndex;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center select-none shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-xl text-tv-text text-sm shadow-xl">
        {/* Cut / Jump tool */}
        <button
          onClick={startReplaySelection}
          title="Выбрать новую точку среза на графике"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            replay.isSelectingCutPoint
              ? 'bg-tv-blue text-white'
              : 'hover:bg-tv-surfaceHover text-tv-text hover:text-white'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Срез</span>
        </button>

        <div className="w-[1px] h-5 bg-[#2a2e39] mx-1" />

        {/* Step Backward */}
        <button
          onClick={stepBackward}
          disabled={currentIndex <= 0}
          title="Отмотать на 1 свечу назад (Стрелка влево ←)"
          className="p-1.5 rounded-lg hover:bg-tv-surfaceHover hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          title={replay.isPlaying ? 'Пауза (Пробел)' : 'Воспроизведение (Пробел)'}
          className={`p-2 rounded-lg transition-all ${
            replay.isPlaying
              ? 'bg-tv-blue text-white hover:bg-tv-blueHover shadow-md shadow-tv-blue/20'
              : 'bg-[#2a2e39] hover:bg-[#363a45] text-white'
          }`}
        >
          {replay.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        {/* Step Forward */}
        <button
          onClick={stepForward}
          disabled={currentIndex >= totalCandles - 1}
          title="Шаг на 1 свечу вперед (Стрелка вправо →)"
          className="p-1.5 rounded-lg hover:bg-tv-surfaceHover hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-[#2a2e39] mx-1" />

        {/* Speed Selector */}
        <div className="relative">
          <button
            onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-tv-surfaceHover text-xs text-tv-text hover:text-white transition-colors"
            title="Скорость воспроизведения свечей"
          >
            <Gauge className="w-3.5 h-3.5 text-tv-textMuted" />
            <span>{replay.playbackSpeed / 1000}s</span>
            <ChevronDown className="w-3 h-3 text-tv-textMuted" />
          </button>

          {isSpeedMenuOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-48 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl py-1 z-30">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-tv-textMuted uppercase tracking-wider">
                Скорость симулятора
              </div>
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPlaybackSpeed(opt.value);
                    setIsSpeedMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                    replay.playbackSpeed === opt.value
                      ? 'bg-tv-blue/20 text-tv-blue font-medium'
                      : 'hover:bg-tv-surfaceHover text-tv-text hover:text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  {replay.playbackSpeed === opt.value && <Sparkles className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-5 bg-[#2a2e39] mx-1" />

        {/* Current Replay Timestamp */}
        {currentCandle && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#131722]/80 border border-[#2a2e39] rounded-lg text-xs font-mono text-tv-text">
            <Clock className="w-3 h-3 text-tv-textMuted" />
            <span>{formatDateTime(currentCandle.time)}</span>
            <span className="text-[10px] text-tv-textMuted border-l border-[#2a2e39] pl-1.5 ml-0.5">
              {currentIndex + 1} / {totalCandles}
            </span>
          </div>
        )}

        {/* Exit Replay Button */}
        <button
          onClick={exitReplay}
          title="Выйти из симулятора и вернуться к полному графику"
          className="p-1.5 ml-1 rounded-lg hover:bg-tv-red/20 text-tv-textMuted hover:text-tv-red transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrub timeline slider below toolbar */}
      <div className="w-full max-w-md mt-1.5 px-3 py-1 bg-[#1e222d]/80 backdrop-blur-sm border border-[#2a2e39]/60 rounded-lg flex items-center gap-2">
        <span className="text-[10px] font-mono text-tv-textMuted">0</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, totalCandles - 1)}
          value={currentIndex}
          onChange={(e) => scrubToIndex(Number(e.target.value))}
          className="w-full h-1 bg-[#2a2e39] rounded-lg appearance-none cursor-pointer accent-tv-blue"
        />
        <span className="text-[10px] font-mono text-tv-textMuted">{totalCandles}</span>
      </div>
    </div>
  );
};
