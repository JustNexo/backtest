import React, { useState } from 'react';
import { useChart } from '../../context/ChartContext';
import {
  SupportedSymbol,
  SUPPORTED_SYMBOLS,
  DEFAULT_PROP_FIRM_PRESETS,
  PropFirmPreset,
  PropFirmRuleSettings,
  BacktestSession,
} from '../../types/session';
import { formatCurrency, formatDateTime, formatPercent, formatPrice } from '../../utils/formatters';
import {
  Layers,
  PlusCircle,
  BarChart3,
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
  LineChart,
  Target,
  DollarSign,
  Briefcase,
  ChevronRight,
  Sliders,
  Award,
  Check,
  Percent,
} from 'lucide-react';

type CabinetNavTab = 'sessions' | 'create' | 'analytics';

export const CabinetPage: React.FC = () => {
  const {
    symbol,
    balance,
    initialBalance,
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    loadSession,
    resetSession,
    deleteSession,
    propFirmEvaluation,
    propFirmRules,
    closedTrades,
    timezone,
    setCurrentView,
  } = useChart();

  const [activeTab, setActiveTab] = useState<CabinetNavTab>('sessions');

  // Form state for creating a new session
  const [newSessionName, setNewSessionName] = useState('BTC 2024 Бэктест');
  const [newSymbol, setNewSymbol] = useState<SupportedSymbol>('BTCUSDT.P');
  const [newStartDate, setNewStartDate] = useState('2024-01-01T00:00');
  const [newEndDate, setNewEndDate] = useState('2024-12-31T23:59');
  const [hasEndDate, setHasEndDate] = useState(true);
  const [newCapital, setNewCapital] = useState<number>(100000);
  const [customCapitalInput, setCustomCapitalInput] = useState('');
  const [enablePropFirm, setEnablePropFirm] = useState(true);
  const [propPreset, setPropPreset] = useState<PropFirmPreset>('funding_pips');
  const [customDailyLoss, setCustomDailyLoss] = useState(5);
  const [customMaxLoss, setCustomMaxLoss] = useState(10);
  const [customProfitTarget, setCustomProfitTarget] = useState(8);

  // Date range presets helper
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

    let rules: PropFirmRuleSettings = {
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
        enabled: enablePropFirm,
        preset: 'custom',
        presetName: 'Собственные правила',
        dailyLossLimitPercent: customDailyLoss,
        overallLossLimitPercent: customMaxLoss,
        profitTargetPercent: customProfitTarget,
        dailyCalculationBasis: 'balance',
      };
    }

    const effectiveCapital = customCapitalInput ? parseFloat(customCapitalInput) || newCapital : newCapital;

    await createSession({
      name: newSessionName.trim() || `${newSymbol} Бэктест`,
      symbol: newSymbol,
      startDate: startTs,
      endDate: endTs,
      initialBalance: effectiveCapital,
      propFirm: rules,
    });
  };

  // CSV Export
  const handleExportCsv = () => {
    if (closedTrades.length === 0) return;
    const headers = ['ID', 'Side', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', 'Size', 'Gross PnL', 'Fees', 'Swap', 'Net PnL', 'Return %', 'Reason'];
    const rows = closedTrades.map((t) => [
      t.id,
      t.side.toUpperCase(),
      new Date(t.entryTime * 1000).toISOString(),
      new Date(t.exitTime * 1000).toISOString(),
      t.entryPrice,
      t.exitPrice,
      t.size,
      t.grossPnl,
      (t.feeOpen + t.feeClose).toFixed(2),
      t.swapFee,
      t.netPnl,
      t.returnPercent,
      t.closeReason,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trades_session_${activeSession?.name || 'export'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI calculations
  const totalTradesCount = closedTrades.length;
  const winningTrades = closedTrades.filter((t) => t.netPnl > 0);
  const winRate = totalTradesCount > 0 ? (winningTrades.length / totalTradesCount) * 100 : 0;
  const totalNetPnl = balance - initialBalance;
  const totalReturnPercent = initialBalance > 0 ? (totalNetPnl / initialBalance) * 100 : 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722] text-[#d1d4dc] select-none overflow-hidden font-sans">
      {/* Top Professional Navigation Header */}
      <header className="h-14 bg-[#181b24] border-b border-[#2a2e39] px-6 flex items-center justify-between shrink-0 z-20">
        {/* Brand & Tabs */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-tv-blue flex items-center justify-center font-bold text-white shadow-md">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-wide flex items-center gap-2">
                <span>FX REPLAY</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-tv-blue/20 text-tv-blue rounded font-semibold border border-tv-blue/30">
                  Dashboard
                </span>
              </div>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-[#2a2e39]" />

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'sessions'
                  ? 'bg-[#2a2e39] text-white shadow-sm font-semibold'
                  : 'text-tv-textMuted hover:text-white hover:bg-[#1e222d]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-tv-blue" />
              <span>Мои сессии</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-black/40 text-tv-textMuted rounded-full font-mono">
                {sessions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-[#2a2e39] text-white shadow-sm font-semibold'
                  : 'text-tv-textMuted hover:text-white hover:bg-[#1e222d]'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#089981]" />
              <span>Создать сессию</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#2a2e39] text-white shadow-sm font-semibold'
                  : 'text-tv-textMuted hover:text-white hover:bg-[#1e222d]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#f7a600]" />
              <span>Журнал & Аналитика</span>
            </button>
          </nav>
        </div>

        {/* Right: Active Session indicator & Return to Chart Button */}
        <div className="flex items-center gap-4">
          {activeSession && (
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#089981] animate-pulse" />
              <span className="text-tv-textMuted">Активна:</span>
              <span className="text-white font-semibold">{activeSession.name}</span>
              <span className="text-tv-yellow font-bold">({activeSession.symbol})</span>
            </div>
          )}

          <button
            onClick={() => setCurrentView('chart')}
            className="flex items-center gap-2 px-4 py-2 bg-tv-blue hover:bg-tv-blueHover text-white rounded-lg text-xs font-semibold shadow-md shadow-tv-blue/25 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <LineChart className="w-4 h-4" />
            <span>Перейти к графику</span>
          </button>
        </div>
      </header>

      {/* Main Spacious Content Body */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {/* ========================================================================= */}
        {/* TAB 1: SESSIONS LIST & OVERVIEW                                           */}
        {/* ========================================================================= */}
        {activeTab === 'sessions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top KPI Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-[#1e222d] border border-[#2a2e39] rounded-xl">
                <div className="flex items-center justify-between text-xs text-tv-textMuted mb-1">
                  <span>Торговый баланс</span>
                  <DollarSign className="w-4 h-4 text-tv-blue" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {formatCurrency(balance, 2)}
                </div>
                <div className="text-[11px] text-tv-textMuted mt-1">
                  Депозит: {formatCurrency(initialBalance, 0)}
                </div>
              </div>

              <div className="p-4 bg-[#1e222d] border border-[#2a2e39] rounded-xl">
                <div className="flex items-center justify-between text-xs text-tv-textMuted mb-1">
                  <span>Чистый PnL</span>
                  <TrendingUp className={`w-4 h-4 ${totalNetPnl >= 0 ? 'text-[#089981]' : 'text-tv-red'}`} />
                </div>
                <div className={`text-2xl font-bold font-mono ${totalNetPnl >= 0 ? 'text-[#089981]' : 'text-tv-red'}`}>
                  {formatCurrency(totalNetPnl, 2, { showPlus: true })}
                </div>
                <div className={`text-[11px] font-mono mt-1 ${totalNetPnl >= 0 ? 'text-[#089981]' : 'text-tv-red'}`}>
                  {formatPercent(totalReturnPercent)} от стартового депо
                </div>
              </div>

              <div className="p-4 bg-[#1e222d] border border-[#2a2e39] rounded-xl">
                <div className="flex items-center justify-between text-xs text-tv-textMuted mb-1">
                  <span>Винрейт сделок</span>
                  <Target className="w-4 h-4 text-tv-yellow" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {winRate.toFixed(1)}%
                </div>
                <div className="text-[11px] text-tv-textMuted mt-1">
                  {winningTrades.length} в плюс из {totalTradesCount} сделок
                </div>
              </div>

              <div className="p-4 bg-[#1e222d] border border-[#2a2e39] rounded-xl">
                <div className="flex items-center justify-between text-xs text-tv-textMuted mb-1">
                  <span>Статус проп-челленджа</span>
                  <Shield className="w-4 h-4 text-tv-blue" />
                </div>
                <div className="text-base font-bold font-mono mt-1">
                  {propFirmEvaluation.isTargetPassed ? (
                    <span className="text-[#089981] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Цель сдана
                    </span>
                  ) : propFirmEvaluation.isDailyBreached || propFirmEvaluation.isOverallBreached ? (
                    <span className="text-tv-red flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Лимит нарушен
                    </span>
                  ) : (
                    <span className="text-tv-blue flex items-center gap-1">
                      <Clock className="w-4 h-4" /> В процессе
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-tv-textMuted mt-1">
                  Цель: {formatCurrency(propFirmEvaluation.profitTargetUsd, 0, { showPlus: true })} ({propFirmRules.profitTargetPercent}%)
                </div>
              </div>
            </div>

            {/* Sessions Table Header / CTA */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Сохраненные сессии бэктеста</h2>
                <p className="text-xs text-tv-textMuted">
                  Переключайтесь между разными периодами и парами или создавайте новые тесты
                </p>
              </div>

              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#089981]" />
                <span>Новая сессия</span>
              </button>
            </div>

            {/* Sessions Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                const sessPnl = sess.currentBalance - sess.initialBalance;
                const sessReturn = (sessPnl / sess.initialBalance) * 100;
                const symInfo = SUPPORTED_SYMBOLS[sess.symbol] || SUPPORTED_SYMBOLS['BTCUSDT.P'];

                return (
                  <div
                    key={sess.id}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#1e222d] border-tv-blue/70 shadow-lg shadow-tv-blue/5 ring-1 ring-tv-blue/40'
                        : 'bg-[#181b24] border-[#2a2e39] hover:border-white/20'
                    }`}
                  >
                    <div>
                      {/* Card Header: Asset & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            style={{ backgroundColor: symInfo.color }}
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-black text-xs shadow-sm"
                          >
                            {symInfo.icon}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                              <span>{sess.symbol}</span>
                              {isActive && (
                                <span className="px-1.5 py-0.2 bg-tv-blue/20 text-tv-blue text-[9px] font-sans font-semibold rounded uppercase tracking-wider border border-tv-blue/30">
                                  Активна
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-tv-textMuted font-medium truncate max-w-[160px]">
                              {sess.name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase font-mono ${
                              sess.propFirmStatus === 'passed'
                                ? 'bg-[#089981]/20 text-[#089981]'
                                : sess.propFirmStatus === 'daily_breach' || sess.propFirmStatus === 'overall_breach'
                                ? 'bg-tv-red/20 text-tv-red'
                                : 'bg-[#2a2e39] text-tv-textMuted'
                            }`}
                          >
                            {sess.propFirmStatus === 'passed'
                              ? 'Цель сдана'
                              : sess.propFirmStatus === 'daily_breach'
                              ? 'Дневной лимит'
                              : sess.propFirmStatus === 'overall_breach'
                              ? 'Просадка'
                              : 'В процессе'}
                          </span>
                        </div>
                      </div>

                      {/* Date Range & Preset info */}
                      <div className="space-y-1.5 py-2.5 border-y border-[#2a2e39]/60 text-xs font-mono text-tv-textMuted">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-tv-textMuted" />
                            <span>Период:</span>
                          </span>
                          <span className="text-white text-[11px]">
                            {new Date(sess.startDate * 1000).toLocaleDateString('ru-RU')}
                            {sess.endDate ? ` — ${new Date(sess.endDate * 1000).toLocaleDateString('ru-RU')}` : ' — по наст.'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-tv-textMuted" />
                            <span>Проп-фирма:</span>
                          </span>
                          <span className="text-white text-[11px] capitalize">
                            {sess.propFirm?.preset.replace('_', ' ') || 'Без правил'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-tv-textMuted" />
                            <span>Сделок:</span>
                          </span>
                          <span className="text-white text-[11px]">{sess.trades?.length || 0}</span>
                        </div>
                      </div>

                      {/* Financials */}
                      <div className="grid grid-cols-2 gap-2 pt-3 pb-4">
                        <div>
                          <div className="text-[10px] text-tv-textMuted uppercase font-semibold">Баланс</div>
                          <div className="text-sm font-bold font-mono text-white">
                            {formatCurrency(sess.currentBalance, 2)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-tv-textMuted uppercase font-semibold">Чистый PnL</div>
                          <div className={`text-sm font-bold font-mono ${sessPnl >= 0 ? 'text-[#089981]' : 'text-tv-red'}`}>
                            {formatCurrency(sessPnl, 2, { showPlus: true })} ({formatPercent(sessReturn)})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#2a2e39]/60">
                      <button
                        onClick={() => loadSession(sess.id)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-tv-blue hover:bg-tv-blueHover text-white'
                            : 'bg-[#2a2e39] hover:bg-[#363a45] text-white'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isActive ? 'Открыть график' : 'Запустить'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Сбросить баланс и сделки сессии "${sess.name}"?`)) {
                            resetSession(sess.id);
                          }
                        }}
                        title="Сбросить сессию к начальному состоянию"
                        className="p-2 bg-[#2a2e39]/60 hover:bg-[#363a45] text-tv-textMuted hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {sessions.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Удалить сессию "${sess.name}"?`)) {
                              deleteSession(sess.id);
                            }
                          }}
                          title="Удалить сессию"
                          className="p-2 bg-[#2a2e39]/60 hover:bg-tv-red/20 text-tv-textMuted hover:text-tv-red rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CREATE NEW SESSION WIZARD                                          */}
        {/* ========================================================================= */}
        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Создание новой бэктест-сессии</h2>
              <p className="text-xs text-tv-textMuted mt-1">
                Настройте торговый инструмент, период тестирования (FX Replay style) и параметры челленджа
              </p>
            </div>

            <form onSubmit={handleCreateSessionSubmit} className="space-y-6">
              {/* 1. Session Name */}
              <div className="p-5 bg-[#1e222d] border border-[#2a2e39] rounded-xl space-y-2">
                <label className="text-xs font-semibold text-white uppercase tracking-wider block">
                  1. Название сессии
                </label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Например: BTCUSDT 2024 London Breakouts"
                  required
                  className="w-full px-3.5 py-2 bg-[#131722] border border-[#2a2e39] rounded-lg text-sm text-white focus:border-tv-blue focus:outline-none"
                />
              </div>

              {/* 2. Choose Asset */}
              <div className="p-5 bg-[#1e222d] border border-[#2a2e39] rounded-xl space-y-3">
                <label className="text-xs font-semibold text-white uppercase tracking-wider block">
                  2. Торговый инструмент
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(SUPPORTED_SYMBOLS) as SupportedSymbol[]).map((s) => {
                    const info = SUPPORTED_SYMBOLS[s];
                    const isSelected = newSymbol === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setNewSymbol(s);
                          setNewSessionName(`${s.replace('.P', '')} Бэктест 2024`);
                        }}
                        className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-tv-blue bg-tv-blue/10 shadow-md ring-1 ring-tv-blue/40'
                            : 'border-[#2a2e39] bg-[#131722] hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            style={{ backgroundColor: info.color }}
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-black text-sm shadow-sm"
                          >
                            {info.icon}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white font-mono">{info.symbol}</div>
                            <div className="text-[11px] text-tv-textMuted">{info.name}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-tv-blue" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Date Range (FX Replay Style) */}
              <div className="p-5 bg-[#1e222d] border border-[#2a2e39] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white uppercase tracking-wider block">
                    3. Период тестирования (Дата начала и конца)
                  </label>
                  <span className="text-[11px] text-tv-textMuted font-mono">FX Replay Date Engine</span>
                </div>

                {/* Quick Date Presets */}
                <div>
                  <div className="text-[11px] text-tv-textMuted mb-2">Быстрый выбор периода:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('2024_full')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#131722] hover:bg-tv-blue/20 hover:text-tv-blue border border-[#2a2e39] text-tv-text transition-colors cursor-pointer"
                    >
                      Весь 2024 год
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('2024_q1')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#131722] hover:bg-tv-blue/20 hover:text-tv-blue border border-[#2a2e39] text-tv-text transition-colors cursor-pointer"
                    >
                      2024 Q1 (Ралли ETF)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('2024_summer')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#131722] hover:bg-tv-blue/20 hover:text-tv-blue border border-[#2a2e39] text-tv-text transition-colors cursor-pointer"
                    >
                      2024 Лето-Осень
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('2023_full')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#131722] hover:bg-tv-blue/20 hover:text-tv-blue border border-[#2a2e39] text-tv-text transition-colors cursor-pointer"
                    >
                      Весь 2023 год
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyDatePreset('recent_60d')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#131722] hover:bg-tv-blue/20 hover:text-tv-blue border border-[#2a2e39] text-tv-text transition-colors cursor-pointer"
                    >
                      Последние 60 дней
                    </button>
                  </div>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs text-tv-textMuted mb-1 block">Дата начала теста:</label>
                    <input
                      type="datetime-local"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-lg text-xs font-mono text-white focus:border-tv-blue focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-tv-textMuted block">Дата окончания теста:</label>
                      <label className="flex items-center gap-1.5 text-[11px] text-tv-textMuted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasEndDate}
                          onChange={(e) => setHasEndDate(e.target.checked)}
                          className="rounded border-[#2a2e39] text-tv-blue focus:ring-0"
                        />
                        <span>Ограничить дату</span>
                      </label>
                    </div>
                    <input
                      type="datetime-local"
                      value={newEndDate}
                      disabled={!hasEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-lg text-xs font-mono text-white focus:border-tv-blue focus:outline-none disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Capital Selection */}
              <div className="p-5 bg-[#1e222d] border border-[#2a2e39] rounded-xl space-y-3">
                <label className="text-xs font-semibold text-white uppercase tracking-wider block">
                  4. Стартовый депозит ($)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[5000, 10000, 25000, 50000, 100000, 200000].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => {
                        setNewCapital(cap);
                        setCustomCapitalInput('');
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                        newCapital === cap && !customCapitalInput
                          ? 'bg-tv-blue text-white border-tv-blue shadow-sm'
                          : 'bg-[#131722] border-[#2a2e39] text-tv-text hover:text-white hover:border-white/30'
                      }`}
                    >
                      {formatCurrency(cap, 0)}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="number"
                    placeholder="Или укажите свою сумму депозита (USD)..."
                    value={customCapitalInput}
                    onChange={(e) => setCustomCapitalInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-lg text-xs font-mono text-white focus:border-tv-blue focus:outline-none"
                  />
                </div>
              </div>

              {/* 5. Prop Firm Rules Simulation */}
              <div className="p-5 bg-[#1e222d] border border-[#2a2e39] rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-tv-blue" />
                    <label className="text-xs font-semibold text-white uppercase tracking-wider">
                      5. Симуляция проп-фирмы
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePropFirm}
                      onChange={(e) => setEnablePropFirm(e.target.checked)}
                      className="rounded border-[#2a2e39] text-tv-blue focus:ring-0"
                    />
                    <span>Включить правила и лимиты</span>
                  </label>
                </div>

                {enablePropFirm && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['funding_pips', 'ftmo', 'funded_next', 'custom'] as PropFirmPreset[]).map((p) => {
                        const isSelected = propPreset === p;
                        const label =
                          p === 'funding_pips'
                            ? 'Funding Pips'
                            : p === 'ftmo'
                            ? 'FTMO'
                            : p === 'funded_next'
                            ? 'FundedNext'
                            : 'Собственные';
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPropPreset(p)}
                            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-tv-blue/20 border-tv-blue text-white font-bold shadow-sm'
                                : 'bg-[#131722] border-[#2a2e39] text-tv-text hover:border-white/30'
                            }`}
                          >
                            <div className="text-xs font-semibold">{label}</div>
                            <div className="text-[10px] text-tv-textMuted mt-0.5 font-mono">
                              {p === 'funding_pips'
                                ? '5% День / 10% Общ / 8% Цель'
                                : p === 'ftmo' || p === 'funded_next'
                                ? '5% День / 10% Общ / 10% Цель'
                                : 'Кастомные настройки'}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {propPreset === 'custom' && (
                      <div className="grid grid-cols-3 gap-3 p-3 bg-[#131722] rounded-lg border border-[#2a2e39]">
                        <div>
                          <label className="text-[10px] text-tv-textMuted uppercase font-semibold block mb-1">
                            Дневной лимит (%)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={customDailyLoss}
                            onChange={(e) => setCustomDailyLoss(parseFloat(e.target.value) || 5)}
                            className="w-full px-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-tv-textMuted uppercase font-semibold block mb-1">
                            Общая просадка (%)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={customMaxLoss}
                            onChange={(e) => setCustomMaxLoss(parseFloat(e.target.value) || 10)}
                            className="w-full px-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-tv-textMuted uppercase font-semibold block mb-1">
                            Цель прибыли (%)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={customProfitTarget}
                            onChange={(e) => setCustomProfitTarget(parseFloat(e.target.value) || 8)}
                            className="w-full px-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('sessions')}
                  className="px-5 py-2.5 rounded-lg border border-[#2a2e39] text-xs font-semibold text-tv-text hover:text-white hover:bg-[#1e222d] transition-colors cursor-pointer"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-tv-blue hover:bg-tv-blueHover text-white rounded-lg text-xs font-bold shadow-lg shadow-tv-blue/25 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <span>Запустить бэктест в Replay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TRADES JOURNAL & DETAILED ANALYTICS                                */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Export */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Журнал совершенных сделок</h2>
                <p className="text-xs text-tv-textMuted">
                  Детальный лог позиций, комиссий, свопов и результатов в рамках сессии
                </p>
              </div>

              {closedTrades.length > 0 && (
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-tv-blue" />
                  <span>Экспорт в CSV</span>
                </button>
              )}
            </div>

            {/* Trades Table */}
            {closedTrades.length === 0 ? (
              <div className="p-12 text-center bg-[#1e222d] border border-[#2a2e39] rounded-xl text-tv-textMuted">
                <BarChart3 className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <div className="text-sm font-semibold text-white">В этой сессии еще нет закрытых сделок</div>
                <div className="text-xs mt-1">Открывайте сделки на графике в симуляторе, и они появятся в журнале</div>
                <button
                  onClick={() => setCurrentView('chart')}
                  className="mt-4 px-4 py-2 bg-tv-blue hover:bg-tv-blueHover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Перейти к графику
                </button>
              </div>
            ) : (
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#181b24] border-b border-[#2a2e39] text-tv-textMuted uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Тип</th>
                        <th className="py-2.5 px-3">Время входа</th>
                        <th className="py-2.5 px-3">Время выхода</th>
                        <th className="py-2.5 px-3">Вход</th>
                        <th className="py-2.5 px-3">Выход</th>
                        <th className="py-2.5 px-3">Объем</th>
                        <th className="py-2.5 px-3">Комиссии</th>
                        <th className="py-2.5 px-3">Своп</th>
                        <th className="py-2.5 px-3">Чистый PnL</th>
                        <th className="py-2.5 px-3">Доходность</th>
                        <th className="py-2.5 px-3">Причина</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39]/50">
                      {closedTrades.map((t) => (
                        <tr key={t.id} className="hover:bg-[#131722]/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                t.side === 'long'
                                  ? 'bg-[#089981]/20 text-[#089981]'
                                  : 'bg-tv-red/20 text-tv-red'
                              }`}
                            >
                              {t.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-tv-textMuted">
                            {formatDateTime(t.entryTime, timezone)}
                          </td>
                          <td className="py-2.5 px-3 text-tv-textMuted">
                            {formatDateTime(t.exitTime, timezone)}
                          </td>
                          <td className="py-2.5 px-3 text-white">${formatPrice(t.entryPrice)}</td>
                          <td className="py-2.5 px-3 text-white">${formatPrice(t.exitPrice)}</td>
                          <td className="py-2.5 px-3">{t.size}</td>
                          <td className="py-2.5 px-3 text-tv-textMuted">
                            -${(t.feeOpen + t.feeClose).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-tv-textMuted">
                            -${Math.abs(t.swapFee).toFixed(2)}
                          </td>
                          <td
                            className={`py-2.5 px-3 font-bold ${
                              t.netPnl >= 0 ? 'text-[#089981]' : 'text-tv-red'
                            }`}
                          >
                            {formatCurrency(t.netPnl, 2, { showPlus: true })}
                          </td>
                          <td
                            className={`py-2.5 px-3 font-semibold ${
                              t.netPnl >= 0 ? 'text-[#089981]' : 'text-tv-red'
                            }`}
                          >
                            {formatPercent(t.returnPercent)}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-tv-textMuted">
                            {t.closeReason === 'stop_loss'
                              ? 'Stop Loss'
                              : t.closeReason === 'take_profit'
                              ? 'Take Profit'
                              : 'Вручную'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
