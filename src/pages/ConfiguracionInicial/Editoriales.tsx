import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/editoriales/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/editoriales/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/editoriales/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/editoriales/eliminar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

type Editorial = {
  id_editorial: number;
  nombre: string;
};

export function Editoriales() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Editorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Editorial | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; editorial: Editorial | null } | null>(null);
  const [del, setDel] = useState<Editorial | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Editorial[] = await res.json();
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
      ? items.filter((e) => e.nombre.toLowerCase().includes(t) || String(e.id_editorial).includes(t))
      : items;
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Editoriales" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', editorial: null })} />
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
        <EmptyState icon="library-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay editoriales cargadas.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} editorial{filtered.length !== 1 ? 'es' : ''}</div>
          <div className="art-list">
            {filtered.map((e) => (
              <button key={e.id_editorial} className="art-card" onClick={() => setSel(e)}>
                <div className="art-info">
                  <div className="art-name">{e.nombre.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{e.id_editorial}</span>
                  </div>
                </div>
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <EditorialModal
          editorial={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', editorial: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <EditorialForm
          mode={form.mode}
          editorial={form.editorial}
          onClose={() => setForm(null)}
          onSave={async (nombre) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.editorial!.id_editorial}`;
            try {
              const res = await authFetch(url, {
                method: crear ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre }),
              });
              const text = await res.text();
              let data: any = null;
              try { data = text ? JSON.parse(text) : null; } catch { /* no es JSON */ }
              const inner = typeof data?.resultado === 'string' ? safeParse(data.resultado) : data?.resultado ?? data;
              if (!res.ok || (inner && String(inner.ok) === 'false')) {
                const msg = inner?.mensaje || inner?.msg || inner?.error || data?.message || text || `HTTP ${res.status}`;
                throw new Error(msg);
              }
              show(crear ? 'Editorial creada' : 'Editorial modificada', 'success');
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
          editorial={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_editorial}`;
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
              show('Editorial eliminada', 'success');
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

function EditorialModal({
  editorial,
  onClose,
  onEdit,
  onDelete,
}: {
  editorial: Editorial;
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
            <div className="artm-title">{editorial.nombre.trim()}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="artm-grid">
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="barcode-outline" /></span>
            <span className="artm-label">Código</span>
            <span className="artm-val">{editorial.id_editorial}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="library-outline" /></span>
            <span className="artm-label">Nombre</span>
            <span className="artm-val">{editorial.nombre.trim()}</span>
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

function EditorialForm({
  mode,
  editorial,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  editorial: Editorial | null;
  onClose: () => void;
  onSave: (nombre: string) => Promise<void>;
}) {
  useEscClose(onClose);
  const [nombre, setNombre] = useState(editorial?.nombre ?? '');
  const [saving, setSaving] = useState(false);
  const valid = nombre.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave(nombre.trim());
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nueva editorial' : 'Modificar editorial'}</div>
            {editorial && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{editorial.id_editorial}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Nombre</label>
          <input
            className="form-input"
            value={nombre}
            autoFocus
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear editorial' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ editorial, onClose, onConfirm }: { editorial: Editorial; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar editorial</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{editorial.nombre.trim()}</strong> (#{editorial.id_editorial})? Esta acción no se puede deshacer.
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
