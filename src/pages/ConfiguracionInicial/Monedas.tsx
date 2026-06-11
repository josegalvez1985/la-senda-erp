import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/monedas/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/monedas/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/monedas/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/monedas/eliminar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

type Moneda = {
  id_moneda: number;
  descripcion: string;
  siglas: string;
  decimales: number;
};

export function Monedas() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Moneda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Moneda | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; moneda: Moneda | null } | null>(null);
  const [del, setDel] = useState<Moneda | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Moneda[] = await res.json();
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
      ? items.filter((m) =>
          m.descripcion.toLowerCase().includes(t) ||
          (m.siglas ?? '').toLowerCase().includes(t) ||
          String(m.id_moneda).includes(t))
      : items;
    return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Monedas" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', moneda: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre, siglas o código…" />

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
        <EmptyState icon="cash-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay monedas cargadas.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} moneda{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((m) => (
              <button key={m.id_moneda} className="art-card" onClick={() => setSel(m)}>
                <div className="art-info">
                  <div className="art-name">{m.descripcion.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{m.id_moneda}</span>
                    {m.siglas && <span className="art-chip">{m.siglas.trim()}</span>}
                  </div>
                </div>
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <MonedaModal
          moneda={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', moneda: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <MonedaForm
          mode={form.mode}
          moneda={form.moneda}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.moneda!.id_moneda}`;
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
              show(crear ? 'Moneda creada' : 'Moneda modificada', 'success');
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
          moneda={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_moneda}`;
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
              show('Moneda eliminada', 'success');
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

function MonedaModal({
  moneda,
  onClose,
  onEdit,
  onDelete,
}: {
  moneda: Moneda;
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
            <div className="artm-title">{moneda.descripcion.trim()}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="artm-grid">
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="barcode-outline" /></span>
            <span className="artm-label">Código</span>
            <span className="artm-val">{moneda.id_moneda}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="cash-outline" /></span>
            <span className="artm-label">Descripción</span>
            <span className="artm-val">{moneda.descripcion.trim()}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="pricetag-outline" /></span>
            <span className="artm-label">Siglas</span>
            <span className={`artm-val${moneda.siglas ? '' : ' empty'}`}>{moneda.siglas?.trim() || '—'}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="calculator-outline" /></span>
            <span className="artm-label">Decimales</span>
            <span className={`artm-val${moneda.decimales == null ? ' empty' : ''}`}>{moneda.decimales ?? '—'}</span>
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

function MonedaForm({
  mode,
  moneda,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  moneda: Moneda | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [desc, setDesc] = useState(moneda?.descripcion ?? '');
  const [siglas, setSiglas] = useState(moneda?.siglas ?? '');
  const [decimales, setDecimales] = useState(moneda?.decimales != null ? String(moneda.decimales) : '');
  const [saving, setSaving] = useState(false);
  const valid = desc.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({
        descripcion: desc.trim(),
        siglas: siglas.trim() || null,
        decimales: decimales.trim() === '' ? null : Number(decimales),
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nueva moneda' : 'Modificar moneda'}</div>
            {moneda && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{moneda.id_moneda}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Descripción</label>
          <input className="form-input" value={desc} autoFocus onChange={(e) => setDesc(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Siglas</label>
          <input className="form-input" value={siglas} maxLength={5} onChange={(e) => setSiglas(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Decimales</label>
          <input
            className="form-input"
            value={decimales}
            inputMode="numeric"
            placeholder="0"
            onChange={(e) => setDecimales(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear moneda' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ moneda, onClose, onConfirm }: { moneda: Moneda; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar moneda</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{moneda.descripcion.trim()}</strong> (#{moneda.id_moneda})? Esta acción no se puede deshacer.
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
