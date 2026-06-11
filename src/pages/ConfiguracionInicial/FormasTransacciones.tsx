import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/formacobro/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/formacobro/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/formacobro/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/formacobro/eliminar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

type Forma = {
  id_forma: number;
  descripcion: string;
  estado: string;
};

export function FormasTransacciones() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Forma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Forma | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; forma: Forma | null } | null>(null);
  const [del, setDel] = useState<Forma | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Forma[] = await res.json();
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
      ? items.filter((f) => f.descripcion.toLowerCase().includes(t) || String(f.id_forma).includes(t))
      : items;
    return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Formas de Transacciones" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', forma: null })} />
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
        <EmptyState icon="swap-horizontal-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay formas cargadas.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} forma{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((f) => (
              <button key={f.id_forma} className="art-card" onClick={() => setSel(f)}>
                <div className="art-info">
                  <div className="art-name">{f.descripcion.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{f.id_forma}</span>
                  </div>
                </div>
                <span className={`art-state-dot${f.estado === 'S' ? ' on' : ''}`} title={f.estado === 'S' ? 'Activo' : 'Inactivo'} />
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <FormaModal
          forma={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', forma: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <FormaForm
          mode={form.mode}
          forma={form.forma}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.forma!.id_forma}`;
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
              show(crear ? 'Forma creada' : 'Forma modificada', 'success');
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
          forma={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_forma}`;
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
              show('Forma eliminada', 'success');
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

function FormaModal({
  forma,
  onClose,
  onEdit,
  onDelete,
}: {
  forma: Forma;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  const activo = forma.estado === 'S';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="artm-title">{forma.descripcion.trim()}</div>
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
            <span className="artm-val">{forma.id_forma}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="swap-horizontal-outline" /></span>
            <span className="artm-label">Descripción</span>
            <span className="artm-val">{forma.descripcion.trim()}</span>
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

function FormaForm({
  mode,
  forma,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  forma: Forma | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [desc, setDesc] = useState(forma?.descripcion ?? '');
  const [estado, setEstado] = useState(forma ? forma.estado === 'S' : true);
  const [saving, setSaving] = useState(false);
  const valid = desc.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({ descripcion: desc.trim(), estado: estado ? 'S' : 'N' });
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nueva forma' : 'Modificar forma'}</div>
            {forma && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{forma.id_forma}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Descripción</label>
          <input
            className="form-input"
            value={desc}
            autoFocus
            onChange={(e) => setDesc(e.target.value)}
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
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear forma' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ forma, onClose, onConfirm }: { forma: Forma; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar forma</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{forma.descripcion.trim()}</strong> (#{forma.id_forma})? Esta acción no se puede deshacer.
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
