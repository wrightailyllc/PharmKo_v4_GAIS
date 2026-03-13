import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.pharmko',
  appName: 'PharmKo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
