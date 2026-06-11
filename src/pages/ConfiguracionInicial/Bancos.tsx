import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/bancos/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/bancos/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/bancos/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/bancos/eliminar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

type Banco = {
  id_banco: number;
  nombre: string;
  activo: string;
};

export function Bancos() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Banco | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; banco: Banco | null } | null>(null);
  const [del, setDel] = useState<Banco | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Banco[] = await res.json();
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
      ? items.filter((b) => b.nombre.toLowerCase().includes(t) || String(b.id_banco).includes(t))
      : items;
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Bancos" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', banco: null })} />
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
        <EmptyState icon="business-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay bancos cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} banco{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((b) => (
              <button key={b.id_banco} className="art-card" onClick={() => setSel(b)}>
                <div className="art-info">
                  <div className="art-name">{b.nombre.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{b.id_banco}</span>
                  </div>
                </div>
                <span className={`art-state-dot${b.activo === 'S' ? ' on' : ''}`} title={b.activo === 'S' ? 'Activo' : 'Inactivo'} />
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <BancoModal
          banco={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', banco: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <BancoForm
          mode={form.mode}
          banco={form.banco}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.banco!.id_banco}`;
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
              show(crear ? 'Banco creado' : 'Banco modificado', 'success');
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
          banco={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_banco}`;
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
              show('Banco eliminado', 'success');
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

function BancoModal({
  banco,
  onClose,
  onEdit,
  onDelete,
}: {
  banco: Banco;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  const activo = banco.activo === 'S';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="artm-title">{banco.nombre.trim()}</div>
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
            <span className="artm-val">{banco.id_banco}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="business-outline" /></span>
            <span className="artm-label">Nombre</span>
            <span className="artm-val">{banco.nombre.trim()}</span>
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

function BancoForm({
  mode,
  banco,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  banco: Banco | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [nombre, setNombre] = useState(banco?.nombre ?? '');
  const [activo, setActivo] = useState(banco ? banco.activo === 'S' : true);
  const [saving, setSaving] = useState(false);
  const valid = nombre.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({ nombre: nombre.trim(), activo: activo ? 'S' : 'N' });
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo banco' : 'Modificar banco'}</div>
            {banco && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{banco.id_banco}</div>}
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

        <div className="artf-switch">
          <span style={{ fontWeight: 500 }}>Activo</span>
          <button className={`switch${activo ? ' on' : ''}`} onClick={() => setActivo((v) => !v)} aria-label="Activo">
            <span className="knob" />
          </button>
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear banco' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ banco, onClose, onConfirm }: { banco: Banco; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar banco</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{banco.nombre.trim()}</strong> (#{banco.id_banco})? Esta acción no se puede deshacer.
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
