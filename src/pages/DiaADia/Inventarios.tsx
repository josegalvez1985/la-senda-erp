import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/inventarios/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/inventarios/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/inventarios/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/inventarios/eliminar';
const ARTICULOS_URL = 'https://oracleapex.com/ords/lasenda/articulos/listar';

type Opcion = { id: number; label: string };

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

const fmtNum = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(n);

type Inventario = {
  id_inventario: number;
  cod_barra: string | null;
  id_articulo: number;
  fecha: string;
  cantidad_fisica: number;
  cantidad_sistema: number;
  cerrado: string;
};

export function Inventarios() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Inventario | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; inv: Inventario | null } | null>(null);
  const [del, setDel] = useState<Inventario | null>(null);
  const [articulos, setArticulos] = useState<Opcion[]>([]);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Inventario[] = await res.json();
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
      const data = await res.json();
      if (Array.isArray(data)) {
        setArticulos(data.map((a: any) => ({ id: a.id_articulo, label: String(a.descripcion ?? '').trim() })));
      }
    } catch { /* sin catálogo */ }
  };

  useEffect(() => {
    load();
    loadArticulos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nombreArticulo = useMemo(() => {
    const m = new Map<number, string>();
    articulos.forEach((o) => m.set(o.id, o.label));
    return m;
  }, [articulos]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t
      ? items.filter((i) =>
          (nombreArticulo.get(i.id_articulo) ?? '').toLowerCase().includes(t) ||
          (i.cod_barra ?? '').toLowerCase().includes(t) ||
          String(i.id_articulo).includes(t) ||
          String(i.id_inventario).includes(t))
      : items;
    return [...list].sort((a, b) => b.id_inventario - a.id_inventario);
  }, [items, q, nombreArticulo]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Inventarios" subtitle="Día a día" onAction={() => setForm({ mode: 'crear', inv: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por artículo o código de barra…" />

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
        <EmptyState icon="layers-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay inventarios cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} inventario{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((i) => (
              <button key={i.id_inventario} className="art-card" onClick={() => setSel(i)}>
                <div className="art-info">
                  <div className="art-name">{nombreArticulo.get(i.id_articulo) ?? `Artículo #${i.id_articulo}`}</div>
                  <div className="art-meta">
                    <span className="art-chip">Fís. {fmtNum(i.cantidad_fisica)}</span>
                    <span className="art-date">
                      <ion-icon name="calendar-outline" /> {i.fecha}
                    </span>
                  </div>
                </div>
                <span className={`art-state-dot${i.cerrado === 'S' ? ' on' : ''}`} title={i.cerrado === 'S' ? 'Cerrado' : 'Abierto'} />
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <InventarioModal
          inv={sel}
          nombreArticulo={nombreArticulo}
          onClose={() => setSel(null)}
          onEdit={() => { setForm({ mode: 'editar', inv: sel }); setSel(null); }}
          onDelete={() => { setDel(sel); setSel(null); }}
        />
      )}

      {form && (
        <InventarioForm
          mode={form.mode}
          inv={form.inv}
          articulos={articulos}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.inv!.id_inventario}`;
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
              show(crear ? 'Inventario creado' : 'Inventario modificado', 'success');
              setForm(null);
              load();
            } catch (e: any) {
              console.error('[inventarios] error guardando', { url, payload, error: e });
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
          inv={del}
          nombreArticulo={nombreArticulo}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_inventario}`;
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
              show('Inventario eliminado', 'success');
              setDel(null);
              load();
            } catch (e: any) {
              console.error('[inventarios] error eliminando', { url, error: e });
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

function InventarioModal({
  inv,
  nombreArticulo,
  onClose,
  onEdit,
  onDelete,
}: {
  inv: Inventario;
  nombreArticulo: Map<number, string>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  const cerrado = inv.cerrado === 'S';
  const diferencia = inv.cantidad_fisica - inv.cantidad_sistema;
  const detalle: { label: string; icon: string; val: string }[] = [
    { label: 'Código', icon: 'barcode-outline', val: `#${inv.id_inventario}` },
    { label: 'Artículo', icon: 'cube-outline', val: nombreArticulo.get(inv.id_articulo) ?? `#${inv.id_articulo}` },
    { label: 'Código de barra', icon: 'qr-code-outline', val: inv.cod_barra?.trim() || '—' },
    { label: 'Fecha', icon: 'calendar-outline', val: inv.fecha },
    { label: 'Cantidad física', icon: 'cube-outline', val: fmtNum(inv.cantidad_fisica) },
    { label: 'Cantidad sistema', icon: 'server-outline', val: fmtNum(inv.cantidad_sistema) },
    { label: 'Diferencia', icon: 'swap-vertical-outline', val: fmtNum(diferencia) },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="artm-title">{nombreArticulo.get(inv.id_articulo) ?? `Artículo #${inv.id_articulo}`}</div>
            <span className={`artm-badge${cerrado ? ' on' : ''}`}>
              <ion-icon name={cerrado ? 'lock-closed' : 'lock-open'} />
              {cerrado ? 'Cerrado' : 'Abierto'}
            </span>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="artm-grid">
          {detalle.map((d) => (
            <div key={d.label} className="artm-row">
              <span className="artm-ico"><ion-icon name={d.icon} /></span>
              <span className="artm-label">{d.label}</span>
              <span className={`artm-val${d.val === '—' ? ' empty' : ''}`}>{d.val}</span>
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

function InventarioForm({
  mode,
  inv,
  articulos,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  inv: Inventario | null;
  articulos: Opcion[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const hoy = new Date().toISOString().slice(0, 10);
  const [idArticulo, setIdArticulo] = useState(inv ? String(inv.id_articulo) : '');
  const [codBarra, setCodBarra] = useState(inv?.cod_barra ?? '');
  const [fecha, setFecha] = useState(inv?.fecha ? inv.fecha.slice(0, 10) : hoy);
  const [cantFisica, setCantFisica] = useState(inv ? String(inv.cantidad_fisica) : '');
  const [cantSistema, setCantSistema] = useState(inv ? String(inv.cantidad_sistema) : '');
  const [cerrado, setCerrado] = useState(inv ? inv.cerrado === 'S' : false);
  const [saving, setSaving] = useState(false);

  const valid = idArticulo !== '' && fecha !== '' && cantFisica.trim() !== '';

  const submit = async () => {
    if (!valid || saving) return;
    const payload: Record<string, unknown> = {
      id_articulo: Number(idArticulo),
      cod_barra: codBarra.trim() === '' ? null : codBarra.trim(),
      fecha,
      cantidad_fisica: Number(cantFisica),
      cantidad_sistema: cantSistema.trim() === '' ? 0 : Number(cantSistema),
      cerrado: cerrado ? 'S' : 'N',
    };
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo inventario' : 'Modificar inventario'}</div>
            {inv && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{inv.id_inventario}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Artículo</label>
          <select className="form-input" value={idArticulo} onChange={(e) => setIdArticulo(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {articulos.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Código de barra</label>
          <input className="form-input" value={codBarra} onChange={(e) => setCodBarra(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Fecha</label>
          <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Cantidad física</label>
          <input className="form-input" inputMode="numeric" placeholder="0" value={cantFisica} onChange={(e) => setCantFisica(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Cantidad sistema</label>
          <input className="form-input" inputMode="numeric" placeholder="0" value={cantSistema} onChange={(e) => setCantSistema(e.target.value)} />
        </div>

        <div className="artf-switch">
          <span style={{ fontWeight: 500 }}>Cerrado</span>
          <button className={`switch${cerrado ? ' on' : ''}`} onClick={() => setCerrado((v) => !v)} aria-label="Cerrado">
            <span className="knob" />
          </button>
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear inventario' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({
  inv,
  nombreArticulo,
  onClose,
  onConfirm,
}: {
  inv: Inventario;
  nombreArticulo: Map<number, string>;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
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
        <div className="confirm-title">Eliminar inventario</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar el inventario de <strong>{nombreArticulo.get(inv.id_articulo) ?? `artículo #${inv.id_articulo}`}</strong> (#{inv.id_inventario})? Esta acción no se puede deshacer.
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
