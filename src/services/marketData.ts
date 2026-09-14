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

const OKX_BAR_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1H',
  '2h': '2H',
  '4h': '4H',
  '1d': '1D',
  '1w': '1W',
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
 * Fetches candles from OKX public history-candles API (supports deep 2024/2023 history with CORS)
 */
export async function fetchOKXCandlesAround(
  timeframe: Timeframe,
  targetTimestampSeconds: number,
  targetCount: number = 300
): Promise<Candle[]> {
  const bar = OKX_BAR_MAP[timeframe] || '1H';
  const stepSec = getIntervalSeconds(timeframe);
  // OKX 'after' parameter returns candles older than the specified timestamp
  let currAfterMs = Math.floor((targetTimestampSeconds + 60 * stepSec) * 1000);
  const result: Candle[] = [];

  const maxBatches = Math.min(6, Math.ceil(targetCount / 100));

  for (let b = 0; b < maxBatches; b++) {
    try {
      const url = `https://www.okx.com/api/v5/market/history-candles?instId=BTC-USDT-SWAP&bar=${bar}&limit=100&after=${currAfterMs}`;
      const response = await fetch(url);
      if (!response.ok) break;
      const json = await response.json();
      const rows: string[][] = json.data || [];
      if (rows.length === 0) break;

      for (const r of rows) {
        result.push({
          time: Math.floor(Number(r[0]) / 1000),
          open: Number(r[1]),
          high: Number(r[2]),
          low: Number(r[3]),
          close: Number(r[4]),
          volume: Number(r[5] || 0),
        });
      }

      // Prepare for next older batch
      currAfterMs = Number(rows[rows.length - 1][0]);
      if (result.length >= targetCount) break;
    } catch (err) {
      console.warn(`OKX batch ${b} error:`, err);
      break;
    }
  }

  return sanitizeCandles(result);
}

/**
 * Fetches candles from Gate.io Futures API for BTCUSDT (best for recent history)
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
 * Checks if candle array contains the requested target timestamp
 */
function candlesContainTime(candles: Candle[], targetTs: number, timeframe: Timeframe): boolean {
  if (!candles || candles.length === 0) return false;
  const first = candles[0].time;
  const last = candles[candles.length - 1].time;
  const step = getIntervalSeconds(timeframe);
  return targetTs >= first - step * 5 && targetTs <= last + step * 5;
}

/**
 * Quick fetch of the latest candles for real-time polling
 */
export async function fetchLatestCandles(timeframe: Timeframe, limit: number = 3): Promise<Candle[]> {
  try {
    const fresh = await fetchGateIOCandles(timeframe, undefined, limit);
    if (fresh.length > 0) return fresh;
  } catch {
    // Gate.io error, try OKX
  }

  try {
    const bar = OKX_BAR_MAP[timeframe] || '1H';
    const okxUrl = `https://www.okx.com/api/v5/market/candles?instId=BTC-USDT-SWAP&bar=${bar}&limit=${limit}`;
    const res = await fetch(okxUrl);
    if (res.ok) {
      const json = await res.json();
      const rows: string[][] = json.data || [];
      return sanitizeCandles(
        rows.map((r) => ({
          time: Math.floor(Number(r[0]) / 1000),
          open: Number(r[1]),
          high: Number(r[2]),
          low: Number(r[3]),
          close: Number(r[4]),
          volume: Number(r[5] || 0),
        }))
      );
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Primary function to get candles for a timeframe.
 * In Live Mode (!targetTimestamp): ALWAYS fetches fresh live candles from Gate.io/OKX
 * and merges with existing historical cache so the user sees real-time market data.
 * In Replay Mode (targetTimestamp is set): Checks memory/IDB cache first, then fetches historical range.
 */
export async function getCandlesForTimeframe(
  timeframe: Timeframe,
  options?: { targetTimestamp?: number | null; forceFetch?: boolean }
): Promise<Candle[]> {
  const cacheKey = `btcusdt_p_${timeframe}`;
  const targetTs = options?.targetTimestamp;
  const now = Math.floor(Date.now() / 1000);
  const tfSec = getIntervalSeconds(timeframe);

  // =========================================================================
  // 1. REPLAY MODE (targetTimestamp specified by user)
  // =========================================================================
  if (targetTs) {
    // Check if memory cache covers targetTs
    if (memoryCache[timeframe] && candlesContainTime(memoryCache[timeframe]!, targetTs, timeframe)) {
      return memoryCache[timeframe]!;
    }

    // Check IndexedDB
    try {
      const cachedDb = await get<Candle[]>(cacheKey);
      if (cachedDb && cachedDb.length > 50 && candlesContainTime(cachedDb, targetTs, timeframe)) {
        memoryCache[timeframe] = cachedDb;
        return cachedDb;
      }
    } catch (e) {
      console.warn('IndexedDB read error:', e);
    }

    // If target is deep history (> 25 days ago), use OKX history candles
    if (now - targetTs > 25 * 86400) {
      try {
        const okxCandles = await fetchOKXCandlesAround(timeframe, targetTs, 350);
        if (okxCandles.length > 0) {
          const existing = memoryCache[timeframe] || [];
          const merged = sanitizeCandles([...existing, ...okxCandles]);
          memoryCache[timeframe] = merged;
          set(cacheKey, merged).catch(console.warn);
          return merged;
        }
      } catch (err) {
        console.warn('OKX historical fetch error:', err);
      }
    }

    // Try Gate.io with buffer
    try {
      const buffer = tfSec * 200;
      const gateData = await fetchGateIOCandles(timeframe, targetTs + buffer, 1000);
      if (gateData.length > 0 && candlesContainTime(gateData, targetTs, timeframe)) {
        const existing = memoryCache[timeframe] || [];
        const merged = sanitizeCandles([...existing, ...gateData]);
        memoryCache[timeframe] = merged;
        set(cacheKey, merged).catch(console.warn);
        return merged;
      }
    } catch (err) {
      console.warn('Gate.io replay fetch error:', err);
    }

    // Try Seed Data
    try {
      const seed = await loadSeedData();
      if (seed[timeframe] && seed[timeframe].length > 0) {
        const sanitized = sanitizeCandles(seed[timeframe]);
        if (candlesContainTime(sanitized, targetTs, timeframe)) {
          memoryCache[timeframe] = sanitized;
          return sanitized;
        }
      }
    } catch (e) {
      console.warn('Seed fallback error:', e);
    }

    return generateFallbackCandles(timeframe, targetTs);
  }

  // =========================================================================
  // 2. LIVE MODE (no targetTimestamp): ALWAYS PREFER FRESH REAL-TIME DATA!
  // =========================================================================
  let existingDb: Candle[] = memoryCache[timeframe] || [];
  if (existingDb.length === 0) {
    try {
      const cached = await get<Candle[]>(cacheKey);
      if (cached && cached.length > 0) {
        existingDb = cached;
      }
    } catch (e) {
      console.warn('IndexedDB read error:', e);
    }
  }

  const lastCandleTime = existingDb.length > 0 ? existingDb[existingDb.length - 1].time : 0;
  // If existing cached data is already very fresh (less than 90s old or less than tfSec), reuse
  const isCacheStillFresh = existingDb.length > 50 && (now - lastCandleTime) < Math.min(tfSec, 90);
  if (isCacheStillFresh && !options?.forceFetch) {
    memoryCache[timeframe] = existingDb;
    return existingDb;
  }

  // 2a. Fetch fresh candles from Gate.io (primary, up to 1000 candles)
  try {
    const fresh = await fetchGateIOCandles(timeframe, undefined, 1000);
    if (fresh.length > 0) {
      const merged = sanitizeCandles([...existingDb, ...fresh]);
      memoryCache[timeframe] = merged;
      set(cacheKey, merged).catch(console.warn);
      return merged;
    }
  } catch (err) {
    console.warn('Gate.io live fetch failed, trying OKX live fallback:', err);
  }

  // 2b. Fallback to OKX live candles
  try {
    const bar = OKX_BAR_MAP[timeframe] || '1H';
    const okxUrl = `https://www.okx.com/api/v5/market/candles?instId=BTC-USDT-SWAP&bar=${bar}&limit=300`;
    const res = await fetch(okxUrl);
    if (res.ok) {
      const json = await res.json();
      const rows: string[][] = json.data || [];
      const okxCandles: Candle[] = rows.map((r) => ({
        time: Math.floor(Number(r[0]) / 1000),
        open: Number(r[1]),
        high: Number(r[2]),
        low: Number(r[3]),
        close: Number(r[4]),
        volume: Number(r[5] || 0),
      }));
      if (okxCandles.length > 0) {
        const merged = sanitizeCandles([...existingDb, ...okxCandles]);
        memoryCache[timeframe] = merged;
        set(cacheKey, merged).catch(console.warn);
        return merged;
      }
    }
  } catch (err) {
    console.warn('OKX live fallback failed:', err);
  }

  // 2c. If network failed, return existing cached data if available
  if (existingDb.length > 0) {
    memoryCache[timeframe] = existingDb;
    return existingDb;
  }

  // 2d. Try seed data
  try {
    const seed = await loadSeedData();
    if (seed[timeframe] && seed[timeframe].length > 0) {
      const sanitized = sanitizeCandles(seed[timeframe]);
      memoryCache[timeframe] = sanitized;
      return sanitized;
    }
  } catch (e) {
    console.warn('Seed data fallback error:', e);
  }

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
    // For deep dates (> 25 days ago), use OKX history candles
    const now = Math.floor(Date.now() / 1000);
    let fresh: Candle[] = [];

    if (now - targetTimestampSeconds > 25 * 86400) {
      fresh = await fetchOKXCandlesAround(timeframe, targetTimestampSeconds, 400);
    } else {
      const buffer = getIntervalSeconds(timeframe) * 200;
      fresh = await fetchGateIOCandles(timeframe, targetTimestampSeconds + buffer, 1000);
    }
    
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
function generateFallbackCandles(timeframe: Timeframe, centerTimestamp?: number, count = 500): Candle[] {
  const step = getIntervalSeconds(timeframe);
  const now = centerTimestamp || Math.floor(Date.now() / 1000);
  const startTime = now - Math.floor(count * 0.7) * step;
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
