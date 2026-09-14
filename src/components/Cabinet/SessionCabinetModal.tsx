import React, { useState } from 'react';
import { useChart } from '../../context/ChartContext';
import { SupportedSymbol, SUPPORTED_SYMBOLS, DEFAULT_PROP_FIRM_PRESETS, PropFirmPreset, BacktestSession } from '../../types/session';
import { formatCurrency, formatDateTime, formatPercent, formatPrice } from '../../utils/formatters';
import {
  X,
  Plus,
  Briefcase,
  Calendar,
  Shield,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Trash2,
  Download,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface SessionCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CabinetTab = 'active' | 'create' | 'all' | 'journal';

export const SessionCabinetModal: React.FC<SessionCabinetModalProps> = ({ isOpen, onClose }) => {
  const {
    symbol,
    balance,
    initialBalance,
    sessions,
    activeSession,
    createSession,
    loadSession,
    resetSession,
    deleteSession,
    propFirmEvaluation,
    propFirmRules,
    closedTrades,
    timezone,
    replay,
  } = useChart();

  const [activeTab, setActiveTab] = useState<CabinetTab>('active');

  // Form state for creating a new session
  const [newSessionName, setNewSessionName] = useState('Бэктест 2024');
  const [newSymbol, setNewSymbol] = useState<SupportedSymbol>('BTCUSDT.P');
  const [newStartDate, setNewStartDate] = useState('2024-01-01T00:00');
  const [newEndDate, setNewEndDate] = useState('2024-06-01T23:59');
  const [hasEndDate, setHasEndDate] = useState(true);
  const [newCapital, setNewCapital] = useState<number>(100000);
  const [customCapitalInput, setCustomCapitalInput] = useState('');
  const [enablePropFirm, setEnablePropFirm] = useState(true);
  const [propPreset, setPropPreset] = useState<PropFirmPreset>('funding_pips');
  const [customDailyLoss, setCustomDailyLoss] = useState(5);
  const [customMaxLoss, setCustomMaxLoss] = useState(10);
  const [customProfitTarget, setCustomProfitTarget] = useState(8);

  if (!isOpen) return null;

  // Preset Date range helpers
  const handleApplyDatePreset = (presetKey: '2024_full' | '2024_q1' | '2024_summer' | '2023_full' | 'recent_60d') => {
    switch (presetKey) {
      case '2024_full':
        setNewStartDate('2024-01-01T00:00');
        setNewEndDate('2024-12-31T23:59');
        setHasEndDate(true);
        setNewSessionName(`${newSymbol.replace('.P', '')} - Весь 2024 год`);
        break;
      case '2024_q1':
        setNewStartDate('2024-01-01T00:00');
        setNewEndDate('2024-03-31T23:59');
        setHasEndDate(true);
        setNewSessionName(`${newSymbol.replace('.P', '')} - 2024 Q1 (ETF Ралли)`);
        break;
      case '2024_summer':
        setNewStartDate('2024-06-01T00:00');
        setNewEndDate('2024-10-31T23:59');
        setHasEndDate(true);
        setNewSessionName(`${newSymbol.replace('.P', '')} - 2024 Лето-Осень`);
        break;
      case '2023_full':
        setNewStartDate('2023-01-01T00:00');
        setNewEndDate('2023-12-31T23:59');
        setHasEndDate(true);
        setNewSessionName(`${newSymbol.replace('.P', '')} - Весь 2023 год`);
        break;
      case 'recent_60d': {
        const now = new Date();
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400 * 1000);
        setNewStartDate(sixtyDaysAgo.toISOString().slice(0, 16));
        setHasEndDate(false);
        setNewSessionName(`${newSymbol.replace('.P', '')} - Последние 60 дней`);
        break;
      }
    }
  };

  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTs = Math.floor(new Date(newStartDate).getTime() / 1000);
    const endTs = hasEndDate ? Math.floor(new Date(newEndDate).getTime() / 1000) : null;

    if (isNaN(startTs)) {
      alert('Пожалуйста, укажите корректную дату начала');
      return;
    }

    let rules = {
      enabled: enablePropFirm,
      preset: propPreset,
      presetName: DEFAULT_PROP_FIRM_PRESETS[propPreset].presetName,
      dailyLossLimitPercent: DEFAULT_PROP_FIRM_PRESETS[propPreset].dailyLossLimitPercent,
      overallLossLimitPercent: DEFAULT_PROP_FIRM_PRESETS[propPreset].overallLossLimitPercent,
      profitTargetPercent: DEFAULT_PROP_FIRM_PRESETS[propPreset].profitTargetPercent,
      dailyCalculationBasis: DEFAULT_PROP_FIRM_PRESETS[propPreset].dailyCalculationBasis,
    };

    if (propPreset === 'custom') {
      rules = {
        ...rules,
        dailyLossLimitPercent: customDailyLoss,
        overallLossLimitPercent: customMaxLoss,
        profitTargetPercent: customProfitTarget,
      };
    }

    await createSession({
      name: newSessionName || `Сессия ${newSymbol}`,
      symbol: newSymbol,
      startDate: startTs,
      endDate: endTs,
      initialBalance: newCapital,
      propFirm: rules,
    });

    setActiveTab('active');
    onClose();
  };

  // Export CSV
  const handleExportTrades = () => {
    if (closedTrades.length === 0) return;
    const headers = ['ID', 'Side', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', 'Size', 'Gross PnL', 'Net PnL', 'Reason'];
    const rows = closedTrades.map(t => [
      t.id,
      t.side.toUpperCase(),
      new Date(t.entryTime * 1000).toISOString(),
      new Date(t.exitTime * 1000).toISOString(),
      t.entryPrice,
      t.exitPrice,
      t.size,
      t.grossPnl,
      t.netPnl,
      t.closeReason,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `session_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-[#d1d4dc]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2e39] flex items-center justify-between bg-[#181b24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-tv-blue/20 border border-tv-blue/30 flex items-center justify-center text-tv-blue shadow-inner">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Личный кабинет бэктестера
                <span className="text-[10px] bg-tv-blue/20 text-tv-blue px-2 py-0.5 rounded-full border border-tv-blue/30 uppercase font-mono">
                  FX Replay Mode
                </span>
              </h2>
              <p className="text-xs text-tv-textMuted">
                Управление сессиями, симуляция проп-фирм и календарь дат
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-tv-textMuted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#2a2e39] bg-[#181b24]/50">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'active'
                ? 'border-tv-blue text-white'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Активная сессия</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'create'
                ? 'border-tv-blue text-white'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Создать сессию</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'all'
                ? 'border-tv-blue text-white'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Все сессии ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'journal'
                ? 'border-tv-blue text-white'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Журнал сделок ({closedTrades.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: ACTIVE SESSION & CHALLENGE DASHBOARD                               */}
          {/* ========================================================================= */}
          {activeTab === 'active' && (
            <div className="space-y-6">
              {/* Session Summary Header Card */}
              <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">
                      {activeSession?.name || 'Основная сессия'}
                    </span>
                    <span className="px-2 py-0.5 bg-tv-blue/20 text-tv-blue border border-tv-blue/30 rounded font-mono font-bold text-xs">
                      {symbol}
                    </span>
                  </div>
                  <div className="text-xs text-tv-textMuted mt-1 flex items-center gap-3">
                    {activeSession ? (
                      <>
                        <span>Начало: {formatDateTime(activeSession.startDate, timezone)}</span>
                        {activeSession.endDate && (
                          <span>Конец: {formatDateTime(activeSession.endDate, timezone)}</span>
                        )}
                      </>
                    ) : (
                      <span>Свободная торговля без ограничений по датам</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeSession && (
                    <button
                      onClick={() => resetSession(activeSession.id)}
                      className="px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363a45] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Сбросить баланс и сделки к начальной точке"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Сбросить сессию</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-tv-blue hover:bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-tv-blue/25"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>К графику</span>
                  </button>
                </div>
              </div>

              {/* Financial Balance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl">
                  <span className="text-xs text-tv-textMuted">Стартовый капитал</span>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    ${formatCurrency(initialBalance, 2)}
                  </div>
                </div>

                <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl">
                  <span className="text-xs text-tv-textMuted">Текущий баланс</span>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    ${formatCurrency(balance, 2)}
                  </div>
                </div>

                <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl">
                  <span className="text-xs text-tv-textMuted">Чистая прибыль (PnL)</span>
                  <div
                    className={`text-xl font-bold font-mono mt-1 ${
                      balance >= initialBalance ? 'text-tv-green' : 'text-tv-red'
                    }`}
                  >
                    {balance >= initialBalance ? '+' : ''}
                    ${formatCurrency(balance - initialBalance, 2)} (
                    {formatPercent(((balance - initialBalance) / (initialBalance || 1)) * 100)})
                  </div>
                </div>
              </div>

              {/* Prop Firm Simulation Audit */}
              {propFirmRules.enabled ? (
                <div className="p-5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-tv-blue" />
                      <span className="font-bold text-white text-sm">
                        Правила проп-фирмы: {propFirmRules.presetName}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {propFirmEvaluation.status === 'passed' && (
                        <span className="px-3 py-1 bg-tv-green/20 text-tv-green border border-tv-green/40 rounded-lg text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ЧЕЛЛЕНДЖ УСПЕШНО СДАН! 🎉</span>
                        </span>
                      )}
                      {propFirmEvaluation.status === 'daily_breach' && (
                        <span className="px-3 py-1 bg-tv-red/20 text-tv-red border border-tv-red/40 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
                          <AlertTriangle className="w-4 h-4" />
                          <span>НАРУШЕН ДНЕВНОЙ ЛИМИТ! (FAILED)</span>
                        </span>
                      )}
                      {propFirmEvaluation.status === 'overall_breach' && (
                        <span className="px-3 py-1 bg-tv-red/20 text-tv-red border border-tv-red/40 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-pulse">
                          <AlertTriangle className="w-4 h-4" />
                          <span>НАРУШЕН ОБЩИЙ ЛИМИТ! (FAILED)</span>
                        </span>
                      )}
                      {propFirmEvaluation.status === 'in_progress' && (
                        <span className="px-3 py-1 bg-tv-blue/20 text-tv-blue border border-tv-blue/40 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                          <Shield className="w-4 h-4" />
                          <span>ЧЕЛЛЕНДЖ В ПРОЦЕССЕ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {propFirmEvaluation.breachReason && (
                    <div className="p-3 bg-tv-red/10 border border-tv-red/30 rounded-lg text-xs text-tv-red font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{propFirmEvaluation.breachReason}</span>
                    </div>
                  )}

                  {/* 3 Progress Bars */}
                  <div className="space-y-3 pt-2 font-mono text-xs">
                    {/* Daily Drawdown */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-tv-textMuted">Дневной лимит потерь ({propFirmRules.dailyLossLimitPercent}%):</span>
                        <span className={propFirmEvaluation.isDailyBreached ? 'text-tv-red font-bold' : 'text-white'}>
                          -${formatCurrency(propFirmEvaluation.dailyLossUsd, 2)} / -${formatCurrency(propFirmEvaluation.dailyLimitUsd, 2)} (осталось ${formatCurrency(Math.max(0, propFirmEvaluation.dailyLimitUsd - propFirmEvaluation.dailyLossUsd), 2)})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#2a2e39] rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(100, (propFirmEvaluation.dailyLossUsd / (propFirmEvaluation.dailyLimitUsd || 1)) * 100)}%`,
                          }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            propFirmEvaluation.isDailyBreached
                              ? 'bg-tv-red'
                              : propFirmEvaluation.dailyLossUsd > propFirmEvaluation.dailyLimitUsd * 0.7
                              ? 'bg-tv-yellow'
                              : 'bg-[#089981]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Overall Max Drawdown */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-tv-textMuted">Максимальная просадка ({propFirmRules.overallLossLimitPercent}%):</span>
                        <span className={propFirmEvaluation.isOverallBreached ? 'text-tv-red font-bold' : 'text-white'}>
                          -${formatCurrency(propFirmEvaluation.overallDrawdownUsd, 2)} / -${formatCurrency(propFirmEvaluation.overallLimitUsd, 2)} (осталось ${formatCurrency(Math.max(0, propFirmEvaluation.overallLimitUsd - propFirmEvaluation.overallDrawdownUsd), 2)})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#2a2e39] rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(100, (propFirmEvaluation.overallDrawdownUsd / (propFirmEvaluation.overallLimitUsd || 1)) * 100)}%`,
                          }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            propFirmEvaluation.isOverallBreached
                              ? 'bg-tv-red'
                              : propFirmEvaluation.overallDrawdownUsd > propFirmEvaluation.overallLimitUsd * 0.7
                              ? 'bg-tv-yellow'
                              : 'bg-[#089981]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Profit Target */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-tv-textMuted">Цель по прибыли ({propFirmRules.profitTargetPercent}%):</span>
                        <span className={propFirmEvaluation.isTargetPassed ? 'text-tv-green font-bold' : 'text-white'}>
                          +${formatCurrency(Math.max(0, propFirmEvaluation.currentProfitUsd), 2)} / +${formatCurrency(propFirmEvaluation.profitTargetUsd, 2)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#2a2e39] rounded-full overflow-hidden">
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, (propFirmEvaluation.currentProfitUsd / (propFirmEvaluation.profitTargetUsd || 1)) * 100))}%`,
                          }}
                          className="h-full bg-tv-green rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-tv-textMuted" />
                    <span>Симуляция проп-фирмы выключена для текущей сессии</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="text-tv-blue hover:underline font-semibold"
                  >
                    Создать сессию с правилами пропа →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CREATE NEW SESSION (FX REPLAY WIZARD)                              */}
          {/* ========================================================================= */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSessionSubmit} className="space-y-6">
              {/* 1. Name */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Название сессии бэктеста
                </label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Например: Тест пробоев ETH 2024"
                  className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-none focus:border-tv-blue"
                  required
                />
              </div>

              {/* 2. Symbol Selection */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Выберите торговый актив
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(SUPPORTED_SYMBOLS) as SupportedSymbol[]).map((s) => {
                    const info = SUPPORTED_SYMBOLS[s];
                    const isSelected = newSymbol === s;
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => {
                          setNewSymbol(s);
                          setNewSessionName(`${info.name} - 2024`);
                        }}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                          isSelected
                            ? 'bg-tv-blue/15 border-tv-blue ring-1 ring-tv-blue/30 shadow-md'
                            : 'bg-[#131722] border-[#2a2e39] hover:bg-[#1a1f2c]'
                        }`}
                      >
                        <div
                          style={{ backgroundColor: info.color }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold text-sm shadow-sm"
                        >
                          {info.icon}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white">{info.symbol}</div>
                          <div className="text-[11px] text-tv-textMuted">{info.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Date Range (FX Replay style: from date/year to date/year) */}
              <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-tv-blue" />
                    <span>Диапазон дат для тестирования (как на FX Replay)</span>
                  </label>

                  {/* Date Range Presets */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('2024_full')}
                      className="px-2 py-0.5 bg-[#1e222d] hover:bg-tv-surfaceHover text-tv-text rounded transition-colors"
                    >
                      Весь 2024
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('2024_q1')}
                      className="px-2 py-0.5 bg-[#1e222d] hover:bg-tv-surfaceHover text-tv-text rounded transition-colors"
                    >
                      2024 Q1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('2023_full')}
                      className="px-2 py-0.5 bg-[#1e222d] hover:bg-tv-surfaceHover text-tv-text rounded transition-colors"
                    >
                      Весь 2023
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[11px] text-tv-textMuted block mb-1">
                      С какого числа и года тестировать:
                    </span>
                    <input
                      type="datetime-local"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white focus:outline-none focus:border-tv-blue font-mono"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-tv-textMuted">
                        По какое число тестировать:
                      </span>
                      <label className="flex items-center gap-1.5 text-[10px] text-tv-textMuted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!hasEndDate}
                          onChange={(e) => setHasEndDate(!e.target.checked)}
                          className="rounded border-[#2a2e39] text-tv-blue"
                        />
                        <span>Без ограничения</span>
                      </label>
                    </div>

                    {hasEndDate ? (
                      <input
                        type="datetime-local"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white focus:outline-none focus:border-tv-blue font-mono"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-[#1e222d]/50 border border-[#2a2e39] rounded-lg text-xs text-tv-textMuted italic">
                        До упора (открытая дата)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Capital Selection */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Стартовый баланс счета ($ USD)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {[5000, 10000, 25000, 50000, 100000, 200000].map((cap) => (
                    <button
                      type="button"
                      key={cap}
                      onClick={() => setNewCapital(cap)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        newCapital === cap
                          ? 'bg-tv-blue text-white shadow-sm'
                          : 'bg-[#131722] border border-[#2a2e39] text-tv-text hover:text-white'
                      }`}
                    >
                      ${formatCurrency(cap, 0)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Prop Firm Rules Simulation */}
              <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enablePropFirm}
                      onChange={(e) => setEnablePropFirm(e.target.checked)}
                      className="w-4 h-4 rounded text-tv-blue border-[#2a2e39] bg-[#1e222d]"
                    />
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-tv-blue" />
                      <span>Симуляция челленджа проп-фирмы (Prop Firm Simulator)</span>
                    </span>
                  </label>
                </div>

                {enablePropFirm && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['funding_pips', 'ftmo', 'funded_next', 'custom'] as PropFirmPreset[]).map((p) => {
                        const presetInfo = DEFAULT_PROP_FIRM_PRESETS[p];
                        const isSelected = propPreset === p;
                        return (
                          <button
                            type="button"
                            key={p}
                            onClick={() => setPropPreset(p)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-tv-blue/20 border-tv-blue ring-1 ring-tv-blue/40 text-white'
                                : 'bg-[#1e222d] border-[#2a2e39] text-tv-text hover:bg-[#252936]'
                            }`}
                          >
                            <div className="text-xs font-bold capitalize">
                              {p.replace('_', ' ')}
                            </div>
                            <div className="text-[10px] text-tv-textMuted mt-1">
                              {p === 'custom'
                                ? 'Свои настройки'
                                : `${presetInfo.dailyLossLimitPercent}% день / ${presetInfo.overallLossLimitPercent}% макс`}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {propPreset === 'custom' && (
                      <div className="grid grid-cols-3 gap-3 p-3 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs">
                        <div>
                          <span className="text-tv-textMuted block mb-1">Дневной лимит (%):</span>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={customDailyLoss}
                            onChange={(e) => setCustomDailyLoss(Number(e.target.value))}
                            className="w-full px-2 py-1 bg-[#131722] border border-[#2a2e39] rounded text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-tv-textMuted block mb-1">Макс. просадка (%):</span>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={customMaxLoss}
                            onChange={(e) => setCustomMaxLoss(Number(e.target.value))}
                            className="w-full px-2 py-1 bg-[#131722] border border-[#2a2e39] rounded text-white font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-tv-textMuted block mb-1">Цель профита (%):</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={customProfitTarget}
                            onChange={(e) => setCustomProfitTarget(Number(e.target.value))}
                            className="w-full px-2 py-1 bg-[#131722] border border-[#2a2e39] rounded text-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-tv-blue hover:bg-blue-600 text-white font-bold text-sm rounded-xl shadow-xl shadow-tv-blue/25 flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Запустить сессию бэктеста</span>
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ALL SESSIONS (ARCHIVE)                                             */}
          {/* ========================================================================= */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-tv-textMuted bg-[#131722] border border-[#2a2e39] rounded-xl">
                  <span>У вас пока нет сохраненных сессий. Создайте новую во вкладке «Создать сессию».</span>
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = sess.id === activeSession?.id;
                  return (
                    <div
                      key={sess.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-tv-blue/10 border-tv-blue shadow-md'
                          : 'bg-[#131722] border-[#2a2e39] hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{sess.name}</span>
                          <span className="px-2 py-0.2 bg-[#2a2e39] text-tv-yellow font-mono text-[11px] rounded font-bold">
                            {sess.symbol}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.2 bg-tv-blue text-white text-[10px] rounded font-semibold uppercase">
                              Активна
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-tv-textMuted mt-1 flex items-center gap-4 font-mono">
                          <span>Баланс: ${formatCurrency(sess.currentBalance, 0)}</span>
                          <span>Сделок: {sess.trades.length}</span>
                          <span>Период: {new Date(sess.startDate * 1000).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <button
                            onClick={() => {
                              loadSession(sess.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-tv-blue hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Открыть</span>
                          </button>
                        )}
                        <button
                          onClick={() => resetSession(sess.id)}
                          title="Сбросить сессию"
                          className="p-1.5 bg-[#2a2e39] hover:bg-[#363a45] text-tv-text hover:text-white rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSession(sess.id)}
                          title="Удалить сессию"
                          className="p-1.5 bg-tv-red/10 hover:bg-tv-red/20 text-tv-red rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: TRADES JOURNAL                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'journal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-tv-textMuted font-mono">
                  Всего сделок в сессии: {closedTrades.length}
                </span>
                {closedTrades.length > 0 && (
                  <button
                    onClick={handleExportTrades}
                    className="px-3 py-1 bg-[#2a2e39] hover:bg-[#363a45] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Экспорт в CSV</span>
                  </button>
                )}
              </div>

              {closedTrades.length === 0 ? (
                <div className="p-8 text-center text-tv-textMuted bg-[#131722] border border-[#2a2e39] rounded-xl text-xs">
                  Сделок в этой сессии пока нет. Совершите сделку на графике или через торговую панель.
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#2a2e39] rounded-xl">
                  <table className="w-full text-xs font-mono text-left">
                    <thead className="bg-[#181b24] text-tv-textMuted border-b border-[#2a2e39]">
                      <tr>
                        <th className="p-2.5">Тип</th>
                        <th className="p-2.5">Объем</th>
                        <th className="p-2.5">Вход</th>
                        <th className="p-2.5">Выход</th>
                        <th className="p-2.5">Чистый PnL</th>
                        <th className="p-2.5">Доход %</th>
                        <th className="p-2.5">Причина</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39] bg-[#131722]">
                      {closedTrades.map((t) => {
                        const isWin = t.netPnl >= 0;
                        return (
                          <tr key={t.id} className="hover:bg-white/5">
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.side === 'long'
                                    ? 'bg-tv-green/20 text-tv-green'
                                    : 'bg-tv-red/20 text-tv-red'
                                }`}
                              >
                                {t.side.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2.5">{t.size}</td>
                            <td className="p-2.5">${formatPrice(t.entryPrice)}</td>
                            <td className="p-2.5">${formatPrice(t.exitPrice)}</td>
                            <td className={`p-2.5 font-bold ${isWin ? 'text-tv-green' : 'text-tv-red'}`}>
                              {isWin ? '+' : ''}${formatCurrency(t.netPnl, 2)}
                            </td>
                            <td className={`p-2.5 ${isWin ? 'text-tv-green' : 'text-tv-red'}`}>
                              {formatPercent(t.returnPercent)}
                            </td>
                            <td className="p-2.5 text-tv-textMuted uppercase text-[10px]">
                              {t.closeReason.replace('_', ' ')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
