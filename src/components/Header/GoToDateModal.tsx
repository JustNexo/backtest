import React, { useState } from 'react';
import { X, Calendar, ArrowRight } from 'lucide-react';
import { useChart } from '../../context/ChartContext';

interface GoToDateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HISTORICAL_PRESETS = [
  { label: '2019 Пре-пандемия', ts: Math.floor(Date.UTC(2019, 2, 15, 12, 0) / 1000) },
  { label: '2020 Covid Crash', ts: Math.floor(Date.UTC(2020, 2, 12, 12, 0) / 1000) },
  { label: '2021 Bull Market ATH', ts: Math.floor(Date.UTC(2021, 10, 10, 12, 0) / 1000) },
  { label: '2022 Bear Market', ts: Math.floor(Date.UTC(2022, 5, 15, 12, 0) / 1000) },
  { label: '2023 Восстановление', ts: Math.floor(Date.UTC(2023, 0, 15, 12, 0) / 1000) },
  { label: '2024 ETF Ралли', ts: Math.floor(Date.UTC(2024, 0, 15, 12, 0) / 1000) },
];

export const GoToDateModal: React.FC<GoToDateModalProps> = ({ isOpen, onClose }) => {
  const { jumpToTimestamp } = useChart();

  const [selectedDate, setSelectedDate] = useState(() => {
    return '2024-01-01T12:00';
  });

  if (!isOpen) return null;

  const handleJump = async () => {
    const target = new Date(selectedDate);
    if (isNaN(target.getTime())) return;
    const ts = Math.floor(target.getTime() / 1000);
    await jumpToTimestamp(ts);
    onClose();
  };

  const handlePresetJump = async (ts: number) => {
    await jumpToTimestamp(ts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-md bg-[#181b24] border border-[#242731] rounded-lg shadow-2xl p-5 text-[#d1d4dc] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#242731]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2962ff]" />
            <h3 className="font-semibold text-white text-sm">Перейти к дате (2019—2026)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#787b86] hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick historical presets */}
        <div>
          <label className="text-[11px] font-medium text-[#787b86] block mb-2">
            Исторические периоды:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {HISTORICAL_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePresetJump(p.ts)}
                className="px-2.5 py-1.5 bg-[#141720] hover:bg-[#242731] border border-[#242731] rounded text-left text-xs font-mono text-[#d1d4dc] hover:text-white transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom datetime picker */}
        <div className="space-y-1.5 pt-2 border-t border-[#242731]">
          <label className="text-[11px] font-medium text-[#787b86] block">
            Точная дата и время:
          </label>
          <input
            type="datetime-local"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#141720] border border-[#242731] focus:border-[#2962ff] rounded text-xs text-white font-mono outline-none"
          />
        </div>

        <div className="pt-2 border-t border-[#242731] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#787b86] hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleJump}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-medium rounded transition-colors shadow-sm cursor-pointer"
          >
            <span>Перейти к срезу</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
