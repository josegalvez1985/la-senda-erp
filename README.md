# La Senda — Admin (React + Vite)

App web administrativa para la Librería Cristiana **La Senda**. Responsive (móvil y escritorio). Frontend React + backend Oracle APEX (ORDS).

## Pantallas incluidas
- **Login** real contra `POST /auth/login` (usuario + contraseña, no email); "recordar usuario y contraseña", toggle de tema y **biometría** (Face ID / Touch ID / huella o WebAuthn)
- **Dashboard** con KPIs y últimas ventas
- **Menú jerárquico** (acordeón) con 3 grupos: Configuración Inicial, Día a día, Resultados — sidebar en desktop, drawer en móvil
- **Artículos** (`Configuración Inicial`): listado desde API con header `X-Token`, búsqueda, modal de detalle y CRUD (crear / modificar / eliminar)
- **Perfil** (ítem raíz): cambio de contraseña (`POST /auth/clave`), toggle biométrico, modo claro/oscuro, cierre de sesión

## Stack
- React 18 + Vite + TypeScript
- React Router DOM (rutas)
- Capacitor (Android / iOS) + `@aparajita/capacitor-biometric-auth`
- Ionicons (web components, vía CDN)
- Backend: Oracle APEX / ORDS (`https://oracleapex.com/ords/lasenda/…`)

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
  logo.png                 # Logo de la marca
src/
  main.tsx                 # Entry (init nativo: status bar / splash)
  App.tsx                  # Rutas + providers
  index.css                # Estilos globales + tema
  layout/
    TabsLayout.tsx         # Sidebar + drawer + menú jerárquico (acordeón)
  pages/
    Login.tsx, Dashboard.tsx, Perfil.tsx, Modulo.tsx
    ConfiguracionInicial/  # Artículos (+ futuros módulos del grupo)
    DiaADia/               # Módulos del grupo Día a día
    Resultados/            # Módulos del grupo Resultados
    GUIA_FORMULARIOS.md    # Patrón estándar para nuevos módulos (detalle + CRUD)
    README.md              # Mapa de páginas por grupo
  components/              # Card, Header, Badge, SearchBar, SummaryCard, EmptyState, FormModal, ChangePasswordModal
  context/                 # AuthContext, DataContext, ThemeContext, ToastContext
  lib/                     # biometric.ts (WebAuthn / biometría nativa)
  data/                    # menu.ts (estructura del menú), mock.ts (helpers/formato)
```

## Backend y autenticación
- **Login**: `POST /auth/login` con `{ username, password }`. La respuesta envuelve un string JSON en `resultado` (`{ ok, token, username, nombre }`); se guarda el token en `localStorage` y se envía como header `X-Token` en las llamadas a la API.
- **Cambio de clave**: `POST /auth/clave` con `{ username, actual, nueva }`.
- **Artículos**: `GET /articulos/listar` (header `X-Token`). Los endpoints de crear/modificar/eliminar están pendientes de conectar (la UI ya existe).

## Nuevos módulos
Seguí el patrón de [src/pages/GUIA_FORMULARIOS.md](src/pages/GUIA_FORMULARIOS.md): primero el detalle (tarjetas → modal con Eliminar/Modificar), luego el form de crear/editar. Tomá [Artículos](src/pages/ConfiguracionInicial/Articulos.tsx) como referencia. Cada módulo se agrega en `src/data/menu.ts` y se enruta en `src/App.tsx`.
