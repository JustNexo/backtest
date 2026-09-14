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
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { DrawingTool } from '../../types/chart';
import { getTimeframeSeconds } from '../../utils/formatters';

export const LeftToolRail: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    clearDrawings,
    drawings,
    addDrawing,
    selectedDrawingId,
    setSelectedDrawingId,
    currentCandle,
    visibleCandles,
    timeframe,
    updateOrderSetup,
    getViewportCenter,
  } = useChart();

  const handleToolClick = (toolId: DrawingTool) => {
    if (toolId === 'cursor') {
      setActiveTool('cursor');
      return;
    }

    const center = getViewportCenter();
    const cur = center || (currentCandle ? { time: currentCandle.time, price: currentCandle.close } : null) || (visibleCandles.length > 0 ? { time: visibleCandles[visibleCandles.length - 1].time, price: visibleCandles[visibleCandles.length - 1].close } : null);

    if (toolId === 'rectangle') {
      if (cur) {
        const pMid = cur.price;
        const pHigh = Math.round(pMid * 1.008 * 10) / 10;
        const pLow = Math.round(pMid * 0.992 * 10) / 10;
        const tfSec = getTimeframeSeconds(timeframe);
        const tStart = cur.time - tfSec * 10;
        const tEnd = cur.time + tfSec * 10;
        const newId = `rect_${Date.now()}`;
        addDrawing({
          id: newId,
          type: 'rectangle',
          points: [
            { time: tStart, price: pHigh },
            { time: tEnd, price: pLow },
          ],
          color: '#2962ff',
          fillColor: 'rgba(41, 98, 255, 0.22)',
          fillOpacity: 0.22,
          lineWidth: 2,
          lineStyle: 'solid',
        });
        setSelectedDrawingId(newId);
        setActiveTool('cursor');
      } else {
        setActiveTool('rectangle');
      }
      return;
    }

    if (toolId === 'horizontal') {
      if (cur) {
        const newId = `horz_${Date.now()}`;
        addDrawing({
          id: newId,
          type: 'horizontal',
          points: [{ time: cur.time, price: cur.price }],
          color: '#f7a600',
          lineWidth: 2,
        });
        setSelectedDrawingId(newId);
        setActiveTool('cursor');
      } else {
        setActiveTool('horizontal');
      }
      return;
    }

    if (toolId === 'trendline') {
      if (cur) {
        const tfSec = getTimeframeSeconds(timeframe);
        const newId = `trendline_${Date.now()}`;
        addDrawing({
          id: newId,
          type: 'trendline',
          points: [
            { time: cur.time - tfSec * 10, price: Math.round(cur.price * 0.995 * 10) / 10 },
            { time: cur.time + tfSec * 10, price: Math.round(cur.price * 1.005 * 10) / 10 },
          ],
          color: '#089981',
          lineWidth: 2,
        });
        setSelectedDrawingId(newId);
        setActiveTool('cursor');
      } else {
        setActiveTool('trendline');
      }
      return;
    }

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

    setActiveTool(toolId);
  };

  const tools: Array<{ id: DrawingTool; label: string; icon: React.ReactNode }> = [
    { id: 'cursor', label: 'Перекрестие (Crosshair)', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'rectangle', label: 'Добавить прямоугольник (Зона ликвидности / Order Block)', icon: <Square className="w-4 h-4" /> },
    { id: 'trendline', label: 'Добавить трендовую линию', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'horizontal', label: 'Добавить горизонтальный уровень', icon: <Minus className="w-4 h-4" /> },
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
