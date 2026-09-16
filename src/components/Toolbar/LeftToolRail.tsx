import React from 'react';
import {
  MousePointer2,
  TrendingUp,
  Minus,
  Square,
  ArrowUpRight,
  ArrowDownRight,
  Ruler,
  Trash2,
  Magnet,
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { DrawingTool } from '../../types/chart';

const RayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5" cy="19" r="2" fill="currentColor" />
    <line x1="7" y1="17" x2="20" y2="4" />
    <polyline points="14 4 20 4 20 10" />
  </svg>
);

export const LeftToolRail: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    clearDrawings,
    drawings,
    magnetMode,
    toggleMagnetMode,
    updateOrderSetup,
  } = useChart();

  const handleToolClick = (toolId: DrawingTool) => {
    if (toolId === 'position_long') {
      updateOrderSetup({ side: 'long', enabled: true });
      setActiveTool('cursor');
      return;
    }

    if (toolId === 'position_short') {
      updateOrderSetup({ side: 'short', enabled: true });
      setActiveTool('cursor');
      return;
    }

    setActiveTool(activeTool === toolId ? 'cursor' : toolId);
  };

  const tools: Array<{ id: DrawingTool; label: string; icon: React.ReactNode }> = [
    { id: 'cursor', label: 'Перекрестие (Crosshair)', icon: <MousePointer2 className="w-3.5 h-3.5" /> },
    { id: 'trendline', label: 'Трендовая линия (Отрезок)', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'ray', label: 'Луч (Ray)', icon: <RayIcon className="w-3.5 h-3.5" /> },
    { id: 'horizontal', label: 'Горизонтальный уровень', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: 'rectangle', label: 'Прямоугольник (Зона ликвидности)', icon: <Square className="w-3.5 h-3.5" /> },
    { id: 'position_long', label: 'Long R:R позиция', icon: <ArrowUpRight className="w-3.5 h-3.5 text-[#089981]" /> },
    { id: 'position_short', label: 'Short R:R позиция', icon: <ArrowDownRight className="w-3.5 h-3.5 text-[#f23645]" /> },
    { id: 'measure', label: 'Линейка / Измерение', icon: <Ruler className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside className="w-10 bg-[#131722] border-r border-[#242731] flex flex-col items-center py-2 shrink-0 select-none z-10 justify-between font-sans">
      <div className="flex flex-col items-center gap-1">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleToolClick(t.id)}
              title={t.label}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#2962ff] text-white shadow-sm'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              {t.icon}
            </button>
          );
        })}

        <div className="w-5 h-[1px] bg-[#242731] my-1" />

        {/* Magnet Tool */}
        <button
          onClick={toggleMagnetMode}
          title={
            magnetMode
              ? 'Магнит: ВКЛ (привязка к свечам). [Удерживайте Ctrl]'
              : 'Магнит: ВЫКЛ. [Удерживайте Ctrl]'
          }
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors relative cursor-pointer ${
            magnetMode
              ? 'bg-[#242731] text-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          {magnetMode && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#2962ff]" />
          )}
        </button>
      </div>

      {/* Delete / Clear drawings button */}
      {drawings.length > 0 && (
        <button
          onClick={clearDrawings}
          title="Удалить все объекты разметки"
          className="w-7 h-7 flex items-center justify-center rounded text-[#787b86] hover:text-[#f23645] hover:bg-[#f23645]/10 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </aside>
  );
};
