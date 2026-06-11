import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/timbrados/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/timbrados/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/timbrados/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/timbrados/eliminar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

type Timbrado = {
  id_timbrado: number;
  serie: string;
  numero_desde: number | null;
  numero_hasta: number | null;
  fecha_vencimiento: string | null;
  nro_timbrado: string | null;
};

export function Timbrados() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Timbrado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Timbrado | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; timbrado: Timbrado | null } | null>(null);
  const [del, setDel] = useState<Timbrado | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Timbrado[] = await res.json();
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
      ? items.filter((x) =>
          (x.nro_timbrado ?? '').toLowerCase().includes(t) ||
          x.serie.toLowerCase().includes(t) ||
          String(x.id_timbrado).includes(t))
      : items;
    return [...list].sort((a, b) => a.serie.localeCompare(b.serie));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Timbrados" subtitle="Día a día" onAction={() => setForm({ mode: 'crear', timbrado: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por timbrado, serie o código…" />

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
        <EmptyState icon="document-text-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay timbrados cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} timbrado{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((x) => (
              <button key={x.id_timbrado} className="art-card" onClick={() => setSel(x)}>
                <div className="art-info">
                  <div className="art-name">{x.nro_timbrado?.trim() || `Serie ${x.serie.trim()}`}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{x.id_timbrado}</span>
                    <span className="art-chip">Serie {x.serie.trim()}</span>
                    {x.fecha_vencimiento && <span className="art-date"><ion-icon name="calendar-outline" /> {x.fecha_vencimiento}</span>}
                  </div>
                </div>
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <TimbradoModal
          timbrado={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', timbrado: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <TimbradoForm
          mode={form.mode}
          timbrado={form.timbrado}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.timbrado!.id_timbrado}`;
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
              show(crear ? 'Timbrado creado' : 'Timbrado modificado', 'success');
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
          timbrado={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_timbrado}`;
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
              show('Timbrado eliminado', 'success');
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

function TimbradoModal({
  timbrado,
  onClose,
  onEdit,
  onDelete,
}: {
  timbrado: Timbrado;
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
            <div className="artm-title">{timbrado.nro_timbrado?.trim() || `Serie ${timbrado.serie.trim()}`}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="artm-grid">
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="barcode-outline" /></span>
            <span className="artm-label">Código</span>
            <span className="artm-val">{timbrado.id_timbrado}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="document-text-outline" /></span>
            <span className="artm-label">Nro. timbrado</span>
            <span className={`artm-val${timbrado.nro_timbrado ? '' : ' empty'}`}>{timbrado.nro_timbrado?.trim() || '—'}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="pricetag-outline" /></span>
            <span className="artm-label">Serie</span>
            <span className="artm-val">{timbrado.serie.trim()}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="arrow-forward-outline" /></span>
            <span className="artm-label">Número desde</span>
            <span className={`artm-val${timbrado.numero_desde == null ? ' empty' : ''}`}>{timbrado.numero_desde ?? '—'}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="arrow-back-outline" /></span>
            <span className="artm-label">Número hasta</span>
            <span className={`artm-val${timbrado.numero_hasta == null ? ' empty' : ''}`}>{timbrado.numero_hasta ?? '—'}</span>
          </div>
          <div className="artm-row">
            <span className="artm-ico"><ion-icon name="calendar-outline" /></span>
            <span className="artm-label">Vencimiento</span>
            <span className={`artm-val${timbrado.fecha_vencimiento ? '' : ' empty'}`}>{timbrado.fecha_vencimiento || '—'}</span>
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

function TimbradoForm({
  mode,
  timbrado,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  timbrado: Timbrado | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [serie, setSerie] = useState(timbrado?.serie ?? '');
  const [desde, setDesde] = useState(timbrado?.numero_desde != null ? String(timbrado.numero_desde) : '');
  const [hasta, setHasta] = useState(timbrado?.numero_hasta != null ? String(timbrado.numero_hasta) : '');
  const [venc, setVenc] = useState(timbrado?.fecha_vencimiento ?? '');
  const [nro, setNro] = useState(timbrado?.nro_timbrado ?? '');
  const [saving, setSaving] = useState(false);
  const valid = serie.trim().length > 0 && desde.trim() !== '' && hasta.trim() !== '' && venc.trim() !== '';

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({
        serie: serie.trim(),
        numero_desde: Number(desde),
        numero_hasta: Number(hasta),
        fecha_vencimiento: venc.trim(),
        nro_timbrado: nro.trim() || null,
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo timbrado' : 'Modificar timbrado'}</div>
            {timbrado && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{timbrado.id_timbrado}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Nro. timbrado</label>
          <input className="form-input" value={nro} autoFocus onChange={(e) => setNro(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Serie</label>
          <input className="form-input" value={serie} maxLength={10} onChange={(e) => setSerie(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Número desde</label>
          <input className="form-input" value={desde} inputMode="numeric" placeholder="1" onChange={(e) => setDesde(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Número hasta</label>
          <input className="form-input" value={hasta} inputMode="numeric" placeholder="1000" onChange={(e) => setHasta(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Fecha de vencimiento</label>
          <input
            className="form-input"
            value={venc}
            placeholder="DD/MM/AAAA"
            onChange={(e) => setVenc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear timbrado' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ timbrado, onClose, onConfirm }: { timbrado: Timbrado; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar timbrado</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{timbrado.nro_timbrado?.trim() || `Serie ${timbrado.serie.trim()}`}</strong> (#{timbrado.id_timbrado})? Esta acción no se puede deshacer.
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
