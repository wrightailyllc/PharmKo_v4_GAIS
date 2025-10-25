import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  base: '/PharmKo_v4_GAIS/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    }
  }
});
