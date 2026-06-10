# La Senda — Admin (React + Vite)

App web administrativa para la Librería Cristiana **La Senda**. Responsive (móvil y escritorio). Solo frontend.

## Pantallas incluidas
- **Login** (mock — cualquier email/password de >3 caracteres) con "recordar mi correo" y toggle de tema
- **Dashboard** con KPIs, accesos rápidos y últimas ventas
- **Ventas** (listado + búsqueda + alta de ventas)
- **Compras** (órdenes a proveedores + alta)
- **Stock / Inventario** con alertas de stock crítico y ajuste de stock
- **Perfil** con cierre de sesión y modo claro/oscuro

## Stack
- React 18 + Vite
- React Router DOM (rutas)
- TypeScript
- Ionicons (web components, vía CDN)

## Cómo correr

```bash
npm install
npm run dev       # desarrollo (http://localhost:5173)
npm run build     # build de producción a dist/
npm run preview   # previsualizar el build
```

## App móvil (Android / iOS) — Capacitor

La app es instalable como app nativa mediante Capacitor.

```bash
npm run sync      # build web + copia a android/ e ios/
npm run android   # build + abre Android Studio
npm run ios        # build + abre Xcode (solo en macOS)
```

- **Android**: requiere Android Studio. Desde ahí: Run para emulador/dispositivo o Build > APK/AAB.
- **iOS**: requiere macOS + Xcode. Abrí `ios/App`, seleccioná equipo de firma y Run.
- **Biometría**: en nativo usa Face ID / Touch ID / huella del SO; en web usa WebAuthn (requiere HTTPS).

## Despliegue web (GitHub Pages)

El push a `main` despliega automáticamente vía GitHub Actions (`.github/workflows/deploy.yml`).

**Activación (una sola vez):** GitHub → *Settings → Pages → Build and deployment → Source: **GitHub Actions***.

URL publicada: `https://josegalvez1985.github.io/la-senda-erp/`

Notas:
- El `base` del bundle solo es `/la-senda-erp/` cuando el workflow define `GITHUB_PAGES=true`; en local y en Capacitor queda `/`.
- `public/404.html` + el script en `index.html` dan soporte SPA (rutas profundas no dan 404 al refrescar).
- Tras un deploy de Pages, corré `npm run sync` antes de compilar nativo para regenerar `dist/` con base `/`.

## Diseño
- Paleta: verde bosque `#0F3D2E` + dorado `#C9A24C` (acento)
- Tema claro/oscuro mediante CSS variables (`[data-theme]`), persistido en `localStorage`
- Responsive: tab bar inferior en móvil (≤768px), sidebar lateral en escritorio (≥769px)

## Estructura
```
public/
  logo.png             # Logo de la marca
src/
  main.tsx             # Entry
  App.tsx              # Rutas + providers
  index.css            # Estilos globales + tema
  layout/
    TabsLayout.tsx     # Sidebar (desktop) + tab bar (móvil)
  pages/               # Login, Dashboard, Ventas, Compras, Stock, Perfil
  components/          # Card, Header, Badge, SearchBar, SummaryCard, EmptyState, FormModal
  context/             # AuthContext, DataContext, ThemeContext (localStorage)
  data/                # Datos mock + helpers de formato
```

## Datos y persistencia
Los datos arrancan desde `src/data/mock.ts` y se persisten en `localStorage` (claves `@lasenda/*`). El alta de ventas/compras/productos y el ajuste de stock se guardan automáticamente.

Para conectar a un backend real, reemplazá la lógica de `DataContext` por llamadas `fetch` a tu API.
