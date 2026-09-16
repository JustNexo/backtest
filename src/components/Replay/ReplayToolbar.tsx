import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Scissors,
  X,
  ChevronDown,
  Gauge,
  GripVertical,
  SlidersHorizontal,
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { formatDateTime } from '../../utils/formatters';

const SPEED_OPTIONS = [
  { label: '0.1s / бар (10x)', value: 100 },
  { label: '0.25s / бар (4x)', value: 250 },
  { label: '0.5s / бар (2x)', value: 500 },
  { label: '1.0s / бар (1x)', value: 1000 },
  { label: '2.0s / бар (0.5x)', value: 2000 },
  { label: '3.0s / бар (0.3x)', value: 3000 },
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
    const initialX = typeof window !== 'undefined' ? Math.max(20, (window.innerWidth - 440) / 2) : 200;
    const initialY = typeof window !== 'undefined' ? Math.max(60, window.innerHeight - 130) : 600;
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
      const width = toolbarRef.current?.offsetWidth || 440;
      const height = toolbarRef.current?.offsetHeight || 40;

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
      className="fixed z-40 flex flex-col items-center select-none shadow-2xl transition-shadow animate-in fade-in duration-150 font-sans"
    >
      {/* Sleek Floating Capsule Remote */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181b24]/95 backdrop-blur-xl border border-white/[0.08] rounded-full text-[#d1d4dc] text-xs shadow-2xl">
        {/* Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          title="Зажмите для перемещения"
          className="cursor-grab active:cursor-grabbing p-1 text-[#787b86] hover:text-white rounded transition-colors"
        >
          <GripVertical className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
        </div>

        {/* Cut / Jump tool */}
        <button
          onClick={startReplaySelection}
          title="Срез (Горячая клавиша R)"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            replay.isSelectingCutPoint
              ? 'bg-[#2962ff] text-white shadow-sm'
              : 'hover:bg-[#242731] text-[#d1d4dc] hover:text-white'
          }`}
        >
          <Scissors className="w-3 h-3 text-[#2962ff]" />
          <span>Срез</span>
        </button>

        <div className="w-[1px] h-3.5 bg-[#242731] mx-0.5" />

        {/* Step Backward */}
        <button
          onClick={stepBackward}
          disabled={currentIndex <= 0}
          title="Шаг назад (←)"
          className="p-1 rounded-full hover:bg-[#242731] text-[#787b86] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          title={replay.isPlaying ? 'Пауза (Пробел)' : 'Воспроизведение (Пробел)'}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            replay.isPlaying
              ? 'bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30'
              : 'bg-[#242731] hover:bg-[#2e3240] text-white'
          }`}
        >
          {replay.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
        </button>

        {/* Step Forward */}
        <button
          onClick={stepForward}
          disabled={currentIndex >= totalCandles - 1}
          title="Шаг вперед (→)"
          className="p-1 rounded-full hover:bg-[#242731] text-[#787b86] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-[#242731] mx-0.5" />

        {/* Speed Selector */}
        <div className="relative">
          <button
            onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-[#242731] text-xs text-[#787b86] hover:text-white transition-colors cursor-pointer font-mono"
            title="Скорость симулятора"
          >
            <Gauge className="w-3 h-3" />
            <span>{replay.playbackSpeed / 1000}s</span>
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {isSpeedMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-36 bg-[#181b24] border border-[#2a2e39] rounded-lg shadow-2xl py-1 z-50">
              <div className="px-2.5 py-1 text-[9px] font-semibold text-[#787b86] uppercase tracking-wider border-b border-[#242731]">
                Скорость
              </div>
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPlaybackSpeed(opt.value);
                    setIsSpeedMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1 text-xs transition-colors cursor-pointer ${
                    replay.playbackSpeed === opt.value
                      ? 'bg-[#2962ff]/20 text-[#2962ff] font-medium'
                      : 'hover:bg-[#242731] text-[#d1d4dc] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current Candle Timestamp Display */}
        {currentCandle && (
          <div className="px-2 py-0.5 text-[11px] font-mono tabular-nums text-[#d1d4dc] border-l border-[#242731] hidden sm:block">
            {formatDateTime(currentCandle.time, timezone)}
          </div>
        )}

        {/* Toggle Scrubber */}
        <button
          onClick={() => setShowScrubber(!showScrubber)}
          title="Шкала перемотки"
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            showScrubber ? 'text-[#2962ff] bg-[#242731]' : 'text-[#787b86] hover:text-white hover:bg-[#242731]'
          }`}
        >
          <SlidersHorizontal className="w-3 h-3" />
        </button>

        {/* Exit Replay */}
        <button
          onClick={exitReplay}
          title="Выйти из режима симулятора"
          className="p-1 rounded-full text-[#787b86] hover:text-[#f23645] hover:bg-[#f23645]/10 transition-colors cursor-pointer ml-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expandable Minimal Scrubber Bar */}
      {showScrubber && totalCandles > 1 && (
        <div className="mt-1.5 w-full px-3 py-1.5 bg-[#181b24]/95 backdrop-blur-xl border border-white/[0.08] rounded-full shadow-2xl flex items-center gap-2 text-[10px] font-mono text-[#787b86]">
          <span>0</span>
          <input
            type="range"
            min={0}
            max={totalCandles - 1}
            value={currentIndex}
            onChange={(e) => scrubToIndex(Number(e.target.value))}
            className="flex-1 h-1 bg-[#242731] rounded-lg appearance-none cursor-pointer accent-[#2962ff]"
          />
          <span>{totalCandles}</span>
        </div>
      )}
    </div>
  );
};
