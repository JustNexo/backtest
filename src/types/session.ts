import { ClosedTrade, LimitOrder, Position } from './trading';
import { Timeframe } from './chart';

export type SupportedSymbol = 'BTCUSDT.P' | 'ETHUSDT.P' | 'SOLUSDT.P';

export interface SymbolInfo {
  symbol: SupportedSymbol;
  name: string;
  baseAsset: string;
  quoteAsset: string;
  gateContract: string;
  okxInstId: string;
  pricePrecision: number;
  precision: number; // alias for pricePrecision
  minMove: number;
  lotPrecision: number;
  minLot: number;
  icon: string;
  color: string;
  defaultPrice: number;
}

export const SUPPORTED_SYMBOLS: Record<SupportedSymbol, SymbolInfo> = {
  'BTCUSDT.P': {
    symbol: 'BTCUSDT.P',
    name: 'Bitcoin Perpetual',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    gateContract: 'BTC_USDT',
    okxInstId: 'BTC-USDT-SWAP',
    pricePrecision: 1,
    precision: 1,
    minMove: 0.1,
    lotPrecision: 3,
    minLot: 0.001,
    icon: '₿',
    color: '#f7931a',
    defaultPrice: 78000,
  },
  'ETHUSDT.P': {
    symbol: 'ETHUSDT.P',
    name: 'Ethereum Perpetual',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    gateContract: 'ETH_USDT',
    okxInstId: 'ETH-USDT-SWAP',
    pricePrecision: 2,
    precision: 2,
    minMove: 0.01,
    lotPrecision: 3,
    minLot: 0.01,
    icon: 'Ξ',
    color: '#627eea',
    defaultPrice: 2500,
  },
  'SOLUSDT.P': {
    symbol: 'SOLUSDT.P',
    name: 'Solana Perpetual',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    gateContract: 'SOL_USDT',
    okxInstId: 'SOL-USDT-SWAP',
    pricePrecision: 2,
    precision: 2,
    minMove: 0.01,
    lotPrecision: 2,
    minLot: 0.1,
    icon: '◎',
    color: '#14f195',
    defaultPrice: 102,
  },
};

export type PropFirmPreset = 'funding_pips' | 'ftmo' | 'funded_next' | 'custom';

export type PropFirmStatus = 'in_progress' | 'passed' | 'daily_breach' | 'overall_breach';

export interface PropFirmRuleSettings {
  enabled: boolean;
  preset: PropFirmPreset;
  presetName: string;
  dailyLossLimitPercent: number; // e.g. 5 for 5%
  overallLossLimitPercent: number; // e.g. 10 for 10%
  profitTargetPercent: number; // e.g. 8 for 8%
  dailyCalculationBasis: 'balance' | 'equity'; // daily drawdown calculated from starting day balance or equity
}

export const DEFAULT_PROP_FIRM_PRESETS: Record<PropFirmPreset, Omit<PropFirmRuleSettings, 'enabled'>> = {
  funding_pips: {
    preset: 'funding_pips',
    presetName: 'Funding Pips (5% Daily / 10% Max / 8% Target)',
    dailyLossLimitPercent: 5,
    overallLossLimitPercent: 10,
    profitTargetPercent: 8,
    dailyCalculationBasis: 'balance',
  },
  ftmo: {
    preset: 'ftmo',
    presetName: 'FTMO (5% Daily / 10% Max / 10% Target)',
    dailyLossLimitPercent: 5,
    overallLossLimitPercent: 10,
    profitTargetPercent: 10,
    dailyCalculationBasis: 'balance',
  },
  funded_next: {
    preset: 'funded_next',
    presetName: 'FundedNext (5% Daily / 10% Max / 10% Target)',
    dailyLossLimitPercent: 5,
    overallLossLimitPercent: 10,
    profitTargetPercent: 10,
    dailyCalculationBasis: 'balance',
  },
  custom: {
    preset: 'custom',
    presetName: 'Свой набор правил (Custom)',
    dailyLossLimitPercent: 4,
    overallLossLimitPercent: 8,
    profitTargetPercent: 6,
    dailyCalculationBasis: 'balance',
  },
};

export interface BacktestSession {
  id: string;
  name: string;
  symbol: SupportedSymbol;
  timeframe: Timeframe;
  
  // Date Range (like FX Replay)
  startDate: number; // Unix timestamp in seconds
  endDate: number | null; // Unix timestamp in seconds (or null for open-ended)
  currentReplayTime: number; // Current progress in replay
  
  // Balances
  initialBalance: number;
  currentBalance: number;
  peakBalance: number;
  dayStartBalance: number;
  dayStartTime: number; // timestamp of start of current trading day
  
  // Prop Firm Evaluation
  propFirm: PropFirmRuleSettings;
  propFirmStatus: PropFirmStatus;
  breachReason: string | null;
  breachTime: number | null;
  passedTime: number | null;

  // Trades & Orders
  trades: ClosedTrade[];
  activePosition: Position | null;
  limitOrders: LimitOrder[];

  createdAt: number;
  updatedAt: number;
}
