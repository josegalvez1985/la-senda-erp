import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/preciosventas/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/preciosventas/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/preciosventas/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/preciosventas/eliminar';
const ARTICULOS_URL = 'https://oracleapex.com/ords/lasenda/articulos/listar';

type Opcion = { id: number; label: string };

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

const fmtMoneda = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(n);

type PrecioVenta = {
  id_precio_venta: number;
  id_articulo: number;
  fecha: string;
  porcentaje_recargo: number | null;
  precio: number;
  precio_compra: number | null;
};

export function PreciosVentas() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<PrecioVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<PrecioVenta | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; pv: PrecioVenta | null } | null>(null);
  const [del, setDel] = useState<PrecioVenta | null>(null);
  const [articulos, setArticulos] = useState<Opcion[]>([]);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: PrecioVenta[] = await res.json();
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
      ? items.filter((p) =>
          (nombreArticulo.get(p.id_articulo) ?? '').toLowerCase().includes(t) ||
          String(p.id_articulo).includes(t) ||
          String(p.id_precio_venta).includes(t))
      : items;
    return [...list].sort((a, b) => b.id_precio_venta - a.id_precio_venta);
  }, [items, q, nombreArticulo]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Precios de Ventas" subtitle="Día a día" onAction={() => setForm({ mode: 'crear', pv: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por artículo o código…" />

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
        <EmptyState icon="pricetags-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay precios cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} precio{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((p) => (
              <button key={p.id_precio_venta} className="art-card" onClick={() => setSel(p)}>
                <div className="art-info">
                  <div className="art-name">{nombreArticulo.get(p.id_articulo) ?? `Artículo #${p.id_articulo}`}</div>
                  <div className="art-meta">
                    <span className="art-chip">₲ {fmtMoneda(p.precio)}</span>
                    <span className="art-date">
                      <ion-icon name="calendar-outline" /> {p.fecha}
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
        <PrecioModal
          pv={sel}
          nombreArticulo={nombreArticulo}
          onClose={() => setSel(null)}
          onEdit={() => { setForm({ mode: 'editar', pv: sel }); setSel(null); }}
          onDelete={() => { setDel(sel); setSel(null); }}
        />
      )}

      {form && (
        <PrecioForm
          mode={form.mode}
          pv={form.pv}
          articulos={articulos}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.pv!.id_precio_venta}`;
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
              show(crear ? 'Precio creado' : 'Precio modificado', 'success');
              setForm(null);
              load();
            } catch (e: any) {
              console.error('[precios-ventas] error guardando', { url, payload, error: e });
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
          pv={del}
          nombreArticulo={nombreArticulo}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_precio_venta}`;
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
              show('Precio eliminado', 'success');
              setDel(null);
              load();
            } catch (e: any) {
              console.error('[precios-ventas] error eliminando', { url, error: e });
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

function PrecioModal({
  pv,
  nombreArticulo,
  onClose,
  onEdit,
  onDelete,
}: {
  pv: PrecioVenta;
  nombreArticulo: Map<number, string>;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  const detalle: { label: string; icon: string; val: string }[] = [
    { label: 'Código', icon: 'barcode-outline', val: `#${pv.id_precio_venta}` },
    { label: 'Artículo', icon: 'cube-outline', val: nombreArticulo.get(pv.id_articulo) ?? `#${pv.id_articulo}` },
    { label: 'Fecha', icon: 'calendar-outline', val: pv.fecha },
    { label: 'Precio de venta', icon: 'pricetag-outline', val: `₲ ${fmtMoneda(pv.precio)}` },
    { label: 'Precio de compra', icon: 'cart-outline', val: pv.precio_compra == null ? '—' : `₲ ${fmtMoneda(pv.precio_compra)}` },
    { label: '% Recargo', icon: 'trending-up-outline', val: pv.porcentaje_recargo == null ? '—' : `${pv.porcentaje_recargo}%` },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="artm-title">{nombreArticulo.get(pv.id_articulo) ?? `Artículo #${pv.id_articulo}`}</div>
            <span className="artm-badge on">
              <ion-icon name="pricetag" /> ₲ {fmtMoneda(pv.precio)}
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

function PrecioForm({
  mode,
  pv,
  articulos,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  pv: PrecioVenta | null;
  articulos: Opcion[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const hoy = new Date().toISOString().slice(0, 10);
  const [idArticulo, setIdArticulo] = useState(pv ? String(pv.id_articulo) : '');
  const [fecha, setFecha] = useState(pv?.fecha ? pv.fecha.slice(0, 10) : hoy);
  const [precioCompra, setPrecioCompra] = useState(pv?.precio_compra != null ? String(pv.precio_compra) : '');
  const [recargo, setRecargo] = useState(pv?.porcentaje_recargo != null ? String(pv.porcentaje_recargo) : '');
  const [saving, setSaving] = useState(false);

  // precio = precio_compra * (1 + recargo/100)
  const precioCalc = useMemo(() => {
    const pc = Number(precioCompra);
    const r = Number(recargo);
    if (precioCompra.trim() === '' || isNaN(pc)) return null;
    return Math.round(pc * (1 + (isNaN(r) ? 0 : r) / 100));
  }, [precioCompra, recargo]);

  const valid = idArticulo !== '' && precioCalc != null && fecha !== '';

  const submit = async () => {
    if (!valid || saving) return;
    const payload: Record<string, unknown> = {
      id_articulo: Number(idArticulo),
      fecha,
      precio: precioCalc,
      precio_compra: Number(precioCompra),
      porcentaje_recargo: recargo.trim() === '' ? null : Number(recargo),
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo precio' : 'Modificar precio'}</div>
            {pv && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{pv.id_precio_venta}</div>}
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
          <label className="cpw-label">Fecha</label>
          <input className="form-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Precio de compra</label>
          <input className="form-input" inputMode="numeric" placeholder="0" value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">% Recargo</label>
          <input className="form-input" inputMode="numeric" placeholder="0" value={recargo} onChange={(e) => setRecargo(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Precio de venta (calculado)</label>
          <input className="form-input" readOnly value={precioCalc == null ? '' : `₲ ${fmtMoneda(precioCalc)}`} placeholder="Se calcula con compra y recargo" style={{ fontWeight: 700 }} />
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving} style={{ marginTop: 20 }}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear precio' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({
  pv,
  nombreArticulo,
  onClose,
  onConfirm,
}: {
  pv: PrecioVenta;
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
        <div className="confirm-title">Eliminar precio</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar el precio de <strong>{nombreArticulo.get(pv.id_articulo) ?? `artículo #${pv.id_articulo}`}</strong> (#{pv.id_precio_venta})? Esta acción no se puede deshacer.
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
