import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import apiProxy from './server/vitePlugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Validate API key at startup (but don't send it to the client!)
    if (!env.GEMINI_API_KEY) {
      console.warn('\n⚠️  GEMINI_API_KEY is not set in .env.local\n');
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        apiProxy(),   // API proxy: keeps GEMINI_API_KEY server-side
        react(),
      ],
      define: {
        // ⚠️ API key is NO LONGER exposed to the client.
        // All Gemini calls go through /api/* proxy.
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 600,
      }
    };
});
