export const TIMEZONE_OPTIONS = [
  { id: 'UTC', label: 'UTC (00:00)', offset: '+0' },
  { id: 'Europe/Moscow', label: 'UTC+3 (Москва, СПб)', offset: '+3' },
  { id: 'Europe/Kyiv', label: 'UTC+2 (Киев, Рига)', offset: '+2' },
  { id: 'Europe/London', label: 'UTC+0 (Лондон, Дублин)', offset: '+0' },
  { id: 'Europe/Berlin', label: 'UTC+1 (Франкфурт, Париж)', offset: '+1' },
  { id: 'America/New_York', label: 'UTC-4 (Нью-Йорк, EDT)', offset: '-4' },
  { id: 'America/Chicago', label: 'UTC-5 (Чикаго, CDT)', offset: '-5' },
  { id: 'America/Los_Angeles', label: 'UTC-7 (Лос-Анджелес)', offset: '-7' },
  { id: 'Asia/Dubai', label: 'UTC+4 (Дубай)', offset: '+4' },
  { id: 'Asia/Singapore', label: 'UTC+8 (Сингапур, Гонконг)', offset: '+8' },
  { id: 'Asia/Tokyo', label: 'UTC+9 (Токио)', offset: '+9' },
];

export function formatPrice(price: number, decimals: number = 1): string {
  if (price === undefined || price === null || isNaN(price)) return '0.0';
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(amount: number, decimals: number = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  const prefix = amount >= 0 ? '+$' : '-$';
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix}${abs}`;
}

export function formatPercent(val: number, decimals: number = 2): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(decimals)}%`;
}

export function formatDateTime(timestampSeconds: number, timezoneId: string = 'UTC'): string {
  if (!timestampSeconds) return '';
  try {
    const date = new Date(timestampSeconds * 1000);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: timezoneId,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch (e) {
    const date = new Date(timestampSeconds * 1000);
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }
}

export function formatShortDate(timestampSeconds: number, timezoneId: string = 'UTC'): string {
  if (!timestampSeconds) return '';
  try {
    const date = new Date(timestampSeconds * 1000);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: timezoneId,
      year: '2-digit',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    const date = new Date(timestampSeconds * 1000);
    return date.toISOString().slice(0, 10);
  }
}

export function formatVolume(val: number): string {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toFixed(0);
}

export function formatTickMark(
  time: any,
  tickMarkType: number,
  timezoneId: string = 'UTC'
): string | null {
  const ts = typeof time === 'number' ? time : (typeof time === 'object' && time !== null && 'timestamp' in time ? (time as any).timestamp : null);
  if (!ts) return null;

  const date = new Date(ts * 1000);
  try {
    switch (tickMarkType) {
      case 0: // Year
        return new Intl.DateTimeFormat('ru-RU', { timeZone: timezoneId, year: 'numeric' }).format(date);
      case 1: // Month
        return new Intl.DateTimeFormat('ru-RU', { timeZone: timezoneId, month: 'short' }).format(date);
      case 2: // DayOfMonth
        return new Intl.DateTimeFormat('ru-RU', { timeZone: timezoneId, day: 'numeric', month: 'short' }).format(date);
      case 3: // Time
      case 4: // TimeWithSeconds
      default:
        return new Intl.DateTimeFormat('ru-RU', { timeZone: timezoneId, hour: '2-digit', minute: '2-digit' }).format(date);
    }
  } catch (e) {
    return null;
  }
}
