import { ClosedTrade, LimitOrder, Position } from './trading';
import { Timeframe } from './chart';

export type AssetClass = 'crypto' | 'forex' | 'indices' | 'metals';

export type SupportedSymbol =
  | 'BTCUSDT.P'
  | 'ETHUSDT.P'
  | 'SOLUSDT.P'
  | 'EURUSD'
  | 'GBPUSD'
  | 'USDJPY'
  | 'AUDUSD'
  | 'USDCAD'
  | 'USDCHF'
  | 'XAUUSD'
  | 'US100'
  | 'US500'
  | 'US30';

export interface SymbolInfo {
  symbol: SupportedSymbol;
  name: string;
  assetClass: AssetClass;
  baseAsset: string;
  quoteAsset: string;
  gateContract?: string;
  okxInstId?: string;
  pricePrecision: number;
  precision: number; // alias for pricePrecision
  minMove: number;
  lotPrecision: number;
  minLot: number;
  pipSize: number;
  pipValuePerLot: number; // USD per 1 standard lot per pip
  tradingHours: '24/7' | '24/5' | 'cme_indices';
  icon: string;
  color: string;
  defaultPrice: number;
}

export const SUPPORTED_SYMBOLS: Record<SupportedSymbol, SymbolInfo> = {
  // --- CRYPTO ---
  'BTCUSDT.P': {
    symbol: 'BTCUSDT.P',
    name: 'Bitcoin Perpetual',
    assetClass: 'crypto',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    gateContract: 'BTC_USDT',
    okxInstId: 'BTC-USDT-SWAP',
    pricePrecision: 1,
    precision: 1,
    minMove: 0.1,
    lotPrecision: 3,
    minLot: 0.001,
    pipSize: 1.0,
    pipValuePerLot: 1.0,
    tradingHours: '24/7',
    icon: '₿',
    color: '#f7931a',
    defaultPrice: 78000,
  },
  'ETHUSDT.P': {
    symbol: 'ETHUSDT.P',
    name: 'Ethereum Perpetual',
    assetClass: 'crypto',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    gateContract: 'ETH_USDT',
    okxInstId: 'ETH-USDT-SWAP',
    pricePrecision: 2,
    precision: 2,
    minMove: 0.01,
    lotPrecision: 3,
    minLot: 0.01,
    pipSize: 0.1,
    pipValuePerLot: 1.0,
    tradingHours: '24/7',
    icon: 'Ξ',
    color: '#627eea',
    defaultPrice: 2500,
  },
  'SOLUSDT.P': {
    symbol: 'SOLUSDT.P',
    name: 'Solana Perpetual',
    assetClass: 'crypto',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    gateContract: 'SOL_USDT',
    okxInstId: 'SOL-USDT-SWAP',
    pricePrecision: 2,
    precision: 2,
    minMove: 0.01,
    lotPrecision: 2,
    minLot: 0.1,
    pipSize: 0.01,
    pipValuePerLot: 1.0,
    tradingHours: '24/7',
    icon: '◎',
    color: '#14f195',
    defaultPrice: 130,
  },

  // --- FOREX ---
  'EURUSD': {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    assetClass: 'forex',
    baseAsset: 'EUR',
    quoteAsset: 'USD',
    pricePrecision: 5,
    precision: 5,
    minMove: 0.00001,
    lotPrecision: 2,
    minLot: 0.01,
    pipSize: 0.0001,
    pipValuePerLot: 10.0, // 1 standard lot = 100,000 EUR -> 1 pip (0.0001) = $10
    tradingHours: '24/5',
    icon: '€',
    color: '#0052b4',
    defaultPrice: 1.08500,
  },
  'GBPUSD': {
    symbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    assetClass: 'forex',
    baseAsset: 'GBP',
    quoteAsset: 'USD',
    pricePrecision: 5,
    precision: 5,
    minMove: 0.00001,
    lotPrecision: 2,
    minLot: 0.01,
    pipSize: 0.0001,
    pipValuePerLot: 10.0,
    tradingHours: '24/5',
    icon: '£',
    color: '#c8102e',
    defaultPrice: 1.29500,
  },
  'USDJPY': {
    symbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    assetClass: 'forex',
    baseAsset: 'USD',
    quoteAsset: 'JPY',
    pricePrecision: 3,
    precision: 3,
    minMove: 0.001,
    lotPrecision: 2,
    minLot: 0.01,
    pipSize: 0.01,
    pipValuePerLot: 6.7, // ~1000 JPY per pip
    tradingHours: '24/5',
    icon: '¥',
    color: '#bc002d',
    defaultPrice: 152.400,
  },
  'AUDUSD': {
    symbol: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    assetClass: 'forex',
    baseAsset: 'AUD',
    quoteAsset: 'USD',
    pricePrecision: 5,
    precision: 5,
    minMove: 0.00001,
    lotPrecision: 2,
    minLot: 0.01,
    pipSize: 0.0001,
    pipValuePerLot: 10.0,
    tradingHours: '24/5',
    icon: 'A$',
    color: '#00843d',
    defaultPrice: 0.65500,
  },
  'USDCAD': {
    symbol: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    assetClass: 'forex',
    baseAsset: 'USD',
    quoteAsset: 'CAD',
    pricePrecision: 5,
    precision: 5,
    minMove: 0.00001,
    lotPrecision: 2,
    minLot: 0.01,
    pipSize: 0.0001,
    pipValuePerLot: 7.3,
    tradingHours: '24/5',
    icon: 'C$',
    color: '#d80027',
    defaultPrice: 1.38500,
  },
  'USDCHF': {
    symbol: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    assetClass: 'forex',
    baseAsset: 'USD',
    quoteAsset: 'CHF',
    pricePrecision: 5,
    precision: 5,
    minMove: 0.00001,
    lotPrecision: 2,
    minLot: 0.01,
    pipSize: 0.0001,
    pipValuePerLot: 11.2,
    tradingHours: '24/5',
    icon: '₣',
    color: '#d52b1e',
    defaultPrice: 0.88500,
  },

  // --- METALS ---
  'XAUUSD': {
    symbol: 'XAUUSD',
    name: 'Gold / US Dollar',
    assetClass: 'metals',
    baseAsset: 'XAU',
    quoteAsset: 'USD',
    pricePrecision: 2,
    precision: 2,
    minMove: 0.01,
    lotPrecision: 2,
    minLot: 0.01,
    pipSize: 0.1,
    pipValuePerLot: 10.0, // 1 lot = 100 oz -> $1 change = $100, 0.1 move = $10
    tradingHours: '24/5',
    icon: 'Au',
    color: '#ffd700',
    defaultPrice: 2650.0,
  },

  // --- INDICES ---
  'US100': {
    symbol: 'US100',
    name: 'Nasdaq 100 Index',
    assetClass: 'indices',
    baseAsset: 'US100',
    quoteAsset: 'USD',
    pricePrecision: 1,
    precision: 1,
    minMove: 0.1,
    lotPrecision: 2,
    minLot: 0.1,
    pipSize: 1.0,
    pipValuePerLot: 20.0, // 1 point = $20 per full contract
    tradingHours: 'cme_indices',
    icon: 'NQ',
    color: '#00a4e4',
    defaultPrice: 20500.0,
  },
  'US500': {
    symbol: 'US500',
    name: 'S&P 500 Index',
    assetClass: 'indices',
    baseAsset: 'US500',
    quoteAsset: 'USD',
    pricePrecision: 1,
    precision: 1,
    minMove: 0.1,
    lotPrecision: 2,
    minLot: 0.1,
    pipSize: 1.0,
    pipValuePerLot: 50.0,
    tradingHours: 'cme_indices',
    icon: 'SP',
    color: '#ff5e00',
    defaultPrice: 5850.0,
  },
  'US30': {
    symbol: 'US30',
    name: 'Dow Jones Industrial',
    assetClass: 'indices',
    baseAsset: 'US30',
    quoteAsset: 'USD',
    pricePrecision: 0,

    precision: 0,
    minMove: 1.0,
    lotPrecision: 2,
    minLot: 0.1,
    pipSize: 1.0,
    pipValuePerLot: 5.0,
    tradingHours: 'cme_indices',
    icon: 'DJ',
    color: '#1e88e5',
    defaultPrice: 43200.0,
  },
};

export function isMarketOpen(symbol: SupportedSymbol, timestampSeconds: number = Math.floor(Date.now() / 1000)): {

  isOpen: boolean;
  statusText: string;
} {
  const info = SUPPORTED_SYMBOLS[symbol];
  if (!info || info.tradingHours === '24/7') {
    return { isOpen: true, statusText: '24/7' };
  }

  const d = new Date(timestampSeconds * 1000);
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const timeInMinutes = hour * 60 + minute;

  if (info.tradingHours === '24/5') {
    // Closes Friday 21:00 UTC, Opens Sunday 22:00 UTC
    if (day === 6) {
      return { isOpen: false, statusText: 'Закрыт (Выходной)' };
    }
    if (day === 5 && timeInMinutes >= 21 * 60) {
      return { isOpen: false, statusText: 'Закрыт до Вс 22:00' };
    }
    if (day === 0 && timeInMinutes < 22 * 60) {
      return { isOpen: false, statusText: 'Закрыт до 22:00' };
    }
    return { isOpen: true, statusText: 'Открыт (24/5)' };
  }

  if (info.tradingHours === 'cme_indices') {
    // Monday-Friday, 22:00 UTC to 21:00 UTC next day (1 hr daily clearing break 21:00-22:00 UTC)
    if (day === 6) {
      return { isOpen: false, statusText: 'Закрыт (Выходной)' };
    }
    if (day === 5 && timeInMinutes >= 21 * 60) {
      return { isOpen: false, statusText: 'Закрыт до Вс 22:00' };
    }
    if (day === 0 && timeInMinutes < 22 * 60) {
      return { isOpen: false, statusText: 'Закрыт до 22:00' };
    }
    // Daily clearing break 21:00 - 22:00 UTC
    if (timeInMinutes >= 21 * 60 && timeInMinutes < 22 * 60) {
      return { isOpen: false, statusText: 'Клиринг CME (до 22:00)' };
    }
    return { isOpen: true, statusText: 'Открыт (CME)' };
  }

  return { isOpen: true, statusText: 'Открыт' };
}


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
