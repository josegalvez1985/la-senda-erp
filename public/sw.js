// Service worker mínimo para habilitar la instalación PWA.
// No cachea respuestas de la API (oracleapex); solo deja pasar las peticiones.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
