import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Calculator,
  List,
  BarChart3,
  RotateCcw,
  Download,
  AlertCircle,
  Percent,
  DollarSign,
  Shield,
  Layers,
  Clock,
  X,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { calculateRiskPosition } from '../../services/tradeEngine';
import { formatCurrency, formatDateTime, formatPercent, formatPrice } from '../../utils/formatters';

export const TradingPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'trade' | 'position' | 'orders' | 'history' | 'metrics'>('trade');

  const {
    balance,
    initialBalance,
    currentCandle,
    activePosition,
    limitOrders,
    closedTrades,
    metrics,
    riskSettings,
    updateRiskSettings,
    executeTrade,
    addLimitOrder,
    cancelLimitOrder,
    closeActivePosition,
    resetBacktest,
    feeSettings,
  } = useChart();

  // Order Type: Market vs Limit
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [tradeSide, setTradeSide] = useState<'long' | 'short'>('long');

  const currentPrice = currentCandle?.close || 65000;
  const [customLimitPrice, setCustomLimitPrice] = useState<string>('');
  const [customSlPrice, setCustomSlPrice] = useState<string>('');
  const [customTpPrice, setCustomTpPrice] = useState<string>('');

  // Effective Entry Price (limit price if limit order, else current market price)
  const defaultLimitPrice = useMemo(() => {
    return tradeSide === 'long'
      ? (currentPrice * 0.995).toFixed(1)
      : (currentPrice * 1.005).toFixed(1);
  }, [currentPrice, tradeSide]);

  const effectiveEntryPrice = orderType === 'limit'
    ? (parseFloat(customLimitPrice) || parseFloat(defaultLimitPrice))
    : currentPrice;

  // Calculated suggested SL & TP when prices change
  const defaultSl = useMemo(() => {
    return tradeSide === 'long'
      ? (effectiveEntryPrice * 0.992).toFixed(1)
      : (effectiveEntryPrice * 1.008).toFixed(1);
  }, [effectiveEntryPrice, tradeSide]);

  const slPriceNumber = parseFloat(customSlPrice) || parseFloat(defaultSl);
  const slDist = Math.abs(effectiveEntryPrice - slPriceNumber);

  const defaultTp = useMemo(() => {
    return tradeSide === 'long'
      ? (effectiveEntryPrice + slDist * riskSettings.defaultTpRatio).toFixed(1)
      : (effectiveEntryPrice - slDist * riskSettings.defaultTpRatio).toFixed(1);
  }, [effectiveEntryPrice, slDist, tradeSide, riskSettings.defaultTpRatio]);

  const tpPriceNumber = parseFloat(customTpPrice) || parseFloat(defaultTp);

  // Real-time Risk & Position calculation
  const riskCalc = useMemo(() => {
    return calculateRiskPosition(
      balance,
      riskSettings,
      effectiveEntryPrice,
      slPriceNumber,
      tpPriceNumber
    );
  }, [balance, riskSettings, effectiveEntryPrice, slPriceNumber, tpPriceNumber]);

  const handleOpenMarketTrade = (side: 'long' | 'short') => {
    executeTrade(side, slPriceNumber, tpPriceNumber);
    setActiveTab('position');
  };

  const handlePlaceLimitOrder = (side: 'long' | 'short') => {
    const success = addLimitOrder(side, effectiveEntryPrice, slPriceNumber, tpPriceNumber);
    if (success) {
      setActiveTab('orders');
    }
  };

  const handleExportCsv = () => {
    if (closedTrades.length === 0) return;
    const headers = ['ID', 'Side', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', 'Size BTC', 'Gross PnL', 'Fees', 'Swap', 'Net PnL', 'Return %', 'Reason'];
    const rows = closedTrades.map(t => [
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
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `backtest_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const netPnlTotal = balance - initialBalance;
  const netPnlTotalPercent = (netPnlTotal / initialBalance) * 100;

  return (
    <div className="border-t border-[#2a2e39] bg-[#1e222d] select-none flex flex-col shrink-0 transition-all duration-200">
      {/* Panel Top Header Bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[#2a2e39] bg-[#131722]/70">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-white hover:text-tv-blue transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            <span>ТЕСТЕР СТРАТЕГИЙ & ТОРГОВЛЯ</span>
          </button>

          {/* Tab buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('trade'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'trade' && isExpanded
                  ? 'bg-tv-blue text-white font-semibold'
                  : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Риск-калькулятор (MT)</span>
            </button>

            <button
              onClick={() => { setActiveTab('position'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'position' && isExpanded
                  ? 'bg-tv-blue text-white font-semibold'
                  : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Позиция</span>
              {activePosition && (
                <span className="w-2 h-2 rounded-full bg-tv-green animate-pulse" />
              )}
            </button>

            <button
              onClick={() => { setActiveTab('orders'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'orders' && isExpanded
                  ? 'bg-tv-blue text-white font-semibold'
                  : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Лимитные ордера</span>
              {limitOrders.length > 0 && (
                <span className="px-1.5 py-0.2 bg-[#f7a600] text-black text-[10px] font-bold rounded-full">
                  {limitOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('history'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'history' && isExpanded
                  ? 'bg-tv-blue text-white font-semibold'
                  : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Сделки ({closedTrades.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('metrics'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'metrics' && isExpanded
                  ? 'bg-tv-blue text-white font-semibold'
                  : 'text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Статистика</span>
            </button>
          </div>
        </div>

        {/* Account Summary Bar */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-tv-textMuted">Баланс:</span>
            <span className="font-semibold text-white">${formatPrice(balance, 2)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-tv-textMuted">PnL:</span>
            <span
              className={`font-semibold ${
                netPnlTotal >= 0 ? 'text-tv-green' : 'text-tv-red'
              }`}
            >
              {formatCurrency(netPnlTotal)} ({formatPercent(netPnlTotalPercent)})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-tv-textMuted">Winrate:</span>
            <span className="font-semibold text-white">{metrics.winRate}%</span>
          </div>

          <button
            onClick={resetBacktest}
            title="Сбросить депозит и историю бэктеста к $10,000"
            className="p-1 text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Content Drawer */}
      {isExpanded && (
        <div className="p-4 bg-[#1e222d] min-h-[200px] max-h-[320px] overflow-y-auto">
          {/* TAB 1: RISK & POSITION SIZING CALCULATOR */}
          {activeTab === 'trade' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Column 1: Order Type & Risk Settings */}
              <div className="md:col-span-4 space-y-3 bg-[#131722] p-3.5 rounded-xl border border-[#2a2e39]">
                <div className="flex items-center justify-between">
                  {/* Order Type Toggle: Market vs Limit */}
                  <div className="flex bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39]">
                    <button
                      onClick={() => setOrderType('market')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        orderType === 'market'
                          ? 'bg-tv-blue text-white shadow-sm'
                          : 'text-tv-textMuted hover:text-white'
                      }`}
                    >
                      По рынку (Market)
                    </button>
                    <button
                      onClick={() => setOrderType('limit')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        orderType === 'limit'
                          ? 'bg-[#f7a600] text-black shadow-sm'
                          : 'text-tv-textMuted hover:text-white'
                      }`}
                    >
                      Лимитный (Limit)
                    </button>
                  </div>

                  {/* Mode switcher: % vs $ */}
                  <div className="flex bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39]">
                    <button
                      onClick={() => updateRiskSettings({ mode: 'percent' })}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                        riskSettings.mode === 'percent'
                          ? 'bg-tv-blue text-white'
                          : 'text-tv-textMuted hover:text-white'
                      }`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => updateRiskSettings({ mode: 'usd' })}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                        riskSettings.mode === 'usd'
                          ? 'bg-tv-blue text-white'
                          : 'text-tv-textMuted hover:text-white'
                      }`}
                    >
                      $
                    </button>
                  </div>
                </div>

                {/* If Limit Order, show Limit Price Input */}
                {orderType === 'limit' && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label className="text-tv-text font-medium flex items-center gap-1 text-[#f7a600]">
                        <Clock className="w-3.5 h-3.5" />
                        Лимитная цена входа ($)
                      </label>
                      <button
                        onClick={() => setCustomLimitPrice(currentPrice.toFixed(1))}
                        className="text-[10px] text-tv-textMuted hover:text-white underline"
                      >
                        Текущая (${formatPrice(currentPrice, 1)})
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      placeholder={defaultLimitPrice}
                      value={customLimitPrice}
                      onChange={(e) => setCustomLimitPrice(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#1e222d] border border-[#f7a600]/50 rounded-lg text-xs text-white font-mono focus:border-[#f7a600] focus:outline-none"
                    />
                  </div>
                )}

                {/* Risk input */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <label className="text-tv-text">
                      {riskSettings.mode === 'percent' ? 'Риск на сделку (% от баланса)' : 'Сумма риска ($)'}
                    </label>
                    <span className="font-mono text-tv-yellow font-semibold">
                      ${riskCalc.riskUsd}
                    </span>
                  </div>

                  {riskSettings.mode === 'percent' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="50"
                        value={riskSettings.riskPercent}
                        onChange={(e) =>
                          updateRiskSettings({ riskPercent: parseFloat(e.target.value) || 1.0 })
                        }
                        className="w-full px-3 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white font-mono focus:border-tv-blue focus:outline-none"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        {[0.5, 1.0, 2.0, 3.0].map((p) => (
                          <button
                            key={p}
                            onClick={() => updateRiskSettings({ riskPercent: p })}
                            className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                              riskSettings.riskPercent === p
                                ? 'border-tv-blue bg-tv-blue/20 text-tv-blue font-bold'
                                : 'border-[#2a2e39] text-tv-textMuted hover:text-white'
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <input
                      type="number"
                      step="10"
                      min="1"
                      value={riskSettings.riskUsd}
                      onChange={(e) =>
                        updateRiskSettings({ riskUsd: parseFloat(e.target.value) || 100 })
                      }
                      className="w-full px-3 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white font-mono focus:border-tv-blue focus:outline-none"
                    />
                  )}
                </div>

                {/* SL and TP Distance Inputs */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] text-tv-textMuted block mb-1">
                      Stop Loss ($)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder={defaultSl}
                      value={customSlPrice}
                      onChange={(e) => setCustomSlPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white font-mono focus:border-tv-red focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-tv-textMuted block mb-1">
                      Take Profit ($)
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder={defaultTp}
                      value={customTpPrice}
                      onChange={(e) => setCustomTpPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white font-mono focus:border-tv-green focus:outline-none"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-tv-textMuted italic">
                  💡 На графике можно перетаскивать уровни SL и TP мышкой за ярлыки!
                </div>
              </div>

              {/* Column 2: Auto-calculated position details */}
              <div className="md:col-span-5 bg-[#131722] p-3.5 rounded-xl border border-[#2a2e39] flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider mb-2">
                    Автоматический расчет позиции
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 bg-[#1e222d] rounded-lg">
                      <div className="text-[10px] text-tv-textMuted">Объем позиции:</div>
                      <div className="text-white font-semibold text-sm">
                        {riskCalc.sizeBtc} BTC
                      </div>
                    </div>

                    <div className="p-2 bg-[#1e222d] rounded-lg">
                      <div className="text-[10px] text-tv-textMuted">Номинал USDT:</div>
                      <div className="text-white font-semibold text-sm">
                        ${formatPrice(riskCalc.notionalUsdt, 1)}
                      </div>
                    </div>

                    <div className="p-2 bg-[#1e222d] rounded-lg">
                      <div className="text-[10px] text-tv-textMuted">Дистанция SL:</div>
                      <div className="text-tv-red font-semibold">
                        ${riskCalc.stopDistance} ({riskCalc.stopDistancePercent}%)
                      </div>
                    </div>

                    <div className="p-2 bg-[#1e222d] rounded-lg">
                      <div className="text-[10px] text-tv-textMuted">Risk / Reward (R:R):</div>
                      <div className="text-tv-green font-semibold">
                        1 : {riskCalc.riskRewardRatio || '2.0'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-tv-textMuted mt-2 pt-2 border-t border-[#2a2e39] flex items-center justify-between">
                  <span>При срабатывании SL убыток:</span>
                  <span className="text-tv-red font-mono font-semibold">-${riskCalc.riskUsd}</span>
                </div>
              </div>

              {/* Column 3: Order Execution Buttons */}
              <div className="md:col-span-3 flex flex-col justify-between gap-2 bg-[#131722] p-3.5 rounded-xl border border-[#2a2e39]">
                <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                  {orderType === 'market' ? 'Рыночное исполнение' : 'Выставление лимитки'}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setTradeSide('long');
                      if (orderType === 'market') {
                        handleOpenMarketTrade('long');
                      } else {
                        handlePlaceLimitOrder('long');
                      }
                    }}
                    className={`w-full py-2.5 px-4 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-between ${
                      orderType === 'market'
                        ? 'bg-tv-green hover:bg-tv-greenHover shadow-tv-green/20'
                        : 'bg-[#089981] hover:bg-[#067a67] border border-white/20'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      {orderType === 'market' ? 'КУПИТЬ / LONG' : 'LIMIT LONG'}
                    </span>
                    <span className="font-mono text-[11px] opacity-90">
                      ${formatPrice(effectiveEntryPrice, 1)}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setTradeSide('short');
                      if (orderType === 'market') {
                        handleOpenMarketTrade('short');
                      } else {
                        handlePlaceLimitOrder('short');
                      }
                    }}
                    className={`w-full py-2.5 px-4 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-between ${
                      orderType === 'market'
                        ? 'bg-tv-red hover:bg-tv-redHover shadow-tv-red/20'
                        : 'bg-[#d32635] hover:bg-[#b01e2b] border border-white/20'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4" />
                      {orderType === 'market' ? 'ПРОДАТЬ / SHORT' : 'LIMIT SHORT'}
                    </span>
                    <span className="font-mono text-[11px] opacity-90">
                      ${formatPrice(effectiveEntryPrice, 1)}
                    </span>
                  </button>
                </div>

                <div className="text-[10px] text-tv-textMuted text-center">
                  Комиссия Funding Pips: {feeSettings.commissionPercent}%
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE POSITION */}
          {activeTab === 'position' && (
            <div>
              {activePosition ? (
                <div className="bg-[#131722] p-4 rounded-xl border border-[#2a2e39] flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase font-mono tracking-wider ${
                        activePosition.side === 'long'
                          ? 'bg-tv-green/20 text-tv-green border border-tv-green/30'
                          : 'bg-tv-red/20 text-tv-red border border-tv-red/30'
                      }`}
                    >
                      {activePosition.side}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white font-mono">
                        {activePosition.size} BTC @ ${formatPrice(activePosition.entryPrice)}
                      </div>
                      <div className="text-[11px] text-tv-textMuted font-mono">
                        Открыта: {formatDateTime(activePosition.entryTime)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-tv-textMuted block text-[10px]">Stop Loss (перетаскиваемый):</span>
                      <span className="text-tv-red font-semibold">
                        ${activePosition.stopLoss ? formatPrice(activePosition.stopLoss) : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-tv-textMuted block text-[10px]">Take Profit (перетаскиваемый):</span>
                      <span className="text-tv-green font-semibold">
                        ${activePosition.takeProfit ? formatPrice(activePosition.takeProfit) : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-tv-textMuted block text-[10px]">Комиссии + Своп:</span>
                      <span className="text-tv-text font-semibold">
                        -${(activePosition.feeOpen + Math.abs(activePosition.accumulatedSwap)).toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-tv-textMuted block text-[10px]">Нереализованный PnL:</span>
                      <span
                        className={`text-sm font-bold ${
                          activePosition.unrealizedNetPnl >= 0 ? 'text-tv-green' : 'text-tv-red'
                        }`}
                      >
                        {formatCurrency(activePosition.unrealizedNetPnl)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={closeActivePosition}
                    className="px-4 py-2 bg-tv-surfaceHover hover:bg-tv-red hover:text-white text-xs font-medium rounded-xl border border-[#2a2e39] transition-colors shrink-0"
                  >
                    Закрыть по рынку
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-tv-textMuted">
                  Нет открытых позиций. Откройте Market или выставьте Limit в первой вкладке.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PENDING LIMIT ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-tv-textMuted">
                  Отложенные лимитные ордера: {limitOrders.length}
                </span>
                <span className="text-[11px] text-tv-textMuted">
                  💡 При движении свечей в симуляторе ордер сработает при касании цены!
                </span>
              </div>

              {limitOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#131722] text-tv-textMuted text-[10px] uppercase border-b border-[#2a2e39]">
                      <tr>
                        <th className="py-2 px-3">Тип</th>
                        <th className="py-2 px-3">Лимитная цена</th>
                        <th className="py-2 px-3">Объем</th>
                        <th className="py-2 px-3">Stop Loss</th>
                        <th className="py-2 px-3">Take Profit</th>
                        <th className="py-2 px-3">Риск USD</th>
                        <th className="py-2 px-3">Время выставления</th>
                        <th className="py-2 px-3 text-right">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39]/50">
                      {limitOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#131722]/60 transition-colors">
                          <td className="py-2 px-3 font-semibold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                o.side === 'long'
                                  ? 'bg-[#089981]/20 text-[#089981]'
                                  : 'bg-[#f23645]/20 text-[#f23645]'
                              }`}
                            >
                              LIMIT {o.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#f7a600] font-bold">
                            ${formatPrice(o.limitPrice)}
                          </td>
                          <td className="py-2 px-3 text-white">{o.size} BTC</td>
                          <td className="py-2 px-3 text-tv-red">
                            ${o.stopLoss ? formatPrice(o.stopLoss) : '—'}
                          </td>
                          <td className="py-2 px-3 text-tv-green">
                            ${o.takeProfit ? formatPrice(o.takeProfit) : '—'}
                          </td>
                          <td className="py-2 px-3 text-tv-yellow font-semibold">
                            ${o.riskUsd}
                          </td>
                          <td className="py-2 px-3 text-tv-textMuted">
                            {formatDateTime(o.createdTime)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => cancelLimitOrder(o.id)}
                              className="px-2.5 py-1 bg-tv-red/10 hover:bg-tv-red text-tv-red hover:text-white rounded-lg transition-colors text-[11px] font-sans font-medium"
                            >
                              Отменить
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-tv-textMuted">
                  Нет активных лимитных ордеров. Выберите «Лимитный (Limit)» в первой вкладке.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRADES HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-tv-textMuted">
                  Всего закрытых сделок: {closedTrades.length}
                </span>
                {closedTrades.length > 0 && (
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#131722] hover:bg-tv-surfaceHover border border-[#2a2e39] rounded-lg text-xs text-tv-text hover:text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Экспорт в CSV</span>
                  </button>
                )}
              </div>

              {closedTrades.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#131722] text-tv-textMuted text-[10px] uppercase border-b border-[#2a2e39]">
                      <tr>
                        <th className="py-2 px-3">Тип</th>
                        <th className="py-2 px-3">Время входа</th>
                        <th className="py-2 px-3">Вход</th>
                        <th className="py-2 px-3">Выход</th>
                        <th className="py-2 px-3">Объем</th>
                        <th className="py-2 px-3">Комиссии</th>
                        <th className="py-2 px-3">Своп</th>
                        <th className="py-2 px-3">Чистый PnL</th>
                        <th className="py-2 px-3">Доходность</th>
                        <th className="py-2 px-3">Причина</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39]/50">
                      {closedTrades.map((t) => (
                        <tr key={t.id} className="hover:bg-[#131722]/60 transition-colors">
                          <td className="py-2 px-3 font-semibold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                t.side === 'long'
                                  ? 'bg-tv-green/20 text-tv-green'
                                  : 'bg-tv-red/20 text-tv-red'
                              }`}
                            >
                              {t.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-tv-textMuted">
                            {formatDateTime(t.entryTime)}
                          </td>
                          <td className="py-2 px-3 text-white">${formatPrice(t.entryPrice)}</td>
                          <td className="py-2 px-3 text-white">${formatPrice(t.exitPrice)}</td>
                          <td className="py-2 px-3">{t.size} BTC</td>
                          <td className="py-2 px-3 text-tv-textMuted">
                            -${(t.feeOpen + t.feeClose).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-tv-textMuted">
                            -${Math.abs(t.swapFee).toFixed(2)}
                          </td>
                          <td
                            className={`py-2 px-3 font-semibold ${
                              t.netPnl >= 0 ? 'text-tv-green' : 'text-tv-red'
                            }`}
                          >
                            {formatCurrency(t.netPnl)}
                          </td>
                          <td
                            className={`py-2 px-3 ${
                              t.netPnl >= 0 ? 'text-tv-green' : 'text-tv-red'
                            }`}
                          >
                            {formatPercent(t.returnPercent)}
                          </td>
                          <td className="py-2 px-3 text-tv-textMuted capitalize">
                            {t.closeReason === 'take_profit' ? (
                              <span className="text-tv-green font-medium">Take Profit</span>
                            ) : t.closeReason === 'stop_loss' ? (
                              <span className="text-tv-red font-medium">Stop Loss</span>
                            ) : (
                              'Ручное'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-tv-textMuted">
                  Сделок пока нет. Войдите в позицию и сделайте шаг вперед в симуляторе.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: METRICS & ANALYTICS */}
          {activeTab === 'metrics' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <div className="p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                <div className="text-[10px] text-tv-textMuted uppercase font-semibold">
                  Всего трейдов
                </div>
                <div className="text-base font-bold text-white mt-1 font-mono">
                  {metrics.totalTrades}
                </div>
              </div>

              <div className="p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                <div className="text-[10px] text-tv-textMuted uppercase font-semibold">Винрейт</div>
                <div className="text-base font-bold text-tv-green mt-1 font-mono">
                  {metrics.winRate}%
                </div>
              </div>

              <div className="p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                <div className="text-[10px] text-tv-textMuted uppercase font-semibold">
                  Чистая прибыль
                </div>
                <div
                  className={`text-base font-bold mt-1 font-mono ${
                    metrics.netProfit >= 0 ? 'text-tv-green' : 'text-tv-red'
                  }`}
                >
                  {formatCurrency(metrics.netProfit)}
                </div>
              </div>

              <div className="p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                <div className="text-[10px] text-tv-textMuted uppercase font-semibold">
                  Profit Factor
                </div>
                <div className="text-base font-bold text-white mt-1 font-mono">
                  {metrics.profitFactor > 900 ? '∞' : metrics.profitFactor}
                </div>
              </div>

              <div className="p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                <div className="text-[10px] text-tv-textMuted uppercase font-semibold">
                  Макс. просадка
                </div>
                <div className="text-base font-bold text-tv-red mt-1 font-mono">
                  ${metrics.maxDrawdown} ({metrics.maxDrawdownPercent}%)
                </div>
              </div>

              <div className="p-3 bg-[#131722] rounded-xl border border-[#2a2e39]">
                <div className="text-[10px] text-tv-textMuted uppercase font-semibold">
                  Комиссии + Свопы
                </div>
                <div className="text-base font-bold text-tv-yellow mt-1 font-mono">
                  -${(metrics.totalCommissions + metrics.totalSwaps).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
