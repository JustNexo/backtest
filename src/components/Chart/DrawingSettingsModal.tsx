import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders, Type, Hash, Bookmark, Check, Trash2, Plus, RotateCcw } from 'lucide-react';
import { DrawingObject, DrawingTemplate, DrawingTool } from '../../types/chart';
import { ColorPickerInput } from '../Settings/ColorPickerInput';
import {
  loadStoredDrawingDefaults,
  saveStoredDrawingDefaults,
  loadStoredDrawingTemplates,
  saveStoredDrawingTemplates,
  DEFAULT_DRAWING_SETTINGS,
} from '../../services/storage';

interface DrawingSettingsModalProps {
  isOpen: boolean;
  drawing: DrawingObject | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void;
  pricePrecision?: number;
}

const TOOL_NAMES: Record<DrawingTool, string> = {
  cursor: 'Курсор',
  rectangle: 'Прямоугольник (Rectangle / Order Block)',
  trendline: 'Линия тренда (Trend Line)',
  horizontal: 'Горизонтальная линия',
  ray: 'Луч (Ray)',
  position_long: 'Длинная позиция (Long)',
  position_short: 'Короткая позиция (Short)',
  measure: 'Линейка (Measure)',
  eraser: 'Ластик',
};

export const DrawingSettingsModal: React.FC<DrawingSettingsModalProps> = ({
  isOpen,
  drawing,
  onClose,
  onUpdate,
  pricePrecision = 2,
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'text' | 'coords'>('style');
  const [form, setForm] = useState<Partial<DrawingObject>>({});
  const [templates, setTemplates] = useState<DrawingTemplate[]>([]);
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState<boolean>(false);
  const [templateName, setTemplateName] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const initialDrawingRef = useRef<DrawingObject | null>(null);

  useEffect(() => {
    if (drawing && isOpen) {
      initialDrawingRef.current = { ...drawing };
      setForm({
        color: drawing.color || '#2962ff',
        fillColor: drawing.fillColor || drawing.color || '#2962ff',
        fillOpacity: drawing.fillOpacity ?? 0.15,
        borderVisible: drawing.borderVisible ?? true,
        fillVisible: drawing.fillVisible ?? true,
        lineWidth: drawing.lineWidth || 1,
        lineStyle: drawing.lineStyle || 'solid',
        extendRight: drawing.extendRight ?? false,
        extendLeft: drawing.extendLeft ?? false,
        text: drawing.text || '',
        textColor: drawing.textColor || '#d1d4dc',
        fontSize: drawing.fontSize || 12,
        textVAlign: drawing.textVAlign || 'top',
        textHAlign: drawing.textHAlign || 'left',
        points: drawing.points ? [...drawing.points] : [],
      });
      setTemplates(loadStoredDrawingTemplates());
    }
  }, [isOpen]);

  const updateField = (fields: Partial<DrawingObject>) => {
    setForm((prev) => {
      const next = { ...prev, ...fields };
      if (drawing) {
        onUpdate(drawing.id, next);
      }
      return next;
    });
  };

  const handleCancel = () => {
    if (drawing && initialDrawingRef.current) {
      onUpdate(drawing.id, initialDrawingRef.current);
    }
    onClose();
  };

  const handleApply = () => {
    if (drawing) {
      onUpdate(drawing.id, form);
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, drawing]);

  if (!isOpen || !drawing) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleSaveAsDefault = () => {
    if (!drawing) return;
    saveStoredDrawingDefaults(drawing.type, form);
    onUpdate(drawing.id, form);
    showToast('Сохранено как стиль по умолчанию!');
  };

  const handleResetToDefault = () => {
    if (!drawing) return;
    const defaults = loadStoredDrawingDefaults();
    const toolDefault = defaults[drawing.type] || DEFAULT_DRAWING_SETTINGS[drawing.type] || {};
    updateField(toolDefault);
    showToast('Сброшено к настройкам по умолчанию');
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !drawing) return;
    const newTemplate: DrawingTemplate = {
      id: `tmpl_${Date.now()}`,
      name: templateName.trim(),
      tool: drawing.type,
      settings: { ...form },
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveStoredDrawingTemplates(updated);
    setTemplateName('');
    setIsNewTemplateOpen(false);
    showToast(`Шаблон "${newTemplate.name}" сохранен!`);
  };

  const handleApplyTemplate = (tmpl: DrawingTemplate) => {
    updateField(tmpl.settings);
    showToast(`Применен шаблон "${tmpl.name}"`);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveStoredDrawingTemplates(updated);
  };

  const currentToolTemplates = templates.filter((t) => t.tool === drawing.type);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none tv-modal-content"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div
        className="w-full max-w-lg pointer-events-auto bg-[#1e222d] border border-[#2a2e39] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
              <h3 className="text-sm font-semibold text-white">
                {TOOL_NAMES[drawing.type] || 'Настройки объекта'}
              </h3>
              <p className="text-[11px] text-tv-textMuted">TradingView Smart Drawing Settings</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
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
            <span>Стиль</span>
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Текст</span>
          </button>
          <button
            onClick={() => setActiveTab('coords')}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'coords'
                ? 'border-tv-blue text-tv-blue font-semibold'
                : 'border-transparent text-tv-textMuted hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Координаты</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* ================= STYLE TAB ================= */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Border / Line Settings */}
              <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white">Линия границы</div>
                  {drawing.type === 'rectangle' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] text-tv-textMuted">Граница</span>
                      <input
                        type="checkbox"
                        checked={form.borderVisible ?? true}
                        onChange={(e) => updateField({ borderVisible: e.target.checked })}
                        className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                      />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <ColorPickerInput
                    label="Цвет линии"
                    value={form.color || '#2962ff'}
                    onChange={(color) => updateField({ color })}
                  />

                  <div className="flex items-center justify-between p-3 bg-[#181b24] border border-[#2a2e39] rounded-xl">
                    <span className="text-xs text-white font-medium">Толщина</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map((w) => (
                        <button
                          key={w}
                          onClick={() => updateField({ lineWidth: w })}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                            (form.lineWidth || 1) === w
                              ? 'bg-tv-blue text-white font-bold'
                              : 'bg-[#1e222d] text-tv-textMuted hover:text-white border border-[#2a2e39]'
                          }`}
                        >
                          {w}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Line Style (Solid, Dashed, Dotted) */}
                <div className="flex items-center justify-between p-3 bg-[#181b24] border border-[#2a2e39] rounded-xl">
                  <span className="text-xs text-white font-medium">Стиль линии</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'solid', label: 'Сплошная' },
                      { id: 'dashed', label: 'Пунктир' },
                      { id: 'dotted', label: 'Точки' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => updateField({ lineStyle: s.id as any })}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                          (form.lineStyle || 'solid') === s.id
                            ? 'bg-tv-blue/20 border-tv-blue text-tv-blue font-semibold'
                            : 'bg-[#1e222d] border-[#2a2e39] text-tv-textMuted hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Background Fill Settings (Rectangle) */}
              {drawing.type === 'rectangle' && (
                <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-white">Фон / Заливка</div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] text-tv-textMuted">Заливка</span>
                      <input
                        type="checkbox"
                        checked={form.fillVisible ?? true}
                        onChange={(e) => updateField({ fillVisible: e.target.checked })}
                        className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                      />
                    </label>
                  </div>

                  {form.fillVisible && (
                    <div className="space-y-3 pt-1">
                      <ColorPickerInput
                        label="Цвет заливки"
                        value={form.fillColor || form.color || '#2962ff'}
                        onChange={(fillColor) => updateField({ fillColor })}
                      />

                      <div className="p-3 bg-[#181b24] border border-[#2a2e39] rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white font-medium">Прозрачность фона</span>
                          <span className="font-mono text-tv-blue font-bold">
                            {Math.round((form.fillOpacity ?? 0.15) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.02"
                          value={form.fillOpacity ?? 0.15}
                          onChange={(e) => updateField({ fillOpacity: parseFloat(e.target.value) })}
                          className="w-full h-1.5 bg-[#2a2e39] rounded-lg appearance-none cursor-pointer accent-tv-blue"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Extend Ray Toggles (Order Blocks, FVGs) */}
              <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-2.5">
                <div className="text-xs font-semibold text-white">Продление линий (SMC / FVG)</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-2.5 bg-[#181b24] border border-[#2a2e39] rounded-xl cursor-pointer">
                    <span className="text-xs text-white">Продлить вправо ➔</span>
                    <input
                      type="checkbox"
                      checked={!!form.extendRight}
                      onChange={(e) => updateField({ extendRight: e.target.checked })}
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-[#181b24] border border-[#2a2e39] rounded-xl cursor-pointer">
                    <span className="text-xs text-white">⬅ Продлить влево</span>
                    <input
                      type="checkbox"
                      checked={!!form.extendLeft}
                      onChange={(e) => updateField({ extendLeft: e.target.checked })}
                      className="w-4 h-4 rounded text-tv-blue accent-tv-blue cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================= TEXT TAB ================= */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-3">
                <div className="text-xs font-semibold text-white">Текстовая метка объекта</div>
                <textarea
                  value={form.text || ''}
                  onChange={(e) => updateField({ text: e.target.value })}
                  placeholder="Введите текст (например: 15m Bullish OB, Daily FVG, Discount Zone...)"
                  rows={2}
                  className="w-full px-3 py-2 bg-[#181b24] border border-[#2a2e39] rounded-xl text-xs text-white placeholder-tv-textMuted focus:outline-none focus:border-tv-blue resize-none"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <ColorPickerInput
                    label="Цвет текста"
                    value={form.textColor || '#d1d4dc'}
                    onChange={(textColor) => updateField({ textColor })}
                  />

                  <div className="flex items-center justify-between p-3 bg-[#181b24] border border-[#2a2e39] rounded-xl">
                    <span className="text-xs text-white font-medium">Размер шрифта</span>
                    <div className="flex items-center gap-1">
                      {[10, 11, 12, 14, 16].map((sz) => (
                        <button
                          key={sz}
                          onClick={() => updateField({ fontSize: sz })}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                            (form.fontSize || 12) === sz
                              ? 'bg-tv-blue text-white font-bold'
                              : 'bg-[#1e222d] text-tv-textMuted hover:text-white border border-[#2a2e39]'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alignment */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-tv-textMuted block">
                      По вертикали
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'top', label: 'Верх' },
                        { id: 'middle', label: 'Центр' },
                        { id: 'bottom', label: 'Низ' },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          onClick={() => updateField({ textVAlign: pos.id as any })}
                          className={`py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                            (form.textVAlign || 'top') === pos.id
                              ? 'bg-tv-blue/20 border-tv-blue text-tv-blue font-semibold'
                              : 'bg-[#181b24] border-[#2a2e39] text-tv-textMuted hover:text-white'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-semibold text-tv-textMuted block">
                      По горизонтали
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'left', label: 'Слева' },
                        { id: 'center', label: 'Центр' },
                        { id: 'right', label: 'Справа' },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          onClick={() => updateField({ textHAlign: pos.id as any })}
                          className={`py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                            (form.textHAlign || 'left') === pos.id
                              ? 'bg-tv-blue/20 border-tv-blue text-tv-blue font-semibold'
                              : 'bg-[#181b24] border-[#2a2e39] text-tv-textMuted hover:text-white'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= COORDINATES TAB ================= */}
          {activeTab === 'coords' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-3">
                <div className="text-xs font-semibold text-white">Точные ценовые уровни</div>

                {form.points &&
                  form.points.map((pt, i) => (
                    <div
                      key={i}
                      className="p-3 bg-[#181b24] border border-[#2a2e39] rounded-xl flex items-center justify-between gap-3"
                    >
                      <span className="text-xs font-medium text-tv-textMuted">
                        {i === 0 ? 'Точка 1 (Цена / Время)' : 'Точка 2 (Цена / Время)'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-tv-textMuted">$</span>
                        <input
                          type="number"
                          step="any"
                          value={pt.price}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            const newPts = [...form.points!];
                            newPts[i] = { ...newPts[i], price: newPrice };
                            updateField({ points: newPts });
                          }}
                          className="w-32 px-2.5 py-1 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs font-mono text-white text-right focus:outline-none focus:border-tv-blue"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ================= TEMPLATES SECTION ================= */}
          <div className="p-3.5 bg-[#131722] border border-[#2a2e39] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Bookmark className="w-3.5 h-3.5 text-tv-blue" />
                <span>Шаблоны (Presets)</span>
              </div>
              <button
                onClick={() => setIsNewTemplateOpen(!isNewTemplateOpen)}
                className="text-xs text-tv-blue hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Сохранить шаблон...</span>
              </button>
            </div>

            {isNewTemplateOpen && (
              <div className="p-2.5 bg-[#181b24] border border-tv-blue/40 rounded-xl space-y-2 animate-in fade-in">
                <div className="text-[11px] text-tv-textMuted">
                  Сохранить текущие цвета, текст и продление как шаблон:
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Название (например: Bullish OB, FVG...)"
                    className="flex-1 px-2.5 py-1 bg-[#1e222d] border border-[#2a2e39] rounded-lg text-xs text-white focus:outline-none focus:border-tv-blue"
                  />
                  <button
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim()}
                    className="px-3 py-1 bg-tv-blue text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}

            {currentToolTemplates.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {currentToolTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleApplyTemplate(t)}
                    className="p-2 bg-[#181b24] border border-[#2a2e39] hover:border-tv-blue rounded-xl flex items-center justify-between cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.settings.color || '#2962ff' }}
                      />
                      <span className="text-xs text-white truncate font-medium">{t.name}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteTemplate(t.id, e)}
                      title="Удалить шаблон"
                      className="opacity-0 group-hover:opacity-100 p-1 text-tv-textMuted hover:text-tv-red transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#2a2e39] bg-[#181b24]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAsDefault}
              className="px-3 py-1.5 text-xs font-medium text-tv-textMuted hover:text-white bg-[#1e222d] border border-[#2a2e39] hover:border-tv-blue rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title="Запомнить настройки как стиль по умолчанию для всех новых объектов этого типа"
            >
              <Check className="w-3.5 h-3.5 text-tv-blue" />
              <span>По умолчанию</span>
            </button>

            <button
              onClick={handleResetToDefault}
              className="px-3 py-1.5 text-xs font-medium text-tv-textMuted hover:text-tv-red bg-[#1e222d] border border-[#2a2e39] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title="Сбросить к исходным настройкам"
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
              onClick={handleCancel}
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
