import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Prioritize process.env (set by Docker) over .env files, or fallback to .env
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY),
      'process.env.FDA_API_KEY': JSON.stringify(process.env.FDA_API_KEY || env.FDA_API_KEY),
      // Prevent crash if accessing other process.env properties
      'process.env': JSON.stringify({}),
    },
  };
});
