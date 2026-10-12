import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/editor/browser/coreCommands.js";
import "monaco-editor/editor/contrib/clipboard/browser/clipboard.js";
import "monaco-editor/editor/contrib/find/browser/findController.js";
import "monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching.js";
import "monaco-editor/editor/contrib/folding/browser/folding.js";
import "monaco-editor/editor/contrib/suggest/browser/suggestController.js";
import "monaco-editor/editor/contrib/hover/browser/hoverContribution.js";
import "monaco-editor/languages/definitions/html/register.js";
import "monaco-editor/languages/definitions/css/register.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/language/typescript/monaco.contribution.js";
import "monaco-editor/language/css/monaco.contribution.js";
import "monaco-editor/language/html/monaco.contribution.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import CSSWorker from "monaco-editor/language/css/css.worker.js?worker";
import HTMLWorker from "monaco-editor/language/html/html.worker.js?worker";
import { LoaderCircle } from "lucide-react";
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "typescript" || label === "javascript")
      return new TypeScriptWorker();
    if (label === "css") return new CSSWorker();
    if (label === "html") return new HTMLWorker();
    return new EditorWorker();
  },
};
loader.config({ monaco });
monaco.editor.defineTheme("learnai", {
  base: "vs",
  inherit: true,
  rules: [{ token: "comment", foreground: "8A92A4", fontStyle: "italic" }],
  colors: {
    "editor.background": "#FFFFFF",
    "editorLineNumber.foreground": "#BBC1D0",
    "editor.lineHighlightBackground": "#F8F8FC",
    "editor.selectionBackground": "#E5DFFF",
    "editorCursor.foreground": "#6D5BDE",
  },
});
export default function CodeEditor({
  language,
  value,
  onChange,
  height = "100%",
  readOnly = false,
  path,
}) {
  return (
    <Editor
      height={height}
      language={language}
      path={path}
      value={value}
      onChange={(value) => onChange?.(value || "")}
      theme="learnai"
      loading={
        <div className="editor-loading">
          <LoaderCircle size={20} className="spin" />
          Loading your editor…
        </div>
      }
      options={{
        readOnly,
        editContext: false,
        autoClosingBrackets: "never",
        autoClosingQuotes: "never",
        autoSurround: "never",
        minimap: { enabled: false },
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 12,
        lineHeight: 22,
        padding: { top: 18, bottom: 18 },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        renderLineHighlight: "line",
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        folding: true,
        ariaLabel: `${language} code editor`,
        fixedOverflowWidgets: true,
        accessibilitySupport: "auto",
      }}
    />
  );
}
