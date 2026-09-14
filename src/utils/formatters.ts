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

export function formatDateTime(timestampSeconds: number): string {
  if (!timestampSeconds) return '';
  const date = new Date(timestampSeconds * 1000);
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatShortDate(timestampSeconds: number): string {
  if (!timestampSeconds) return '';
  const date = new Date(timestampSeconds * 1000);
  return date.toLocaleDateString('ru-RU', {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

export function formatVolume(val: number): string {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toFixed(0);
}
