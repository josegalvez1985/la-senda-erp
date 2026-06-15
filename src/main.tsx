import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App } from './App';
import './index.css';

if (Capacitor.isNativePlatform()) {
  Promise.all([import('@capacitor/status-bar'), import('@capacitor/splash-screen')]).then(
    ([{ StatusBar, Style }, { SplashScreen }]) => {
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      SplashScreen.hide().catch(() => {});
    }
  );
} else if ('serviceWorker' in navigator) {
  // Habilita la instalación PWA en web (no aplica en nativo).
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
