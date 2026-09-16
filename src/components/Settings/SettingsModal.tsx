import React, { useState } from 'react';
import {
  X,
  Palette,
  Percent,
  Sliders,
  RotateCcw,
  Check,
  ShieldAlert,
  Sun,
  Moon,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { COLOR_PALETTE_PRESETS } from '../../services/storage';
import { PROP_FIRM_PRESETS } from '../../services/tradeEngine';
import { ColorPickerInput } from './ColorPickerInput';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'symbol' | 'prop_firm' | 'appearance' | 'sessions';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('symbol');

  const {
    candleColors,
    updateCandleColors,
    resetCandleColors,
    themeSettings,
    updateThemeSettings,
    feeSettings,
    updateFeeSettings,
    sessionsSettings,
    updateSessionsSettings,
  } = useChart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-100 font-sans">
      <div className="w-full max-w-xl bg-[#181b24] border border-[#242731] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#d1d4dc] max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#242731] bg-[#141720]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#2962ff]" />
            <h2 className="text-sm font-semibold text-white">Настройки графика</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#787b86] hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-1 px-5 pt-2 border-b border-[#242731] bg-[#141720]">

          <button
            onClick={() => setActiveTab('symbol')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'symbol'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Свечи (HEX / RGB)</span>
          </button>
          <button
            onClick={() => setActiveTab('prop_firm')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'prop_firm'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Комиссии и Своп (Funding Pips)</span>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'appearance'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Фон и Сетка (HEX / RGB)</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'sessions'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Сессии рынка</span>
            {sessionsSettings.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-tv-blue" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: SYMBOL / CANDLES */}
          {activeTab === 'symbol' && (
            <div className="space-y-6">
              {/* Presets */}
              <div>
                <label className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider block mb-2.5">
                  Готовые палитры TradingView
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COLOR_PALETTE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() =>
                        updateCandleColors({
                          upColor: preset.up,
                          downColor: preset.down,
                          borderUpColor: preset.up,
                          borderDownColor: preset.down,
                          wickUpColor: preset.up,
                          wickDownColor: preset.down,
                          volumeUpColor: preset.up + '80',
                          volumeDownColor: preset.down + '80',
                        })
                      }
                      className="flex items-center justify-between p-2.5 bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] rounded-xl text-xs transition-colors"
                    >
                      <span className="font-medium text-white">{preset.name}</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-black/30"
                          style={{ backgroundColor: preset.up }}
                        />
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-black/30"
                          style={{ backgroundColor: preset.down }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bodies */}
              <div className="space-y-3 pt-2 border-t border-[#2a2e39]">
                <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                  Тело свечи (Поддержка HEX # и RGB rgb(...))
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorPickerInput
                    label="Растущая (Up)"
                    value={candleColors.upColor}
                    onChange={(color) => updateCandleColors({ upColor: color })}
                  />
                  <ColorPickerInput
                    label="Падающая (Down)"
                    value={candleColors.downColor}
                    onChange={(color) => updateCandleColors({ downColor: color })}
                  />
                </div>
              </div>

              {/* Borders */}
              <div className="space-y-3 pt-2 border-t border-[#2a2e39]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                    Границы свечи (Borders)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={candleColors.showBorders}
                      onChange={(e) => updateCandleColors({ showBorders: e.target.checked })}
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue"
                    />
                    <span>Включить границы</span>
                  </label>
                </div>
                {candleColors.showBorders && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ColorPickerInput
                      label="Граница Up"
                      value={candleColors.borderUpColor}
                      onChange={(color) => updateCandleColors({ borderUpColor: color })}
                    />
                    <ColorPickerInput
                      label="Граница Down"
                      value={candleColors.borderDownColor}
                      onChange={(color) => updateCandleColors({ borderDownColor: color })}
                    />
                  </div>
                )}
              </div>

              {/* Wicks */}
              <div className="space-y-3 pt-2 border-t border-[#2a2e39]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                    Фитили (Wicks / Тени)
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={candleColors.showWicks}
                      onChange={(e) => updateCandleColors({ showWicks: e.target.checked })}
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue"
                    />
                    <span>Включить фитили</span>
                  </label>
                </div>
                {candleColors.showWicks && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ColorPickerInput
                      label="Фитиль Up"
                      value={candleColors.wickUpColor}
                      onChange={(color) => updateCandleColors({ wickUpColor: color })}
                    />
                    <ColorPickerInput
                      label="Фитиль Down"
                      value={candleColors.wickDownColor}
                      onChange={(color) => updateCandleColors({ wickDownColor: color })}
                    />
                  </div>
                )}
              </div>

              {/* Volumes */}
              <div className="space-y-3 pt-2 border-t border-[#2a2e39]">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                    Столбцы объема (Volume)
                  </div>
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candleColors.showVolume !== false}
                      onChange={(e) => updateCandleColors({ showVolume: e.target.checked })}
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue"
                    />
                    <span>Показывать объемы</span>
                  </label>
                </div>
                {candleColors.showVolume !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ColorPickerInput
                      label="Объем Up"
                      value={candleColors.volumeUpColor}
                      onChange={(color) => updateCandleColors({ volumeUpColor: color })}
                    />
                    <ColorPickerInput
                      label="Объем Down"
                      value={candleColors.volumeDownColor}
                      onChange={(color) => updateCandleColors({ volumeDownColor: color })}
                    />
                  </div>
                )}
              </div>

              {/* Reset to defaults */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={resetCandleColors}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-tv-textMuted hover:text-white hover:bg-tv-surfaceHover rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить цвета на стандартные TradingView</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PROP FIRM FEES & SWAPS */}
          {activeTab === 'prop_firm' && (
            <div className="space-y-6">
              {/* Presets */}
              <div>
                <label className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider block mb-2.5">
                  Пресеты проп-компаний и брокеров
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateFeeSettings(PROP_FIRM_PRESETS.funding_pips)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      feeSettings.presetName === 'funding_pips'
                        ? 'border-tv-blue bg-tv-blue/15 text-white'
                        : 'border-[#2a2e39] bg-[#131722] hover:bg-[#2a2e39] text-tv-text'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Funding Pips (По умолчанию)</span>
                      {feeSettings.presetName === 'funding_pips' && <Check className="w-4 h-4 text-tv-blue" />}
                    </div>
                    <div className="text-[11px] text-tv-textMuted mt-1">
                      Комиссия: 0.05% / Swap: L -0.03%, S -0.01% daily
                    </div>
                  </button>

                  <button
                    onClick={() => updateFeeSettings(PROP_FIRM_PRESETS.ftmo)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      feeSettings.presetName === 'ftmo'
                        ? 'border-tv-blue bg-tv-blue/15 text-white'
                        : 'border-[#2a2e39] bg-[#131722] hover:bg-[#2a2e39] text-tv-text'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>FTMO Crypto</span>
                      {feeSettings.presetName === 'ftmo' && <Check className="w-4 h-4 text-tv-blue" />}
                    </div>
                    <div className="text-[11px] text-tv-textMuted mt-1">
                      Комиссия: 0.06% / Swap: L -0.035%, S -0.015%
                    </div>
                  </button>

                  <button
                    onClick={() => updateFeeSettings(PROP_FIRM_PRESETS.binance_vip0)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      feeSettings.presetName === 'binance_vip0'
                        ? 'border-tv-blue bg-tv-blue/15 text-white'
                        : 'border-[#2a2e39] bg-[#131722] hover:bg-[#2a2e39] text-tv-text'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Binance Futures VIP0</span>
                      {feeSettings.presetName === 'binance_vip0' && <Check className="w-4 h-4 text-tv-blue" />}
                    </div>
                    <div className="text-[11px] text-tv-textMuted mt-1">
                      Taker: 0.04% / Funding Rate: каждые 8 часов
                    </div>
                  </button>

                  <button
                    onClick={() => updateFeeSettings(PROP_FIRM_PRESETS.zero_fee)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      feeSettings.presetName === 'zero_fee'
                        ? 'border-tv-blue bg-tv-blue/15 text-white'
                        : 'border-[#2a2e39] bg-[#131722] hover:bg-[#2a2e39] text-tv-text'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Без комиссий (Чистый тест)</span>
                      {feeSettings.presetName === 'zero_fee' && <Check className="w-4 h-4 text-tv-blue" />}
                    </div>
                    <div className="text-[11px] text-tv-textMuted mt-1">
                      Комиссия 0% / Своп 0%
                    </div>
                  </button>
                </div>
              </div>

              {/* Manual Commission Fee Settings */}
              <div className="space-y-4 pt-2 border-t border-[#2a2e39]">
                <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                  Настройка торговой комиссии (Trading Fee)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-tv-text">Тип комиссии</label>
                    <select
                      value={feeSettings.feeType}
                      onChange={(e) =>
                        updateFeeSettings({ feeType: e.target.value as 'percentage' | 'per_lot' })
                      }
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-none focus:border-tv-blue"
                    >
                      <option value="percentage">Процент от объема (%)</option>
                      <option value="per_lot">Фиксированная за 1 лот/BTC ($)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-tv-text">
                      {feeSettings.feeType === 'percentage'
                        ? 'Размер комиссии (% за сторону)'
                        : 'Комиссия ($ за 1 BTC)'}
                    </label>
                    <input
                      type="number"
                      step={feeSettings.feeType === 'percentage' ? '0.01' : '0.5'}
                      value={
                        feeSettings.feeType === 'percentage'
                          ? feeSettings.commissionPercent
                          : feeSettings.commissionPerLot
                      }
                      onChange={(e) =>
                        updateFeeSettings(
                          feeSettings.feeType === 'percentage'
                            ? { commissionPercent: parseFloat(e.target.value) || 0 }
                            : { commissionPerLot: parseFloat(e.target.value) || 0 }
                        )
                      }
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-none focus:border-tv-blue font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Swap Fee / Financing Settings */}
              <div className="space-y-4 pt-2 border-t border-[#2a2e39]">
                <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                  Плата за перенос позиции (Swap / Overnight Fee)
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-tv-text">Swap Long (% / день)</label>
                    <input
                      type="number"
                      step="0.005"
                      value={feeSettings.swapLongDailyPercent}
                      onChange={(e) =>
                        updateFeeSettings({ swapLongDailyPercent: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-none focus:border-tv-blue font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-tv-text">Swap Short (% / день)</label>
                    <input
                      type="number"
                      step="0.005"
                      value={feeSettings.swapShortDailyPercent}
                      onChange={(e) =>
                        updateFeeSettings({ swapShortDailyPercent: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-none focus:border-tv-blue font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-tv-text">Интервал начисления</label>
                    <select
                      value={feeSettings.swapIntervalHours}
                      onChange={(e) =>
                        updateFeeSettings({ swapIntervalHours: parseInt(e.target.value) || 24 })
                      }
                      className="w-full px-3 py-2 bg-[#131722] border border-[#2a2e39] rounded-xl text-xs text-white focus:outline-none focus:border-tv-blue"
                    >
                      <option value="24">Раз в сутки (24 ч, 00:00 UTC)</option>
                      <option value="8">Каждые 8 часов (Funding)</option>
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-tv-textMuted leading-relaxed">
                  При удержании позиции через полночь или интервал финансирования симулятор автоматически вычитает накопленный своп из итогового PnL, в точности как на реальных счетах Funding Pips.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: APPEARANCE, BACKGROUND & GRID */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme presets */}
              <div>
                <label className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider block mb-2.5">
                  Готовые темы оформления
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'tv-dark', name: 'TradingView Dark', bg: '#131722', card: '#1e222d' },
                    { id: 'slate', name: 'Slate Gray', bg: '#1e222d', card: '#2a2e39' },
                    { id: 'oled', name: 'OLED Pure Black', bg: '#000000', card: '#121212' },
                    { id: 'light', name: 'TradingView Light', bg: '#ffffff', card: '#f0f3fa', lightText: true },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() =>
                        updateThemeSettings({
                          theme: t.id as any,
                          backgroundColor: t.bg,
                          cardBgColor: t.card,
                          textColor: t.lightText ? '#131722' : '#d1d4dc',
                          gridColor: t.lightText ? '#e0e3eb' : '#1f2430',
                        })
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        themeSettings.theme === t.id
                          ? 'border-tv-blue bg-tv-blue/15 text-white'
                          : 'border-[#2a2e39] bg-[#131722] hover:bg-[#2a2e39] text-tv-text'
                      }`}
                    >
                      <span className="text-xs font-medium">{t.name}</span>
                      <div
                        className="w-5 h-5 rounded-full border border-[#363a45]"
                        style={{ backgroundColor: t.bg }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom HEX / RGB Background Color */}
              <div className="space-y-3 pt-2 border-t border-[#2a2e39]">
                <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                  Произвольный цвет фона (HEX / RGB)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ColorPickerInput
                    label="Цвет фона графика"
                    value={themeSettings.backgroundColor}
                    onChange={(color) => updateThemeSettings({ backgroundColor: color })}
                  />
                  <ColorPickerInput
                    label="Цвет линий сетки"
                    value={themeSettings.gridColor}
                    onChange={(color) => updateThemeSettings({ gridColor: color })}
                  />
                </div>
              </div>

              {/* Grid Lines */}
              <div className="space-y-4 pt-2 border-t border-[#2a2e39]">
                <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                  Видимость сетки графика
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl cursor-pointer">
                    <span className="text-xs text-white">Вертикальная сетка</span>
                    <input
                      type="checkbox"
                      checked={themeSettings.showVerticalGrid}
                      onChange={(e) =>
                        updateThemeSettings({ showVerticalGrid: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl cursor-pointer">
                    <span className="text-xs text-white">Горизонтальная сетка</span>
                    <input
                      type="checkbox"
                      checked={themeSettings.showHorizontalGrid}
                      onChange={(e) =>
                        updateThemeSettings({ showHorizontalGrid: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MARKET SESSIONS & KILLZONES */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Master Global Toggles */}
              <div className="p-4 bg-[#131722] border border-[#2a2e39] rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-tv-blue/20 text-tv-blue flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        Индикатор сессий рынка (Market Sessions)
                      </div>
                      <div className="text-[11px] text-tv-textMuted">
                        Подсветка Азиатской, Лондонской и Нью-Йоркской сессий
                      </div>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sessionsSettings.enabled}
                      onChange={(e) => updateSessionsSettings({ enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#363a45] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tv-blue"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#2a2e39]">
                  <label className="flex items-center justify-between p-2.5 bg-[#181b24] border border-[#2a2e39] rounded-xl cursor-pointer">
                    <span className="text-xs text-tv-text">Показывать High / Low сессий</span>
                    <input
                      type="checkbox"
                      checked={sessionsSettings.showHighLow}
                      onChange={(e) => updateSessionsSettings({ showHighLow: e.target.checked })}
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[#181b24] border border-[#2a2e39] rounded-xl cursor-pointer">
                    <span className="text-xs text-tv-text">Показывать названия сессий</span>
                    <input
                      type="checkbox"
                      checked={sessionsSettings.showLabels}
                      onChange={(e) => updateSessionsSettings({ showLabels: e.target.checked })}
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue"
                    />
                  </label>
                </div>
              </div>

              {/* Sessions Individual Config Cards */}
              <div className="space-y-4">
                <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                  Расписание и цвета торговых сессий (UTC)
                </div>

                {Object.values(sessionsSettings.sessions).map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={sess.enabled}
                          onChange={(e) => {
                            const updated = {
                              ...sessionsSettings.sessions,
                              [sess.id]: { ...sess, enabled: e.target.checked },
                            };
                            updateSessionsSettings({ sessions: updated });
                          }}
                          className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                        />
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: sess.color }}
                        />
                        <span className="text-xs font-bold text-white">{sess.name}</span>
                      </div>

                      <div className="text-[11px] font-mono text-tv-textMuted bg-[#181b24] px-2 py-0.5 rounded border border-[#2a2e39]">
                        {String(sess.startHour).padStart(2, '0')}:
                        {String(sess.startMinute).padStart(2, '0')} —{' '}
                        {String(sess.endHour).padStart(2, '0')}:
                        {String(sess.endMinute).padStart(2, '0')} UTC
                      </div>
                    </div>

                    {sess.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-[#2a2e39]">
                        {/* Time Inputs */}
                        <div className="md:col-span-4 space-y-1.5">
                          <label className="text-[10px] text-tv-textMuted uppercase font-semibold block">
                            Время начала и конца (UTC)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="23"
                              value={sess.startHour}
                              onChange={(e) => {
                                const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                                const updated = {
                                  ...sessionsSettings.sessions,
                                  [sess.id]: { ...sess, startHour: h },
                                };
                                updateSessionsSettings({ sessions: updated });
                              }}
                              className="w-12 px-2 py-1 bg-[#1e222d] border border-[#2a2e39] rounded text-center text-xs text-white font-mono focus:border-tv-blue focus:outline-none"
                            />
                            <span className="text-tv-textMuted">:</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={sess.startMinute}
                              onChange={(e) => {
                                const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                const updated = {
                                  ...sessionsSettings.sessions,
                                  [sess.id]: { ...sess, startMinute: m },
                                };
                                updateSessionsSettings({ sessions: updated });
                              }}
                              className="w-12 px-2 py-1 bg-[#1e222d] border border-[#2a2e39] rounded text-center text-xs text-white font-mono focus:border-tv-blue focus:outline-none"
                            />
                            <span className="text-tv-textMuted text-xs px-1">до</span>
                            <input
                              type="number"
                              min="0"
                              max="23"
                              value={sess.endHour}
                              onChange={(e) => {
                                const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                                const updated = {
                                  ...sessionsSettings.sessions,
                                  [sess.id]: { ...sess, endHour: h },
                                };
                                updateSessionsSettings({ sessions: updated });
                              }}
                              className="w-12 px-2 py-1 bg-[#1e222d] border border-[#2a2e39] rounded text-center text-xs text-white font-mono focus:border-tv-blue focus:outline-none"
                            />
                            <span className="text-tv-textMuted">:</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={sess.endMinute}
                              onChange={(e) => {
                                const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                const updated = {
                                  ...sessionsSettings.sessions,
                                  [sess.id]: { ...sess, endMinute: m },
                                };
                                updateSessionsSettings({ sessions: updated });
                              }}
                              className="w-12 px-2 py-1 bg-[#1e222d] border border-[#2a2e39] rounded text-center text-xs text-white font-mono focus:border-tv-blue focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Color Picker */}
                        <div className="md:col-span-4">
                          <ColorPickerInput
                            label="Цвет сессии"
                            value={sess.color}
                            onChange={(color) => {
                              const updated = {
                                ...sessionsSettings.sessions,
                                [sess.id]: { ...sess, color },
                              };
                              updateSessionsSettings({ sessions: updated });
                            }}
                          />
                        </div>

                        {/* Opacity slider */}
                        <div className="md:col-span-4 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-tv-textMuted uppercase font-semibold">
                            <span>Прозрачность фона</span>
                            <span className="font-mono text-white">
                              {Math.round(sess.bgOpacity * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.04"
                            max="0.35"
                            step="0.01"
                            value={sess.bgOpacity}
                            onChange={(e) => {
                              const op = parseFloat(e.target.value);
                              const updated = {
                                ...sessionsSettings.sessions,
                                [sess.id]: { ...sess, bgOpacity: op },
                              };
                              updateSessionsSettings({ sessions: updated });
                            }}
                            className="w-full h-1.5 bg-[#2a2e39] rounded-lg appearance-none cursor-pointer accent-tv-blue"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#2a2e39] bg-[#131722]/60 flex items-center justify-between">
          <div className="text-xs text-tv-textMuted">
            Все настройки сохраняются автоматически в браузере
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-tv-blue hover:bg-tv-blueHover text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-tv-blue/20"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
