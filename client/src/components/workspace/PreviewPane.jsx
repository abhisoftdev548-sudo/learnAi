import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Eye, Monitor, RefreshCw, Smartphone, Terminal } from 'lucide-react';
import { buildSandboxDocument } from '../../lib/sandbox.js';

const PREVIEW_TOKEN = 'learnai-preview';

const DEVICE_PRESETS = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: null },
  { key: 'tablet', label: 'Tablet', icon: Eye, width: 768 },
  { key: 'mobile', label: 'Mobile', icon: Smartphone, width: 390 },
];

/**
 * Live, sandboxed preview of the user's code (`sandbox="allow-scripts"`, opaque
 * origin — it cannot touch the app). `reload()` re-creates the document, which
 * is what the Run button uses.
 */
export const PreviewPane = forwardRef(function PreviewPane(
  { code, device = 'desktop', onDeviceChange, showConsole = false, onToggleConsole, consoleLines = [], className = '' },
  ref,
) {
  const frameRef = useRef(null);

  const document_ = useMemo(
    () => buildSandboxDocument({ html: code.html, css: code.css, js: code.js, token: PREVIEW_TOKEN }),
    // The preview only rebuilds when explicitly reloaded (Run) to avoid rude remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code.reloadKey],
  );

  useImperativeHandle(ref, () => ({
    reload: () => {
      const frame = frameRef.current;
      if (!frame) return;
      frame.srcdoc = buildSandboxDocument({ html: code.html, css: code.css, js: code.js, token: PREVIEW_TOKEN });
    },
  }));

  const activeDevice = DEVICE_PRESETS.find((preset) => preset.key === device) ?? DEVICE_PRESETS[0];

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-600">
          <Eye className="h-3.5 w-3.5 text-brand-500" /> Live preview
        </span>

        <div className="ml-auto flex items-center gap-1">
          {DEVICE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => onDeviceChange?.(preset.key)}
              className={`rounded-lg p-1.5 transition ${device === preset.key ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}
              title={`${preset.label}${preset.width ? ` (${preset.width}px)` : ''}`}
              aria-label={`Preview in ${preset.label}`}
            >
              <preset.icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => (onToggleConsole ? onToggleConsole() : null)}
            className={`rounded-lg p-1.5 transition ${showConsole ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}
            title="Toggle console"
            aria-label="Toggle console"
          >
            <Terminal className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => ref?.current?.reload?.()}
            className="rounded-lg p-1.5 text-ink-400 transition hover:text-ink-600"
            title="Reload preview"
            aria-label="Reload preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 justify-center overflow-hidden bg-slate-100 p-2">
        <iframe
          ref={frameRef}
          title="Challenge preview"
          sandbox="allow-scripts"
          srcDoc={document_}
          className="h-full w-full min-h-[16rem] rounded-lg border border-slate-200 bg-white"
          style={activeDevice.width ? { maxWidth: activeDevice.width } : undefined}
        />
      </div>

      {showConsole ? (
        <div className="max-h-40 overflow-y-auto border-t border-slate-200 bg-ink-900 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-200">
          {consoleLines.length ? (
            consoleLines.map((line, index) => (
              <p key={index} className={line.level === 'error' ? 'text-rose-300' : line.level === 'warn' ? 'text-amber-300' : 'text-slate-300'}>
                <span className="text-slate-500">›</span> {line.message}
              </p>
            ))
          ) : (
            <p className="text-slate-500">Console output from your code appears here (console.log, warnings, errors).</p>
          )}
        </div>
      ) : null}
    </div>
  );
});

export default PreviewPane;
