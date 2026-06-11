import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/articulos/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/articulos/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/articulos/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/articulos/eliminar';
const FOTO_URL = 'https://oracleapex.com/ords/lasenda/articulos/foto';
const CATEGORIAS_URL = 'https://oracleapex.com/ords/lasenda/categorias/listar';
const MARCAS_URL = 'https://oracleapex.com/ords/lasenda/marcas/listar';
const AUTORES_URL = 'https://oracleapex.com/ords/lasenda/autores/listar';
const EDITORIALES_URL = 'https://oracleapex.com/ords/lasenda/editoriales/listar';
const COLORES_URL = 'https://oracleapex.com/ords/lasenda/colores/listar';
const IVA_URL = 'https://oracleapex.com/ords/lasenda/iva/listar';

type Categoria = { id_categoria: number; descripcion: string };
type Opcion = { id: number; label: string };

// catálogos FK del artículo: estado + cómo mapear cada listado a {id,label}
type CatalogosState = {
  categorias: Categoria[];
  marcas: Opcion[];
  autores: Opcion[];
  editoriales: Opcion[];
  colores: Opcion[];
  iva: Opcion[];
};

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

// Redimensiona a un máx de lado largo y comprime a JPEG. Devuelve base64 sin el prefijo data:.
const comprimirImagen = (file: File, maxLado = 1024, calidad = 0.72): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxLado) { height = Math.round((height * maxLado) / width); width = maxLado; }
        else if (height > maxLado) { width = Math.round((width * maxLado) / height); height = maxLado; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas no disponible'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', calidad).split(',')[1]);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

type Articulo = {
  id_articulo: number;
  descripcion: string;
  id_categoria: number | null;
  id_marca: number | null;
  id_autor: number | null;
  id_editorial: number | null;
  talle: string | null;
  id_color: number | null;
  id_iva: number | null;
  activo: string;
  fecha_alta: string;
};

export function Articulos() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Articulo | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; art: Articulo | null } | null>(null);
  const [del, setDel] = useState<Articulo | null>(null);
  const [cat, setCat] = useState<CatalogosState>({ categorias: [], marcas: [], autores: [], editoriales: [], colores: [], iva: [] });

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Articulo[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogos = async () => {
    const fetchJson = async (url: string) => {
      try {
        const res = await authFetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    };
    const [categorias, marcas, autores, editoriales, colores, iva] = await Promise.all([
      fetchJson(CATEGORIAS_URL), fetchJson(MARCAS_URL), fetchJson(AUTORES_URL),
      fetchJson(EDITORIALES_URL), fetchJson(COLORES_URL), fetchJson(IVA_URL),
    ]);
    setCat({
      categorias,
      marcas: marcas.map((m: any) => ({ id: m.id_marca, label: String(m.descripcion ?? '').trim() })),
      autores: autores.map((a: any) => ({ id: a.id_autor, label: String(a.nombre ?? '').trim() })),
      editoriales: editoriales.map((e: any) => ({ id: e.id_editorial, label: String(e.nombre ?? '').trim() })),
      colores: colores.map((c: any) => ({ id: c.id_color, label: String(c.descripcion ?? '').trim() })),
      iva: iva.map((i: any) => ({ id: i.id_iva, label: String(i.descripcion ?? '').trim() })),
    });
  };

  useEffect(() => {
    load();
    loadCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nombrePorId = useMemo(() => {
    const map = (arr: Opcion[]) => { const m = new Map<number, string>(); arr.forEach((o) => m.set(o.id, o.label)); return m; };
    return {
      id_categoria: (() => { const m = new Map<number, string>(); cat.categorias.forEach((c) => m.set(c.id_categoria, c.descripcion.trim())); return m; })(),
      id_marca: map(cat.marcas),
      id_autor: map(cat.autores),
      id_editorial: map(cat.editoriales),
      id_color: map(cat.colores),
      id_iva: map(cat.iva),
    } as Record<string, Map<number, string>>;
  }, [cat]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t
      ? items.filter((a) => a.descripcion.toLowerCase().includes(t) || String(a.id_articulo).includes(t))
      : items;
    return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Artículos" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', art: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre o código…" />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="art-state">
          <EmptyState icon="cloud-offline-outline" message="No se pudo cargar el listado." />
          <button className="art-retry" onClick={load}>
            <ion-icon name="refresh-outline" /> Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="cube-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay artículos cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} artículo{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((a) => (
              <button key={a.id_articulo} className="art-card" onClick={() => setSel(a)}>
                <div className="art-info">
                  <div className="art-name">{a.descripcion.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{a.id_articulo}</span>
                    <span className="art-date">
                      <ion-icon name="calendar-outline" /> {a.fecha_alta}
                    </span>
                  </div>
                </div>
                <span className={`art-state-dot${a.activo === 'S' ? ' on' : ''}`} title={a.activo === 'S' ? 'Activo' : 'Inactivo'} />
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <ArticuloModal
          art={sel}
          authFetch={authFetch}
          nombrePorId={nombrePorId}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', art: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <ArticuloForm
          mode={form.mode}
          art={form.art}
          cat={cat}
          authFetch={authFetch}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.art!.id_articulo}`;
            try {
              const res = await authFetch(url, {
                method: crear ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const text = await res.text();
              let data: any = null;
              try { data = text ? JSON.parse(text) : null; } catch { /* no es JSON */ }
              const inner = typeof data?.resultado === 'string' ? safeParse(data.resultado) : data?.resultado ?? data;
              if (!res.ok || (inner && String(inner.ok) === 'false')) {
                const msg = inner?.mensaje || inner?.error || data?.message || text || `HTTP ${res.status}`;
                throw new Error(msg);
              }
              show(crear ? 'Artículo creado' : 'Artículo modificado', 'success');
              setForm(null);
              load();
            } catch (e: any) {
              console.error('[articulos] error guardando', { url, method: crear ? 'POST' : 'PUT', payload, error: e });
              const detail = e?.message === 'Failed to fetch'
                ? 'red/CORS — revisá la consola (Network). El servidor no respondió o bloqueó la petición.'
                : (e?.message ?? 'error desconocido');
              show(`No se pudo ${crear ? 'crear' : 'modificar'}: ${detail}`, 'error');
            }
          }}
        />
      )}

      {del && (
        <ConfirmDelete
          art={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_articulo}`;
            try {
              const res = await authFetch(url, { method: 'DELETE' });
              const text = await res.text();
              let data: any = null;
              try { data = text ? JSON.parse(text) : null; } catch { /* no es JSON */ }
              const inner = typeof data?.resultado === 'string' ? safeParse(data.resultado) : data?.resultado ?? data;
              if (!res.ok || (inner && String(inner.ok) === 'false')) {
                const msg = inner?.mensaje || inner?.msg || inner?.error || data?.message || text || `HTTP ${res.status}`;
                throw new Error(msg);
              }
              show('Artículo eliminado', 'success');
              setDel(null);
              load();
            } catch (e: any) {
              console.error('[articulos] error eliminando', { url, error: e });
              const detail = e?.message === 'Failed to fetch'
                ? 'red/CORS — revisá la consola (Network).'
                : (e?.message ?? 'error desconocido');
              show(`No se pudo eliminar: ${detail}`, 'error');
            }
          }}
        />
      )}
    </div>
  );
}

const DETALLE: { key: keyof Articulo; label: string; icon: string }[] = [
  { key: 'id_articulo', label: 'Código', icon: 'barcode-outline' },
  { key: 'id_categoria', label: 'Categoría', icon: 'albums-outline' },
  { key: 'id_marca', label: 'Marca', icon: 'ribbon-outline' },
  { key: 'id_autor', label: 'Autor', icon: 'create-outline' },
  { key: 'id_editorial', label: 'Editorial', icon: 'library-outline' },
  { key: 'talle', label: 'Talle', icon: 'resize-outline' },
  { key: 'id_color', label: 'Color', icon: 'color-palette-outline' },
  { key: 'id_iva', label: 'IVA', icon: 'receipt-outline' },
  { key: 'fecha_alta', label: 'Fecha de alta', icon: 'calendar-outline' },
];

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function ArticuloModal({
  art,
  authFetch,
  nombrePorId,
  onClose,
  onEdit,
  onDelete,
}: {
  art: Articulo;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  nombrePorId: Record<string, Map<number, string>>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  const activo = art.activo === 'S';
  const [foto, setFoto] = useState<string | null>(null);
  const [fotoErr, setFotoErr] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancel = false;
    (async () => {
      try {
        const res = await authFetch(`${FOTO_URL}/${art.id_articulo}`);
        if (!res.ok) { setFotoErr(true); return; }
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) { setFotoErr(true); return; }
        url = window.URL.createObjectURL(blob);
        if (!cancel) setFoto(url);
      } catch { setFotoErr(true); }
    })();
    return () => { cancel = true; if (url) window.URL.revokeObjectURL(url); };
  }, [art.id_articulo, authFetch]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {foto && !fotoErr && (
          <div className="artm-foto"><img src={foto} alt={art.descripcion.trim()} /></div>
        )}
        <div className="artm-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="artm-title">{art.descripcion.trim()}</div>
            <span className={`artm-badge${activo ? ' on' : ''}`}>
              <ion-icon name={activo ? 'checkmark-circle' : 'close-circle'} />
              {activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="artm-grid">
          {DETALLE.map((d) => (
            <div key={d.key} className="artm-row">
              <span className="artm-ico"><ion-icon name={d.icon} /></span>
              <span className="artm-label">{d.label}</span>
              <span className={`artm-val${art[d.key] == null ? ' empty' : ''}`}>
                {art[d.key] == null
                  ? '—'
                  : nombrePorId[d.key]
                  ? nombrePorId[d.key].get(art[d.key] as number) ?? String(art[d.key])
                  : String(art[d.key])}
              </span>
            </div>
          ))}
        </div>

        <div className="artm-actions">
          <button className="btn-outline-danger" onClick={onDelete}>
            <ion-icon name="trash-outline" /> Eliminar
          </button>
          <button className="btn-primary" onClick={onEdit}>
            <ion-icon name="create-outline" /> Modificar
          </button>
        </div>
      </div>
    </div>
  );
}

const FORM_FIELDS: { key: keyof Articulo; label: string; numeric?: boolean }[] = [
  { key: 'descripcion', label: 'Descripción' },
  { key: 'id_categoria', label: 'Categoría', numeric: true },
  { key: 'id_marca', label: 'Marca', numeric: true },
  { key: 'id_autor', label: 'Autor', numeric: true },
  { key: 'id_editorial', label: 'Editorial', numeric: true },
  { key: 'talle', label: 'Talle' },
  { key: 'id_color', label: 'Color', numeric: true },
  { key: 'id_iva', label: 'IVA', numeric: true },
];

function ArticuloForm({
  mode,
  art,
  cat,
  authFetch,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  art: Articulo | null;
  cat: CatalogosState;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    FORM_FIELDS.forEach((f) => {
      const v = art?.[f.key];
      base[f.key] = v == null ? '' : String(v);
    });
    return base;
  });
  const [activo, setActivo] = useState(art ? art.activo === 'S' : true);
  const [saving, setSaving] = useState(false);
  // foto: undefined = sin cambios; '' = quitar; string = nueva imagen base64
  const [foto, setFoto] = useState<string | undefined>(undefined);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoBusy, setFotoBusy] = useState(false);

  // al editar, cargar la foto actual como preview
  useEffect(() => {
    if (mode !== 'editar' || !art) return;
    let url: string | null = null;
    let cancel = false;
    (async () => {
      try {
        const res = await authFetch(`${FOTO_URL}/${art.id_articulo}`);
        if (!res.ok) return;
        const blob = await res.blob();
        if (!blob.type.startsWith('image/')) return;
        url = window.URL.createObjectURL(blob);
        if (!cancel) setFotoPreview(url);
      } catch { /* sin foto */ }
    })();
    return () => { cancel = true; if (url) window.URL.revokeObjectURL(url); };
  }, [mode, art, authFetch]);

  const onPickFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFotoBusy(true);
    try {
      const b64 = await comprimirImagen(file);
      setFoto(b64);
      setFotoPreview(`data:image/jpeg;base64,${b64}`);
    } catch {
      /* imagen inválida */
    } finally {
      setFotoBusy(false);
    }
  };

  const quitarFoto = () => { setFoto(''); setFotoPreview(null); };

  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));
  const valid = vals.descripcion.trim().length > 0;

  // opciones de cada select FK
  const opcionesFK: Record<string, Opcion[]> = {
    id_categoria: cat.categorias.map((c) => ({ id: c.id_categoria, label: c.descripcion.trim() })),
    id_marca: cat.marcas,
    id_autor: cat.autores,
    id_editorial: cat.editoriales,
    id_color: cat.colores,
    id_iva: cat.iva,
  };

  const submit = async () => {
    if (!valid || saving) return;
    const payload: Record<string, unknown> = { activo: activo ? 'S' : 'N' };
    FORM_FIELDS.forEach((f) => {
      const raw = vals[f.key].trim();
      if (f.numeric) payload[f.key] = raw === '' ? null : Number(raw);
      else payload[f.key] = raw === '' ? null : raw;
    });
    if (foto !== undefined) payload.foto_base64 = foto === '' ? null : foto;
    setSaving(true);
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <span className="cpw-icon">
            <ion-icon name={mode === 'crear' ? 'add-circle-outline' : 'create-outline'} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo artículo' : 'Modificar artículo'}</div>
            {art && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{art.id_articulo}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Foto</label>
          <div className="artf-foto">
            {fotoPreview ? (
              <div className="artf-foto-prev">
                <img src={fotoPreview} alt="Foto del artículo" />
                <button type="button" className="artf-foto-x" onClick={quitarFoto} aria-label="Quitar foto">
                  <ion-icon name="close" />
                </button>
              </div>
            ) : (
              <label className="artf-foto-add">
                <input type="file" accept="image/*" capture="environment" onChange={onPickFoto} hidden />
                <ion-icon name={fotoBusy ? 'hourglass-outline' : 'camera-outline'} />
                <span>{fotoBusy ? 'Procesando…' : 'Tomar / elegir foto'}</span>
              </label>
            )}
          </div>
        </div>

        {FORM_FIELDS.map((f) => (
          <div key={f.key} style={{ marginTop: 12 }}>
            <label className="cpw-label">{f.label}</label>
            {opcionesFK[f.key] ? (
              <select className="form-input" value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">— Seleccionar —</option>
                {opcionesFK[f.key].map((o) => (
                  <option key={o.id} value={String(o.id)}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                className="form-input"
                value={vals[f.key]}
                inputMode={f.numeric ? 'numeric' : 'text'}
                placeholder={f.numeric ? 'ID' : ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        ))}

        <div className="artf-switch">
          <span style={{ fontWeight: 500 }}>Activo</span>
          <button className={`switch${activo ? ' on' : ''}`} onClick={() => setActivo((v) => !v)} aria-label="Activo">
            <span className="knob" />
          </button>
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear artículo' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ art, onClose, onConfirm }: { art: Articulo; onClose: () => void; onConfirm: () => Promise<void> }) {
  useEscClose(onClose);
  const [deleting, setDeleting] = useState(false);
  const run = async () => {
    if (deleting) return;
    setDeleting(true);
    try { await onConfirm(); } finally { setDeleting(false); }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet confirm-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="confirm-icon">
          <ion-icon name="trash-outline" />
        </span>
        <div className="confirm-title">Eliminar artículo</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{art.descripcion.trim()}</strong> (#{art.id_articulo})? Esta acción no se puede deshacer.
        </div>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onClose} disabled={deleting}>Cancelar</button>
          <button className="btn-danger" onClick={run} disabled={deleting}>
            <ion-icon name={deleting ? 'hourglass-outline' : 'trash-outline'} /> {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}
