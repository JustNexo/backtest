import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders, Clock, Check, RotateCcw } from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { ColorPickerInput } from '../Settings/ColorPickerInput';
import { DEFAULT_SESSIONS_SETTINGS, saveStoredSessionsSettings } from '../../services/storage';
import { MarketSessionsSettings } from '../../types/chart';

interface SessionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionSettingsModal: React.FC<SessionSettingsModalProps> = ({ isOpen, onClose }) => {
  const { sessionsSettings, updateSessionsSettings } = useChart();
  const [activeTab, setActiveTab] = useState<'style' | 'sessions'>('style');
  const [tempSettings, setTempSettings] = useState<MarketSessionsSettings>(sessionsSettings);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync temp settings on open
  useEffect(() => {
    if (isOpen) {
      setTempSettings(sessionsSettings);
    }
  }, [isOpen, sessionsSettings]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSaveAsDefault = () => {
    saveStoredSessionsSettings(tempSettings);
    updateSessionsSettings(tempSettings);
    showToast('Настройки сохранены по умолчанию!');
  };

  const handleResetToDefault = () => {
    setTempSettings(DEFAULT_SESSIONS_SETTINGS);
    updateSessionsSettings(DEFAULT_SESSIONS_SETTINGS);
    showToast('Сброшено к заводским настройкам');
  };

  const handleApply = () => {
    updateSessionsSettings(tempSettings);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none tv-modal-content"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-xl pointer-events-auto bg-[#1e222d] border border-[#2a2e39] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2e39] bg-[#181b24]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-tv-blue/15 border border-tv-blue/30 flex items-center justify-center text-tv-blue">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Настройки индикатора: Сессии</h3>
              <p className="text-[11px] text-tv-textMuted">TradingView FX & Crypto Sessions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-tv-textMuted hover:text-white rounded-lg hover:bg-tv-surfaceHover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2a2e39] bg-[#181b24]/50 px-5 gap-4">
          <button
            onClick={() => setActiveTab('style')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'style'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Стиль и отображение</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sessions'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Сессии и расписание</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl">
                <div>
                  <div className="text-xs font-semibold text-white">Индикатор сессий активен</div>
                  <div className="text-[11px] text-tv-textMuted">Включить или скрыть отрисовку на графике</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempSettings.enabled}
                    onChange={(e) => setTempSettings({ ...tempSettings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[#363a45] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tv-blue"></div>
                </label>
              </div>

              {/* Render Style Mode */}
              <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-2">
                <div className="text-xs font-semibold text-white">Стиль отображения на графике</div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setTempSettings({ ...tempSettings, renderStyle: 'box' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      tempSettings.renderStyle === 'box'
                        ? 'bg-tv-blue/15 border-tv-blue text-white shadow-sm'
                        : 'bg-[#181b24] border-[#2a2e39] text-tv-textMuted hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span>Компактный бокс</span>
                      {tempSettings.renderStyle === 'box' && <Check className="w-3.5 h-3.5 text-tv-blue" />}
                    </div>
                    <div className="text-[10px] text-tv-textMuted mt-0.5">
                      Только High/Low диапазон (аккуратно, без перегруза)
                    </div>
                  </button>

                  <button
                    onClick={() => setTempSettings({ ...tempSettings, renderStyle: 'column' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      tempSettings.renderStyle === 'column'
                        ? 'bg-tv-blue/15 border-tv-blue text-white shadow-sm'
                        : 'bg-[#181b24] border-[#2a2e39] text-tv-textMuted hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-semibold flex items-center justify-between">
                      <span>Вертикальная полоса</span>
                      {tempSettings.renderStyle === 'column' && <Check className="w-3.5 h-3.5 text-tv-blue" />}
                    </div>
                    <div className="text-[10px] text-tv-textMuted mt-0.5">
                      На всю высоту графика (классический столбец)
                    </div>
                  </button>
                </div>
              </div>

              {/* History Limit (Max Days) */}
              <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">Ограничение по дням (Фильтр шума)</div>
                    <div className="text-[11px] text-tv-textMuted">Не захламлять старую историю графика</div>
                  </div>
                  <div className="text-xs font-mono text-tv-blue font-semibold">
                    {tempSettings.maxDays === 0 ? 'Все дни' : `${tempSettings.maxDays} дн.`}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { label: '1 день', val: 1 },
                    { label: '3 дня', val: 3 },
                    { label: '5 дней', val: 5 },
                    { label: 'Все дни', val: 0 },
                  ].map((d) => (
                    <button
                      key={d.val}
                      onClick={() => setTempSettings({ ...tempSettings, maxDays: d.val })}
                      className={`py-1.5 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                        (tempSettings.maxDays ?? 3) === d.val
                          ? 'bg-tv-blue text-white border-tv-blue font-semibold'
                          : 'bg-[#181b24] border-[#2a2e39] text-tv-textMuted hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SMC & ICT Options */}
              <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-2.5">
                <div className="text-xs font-semibold text-white">SMC / Price Action настройки</div>

                <label className="flex items-center justify-between p-2 bg-[#181b24] rounded-lg border border-[#2a2e39] cursor-pointer">
                  <div>
                    <span className="text-xs text-white">50% Середина диапазона (Equilibrium / EQ)</span>
                    <p className="text-[10px] text-tv-textMuted">Срединная пунктирная линия диапазона сессии</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!tempSettings.showMidline}
                    onChange={(e) => setTempSettings({ ...tempSettings, showMidline: e.target.checked })}
                    className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-[#181b24] rounded-lg border border-[#2a2e39] cursor-pointer">
                  <div>
                    <span className="text-xs text-white">Продлевать High / Low вправо (Liquidity Sweeps)</span>
                    <p className="text-[10px] text-tv-textMuted">Линии ликвидности хая и лоя сессии в будущее</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!tempSettings.extendHighLow}
                    onChange={(e) => setTempSettings({ ...tempSettings, extendHighLow: e.target.checked })}
                    className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-[#181b24] rounded-lg border border-[#2a2e39] cursor-pointer">
                  <span className="text-xs text-white">Показывать названия сессий в углу</span>
                  <input
                    type="checkbox"
                    checked={tempSettings.showLabels}
                    onChange={(e) => setTempSettings({ ...tempSettings, showLabels: e.target.checked })}
                    className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2 bg-[#181b24] rounded-lg border border-[#2a2e39] cursor-pointer">
                  <span className="text-xs text-white">Подробные цены High / Low</span>
                  <input
                    type="checkbox"
                    checked={tempSettings.highLowStyle === 'detailed'}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        highLowStyle: e.target.checked ? 'detailed' : 'clean',
                      })
                    }
                    className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-tv-textMuted uppercase tracking-wider">
                Торговые сессии и Killzones (время в UTC)
              </div>

              {Object.values(tempSettings.sessions).map((sess) => (
                <div
                  key={sess.id}
                  className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={sess.enabled}
                        onChange={(e) => {
                          const updated = {
                            ...tempSettings.sessions,
                            [sess.id]: { ...sess, enabled: e.target.checked },
                          };
                          setTempSettings({ ...tempSettings, sessions: updated });
                        }}
                        className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                      />
                      <div
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ backgroundColor: sess.color }}
                      />
                      <span className="text-xs font-semibold text-white">{sess.name}</span>
                    </div>

                    <div className="text-[11px] font-mono text-tv-textMuted bg-[#181b24] px-2 py-0.5 rounded border border-[#2a2e39]">
                      {String(sess.startHour).padStart(2, '0')}:{String(sess.startMinute).padStart(2, '0')} —{' '}
                      {String(sess.endHour).padStart(2, '0')}:{String(sess.endMinute).padStart(2, '0')} UTC
                    </div>
                  </div>

                  {sess.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#2a2e39]">
                      {/* Hours Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-tv-textMuted uppercase font-semibold block">
                          Время начала — конца (UTC)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={sess.startHour}
                            onChange={(e) => {
                              const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                              setTempSettings({
                                ...tempSettings,
                                sessions: {
                                  ...tempSettings.sessions,
                                  [sess.id]: { ...sess, startHour: h },
                                },
                              });
                            }}
                            className="w-11 px-1.5 py-1 bg-[#1e222d] border border-[#2a2e39] rounded text-center text-xs text-white font-mono"
                          />
                          <span className="text-tv-textMuted">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={sess.startMinute}
                            onChange={(e) => {
                              const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                              setTempSettings({
                                ...tempSettings,
                                sessions: {
                                  ...tempSettings.sessions,
                                  [sess.id]: { ...sess, startMinute: m },
                                },
                              });
                            }}
                            className="w-11 px-1.5 py-1 bg-[#1e222d] border border-[#2a2e39] rounded text-center text-xs text-white font-mono"
                          />
                          <span className="text-tv-textMuted text-xs px-1">до</span>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={sess.endHour}
                            onChange={(e) => {
                              const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                              setTempSettings({
                                ...tempSettings,
                                sessions: {
                                  ...tempSettings.sessions,
                                  [sess.id]: { ...sess, endHour: h },
                                },
                              });
                            }}
                            className="w-11 px-1.5 py-1 bg-[#1e222d] border border-[#2a2e39] rounded text-center text-xs text-white font-mono"
                          />
                          <span className="text-tv-textMuted">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={sess.endMinute}
                            onChange={(e) => {
                              const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                              setTempSettings({
                                ...tempSettings,
                                sessions: {
                                  ...tempSettings.sessions,
                                  [sess.id]: { ...sess, endMinute: m },
                                },
                              });
                            }}
                            className="w-11 px-1.5 py-1 bg-[#1e222d] border border-[#2a2e39] rounded text-center text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Opacity slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-tv-textMuted uppercase font-semibold">
                          <span>Прозрачность фона</span>
                          <span className="font-mono text-white">
                            {Math.round((sess.bgOpacity || 0.08) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.02"
                          max="0.30"
                          step="0.01"
                          value={sess.bgOpacity || 0.08}
                          onChange={(e) => {
                            const op = parseFloat(e.target.value);
                            setTempSettings({
                              ...tempSettings,
                              sessions: {
                                ...tempSettings.sessions,
                                [sess.id]: { ...sess, bgOpacity: op },
                              },
                            });
                          }}
                          className="w-full h-1.5 bg-[#2a2e39] rounded-lg appearance-none cursor-pointer accent-tv-blue mt-2"
                        />
                      </div>

                      {/* Color Picker */}
                      <div className="sm:col-span-2">
                        <ColorPickerInput
                          label="Цвет сессии"
                          value={sess.color}
                          onChange={(color) => {
                            setTempSettings({
                              ...tempSettings,
                              sessions: {
                                ...tempSettings.sessions,
                                [sess.id]: { ...sess, color },
                              },
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#2a2e39] bg-[#181b24]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAsDefault}
              className="px-3 py-1.5 text-xs font-medium text-tv-textMuted hover:text-white bg-[#1e222d] border border-[#2a2e39] hover:border-tv-blue rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title="Сохранить текущие настройки сессий по умолчанию для всех графиков"
            >
              <Check className="w-3.5 h-3.5 text-tv-blue" />
              <span>По умолчанию</span>
            </button>
            <button
              onClick={handleResetToDefault}
              className="px-3 py-1.5 text-xs font-medium text-tv-textMuted hover:text-tv-red bg-[#1e222d] border border-[#2a2e39] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title="Сбросить к заводским настройкам"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить</span>
            </button>
            {toastMsg && (
              <span className="text-[11px] text-[#089981] font-medium animate-in fade-in">
                {toastMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-tv-textMuted hover:text-white transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-medium bg-tv-blue text-white rounded-lg hover:bg-tv-blue/90 shadow-sm transition-colors cursor-pointer font-semibold"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
