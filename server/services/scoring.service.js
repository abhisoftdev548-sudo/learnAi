/**
 * Scoring engine.
 *
 * Every challenge defines declarative test cases grouped into the five rubric
 * groups (HTML 20 / CSS 25 / Functionality 30 / Responsiveness 15 / Code quality
 * 10 = 100 points).
 *
 *  - `kind: 'static'` tests are judged here on the server from the deterministic
 *    source analysis. No submitted code is ever executed.
 *  - `kind: 'measure'` tests need a live DOM, so raw *measurements* come from an
 *    execution provider (sandboxed client iframe by default) and are judged here
 *    against the declarative `checks`. The provider only reports values; the
 *    server decides pass/fail and the points.
 */
import { MAX_SCORE, SCORING_GROUPS } from '../config/constants.js';
import { buildRegExp } from './analysis/jsAnalyzer.js';
import { cssLengthToPx, declarations, findResponsiveMedia, fluidTechniques } from './analysis/cssAnalyzer.js';
import { queryAll, textContent } from './analysis/htmlAnalyzer.js';

const GROUP_MAP = new Map(SCORING_GROUPS.map((group) => [group.key, group]));

export class ScoringError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ScoringError';
    this.details = details;
  }
}

/* ------------------------------------------------------------------ *
 * Value helpers
 * ------------------------------------------------------------------ */

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function normalize(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function looseEquals(a, b) {
  return normalize(a) === normalize(b);
}

function numericCompare(actual, expected, op) {
  const left = toNumber(actual);
  const right = toNumber(expected);
  if (left === null || right === null) return false;
  switch (op) {
    case 'gt':
      return left > right;
    case 'gte':
      return left >= right;
    case 'lt':
      return left < right;
    case 'lte':
      return left <= right;
    case 'eq':
      return Math.abs(left - right) <= 0.001;
    default:
      return false;
  }
}

/** Numbers may arrive as "16px", "1.5rem", "100%" or plain numbers. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || value === undefined) return null;
  const px = cssLengthToPx(value);
  if (px !== null) return px;
  const parsed = Number.parseFloat(String(value).replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function describeValue(value) {
  if (value === null || value === undefined) return 'nothing';
  if (Array.isArray(value)) return value.map((entry) => describeValue(entry)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function result(test, { passed, actual = null, expected = null, message = '' }) {
  return {
    testId: test.id,
    name: test.name,
    group: test.group,
    weight: test.weight ?? 1,
    passed: Boolean(passed),
    actual,
    expected,
    message: passed ? '' : message || test.failureMessage || 'Requirement not met',
  };
}

/* ------------------------------------------------------------------ *
 * Static test evaluation
 * ------------------------------------------------------------------ */

export function evaluateStaticTest(test, analysis) {
  try {
    switch (test.type) {
      case 'html-selector':
        return evaluateHtmlSelector(test, analysis);
      case 'html-attribute':
        return evaluateHtmlAttribute(test, analysis);
      case 'html-text':
        return evaluateHtmlText(test, analysis);
      case 'html-count':
        return evaluateHtmlCount(test, analysis);
      case 'css-declaration':
        return evaluateCssDeclaration(test, analysis);
      case 'css-media':
        return evaluateCssMedia(test, analysis);
      case 'css-selector':
        return evaluateCssSelector(test, analysis);
      case 'css-keyframes':
        return evaluateCssKeyframes(test, analysis);
      case 'js-pattern':
        return evaluateJsPattern(test, analysis);
      case 'code-quality':
        return evaluateCodeQuality(test, analysis);
      default:
        return result(test, { passed: false, message: `Unsupported static test type "${test.type}"` });
    }
  } catch (error) {
    return result(test, { passed: false, message: `Test could not be evaluated: ${error.message}` });
  }
}

function evaluateHtmlSelector(test, analysis) {
  const matches = queryAll(analysis.html.root, test.selector);
  const count = matches.length;
  const wanted = test.count ?? (typeof test.value === 'number' ? test.value : null);

  switch (test.operator) {
    case 'exists':
      return matches.length > 0
        ? result(test, { passed: true, actual: `${count} match(es)` })
        : result(test, { passed: false, actual: '0 matches', expected: `an element matching ${test.selector}`, message: `No element matched "${test.selector}"` });
    case 'not-exists':
    case 'not-contains':
      return count === 0
        ? result(test, { passed: true, actual: '0 matches' })
        : result(test, { passed: false, actual: `${count} match(es)`, expected: 'no matches' });
    case 'min-count':
      return count >= (wanted ?? 1)
        ? result(test, { passed: true, actual: count })
        : result(test, { passed: false, actual: count, expected: `>= ${wanted ?? 1}` });
    case 'max-count':
      return count <= (wanted ?? 1)
        ? result(test, { passed: true, actual: count })
        : result(test, { passed: false, actual: count, expected: `<= ${wanted ?? 1}` });
    case 'equals':
    case 'contains':
    case 'regex':
    case 'any-of':
    case 'one-of': {
      if (!matches.length) return result(test, { passed: false, actual: '0 matches', expected: `an element matching ${test.selector}` });
      const values = matches.map((node) => textContent(node));
      return judgeTextValues(test, values);
    }
    case 'gte':
    case 'lte': {
      if (!matches.length) return result(test, { passed: false, actual: '0 matches' });
      return numericCompare(textContent(matches[0]), test.value, test.operator)
        ? result(test, { passed: true, actual: textContent(matches[0]) })
        : result(test, { passed: false, actual: textContent(matches[0]), expected: `${test.operator} ${test.value}` });
    }
    default:
      return result(test, { passed: false, message: `Unsupported operator "${test.operator}"` });
  }
}

function judgeTextValues(test, values) {
  switch (test.operator) {
    case 'equals':
      return values.some((value) => looseEquals(value, test.value))
        ? result(test, { passed: true, actual: values.join(' | ') })
        : result(test, { passed: false, actual: values.join(' | '), expected: test.value });
    case 'contains':
      return values.some((value) => normalize(value).includes(normalize(test.value)))
        ? result(test, { passed: true, actual: values.join(' | ') })
        : result(test, { passed: false, actual: values.join(' | '), expected: `contains "${test.value}"` });
    case 'not-contains':
      return values.every((value) => !normalize(value).includes(normalize(test.value)))
        ? result(test, { passed: true, actual: values.join(' | ') })
        : result(test, { passed: false, actual: values.join(' | '), expected: `does not contain "${test.value}"` });
    case 'regex': {
      const regex = buildRegExp(test.pattern || String(test.value ?? ''), test.flags);
      if (!regex) return result(test, { passed: false, message: 'Invalid pattern in test definition' });
      return values.some((value) => regex.test(value))
        ? result(test, { passed: true, actual: values.join(' | ') })
        : result(test, { passed: false, actual: values.join(' | '), expected: `matches /${regex.source}/` });
    }
    case 'any-of':
    case 'one-of': {
      const allowed = asArray(test.value);
      return values.some((value) => allowed.some((candidate) => looseEquals(value, candidate)))
        ? result(test, { passed: true, actual: values.join(' | ') })
        : result(test, { passed: false, actual: values.join(' | '), expected: `one of ${describeValue(allowed)}` });
    }
    default:
      return result(test, { passed: false, message: `Unsupported operator "${test.operator}"` });
  }
}

function evaluateHtmlAttribute(test, analysis) {
  const matches = queryAll(analysis.html.root, test.selector);
  if (!matches.length) {
    return result(test, { passed: false, actual: '0 matches', expected: `an element matching ${test.selector}` });
  }
  const attribute = String(test.attribute).toLowerCase();
  const present = matches.filter((node) => attribute in node.attrs);
  const values = present.map((node) => node.attrs[attribute]);

  switch (test.operator) {
    case 'exists':
      return present.length > 0
        ? result(test, { passed: true, actual: describeValue(values[0]) })
        : result(test, { passed: false, actual: `${test.selector} has no [${attribute}]`, expected: `[${attribute}] attribute` });
    case 'not-exists':
      return present.length === 0
        ? result(test, { passed: true, actual: 'attribute absent' })
        : result(test, { passed: false, actual: describeValue(values[0]), expected: `no [${attribute}]` });
    case 'equals':
      return values.some((value) => looseEquals(value, test.value))
        ? result(test, { passed: true, actual: describeValue(values) })
        : result(test, { passed: false, actual: describeValue(values), expected: test.value });
    case 'contains':
      return values.some((value) => normalize(value).includes(normalize(test.value)))
        ? result(test, { passed: true, actual: describeValue(values) })
        : result(test, { passed: false, actual: describeValue(values), expected: `contains ${test.value}` });
    case 'regex': {
      const regex = buildRegExp(test.pattern || String(test.value ?? ''), test.flags);
      if (!regex) return result(test, { passed: false, message: 'Invalid pattern in test definition' });
      return values.some((value) => regex.test(value))
        ? result(test, { passed: true, actual: describeValue(values) })
        : result(test, { passed: false, actual: describeValue(values), expected: `matches /${regex.source}/` });
    }
    case 'one-of':
    case 'any-of': {
      const allowed = asArray(test.value);
      return values.some((value) => allowed.some((candidate) => looseEquals(value, candidate)))
        ? result(test, { passed: true, actual: describeValue(values) })
        : result(test, { passed: false, actual: describeValue(values), expected: `one of ${describeValue(allowed)}` });
    }
    default:
      return result(test, { passed: false, message: `Unsupported operator "${test.operator}"` });
  }
}

function evaluateHtmlText(test, analysis) {
  return evaluateHtmlSelector({ ...test, operator: test.operator === 'exists' ? 'contains' : test.operator }, analysis);
}

function evaluateHtmlCount(test, analysis) {
  const count = queryAll(analysis.html.root, test.selector).length;
  const wanted = test.count ?? Number(test.value ?? 0);
  switch (test.operator) {
    case 'equals':
      return count === wanted
        ? result(test, { passed: true, actual: count })
        : result(test, { passed: false, actual: count, expected: wanted });
    case 'gte':
    case 'min-count':
      return count >= wanted
        ? result(test, { passed: true, actual: count })
        : result(test, { passed: false, actual: count, expected: `>= ${wanted}` });
    case 'lte':
    case 'max-count':
      return count <= wanted
        ? result(test, { passed: true, actual: count })
        : result(test, { passed: false, actual: count, expected: `<= ${wanted}` });
    default:
      return result(test, { passed: false, message: `Unsupported operator "${test.operator}"` });
  }
}

function evaluateCssDeclaration(test, analysis) {
  const rules = analysis.css.rules.filter((rule) => matchesCssSelector(rule, test.selector, test));
  if (!rules.length) {
    return result(test, {
      passed: false,
      actual: `no rule for ${test.selector}`,
      expected: `a rule for ${test.selector}`,
      message: test.failureMessage || `No CSS rule targets "${test.selector}"`,
    });
  }
  const property = String(test.property).toLowerCase();
  const candidates = rules.flatMap((rule) =>
    rule.declarations.filter((decl) => decl.property === property).map((decl) => ({ ...decl, media: rule.media, selectorText: rule.selectorText })),
  );

  // "must not be declared" has to be answered before the empty-candidates path.
  if (test.operator === 'not-exists') {
    return candidates.length === 0
      ? result(test, { passed: true, actual: `${property} not declared` })
      : result(test, { passed: false, actual: candidates.map((candidate) => candidate.value).join(' | '), expected: `no ${property} declaration`, message: test.failureMessage });
  }

  if (!candidates.length) {
    return result(test, {
      passed: false,
      actual: `${test.selector} has no ${property} declaration`,
      expected: `${property}: ${describeValue(test.value)}`,
      message: test.failureMessage || `"${test.selector}" does not declare "${property}"`,
    });
  }

  const actual = candidates.map((candidate) => candidate.value).join(' | ');
  switch (test.operator) {
    case 'exists':
      return result(test, { passed: true, actual });
    case 'equals':
      return candidates.some((candidate) => looseEquals(candidate.value, test.value))
        ? result(test, { passed: true, actual })
        : result(test, { passed: false, actual, expected: test.value });
    case 'one-of':
    case 'any-of': {
      const allowed = asArray(test.value);
      return candidates.some((candidate) => allowed.some((value) => looseEquals(candidate.value, value)))
        ? result(test, { passed: true, actual })
        : result(test, { passed: false, actual, expected: `one of ${describeValue(allowed)}` });
    }
    case 'contains':
      return candidates.some((candidate) => normalize(candidate.value).includes(normalize(test.value)))
        ? result(test, { passed: true, actual })
        : result(test, { passed: false, actual, expected: `contains ${test.value}` });
    case 'regex': {
      const regex = buildRegExp(test.pattern || String(test.value ?? ''), test.flags);
      if (!regex) return result(test, { passed: false, message: 'Invalid pattern in test definition' });
      return candidates.some((candidate) => regex.test(candidate.value))
        ? result(test, { passed: true, actual })
        : result(test, { passed: false, actual, expected: `matches /${regex.source}/` });
    }
    case 'gte':
    case 'lte':
    case 'gt':
    case 'lt': {
      const wanted = toNumber(test.value);
      const matched = candidates.some((candidate) => {
        const value = toNumber(candidate.value);
        if (value === null || wanted === null) return false;
        if (test.operator === 'gte') return value >= wanted;
        if (test.operator === 'lte') return value <= wanted;
        if (test.operator === 'gt') return value > wanted;
        return value < wanted;
      });
      return matched
        ? result(test, { passed: true, actual })
        : result(test, { passed: false, actual, expected: `${test.operator} ${test.value}` });
    }
    case 'media-present': {
      const inMedia = candidates.some((candidate) => candidate.media?.length);
      return inMedia
        ? result(test, { passed: true, actual })
        : result(test, { passed: false, actual, expected: 'declaration inside a media query' });
    }
    default:
      return result(test, { passed: false, message: `Unsupported operator "${test.operator}"` });
  }
}

function matchesCssSelector(rule, selector, test = {}) {
  if (!selector) return true;
  const needle = String(selector).replace(/\s*([>+~,])\s*/g, '$1').toLowerCase();
  return rule.selectors.some((candidate) => {
    const flat = candidate.replace(/\s*([>+~,])\s*/g, '$1').toLowerCase();
    if (flat === needle || flat.includes(needle)) return true;
    // Allow `.card` to match `.card:hover` / `.card::after` etc.
    return flat.split(/[^a-z0-9_.#\-[\]=:"']+/).includes(needle);
  });
}

function evaluateCssMedia(test, analysis) {
  const maxWidth = toNumber(test.value) ?? 900;
  if (test.operator === 'media-present') {
    const found = findResponsiveMedia(analysis.css, { maxWidthLte: maxWidth, minWidthLte: maxWidth });
    return found.length
      ? result(test, { passed: true, actual: found.map((entry) => entry.query).join(' | ') })
      : result(test, {
          passed: false,
          actual: analysis.css.mediaQueries.map((entry) => entry.query).join(' | ') || 'no media queries',
          expected: `a media query for widths <= ${maxWidth}px`,
          message: test.failureMessage || `No media query adapts the layout for screens up to ${maxWidth}px`,
        });
  }

  // Rule level media check: `selector` must be restyled inside a media query
  // that targets a viewport `<= value` px (value defaults to 900).
  const responsiveRules = analysis.css.rules.filter(
    (rule) => rule.media?.length && matchesCssSelector(rule, test.selector, test) && ruleSitsInSmallViewport(rule, maxWidth),
  );
  if (!responsiveRules.length) {
    const allMediaRules = analysis.css.rules.filter((rule) => rule.media?.length).map((rule) => `${rule.selectorText} @ ${rule.media.join(' & ')}`);
    return result(test, {
      passed: false,
      actual: allMediaRules.length ? allMediaRules.join(' | ') : 'no media queries',
      expected: `${test.selector} inside @media (max-width: ${maxWidth}px)`,
      message: test.failureMessage || `No media query up to ${maxWidth}px overrides "${test.selector}"`,
    });
  }
  if (!test.property) {
    return result(test, { passed: true, actual: responsiveRules.map((rule) => rule.media.join(' & ')).join(' | ') });
  }

  const property = String(test.property).toLowerCase();
  const matches = responsiveRules.flatMap((rule) => rule.declarations.filter((decl) => decl.property === property));
  if (!matches.length) {
    return result(test, {
      passed: false,
      actual: `${test.selector} does not set ${property} inside a media query`,
      expected: `${property} inside a media query`,
      message: test.failureMessage || `"${test.selector}" never declares "${property}" responsively`,
    });
  }
  const actual = matches.map((decl) => decl.value).join(' | ');
  const outcome = matches.some((decl) => {
    if (test.operator === 'regex') return Boolean(buildRegExp(test.pattern || String(test.value ?? ''), test.flags)?.test(decl.value));
    if (test.operator === 'contains') return normalize(decl.value).includes(normalize(test.pattern || test.count));
    return true; // exists / media-present / equals-on-presence
  });
  return outcome
    ? result(test, { passed: true, actual })
    : result(test, { passed: false, actual, expected: `value matching /${test.pattern}/` });
}

/** Media query targets a viewport at or below `maxWidth` px. */
function ruleSitsInSmallViewport(rule, maxWidth) {
  return (rule.media ?? []).some((query) => {
    const features = parseMediaQueryFeatures(query);
    if (features['max-width'] !== undefined) {
      const px = cssLengthToPx(features['max-width']);
      return px !== null && px <= maxWidth;
    }
    if (features['min-width'] !== undefined) {
      const px = cssLengthToPx(features['min-width']);
      return px !== null && px <= maxWidth;
    }
    return false;
  });
}

function parseMediaQueryFeatures(query) {
  const features = {};
  const regex = /\(\s*([\w-]+)\s*:\s*([^)]+)\)/g;
  let match = regex.exec(query);
  while (match) {
    features[match[1].toLowerCase()] = match[2].trim().toLowerCase();
    match = regex.exec(query);
  }
  return features;
}

function evaluateCssSelector(test, analysis) {
  const selector = test.selector || String(test.value ?? '');
  const rules = analysis.css.rules.filter((rule) => matchesCssSelector(rule, selector, test));
  const count = rules.length;
  const wanted = test.count ?? (Number.isFinite(Number(test.value)) && test.value !== null ? Number(test.value) : 1);
  switch (test.operator) {
    case 'exists':
    case 'min-count':
      return count >= wanted
        ? result(test, { passed: true, actual: `${count} rule(s)` })
        : result(test, {
            passed: false,
            actual: `${count} rule(s)`,
            expected: `a rule for ${selector}`,
            message: test.failureMessage || `No CSS rule targets "${selector}"`,
          });
    case 'equals':
      return count === (test.count ?? 1)
        ? result(test, { passed: true, actual: count })
        : result(test, { passed: false, actual: count, expected: test.count ?? 1 });
    case 'not-exists':
      return count === 0 ? result(test, { passed: true, actual: 0 }) : result(test, { passed: false, actual: count, expected: 0 });
    default:
      return result(test, { passed: false, message: `Unsupported operator "${test.operator}"` });
  }
}

function evaluateCssKeyframes(test, analysis) {
  const name = String(test.value ?? test.pattern ?? '*').trim();
  const found = analysis.css.keyframes.filter((keyframes) => name === '*' || keyframes.name.toLowerCase() === name.toLowerCase());
  if (test.operator === 'not-exists') {
    return found.length === 0
      ? result(test, { passed: true, actual: 'none' })
      : result(test, { passed: false, actual: found.map((entry) => entry.name).join(', ') });
  }
  return found.length
    ? result(test, { passed: true, actual: found.map((entry) => entry.name).join(', ') })
    : result(test, {
        passed: false,
        actual: analysis.css.keyframes.length ? analysis.css.keyframes.map((entry) => entry.name).join(', ') : 'no @keyframes',
        expected: name === '*' ? 'a @keyframes animation' : `@keyframes ${name}`,
      });
}

function evaluateJsPattern(test, analysis) {
  const regex = buildRegExp(test.pattern || String(test.value ?? ''), test.flags);
  if (!regex) return result(test, { passed: false, message: 'Invalid regex pattern in test definition' });
  const matched = analysis.js.matches(regex, test.scope || 'code');
  switch (test.operator) {
    case 'regex':
      return matched
        ? result(test, { passed: true, actual: `matches /${regex.source}/` })
        : result(test, { passed: false, actual: 'no match', expected: `code matches /${regex.source}/`, message: test.failureMessage });
    case 'not-contains':
    case 'not-exists':
      return !matched
        ? result(test, { passed: true, actual: 'not present' })
        : result(test, { passed: false, actual: `matches /${regex.source}/`, expected: 'pattern absent', message: test.failureMessage });
    case 'contains': {
      const needle = test.value ?? test.pattern ?? '';
      const target = test.scope === 'raw' ? analysis.js.raw : test.scope === 'masked' ? analysis.js.masked : analysis.js.code;
      return target.includes(String(needle))
        ? result(test, { passed: true, actual: `found "${needle}"` })
        : result(test, { passed: false, actual: 'not found', expected: `"${needle}"` });
    }
    case 'min-count': {
      const count = analysis.js.countIdentifier(String(test.value ?? ''));
      return count >= (test.count ?? 1)
        ? result(test, { passed: true, actual: count })
        : result(test, { passed: false, actual: count, expected: `>= ${test.count ?? 1}` });
    }
    case 'max-count': {
      const count = analysis.js.countIdentifier(String(test.value ?? ''));
      return count <= (test.count ?? 1)
        ? result(test, { passed: true, actual: count })
        : result(test, { passed: false, actual: count, expected: `<= ${test.count ?? 1}` });
    }
    default:
      return result(test, { passed: false, message: `Unsupported operator "${test.operator}"` });
  }
}

/* ------------------------------------------------------------------ *
 * Code quality checks
 * ------------------------------------------------------------------ */

export function evaluateCodeQuality(test, analysis) {
  const check = String(test.check || test.value || '').trim();
  const { js, html, css } = analysis;

  const checks = {
    'balanced-braces': () => ({
      passed: js.quality.balanceOk,
      actual: js.quality.balanceOk ? 'balanced' : js.quality.balanceReason,
      expected: 'balanced braces, parentheses and brackets',
    }),
    'no-var': () => ({
      passed: js.counts.var === 0,
      actual: `${js.counts.var} var declaration(s)`,
      expected: 'use const/let instead of var',
    }),
    'modern-syntax': () => ({
      passed: js.counts.const + js.counts.let > 0,
      actual: `const: ${js.counts.const}, let: ${js.counts.let}`,
      expected: 'at least one const/let declaration',
    }),
    semicolons: () => ({
      passed: js.quality.semicolonRatio >= Number(test.value ?? 0.5),
      actual: js.quality.semicolonRatio,
      expected: `>= ${test.value ?? 0.5} of statement lines terminated`,
    }),
    'no-console': () => ({
      passed: js.counts.console === 0,
      actual: `${js.counts.console} console call(s)`,
      expected: 'no console statements in the submitted solution',
    }),
    'no-debugger': () => ({ passed: js.counts.debugger === 0, actual: `${js.counts.debugger} debugger statement(s)`, expected: 'no debugger statements' }),
    'no-alert': () => ({ passed: js.counts.alert === 0, actual: `${js.counts.alert} alert call(s)`, expected: 'no alert() calls' }),
    'no-eval': () => ({ passed: js.counts.eval === 0, actual: `${js.counts.eval} eval call(s)`, expected: 'no eval()' }),
    'no-document-write': () => ({ passed: js.counts.documentWrite === 0, actual: `${js.counts.documentWrite} document.write call(s)`, expected: 'no document.write' }),
    'no-todo': () => ({ passed: js.quality.todoCount === 0, actual: `${js.quality.todoCount} TODO/FIXME marker(s)`, expected: 'no leftover TODO/FIXME markers' }),
    'no-long-lines': () => ({
      passed: js.quality.longLineCount === 0,
      actual: `${js.quality.longLineCount} line(s) over 140 characters`,
      expected: 'no lines longer than 140 characters',
    }),
    'no-trailing-whitespace': () => ({
      passed: js.quality.trailingWhitespaceLines === 0,
      actual: `${js.quality.trailingWhitespaceLines} line(s) with trailing whitespace`,
      expected: 'no trailing whitespace',
    }),
    'has-comments': () => ({ passed: js.quality.hasComments, actual: js.quality.hasComments ? 'present' : 'none', expected: 'at least one comment explaining the solution' }),
    'max-lines': () => ({ passed: js.lines <= Number(test.value ?? 200), actual: `${js.lines} lines`, expected: `<= ${test.value ?? 200} lines` }),
    'min-lines': () => ({ passed: js.lines >= Number(test.value ?? 1), actual: `${js.lines} lines`, expected: `>= ${test.value ?? 1} lines` }),
    'no-inline-style': () => {
      const nodes = queryAll(html.root, '[style]');
      return { passed: nodes.length === 0, actual: `${nodes.length} element(s) with inline style`, expected: 'styling through CSS classes rather than inline styles' };
    },
    'no-inline-event-handlers': () => {
      const nodes = queryAll(html.root, '[onclick]');
      return {
        passed: nodes.length === 0,
        actual: `${nodes.length} element(s) with inline handlers`,
        expected: 'event listeners registered in JavaScript (no onclick attributes)',
      };
    },
    'form-labels': () => {
      const inputs = queryAll(html.root, 'input, select, textarea').length;
      const labels = queryAll(html.root, 'label').length;
      return { passed: inputs === 0 || labels > 0, actual: `${labels} label(s) for ${inputs} field(s)`, expected: 'every form control has a label' };
    },
    'uses-semantic-tags': () => {
      const semantic = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer', 'figure'].filter(
        (tag) => queryAll(html.root, tag).length > 0,
      );
      return { passed: semantic.length > 0, actual: semantic.join(', ') || 'none', expected: 'at least one semantic HTML element' };
    },
    'no-selector-overuse': () => {
      const total = html.raw.length;
      const divCount = queryAll(html.root, 'div').length;
      return { passed: divCount <= 25 || total > 2000, actual: `${divCount} div element(s)`, expected: 'avoid excessive div nesting' };
    },
    'css-no-important': () => {
      const important = declarations(css).filter((decl) => decl.important).length;
      return { passed: important <= Number(test.value ?? 0), actual: `${important} !important declaration(s)`, expected: `<= ${test.value ?? 0} !important` };
    },
    'css-uses-custom-properties': () => {
      const custom = declarations(css).filter((decl) => decl.property.startsWith('--')).length;
      return { passed: custom > 0, actual: `${custom} custom propert(ies)`, expected: 'CSS custom properties for theming' };
    },
    'css-transitions': () => {
      const found = declarations(css).filter((decl) => ['transition', 'animation'].includes(decl.property)).length;
      return { passed: found > 0, actual: `${found} transition/animation declaration(s)`, expected: 'a transition or animation for interactive feedback' };
    },
    'responsive-techniques': () => {
      const techniques = fluidTechniques(css);
      const minimum = Number(test.value ?? 1);
      return { passed: techniques.size >= minimum, actual: [...techniques].join(', ') || 'none', expected: `at least ${minimum} responsive technique(s)` };
    },
    'has-meta-viewport': () => {
      const nodes = queryAll(html.root, 'meta[name="viewport"]');
      return nodes.length ? { passed: true, actual: nodes[0].attrs.content ?? '' } : { passed: false, actual: 'missing', expected: 'meta viewport tag' };
    },
  };

  const evaluator = checks[check];
  if (!evaluator) {
    return result(test, { passed: false, message: `Unknown code quality check "${check}"` });
  }
  const outcome = evaluator();
  return result(test, {
    passed: outcome.passed,
    actual: outcome.actual,
    expected: outcome.expected,
    message: outcome.passed ? '' : test.failureMessage || `Code quality check "${check}" not satisfied`,
  });
}

/* ------------------------------------------------------------------ *
 * Measured (sandbox) tests
 * ------------------------------------------------------------------ */

export function judgeMeasureTest(test, measurement, { staticResults = new Map() } = {}) {
  if (!measurement) {
    return result(test, {
      passed: false,
      actual: 'no measurement reported',
      expected: 'measurements from the sandboxed preview',
      message: test.failureMessage || 'This test needs a live preview measurement; press Run before submitting.',
    });
  }
  if (measurement.error) {
    return result(test, { passed: false, actual: measurement.error, expected: 'measurement completed', message: measurement.error });
  }

  const failedDependencies = (test.requires ?? []).filter((id) => {
    const dependency = staticResults.get(id);
    return dependency && !dependency.passed;
  });
  if (failedDependencies.length) {
    return result(test, {
      passed: false,
      actual: `prerequisite test(s) failed: ${failedDependencies.join(', ')}`,
      expected: 'prerequisites satisfied',
      message: test.failureMessage || 'The behaviour could not be verified because structural requirements are not met',
    });
  }

  const values = measurement.values ?? measurement;
  const checks = test.checks ?? [];
  if (!checks.length) {
    // No declarative checks: the measurement itself reports the outcome.
    const passed = Boolean(values?.passed);
    return result(test, { passed, actual: values?.actual ?? values, expected: 'expected behaviour' });
  }

  for (const check of checks) {
    const actual = check.path.includes('.') ? readPath(values, check.path) : values?.[check.path];
    const baseline = check.comparePath ? (check.comparePath.includes('.') ? readPath(values, check.comparePath) : values?.[check.comparePath]) : null;
    const passed = judgeCheck(check, actual, baseline);
    if (!passed) {
      return result(test, {
        passed: false,
        actual: describeValue(actual),
        expected: `${check.op}${check.value !== null && check.value !== undefined ? ` ${describeValue(check.value)}` : ''}`,
        message: check.message || test.failureMessage || `Expected ${check.op} ${describeValue(check.value)} but measured ${describeValue(actual)}`,
      });
    }
  }
  const first = checks[0];
  return result(test, {
    passed: true,
    actual: describeValue(first.path.includes('.') ? readPath(values, first.path) : values?.[first.path]),
  });
}

function judgeCheck(check, actual, baseline) {
  const tolerance = Number(check.tolerance ?? 0);
  switch (check.op) {
    case 'eq':
      if (typeof check.value === 'number' || typeof actual === 'number') {
        return numericCompare(actual, check.value, 'eq') || Math.abs(toNumber(actual) - toNumber(check.value)) <= tolerance;
      }
      return looseEquals(actual, check.value);
    case 'ne':
      return !looseEquals(actual, check.value);
    case 'gt':
      return numericCompare(actual, check.value, 'gt');
    case 'gte':
      return numericCompare(actual, check.value, 'gte');
    case 'lt':
      return numericCompare(actual, check.value, 'lt');
    case 'lte':
      return numericCompare(actual, check.value, 'lte');
    case 'contains':
      return normalize(actual).includes(normalize(check.value));
    case 'not-contains':
      return !normalize(actual).includes(normalize(check.value));
    case 'regex': {
      const regex = buildRegExp(String(check.value ?? ''), check.flags ?? 'i');
      return regex ? regex.test(String(actual ?? '')) : false;
    }
    case 'in':
    case 'one-of':
      return asArray(check.value).some((candidate) => looseEquals(actual, candidate));
    case 'truthy':
      return Boolean(actual) && actual !== 'false' && actual !== 0;
    case 'changed-by': {
      const delta = toNumber(actual) - toNumber(baseline);
      if (Number.isNaN(delta)) return false;
      return Math.abs(delta - Number(check.value)) <= Math.max(tolerance, 0.001);
    }
    default:
      return false;
  }
}

function readPath(source, path) {
  return String(path)
    .split('.')
    .reduce((node, key) => (node === null || node === undefined ? undefined : node[key]), source);
}

/* ------------------------------------------------------------------ *
 * Submission scoring
 * ------------------------------------------------------------------ */

/**
 * Score a submission from its deterministic analysis plus the measurements
 * reported by an execution provider.
 */
export function scoreSubmission({ challenge, analysis, measurements = new Map(), providerName = 'client-sandbox' }) {
  // Test cases may be mongoose subdocuments; normalize to plain objects so
  // spreading them inside the evaluators cannot drop schema fields.
  const testCases = (challenge.testCases ?? []).map((test) => (typeof test.toObject === 'function' ? test.toObject({ virtuals: false }) : test));
  if (!testCases.length) throw new ScoringError('Challenge has no test cases');

  const staticTests = testCases.filter((test) => test.kind !== 'measure');
  const measureTests = testCases.filter((test) => test.kind === 'measure');

  const resultsById = new Map();
  const orderedResults = [];

  for (const test of staticTests) {
    const outcome = evaluateStaticTest(test, analysis);
    const stored = { ...outcome, verifiedBy: 'server' };
    resultsById.set(test.id, stored);
    orderedResults.push(stored);
  }

  for (const test of measureTests) {
    const outcome = judgeMeasureTest(test, measurements.get(test.id) ?? null, { staticResults: resultsById });
    const stored = { ...outcome, verifiedBy: providerName === 'remote-runner' ? 'remote-runner' : 'sandbox' };
    resultsById.set(test.id, stored);
    orderedResults.push(stored);
  }

  return aggregateResults({ challenge, results: orderedResults, providerName });
}

/**
 * Turn individual test outcomes into the scored submission shape. Kept separate
 * from evaluation so the aggregate maths is testable on its own (the seeder uses
 * it to build consistent demo submissions).
 */
export function aggregateResults({ challenge, results, providerName = 'client-sandbox' }) {
  const orderedResults = results;

  // Which rubric groups does this challenge actually exercise? Groups without
  // tests are dropped and the remaining max points are re-normalised to 100
  // (largest remainder rounding) so a perfect run always scores exactly 100.
  const activeGroups = SCORING_GROUPS.filter((group) => orderedResults.some((outcome) => outcome.group === group.key));
  const scaledMax = distributePoints(activeGroups, MAX_SCORE);

  const groups = SCORING_GROUPS.map((group) => {
    const groupTests = orderedResults.filter((outcome) => outcome.group === group.key);
    const max = scaledMax.get(group.key) ?? 0;
    const totalWeight = groupTests.reduce((sum, outcome) => sum + (outcome.weight ?? 1), 0);
    const passedWeight = groupTests.filter((outcome) => outcome.passed).reduce((sum, outcome) => sum + (outcome.weight ?? 1), 0);
    return {
      key: group.key,
      label: group.label,
      max,
      earned: totalWeight ? Math.round((max * passedWeight) / totalWeight) : 0,
      testsPassed: groupTests.filter((outcome) => outcome.passed).length,
      totalTests: groupTests.length,
    };
  });

  const categoryScores = Object.fromEntries(
    groups.map((group) => [group.key, { earned: group.earned, max: group.max, label: group.label, testsPassed: group.testsPassed, totalTests: group.totalTests }]),
  );

  // Per-test point share (informational, used by the result breakdown UI).
  const finalResults = orderedResults.map((outcome) => {
    const groupTests = orderedResults.filter((entry) => entry.group === outcome.group);
    const totalWeight = groupTests.reduce((sum, entry) => sum + (entry.weight ?? 1), 0);
    const max = scaledMax.get(outcome.group) ?? GROUP_MAP.get(outcome.group)?.maxPoints ?? 0;
    const points = totalWeight ? (max * (outcome.weight ?? 1)) / totalWeight : 0;
    return { ...outcome, earned: Math.round(points * 10) / 10 };
  });

  const score = Math.min(MAX_SCORE, groups.reduce((sum, group) => sum + group.earned, 0));
  const testsPassed = finalResults.filter((outcome) => outcome.passed).length;

  return {
    score,
    testsPassed,
    totalTests: finalResults.length,
    status: score >= (challenge.passingScore ?? 70) ? 'passed' : 'failed',
    isPerfect: score === MAX_SCORE,
    groups,
    categoryScores,
    testResults: finalResults,
    verification: {
      provider: providerName,
      serverVerifiedTests: finalResults.filter((outcome) => outcome.verifiedBy === 'server').length,
      sandboxVerifiedTests: finalResults.filter((outcome) => outcome.verifiedBy !== 'server').length,
    },
  };
}

/**
 * Distribute `total` points across the active rubric groups proportionally to
 * their nominal weight, using largest-remainder rounding so the parts always sum
 * back to `total`.
 */
function distributePoints(groups, total) {
  const nominalTotal = groups.reduce((sum, group) => sum + group.maxPoints, 0) || 1;
  const raw = groups.map((group) => ({ key: group.key, value: (group.maxPoints / nominalTotal) * total }));
  const floored = raw.map((entry) => ({ ...entry, points: Math.floor(entry.value), remainder: entry.value - Math.floor(entry.value) }));
  let remaining = total - floored.reduce((sum, entry) => sum + entry.points, 0);

  const ordered = [...floored].sort((a, b) => b.remainder - a.remainder);
  for (const entry of ordered) {
    if (remaining <= 0) break;
    entry.points += 1;
    remaining -= 1;
  }
  return new Map(floored.map((entry) => [entry.key, entry.points]));
}

export default { scoreSubmission, aggregateResults, evaluateStaticTest, judgeMeasureTest, evaluateCodeQuality, ScoringError };
