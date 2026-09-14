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
    <circle cx="5" cy="19" r="2.5" fill="currentColor" />
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

    // Toggle tool or activate tool
    setActiveTool(activeTool === toolId ? 'cursor' : toolId);
  };

  const tools: Array<{ id: DrawingTool; label: string; icon: React.ReactNode }> = [
    { id: 'cursor', label: 'Перекрестие (Crosshair)', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'trendline', label: 'Трендовая линия (Отрезок: начало и конец)', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'ray', label: 'Луч (Начало и направление / бесконечный луч)', icon: <RayIcon className="w-4 h-4" /> },
    { id: 'horizontal', label: 'Горизонтальный уровень', icon: <Minus className="w-4 h-4" /> },
    { id: 'rectangle', label: 'Прямоугольник (Зона ликвидности / Order Block)', icon: <Square className="w-4 h-4" /> },
    { id: 'position_long', label: 'Длинная позиция (Long R:R)', icon: <ArrowUpRight className="w-4 h-4 text-tv-green" /> },
    { id: 'position_short', label: 'Короткая позиция (Short R:R)', icon: <ArrowDownRight className="w-4 h-4 text-tv-red" /> },
    { id: 'measure', label: 'Линейка / Измерение', icon: <Ruler className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-11 bg-[#131722] border-r border-[#2a2e39] flex flex-col items-center py-2 shrink-0 select-none z-10 justify-between">
      <div className="flex flex-col items-center gap-1">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => handleToolClick(t.id)}
            title={t.label}
            className={`p-2 rounded-lg transition-colors ${
              activeTool === t.id
                ? 'bg-tv-blue text-white shadow-sm'
                : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
            }`}
          >
            {t.icon}
          </button>
        ))}

        <div className="w-6 h-[1px] bg-[#2a2e39] my-1" />

        {/* Magnet Tool Button */}
        <button
          onClick={toggleMagnetMode}
          title={
            magnetMode
              ? 'Магнит: ВКЛ (привязка к High/Low/Open/Close свечей). Нажмите для выключения [или удерживайте Ctrl]'
              : 'Магнит: ВЫКЛ. Нажмите для включения привязки линий к свечам [или удерживайте Ctrl]'
          }
          className={`p-2 rounded-lg transition-all relative ${
            magnetMode
              ? 'bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 ring-1 ring-white/30'
              : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
          }`}
        >
          <Magnet className="w-4 h-4" />
          {magnetMode && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#089981] ring-2 ring-[#131722]" />
          )}
        </button>
      </div>

      {/* Delete / Clear drawings button */}
      {drawings.length > 0 && (
        <button
          onClick={clearDrawings}
          title="Удалить все объекты разметки"
          className="p-2 rounded-lg text-tv-textMuted hover:text-tv-red hover:bg-tv-red/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </aside>
  );
};
