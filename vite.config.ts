import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/la-senda-erp/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/ords': {
        target: 'https://oracleapex.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
