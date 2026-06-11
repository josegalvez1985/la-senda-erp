import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/iva/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/iva/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/iva/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/iva/eliminar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

type Iva = {
  id_iva: number;
  divisor_iva: number | null;
  descripcion: string;
  divisor_gravada: number | null;
  porcentaje: string | null;
};

export function IvaPage() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Iva[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Iva | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; iva: Iva | null } | null>(null);
  const [del, setDel] = useState<Iva | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Iva[] = await res.json();
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
      ? items.filter((i) =>
          i.descripcion.toLowerCase().includes(t) ||
          (i.porcentaje ?? '').toLowerCase().includes(t) ||
          String(i.id_iva).includes(t))
      : items;
    return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="IVA" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', iva: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por descripción, porcentaje o código…" />

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
        <EmptyState icon="receipt-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay registros de IVA cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((i) => (
              <button key={i.id_iva} className="art-card" onClick={() => setSel(i)}>
                <div className="art-info">
                  <div className="art-name">{i.descripcion.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{i.id_iva}</span>
                    {i.porcentaje && <span className="art-chip">{i.porcentaje.trim()}%</span>}
                  </div>
                </div>
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <IvaModal
          iva={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', iva: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <IvaForm
          mode={form.mode}
          iva={form.iva}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.iva!.id_iva}`;
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
              show(crear ? 'IVA creado' : 'IVA modificado', 'success');
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
          iva={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_iva}`;
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
              show('IVA eliminado', 'success');
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

function IvaModal({
  iva,
  onClose,
  onEdit,
  onDelete,
}: {
  iva: Iva;
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
            <div className="artm-title">{iva.descripcion.trim()}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="artm-grid">
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="barcode-outline" /></span>
            <span className="artm-label">Código</span>
            <span className="artm-val">{iva.id_iva}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="receipt-outline" /></span>
            <span className="artm-label">Descripción</span>
            <span className="artm-val">{iva.descripcion.trim()}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="pie-chart-outline" /></span>
            <span className="artm-label">Porcentaje</span>
            <span className={`artm-val${iva.porcentaje ? '' : ' empty'}`}>{iva.porcentaje?.trim() || '—'}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="calculator-outline" /></span>
            <span className="artm-label">Divisor IVA</span>
            <span className={`artm-val${iva.divisor_iva == null ? ' empty' : ''}`}>{iva.divisor_iva ?? '—'}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="calculator-outline" /></span>
            <span className="artm-label">Divisor gravada</span>
            <span className={`artm-val${iva.divisor_gravada == null ? ' empty' : ''}`}>{iva.divisor_gravada ?? '—'}</span>
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

function IvaForm({
  mode,
  iva,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  iva: Iva | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [desc, setDesc] = useState(iva?.descripcion ?? '');
  const [porcentaje, setPorcentaje] = useState(iva?.porcentaje ?? '');
  const [divisorIva, setDivisorIva] = useState(iva?.divisor_iva != null ? String(iva.divisor_iva) : '');
  const [divisorGravada, setDivisorGravada] = useState(iva?.divisor_gravada != null ? String(iva.divisor_gravada) : '');
  const [saving, setSaving] = useState(false);
  const valid = desc.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({
        descripcion: desc.trim(),
        porcentaje: porcentaje.trim() || null,
        divisor_iva: divisorIva.trim() === '' ? null : Number(divisorIva),
        divisor_gravada: divisorGravada.trim() === '' ? null : Number(divisorGravada),
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo IVA' : 'Modificar IVA'}</div>
            {iva && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{iva.id_iva}</div>}
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
          <label className="cpw-label">Porcentaje</label>
          <input className="form-input" value={porcentaje} maxLength={5} placeholder="10" onChange={(e) => setPorcentaje(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Divisor IVA</label>
          <input className="form-input" value={divisorIva} inputMode="decimal" placeholder="11" onChange={(e) => setDivisorIva(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Divisor gravada</label>
          <input
            className="form-input"
            value={divisorGravada}
            inputMode="decimal"
            placeholder="1.1"
            onChange={(e) => setDivisorGravada(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear IVA' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ iva, onClose, onConfirm }: { iva: Iva; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar IVA</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{iva.descripcion.trim()}</strong> (#{iva.id_iva})? Esta acción no se puede deshacer.
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
