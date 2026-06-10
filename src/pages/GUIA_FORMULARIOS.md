# Guía de estructura de formularios

Patrón estándar para cada módulo del menú. Referencia viva: [ConfiguracionInicial/Articulos.tsx](ConfiguracionInicial/Articulos.tsx).

## Reglas

1. Un archivo por módulo, en la carpeta de su grupo (`ConfiguracionInicial/`, `DiaADia/`, `Resultados/`).
2. Se construye **primero el detalle**: listado de tarjetas → al hacer click, **modal de detalle** con botones **Eliminar** y **Modificar**.
3. El form (crear/editar) y la confirmación de borrado viven en el **mismo archivo** que la página (componentes locales), no en `components/`.
4. El header lleva el botón `+` (`onAction`) que abre el form en modo `crear`.
5. Datos desde el endpoint con header `X-Token` (token de `useAuth()`). Acciones que aún no tienen endpoint → `toast` placeholder + `// TODO: conectar endpoint`.
6. Enrutar en `src/App.tsx` y agregar la entrada en `src/data/menu.ts`.

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

type Item = { id: number; descripcion: string; activo: string; /* ...campos del JSON */ };

export function Modulo() {
  const { token } = useAuth();
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
      const res = await fetch(URL, { headers: { 'X-Token': token ?? '' } });
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
