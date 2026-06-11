import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/vendedores/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/vendedores/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/vendedores/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/vendedores/eliminar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

type Vendedor = {
  id_vendedor: number;
  nombre: string;
  porc_comision: number | null;
  estado: string;
  cod_usuario: string | null;
};

export function Vendedores() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Vendedor | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; vendedor: Vendedor | null } | null>(null);
  const [del, setDel] = useState<Vendedor | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Vendedor[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t
      ? items.filter((v) =>
          v.nombre.toLowerCase().includes(t) ||
          (v.cod_usuario ?? '').toLowerCase().includes(t) ||
          String(v.id_vendedor).includes(t))
      : items;
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Vendedores" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', vendedor: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre, usuario o código…" />

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
        <EmptyState icon="people-circle-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay vendedores cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} vendedor{filtered.length !== 1 ? 'es' : ''}</div>
          <div className="art-list">
            {filtered.map((v) => (
              <button key={v.id_vendedor} className="art-card" onClick={() => setSel(v)}>
                <div className="art-info">
                  <div className="art-name">{v.nombre.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{v.id_vendedor}</span>
                    {v.cod_usuario && <span className="art-chip">{v.cod_usuario.trim()}</span>}
                  </div>
                </div>
                <span className={`art-state-dot${v.estado === 'S' ? ' on' : ''}`} title={v.estado === 'S' ? 'Activo' : 'Inactivo'} />
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <VendedorModal
          vendedor={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', vendedor: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <VendedorForm
          mode={form.mode}
          vendedor={form.vendedor}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.vendedor!.id_vendedor}`;
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
              show(crear ? 'Vendedor creado' : 'Vendedor modificado', 'success');
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
          vendedor={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_vendedor}`;
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
              show('Vendedor eliminado', 'success');
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

function VendedorModal({
  vendedor,
  onClose,
  onEdit,
  onDelete,
}: {
  vendedor: Vendedor;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  const activo = vendedor.estado === 'S';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="artm-title">{vendedor.nombre.trim()}</div>
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
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="barcode-outline" /></span>
            <span className="artm-label">Código</span>
            <span className="artm-val">{vendedor.id_vendedor}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="people-circle-outline" /></span>
            <span className="artm-label">Nombre</span>
            <span className="artm-val">{vendedor.nombre.trim()}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="trending-up-outline" /></span>
            <span className="artm-label">% Comisión</span>
            <span className={`artm-val${vendedor.porc_comision == null ? ' empty' : ''}`}>{vendedor.porc_comision ?? '—'}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="person-outline" /></span>
            <span className="artm-label">Usuario</span>
            <span className={`artm-val${vendedor.cod_usuario ? '' : ' empty'}`}>{vendedor.cod_usuario?.trim() || '—'}</span>
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

function VendedorForm({
  mode,
  vendedor,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  vendedor: Vendedor | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [nombre, setNombre] = useState(vendedor?.nombre ?? '');
  const [comision, setComision] = useState(vendedor?.porc_comision != null ? String(vendedor.porc_comision) : '');
  const [codUsuario, setCodUsuario] = useState(vendedor?.cod_usuario ?? '');
  const [estado, setEstado] = useState(vendedor ? vendedor.estado === 'S' : true);
  const [saving, setSaving] = useState(false);
  const valid = nombre.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        porc_comision: comision.trim() === '' ? null : Number(comision),
        cod_usuario: codUsuario.trim() || null,
        estado: estado ? 'S' : 'N',
      });
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo vendedor' : 'Modificar vendedor'}</div>
            {vendedor && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{vendedor.id_vendedor}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Nombre</label>
          <input className="form-input" value={nombre} autoFocus onChange={(e) => setNombre(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">% Comisión</label>
          <input
            className="form-input"
            value={comision}
            inputMode="decimal"
            placeholder="0"
            onChange={(e) => setComision(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Usuario</label>
          <input
            className="form-input"
            value={codUsuario}
            onChange={(e) => setCodUsuario(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <div className="artf-switch">
          <span style={{ fontWeight: 500 }}>Activo</span>
          <button className={`switch${estado ? ' on' : ''}`} onClick={() => setEstado((v) => !v)} aria-label="Activo">
            <span className="knob" />
          </button>
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear vendedor' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ vendedor, onClose, onConfirm }: { vendedor: Vendedor; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar vendedor</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{vendedor.nombre.trim()}</strong> (#{vendedor.id_vendedor})? Esta acción no se puede deshacer.
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
