import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/codbarras/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/codbarras/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/codbarras/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/codbarras/eliminar';
const ARTICULOS_URL = 'https://oracleapex.com/ords/lasenda/articulos/listar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

type Articulo = { id_articulo: number; descripcion: string };

type CodBarra = {
  id_cod_barra: number;
  cod_barra: string;
  id_articulo: number;
};

export function CodigosBarras() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<CodBarra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<CodBarra | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; cb: CodBarra | null } | null>(null);
  const [del, setDel] = useState<CodBarra | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: CodBarra[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadArticulos = async () => {
    try {
      const res = await authFetch(ARTICULOS_URL);
      if (!res.ok) return;
      const data: Articulo[] = await res.json();
      setArticulos(Array.isArray(data) ? data : []);
    } catch { /* el detalle/selector mostrará el código si falla */ }
  };

  useEffect(() => {
    load();
    loadArticulos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const artNombre = useMemo(() => {
    const m = new Map<number, string>();
    articulos.forEach((a) => m.set(a.id_articulo, a.descripcion.trim()));
    return m;
  }, [articulos]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t
      ? items.filter((c) =>
          c.cod_barra.toLowerCase().includes(t) ||
          String(c.id_cod_barra).includes(t) ||
          (artNombre.get(c.id_articulo) ?? '').toLowerCase().includes(t))
      : items;
    return [...list].sort((a, b) => a.cod_barra.localeCompare(b.cod_barra));
  }, [items, q, artNombre]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Códigos de Barras" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', cb: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por código o artículo…" />

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
        <EmptyState icon="barcode-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay códigos de barras cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} código{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((c) => (
              <button key={c.id_cod_barra} className="art-card" onClick={() => setSel(c)}>
                <div className="art-info">
                  <div className="art-name">{c.cod_barra.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{c.id_cod_barra}</span>
                    <span className="art-date">
                      <ion-icon name="cube-outline" /> {artNombre.get(c.id_articulo) ?? `Art. ${c.id_articulo}`}
                    </span>
                  </div>
                </div>
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <CodBarraModal
          cb={sel}
          artNombre={artNombre}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', cb: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <CodBarraForm
          mode={form.mode}
          cb={form.cb}
          articulos={articulos}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.cb!.id_cod_barra}`;
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
                const msg = inner?.mensaje || inner?.msg || inner?.error || data?.message || text || `HTTP ${res.status}`;
                throw new Error(msg);
              }
              show(crear ? 'Código creado' : 'Código modificado', 'success');
              setForm(null);
              load();
            } catch (e: any) {
              const detail = e?.message === 'Failed to fetch'
                ? 'red/CORS — revisá la consola (Network).'
                : (e?.message ?? 'error desconocido');
              show(`No se pudo ${crear ? 'crear' : 'modificar'}: ${detail}`, 'error');
            }
          }}
        />
      )}

      {del && (
        <ConfirmDelete
          cb={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_cod_barra}`;
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
              show('Código eliminado', 'success');
              setDel(null);
              load();
            } catch (e: any) {
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

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function CodBarraModal({
  cb,
  artNombre,
  onClose,
  onEdit,
  onDelete,
}: {
  cb: CodBarra;
  artNombre: Map<number, string>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="artm-title">{cb.cod_barra.trim()}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="artm-grid">
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="key-outline" /></span>
            <span className="artm-label">Código</span>
            <span className="artm-val">{cb.id_cod_barra}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="barcode-outline" /></span>
            <span className="artm-label">Cód. barra</span>
            <span className="artm-val">{cb.cod_barra.trim()}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="cube-outline" /></span>
            <span className="artm-label">Artículo</span>
            <span className="artm-val">{artNombre.get(cb.id_articulo) ?? `Art. ${cb.id_articulo}`}</span>
          </div>
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

function CodBarraForm({
  mode,
  cb,
  articulos,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  cb: CodBarra | null;
  articulos: Articulo[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [codBarra, setCodBarra] = useState(cb?.cod_barra ?? '');
  const [idArticulo, setIdArticulo] = useState(cb ? String(cb.id_articulo) : '');
  const [saving, setSaving] = useState(false);
  const valid = codBarra.trim().length > 0 && idArticulo !== '';

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({ cod_barra: codBarra.trim(), id_articulo: Number(idArticulo) });
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo código' : 'Modificar código'}</div>
            {cb && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{cb.id_cod_barra}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Cód. barra</label>
          <input
            className="form-input"
            value={codBarra}
            autoFocus
            onChange={(e) => setCodBarra(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Artículo</label>
          <select className="form-input" value={idArticulo} onChange={(e) => setIdArticulo(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {articulos.map((a) => (
              <option key={a.id_articulo} value={String(a.id_articulo)}>{a.descripcion.trim()}</option>
            ))}
          </select>
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear código' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ cb, onClose, onConfirm }: { cb: CodBarra; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar código</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{cb.cod_barra.trim()}</strong> (#{cb.id_cod_barra})? Esta acción no se puede deshacer.
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
