import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lasenda.admin',
  appName: 'La Senda',
  webDir: 'dist',
  backgroundColor: '#0F3D2E',
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0F3D2E',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0F3D2E',
    },
  },
};

export default config;
