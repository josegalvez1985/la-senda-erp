/// <reference types="vite/client" />

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
