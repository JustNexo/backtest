import React, { useState, useEffect } from 'react';
import { useChart } from '../../context/ChartContext';
import { SCRIPT_TEMPLATES, ScriptTemplate } from '../../services/scriptEngine';
import { CustomScript } from '../../types/chart';
import {
  Play,
  Save,
  Trash2,
  RotateCcw,
  Sparkles,
  Check,
  AlertTriangle,
  Terminal,
  FileCode,
  Layers,
} from 'lucide-react';

export const ScriptEditorTab: React.FC = () => {
  const {
    customScripts,
    activeScript,
    scriptOutput,
    runCustomScript,
    saveCustomScript,
    deleteCustomScript,
    clearScriptOutput,
    visibleCandles,
  } = useChart();

  const [scriptName, setScriptName] = useState<string>(activeScript?.name || 'EMA Cross (20 / 50)');
  const [code, setCode] = useState<string>(
    activeScript?.code || SCRIPT_TEMPLATES[0].code
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(SCRIPT_TEMPLATES[0].id);
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Sync if active script changes externally
  useEffect(() => {
    if (activeScript) {
      setScriptName(activeScript.name);
      setCode(activeScript.code);
    }
  }, [activeScript?.id]);

  const handleSelectTemplate = (template: ScriptTemplate) => {
    setSelectedTemplateId(template.id);
    setScriptName(template.name);
    setCode(template.code);
  };

  const handleRun = () => {
    runCustomScript(code, scriptName);
  };

  const handleSave = () => {
    const scriptObj: CustomScript = {
      id: activeScript?.id || `script_${Date.now()}`,
      name: scriptName.trim() || 'Пользовательский скрипт',
      code,
      updatedAt: Date.now(),
    };
    saveCustomScript(scriptObj);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enable Tab indentation inside code editor
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Generate line numbers
  const lineCount = Math.max(1, code.split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full space-y-3 font-sans">
      {/* Top Toolbar: Template Selector, Script Name, Run & Save Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#2a2e39]">
        {/* Left: Script Name Input & Preset Templates */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#131722] border border-[#2a2e39] rounded-lg">
            <FileCode className="w-3.5 h-3.5 text-tv-blue" />
            <input
              type="text"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              placeholder="Название скрипта..."
              className="bg-transparent text-xs font-semibold text-white focus:outline-none w-48"
            />
          </div>

          {/* Preset templates dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-tv-textMuted hidden sm:inline">Шаблон:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                const t = SCRIPT_TEMPLATES.find((tpl) => tpl.id === e.target.value);
                if (t) handleSelectTemplate(t);
              }}
              className="px-2 py-1 bg-[#131722] border border-[#2a2e39] hover:border-tv-blue/70 rounded-lg text-xs text-white focus:outline-none cursor-pointer"
            >
              {SCRIPT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#1e222d] text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick template chips */}
          <div className="hidden lg:flex items-center gap-1">
            {SCRIPT_TEMPLATES.slice(0, 4).map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${
                  selectedTemplateId === t.id
                    ? 'bg-tv-blue/20 text-tv-blue border border-tv-blue/50 font-semibold'
                    : 'bg-[#131722] text-tv-textMuted hover:text-white border border-[#2a2e39]'
                }`}
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions (Run, Save, Clear) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            title="Выполнить скрипт и нарисовать индикаторы на графике"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-tv-blue hover:bg-[#1e53e5] text-white text-xs font-semibold rounded-lg shadow-md shadow-tv-blue/25 transition-all cursor-pointer group"
          >
            <Play className="w-3.5 h-3.5 fill-current group-hover:scale-110 transition-transform" />
            <span>Применить к графику</span>
          </button>

          <button
            onClick={handleSave}
            title="Сохранить скрипт в избранное"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#131722] border border-[#2a2e39] hover:border-white/30 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            {isSavedToast ? <Check className="w-3.5 h-3.5 text-tv-green" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSavedToast ? 'Сохранено!' : 'Сохранить'}</span>
          </button>

          {activeScript && (
            <button
              onClick={() => clearScriptOutput()}
              title="Снять пользовательский индикатор с графика"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#131722] border border-[#2a2e39] hover:border-tv-red/60 text-tv-textMuted hover:text-tv-red text-xs rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Снять</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor & Console Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[200px]">
        {/* Code Editor Window (Col 1-8) */}
        <div className="lg:col-span-8 flex flex-col bg-[#131722] rounded-xl border border-[#2a2e39] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#181b24] border-b border-[#2a2e39] text-[11px] text-tv-textMuted font-mono">
            <span>Редактор скрипта (JavaScript / Pine API)</span>
            <span>{lineCount} строк • {visibleCandles.length} свечей</span>
          </div>

          <div className="flex flex-1 relative overflow-hidden font-mono text-xs">
            {/* Line numbers column */}
            <div className="w-10 py-2.5 select-none bg-[#10131b] border-r border-[#2a2e39] text-tv-textMuted/50 text-right pr-2 font-mono text-[11px] leading-5 overflow-hidden">
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>

            {/* Textarea Code Input */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 p-2.5 bg-transparent text-white text-[12px] font-mono leading-5 resize-none focus:outline-none overflow-y-auto whitespace-pre selection:bg-tv-blue/40"
              placeholder="// Напишите ваш скрипт здесь..."
            />
          </div>
        </div>

        {/* Execution Output & Diagnostics Console (Col 9-12) */}
        <div className="lg:col-span-4 flex flex-col bg-[#131722] rounded-xl border border-[#2a2e39] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#181b24] border-b border-[#2a2e39] text-[11px] text-tv-textMuted font-mono">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-tv-yellow" />
              <span>Консоль выполнения</span>
            </div>
            {scriptOutput && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                  scriptOutput.success ? 'bg-tv-green/20 text-tv-green' : 'bg-tv-red/20 text-tv-red'
                }`}
              >
                {scriptOutput.success ? `${scriptOutput.executionTimeMs} ms` : 'Ошибка'}
              </span>
            )}
          </div>

          <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 bg-[#0f1118]">
            {!scriptOutput && (
              <div className="text-tv-textMuted/70 italic text-center py-6">
                Нажмите «Применить к графику» для расчета индикатора.
              </div>
            )}

            {scriptOutput?.error && (
              <div className="p-2.5 rounded-lg bg-tv-red/15 border border-tv-red/30 text-tv-red space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Ошибка расчета</span>
                </div>
                <div className="text-[11px] leading-relaxed break-words">{scriptOutput.error}</div>
              </div>
            )}

            {scriptOutput?.logs && scriptOutput.logs.length > 0 && (
              <div className="space-y-1">
                {scriptOutput.logs.map((log, i) => (
                  <div
                    key={i}
                    className={`leading-relaxed break-words ${
                      log.startsWith('✓')
                        ? 'text-tv-green font-semibold'
                        : log.startsWith('✕')
                        ? 'text-tv-red'
                        : log.startsWith('Предупреждение')
                        ? 'text-tv-yellow'
                        : 'text-tv-text'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}

            {/* Plotted Output Summary */}
            {scriptOutput?.success && (
              <div className="mt-3 pt-2 border-t border-[#2a2e39] space-y-1 text-[10px] text-tv-textMuted">
                <div className="font-semibold text-white">Вывод на график:</div>
                <div className="flex items-center gap-2">
                  <span>• Линий:</span>
                  <span className="text-white font-semibold">{scriptOutput.lines.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>• Сигнальных маркеров:</span>
                  <span className="text-white font-semibold">{scriptOutput.markers.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>• Зон/имбалансов:</span>
                  <span className="text-white font-semibold">{scriptOutput.boxes.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
