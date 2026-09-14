import React from 'react';
import { useChart } from '../../context/ChartContext';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, Briefcase } from 'lucide-react';

interface PropFirmHUDProps {
  onOpenCabinet: () => void;
}

export const PropFirmHUD: React.FC<PropFirmHUDProps> = ({ onOpenCabinet }) => {
  const {
    activeSession,
    balance,
    initialBalance,
    propFirmEvaluation,
    propFirmRules,
    symbol,
  } = useChart();

  if (!propFirmRules.enabled && !activeSession) {
    return null;
  }

  const {
    dailyLossUsd,
    dailyLossPercent,
    dailyLimitUsd,
    isDailyBreached,
    overallDrawdownUsd,
    overallDrawdownPercent,
    overallLimitUsd,
    isOverallBreached,
    currentProfitUsd,
    currentProfitPercent,
    profitTargetUsd,
    isTargetPassed,
    status,
  } = propFirmEvaluation;

  // Daily meter percentage (0 to 100)
  const dailyUsedRatio = dailyLimitUsd > 0 ? Math.min(100, (dailyLossUsd / dailyLimitUsd) * 100) : 0;
  // Overall meter percentage (0 to 100)
  const overallUsedRatio = overallLimitUsd > 0 ? Math.min(100, (overallDrawdownUsd / overallLimitUsd) * 100) : 0;
  // Target completed percentage (0 to 100)
  const targetCompletedRatio = profitTargetUsd > 0 ? Math.min(100, Math.max(0, (currentProfitUsd / profitTargetUsd) * 100)) : 0;

  return (
    <div className="h-9 bg-[#181b24] border-b border-[#2a2e39] px-3 flex items-center justify-between text-xs select-none z-10 shrink-0">
      {/* Left: Session Info & Prop Firm Preset */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCabinet}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-[#2a2e39] hover:bg-[#363a45] text-white rounded text-[11px] font-medium transition-colors"
          title="Открыть Личный Кабинет трекера сессий"
        >
          <Briefcase className="w-3.5 h-3.5 text-tv-blue" />
          <span className="font-semibold">{activeSession?.name || 'Сессия бэктеста'}</span>
          <span className="text-[10px] text-tv-yellow font-mono font-bold px-1 bg-black/30 rounded">
            {symbol}
          </span>
        </button>

        {propFirmRules.enabled && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-tv-textMuted font-mono">
            <span className="px-1.5 py-0.2 bg-tv-blue/20 text-tv-blue border border-tv-blue/30 rounded uppercase font-semibold text-[10px]">
              {propFirmRules.preset.replace('_', ' ')}
            </span>
            <span>Депо: ${formatCurrency(initialBalance, 0)}</span>
          </div>
        )}
      </div>

      {/* Center: Prop Firm Progress Bars */}
      {propFirmRules.enabled && (
        <div className="flex items-center gap-4 lg:gap-6 font-mono text-[11px]">
          {/* Daily Drawdown Meter */}
          <div className="flex items-center gap-2">
            <span className="text-tv-textMuted hidden md:inline">День:</span>
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[10px]">
                <span className={dailyUsedRatio > 70 ? 'text-tv-red font-bold' : 'text-tv-text'}>
                  -${formatCurrency(dailyLossUsd, 0)} / -${formatCurrency(dailyLimitUsd, 0)}
                </span>
              </div>
              <div className="w-20 lg:w-28 h-1.5 bg-[#2a2e39] rounded-full overflow-hidden">
                <div
                  style={{ width: `${dailyUsedRatio}%` }}
                  className={`h-full transition-all duration-300 rounded-full ${
                    dailyUsedRatio > 80
                      ? 'bg-tv-red'
                      : dailyUsedRatio > 50
                      ? 'bg-tv-yellow'
                      : 'bg-[#089981]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Overall Max Drawdown Meter */}
          <div className="flex items-center gap-2">
            <span className="text-tv-textMuted hidden md:inline">Макс DD:</span>
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[10px]">
                <span className={overallUsedRatio > 70 ? 'text-tv-red font-bold' : 'text-tv-text'}>
                  -${formatCurrency(overallDrawdownUsd, 0)} / -${formatCurrency(overallLimitUsd, 0)}
                </span>
              </div>
              <div className="w-20 lg:w-28 h-1.5 bg-[#2a2e39] rounded-full overflow-hidden">
                <div
                  style={{ width: `${overallUsedRatio}%` }}
                  className={`h-full transition-all duration-300 rounded-full ${
                    overallUsedRatio > 80
                      ? 'bg-tv-red'
                      : overallUsedRatio > 50
                      ? 'bg-tv-yellow'
                      : 'bg-[#089981]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Profit Target Meter */}
          <div className="flex items-center gap-2">
            <span className="text-tv-textMuted hidden md:inline">Цель:</span>
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[10px]">
                <span className={currentProfitUsd >= profitTargetUsd ? 'text-tv-green font-bold' : 'text-tv-text'}>
                  +${formatCurrency(Math.max(0, currentProfitUsd), 0)} / +${formatCurrency(profitTargetUsd, 0)}
                </span>
              </div>
              <div className="w-20 lg:w-28 h-1.5 bg-[#2a2e39] rounded-full overflow-hidden">
                <div
                  style={{ width: `${targetCompletedRatio}%` }}
                  className="h-full bg-tv-green transition-all duration-300 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right: Challenge Status Badge */}
      <div className="flex items-center gap-2">
        {status === 'passed' && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-tv-green/20 text-tv-green border border-tv-green/40 rounded text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>ПРОЙДЕН 🎉</span>
          </span>
        )}
        {status === 'daily_breach' && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-tv-red/20 text-tv-red border border-tv-red/40 rounded text-[11px] font-bold animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span>ДНЕВНОЙ ЛИМИТ!</span>
          </span>
        )}
        {status === 'overall_breach' && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-tv-red/20 text-tv-red border border-tv-red/40 rounded text-[11px] font-bold animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span>ОБЩИЙ ЛИМИТ!</span>
          </span>
        )}
        {status === 'in_progress' && propFirmRules.enabled && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-tv-blue/20 text-tv-blue border border-tv-blue/40 rounded text-[11px] font-medium">
            <Shield className="w-3 h-3" />
            <span>АКТИВЕН</span>
          </span>
        )}

        <button
          onClick={onOpenCabinet}
          className="text-tv-textMuted hover:text-white text-[11px] underline underline-offset-2 ml-1"
        >
          Кабинет →
        </button>
      </div>
    </div>
  );
};
