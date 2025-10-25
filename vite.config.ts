import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      base: '/PharmKo_v4_GAIS/',
      plugins: [react()],
      // Avoid embedding production AI keys in the client bundle. Use backend for AI calls.
      define: {
        'process.env.BACKEND_URL': JSON.stringify(env.BACKEND_URL || 'https://pharmapp-285590939607.us-east1.run.app'),
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, '.'),
        }
      }
    };
});
