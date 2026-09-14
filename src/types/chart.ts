export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w';

export type TimezoneId =
  | 'UTC'
  | 'Europe/Moscow'
  | 'Europe/Kyiv'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'America/New_York'
  | 'America/Chicago'
  | 'America/Los_Angeles'
  | 'Asia/Dubai'
  | 'Asia/Singapore'
  | 'Asia/Tokyo';

export interface OrderSetupPreview {
  enabled: boolean;
  side: 'long' | 'short';
  orderType: 'market' | 'limit';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

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
  showVolume: boolean;
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
  fillColor?: string;
  fillOpacity?: number;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed';
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

// ==========================================
// Market Sessions & Killzones
// ==========================================
export type MarketSessionId = 'asia' | 'london' | 'newyork' | 'asia_kz' | 'london_kz' | 'ny_kz';

export interface MarketSessionConfig {
  id: MarketSessionId;
  name: string;
  enabled: boolean;
  startHour: number;   // UTC hour 0-23
  startMinute: number; // 0-59
  endHour: number;     // UTC hour 0-23
  endMinute: number;   // 0-59
  color: string;       // Hex or rgba
  bgOpacity: number;   // 0.05 to 0.3
  showHighLow: boolean;
  showLabel: boolean;
}

export interface MarketSessionsSettings {
  enabled: boolean;
  showHighLow: boolean;
  showLabels: boolean;
  sessions: Record<string, MarketSessionConfig>;
}

// ==========================================
// Custom Scripts & Pine Engine
// ==========================================
export interface PlottedLine {
  id: string;
  name: string;
  color: string;
  lineWidth?: number;
  data: Array<{ time: number; value: number }>;
}

export interface PlottedMarker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  color: string;
  text?: string;
}

export interface PlottedBox {
  id: string;
  startTime: number;
  endTime: number;
  high: number;
  low: number;
  color: string;
  fillOpacity?: number;
  label?: string;
}

export interface ScriptOutput {
  success: boolean;
  executionTimeMs: number;
  error?: string;
  logs: string[];
  lines: PlottedLine[];
  markers: PlottedMarker[];
  boxes: PlottedBox[];
}

export interface CustomScript {
  id: string;
  name: string;
  description?: string;
  code: string;
  updatedAt: number;
}

