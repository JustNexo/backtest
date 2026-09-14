import React, { useState, useRef, useEffect } from 'react';
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
  GripVertical,
  SlidersHorizontal,
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
    timezone,
  } = useChart();

  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [showScrubber, setShowScrubber] = useState(false);

  // Draggable floating position
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem('tv_replay_toolbar_pos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    // Default position: centered near the bottom of chart
    const initialX = typeof window !== 'undefined' ? Math.max(20, (window.innerWidth - 480) / 2) : 200;
    const initialY = typeof window !== 'undefined' ? Math.max(60, window.innerHeight - 150) : 600;
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pos.x,
      initY: pos.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const width = toolbarRef.current?.offsetWidth || 460;
      const height = toolbarRef.current?.offsetHeight || 44;

      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, dragRef.current.initX + dx));
      const newY = Math.max(50, Math.min(window.innerHeight - height - 10, dragRef.current.initY + dy));

      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('tv_replay_toolbar_pos', JSON.stringify(pos));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, pos]);

  if (!replay.isActive && !replay.isSelectingCutPoint) {
    return null;
  }

  const totalCandles = allCandles.length;
  const currentIndex = replay.currentIndex;

  return (
    <div
      ref={toolbarRef}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      className="fixed z-40 flex flex-col items-center select-none shadow-2xl transition-shadow animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Main Single-Row Floating Bar */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] hover:border-[#363a45] rounded-xl text-tv-text text-xs shadow-2xl">
        {/* Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          title="Зажмите и тяните, чтобы переместить панель в любое место экрана"
          className="cursor-grab active:cursor-grabbing p-1 text-tv-textMuted hover:text-white rounded transition-colors group"
        >
          <GripVertical className="w-4 h-4 opacity-70 group-hover:opacity-100" />
        </div>

        {/* Cut / Jump tool */}
        <button
          onClick={startReplaySelection}
          title="Выбрать новую точку среза на графике (Горячая клавиша R)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            replay.isSelectingCutPoint
              ? 'bg-tv-blue text-white shadow-sm'
              : 'hover:bg-tv-surfaceHover text-tv-text hover:text-white'
          }`}
        >
          <Scissors className="w-3.5 h-3.5 text-tv-yellow" />
          <span>Срез</span>
        </button>

        <div className="w-[1px] h-4 bg-[#2a2e39] mx-0.5" />

        {/* Step Backward */}
        <button
          onClick={stepBackward}
          disabled={currentIndex <= 0}
          title="Отмотать на 1 свечу назад (Стрелка влево ←)"
          className="p-1.5 rounded-lg hover:bg-tv-surfaceHover text-tv-text hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          title={replay.isPlaying ? 'Пауза (Пробел)' : 'Воспроизведение (Пробел)'}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            replay.isPlaying
              ? 'bg-tv-blue text-white hover:bg-tv-blueHover shadow-md shadow-tv-blue/30'
              : 'bg-[#2a2e39] hover:bg-[#363a45] text-white'
          }`}
        >
          {replay.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        {/* Step Forward */}
        <button
          onClick={stepForward}
          disabled={currentIndex >= totalCandles - 1}
          title="Шаг на 1 свечу вперед (Стрелка вправо →)"
          className="p-1.5 rounded-lg hover:bg-tv-surfaceHover text-tv-text hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-[#2a2e39] mx-0.5" />

        {/* Speed Selector */}
        <div className="relative">
          <button
            onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-tv-surfaceHover text-xs text-tv-text hover:text-white transition-colors cursor-pointer font-mono"
            title="Скорость воспроизведения свечей"
          >
            <Gauge className="w-3.5 h-3.5 text-tv-textMuted" />
            <span>{replay.playbackSpeed / 1000}s</span>
            <ChevronDown className="w-3 h-3 text-tv-textMuted" />
          </button>

          {isSpeedMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-44 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in duration-100">
              <div className="px-3 py-1 text-[10px] font-semibold text-tv-textMuted uppercase tracking-wider border-b border-[#2a2e39]">
                Скорость симулятора
              </div>
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPlaybackSpeed(opt.value);
                    setIsSpeedMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    replay.playbackSpeed === opt.value
                      ? 'bg-tv-blue/20 text-tv-blue font-semibold'
                      : 'hover:bg-tv-surfaceHover text-tv-text hover:text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-[#2a2e39] mx-0.5" />

        {/* Current Replay Timestamp */}
        {currentCandle && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#131722] border border-[#2a2e39] rounded-md text-[11px] font-mono text-tv-text">
            <Clock className="w-3 h-3 text-tv-textMuted" />
            <span>{formatDateTime(currentCandle.time, timezone)}</span>
            <span className="text-[10px] text-tv-textMuted border-l border-[#2a2e39] pl-1 ml-0.5 hidden sm:inline">
              {currentIndex + 1}/{totalCandles}
            </span>
          </div>
        )}

        {/* Toggle Timeline Scrubber */}
        <button
          onClick={() => setShowScrubber(!showScrubber)}
          title="Показать/скрыть ползунок перемотки"
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showScrubber
              ? 'bg-tv-blue/20 text-tv-blue'
              : 'hover:bg-tv-surfaceHover text-tv-textMuted hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Exit Replay Button */}
        <button
          onClick={exitReplay}
          title="Выйти из симулятора (Esc)"
          className="p-1.5 rounded-lg hover:bg-tv-red/20 text-tv-textMuted hover:text-tv-red transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Optional Slim Scrub Slider (toggled via button, does NOT permanently clutter screen) */}
      {showScrubber && (
        <div className="w-full mt-1.5 px-3 py-1.5 bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-xl flex items-center gap-2 shadow-xl animate-in fade-in duration-100">
          <span className="text-[10px] font-mono text-tv-textMuted">1</span>
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
      )}
    </div>
  );
};
