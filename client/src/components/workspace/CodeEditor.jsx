import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

const LANGUAGES = [
  { key: 'html', label: 'HTML', language: 'html', color: 'text-orange-600' },
  { key: 'css', label: 'CSS', language: 'css', color: 'text-sky-600' },
  { key: 'js', label: 'JavaScript', language: 'javascript', color: 'text-amber-600' },
];

/**
 * Tabbed Monaco editor for the challenge workspace.
 * Controlled: the parent owns `code` ({ html, css, js }).
 */
export function CodeEditor({ code, onChange, activeTab, onTabChange, preferences = {}, readOnly = false, className = '' }) {
  const [ready, setReady] = useState(false);
  const editorRef = useRef(null);
  const active = useMemo(() => LANGUAGES.find((item) => item.key === activeTab) ?? LANGUAGES[0], [activeTab]);

  useEffect(() => {
    let cancelled = false;
    import('../../lib/monacoSetup.js').then(({ setupMonaco }) => {
      setupMonaco();
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the model in sync when the parent replaces the code (reset, load).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model && typeof code[active.key] === 'string' && model.getValue() !== code[active.key]) {
      model.setValue(code[active.key]);
    }
  }, [code, active.key]);

  const theme = preferences.editorTheme === 'dark' ? 'learnai-dark' : 'learnai-light';

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {LANGUAGES.map((tab) => {
          const isActive = tab.key === active.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isActive ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500 hover:bg-white/60 hover:text-ink-700'
              }`}
              aria-selected={isActive}
              role="tab"
            >
              <span className={isActive ? tab.color : ''}>{tab.label}</span>
            </button>
          );
        })}
        <span className="ml-auto pr-2 text-[11px] text-ink-400">{readOnly ? 'read only' : `${preferences.tabSize ?? 2} spaces`}</span>
      </div>

      <div className="relative min-h-[18rem] flex-1">
        {!ready ? (
          <div className="flex h-full min-h-[18rem] items-center justify-center gap-2 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading editor…
          </div>
        ) : null}
        <Editor
          key={active.key}
          language={active.language}
          value={code[active.key] ?? ''}
          theme={theme}
          height="100%"
          onChange={(value) => onChange(active.key, value ?? '')}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          loading={<div className="flex h-full items-center justify-center text-sm text-ink-500">Loading editor…</div>}
          options={{
            readOnly,
            fontSize: preferences.editorFontSize ?? 14,
            tabSize: preferences.tabSize ?? 2,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbersMinChars: 3,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            formatOnPaste: false,
            contextmenu: true,
            quickSuggestions: { other: true, comments: false, strings: false },
          }}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
