import { parseHtml } from './htmlAnalyzer.js';
import { parseCss } from './cssAnalyzer.js';
import { analyzeJs } from './jsAnalyzer.js';

/**
 * Analyze the three submitted sources once per submission. Everything the test
 * runner needs is derived here — the analyzers never execute user code.
 */
export function analyzeSubmission({ html = '', css = '', js = '' } = {}) {
  return {
    html: parseHtml(html),
    css: parseCss(css),
    js: analyzeJs(js),
    sources: { html, css, js },
  };
}

export { parseHtml, parseCss, analyzeJs };
export default { analyzeSubmission };
