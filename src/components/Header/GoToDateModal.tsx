import React, { useState } from 'react';
import { X, Calendar, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { useChart } from '../../context/ChartContext';

interface GoToDateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoToDateModal: React.FC<GoToDateModalProps> = ({ isOpen, onClose }) => {
  const { jumpToTimestamp } = useChart();

  // Default to 6 months ago formatted for datetime-local
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 16);
  });

  if (!isOpen) return null;

  const handleJump = async () => {
    const target = new Date(selectedDate);
    if (isNaN(target.getTime())) return;
    const ts = Math.floor(target.getTime() / 1000);
    await jumpToTimestamp(ts);
    onClose();
  };

  const handleQuickJump = async (monthsAgo: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    const ts = Math.floor(d.getTime() / 1000);
    await jumpToTimestamp(ts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#1e222d] border border-[#2a2e39] rounded-2xl shadow-2xl p-6 text-tv-text space-y-5">
        <div className="flex items-center justify-between border-b border-[#2a2e39] pb-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-tv-blue" />
            <h3 className="font-semibold text-white text-base">Перейти к дате (История 2+ года)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-tv-surfaceHover text-tv-textMuted hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick jump presets */}
        <div>
          <label className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider block mb-2">
            Быстрый переход назад
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickJump(1)}
              className="p-2.5 bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] rounded-xl text-xs text-white font-medium transition-colors flex items-center justify-between"
            >
              <span>1 месяц назад</span>
              <Sparkles className="w-3.5 h-3.5 text-tv-blue" />
            </button>
            <button
              onClick={() => handleQuickJump(3)}
              className="p-2.5 bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] rounded-xl text-xs text-white font-medium transition-colors flex items-center justify-between"
            >
              <span>3 месяца назад</span>
              <Sparkles className="w-3.5 h-3.5 text-tv-blue" />
            </button>
            <button
              onClick={() => handleQuickJump(12)}
              className="p-2.5 bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] rounded-xl text-xs text-white font-medium transition-colors flex items-center justify-between"
            >
              <span>1 год назад</span>
              <Sparkles className="w-3.5 h-3.5 text-tv-yellow" />
            </button>
            <button
              onClick={() => handleQuickJump(24)}
              className="p-2.5 bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] rounded-xl text-xs text-white font-medium transition-colors flex items-center justify-between"
            >
              <span>2 года назад (2024/2023)</span>
              <Sparkles className="w-3.5 h-3.5 text-tv-green" />
            </button>
          </div>
        </div>

        {/* Custom datetime picker */}
        <div className="space-y-2 pt-2 border-t border-[#2a2e39]">
          <label className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider block">
            Точная дата и время
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-none focus:border-tv-blue font-mono"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#2a2e39] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover rounded-xl transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleJump}
            className="flex items-center gap-2 px-5 py-2 bg-tv-blue hover:bg-tv-blueHover text-white text-xs font-semibold rounded-xl shadow-lg shadow-tv-blue/25 transition-all"
          >
            <span>Перейти к срезу</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
