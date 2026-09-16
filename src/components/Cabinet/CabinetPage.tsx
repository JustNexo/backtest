import React, { useState, useMemo } from 'react';
import { useChart } from '../../context/ChartContext';
import {
  SupportedSymbol,
  SUPPORTED_SYMBOLS,
  DEFAULT_PROP_FIRM_PRESETS,
  PropFirmPreset,
  PropFirmRuleSettings,
  AssetClass,
  isMarketOpen,
} from '../../types/session';
import { formatCurrency, formatDateTime, formatPercent, formatPrice } from '../../utils/formatters';
import {
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
  Shield,
  Search,
} from 'lucide-react';

type CabinetNavTab = 'sessions' | 'create' | 'analytics';

const ASSET_CATEGORIES: Array<{ id: AssetClass | 'all'; label: string }> = [
  { id: 'all', label: 'Все инструменты' },
  { id: 'forex', label: 'Forex' },
  { id: 'indices', label: 'Индексы' },
  { id: 'metals', label: 'Металлы (Золото)' },
  { id: 'crypto', label: 'Криптовалюты' },
];

const YEAR_PRESETS = [
  { key: '2019', label: '2019', sub: 'Пре-пандемия', start: '2019-01-01T00:00', end: '2019-12-31T23:59' },
  { key: '2020', label: '2020', sub: 'Covid Crash & Rally', start: '2020-01-01T00:00', end: '2020-12-31T23:59' },
  { key: '2021', label: '2021', sub: 'Bull Market ATH', start: '2021-01-01T00:00', end: '2021-12-31T23:59' },
  { key: '2022', label: '2022', sub: 'Bear Market & Rate Hikes', start: '2022-01-01T00:00', end: '2022-12-31T23:59' },
  { key: '2023', label: '2023', sub: 'Восстановление', start: '2023-01-01T00:00', end: '2023-12-31T23:59' },
  { key: '2024', label: '2024', sub: 'ETF Ралли & Новые ATH', start: '2024-01-01T00:00', end: '2024-12-31T23:59' },
  { key: '2025', label: '2025', sub: 'Текущий рынок', start: '2025-01-01T00:00', end: '2025-12-31T23:59' },
];

const CAPITAL_OPTIONS = [5000, 10000, 25000, 50000, 100000, 200000];

export const CabinetPage: React.FC = () => {
  const {
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
    setCurrentView,
  } = useChart();

  const [activeTab, setActiveTab] = useState<CabinetNavTab>('sessions');

  // New Session Form State
  const [newSessionName, setNewSessionName] = useState('EURUSD 2019 Бэктест');
  const [newSymbol, setNewSymbol] = useState<SupportedSymbol>('EURUSD');
  const [assetFilter, setAssetFilter] = useState<AssetClass | 'all'>('all');
  const [symbolSearch, setSymbolSearch] = useState('');
  const [newStartDate, setNewStartDate] = useState('2019-01-01T00:00');
  const [newEndDate, setNewEndDate] = useState('2019-12-31T23:59');
  const [hasEndDate, setHasEndDate] = useState(true);
  const [newCapital, setNewCapital] = useState<number>(100000);
  const [customCapitalInput, setCustomCapitalInput] = useState('');
  const [enablePropFirm, setEnablePropFirm] = useState(true);
  const [propPreset, setPropPreset] = useState<PropFirmPreset>('ftmo');
  const [customDailyLoss, setCustomDailyLoss] = useState(5);
  const [customMaxLoss, setCustomMaxLoss] = useState(10);
  const [customProfitTarget, setCustomProfitTarget] = useState(10);

  const filteredSymbols = useMemo(() => {
    return Object.values(SUPPORTED_SYMBOLS).filter((s) => {
      if (assetFilter !== 'all' && s.assetClass !== assetFilter) return false;
      if (symbolSearch.trim()) {
        const q = symbolSearch.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.baseAsset.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assetFilter, symbolSearch]);

  const handleApplyYearPreset = (preset: typeof YEAR_PRESETS[0]) => {
    setNewStartDate(preset.start);
    setNewEndDate(preset.end);
    setHasEndDate(true);
    setNewSessionName(`${newSymbol.replace('.P', '')} - ${preset.label} (${preset.sub})`);
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
    const headers = ['ID', 'Side', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', 'Size', 'Gross PnL', 'Net PnL', 'Return %', 'Reason'];
    const rows = closedTrades.map((t) => [
      t.id,
      t.side.toUpperCase(),
      new Date(t.entryTime * 1000).toISOString(),
      new Date(t.exitTime * 1000).toISOString(),
      t.entryPrice,
      t.exitPrice,
      t.size,
      t.grossPnl,
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

  const totalTradesCount = closedTrades.length;
  const winningTrades = closedTrades.filter((t) => t.netPnl > 0);
  const winRate = totalTradesCount > 0 ? (winningTrades.length / totalTradesCount) * 100 : 0;
  const totalNetPnl = balance - initialBalance;
  const totalReturnPercent = initialBalance > 0 ? (totalNetPnl / initialBalance) * 100 : 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#10121a] text-[#d1d4dc] select-none overflow-hidden font-sans">
      {/* Sleek Top Navigation Header */}
      <header className="h-12 bg-[#131722] border-b border-[#242731] px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white tracking-wider font-mono">
              FX REPLAY
            </span>
            <span className="text-[10px] uppercase font-mono text-[#787b86]">
              Terminal
            </span>
          </div>

          <div className="w-[1px] h-4 bg-[#242731]" />

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'sessions'
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              Сессии ({sessions.length})
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              + Новая сессия
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              Журнал сделок
            </button>
          </nav>
        </div>

        {/* Right side: Active session info & back to chart */}
        <div className="flex items-center gap-3">
          {activeSession && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#787b86]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#089981]" />
              <span className="text-white font-medium">{activeSession.name}</span>
              <span>({activeSession.symbol})</span>
            </div>
          )}

          <button
            onClick={() => setCurrentView('chart')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2962ff] hover:bg-[#1e53e5] text-white rounded text-xs font-medium transition-colors cursor-pointer shadow-sm"
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>К графику</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto">
        {/* ========================================================================= */}
        {/* TAB 1: SESSIONS LIST                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {/* Minimal High-Level KPI Ribbon (Zero box nesting!) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-[#242731]">
              <div>
                <div className="text-[11px] text-[#787b86] uppercase tracking-wide">Баланс</div>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {formatCurrency(balance, 2)}
                </div>
                <div className="text-[11px] text-[#787b86] font-mono mt-0.5">
                  Депозит: {formatCurrency(initialBalance, 0)}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#787b86] uppercase tracking-wide">Чистый PnL</div>
                <div className={`text-2xl font-bold font-mono mt-0.5 ${totalNetPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {formatCurrency(totalNetPnl, 2, { showPlus: true })}
                </div>
                <div className={`text-[11px] font-mono mt-0.5 ${totalNetPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {formatPercent(totalReturnPercent)}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#787b86] uppercase tracking-wide">Винрейт</div>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {winRate.toFixed(1)}%
                </div>
                <div className="text-[11px] text-[#787b86] font-mono mt-0.5">
                  {winningTrades.length} из {totalTradesCount} сделок
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#787b86] uppercase tracking-wide">Проп-статус</div>
                <div className="text-base font-bold font-mono mt-1">
                  {propFirmEvaluation.isTargetPassed ? (
                    <span className="text-[#089981] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Цель сдана
                    </span>
                  ) : propFirmEvaluation.isDailyBreached || propFirmEvaluation.isOverallBreached ? (
                    <span className="text-[#f23645] flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Лимит превышен
                    </span>
                  ) : (
                    <span className="text-white flex items-center gap-1 font-medium">
                      В процессе
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#787b86] font-mono mt-0.5">
                  {propFirmRules.preset.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Sessions Cards Grid */}
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-xs font-semibold text-[#787b86] uppercase tracking-wider">
                Сохраненные сессии бэктеста
              </h3>
              <button
                onClick={() => setActiveTab('create')}
                className="text-xs text-[#2962ff] hover:underline cursor-pointer font-medium"
              >
                + Создать новую сессию
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((sess) => {
                const isActive = sess.id === activeSession?.id;
                const sessPnl = sess.currentBalance - sess.initialBalance;
                const sessReturn = sess.initialBalance > 0 ? (sessPnl / sess.initialBalance) * 100 : 0;
                const symInfo = SUPPORTED_SYMBOLS[sess.symbol];
                const lastReplayTs = sess.currentReplayTime || sess.startDate;

                return (
                  <div
                    key={sess.id}
                    className={`p-4 rounded-lg bg-[#141720] border transition-all flex flex-col justify-between ${
                      isActive ? 'border-[#2962ff]/60 ring-1 ring-[#2962ff]/20' : 'border-[#242731] hover:border-[#363a45]'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#242731]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono text-sm">
                              {sess.symbol}
                            </span>
                            <span className="text-[10px] text-[#787b86] uppercase">
                              {symInfo?.assetClass || 'crypto'}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#089981]" title="Активная сессия" />
                            )}
                          </div>
                          <h4 className="text-xs text-[#d1d4dc] font-medium mt-0.5 truncate max-w-[200px]">
                            {sess.name}
                          </h4>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-semibold uppercase ${
                            sess.propFirmStatus === 'passed'
                              ? 'text-[#089981]'
                              : sess.propFirmStatus === 'daily_breach' || sess.propFirmStatus === 'overall_breach'
                              ? 'text-[#f23645]'
                              : 'text-[#787b86]'
                          }`}
                        >
                          {sess.propFirmStatus === 'passed'
                            ? 'Сдано'
                            : sess.propFirmStatus === 'daily_breach' || sess.propFirmStatus === 'overall_breach'
                            ? 'Нарушение'
                            : 'В процессе'}
                        </span>
                      </div>

                      {/* Timestamps & Progress */}
                      <div className="py-3 space-y-1.5 text-xs font-mono border-b border-[#242731]">
                        <div className="flex items-center justify-between text-[#787b86]">
                          <span>Период:</span>
                          <span className="text-white text-[11px]">
                            {new Date(sess.startDate * 1000).toLocaleDateString('ru-RU')}
                            {sess.endDate ? ` — ${new Date(sess.endDate * 1000).toLocaleDateString('ru-RU')}` : ' — по наст.'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[#787b86]">
                          <span>Текущий прогресс:</span>
                          <span className="text-[#f7a600] text-[11px] font-semibold">
                            {formatDateTime(lastReplayTs, timezone)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[#787b86]">
                          <span>Сделок:</span>
                          <span className="text-white text-[11px]">{sess.trades?.length || 0}</span>
                        </div>
                      </div>

                      {/* Financials */}
                      <div className="py-3 flex items-center justify-between font-mono">
                        <div>
                          <div className="text-[10px] text-[#787b86] uppercase">Баланс</div>
                          <div className="text-sm font-bold text-white">
                            {formatCurrency(sess.currentBalance, 2)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-[#787b86] uppercase">PnL</div>
                          <div className={`text-sm font-bold ${sessPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                            {formatCurrency(sessPnl, 2, { showPlus: true })} ({formatPercent(sessReturn)})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[#242731] flex items-center gap-2">
                      <button
                        onClick={() => loadSession(sess.id)}
                        className={`flex-1 py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#2962ff] hover:bg-[#1e53e5] text-white'
                            : 'bg-[#242731] hover:bg-[#2e3240] text-white'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{isActive ? 'Открыть график' : 'Продолжить'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Сбросить сессию "${sess.name}" к стартовому состоянию?`)) {
                            resetSession(sess.id);
                          }
                        }}
                        title="Сбросить сессию к начальной дате"
                        className="p-1.5 text-[#787b86] hover:text-white hover:bg-[#242731] rounded transition-colors cursor-pointer"
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
                          className="p-1.5 text-[#787b86] hover:text-[#f23645] hover:bg-[#f23645]/10 rounded transition-colors cursor-pointer"
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
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Создать новую сессию бэктеста</h2>
              <p className="text-xs text-[#787b86] mt-0.5">
                Выберите актив, глубину истории (начиная с 2019 года), стартовый баланс и правила проп-фирмы
              </p>
            </div>

            <form onSubmit={handleCreateSessionSubmit} className="space-y-6">
              {/* 1. Name & Asset */}
              <div className="space-y-3 pb-6 border-b border-[#242731]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-white tracking-wider">
                    1. Инструмент и название
                  </label>
                  <span className="text-[11px] text-[#787b86]">Forex 24/5 • Золото • Индексы • Крипто</span>
                </div>

                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Название сессии"
                  required
                  className="w-full px-3 py-1.5 bg-[#141720] border border-[#242731] focus:border-[#2962ff] rounded text-sm text-white outline-none"
                />

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                  {ASSET_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAssetFilter(cat.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        assetFilter === cat.id
                          ? 'bg-[#2962ff] text-white'
                          : 'bg-[#141720] text-[#787b86] hover:text-white hover:bg-[#1e222d]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Grid of symbols */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pt-1">
                  {filteredSymbols.map((item) => {
                    const isSelected = newSymbol === item.symbol;
                    const status = isMarketOpen(item.symbol);
                    return (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => {
                          setNewSymbol(item.symbol);
                          setNewSessionName(`${item.symbol.replace('.P', '')} ${newStartDate.slice(0, 4)} Бэктест`);
                        }}
                        className={`p-2 rounded text-left transition-all flex flex-col justify-between cursor-pointer border ${
                          isSelected
                            ? 'bg-[#2962ff]/15 border-[#2962ff] text-white'
                            : 'bg-[#141720] border-[#242731] hover:border-[#363a45] text-[#d1d4dc]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-mono text-xs">{item.symbol}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? 'bg-[#089981]' : 'bg-[#f23645]'}`} />
                        </div>
                        <div className="text-[10px] text-[#787b86] truncate mt-1">{item.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Date Range & Presets (From 2019!) */}
              <div className="space-y-3 pb-6 border-b border-[#242731]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-white tracking-wider">
                    2. Период тестирования (История с 2019 года)
                  </label>
                  <span className="text-[11px] text-[#787b86]">FX Replay Replay Engine</span>
                </div>

                {/* Year presets chips */}
                <div className="flex flex-wrap gap-1.5">
                  {YEAR_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleApplyYearPreset(p)}
                      className="px-2.5 py-1 rounded text-xs font-mono bg-[#141720] hover:bg-[#242731] text-[#d1d4dc] hover:text-white border border-[#242731] transition-colors cursor-pointer"
                    >
                      {p.label} <span className="text-[10px] text-[#787b86]">({p.sub})</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <div className="text-[#787b86] mb-1">Дата начала:</div>
                    <input
                      type="datetime-local"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 bg-[#141720] border border-[#242731] focus:border-[#2962ff] rounded text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[#787b86] mb-1">
                      <span>Дата окончания:</span>
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasEndDate}
                          onChange={(e) => setHasEndDate(e.target.checked)}
                          className="accent-[#2962ff]"
                        />
                        <span>Ограничить</span>
                      </label>
                    </div>
                    <input
                      type="datetime-local"
                      value={newEndDate}
                      disabled={!hasEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#141720] border border-[#242731] focus:border-[#2962ff] rounded text-white font-mono text-xs outline-none disabled:opacity-30"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Initial Capital & Prop Firm Rules */}
              <div className="space-y-3 pb-6 border-b border-[#242731]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-white tracking-wider">
                    3. Стартовый депозит и правила проп-фирмы
                  </label>
                </div>

                {/* Capital chips */}
                <div className="flex flex-wrap items-center gap-2">
                  {CAPITAL_OPTIONS.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => {
                        setNewCapital(cap);
                        setCustomCapitalInput('');
                      }}
                      className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                        newCapital === cap && !customCapitalInput
                          ? 'bg-[#2962ff] text-white font-bold'
                          : 'bg-[#141720] text-[#787b86] hover:text-white border border-[#242731]'
                      }`}
                    >
                      ${cap.toLocaleString()}
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder="Свой ($)"
                    value={customCapitalInput}
                    onChange={(e) => setCustomCapitalInput(e.target.value)}
                    className="w-28 px-2.5 py-1 bg-[#141720] border border-[#242731] rounded text-xs font-mono text-white outline-none focus:border-[#2962ff]"
                  />
                </div>

                {/* Prop Firm Presets */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#787b86]">Модель оценки:</span>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enablePropFirm}
                        onChange={(e) => setEnablePropFirm(e.target.checked)}
                        className="accent-[#2962ff]"
                      />
                      <span>Включить правила проп-фирмы</span>
                    </label>
                  </div>

                  {enablePropFirm && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(DEFAULT_PROP_FIRM_PRESETS) as PropFirmPreset[]).map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => setPropPreset(pr)}
                          className={`p-2 rounded text-left transition-colors cursor-pointer border ${
                            propPreset === pr
                              ? 'bg-[#2962ff]/15 border-[#2962ff] text-white'
                              : 'bg-[#141720] border-[#242731] hover:border-[#363a45] text-[#787b86]'
                          }`}
                        >
                          <div className="font-semibold text-xs text-white uppercase">{pr.replace('_', ' ')}</div>
                          <div className="text-[10px] text-[#787b86] mt-0.5">
                            {DEFAULT_PROP_FIRM_PRESETS[pr].dailyLossLimitPercent}% день / {DEFAULT_PROP_FIRM_PRESETS[pr].overallLossLimitPercent}% макс
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-3 bg-[#2962ff] hover:bg-[#1e53e5] text-white rounded font-semibold text-xs uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
              >
                Создать сессию и начать торговлю →
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TRADES JOURNAL & ANALYTICS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#242731]">
              <div>
                <h3 className="text-sm font-bold text-white">Журнал сделок сессии</h3>
                <p className="text-xs text-[#787b86]">Все исполненные сделки текущей сессии</p>
              </div>

              {closedTrades.length > 0 && (
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#242731] hover:bg-[#2e3240] text-white rounded text-xs font-medium transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Экспорт в CSV</span>
                </button>
              )}
            </div>

            {closedTrades.length === 0 ? (
              <div className="text-center py-16 text-xs text-[#787b86]">
                В этой сессии пока нет закрытых сделок. Откройте график и протестируйте стратегию.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-[#787b86] border-b border-[#242731]">
                    <th className="pb-2 font-medium">Направление</th>
                    <th className="pb-2 font-medium">Вход</th>
                    <th className="pb-2 font-medium">Выход</th>
                    <th className="pb-2 font-medium">Объем</th>
                    <th className="pb-2 font-medium">Чистый PnL</th>
                    <th className="pb-2 font-medium">Доходность %</th>
                    <th className="pb-2 font-medium">Причина</th>
                    <th className="pb-2 font-medium text-right">Время</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242731]">
                  {closedTrades.slice().reverse().map((t) => (
                    <tr key={t.id} className="hover:bg-[#141720] transition-colors">
                      <td className="py-2.5">
                        <span className={t.side === 'long' ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                          {t.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 text-white">{formatPrice(t.entryPrice, 4)}</td>
                      <td className="py-2.5 text-white">{formatPrice(t.exitPrice, 4)}</td>
                      <td className="py-2.5 text-[#d1d4dc]">{t.size}</td>
                      <td className={`py-2.5 font-bold ${t.netPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {formatCurrency(t.netPnl, 2, { showPlus: true })}
                      </td>
                      <td className={`py-2.5 font-bold ${t.returnPercent >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {formatPercent(t.returnPercent)}
                      </td>
                      <td className="py-2.5 text-[#787b86] capitalize">{t.closeReason.replace('_', ' ')}</td>
                      <td className="py-2.5 text-right text-[#787b86]">{formatDateTime(t.exitTime, timezone)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
