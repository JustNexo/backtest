import { Candle, Timeframe } from '../types/chart';
import { get, set } from 'idb-keyval';

const GATEIO_INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '1d': '1d',
  '1w': '7d',
};

// In-memory candle cache
const memoryCache: Partial<Record<Timeframe, Candle[]>> = {};

/**
 * Normalizes and removes duplicate timestamps, sorting chronologically
 */
export function sanitizeCandles(candles: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of candles) {
    if (c && typeof c.time === 'number' && !isNaN(c.close)) {
      map.set(c.time, c);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

/**
 * Loads seed data from public/data/seed.json
 */
export async function loadSeedData(): Promise<Record<string, Candle[]>> {
  try {
    const res = await fetch('/data/seed.json');
    if (!res.ok) {
      console.warn('Seed data response not OK:', res.status);
      return {};
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Failed to load local seed data:', err);
    return {};
  }
}

/**
 * Fetches candles from Gate.io Futures API for BTCUSDT
 */
export async function fetchGateIOCandles(
  timeframe: Timeframe,
  toTimestamp?: number,
  limit: number = 1000
): Promise<Candle[]> {
  const gateInterval = GATEIO_INTERVAL_MAP[timeframe] || '1h';
  const url = new URL('https://api.gateio.ws/api/v4/futures/usdt/candlesticks');
  url.searchParams.set('contract', 'BTC_USDT');
  url.searchParams.set('interval', gateInterval);
  url.searchParams.set('limit', String(limit));
  if (toTimestamp) {
    url.searchParams.set('to', String(Math.floor(toTimestamp)));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Gate.io API error: ${response.status} ${response.statusText}`);
  }

  const raw: Array<{
    t: number | string;
    o: string;
    h: string;
    l: string;
    c: string;
    v?: number | string;
  }> = await response.json();

  const candles: Candle[] = raw.map((item) => ({
    time: Number(item.t),
    open: Number(item.o),
    high: Number(item.h),
    low: Number(item.l),
    close: Number(item.c),
    volume: Number(item.v || 0),
  }));

  return sanitizeCandles(candles);
}

/**
 * Primary function to get candles for a timeframe.
 * Checks memory cache -> IndexedDB -> Seed Data -> Online Gate.io API
 */
export async function getCandlesForTimeframe(
  timeframe: Timeframe,
  options?: { targetDate?: Date; forceFetch?: boolean }
): Promise<Candle[]> {
  const cacheKey = `btcusdt_p_${timeframe}`;

  // 1. Return from memory cache if available and not forced
  if (!options?.forceFetch && memoryCache[timeframe] && memoryCache[timeframe]!.length > 200) {
    return memoryCache[timeframe]!;
  }

  // 2. Try IndexedDB
  try {
    const cachedDb = await get<Candle[]>(cacheKey);
    if (cachedDb && cachedDb.length > 200 && !options?.forceFetch) {
      memoryCache[timeframe] = cachedDb;
      return cachedDb;
    }
  } catch (e) {
    console.warn('IndexedDB read error:', e);
  }

  // 3. Try Seed Data
  try {
    const seed = await loadSeedData();
    if (seed[timeframe] && seed[timeframe].length > 0) {
      const sanitized = sanitizeCandles(seed[timeframe]);
      memoryCache[timeframe] = sanitized;
      set(cacheKey, sanitized).catch(console.warn);
      
      // Also silently trigger background fresh fetch
      fetchGateIOCandles(timeframe).then((fresh) => {
        if (fresh.length > 0) {
          const merged = sanitizeCandles([...sanitized, ...fresh]);
          memoryCache[timeframe] = merged;
          set(cacheKey, merged).catch(console.warn);
        }
      }).catch(console.warn);

      return sanitized;
    }
  } catch (e) {
    console.warn('Seed data fallback error:', e);
  }

  // 4. Fetch directly from Gate.io
  try {
    const targetTo = options?.targetDate ? Math.floor(options.targetDate.getTime() / 1000) : undefined;
    const fresh = await fetchGateIOCandles(timeframe, targetTo, 1000);
    if (fresh.length > 0) {
      memoryCache[timeframe] = fresh;
      set(cacheKey, fresh).catch(console.warn);
      return fresh;
    }
  } catch (err) {
    console.error('Failed to fetch from Gate.io:', err);
  }

  // 5. Fallback synthetic if all else fails
  return generateFallbackCandles(timeframe);
}

/**
 * Fetch historical range around a target date (e.g. 1-2 years ago)
 */
export async function fetchHistoricalDateRange(
  timeframe: Timeframe,
  targetTimestampSeconds: number
): Promise<Candle[]> {
  try {
    // Fetch 1000 candles up to target timestamp + buffer
    const buffer = getIntervalSeconds(timeframe) * 200;
    const toTs = targetTimestampSeconds + buffer;
    const fresh = await fetchGateIOCandles(timeframe, toTs, 1000);
    
    // Merge with existing
    const existing = memoryCache[timeframe] || [];
    const merged = sanitizeCandles([...existing, ...fresh]);
    memoryCache[timeframe] = merged;
    const cacheKey = `btcusdt_p_${timeframe}`;
    await set(cacheKey, merged).catch(console.warn);
    return merged;
  } catch (err) {
    console.error('Failed to fetch historical range:', err);
    return memoryCache[timeframe] || [];
  }
}

export function getIntervalSeconds(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1m': return 60;
    case '3m': return 180;
    case '5m': return 300;
    case '15m': return 900;
    case '30m': return 1800;
    case '1h': return 3600;
    case '2h': return 7200;
    case '4h': return 14400;
    case '1d': return 86400;
    case '1w': return 604800;
    default: return 3600;
  }
}

/**
 * Fallback generator in case of complete network isolation
 */
function generateFallbackCandles(timeframe: Timeframe, count = 500): Candle[] {
  const step = getIntervalSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - count * step;
  const candles: Candle[] = [];
  let price = 65000;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * step;
    const change = (Math.random() - 0.49) * (price * 0.008);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * (price * 0.004);
    const low = Math.min(open, close) - Math.random() * (price * 0.004);
    const volume = Math.floor(100 + Math.random() * 900);
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }

  return candles;
}
