import React, { useState, useMemo } from 'react';
import { useChart } from '../../context/ChartContext';
import { EconomicNewsEvent } from '../../types/news';
import { generateEconomicEvents, filterNewsEvents } from '../../services/newsService';
import { formatDateTime } from '../../utils/formatters';
import { AlertCircle, Calendar, ChevronRight, Info, TrendingUp, X } from 'lucide-react';

interface NewsLayerProps {
  timeToCoordinate: (time: number) => number | null;
  chartWidth: number;
}

export const NewsLayer: React.FC<NewsLayerProps> = ({ timeToCoordinate, chartWidth }) => {
  const { visibleCandles, newsFilter, timezone, symbolInfo } = useChart();
  const [selectedEvent, setSelectedEvent] = useState<EconomicNewsEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<EconomicNewsEvent | null>(null);

  // Generate news events within visible range
  const visibleEvents = useMemo(() => {
    if (!newsFilter.enabled || !visibleCandles || visibleCandles.length === 0) return [];

    const firstTime = visibleCandles[0].time;
    const lastTime = visibleCandles[visibleCandles.length - 1].time;

    // Pad range by 1 day
    const all = generateEconomicEvents(firstTime - 86400, lastTime + 86400);
    const filtered = filterNewsEvents(all, newsFilter, symbolInfo.quoteAsset);

    return filtered.map((ev) => {
      const x = timeToCoordinate(ev.timestamp);
      return {
        event: ev,
        x,
      };
    }).filter((item): item is { event: EconomicNewsEvent; x: number } => item.x !== null && item.x >= 0 && item.x <= chartWidth);
  }, [visibleCandles, newsFilter, symbolInfo, timeToCoordinate, chartWidth]);

  if (!newsFilter.enabled || visibleEvents.length === 0) {
    return null;
  }

  const activeCard = selectedEvent || hoveredEvent;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* Markers along bottom axis */}
      <div className="absolute bottom-6 left-0 right-14 h-7 pointer-events-auto flex items-center">
        {visibleEvents.map(({ event, x }) => {
          const isHigh = event.importance === 'high';
          const isMedium = event.importance === 'medium';
          const badgeColor = isHigh ? 'bg-[#f23645]' : isMedium ? 'bg-[#f7a600]' : 'bg-[#2962ff]';

          return (
            <div
              key={event.id}
              style={{ left: `${x}px` }}
              className="absolute -translate-x-1/2 bottom-0.5 group cursor-pointer"
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(selectedEvent?.id === event.id ? null : event);
              }}
            >
              {/* Sleek Minimal News Pin */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e222d] border border-[#2a2e39] hover:border-white/40 shadow-md transition-all hover:scale-105">
                <span className={`w-1.5 h-1.5 rounded-full ${badgeColor} animate-pulse`} />
                <span className="text-[9px] font-bold font-mono text-[#d1d4dc] uppercase">
                  {event.country}
                </span>
              </div>

              {/* Vertical guideline on hover */}
              {(hoveredEvent?.id === event.id || selectedEvent?.id === event.id) && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[1px] h-[300px] pointer-events-none border-l border-dashed border-white/25" />
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Detailed Popover Card */}
      {activeCard && (
        <div
          className="absolute bottom-16 pointer-events-auto bg-[#181b24] border border-[#2a2e39] rounded-lg shadow-2xl p-3 w-72 text-xs font-sans text-[#d1d4dc] z-30"
          style={{
            left: `${Math.max(20, Math.min(chartWidth - 300, (timeToCoordinate(activeCard.timestamp) || 100) - 140))}px`,
          }}
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#242731]">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeCard.importance === 'high'
                      ? 'bg-[#f23645]'
                      : activeCard.importance === 'medium'
                      ? 'bg-[#f7a600]'
                      : 'bg-[#2962ff]'
                  }`}
                />
                <span className="font-bold text-[10px] font-mono px-1 py-0.2 bg-[#222734] rounded text-white uppercase">
                  {activeCard.country}
                </span>
                <span className="text-[10px] text-[#787b86] font-mono">
                  {formatDateTime(activeCard.timestamp, timezone)}
                </span>
              </div>
              <h4 className="font-semibold text-white text-xs leading-snug">{activeCard.title}</h4>
            </div>

            {selectedEvent && (
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[#787b86] hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Macro numbers grid */}
          <div className="grid grid-cols-3 gap-1 py-2 text-center font-mono text-[11px] border-b border-[#242731]">
            <div className="bg-[#131722] py-1 rounded">
              <div className="text-[9px] text-[#787b86] uppercase">Факт</div>
              <div
                className={`font-bold ${
                  activeCard.impact === 'positive'
                    ? 'text-[#089981]'
                    : activeCard.impact === 'negative'
                    ? 'text-[#f23645]'
                    : 'text-white'
                }`}
              >
                {activeCard.actual || '—'}
              </div>
            </div>
            <div className="bg-[#131722] py-1 rounded">
              <div className="text-[9px] text-[#787b86] uppercase">Прогноз</div>
              <div className="text-white font-medium">{activeCard.forecast || '—'}</div>
            </div>
            <div className="bg-[#131722] py-1 rounded">
              <div className="text-[9px] text-[#787b86] uppercase">Пред.</div>
              <div className="text-[#787b86]">{activeCard.previous || '—'}</div>
            </div>
          </div>

          {activeCard.description && (
            <p className="text-[10px] text-[#868993] leading-relaxed pt-2">
              {activeCard.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
