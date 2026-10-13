/**
 * Monaco is bundled locally (no CDN) so the workspace also works offline or
 * behind restrictive proxies. Only the three languages this platform needs
 * (HTML, CSS, JavaScript) are registered to keep the chunk size sane.
 */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/language/html/monaco.contribution';
import 'monaco-editor/esm/vs/language/css/monaco.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import { loader } from '@monaco-editor/react';

let configured = false;

export function setupMonaco() {
  if (configured || typeof window === 'undefined') return;

  self.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      switch (label) {
        case 'html':
        case 'handlebars':
        case 'razor':
          return new htmlWorker();
        case 'css':
        case 'scss':
        case 'less':
          return new cssWorker();
        case 'typescript':
        case 'javascript':
          return new tsWorker();
        default:
          return new editorWorker();
      }
    },
  };

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
  });

  monaco.editor.defineTheme('learnai-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
      { token: 'keyword', foreground: '4f46e5' },
      { token: 'string', foreground: '0f766e' },
      { token: 'number', foreground: 'b45309' },
      { token: 'tag', foreground: 'be185d' },
      { token: 'attribute.name', foreground: '4338ca' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.lineHighlightBackground': '#f8fafc',
      'editorLineNumber.foreground': '#cbd5f5',
      'editorLineNumber.activeForeground': '#64748b',
      'editorIndentGuide.background1': '#eef2f7',
      'editor.selectionBackground': '#dbe4ff',
    },
  });

  monaco.editor.defineTheme('learnai-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [{ token: 'comment', foreground: '94a3b8', fontStyle: 'italic' }],
    colors: {
      'editor.background': '#0f172a',
      'editorGutter.background': '#0f172a',
    },
  });

  loader.config({ monaco });
  configured = true;
}

export { monaco };
export default setupMonaco;
