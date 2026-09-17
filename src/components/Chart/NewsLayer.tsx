import React, { useState, useMemo, useCallback } from 'react';
import { IChartApi } from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { EconomicNewsEvent } from '../../types/news';
import { generateEconomicEvents, filterNewsEvents } from '../../services/newsService';
import { formatDateTime } from '../../utils/formatters';
import { Zap, X, AlertCircle } from 'lucide-react';

interface NewsLayerProps {
  chart: IChartApi | null;
  chartWidth: number;
}

function getTimeframeSeconds(tf: string): number {
  switch (tf) {
    case '1m': return 60;
    case '3m': return 180;
    case '5m': return 300;
    case '15m': return 900;
    case '30m': return 1800;
    case '1h': return 3600;
    case '2h': return 7200;
    case '4h': return 14400;
    case '1d': return 86400;
    case '1w': return 604800;
    default: return 300;
  }
}

export const NewsLayer: React.FC<NewsLayerProps> = ({ chart, chartWidth }) => {
  const { visibleCandles, newsFilter, timezone, symbolInfo, timeframe } = useChart();
  const [selectedEvent, setSelectedEvent] = useState<EconomicNewsEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<EconomicNewsEvent | null>(null);

  // Robust coordinate resolution for any timestamp across any timeframe
  const getEventCoordinate = useCallback(
    (timestamp: number): number | null => {
      if (!chart) return null;

      // 1. Direct match if exact candle exists
      const directX = chart.timeScale().timeToCoordinate(timestamp as any);
      if (directX !== null) return Number(directX);

      if (!visibleCandles || visibleCandles.length === 0) return null;
      const first = visibleCandles[0];
      const last = visibleCandles[visibleCandles.length - 1];

      // 2. If within visible candle range: find bounding candles and interpolate
      if (timestamp >= first.time && timestamp <= last.time) {
        let low = 0;
        let high = visibleCandles.length - 1;
        while (low <= high) {
          const mid = (low + high) >> 1;
          if (visibleCandles[mid].time < timestamp) {
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }
        const rightIdx = Math.min(visibleCandles.length - 1, Math.max(0, low));
        const leftIdx = Math.max(0, rightIdx - 1);
        const cLeft = visibleCandles[leftIdx];
        const cRight = visibleCandles[rightIdx];

        const xLeft = chart.timeScale().timeToCoordinate(cLeft.time as any);
        const xRight = chart.timeScale().timeToCoordinate(cRight.time as any);

        if (xLeft !== null && xRight !== null && cRight.time > cLeft.time) {
          const ratio = (timestamp - cLeft.time) / (cRight.time - cLeft.time);
          return Number(xLeft) + (Number(xRight) - Number(xLeft)) * ratio;
        } else if (xLeft !== null) {
          return Number(xLeft);
        } else if (xRight !== null) {
          return Number(xRight);
        }
      } else if (timestamp > last.time) {
        // 3. Future timestamp: extrapolate forward
        const xLast = chart.timeScale().timeToCoordinate(last.time as any);
        const tfSec = getTimeframeSeconds(timeframe);
        if (visibleCandles.length > 1 && xLast !== null) {
          const prev = visibleCandles[visibleCandles.length - 2];
          const xPrev = chart.timeScale().timeToCoordinate(prev.time as any);
          if (xPrev !== null) {
            const barWidth = Number(xLast) - Number(xPrev);
            const barsAhead = (timestamp - last.time) / tfSec;
            return Number(xLast) + barWidth * barsAhead;
          }
        }
      }
      return null;
    },
    [chart, visibleCandles, timeframe]
  );

  // Generate and filter news events within visible time range
  const visibleEvents = useMemo(() => {
    if (!newsFilter.enabled || !visibleCandles || visibleCandles.length === 0) return [];

    const firstTime = visibleCandles[0].time;
    const lastTime = visibleCandles[visibleCandles.length - 1].time;

    // Pad range by 3 days before and after
    const all = generateEconomicEvents(firstTime - 259200, lastTime + 259200);
    const filtered = filterNewsEvents(all, newsFilter, symbolInfo.quoteAsset);

    return filtered
      .map((ev) => {
        const x = getEventCoordinate(ev.timestamp);
        return {
          event: ev,
          x,
        };
      })
      .filter((item): item is { event: EconomicNewsEvent; x: number } => item.x !== null && item.x >= 0 && item.x <= chartWidth - 50);
  }, [visibleCandles, newsFilter, symbolInfo, getEventCoordinate, chartWidth]);

  if (!newsFilter.enabled || visibleEvents.length === 0) {
    return null;
  }

  const activeCard = selectedEvent || hoveredEvent;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* Markers along bottom axis (TradingView Lightning Pins) */}
      <div className="absolute bottom-6 left-0 right-14 h-7 pointer-events-auto flex items-center">
        {visibleEvents.map(({ event, x }) => {
          const isHigh = event.importance === 'high';
          const isMedium = event.importance === 'medium';
          const importanceDot = isHigh ? 'bg-[#f23645]' : isMedium ? 'bg-[#f7a600]' : 'bg-[#2962ff]';
          const isSelected = selectedEvent?.id === event.id;
          const isHovered = hoveredEvent?.id === event.id;

          return (
            <div
              key={event.id}
              style={{ left: `${x}px` }}
              className="absolute -translate-x-1/2 bottom-0 group cursor-pointer"
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(selectedEvent?.id === event.id ? null : event);
              }}
            >
              {/* TradingView-Style Round News Badge */}
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all duration-150 ${
                  isSelected || isHovered
                    ? 'bg-[#ab47bc] border-white text-white shadow-lg scale-110 -translate-y-0.5'
                    : 'bg-[#1e222d]/95 hover:bg-[#2a2e39] border-[#ab47bc]/60 text-[#d1d4dc] shadow-md'
                }`}
                title={`${event.country} - ${event.title}`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#ab47bc] flex items-center justify-center text-white shrink-0">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                </div>
                <span className="text-[10px] font-bold font-mono uppercase">
                  {event.country}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${importanceDot} shrink-0`} />
              </div>

              {/* Vertical guideline on hover / selection */}
              {(isHovered || isSelected) && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[1px] h-[340px] pointer-events-none border-l border-dashed border-[#ab47bc]/60" />
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Detailed Popover Card */}
      {activeCard && (
        <div
          className="absolute bottom-16 pointer-events-auto bg-[#181b24] border border-[#2a2e39] rounded-xl shadow-2xl p-3.5 w-76 text-xs font-sans text-[#d1d4dc] z-30 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.max(16, Math.min(chartWidth - 320, (getEventCoordinate(activeCard.timestamp) || 100) - 150))}px`,
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
                <span className="font-bold text-[10px] font-mono px-1.5 py-0.5 bg-[#ab47bc]/20 text-[#ab47bc] rounded uppercase">
                  {activeCard.country} • {activeCard.importance.toUpperCase()}
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
                className="text-[#787b86] hover:text-white p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Macro numbers grid */}
          <div className="grid grid-cols-3 gap-1.5 py-2.5 text-center font-mono text-[11px] border-b border-[#242731]">
            <div className="bg-[#131722] py-1.5 rounded-lg border border-white/[0.04]">
              <div className="text-[9px] text-[#787b86] uppercase font-sans">Факт</div>
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
            <div className="bg-[#131722] py-1.5 rounded-lg border border-white/[0.04]">
              <div className="text-[9px] text-[#787b86] uppercase font-sans">Прогноз</div>
              <div className="text-white font-medium">{activeCard.forecast || '—'}</div>
            </div>
            <div className="bg-[#131722] py-1.5 rounded-lg border border-white/[0.04]">
              <div className="text-[9px] text-[#787b86] uppercase font-sans">Пред.</div>
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

