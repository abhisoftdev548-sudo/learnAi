import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['server/tests/**/*.test.js', 'src/**/*.test.js'], setupFiles: ['server/tests/setup.js'], testTimeout: 20000, hookTimeout: 120000, fileParallelism: false, env: { NODE_ENV: 'test' } } });
