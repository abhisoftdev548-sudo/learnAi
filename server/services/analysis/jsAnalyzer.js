/**
 * Deterministic, side-effect free JavaScript source analysis.
 *
 * The analyzer NEVER executes the submitted code: it scans tokens while masking
 * comments, strings, template literals and regular expressions so that the
 * structural checks (balance, identifier usage, event listeners, code quality)
 * cannot be fooled by text inside a comment or a string literal.
 */

const KEYWORD_LIKE = /\b(var|let|const|function|class|async|await|return|new|typeof|export|import|default|extends|static|get|set)\b/g;

/** Mask comments and (optionally) strings/regex so the scan sees only code. */
export function scanSource(source, { maskStrings = true } = {}) {
  const input = String(source ?? '');
  let out = '';
  let i = 0;
  let lastSignificant = '';

  const pushSpaces = (count) => {
    out += ' '.repeat(Math.max(0, count));
  };

  const readString = (quote) => {
    let length = 1;
    out += maskStrings ? ' ' : quote;
    i += 1;
    while (i < input.length) {
      const char = input[i];
      if (char === '\\') {
        length += 2;
        out += maskStrings ? '  ' : input.slice(i, i + 2);
        i += 2;
        continue;
      }
      out += maskStrings ? (char === '\n' ? '\n' : ' ') : char;
      i += 1;
      length += 1;
      if (char === quote) break;
      if (char === '\n') break; // unterminated single-line string
    }
    return length;
  };

  const readTemplate = () => {
    out += maskStrings ? ' ' : '`';
    i += 1;
    while (i < input.length) {
      const char = input[i];
      if (char === '\\') {
        out += maskStrings ? '  ' : input.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (char === '`') {
        out += maskStrings ? ' ' : '`';
        i += 1;
        break;
      }
      if (char === '$' && input[i + 1] === '{') {
        // keep interpolated expressions as code
        out += maskStrings ? '  ' : '${';
        i += 2;
        let depth = 1;
        while (i < input.length && depth > 0) {
          const inner = input[i];
          if (inner === '{') depth += 1;
          if (inner === '}') depth -= 1;
          if (inner === '"' || inner === "'") {
            readString(inner);
            continue;
          }
          if (inner === '`') {
            readTemplate();
            continue;
          }
          out += inner;
          i += 1;
        }
        continue;
      }
      out += maskStrings ? (char === '\n' ? '\n' : ' ') : char;
      i += 1;
    }
  };

  const readRegex = () => {
    out += maskStrings ? ' ' : '/';
    i += 1;
    let inClass = false;
    while (i < input.length) {
      const char = input[i];
      if (char === '\\') {
        out += maskStrings ? '  ' : input.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (char === '[') inClass = true;
      else if (char === ']') inClass = false;
      if (char === '/' && !inClass) {
        out += maskStrings ? ' ' : '/';
        i += 1;
        break;
      }
      if (char === '\n') break;
      out += maskStrings ? ' ' : char;
      i += 1;
    }
    // regex flags
    while (i < input.length && /[gimsuyvd]/.test(input[i])) {
      out += input[i];
      i += 1;
    }
  };

  while (i < input.length) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '/' && next === '/') {
      while (i < input.length && input[i] !== '\n') {
        pushSpaces(1);
        i += 1;
      }
      continue;
    }
    if (char === '/' && next === '*') {
      pushSpaces(2);
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) {
        out += input[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      pushSpaces(2);
      i += 2;
      continue;
    }
    if (char === '/' && isRegexStart(lastSignificant)) {
      readRegex();
      lastSignificant = '/';
      continue;
    }
    if (char === '"' || char === "'") {
      readString(char);
      lastSignificant = char;
      continue;
    }
    if (char === '`') {
      readTemplate();
      lastSignificant = '`';
      continue;
    }
    out += char;
    if (!/\s/.test(char)) lastSignificant = char;
    i += 1;
  }

  return out;
}

function isRegexStart(lastSignificant) {
  if (!lastSignificant) return true;
  return '(,=:[!&|?{};+-*%~^<>'.includes(lastSignificant) || 'return'.endsWith(lastSignificant);
}

function countMatches(source, regex) {
  const matches = String(source).match(regex);
  return matches ? matches.length : 0;
}

function countLines(source, predicate = null) {
  const lines = String(source).split('\n');
  return predicate ? lines.filter(predicate).length : lines.length;
}

export function analyzeJs(source) {
  const raw = String(source ?? '');
  const errors = [];
  let code = '';
  let masked = '';

  try {
    code = scanSource(raw, { maskStrings: false });
    masked = scanSource(raw, { maskStrings: true });
  } catch (error) {
    errors.push(error.message);
    code = raw;
    masked = raw;
  }

  const countChar = (value, char) => (value.match(new RegExp(`\\${char}`, 'g')) ?? []).length;

  const balance = {
    braces: countChar(masked, '{') - countChar(masked, '}'),
    parens: countChar(masked, '(') - countChar(masked, ')'),
    brackets: countChar(masked, '[') - countChar(masked, ']'),
  };
  const balanceOk = balance.braces === 0 && balance.parens === 0 && balance.brackets === 0;
  const balanceReason = balanceOk
    ? ''
    : `unbalanced ${Object.entries(balance)
        .filter(([, value]) => value !== 0)
        .map(([key, value]) => `${key} (${value > 0 ? `${value} unclosed` : `${Math.abs(value)} extra closing`})`)
        .join(', ')}`;

  const functions = [...masked.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);
  const assignedFunctions = [...masked.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g)].map(
    (match) => match[1],
  );

  const listeners = [...code.matchAll(/addEventListener\s*\(\s*['"]([\w:-]+)['"]/g)].map((match) => ({ event: match[1].toLowerCase() }));
  const onclickHandlers = countMatches(code, /\.\s*on(click|change|input|submit|keyup|keydown)\s*=/gi);

  const domQueries = [...code.matchAll(/document\s*\.\s*(querySelector(?:All)?|getElementById|getElementsByClassName|getElementsByTagName)\s*\(\s*['"]([^'"]*)['"]/g)].map(
    (match) => ({ method: match[1], selector: match[2] }),
  );

  const lines = raw.split('\n');
  const codeLines = lines.filter((line) => line.trim().length > 0 && !line.trim().startsWith('//'));
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const longLineCount = lines.filter((line) => line.length > 140).length;
  const trailingWhitespaceLines = lines.filter((line) => /\s+$/.test(line)).length;
  const semicolonLines = codeLines.filter((line) => /;\s*(\/\/.*)?$/.test(line.trim())).length;
  const semicolonRatio = codeLines.length ? Math.round((semicolonLines / codeLines.length) * 100) / 100 : 1;

  const counts = {
    var: countMatches(masked, /\bvar\b/g),
    let: countMatches(masked, /\blet\b/g),
    const: countMatches(masked, /\bconst\b/g),
    function: countMatches(masked, /\bfunction\b/g),
    arrow: countMatches(masked, /=>/g),
    templateLiteral: countMatches(code, /`/g) / 2,
    async: countMatches(masked, /\basync\b/g),
    await: countMatches(masked, /\bawait\b/g),
    keywords: countMatches(masked, KEYWORD_LIKE),
    strictMode: countMatches(code, /['"]use strict['"]/g),
    console: countMatches(masked, /\bconsole\s*\./g),
    debugger: countMatches(masked, /\bdebugger\b/g),
    alert: countMatches(masked, /\balert\s*\(/g),
    documentWrite: countMatches(masked, /document\s*\.\s*write/g),
    eval: countMatches(masked, /\beval\s*\(/g),
    innerHTML: countMatches(masked, /\.\s*innerHTML\b/g),
    textContent: countMatches(masked, /\.\s*textContent\b/g),
    addEventListener: countMatches(masked, /\baddEventListener\b/g),
    querySelector: countMatches(masked, /\bquerySelector(?:All)?\b/g),
    getElementById: countMatches(masked, /\bgetElementById\b/g),
    classList: countMatches(masked, /\.\s*classList\b/g),
    setAttribute: countMatches(masked, /\.\s*setAttribute\b/g),
    styleAssignments: countMatches(masked, /\.\s*style\s*\./g),
    preventDefault: countMatches(masked, /\.\s*preventDefault\s*\(/g),
    DOMContentLoaded: countMatches(code, /DOMContentLoaded/g),
    localStorage: countMatches(masked, /\blocalStorage\b/g),
    fetch: countMatches(masked, /\bfetch\s*\(/g),
    commentLines: countLines(raw, (line) => /^\s*(\/\/|\/\*|\*)/.test(line)),
  };

  const quality = {
    balanceOk,
    balanceReason,
    varCount: counts.var,
    consoleCount: counts.console,
    debuggerCount: counts.debugger,
    alertCount: counts.alert,
    evalCount: counts.eval,
    documentWriteCount: counts.documentWrite,
    todoCount: countMatches(raw, /TODO|FIXME|XXX/g),
    longLineCount,
    trailingWhitespaceLines,
    semicolonRatio,
    emptyLines: countLines(raw, (line) => line.trim() === ''),
    strictMode: counts.strictMode > 0,
    hasComments: counts.commentLines > 0,
    usesModernSyntax: counts.const + counts.let > 0 && counts.var === 0,
    lineCount: lines.length,
  };

  return {
    ok: errors.length === 0,
    errors,
    raw,
    code,
    masked,
    lines: lines.length,
    characters: raw.length,
    maxLineLength,
    balance,
    counts,
    quality,
    functions: [...new Set([...functions, ...assignedFunctions])],
    listeners,
    onclickHandlers,
    domQueries,
    /** Identifier (or property) appears in real code — not in comments/strings. */
    hasIdentifier(name) {
      return new RegExp(`\\b${escapeRegExp(name)}\\b`).test(masked);
    },
    countIdentifier(name) {
      return countMatches(masked, new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g'));
    },
    /** Regex test against a chosen scope: 'raw' | 'code' (no comments) | 'masked' (code only). */
    matches(regex, scope = 'code') {
      const target = scope === 'raw' ? raw : scope === 'masked' ? masked : code;
      regex.lastIndex = 0;
      return regex.test(target);
    },
    hasEventListener(event) {
      return listeners.some((listener) => listener.event === String(event).toLowerCase());
    },
  };
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build a RegExp from a test case definition (pattern + flags). */
export function buildRegExp(pattern, flags = '') {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

export default { analyzeJs, scanSource, buildRegExp, escapeRegExp };
