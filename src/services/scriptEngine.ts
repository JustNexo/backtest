import { Candle, PlottedBox, PlottedLine, PlottedMarker, ScriptOutput } from '../types/chart';

// ============================================================================
// Technical Analysis (TA) Library Functions
// ============================================================================

export const ta = {
  /** Simple Moving Average */
  sma(source: number[], period: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (period <= 0 || source.length < period) return result;

    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += source[i];
    }
    result[period - 1] = sum / period;

    for (let i = period; i < source.length; i++) {
      sum += source[i] - source[i - period];
      result[i] = sum / period;
    }
    return result;
  },

  /** Exponential Moving Average */
  ema(source: number[], period: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (period <= 0 || source.length < period) return result;

    // Start with SMA for the first valid value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += source[i];
    }
    let prevEma = sum / period;
    result[period - 1] = prevEma;

    const multiplier = 2 / (period + 1);
    for (let i = period; i < source.length; i++) {
      const currentEma = (source[i] - prevEma) * multiplier + prevEma;
      result[i] = currentEma;
      prevEma = currentEma;
    }
    return result;
  },

  /** Weighted Moving Average */
  wma(source: number[], period: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (period <= 0 || source.length < period) return result;

    const denom = (period * (period + 1)) / 2;
    for (let i = period - 1; i < source.length; i++) {
      let num = 0;
      for (let j = 0; j < period; j++) {
        num += source[i - period + 1 + j] * (j + 1);
      }
      result[i] = num / denom;
    }
    return result;
  },

  /** Relative Strength Index */
  rsi(source: number[], period: number = 14): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    if (period <= 0 || source.length <= period) return result;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = source[i] - source[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = period + 1; i < source.length; i++) {
      const diff = source[i] - source[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        result[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        result[i] = 100 - 100 / (1 + rs);
      }
    }
    return result;
  },

  /** Average True Range */
  atr(candles: Candle[], period: number = 14): (number | null)[] {
    const result: (number | null)[] = new Array(candles.length).fill(null);
    if (period <= 0 || candles.length <= period) return result;

    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];
      const prevClose = candles[i - 1].close;
      const trVal = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevClose),
        Math.abs(c.low - prevClose)
      );
      tr.push(trVal);
    }

    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += tr[i];
    }
    let prevAtr = sum / period;
    result[period - 1] = prevAtr;

    for (let i = period; i < candles.length; i++) {
      const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
      result[i] = currentAtr;
      prevAtr = currentAtr;
    }
    return result;
  },

  /** Bollinger Bands */
  bollinger(
    source: number[],
    period: number = 20,
    mult: number = 2
  ): { upper: (number | null)[]; basis: (number | null)[]; lower: (number | null)[] } {
    const basis = ta.sma(source, period);
    const upper: (number | null)[] = new Array(source.length).fill(null);
    const lower: (number | null)[] = new Array(source.length).fill(null);

    for (let i = period - 1; i < source.length; i++) {
      const mean = basis[i];
      if (mean === null) continue;

      let varianceSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        varianceSum += Math.pow(source[j] - mean, 2);
      }
      const stdDev = Math.sqrt(varianceSum / period);
      upper[i] = mean + mult * stdDev;
      lower[i] = mean - mult * stdDev;
    }

    return { upper, basis, lower };
  },

  /** Highest value over period */
  highest(source: number[], period: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    for (let i = period - 1; i < source.length; i++) {
      let max = -Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (source[j] > max) max = source[j];
      }
      result[i] = max;
    }
    return result;
  },

  /** Lowest value over period */
  lowest(source: number[], period: number): (number | null)[] {
    const result: (number | null)[] = new Array(source.length).fill(null);
    for (let i = period - 1; i < source.length; i++) {
      let min = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (source[j] < min) min = source[j];
      }
      result[i] = min;
    }
    return result;
  },

  /** Crossover: Series 1 crosses above Series 2 */
  crossover(s1: (number | null)[], s2: (number | null)[]): boolean[] {
    const len = Math.min(s1.length, s2.length);
    const result: boolean[] = new Array(len).fill(false);
    for (let i = 1; i < len; i++) {
      const p1 = s1[i - 1];
      const p2 = s2[i - 1];
      const c1 = s1[i];
      const c2 = s2[i];
      if (p1 !== null && p2 !== null && c1 !== null && c2 !== null) {
        if (p1 <= p2 && c1 > c2) {
          result[i] = true;
        }
      }
    }
    return result;
  },

  /** Crossunder: Series 1 crosses below Series 2 */
  crossunder(s1: (number | null)[], s2: (number | null)[]): boolean[] {
    const len = Math.min(s1.length, s2.length);
    const result: boolean[] = new Array(len).fill(false);
    for (let i = 1; i < len; i++) {
      const p1 = s1[i - 1];
      const p2 = s2[i - 1];
      const c1 = s1[i];
      const c2 = s2[i];
      if (p1 !== null && p2 !== null && c1 !== null && c2 !== null) {
        if (p1 >= p2 && c1 < c2) {
          result[i] = true;
        }
      }
    }
    return result;
  },
};

// ============================================================================
// Built-in Script Templates
// ============================================================================

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'ema_cross',
    name: 'EMA Cross (20 / 50)',
    description: 'Две скользящие средние с сигналами пересечения тренда (BUY / SELL)',
    code: `// ----------------------------------------------------
// Торговая стратегия: Пересечение двух EMA (20 & 50)
// ----------------------------------------------------
const emaFast = ta.ema(close, 20);
const emaSlow = ta.ema(close, 50);

// Отрисовка линий на графике
plot(emaFast, { name: 'EMA 20 (Быстрая)', color: '#2962ff', lineWidth: 2 });
plot(emaSlow, { name: 'EMA 50 (Медленная)', color: '#f7a600', lineWidth: 2 });

// Сигналы пересечения
const buySignal = ta.crossover(emaFast, emaSlow);
const sellSignal = ta.crossunder(emaFast, emaSlow);

plotshape(buySignal, {
  position: 'belowBar',
  shape: 'arrowUp',
  color: '#089981',
  text: 'BUY'
});

plotshape(sellSignal, {
  position: 'aboveBar',
  shape: 'arrowDown',
  color: '#f23645',
  text: 'SELL'
});

console.log('EMA Cross рассчитан для ' + candles.length + ' свечей');`,
  },
  {
    id: 'ict_fvg',
    name: 'ICT Fair Value Gaps (FVG)',
    description: 'Определение 3-свечных имбалансов ликвидности с подсветкой зон разрыва',
    code: `// ----------------------------------------------------
// ICT Fair Value Gaps (FVG) / 3-свечные ценовые имбалансы
// ----------------------------------------------------
let bullishCount = 0;
let bearishCount = 0;

for (let i = 2; i < candles.length; i++) {
  const c1 = candles[i - 2];
  const c2 = candles[i - 1];
  const c3 = candles[i];

  // Бычий FVG: Low 3-й свечи выше High 1-й свечи
  if (c3.low > c1.high) {
    bullishCount++;
    // Проекция зоны вперед на 5 баров
    const timeDelta = c3.time - c2.time;
    plotbox({
      startTime: c2.time,
      endTime: c3.time + timeDelta * 5,
      high: c3.low,
      low: c1.high,
      color: '#089981',
      fillOpacity: 0.2,
      label: '+FVG'
    });
  }

  // Медвежий FVG: High 3-й свечи ниже Low 1-й свечи
  if (c3.high < c1.low) {
    bearishCount++;
    const timeDelta = c3.time - c2.time;
    plotbox({
      startTime: c2.time,
      endTime: c3.time + timeDelta * 5,
      high: c1.low,
      low: c3.high,
      color: '#f23645',
      fillOpacity: 0.2,
      label: '-FVG'
    });
  }
}

console.log(\`Найдено \${bullishCount} бычьих и \${bearishCount} медвежьих FVG зон\`);`,
  },
  {
    id: 'bollinger',
    name: 'Bollinger Bands (20, 2)',
    description: 'Полосы Боллинджера: верхняя, средняя и нижняя границы волатильности',
    code: `// ----------------------------------------------------
// Полосы Боллинджера (Bollinger Bands 20, 2)
// ----------------------------------------------------
const bb = ta.bollinger(close, 20, 2);

plot(bb.upper, { name: 'BB Верхняя', color: '#2962ff', lineWidth: 1.5 });
plot(bb.basis, { name: 'BB Средняя (SMA 20)', color: '#ff9800', lineWidth: 1.5 });
plot(bb.lower, { name: 'BB Нижняя', color: '#2962ff', lineWidth: 1.5 });

// Сигнал касания нижней полосы
const touchLower = close.map((c, i) => {
  if (!bb.lower[i]) return false;
  return c <= bb.lower[i];
});

plotshape(touchLower, {
  position: 'belowBar',
  shape: 'circle',
  color: '#00e5ff',
  text: 'BB Low'
});`,
  },
  {
    id: 'rsi_signals',
    name: 'RSI Oscillator Signals (14)',
    description: 'Определение зон перекупленности (>70) и перепроданности (<30)',
    code: `// ----------------------------------------------------
// Сигналы RSI (Relative Strength Index)
// ----------------------------------------------------
const rsi = ta.rsi(close, 14);

// Выход из зоны перепроданности (<30 -> >=30)
const oversoldExit = rsi.map((val, idx) => {
  if (idx < 1 || val === null || rsi[idx - 1] === null) return false;
  return rsi[idx - 1] < 30 && val >= 30;
});

// Выход из зоны перекупленности (>70 -> <=70)
const overboughtExit = rsi.map((val, idx) => {
  if (idx < 1 || val === null || rsi[idx - 1] === null) return false;
  return rsi[idx - 1] > 70 && val <= 70;
});

plotshape(oversoldExit, {
  position: 'belowBar',
  shape: 'arrowUp',
  color: '#089981',
  text: 'RSI Buy'
});

plotshape(overboughtExit, {
  position: 'aboveBar',
  shape: 'arrowDown',
  color: '#f23645',
  text: 'RSI Sell'
});

console.log('Текущий RSI: ' + (rsi[rsi.length - 1]?.toFixed(2) || 'н/д'));`,
  },
  {
    id: 'custom_fractals',
    name: 'Williams Fractals (Свинг-структура)',
    description: 'Определение локальных вершин (Swing High) и впадин (Swing Low)',
    code: `// ----------------------------------------------------
// Фракталы Билла Вильямса / Swing High & Swing Low
// ----------------------------------------------------
let shCount = 0;
let slCount = 0;

for (let i = 2; i < candles.length - 2; i++) {
  const isHigh =
    high[i] > high[i - 2] &&
    high[i] > high[i - 1] &&
    high[i] > high[i + 1] &&
    high[i] > high[i + 2];

  const isLow =
    low[i] < low[i - 2] &&
    low[i] < low[i - 1] &&
    low[i] < low[i + 1] &&
    low[i] < low[i + 2];

  if (isHigh) {
    shCount++;
    plotshape((idx) => idx === i, {
      position: 'aboveBar',
      shape: 'arrowDown',
      color: '#089981',
      text: '▲'
    });
  }

  if (isLow) {
    slCount++;
    plotshape((idx) => idx === i, {
      position: 'belowBar',
      shape: 'arrowUp',
      color: '#f23645',
      text: '▼'
    });
  }
}

console.log(\`Найдено: \${shCount} максимумов и \${slCount} минимумов\`);`,
  },
  {
    id: 'starter',
    name: 'Чистый шаблон (Начать свой скрипт)',
    description: 'Заготовка для написания собственных индикаторов с документацией API',
    code: `// ----------------------------------------------------
// Пользовательский индикатор
// Доступные переменные:
// candles, open, high, low, close, volume, time
//
// Математическая библиотека ta:
// ta.sma(source, period)
// ta.ema(source, period)
// ta.rsi(source, period)
// ta.atr(candles, period)
// ta.bollinger(source, period, mult)
// ta.highest(source, period)
// ta.lowest(source, period)
// ta.crossover(series1, series2)
// ta.crossunder(series1, series2)
//
// Функции отрисовки на графике:
// - plot(dataArray, { name, color, lineWidth })
// - plotshape(conditionArray, { position: 'aboveBar'|'belowBar', shape: 'arrowUp'|'arrowDown'|'circle', color, text })
// - plotbox({ startTime, endTime, high, low, color, fillOpacity, label })
// ----------------------------------------------------

const sma20 = ta.sma(close, 20);
plot(sma20, { name: 'SMA 20', color: '#2962ff', lineWidth: 2 });

console.log('Скрипт успешно выполнен!');`,
  },
];

// ============================================================================
// Execution Engine (Sandboxed Runner)
// ============================================================================

export function executeCustomScript(code: string, candles: Candle[]): ScriptOutput {
  const startTime = performance.now();
  const logs: string[] = [];
  const lines: PlottedLine[] = [];
  const markers: PlottedMarker[] = [];
  const boxes: PlottedBox[] = [];

  if (!candles || candles.length === 0) {
    return {
      success: false,
      executionTimeMs: 0,
      error: 'Нет свечей на графике для расчета индикатора',
      logs: ['Ошибка: массив свечей пуст'],
      lines: [],
      markers: [],
      boxes: [],
    };
  }

  // Pre-extract series
  const open = candles.map((c) => c.open);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);
  const close = candles.map((c) => c.close);
  const volume = candles.map((c) => c.volume);
  const time = candles.map((c) => c.time);

  // Sandboxed console
  const customConsole = {
    log: (...args: any[]) => {
      const msg = args
        .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');
      logs.push(msg);
    },
    warn: (...args: any[]) => {
      const msg = 'Предупреждение: ' + args.join(' ');
      logs.push(msg);
    },
    error: (...args: any[]) => {
      const msg = 'Ошибка: ' + args.join(' ');
      logs.push(msg);
    },
  };

  // Plotting functions
  let lineCounter = 0;
  const plot = (
    data: (number | null)[] | number[],
    options?: { name?: string; color?: string; lineWidth?: number }
  ) => {
    lineCounter++;
    if (!Array.isArray(data)) {
      throw new Error(`Аргумент plot() должен быть массивом чисел, получен: ${typeof data}`);
    }

    const plotData: Array<{ time: number; value: number }> = [];
    for (let i = 0; i < Math.min(candles.length, data.length); i++) {
      const val = data[i];
      if (val !== null && val !== undefined && !isNaN(val)) {
        plotData.push({
          time: candles[i].time,
          value: Number(val),
        });
      }
    }

    lines.push({
      id: `line_${lineCounter}_${Date.now()}`,
      name: options?.name || `Линия ${lineCounter}`,
      color: options?.color || '#2962ff',
      lineWidth: options?.lineWidth || 2,
      data: plotData,
    });
  };

  const plotshape = (
    condition: boolean[] | ((idx: number) => boolean),
    options: {
      position?: 'aboveBar' | 'belowBar' | 'inBar';
      shape?: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
      color?: string;
      text?: string;
    }
  ) => {
    const isFn = typeof condition === 'function';
    for (let i = 0; i < candles.length; i++) {
      const isMatch = isFn ? (condition as (idx: number) => boolean)(i) : (condition as boolean[])[i];
      if (isMatch) {
        markers.push({
          time: candles[i].time,
          position: options.position || 'aboveBar',
          shape: options.shape || 'arrowDown',
          color: options.color || '#2962ff',
          text: options.text,
        });
      }
    }
  };

  let boxCounter = 0;
  const plotbox = (box: {
    startTime: number;
    endTime: number;
    high: number;
    low: number;
    color?: string;
    fillOpacity?: number;
    label?: string;
  }) => {
    boxCounter++;
    boxes.push({
      id: `box_${boxCounter}_${Date.now()}`,
      startTime: box.startTime,
      endTime: box.endTime,
      high: box.high,
      low: box.low,
      color: box.color || '#2962ff',
      fillOpacity: box.fillOpacity !== undefined ? box.fillOpacity : 0.2,
      label: box.label,
    });
  };

  try {
    // Create execution sandbox
    const sandboxFn = new Function(
      'candles',
      'open',
      'high',
      'low',
      'close',
      'volume',
      'time',
      'ta',
      'plot',
      'plotshape',
      'plotbox',
      'console',
      code
    );

    sandboxFn(
      candles,
      open,
      high,
      low,
      close,
      volume,
      time,
      ta,
      plot,
      plotshape,
      plotbox,
      customConsole
    );

    const execTime = Math.round((performance.now() - startTime) * 100) / 100;
    logs.push(`✓ Выполнено за ${execTime} мс. Нарисовано линий: ${lines.length}, маркеров: ${markers.length}, зон: ${boxes.length}`);

    return {
      success: true,
      executionTimeMs: execTime,
      logs,
      lines,
      markers,
      boxes,
    };
  } catch (err: any) {
    const execTime = Math.round((performance.now() - startTime) * 100) / 100;
    const errMsg = err?.message || String(err);
    logs.push(`✕ Ошибка выполнения: ${errMsg}`);

    return {
      success: false,
      executionTimeMs: execTime,
      error: errMsg,
      logs,
      lines: [],
      markers: [],
      boxes: [],
    };
  }
}
