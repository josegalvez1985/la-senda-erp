# Guía de estructura de formularios

Patrón estándar para cada módulo del menú. Referencias vivas: [ConfiguracionInicial/Articulos.tsx](ConfiguracionInicial/Articulos.tsx) (módulo complejo, varios campos) y [ConfiguracionInicial/Categorias.tsx](ConfiguracionInicial/Categorias.tsx) (módulo simple, solo `descripcion`).

## Reglas

1. Un archivo por módulo, en la carpeta de su grupo (`ConfiguracionInicial/`, `DiaADia/`, `Resultados/`).
2. Se construye **primero el detalle**: listado de tarjetas → al hacer click, **modal de detalle** con botones **Eliminar** y **Modificar**.
3. El form (crear/editar) y la confirmación de borrado viven en el **mismo archivo** que la página (componentes locales), no en `components/`.
4. El header lleva el botón `+` (`onAction`) que abre el form en modo `crear`.
5. **Todas** las llamadas a la API van por `authFetch` de `useAuth()` — adjunta el header `X-Token` automáticamente y, si el backend responde **401**, hace `logout()` y `RequireAuth` redirige a `/login`. No usar `fetch` crudo ni pasar el token a mano.
6. Endpoints CRUD estándar del backend (ORDS): `listar` (GET), `crear` (POST), `actualizar/:id` (PUT), `eliminar/:id` (DELETE). El `id` va en la URL; el token siempre en el header.
7. Acciones que aún no tienen endpoint → `toast` placeholder + `// TODO: conectar endpoint`.
8. Enrutar en `src/App.tsx`: importar la página, agregar su `<Route path="/m/xxx" .../>` **explícito** y **excluirla del filtro genérico** (`.filter(... it.to !== '/m/xxx')`) que renderiza `<Modulo />`. Si no la excluís, se monta dos veces. Agregar la entrada en `src/data/menu.ts` si no existe.

## Manejo de respuesta y errores (crear/actualizar/eliminar)

El backend envuelve a veces la respuesta en `resultado` (string JSON) con `{ ok, msg/mensaje }`. Patrón uniforme:

```tsx
const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
const text = await res.text();
let data: any = null;
try { data = text ? JSON.parse(text) : null; } catch { /* no es JSON */ }
const inner = typeof data?.resultado === 'string' ? safeParse(data.resultado) : data?.resultado ?? data;
if (!res.ok || (inner && String(inner.ok) === 'false')) {
  throw new Error(inner?.mensaje || inner?.msg || inner?.error || data?.message || text || `HTTP ${res.status}`);
}
// éxito: show(...), cerrar modal, load()
```

- `Form`/`ConfirmDelete` llevan estado de envío local (`saving`/`deleting`) y deshabilitan el botón mientras corre; `onSave`/`onConfirm` son `async`.
- Un `"Failed to fetch"` no es error del backend: es red/CORS. El detalle real está en DevTools → Network, no en el `catch`.

### Checklist de backend (ORDS) — errores típicos al conectar un módulo nuevo

Estos fallos son **del backend**, no del front. Síntoma → causa:

- **`No 'Access-Control-Allow-Origin' header` / "Failed to fetch":** falta CORS para el origen en esa ruta. Habilitar a nivel esquema (cubre todas las rutas/métodos):
  ```sql
  BEGIN
    ORDS_ADMIN.SET_SCHEMA_ORIGINS_ALLOWED(
      p_schema => 'LASENDA',
      p_origins_allowed => 'http://localhost:5173,https://josegalvez1985.github.io');
    COMMIT;
  END;
  ```
- **`x-token is not allowed by Access-Control-Allow-Headers`:** el handler no declara el header `X-Token`. En cada handler, sección **Parámetros**, agregar: Nombre `X-Token`, **Variable de enlace `token`**, Acceso `IN`, Origen `HTTP HEADER`, Tipo `STRING`.
- **401 al crear/actualizar/eliminar (pero listar funciona):** la **Variable de enlace** del parámetro `X-Token` no es exactamente `token` → `:token` llega null en el PL/SQL. Corregirla a `token`.
- **Ruta con `:id` da 404/CORS:** la **Plantilla de URI** debe ser `actualizar/:id` / `eliminar/:id` (con `:id`), no `actualizar` a secas. Sin `:id` la ruta `/actualizar/66` no matchea.
- **PUT/DELETE fallan pero POST anda:** el preflight de esos métodos no está permitido. Lo resuelve el `SET_SCHEMA_ORIGINS_ALLOWED` de arriba.

## Campos FK (categoría, marca, autor, etc.) — selector con nombres

Cuando un campo guarda solo el **código** de otro catálogo (ej. `id_categoria`), NO crear endpoint nuevo: reusar el `listar` de ese catálogo como lista de valores (LOV). Patrón (ver `Articulos.tsx`, categoría):

- En la página: estado `const [categorias, setCategorias] = useState<Categoria[]>([])`, función `loadCategorias()` con `authFetch(CATEGORIAS_URL)`, llamada en el mismo `useEffect` que `load()`. Si falla, no rompe: el detalle/selector cae al código.
- Mapa `id→nombre` con `useMemo` para mostrar el nombre en el **detalle** (`catNombre.get(id) ?? String(id)`).
- En el **form**, el campo se renderiza como `<select className="form-input">` (no `<input>`): `<option value="">— Seleccionar —</option>` + un option por catálogo (`value={String(id)}`, texto = `descripcion`). El payload sigue mandando el número.
- Pasar `catNombre` al `Modal` y `categorias` al `Form` como props.

Una sola carga del `listar` sirve para el selector del form y para mostrar el nombre en el detalle. Mismo patrón para cada FK (marca, autor, editorial, color, iva).

## Componentes por archivo

- `Modulo()` — página: estado (`items`, `loading`, `error`, `q`, `sel`, `form`, `del`), `load()`, filtrado, render del listado y montaje condicional de los 3 modales.
- `XxxModal` — detalle (solo lectura) + acciones Eliminar/Modificar.
- `XxxForm` — crear/editar (`mode: 'crear' | 'editar'`), precarga valores si `editar`.
- `ConfirmDelete` — confirmación destructiva.
- `useEscClose(onClose)` — hook local para cerrar con Escape.

## Clases CSS reutilizables (ya en `index.css`)

Listado: `.art-list .art-card .art-info .art-name .art-meta .art-chip .art-date .art-state-dot(.on) .art-arrow .art-count`
Estados: `.spinner`, `.art-state`, `.art-retry`, `EmptyState`
Detalle: `.artm-head .artm-title .artm-badge(.on) .artm-grid .artm-row .artm-ico .artm-label .artm-val(.empty) .artm-actions`
Form: `.modal-sheet`, `.cpw-icon`, `.cpw-label`, `.form-input`, `.cpw-submit`, `.artf-switch`, `.switch(.on) .knob`
Botones: `.btn-primary .btn-outline-danger .btn-danger .btn-ghost`
Confirmación: `.confirm-sheet .confirm-icon .confirm-title .confirm-text .confirm-actions`

> Estas clases son genéricas pese al prefijo `art-`/`artm-`; reusarlas tal cual. Solo crear CSS nuevo si el módulo lo necesita.

## Esqueleto

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/<modulo>/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/<modulo>/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/<modulo>/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/<modulo>/eliminar';

type Item = { id: number; descripcion: string; activo: string; /* ...campos del JSON */ };

export function Modulo() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Item | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; item: Item | null } | null>(null);
  const [del, setDel] = useState<Item | null>(null);

  const load = async () => {
    setLoading(true); setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Item[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setError(true); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? items.filter((x) => x.descripcion.toLowerCase().includes(t) || String(x.id).includes(t)) : items;
    return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Módulo" subtitle="Grupo" onAction={() => setForm({ mode: 'crear', item: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar…" />
      {/* loading / error / empty / lista de .art-card  (ver Articulos.tsx) */}
      {/* {sel && <DetalleModal .../>}  abre Form/ConfirmDelete */}
      {/* {form && <Form .../>}  onSave -> show(... 'pendiente conectar API') + // TODO */}
      {/* {del && <ConfirmDelete .../>} */}
    </div>
  );
}
```

Para el detalle, form y confirmación, copiar `ArticuloModal`, `ArticuloForm`, `ConfirmDelete` y `useEscClose` de [Articulos.tsx](ConfiguracionInicial/Articulos.tsx), renombrando tipos/campos.
```
