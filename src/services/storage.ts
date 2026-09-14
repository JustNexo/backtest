import { CandleColorSettings, PropFirmFeeSettings, ThemeSettings, MarketSessionsSettings, CustomScript } from '../types/chart';
import { RiskSettings } from '../types/trading';
import { DEFAULT_PROP_FIRM_SETTINGS } from './tradeEngine';

export const DEFAULT_CANDLE_COLORS: CandleColorSettings = {
  upColor: '#089981',
  downColor: '#f23645',
  showBorders: true,
  borderUpColor: '#089981',
  borderDownColor: '#f23645',
  showWicks: true,
  wickUpColor: '#089981',
  wickDownColor: '#f23645',
  showVolume: true,
  volumeUpColor: 'rgba(8, 153, 129, 0.45)',
  volumeDownColor: 'rgba(242, 54, 69, 0.45)',
};

export const COLOR_PALETTE_PRESETS = [
  {
    name: 'TradingView Classic',
    up: '#089981',
    down: '#f23645',
  },
  {
    name: 'Emerald & Crimson',
    up: '#10b981',
    down: '#ef4444',
  },
  {
    name: 'Cyberpunk Neon',
    up: '#00e5ff',
    down: '#ff007f',
  },
  {
    name: 'Blue & Orange',
    up: '#2962ff',
    down: '#ff6d00',
  },
  {
    name: 'Monochrome Silver',
    up: '#e2e8f0',
    down: '#475569',
  },
];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: 'tv-dark',
  backgroundColor: '#131722',
  cardBgColor: '#1e222d',
  textColor: '#d1d4dc',
  textMutedColor: '#787b86',
  borderColor: '#2a2e39',
  gridColor: '#1f2430',
  showVerticalGrid: true,
  showHorizontalGrid: true,
};

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  mode: 'percent',
  riskPercent: 1.0, // 1% risk per trade default
  riskUsd: 100,
  defaultSlPips: 200,
  defaultTpRatio: 2.0, // 1:2 R:R
};

const STORAGE_KEYS = {
  CANDLE_COLORS: 'tv_backtest_candle_colors',
  THEME_SETTINGS: 'tv_backtest_theme_settings',
  PROP_FIRM_SETTINGS: 'tv_backtest_prop_firm_settings',
  RISK_SETTINGS: 'tv_backtest_risk_settings',
  BALANCE: 'tv_backtest_balance',
  TIMEZONE: 'tv_backtest_timezone',
};

export function loadStoredTimezone(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.TIMEZONE) || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}

export function saveStoredTimezone(tz: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMEZONE, tz);
  } catch (e) {}
}

export function loadStoredCandleColors(): CandleColorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CANDLE_COLORS);
    if (raw) return { ...DEFAULT_CANDLE_COLORS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Error reading stored candle colors:', e);
  }
  return DEFAULT_CANDLE_COLORS;
}

export function saveStoredCandleColors(settings: CandleColorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CANDLE_COLORS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving candle colors:', e);
  }
}

export function loadStoredThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME_SETTINGS);
    if (raw) return { ...DEFAULT_THEME_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Error reading stored theme:', e);
  }
  return DEFAULT_THEME_SETTINGS;
}

export function saveStoredThemeSettings(settings: ThemeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving theme:', e);
  }
}

export function loadStoredPropFirmSettings(): PropFirmFeeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROP_FIRM_SETTINGS);
    if (raw) return { ...DEFAULT_PROP_FIRM_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Error reading stored prop firm settings:', e);
  }
  return DEFAULT_PROP_FIRM_SETTINGS;
}

export function saveStoredPropFirmSettings(settings: PropFirmFeeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROP_FIRM_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving prop firm settings:', e);
  }
}

export function loadStoredRiskSettings(): RiskSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RISK_SETTINGS);
    if (raw) return { ...DEFAULT_RISK_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Error reading stored risk settings:', e);
  }
  return DEFAULT_RISK_SETTINGS;
}

export function saveStoredRiskSettings(settings: RiskSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RISK_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving risk settings:', e);
  }
}

const SESSION_STORAGE_KEYS = {
  SESSIONS: 'tv_backtest_sessions',
  ACTIVE_SESSION_ID: 'tv_backtest_active_session_id',
  SYMBOL: 'tv_backtest_active_symbol',
};

export function loadStoredSessions(): any[] {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEYS.SESSIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored sessions:', e);
  }
  return [];
}

export function saveStoredSessions(sessions: any[]): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Error saving sessions:', e);
  }
}

export function loadStoredActiveSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEYS.ACTIVE_SESSION_ID) || null;
  } catch (e) {
    return null;
  }
}

export function saveStoredActiveSessionId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(SESSION_STORAGE_KEYS.ACTIVE_SESSION_ID, id);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEYS.ACTIVE_SESSION_ID);
    }
  } catch (e) {}
}

export function loadStoredSymbol(): string {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEYS.SYMBOL) || 'BTCUSDT.P';
  } catch (e) {
    return 'BTCUSDT.P';
  }
}

export function saveStoredSymbol(symbol: string): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEYS.SYMBOL, symbol);
  } catch (e) {}
}

// ==========================================
// Market Sessions Settings Storage
// ==========================================

export const DEFAULT_SESSIONS_SETTINGS: MarketSessionsSettings = {
  enabled: false,
  showHighLow: true,
  showLabels: true,
  sessions: {
    asia: {
      id: 'asia',
      name: 'Азия (Tokyo)',
      enabled: true,
      startHour: 0,
      startMinute: 0,
      endHour: 8,
      endMinute: 0,
      color: '#f7a600',
      bgOpacity: 0.12,
      showHighLow: true,
      showLabel: true,
    },
    london: {
      id: 'london',
      name: 'Лондон (London)',
      enabled: true,
      startHour: 7,
      startMinute: 0,
      endHour: 16,
      endMinute: 0,
      color: '#2962ff',
      bgOpacity: 0.12,
      showHighLow: true,
      showLabel: true,
    },
    newyork: {
      id: 'newyork',
      name: 'Нью-Йорк (New York)',
      enabled: true,
      startHour: 13,
      startMinute: 0,
      endHour: 21,
      endMinute: 0,
      color: '#f23645',
      bgOpacity: 0.12,
      showHighLow: true,
      showLabel: true,
    },
    london_kz: {
      id: 'london_kz',
      name: 'London Open Killzone',
      enabled: false,
      startHour: 7,
      startMinute: 0,
      endHour: 10,
      endMinute: 0,
      color: '#00bcd4',
      bgOpacity: 0.18,
      showHighLow: true,
      showLabel: true,
    },
    ny_kz: {
      id: 'ny_kz',
      name: 'NY Open Killzone',
      enabled: false,
      startHour: 12,
      startMinute: 0,
      endHour: 15,
      endMinute: 0,
      color: '#e040fb',
      bgOpacity: 0.18,
      showHighLow: true,
      showLabel: true,
    },
  },
};

const EXTRA_STORAGE_KEYS = {
  SESSIONS_SETTINGS: 'tv_backtest_sessions_settings',
  CUSTOM_SCRIPTS: 'tv_backtest_custom_scripts',
  ACTIVE_SCRIPT_ID: 'tv_backtest_active_script_id',
};

export function loadStoredSessionsSettings(): MarketSessionsSettings {
  try {
    const raw = localStorage.getItem(EXTRA_STORAGE_KEYS.SESSIONS_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SESSIONS_SETTINGS,
        ...parsed,
        sessions: {
          ...DEFAULT_SESSIONS_SETTINGS.sessions,
          ...(parsed.sessions || {}),
        },
      };
    }
  } catch (e) {
    console.warn('Error reading stored sessions settings:', e);
  }
  return DEFAULT_SESSIONS_SETTINGS;
}

export function saveStoredSessionsSettings(settings: MarketSessionsSettings): void {
  try {
    localStorage.setItem(EXTRA_STORAGE_KEYS.SESSIONS_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving sessions settings:', e);
  }
}

export function loadStoredCustomScripts(): CustomScript[] {
  try {
    const raw = localStorage.getItem(EXTRA_STORAGE_KEYS.CUSTOM_SCRIPTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading stored custom scripts:', e);
  }
  return [];
}

export function saveStoredCustomScripts(scripts: CustomScript[]): void {
  try {
    localStorage.setItem(EXTRA_STORAGE_KEYS.CUSTOM_SCRIPTS, JSON.stringify(scripts));
  } catch (e) {
    console.warn('Error saving custom scripts:', e);
  }
}

export function loadStoredActiveScriptId(): string | null {
  try {
    return localStorage.getItem(EXTRA_STORAGE_KEYS.ACTIVE_SCRIPT_ID) || null;
  } catch (e) {
    return null;
  }
}

export function saveStoredActiveScriptId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(EXTRA_STORAGE_KEYS.ACTIVE_SCRIPT_ID, id);
    } else {
      localStorage.removeItem(EXTRA_STORAGE_KEYS.ACTIVE_SCRIPT_ID);
    }
  } catch (e) {}
}

export function loadStoredMagnetMode(): boolean {
  try {
    return localStorage.getItem('tv_backtest_magnet_mode') === 'true';
  } catch (e) {
    return false;
  }
}

export function saveStoredMagnetMode(enabled: boolean): void {
  try {
    localStorage.setItem('tv_backtest_magnet_mode', String(enabled));
  } catch (e) {}
}

