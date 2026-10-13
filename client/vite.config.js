import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev server notes
 *  - binds to 0.0.0.0 so the sandbox/preview proxy can reach it
 *  - `allowedHosts: true` lets the preview hostname through
 *  - /api is proxied to the Express server so the browser only ever talks to
 *    this origin (cookies stay first-party, no CORS preflight in dev)
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY || `http://127.0.0.1:${env.VITE_API_PORT || 5060}`;

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT || 5057),
      strictPort: false,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: Number(env.VITE_PREVIEW_PORT || 4173),
      allowedHosts: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            monaco: ['monaco-editor', '@monaco-editor/react'],
          },
        },
      },
    },
  };
});
