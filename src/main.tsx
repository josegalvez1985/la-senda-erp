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
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
