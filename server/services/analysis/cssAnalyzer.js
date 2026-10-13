/**
 * Deterministic CSS analyzer: tokenizes stylesheets into rules and declarations
 * (including @media / @supports / @keyframes context) without executing anything.
 */

function stripComments(css) {
  return String(css ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitDeclarations(block) {
  const declarations = [];
  let depth = 0;
  let current = '';
  let quote = null;

  for (const char of block) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ';' && depth === 0) {
      declarations.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) declarations.push(current);

  return declarations
    .map((entry) => {
      const separator = entry.indexOf(':');
      if (separator === -1) return null;
      const property = entry.slice(0, separator).trim().toLowerCase();
      const rawValue = entry.slice(separator + 1).trim();
      if (!property || !rawValue) return null;
      const important = /!important$/i.test(rawValue);
      return {
        property,
        value: rawValue.replace(/!important$/i, '').trim(),
        important,
        raw: `${property}: ${rawValue}`,
      };
    })
    .filter(Boolean);
}

function normalizeSelector(selector) {
  return String(selector).replace(/\s+/g, ' ').replace(/\s*([>+~,])\s*/g, ' $1 ').trim();
}

/**
 * Parse a stylesheet.
 * Returns { rules: [...], mediaQueries: [...], keyframes: [...], atRules: [...], errors: [] }
 * where each rule is { selectorText, selectors: [], declarations, media, supports }.
 */
export function parseCss(source) {
  const css = stripComments(source);
  const result = { rules: [], mediaQueries: [], keyframes: [], atRules: [], errors: [] };

  try {
    let index = 0;
    const context = { media: [], supports: [] };

    const readBlock = () => {
      const start = css.indexOf('{', index);
      if (start === -1) return null;
      let depth = 0;
      let quote = null;
      for (let i = start; i < css.length; i += 1) {
        const char = css[i];
        if (quote) {
          if (char === quote && css[i - 1] !== '\\') quote = null;
          continue;
        }
        if (char === '"' || char === "'") {
          quote = char;
          continue;
        }
        if (char === '{') depth += 1;
        else if (char === '}') {
          depth -= 1;
          if (depth === 0) {
            const prelude = css.slice(index, start).trim();
            const body = css.slice(start + 1, i);
            index = i + 1;
            return { prelude, body };
          }
        }
      }
      return null;
    };

    while (index < css.length) {
      // Skip dangling semicolons / whitespace between rules.
      while (index < css.length && /[\s;]/.test(css[index])) index += 1;
      if (index >= css.length) break;

      const block = readBlock();
      if (!block) break;
      const { prelude, body } = block;
      if (!prelude) continue;

      if (prelude.startsWith('@')) {
        const [atName, ...rest] = prelude.slice(1).split(/\s+/);
        const name = atName.toLowerCase();
        const params = rest.join(' ').trim();
        result.atRules.push({ name, params, prelude });

        if (name === 'media' || name === 'supports' || name === 'layer' || name === 'container') {
          if (name === 'media') result.mediaQueries.push({ query: params, features: parseMediaFeatures(params) });
          const nested = parseNested(body, {
            media: name === 'media' ? [...context.media, params] : context.media,
            supports: name === 'supports' ? [...context.supports, params] : context.supports,
          });
          result.rules.push(...nested.rules);
        } else if (name === 'keyframes' || name.endsWith('keyframes')) {
          result.keyframes.push({ name: params, body });
        }
        continue;
      }

      const declarations = splitDeclarations(body);
      const selectors = prelude.split(',').map((entry) => normalizeSelector(entry)).filter(Boolean);
      result.rules.push({
        selectorText: prelude,
        selectors,
        declarations,
        media: [...context.media],
        supports: [...context.supports],
      });
    }
  } catch (error) {
    result.errors.push(error.message);
  }

  return result;
}

function parseNested(body, context) {
  // Re-parse nested blocks by wrapping them in a temporary parse.
  const inner = parseCss(body);
  const rules = inner.rules.map((rule) => ({
    ...rule,
    media: [...context.media, ...rule.media],
    supports: [...context.supports, ...rule.supports],
  }));
  return { rules, inner };
}

/** Extract min/max width features from a media query string. */
export function parseMediaFeatures(query) {
  const features = {};
  const regex = /\(\s*([\w-]+)\s*:\s*([^)]+)\)/g;
  let match = regex.exec(query);
  while (match) {
    features[match[1].toLowerCase()] = match[2].trim().toLowerCase();
    match = regex.exec(query);
  }
  return features;
}

/** Numeric pixels helper: "768px" -> 768, "30em" -> 480, else null. */
export function cssLengthToPx(value) {
  if (value === undefined || value === null) return null;
  const match = String(value).trim().match(/^(-?[\d.]+)(px|em|rem|pt|vw|vh|%)?$/i);
  if (!match) return null;
  const number = Number.parseFloat(match[1]);
  if (!Number.isFinite(number)) return null;
  const unit = (match[2] ?? 'px').toLowerCase();
  switch (unit) {
    case 'px':
      return number;
    case 'em':
    case 'rem':
      return number * 16;
    case 'pt':
      return (number * 96) / 72;
    default:
      return null; // relative units cannot be resolved statically
  }
}

/** All rules whose selector list contains a selector matching `needle`. */
export function findRules(css, needle, { property = null, media = null } = {}) {
  const normalizedNeedle = normalizeSelector(needle).replace(/\s*([>+~,])\s*/g, '$1').toLowerCase();
  return css.rules.filter((rule) => {
    const selectorMatches = rule.selectors.some((selector) => {
      const flat = selector.replace(/\s*([>+~,])\s*/g, '$1').toLowerCase();
      return flat === normalizedNeedle || flat.includes(normalizedNeedle);
    });
    if (!selectorMatches) return false;
    if (property && !rule.declarations.some((decl) => decl.property === property)) return false;
    if (media === 'any' && !rule.media.length) return false;
    if (media === 'none' && rule.media.length) return false;
    return true;
  });
}

/** Every declaration in the sheet (optionally filtered by property). */
export function declarations(css, property = null) {
  return css.rules
    .flatMap((rule) => rule.declarations.map((decl) => ({ ...decl, selectorText: rule.selectorText, media: rule.media })))
    .filter((decl) => !property || decl.property === property);
}

/** Does a media query exist that targets small screens (max-width/min-width)? */
export function findResponsiveMedia(css, { maxWidthLte = 900, minWidthLte = 900 } = {}) {
  return css.mediaQueries.filter(({ features }) => {
    if (features['max-width']) {
      const px = cssLengthToPx(features['max-width']);
      if (px !== null && px <= maxWidthLte) return true;
    }
    if (features['min-width']) {
      const px = cssLengthToPx(features['min-width']);
      if (px !== null && px <= minWidthLte) return true;
    }
    return false;
  });
}

/** Detect fluid layout techniques used for responsiveness. */
export function fluidTechniques(css) {
  const found = new Set();
  for (const decl of declarations(css)) {
    const { property, value } = decl;
    const lower = String(value).toLowerCase();
    if (property === 'max-width' && /(100%|\d+vw|min\(|clamp\()/.test(lower)) found.add('max-width-fluid');
    if (property === 'width' && /(100%|\d+vw|min\(|clamp\()/.test(lower)) found.add('width-fluid');
    if (property === 'grid-template-columns' && /(auto-fit|auto-fill|repeat|minmax|fr)/.test(lower)) found.add('grid-auto');
    if (property === 'flex-wrap' && lower === 'wrap') found.add('flex-wrap');
    if (property === 'flex-direction' && lower === 'column') found.add('flex-column');
    if ((property === 'padding' || property === 'margin' || property === 'font-size' || property === 'gap') && /clamp\(/.test(lower)) found.add('clamp-spacing');
    if (property === 'display' && /(grid|flex)/.test(lower)) found.add(`display-${lower.trim()}`);
    if (property === 'object-fit') found.add('object-fit');
  }
  return found;
}

export default { parseCss, findRules, declarations, findResponsiveMedia, fluidTechniques, cssLengthToPx };
