export type NewsImportance = 'high' | 'medium' | 'low';

export interface EconomicNewsEvent {
  id: string;
  title: string;
  country: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF';
  timestamp: number; // Unix seconds
  importance: NewsImportance;
  actual?: string;
  forecast?: string;
  previous?: string;
  impact?: 'positive' | 'negative' | 'neutral';
  description?: string;
}

export interface NewsFilterSettings {
  enabled: boolean;
  minImportance: NewsImportance; // 'high' = only high, 'medium' = high + medium, 'low' = all
  showCurrencies: string[]; // empty means all
}
