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
  Clock,
  Code2,
  SlidersHorizontal,
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { calculateRiskPosition } from '../../services/tradeEngine';
import { formatCurrency, formatDateTime, formatPercent, formatPrice } from '../../utils/formatters';
import { ScriptEditorTab } from './ScriptEditorTab';

export const TradingPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'trade' | 'position' | 'orders' | 'history' | 'metrics' | 'scripts'>('trade');

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
    timezone,
    orderSetup,
    updateOrderSetup,
    symbolInfo,
    activeScript,
  } = useChart();

  const roundPrice = (p: number) => {
    const factor = Math.pow(10, symbolInfo.precision);
    return Math.round(p * factor) / factor;
  };

  const currentPrice = currentCandle?.close || orderSetup.entryPrice || symbolInfo.defaultPrice;

  const effectiveEntryPrice = orderSetup.orderType === 'limit'
    ? orderSetup.entryPrice
    : currentPrice;

  // Real-time Risk & Position calculation
  const riskCalc = useMemo(() => {
    return calculateRiskPosition(
      balance,
      riskSettings,
      effectiveEntryPrice,
      orderSetup.stopLoss,
      orderSetup.takeProfit,
      symbolInfo.lotPrecision,
      symbolInfo.baseAsset,
      { pipSize: symbolInfo.pipSize, pipValuePerLot: symbolInfo.pipValuePerLot }
    );
  }, [
    balance,
    riskSettings,
    effectiveEntryPrice,
    orderSetup.stopLoss,
    orderSetup.takeProfit,
    symbolInfo,
  ]);

  const handleSetSide = (side: 'long' | 'short') => {
    if (side === orderSetup.side) return;
    const entry = effectiveEntryPrice;
    const slDist = Math.abs(entry - orderSetup.stopLoss) || roundPrice(entry * 0.008);
    const tpDist = Math.abs(orderSetup.takeProfit - entry) || roundPrice(slDist * 2);
    updateOrderSetup({
      enabled: true,
      side,
      stopLoss: side === 'long' ? roundPrice(entry - slDist) : roundPrice(entry + slDist),
      takeProfit: side === 'long' ? roundPrice(entry + tpDist) : roundPrice(entry - tpDist),
    });
  };

  const handleSetOrderType = (type: 'market' | 'limit') => {
    if (type === orderSetup.orderType) return;
    const entry = type === 'limit'
      ? (orderSetup.side === 'long' ? roundPrice(currentPrice * 0.995) : roundPrice(currentPrice * 1.005))
      : currentPrice;
    updateOrderSetup({
      enabled: true,
      orderType: type,
      entryPrice: entry,
    });
  };

  const handleExecuteTrade = (side: 'long' | 'short') => {
    if (orderSetup.orderType === 'market') {
      executeTrade(side, orderSetup.stopLoss, orderSetup.takeProfit);
      updateOrderSetup({ enabled: false });
      setActiveTab('position');
    } else {
      const success = addLimitOrder(side, orderSetup.entryPrice, orderSetup.stopLoss, orderSetup.takeProfit);
      if (success) {
        updateOrderSetup({ enabled: false });
        setActiveTab('orders');
      }
    }
  };

  const handleExportCsv = () => {
    if (closedTrades.length === 0) return;
    const headers = ['ID', 'Side', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', `Size`, 'Gross PnL', 'Net PnL', 'Return %', 'Reason'];
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
      t.returnPercent,
      t.closeReason,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const netPnlTotal = balance - initialBalance;
  const netPnlTotalPercent = initialBalance > 0 ? (netPnlTotal / initialBalance) * 100 : 0;

  return (
    <div className="border-t border-[#242731] bg-[#161922] select-none flex flex-col shrink-0 font-sans">
      {/* Bottom Bar: Clean Tab Navigation & Account Summary */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-[#242731] bg-[#131722]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#787b86] hover:text-white rounded transition-colors cursor-pointer"
            title={isExpanded ? 'Свернуть панель' : 'Развернуть панель'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('trade'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'trade' && isExpanded
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-[#2962ff]" />
              <span>Торговля</span>
            </button>

            <button
              onClick={() => { setActiveTab('position'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'position' && isExpanded
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              <span>Позиция</span>
              {activePosition && (
                <span className={`w-1.5 h-1.5 rounded-full ${activePosition.side === 'long' ? 'bg-[#089981]' : 'bg-[#f23645]'}`} />
              )}
            </button>

            <button
              onClick={() => { setActiveTab('orders'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'orders' && isExpanded
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Ордера ({limitOrders.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('history'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history' && isExpanded
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Сделки ({closedTrades.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('metrics'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'metrics' && isExpanded
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Статистика</span>
            </button>

            <button
              onClick={() => { setActiveTab('scripts'); setIsExpanded(true); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'scripts' && isExpanded
                  ? 'bg-[#242731] text-white font-semibold'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#1e222d]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Pine Скрипт</span>
              {activeScript && <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />}
            </button>
          </div>
        </div>

        {/* Right Account Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-1.5">
            <span className="text-[#787b86]">Депозит:</span>
            <span className="font-semibold text-white">{formatCurrency(balance, 2)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#787b86]">PnL:</span>
            <span className={`font-semibold ${netPnlTotal >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {formatCurrency(netPnlTotal, 2, { showPlus: true })} ({formatPercent(netPnlTotalPercent)})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">Винрейт:</span>
            <span className="font-semibold text-white">{metrics.winRate}%</span>
          </div>

          <button
            onClick={resetBacktest}
            title="Сбросить сделки и восстановить стартовый баланс"
            className="p-1 text-[#787b86] hover:text-white hover:bg-[#1e222d] rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Drawer Content */}
      {isExpanded && (
        <div className="p-4 bg-[#141720] min-h-[220px] max-h-[340px] overflow-y-auto">
          {/* TAB 1: ORDER ENTRY & LIVE RISK CALCULATION */}
          {activeTab === 'trade' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto">
              {/* Left Column: Order Setup Controls (No box nesting!) */}
              <div className="md:col-span-6 space-y-3.5">
                {/* Header & Chart SL/TP Toggle */}
                <div className="flex items-center justify-between pb-0.5">
                  <span className="text-[10px] font-semibold text-[#787b86] uppercase tracking-wide">Параметры ордера</span>
                  <button
                    onClick={() => updateOrderSetup({ enabled: !orderSetup.enabled })}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      orderSetup.enabled
                        ? 'bg-[#089981]/20 text-[#089981] border border-[#089981]/40'
                        : 'bg-[#10121a] text-[#787b86] hover:text-white border border-[#242731]'
                    }`}
                    title="Включить/выключить отображение и перетаскивание линий SL/TP прямо на графике"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${orderSetup.enabled ? 'bg-[#089981]' : 'bg-[#787b86]'}`} />
                    <span>Линии SL / TP на графике: {orderSetup.enabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
                  </button>
                </div>

                {/* Order Type & Side Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Market vs Limit */}
                  <div className="flex bg-[#10121a] p-0.5 rounded border border-[#242731]">
                    <button
                      onClick={() => handleSetOrderType('market')}
                      className={`flex-1 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        orderSetup.orderType === 'market'
                          ? 'bg-[#242731] text-white font-semibold'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                    >
                      Market
                    </button>
                    <button
                      onClick={() => handleSetOrderType('limit')}
                      className={`flex-1 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                        orderSetup.orderType === 'limit'
                          ? 'bg-[#242731] text-white font-semibold'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                    >
                      Limit
                    </button>
                  </div>

                  {/* Long vs Short */}
                  <div className="flex bg-[#10121a] p-0.5 rounded border border-[#242731]">
                    <button
                      onClick={() => handleSetSide('long')}
                      className={`flex-1 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                        orderSetup.side === 'long'
                          ? 'bg-[#089981] text-white'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                    >
                      Long
                    </button>
                    <button
                      onClick={() => handleSetSide('short')}
                      className={`flex-1 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                        orderSetup.side === 'short'
                          ? 'bg-[#f23645] text-white'
                          : 'text-[#787b86] hover:text-white'
                      }`}
                    >
                      Short
                    </button>
                  </div>
                </div>

                {/* Risk Setting Row */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#787b86]">Риск:</span>
                    <div className="flex bg-[#10121a] p-0.5 rounded border border-[#242731]">
                      <button
                        onClick={() => updateRiskSettings({ mode: 'percent' })}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          riskSettings.mode === 'percent' ? 'bg-[#2962ff] text-white font-bold' : 'text-[#787b86]'
                        }`}
                      >
                        %
                      </button>
                      <button
                        onClick={() => updateRiskSettings({ mode: 'usd' })}
                        className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                          riskSettings.mode === 'usd' ? 'bg-[#2962ff] text-white font-bold' : 'text-[#787b86]'
                        }`}
                      >
                        $
                      </button>
                    </div>
                  </div>

                  {/* Quick Risk Presets */}
                  <div className="flex items-center gap-1.5">
                    {[0.5, 1.0, 2.0].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => updateRiskSettings({ mode: 'percent', riskPercent: pct })}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                          riskSettings.mode === 'percent' && riskSettings.riskPercent === pct
                            ? 'bg-[#242731] text-white font-semibold'
                            : 'text-[#787b86] hover:text-white'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    step={riskSettings.mode === 'percent' ? 0.25 : 100}
                    value={riskSettings.mode === 'percent' ? riskSettings.riskPercent : riskSettings.riskUsd}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (riskSettings.mode === 'percent') {
                        updateRiskSettings({ riskPercent: val });
                      } else {
                        updateRiskSettings({ riskUsd: val });
                      }
                    }}
                    className="w-24 px-2 py-1 bg-[#10121a] border border-[#242731] rounded text-right font-mono text-white text-xs outline-none focus:border-[#2962ff]"
                  />
                </div>

                {/* Limit Entry Price (if applicable) */}
                {orderSetup.orderType === 'limit' && (
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#787b86]">Лимитная цена:</span>
                    <input
                      type="number"
                      step={symbolInfo.minMove}
                      value={orderSetup.entryPrice}
                      onChange={(e) => updateOrderSetup({ entryPrice: parseFloat(e.target.value) || effectiveEntryPrice })}
                      className="w-36 px-2.5 py-1 bg-[#10121a] border border-[#242731] rounded text-right font-mono text-white text-xs outline-none focus:border-[#2962ff]"
                    />
                  </div>
                )}

                {/* Stop Loss & Take Profit */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[#787b86] text-[11px] mb-1">Stop Loss</div>
                    <input
                      type="number"
                      step={symbolInfo.minMove}
                      value={orderSetup.stopLoss}
                      onChange={(e) => updateOrderSetup({ stopLoss: parseFloat(e.target.value) || 0, enabled: true })}
                      className="w-full px-2.5 py-1.5 bg-[#10121a] border border-[#242731] rounded font-mono text-white text-xs outline-none focus:border-[#2962ff]"
                    />
                  </div>

                  <div>
                    <div className="text-[#787b86] text-[11px] mb-1">Take Profit</div>
                    <input
                      type="number"
                      step={symbolInfo.minMove}
                      value={orderSetup.takeProfit}
                      onChange={(e) => updateOrderSetup({ takeProfit: parseFloat(e.target.value) || 0, enabled: true })}
                      className="w-full px-2.5 py-1.5 bg-[#10121a] border border-[#242731] rounded font-mono text-white text-xs outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: High-Clarity Calculation & Execution CTA */}
              <div className="md:col-span-6 flex flex-col justify-between border-l border-[#242731] pl-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <div className="text-[#787b86] text-[10px] uppercase">Объем позиции</div>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {riskCalc.sizeAsset} <span className="text-xs text-[#787b86] font-normal">{symbolInfo.assetClass === 'forex' ? 'lots' : symbolInfo.baseAsset}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[#787b86] text-[10px] uppercase">Соотношение R:R</div>
                    <div className="text-xl font-bold text-white mt-0.5">
                      1 : {riskCalc.riskRewardRatio.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[#787b86] text-[10px] uppercase">Риск (убыток)</div>
                    <div className="text-sm font-semibold text-[#f23645] mt-0.5">
                      -{formatCurrency(riskCalc.riskUsd, 2)}
                    </div>
                  </div>

                  <div>
                    <div className="text-[#787b86] text-[10px] uppercase">Потенциал (профит)</div>
                    <div className="text-sm font-semibold text-[#089981] mt-0.5">
                      +{formatCurrency(riskCalc.potentialProfitUsd, 2)}
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => handleExecuteTrade(orderSetup.side)}
                  className={`w-full py-2.5 rounded font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-lg ${
                    orderSetup.side === 'long'
                      ? 'bg-[#089981] hover:bg-[#067a67] text-white shadow-[#089981]/20'
                      : 'bg-[#f23645] hover:bg-[#d32635] text-white shadow-[#f23645]/20'
                  }`}
                >
                  {orderSetup.orderType === 'market'
                    ? `Открыть ${orderSetup.side.toUpperCase()} по ${formatPrice(currentPrice, symbolInfo.precision)}`
                    : `Выставить Limit ${orderSetup.side.toUpperCase()} по ${formatPrice(orderSetup.entryPrice, symbolInfo.precision)}`}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVE POSITION */}
          {activeTab === 'position' && (
            <div>
              {activePosition ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#242731]">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold uppercase font-mono ${
                          activePosition.side === 'long' ? 'bg-[#089981]/20 text-[#089981]' : 'bg-[#f23645]/20 text-[#f23645]'
                        }`}
                      >
                        {activePosition.side}
                      </span>
                      <span className="font-semibold text-sm text-white font-mono">{symbolInfo.symbol}</span>
                      <span className="text-xs text-[#787b86] font-mono">
                        Объем: {activePosition.size} {symbolInfo.baseAsset}
                      </span>
                    </div>

                    <button
                      onClick={closeActivePosition}
                      className="px-3 py-1 bg-[#f23645] hover:bg-[#d32635] text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Закрыть по рынку
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
                    <div>
                      <div className="text-[#787b86]">Вход</div>
                      <div className="text-white font-medium">{formatPrice(activePosition.entryPrice, symbolInfo.precision)}</div>
                    </div>
                    <div>
                      <div className="text-[#787b86]">Текущая цена</div>
                      <div className="text-white font-medium">{formatPrice(activePosition.currentPrice, symbolInfo.precision)}</div>
                    </div>
                    <div>
                      <div className="text-[#787b86]">Stop Loss</div>
                      <div className="text-[#f23645] font-medium">{activePosition.stopLoss ? formatPrice(activePosition.stopLoss, symbolInfo.precision) : '—'}</div>
                    </div>
                    <div>
                      <div className="text-[#787b86]">Take Profit</div>
                      <div className="text-[#089981] font-medium">{activePosition.takeProfit ? formatPrice(activePosition.takeProfit, symbolInfo.precision) : '—'}</div>
                    </div>
                    <div>
                      <div className="text-[#787b86]">Нереализованный PnL</div>
                      <div className={`font-bold ${activePosition.unrealizedNetPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {formatCurrency(activePosition.unrealizedNetPnl, 2, { showPlus: true })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-[#787b86]">
                  Нет открытых позиций в текущей симуляции
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIMIT ORDERS */}
          {activeTab === 'orders' && (
            <div>
              {limitOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#787b86]">
                  Нет активных лимитных ордеров
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-[#787b86] border-b border-[#242731]">
                      <th className="pb-2 font-medium">Тип</th>
                      <th className="pb-2 font-medium">Лимитная цена</th>
                      <th className="pb-2 font-medium">Объем</th>
                      <th className="pb-2 font-medium">Stop Loss</th>
                      <th className="pb-2 font-medium">Take Profit</th>
                      <th className="pb-2 font-medium text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242731]">
                    {limitOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#1e222d] transition-colors">
                        <td className="py-2">
                          <span className={ord.side === 'long' ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                            LIMIT {ord.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 text-white">{formatPrice(ord.limitPrice, symbolInfo.precision)}</td>
                        <td className="py-2 text-[#d1d4dc]">{ord.size}</td>
                        <td className="py-2 text-[#f23645]">{ord.stopLoss ? formatPrice(ord.stopLoss, symbolInfo.precision) : '—'}</td>
                        <td className="py-2 text-[#089981]">{ord.takeProfit ? formatPrice(ord.takeProfit, symbolInfo.precision) : '—'}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => cancelLimitOrder(ord.id)}
                            className="px-2 py-0.5 text-xs text-[#f23645] hover:bg-[#f23645]/10 rounded"
                          >
                            Отменить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: TRADES HISTORY */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#242731]">
                <span className="text-xs text-[#787b86]">Всего сделок: {closedTrades.length}</span>
                {closedTrades.length > 0 && (
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-[#242731] hover:bg-[#2e3240] text-[#d1d4dc] hover:text-white rounded text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Экспорт CSV</span>
                  </button>
                )}
              </div>

              {closedTrades.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#787b86]">
                  История сделок пуста. Совершите первую сделку на графике.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-[#787b86] border-b border-[#242731]">
                        <th className="pb-1.5 font-medium">Направление</th>
                        <th className="pb-1.5 font-medium">Вход</th>
                        <th className="pb-1.5 font-medium">Выход</th>
                        <th className="pb-1.5 font-medium">Объем</th>
                        <th className="pb-1.5 font-medium">Чистый PnL</th>
                        <th className="pb-1.5 font-medium">Причина</th>
                        <th className="pb-1.5 font-medium text-right">Время выхода</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242731]">
                      {closedTrades.slice().reverse().map((t) => (
                        <tr key={t.id} className="hover:bg-[#1e222d] transition-colors">
                          <td className="py-2">
                            <span className={t.side === 'long' ? 'text-[#089981] font-semibold' : 'text-[#f23645] font-semibold'}>
                              {t.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 text-white">{formatPrice(t.entryPrice, symbolInfo.precision)}</td>
                          <td className="py-2 text-white">{formatPrice(t.exitPrice, symbolInfo.precision)}</td>
                          <td className="py-2 text-[#d1d4dc]">{t.size}</td>
                          <td className={`py-2 font-bold ${t.netPnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                            {formatCurrency(t.netPnl, 2, { showPlus: true })}
                          </td>
                          <td className="py-2 text-[#787b86] capitalize">{t.closeReason.replace('_', ' ')}</td>
                          <td className="py-2 text-right text-[#787b86]">{formatDateTime(t.exitTime, timezone)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BACKTEST METRICS */}
          {activeTab === 'metrics' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#10121a] rounded">
                <div className="text-[#787b86]">Винрейт</div>
                <div className="text-xl font-bold text-white mt-1">{metrics.winRate}%</div>
                <div className="text-[10px] text-[#787b86] mt-0.5">{metrics.wins} плюсов / {metrics.losses} минусов</div>
              </div>

              <div className="p-3 bg-[#10121a] rounded">
                <div className="text-[#787b86]">Profit Factor</div>
                <div className="text-xl font-bold text-white mt-1">{metrics.profitFactor}</div>
                <div className="text-[10px] text-[#787b86] mt-0.5">Отношение валовой прибыли к убытку</div>
              </div>

              <div className="p-3 bg-[#10121a] rounded">
                <div className="text-[#787b86]">Чистая прибыль</div>
                <div className={`text-xl font-bold mt-1 ${metrics.netProfit >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {formatCurrency(metrics.netProfit, 2, { showPlus: true })}
                </div>
                <div className="text-[10px] text-[#787b86] mt-0.5">С учетом комиссий и свопов</div>
              </div>

              <div className="p-3 bg-[#10121a] rounded">
                <div className="text-[#787b86]">Макс. просадка</div>
                <div className="text-xl font-bold text-[#f23645] mt-1">
                  {formatPercent(metrics.maxDrawdownPercent)}
                </div>
                <div className="text-[10px] text-[#787b86] mt-0.5">{formatCurrency(metrics.maxDrawdown, 2)}</div>

              </div>
            </div>
          )}

          {/* TAB 6: PINE SCRIPTS */}
          {activeTab === 'scripts' && (
            <ScriptEditorTab />
          )}
        </div>
      )}
    </div>
  );
};
