/**
 * Deterministic HTML analyzer.
 *
 * Parses markup into a lightweight tree with a *tokenizer only* — no script
 * execution, no eval, no external parser. It is tolerant of malformed markup
 * (unclosed tags are closed implicitly) and never throws: any internal failure
 * degrades to an empty document plus an `errors` entry.
 */

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const RAW_TEXT_TAGS = new Set(['script', 'style']);

function createNode(tag, attrs = {}, parent = null) {
  return {
    tag,
    attrs,
    children: [],
    directText: '',
    parent,
    selfClosing: VOID_TAGS.has(tag),
    position: null,
  };
}

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function normalizeText(value) {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

const ATTRIBUTE_PATTERN = /([:@a-zA-Z_][-.:\w]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;

function parseAttributes(source) {
  const attrs = {};
  if (!source) return attrs;
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match = ATTRIBUTE_PATTERN.exec(source);
  while (match) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[name] = value;
    match = ATTRIBUTE_PATTERN.exec(source);
  }
  return attrs;
}

/** Parse an HTML document into a node tree. */
export function parseHtml(source) {
  const errors = [];
  const root = createNode('#document');
  const stack = [root];
  let index = 0;
  const html = String(source ?? '');

  try {
    while (index < html.length) {
      const openIndex = html.indexOf('<', index);
      if (openIndex === -1) {
        appendText(stack[stack.length - 1], html.slice(index));
        break;
      }
      if (openIndex > index) appendText(stack[stack.length - 1], html.slice(index, openIndex));

      // Comments, doctype and CDATA are ignored.
      if (html.startsWith('<!--', openIndex)) {
        const end = html.indexOf('-->', openIndex + 4);
        index = end === -1 ? html.length : end + 3;
        continue;
      }
      if (html.startsWith('<!', openIndex)) {
        const end = html.indexOf('>', openIndex);
        index = end === -1 ? html.length : end + 1;
        continue;
      }

      const tagEnd = findTagEnd(html, openIndex);
      if (tagEnd === -1) {
        appendText(stack[stack.length - 1], html.slice(openIndex));
        break;
      }

      const rawTag = html.slice(openIndex + 1, tagEnd);
      index = tagEnd + 1;

      if (rawTag.startsWith('/')) {
        const closingName = rawTag.slice(1).trim().toLowerCase().split(/\s/)[0];
        closeTag(stack, closingName);
        continue;
      }

      const selfClosing = rawTag.endsWith('/');
      const spaceIndex = rawTag.search(/[\s/]/);
      const tagName = (spaceIndex === -1 ? rawTag : rawTag.slice(0, spaceIndex)).toLowerCase();
      const attrSource = spaceIndex === -1 ? '' : rawTag.slice(spaceIndex);
      if (!tagName) continue;

      const node = createNode(tagName, parseAttributes(attrSource), stack[stack.length - 1]);
      node.selfClosing = selfClosing || VOID_TAGS.has(tagName);
      node.position = openIndex;
      stack[stack.length - 1].children.push(node);

      if (RAW_TEXT_TAGS.has(tagName)) {
        const closeIndex = html.toLowerCase().indexOf(`</${tagName}`, index);
        const content = closeIndex === -1 ? html.slice(index) : html.slice(index, closeIndex);
        node.directText = content;
        index = closeIndex === -1 ? html.length : closeIndex + tagName.length + 2;
        continue;
      }

      if (!node.selfClosing) stack.push(node);
    }
  } catch (error) {
    errors.push(error.message);
  }

  return { root, errors };
}

function appendText(parent, text) {
  if (!text) return;
  parent.directText += text;
}

function findTagEnd(html, start) {
  let inQuote = null;
  for (let i = start + 1; i < html.length; i += 1) {
    const char = html[i];
    if (inQuote) {
      if (char === inQuote) inQuote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      inQuote = char;
      continue;
    }
    if (char === '>') return i;
  }
  return -1;
}

function closeTag(stack, tagName) {
  for (let i = stack.length - 1; i >= 1; i -= 1) {
    if (stack[i].tag === tagName) {
      stack.length = i;
      return;
    }
  }
  // Stray closing tag: ignore.
}

/* ------------------------------------------------------------------ *
 * Tree helpers
 * ------------------------------------------------------------------ */

export function walk(node, visitor) {
  for (const child of node.children) {
    visitor(child);
    walk(child, visitor);
  }
}

export function findAll(node, predicate) {
  const results = [];
  walk(node, (child) => {
    if (predicate(child)) results.push(child);
  });
  return results;
}

export function textContent(node) {
  let text = node.directText ?? '';
  for (const child of node.children) {
    if (child.tag === 'script' || child.tag === 'style') continue;
    text += ` ${textContent(child)}`;
  }
  return normalizeText(text);
}

export function rawTextContent(node) {
  let text = node.directText ?? '';
  for (const child of node.children) text += textContent(child);
  return normalizeText(text);
}

export function countByTag(root, tag) {
  return findAll(root, (node) => node.tag === tag).length;
}

/* ------------------------------------------------------------------ *
 * Selector engine (tag, .class, #id, [attr], [attr="value"], :first-child,
 * descendant + child combinators, comma separated lists)
 * ------------------------------------------------------------------ */

function parseSimpleSelector(part) {
  const simple = { tag: null, id: null, classes: [], attrs: [], firstChild: false, lastChild: false };
  const regex = /([#.:]?[\w-]+|\[[^\]]+\])/g;
  const matches = String(part).match(regex) ?? [];
  for (const token of matches) {
    if (token.startsWith('#')) simple.id = token.slice(1).toLowerCase();
    else if (token.startsWith('.')) simple.classes.push(token.slice(1).toLowerCase());
    else if (token.startsWith('[')) simple.attrs.push(parseAttributeSelector(token));
    else if (token === ':first-child') simple.firstChild = true;
    else if (token === ':last-child') simple.lastChild = true;
    else simple.tag = token.toLowerCase();
  }
  return simple;
}

/** Supports [attr], [attr=value], [attr^=], [attr$=], [attr*=], [attr~=], [attr|=]. */
function parseAttributeSelector(token) {
  const inner = token.slice(1, -1).trim();
  const match = inner.match(/^([\w-]+)\s*(?:([~^$*|]?=)\s*(.+))?$/);
  if (!match) return { name: inner.toLowerCase(), operator: 'exists', value: null };
  const [, name, operator, rawValue] = match;
  const value = rawValue === undefined ? null : rawValue.replace(/^["']|["']$/g, '');
  return { name: name.toLowerCase(), operator: operator ?? 'exists', value };
}

export function parseSelectorGroup(selector) {
  const parts = String(selector)
    .trim()
    .replace(/\s*>\s*/g, ' > ')
    .split(/\s+/)
    .filter(Boolean);
  const group = [];
  let combinator = ' ';
  for (const part of parts) {
    if (part === '>') {
      combinator = '>';
      continue;
    }
    group.push({ combinator, simple: parseSimpleSelector(part) });
    combinator = ' ';
  }
  return group;
}

function matchesSimple(node, simple) {
  if (simple.tag && node.tag !== simple.tag) return false;
  if (simple.id && (node.attrs.id ?? '').toLowerCase() !== simple.id) return false;
  const classes = (node.attrs.class ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (simple.classes.some((needed) => !classes.includes(needed))) return false;
  for (const attr of simple.attrs) {
    if (!(attr.name in node.attrs)) return false;
    if (attr.value === null) continue;
    const actual = String(node.attrs[attr.name] ?? '').toLowerCase();
    const expected = attr.value.toLowerCase();
    switch (attr.operator) {
      case '^=':
        if (!actual.startsWith(expected)) return false;
        break;
      case '$=':
        if (!actual.endsWith(expected)) return false;
        break;
      case '*=':
        if (!actual.includes(expected)) return false;
        break;
      case '~=':
        if (!actual.split(/\s+/).includes(expected)) return false;
        break;
      case '|=':
        if (actual !== expected && !actual.startsWith(`${expected}-`)) return false;
        break;
      default:
        if (actual !== expected) return false;
    }
  }
  if (simple.firstChild || simple.lastChild) {
    const siblings = node.parent?.children ?? [];
    if (simple.firstChild && siblings[0] !== node) return false;
    if (simple.lastChild && siblings[siblings.length - 1] !== node) return false;
  }
  return true;
}

function ancestorsOf(node) {
  const chain = [];
  let current = node.parent;
  while (current && current.tag !== '#document') {
    chain.push(current);
    current = current.parent;
  }
  return chain;
}

function matchesGroup(node, group) {
  let current = [node];
  for (let i = group.length - 1; i >= 0; i -= 1) {
    const { combinator, simple } = group[i];
    const matched = current.filter((candidate) => matchesSimple(candidate, simple));
    if (!matched.length) return false;
    if (i === 0) return true;
    // `combinator` links part i to the part on its left (i - 1).
    if (combinator === '>') {
      current = matched.map((candidate) => candidate.parent).filter(Boolean);
    } else {
      current = matched.flatMap((candidate) => ancestorsOf(candidate));
      if (!current.length) return false;
    }
  }
  return current.length > 0;
}

/** Query all elements matching a (comma separated) CSS selector. */
export function queryAll(root, selector) {
  const groups = String(selector)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(parseSelectorGroup)
    .filter((group) => group.length);

  if (!groups.length) return [];

  const results = [];
  walk(root, (node) => {
    if (groups.some((group) => matchesGroup(node, group))) {
      if (!results.includes(node)) results.push(node);
    }
  });
  return results;
}

/** Serialize a node back to HTML (used for diagnostics / actual values). */
export function serialize(node) {
  if (!node || node.tag === '#document') {
    return (node?.children ?? []).map((child) => serialize(child)).join('');
  }
  const attrs = Object.entries(node.attrs ?? {})
    .map(([name, value]) => (value === '' ? ` ${name}` : ` ${name}="${value}"`))
    .join('');
  if (node.tag === '#text') return node.directText;
  if (VOID_TAGS.has(node.tag)) return `<${node.tag}${attrs}>`;
  if (RAW_TEXT_TAGS.has(node.tag)) return `<${node.tag}${attrs}>${node.directText}</${node.tag}>`;
  return `<${node.tag}${attrs}>${node.directText}${node.children.map((child) => serialize(child)).join('')}</${node.tag}>`;
}

export default { parseHtml, queryAll, textContent, findAll, serialize };
