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
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { COLOR_PALETTE_PRESETS } from '../../services/storage';
import { PROP_FIRM_PRESETS } from '../../services/tradeEngine';
import { PropFirmFeeSettings } from '../../types/chart';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'symbol' | 'prop_firm' | 'appearance';

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
  } = useChart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#1e222d] border border-[#2a2e39] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-tv-text max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2e39] bg-[#131722]/50">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-tv-blue" />
            <h2 className="text-base font-semibold text-white">Настройки графика и симуляции</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-tv-surfaceHover text-tv-textMuted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#2a2e39] bg-[#131722]/20">
          <button
            onClick={() => setActiveTab('symbol')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'symbol'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Свечи (Цвета как в TradingView)</span>
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
            <span>Тема и Сетка</span>
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
                  Тело свечи (Body)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl">
                    <span className="text-xs text-white">Растущая (Up)</span>
                    <input
                      type="color"
                      value={candleColors.upColor}
                      onChange={(e) => updateCandleColors({ upColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-[#363a45] bg-transparent"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl">
                    <span className="text-xs text-white">Падающая (Down)</span>
                    <input
                      type="color"
                      value={candleColors.downColor}
                      onChange={(e) => updateCandleColors({ downColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border border-[#363a45] bg-transparent"
                    />
                  </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl">
                      <span className="text-xs text-white">Граница Up</span>
                      <input
                        type="color"
                        value={candleColors.borderUpColor}
                        onChange={(e) => updateCandleColors({ borderUpColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-[#363a45] bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl">
                      <span className="text-xs text-white">Граница Down</span>
                      <input
                        type="color"
                        value={candleColors.borderDownColor}
                        onChange={(e) => updateCandleColors({ borderDownColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-[#363a45] bg-transparent"
                      />
                    </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl">
                      <span className="text-xs text-white">Фитиль Up</span>
                      <input
                        type="color"
                        value={candleColors.wickUpColor}
                        onChange={(e) => updateCandleColors({ wickUpColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-[#363a45] bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#131722] border border-[#2a2e39] rounded-xl">
                      <span className="text-xs text-white">Фитиль Down</span>
                      <input
                        type="color"
                        value={candleColors.wickDownColor}
                        onChange={(e) => updateCandleColors({ wickDownColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-[#363a45] bg-transparent"
                      />
                    </div>
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

          {/* TAB 3: APPEARANCE & GRID */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme presets */}
              <div>
                <label className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider block mb-2.5">
                  Цветовая тема интерфейса
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

              {/* Grid Lines */}
              <div className="space-y-4 pt-2 border-t border-[#2a2e39]">
                <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                  Линии сетки графика
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
