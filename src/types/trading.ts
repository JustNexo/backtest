export type PositionSide = 'long' | 'short';

export type CloseReason = 'take_profit' | 'stop_loss' | 'market_close' | 'manual';

export interface Position {
  id: string;
  side: PositionSide;
  entryTime: number;
  entryPrice: number;
  size: number; // in BTC
  notionalValue: number; // size * entryPrice in USDT
  stopLoss: number | null;
  takeProfit: number | null;
  currentPrice: number;
  unrealizedGrossPnl: number;
  unrealizedNetPnl: number;
  accumulatedSwap: number;
  feeOpen: number;
  lastSwapCheckTime: number;
}

export interface LimitOrder {
  id: string;
  side: PositionSide;
  limitPrice: number;
  size: number; // in BTC
  stopLoss: number | null;
  takeProfit: number | null;
  createdTime: number;
  riskUsd: number;
}

export interface ClosedTrade {
  id: string;
  side: PositionSide;
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  size: number; // in BTC
  notionalValue: number;
  stopLoss: number | null;
  takeProfit: number | null;
  grossPnl: number;
  feeOpen: number;
  feeClose: number;
  swapFee: number;
  netPnl: number;
  returnPercent: number;
  closeReason: CloseReason;
}

export interface RiskSettings {
  mode: 'percent' | 'usd';
  riskPercent: number; // e.g. 1.0 = 1% of balance
  riskUsd: number; // e.g. 100 USD
  defaultSlPips: number;
  defaultTpRatio: number; // e.g. 2.0 = 1:2 R:R
}

export interface BacktestMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number; // percent 0-100
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  totalCommissions: number;
  totalSwaps: number;
}
