import { load } from 'cheerio';
import postcss from 'postcss';
import { parse } from 'acorn';
import { full } from 'acorn-walk';
import { calculateScore } from './progressionService.js';
const normalize = s => s.trim().replace(/\s+/g, ' ').toLowerCase();
function callName(node) {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'MemberExpression' && !node.computed) {
    const parent = callName(node.object);
    return parent ? `${parent}.${node.property.name}` : node.property.name;
  }
  return '';
}
// Static parsing only: no eval, vm, browser, imports, network, or submitted-code execution.
// Replace this adapter with an authenticated, resource-limited remote runner when needed.
export async function evaluateSubmission(challenge, code) {
  let $, css; const nodes = []; let jsValid = true;
  try { $ = load(code.htmlCode); } catch { /* malformed parser input fails HTML checks */ }
  try { css = postcss.parse(code.cssCode); } catch { /* fail CSS checks */ }
  try { full(parse(code.jsCode, { ecmaVersion: 2024, sourceType: 'module' }), node => nodes.push(node)); } catch { jsValid = false; }
  const tests = challenge.testCases;
  const testResults = tests.map(test => {
    let passed = false;
    try {
      if (test.type === 'html-selector') passed = !!$ && $(test.selector).length >= (test.minCount || 1);
      if (test.type === 'html-attribute') passed = !!$ && $(test.selector).toArray().some(el => $(el).attr(test.attribute) === test.expected);
      if (test.type === 'css-declaration' && css) css.walkRules(rule => {
        if (!rule.selectors.includes(test.selector)) return;
        let ancestor = rule.parent; let mediaMatches = !test.media; let conditional = false;
        while (ancestor) {
          if (ancestor.type === 'atrule') {
            conditional = true;
            if (ancestor.name === 'media' && test.media && normalize(ancestor.params) === normalize(test.media)) mediaMatches = true;
          }
          ancestor = ancestor.parent;
        }
        if (!mediaMatches || (!test.media && conditional)) return;
        for (const declaration of rule.nodes || []) if (declaration.type === 'decl' && normalize(declaration.prop) === normalize(test.property) && normalize(declaration.value) === normalize(test.expected)) passed = true;
      });
      if (test.type === 'js-node') passed = jsValid && nodes.some(n => n.type === test.nodeType);
      if (test.type === 'js-call') passed = jsValid && nodes.some(n => n.type === 'CallExpression' && (callName(n.callee) === test.callee || callName(n.callee).endsWith(`.${test.callee}`)));
    } catch { passed = false; }
    return { label: test.label, passed };
  });
  return { ...calculateScore(tests, testResults), testResults, evaluationMode: 'static-v1' };
}
