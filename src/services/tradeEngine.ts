import { Candle, PropFirmFeeSettings } from '../types/chart';
import { BacktestMetrics, ClosedTrade, Position, PositionSide, RiskSettings } from '../types/trading';

export const DEFAULT_PROP_FIRM_SETTINGS: PropFirmFeeSettings = {
  presetName: 'funding_pips',
  feeType: 'percentage',
  commissionPercent: 0.05, // 0.05% per side (Funding Pips standard)
  commissionPerLot: 2.50,  // 2.50 USD per 1 BTC
  swapLongDailyPercent: -0.03, // -0.03% per day
  swapShortDailyPercent: -0.01, // -0.01% per day
  swapIntervalHours: 24, // 00:00 UTC rollover
};

export const PROP_FIRM_PRESETS: Record<string, PropFirmFeeSettings> = {
  funding_pips: {
    presetName: 'funding_pips',
    feeType: 'percentage',
    commissionPercent: 0.05,
    commissionPerLot: 2.50,
    swapLongDailyPercent: -0.03,
    swapShortDailyPercent: -0.01,
    swapIntervalHours: 24,
  },
  ftmo: {
    presetName: 'ftmo',
    feeType: 'percentage',
    commissionPercent: 0.06,
    commissionPerLot: 3.00,
    swapLongDailyPercent: -0.035,
    swapShortDailyPercent: -0.015,
    swapIntervalHours: 24,
  },
  binance_vip0: {
    presetName: 'binance_vip0',
    feeType: 'percentage',
    commissionPercent: 0.04, // Taker 0.04%
    commissionPerLot: 0,
    swapLongDailyPercent: -0.03, // 8h funding rate avg ~0.01% per 8h
    swapShortDailyPercent: 0.01,
    swapIntervalHours: 8,
  },
  zero_fee: {
    presetName: 'zero_fee',
    feeType: 'percentage',
    commissionPercent: 0,
    commissionPerLot: 0,
    swapLongDailyPercent: 0,
    swapShortDailyPercent: 0,
    swapIntervalHours: 24,
  },
};

/**
 * MetaTrader style Risk Calculator:
 * Calculates required position size (BTC) given account balance, risk %, entry, and SL.
 */
export function calculateRiskPosition(
  balance: number,
  riskSettings: RiskSettings,
  entryPrice: number,
  stopLossPrice: number,
  takeProfitPrice?: number
): {
  riskUsd: number;
  stopDistance: number;
  stopDistancePercent: number;
  sizeBtc: number;
  notionalUsdt: number;
  potentialProfitUsd: number;
  riskRewardRatio: number;
  isValid: boolean;
  error?: string;
} {
  if (entryPrice <= 0 || stopLossPrice <= 0) {
    return {
      riskUsd: 0,
      stopDistance: 0,
      stopDistancePercent: 0,
      sizeBtc: 0,
      notionalUsdt: 0,
      potentialProfitUsd: 0,
      riskRewardRatio: 0,
      isValid: false,
      error: 'Цена входа и Stop Loss должны быть больше 0',
    };
  }

  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  if (stopDistance === 0) {
    return {
      riskUsd: 0,
      stopDistance: 0,
      stopDistancePercent: 0,
      sizeBtc: 0,
      notionalUsdt: 0,
      potentialProfitUsd: 0,
      riskRewardRatio: 0,
      isValid: false,
      error: 'Stop Loss не может совпадать с ценой входа',
    };
  }

  const stopDistancePercent = (stopDistance / entryPrice) * 100;
  const riskUsd = riskSettings.mode === 'percent'
    ? balance * (riskSettings.riskPercent / 100)
    : riskSettings.riskUsd;

  // Formula: Size = Risk $ / Stop Distance
  const sizeBtc = Number((riskUsd / stopDistance).toFixed(4));
  const notionalUsdt = Number((sizeBtc * entryPrice).toFixed(2));

  let potentialProfitUsd = 0;
  let riskRewardRatio = 0;

  if (takeProfitPrice && takeProfitPrice > 0) {
    const tpDistance = Math.abs(takeProfitPrice - entryPrice);
    potentialProfitUsd = Number((sizeBtc * tpDistance).toFixed(2));
    riskRewardRatio = Number((tpDistance / stopDistance).toFixed(2));
  }

  return {
    riskUsd: Number(riskUsd.toFixed(2)),
    stopDistance: Number(stopDistance.toFixed(2)),
    stopDistancePercent: Number(stopDistancePercent.toFixed(2)),
    sizeBtc,
    notionalUsdt,
    potentialProfitUsd,
    riskRewardRatio,
    isValid: sizeBtc > 0,
  };
}

/**
 * Calculates open/close commission fee based on Prop Firm settings
 */
export function calculateCommission(
  notionalValue: number,
  sizeBtc: number,
  settings: PropFirmFeeSettings
): number {
  if (settings.feeType === 'per_lot') {
    return Number((sizeBtc * settings.commissionPerLot).toFixed(4));
  }
  return Number((notionalValue * (settings.commissionPercent / 100)).toFixed(4));
}

/**
 * Calculates swap / rollover fees accumulated between two timestamps
 */
export function calculateAccumulatedSwap(
  side: PositionSide,
  notionalValue: number,
  fromTime: number,
  toTime: number,
  settings: PropFirmFeeSettings
): number {
  if (toTime <= fromTime) return 0;
  const intervalSeconds = settings.swapIntervalHours * 3600;
  const periods = Math.floor((toTime - fromTime) / intervalSeconds);
  if (periods <= 0) return 0;

  // Daily rate or period rate
  const dailyRate = side === 'long'
    ? settings.swapLongDailyPercent
    : settings.swapShortDailyPercent;

  // If interval is 24h, periods = days. If 8h, 3 periods per day.
  const ratePerPeriod = (dailyRate / (24 / settings.swapIntervalHours)) / 100;
  const swapAmount = notionalValue * ratePerPeriod * periods;
  return Number(swapAmount.toFixed(4));
}

/**
 * Creates a new Position
 */
export function openPosition(
  side: PositionSide,
  entryPrice: number,
  size: number,
  stopLoss: number | null,
  takeProfit: number | null,
  entryTime: number,
  feeSettings: PropFirmFeeSettings
): Position {
  const notionalValue = Number((size * entryPrice).toFixed(2));
  const feeOpen = calculateCommission(notionalValue, size, feeSettings);

  return {
    id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    side,
    entryTime,
    entryPrice,
    size,
    notionalValue,
    stopLoss,
    takeProfit,
    currentPrice: entryPrice,
    unrealizedGrossPnl: 0,
    unrealizedNetPnl: -feeOpen,
    accumulatedSwap: 0,
    feeOpen,
    lastSwapCheckTime: entryTime,
  };
}

/**
 * Evaluates active position against the newly stepped candle (Bar Replay engine)
 * Checks if Take Profit or Stop Loss were hit during this candle.
 */
export function evaluatePositionWithCandle(
  position: Position,
  candle: Candle,
  feeSettings: PropFirmFeeSettings
): {
  isClosed: boolean;
  closedTrade?: ClosedTrade;
  updatedPosition?: Position;
} {
  const { side, entryPrice, size, notionalValue, stopLoss, takeProfit } = position;

  // Calculate swaps accumulated up to candle.time
  const additionalSwap = calculateAccumulatedSwap(
    side,
    notionalValue,
    position.lastSwapCheckTime,
    candle.time,
    feeSettings
  );
  const totalSwap = position.accumulatedSwap + additionalSwap;

  let hitSL = false;
  let hitTP = false;
  let exitPrice = candle.close;
  let closeReason: 'take_profit' | 'stop_loss' | 'manual' = 'manual';

  if (side === 'long') {
    if (stopLoss !== null && candle.low <= stopLoss) {
      hitSL = true;
    }
    if (takeProfit !== null && candle.high >= takeProfit) {
      hitTP = true;
    }

    if (hitSL && hitTP) {
      // Conservative: assume SL hit first if open is closer to SL, or if candle is bearish
      if (candle.open < (stopLoss! + takeProfit!) / 2 || candle.close < candle.open) {
        exitPrice = stopLoss!;
        closeReason = 'stop_loss';
      } else {
        exitPrice = takeProfit!;
        closeReason = 'take_profit';
      }
    } else if (hitSL) {
      exitPrice = stopLoss!;
      closeReason = 'stop_loss';
    } else if (hitTP) {
      exitPrice = takeProfit!;
      closeReason = 'take_profit';
    }
  } else {
    // Short
    if (stopLoss !== null && candle.high >= stopLoss) {
      hitSL = true;
    }
    if (takeProfit !== null && candle.low <= takeProfit) {
      hitTP = true;
    }

    if (hitSL && hitTP) {
      if (candle.open > (stopLoss! + takeProfit!) / 2 || candle.close > candle.open) {
        exitPrice = stopLoss!;
        closeReason = 'stop_loss';
      } else {
        exitPrice = takeProfit!;
        closeReason = 'take_profit';
      }
    } else if (hitSL) {
      exitPrice = stopLoss!;
      closeReason = 'stop_loss';
    } else if (hitTP) {
      exitPrice = takeProfit!;
      closeReason = 'take_profit';
    }
  }

  // If position triggered SL or TP
  if (hitSL || hitTP) {
    const exitNotional = size * exitPrice;
    const feeClose = calculateCommission(exitNotional, size, feeSettings);
    const grossPnl = side === 'long'
      ? (exitPrice - entryPrice) * size
      : (entryPrice - exitPrice) * size;
    const netPnl = grossPnl - position.feeOpen - feeClose + totalSwap;
    const returnPercent = (grossPnl / notionalValue) * 100;

    const closedTrade: ClosedTrade = {
      id: position.id,
      side,
      entryTime: position.entryTime,
      entryPrice,
      exitTime: candle.time,
      exitPrice,
      size,
      notionalValue,
      stopLoss,
      takeProfit,
      grossPnl: Number(grossPnl.toFixed(2)),
      feeOpen: position.feeOpen,
      feeClose: Number(feeClose.toFixed(2)),
      swapFee: Number(totalSwap.toFixed(2)),
      netPnl: Number(netPnl.toFixed(2)),
      returnPercent: Number(returnPercent.toFixed(2)),
      closeReason,
    };

    return {
      isClosed: true,
      closedTrade,
    };
  }

  // Position remains open: update unrealized PnL
  const currentPrice = candle.close;
  const grossPnl = side === 'long'
    ? (currentPrice - entryPrice) * size
    : (entryPrice - currentPrice) * size;
  const estimatedExitFee = calculateCommission(size * currentPrice, size, feeSettings);
  const netPnl = grossPnl - position.feeOpen - estimatedExitFee + totalSwap;

  const updatedPosition: Position = {
    ...position,
    currentPrice,
    unrealizedGrossPnl: Number(grossPnl.toFixed(2)),
    unrealizedNetPnl: Number(netPnl.toFixed(2)),
    accumulatedSwap: Number(totalSwap.toFixed(2)),
    lastSwapCheckTime: candle.time,
  };

  return {
    isClosed: false,
    updatedPosition,
  };
}

/**
 * Closes position manually at current market price
 */
export function closePositionManually(
  position: Position,
  exitPrice: number,
  exitTime: number,
  feeSettings: PropFirmFeeSettings
): ClosedTrade {
  const { side, entryPrice, size, notionalValue, stopLoss, takeProfit } = position;
  const exitNotional = size * exitPrice;
  const feeClose = calculateCommission(exitNotional, size, feeSettings);
  const grossPnl = side === 'long'
    ? (exitPrice - entryPrice) * size
    : (entryPrice - exitPrice) * size;
  const netPnl = grossPnl - position.feeOpen - feeClose + position.accumulatedSwap;
  const returnPercent = (grossPnl / notionalValue) * 100;

  return {
    id: position.id,
    side,
    entryTime: position.entryTime,
    entryPrice,
    exitTime,
    exitPrice,
    size,
    notionalValue,
    stopLoss,
    takeProfit,
    grossPnl: Number(grossPnl.toFixed(2)),
    feeOpen: position.feeOpen,
    feeClose: Number(feeClose.toFixed(2)),
    swapFee: Number(position.accumulatedSwap.toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)),
    returnPercent: Number(returnPercent.toFixed(2)),
    closeReason: 'manual',
  };
}

/**
 * Calculates overall backtest performance metrics from closed trades
 */
export function calculateMetrics(trades: ClosedTrade[], initialBalance: number): BacktestMetrics {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      totalCommissions: 0,
      totalSwaps: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalCommissions = 0;
  let totalSwaps = 0;

  let currentBalance = initialBalance;
  let peakBalance = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  for (const t of trades) {
    totalCommissions += (t.feeOpen + t.feeClose);
    totalSwaps += t.swapFee;

    if (t.netPnl > 0) {
      wins++;
      grossProfit += t.netPnl;
    } else {
      losses++;
      grossLoss += Math.abs(t.netPnl);
    }

    currentBalance += t.netPnl;
    if (currentBalance > peakBalance) {
      peakBalance = currentBalance;
    }
    const dd = peakBalance - currentBalance;
    const ddPercent = peakBalance > 0 ? (dd / peakBalance) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
    if (ddPercent > maxDrawdownPercent) {
      maxDrawdownPercent = ddPercent;
    }
  }

  const netProfit = grossProfit - grossLoss;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: Number(winRate.toFixed(1)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(1)),
    totalCommissions: Number(totalCommissions.toFixed(2)),
    totalSwaps: Number(totalSwaps.toFixed(2)),
  };
}
