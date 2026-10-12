import { z } from 'zod';
import { load } from 'cheerio';
import { ApiError } from './http.js';
export const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
export const category = z.enum(['HTML', 'CSS', 'JavaScript']);
export const difficulty = z.enum(['Easy', 'Medium', 'Hard']);
const username = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/);
const password = z.string().min(10).max(72).refine(s => Buffer.byteLength(s, 'utf8') <= 72, 'Password exceeds 72 bytes');
export const register = z.object({ name: z.string().trim().min(1).max(80), username, email: z.email().max(254).toLowerCase(), password }).strict();
export const login = z.object({ email: z.email().max(254).toLowerCase(), password: z.string().min(1).max(72).refine(s => Buffer.byteLength(s, 'utf8') <= 72, 'Password exceeds 72 bytes') }).strict();
export const profile = z.object({ name: z.string().trim().min(1).max(80).optional(), bio: z.string().max(500).optional(), avatar: z.union([z.literal(''), z.url().max(2048).refine(s => s.startsWith('https://'), 'Avatar must use HTTPS')]).optional() }).strict().refine(v => Object.keys(v).length > 0, 'Empty update');
const selector = z.string().min(1).max(200).refine(s => { try { load('')(s); return true; } catch { return false; } }, 'Invalid selector');
const baseTest = { label: z.string().min(1).max(200), group: z.enum(['structure', 'layout', 'functionality', 'responsive', 'quality']) };
export const testCase = z.discriminatedUnion('type', [
  z.object({ ...baseTest, type: z.literal('html-selector'), selector, minCount: z.number().int().min(1).max(100).default(1) }).strict(),
  z.object({ ...baseTest, type: z.literal('html-attribute'), selector, attribute: z.string().min(1).max(80), expected: z.string().max(500) }).strict(),
  z.object({ ...baseTest, type: z.literal('css-declaration'), selector: z.string().min(1).max(200), property: z.string().min(1).max(80), expected: z.string().min(1).max(200), media: z.string().min(1).max(200).optional() }).strict(),
  z.object({ ...baseTest, type: z.literal('js-node'), nodeType: z.enum(['FunctionDeclaration', 'ArrowFunctionExpression', 'IfStatement', 'ReturnStatement', 'VariableDeclaration', 'UpdateExpression', 'AssignmentExpression', 'CallExpression']) }).strict(),
  z.object({ ...baseTest, type: z.literal('js-call'), callee: z.string().regex(/^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*$/).max(100) }).strict(),
]);
export const challenge = z.object({
  title: z.string().trim().min(1).max(150), description: z.string().min(1).max(5000), category, difficulty,
  instructions: z.array(z.string().min(1).max(1000)).min(1).max(30),
  starterHTML: z.string().max(50000).default(''), starterCSS: z.string().max(50000).default(''), starterJS: z.string().max(50000).default(''),
  testCases: z.array(testCase).min(1).max(50), maxAttempts: z.number().int().min(1).max(100).default(10),
  timeLimit: z.number().int().min(1).max(86400).default(1800), xp: z.number().int().min(0).max(1000).optional(), hints: z.array(z.string().max(1000)).max(20).default([]),
}).strict();
export const submission = z.object({ challengeId: id, htmlCode: z.string().max(50000).default(''), cssCode: z.string().max(50000).default(''), jsCode: z.string().max(50000).default(''), timeTaken: z.number().int().min(0).max(86400).default(0) }).strict().refine(v => v.htmlCode.trim() || v.cssCode.trim() || v.jsCode.trim(), 'Submit some code');
export const pagination = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export const challengeQuery = pagination.extend({ category: category.optional(), difficulty: difficulty.optional(), search: z.string().trim().max(100).optional() }).strict();
export const leaderboardQuery = pagination.extend({ period: z.enum(['weekly', 'monthly', 'all-time']).default('all-time') }).strict();
export const team = z.object({ name: z.string().trim().min(1).max(80), slug: z.string().regex(/^[a-z0-9-]{3,60}$/), description: z.string().max(500).default('') }).strict();
export const member = z.object({ teamId: id.nullable() }).strict();
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(new ApiError(400, result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')));
    req.validated ??= {}; req.validated[source] = result.data; next();
  };
}
export function validId(req, res, next) { if (!id.safeParse(req.params.id).success) return next(new ApiError(400, 'Invalid ID')); next(); }
