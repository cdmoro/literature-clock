/* global process */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    cors: false,
    proxy: {
      '/api': {
        target: process.env.TRANSLATION_API_TARGET,
        headers: { 'X-Admin-Token': process.env.TRANSLATION_ADMIN_TOKEN || '' },
      },
    },
  },
  plugins: [
    {
      name: 'local-admin-requests',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/api/')) return next();
          const host = req.headers.host;
          const origin = req.headers.origin;
          if (
            !['127.0.0.1:5174', 'localhost:5174'].includes(host) ||
            (origin && origin !== `http://${host}`) ||
            req.headers['x-admin-request'] !== '1'
          ) {
            res.statusCode = 403;
            res.end('Local admin requests only');
            return;
          }
          next();
        });
      },
    },
  ],
  build: { outDir: 'dist', emptyOutDir: true },
});
