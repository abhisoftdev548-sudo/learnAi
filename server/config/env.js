import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^[1-9]\d{0,3}[mhd]$/).default('7d'),
  CORS_ORIGINS: z.string().min(1),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error(`Invalid environment variables: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`);
export const env = parsed.data;
export const origins = env.CORS_ORIGINS.split(',').map(s => s.trim());
for (const origin of origins) {
  if (new URL(origin).origin !== origin) throw new Error('CORS_ORIGINS must contain exact origins without trailing slashes');
}
export const secureCookie = env.NODE_ENV === 'production' || env.COOKIE_SECURE === 'true';
if (env.COOKIE_SAME_SITE === 'none' && !secureCookie) throw new Error('SameSite=None requires secure cookies');
if (env.NODE_ENV === 'production' && origins.some(o => !o.startsWith('https://'))) throw new Error('Production origins must use HTTPS');

if (env.NODE_ENV === 'production' && /replace-with|change-me|test-only/i.test(env.JWT_SECRET)) throw new Error('Set a strong, random production JWT_SECRET');
