export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartType = 'candlestick' | 'bar' | 'line' | 'area';

export interface CandleColorSettings {
  upColor: string;
  downColor: string;
  showBorders: boolean;
  borderUpColor: string;
  borderDownColor: string;
  showWicks: boolean;
  wickUpColor: string;
  wickDownColor: string;
  volumeUpColor: string;
  volumeDownColor: string;
}

export type ThemeMode = 'tv-dark' | 'slate' | 'oled' | 'light';

export interface ThemeSettings {
  theme: ThemeMode;
  backgroundColor: string;
  cardBgColor: string;
  textColor: string;
  textMutedColor: string;
  borderColor: string;
  gridColor: string;
  showVerticalGrid: boolean;
  showHorizontalGrid: boolean;
}

export interface PropFirmFeeSettings {
  presetName: 'funding_pips' | 'ftmo' | 'binance_vip0' | 'zero_fee';
  feeType: 'percentage' | 'per_lot';
  commissionPercent: number; // e.g. 0.05 means 0.05% per side
  commissionPerLot: number; // e.g. 2.50 USD per 1 BTC
  swapLongDailyPercent: number; // e.g. -0.03 means -0.03% per day
  swapShortDailyPercent: number; // e.g. -0.01 means -0.01% per day
  swapIntervalHours: number; // 24 (daily rollover 00:00 UTC) or 8 (crypto funding rate)
}

export type DrawingTool = 
  | 'cursor' 
  | 'trendline' 
  | 'horizontal' 
  | 'ray' 
  | 'rectangle' 
  | 'position_long' 
  | 'position_short' 
  | 'measure' 
  | 'eraser';

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface DrawingObject {
  id: string;
  type: DrawingTool;
  points: DrawingPoint[];
  color?: string;
  riskReward?: {
    entryPrice: number;
    stopLossPrice: number;
    takeProfitPrice: number;
  };
}

export interface ReplayState {
  isActive: boolean;
  isSelectingCutPoint: boolean;
  currentCutTime: number | null; // Cutoff timestamp in seconds
  currentIndex: number; // index in the current timeframe candle array
  isPlaying: boolean;
  playbackSpeed: number; // milliseconds per candle: 100, 250, 500, 1000, 2000
}
