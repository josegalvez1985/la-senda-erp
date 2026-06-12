/// <reference types="vite/client" />

declare global {
  const __APP_VERSION__: string;
  const __BUILD_DATE__: string;
}

import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': {
        name?: string;
        style?: React.CSSProperties;
        class?: string;
      };
    }
  }
}
