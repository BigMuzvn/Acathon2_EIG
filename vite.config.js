import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createApiHandler } from './server/api.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const handler = createApiHandler({ env: { ...loadEnv(mode, process.cwd(), 'CARAPI_'), ...process.env } });
  return {
    plugins: [react(), {
      name: 'autocompare-api',
      configureServer(server) { server.middlewares.use(handler); },
      configurePreviewServer(server) { server.middlewares.use(handler); },
    }],
  };
})
