import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/personas/listar';
const CREAR_URL = 'https://oracleapex.com/ords/lasenda/personas/crear';
const ACTUALIZAR_URL = 'https://oracleapex.com/ords/lasenda/personas/actualizar';
const ELIMINAR_URL = 'https://oracleapex.com/ords/lasenda/personas/eliminar';

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

const IND_LABEL: Record<string, string> = { C: 'Cliente', P: 'Proveedor', A: 'Ambos' };

type Persona = {
  id_persona: number;
  tipo_persona: string | null;
  nombre: string;
  nombre_fantasia: string | null;
  sexo: string | null;
  fec_nacimiento: string | null;
  nro_telefono: string | null;
  direccion: string | null;
  nro_ci: string | null;
  nro_ruc: string | null;
  ind_cliente_proveedor: string | null;
};

export function Personas() {
  const { authFetch } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Persona | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; persona: Persona | null } | null>(null);
  const [del, setDel] = useState<Persona | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await authFetch(URL);
      if (!res.ok) throw new Error();
      const data: Persona[] = await res.json();
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
      ? items.filter((p) =>
          p.nombre.toLowerCase().includes(t) ||
          (p.nombre_fantasia ?? '').toLowerCase().includes(t) ||
          (p.nro_ci ?? '').toLowerCase().includes(t) ||
          (p.nro_ruc ?? '').toLowerCase().includes(t) ||
          String(p.id_persona).includes(t))
      : items;
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Personas" subtitle="Día a día" onAction={() => setForm({ mode: 'crear', persona: null })} />
      <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre, CI, RUC o código…" />

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
        <EmptyState icon="person-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay personas cargadas.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} persona{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((p) => (
              <button key={p.id_persona} className="art-card" onClick={() => setSel(p)}>
                <div className="art-info">
                  <div className="art-name">{p.nombre.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{p.id_persona}</span>
                    {p.ind_cliente_proveedor && <span className="art-chip">{IND_LABEL[p.ind_cliente_proveedor] ?? p.ind_cliente_proveedor}</span>}
                    {p.nro_telefono && <span className="art-date"><ion-icon name="call-outline" /> {p.nro_telefono.trim()}</span>}
                  </div>
                </div>
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <PersonaModal
          persona={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', persona: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <PersonaForm
          mode={form.mode}
          persona={form.persona}
          onClose={() => setForm(null)}
          onSave={async (payload) => {
            const crear = form.mode === 'crear';
            const url = crear ? CREAR_URL : `${ACTUALIZAR_URL}/${form.persona!.id_persona}`;
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
              show(crear ? 'Persona creada' : 'Persona modificada', 'success');
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
          persona={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            const url = `${ELIMINAR_URL}/${del.id_persona}`;
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
              show('Persona eliminada', 'success');
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

const DETALLE: { key: keyof Persona; label: string; icon: string }[] = [
  { key: 'id_persona', label: 'Código', icon: 'barcode-outline' },
  { key: 'tipo_persona', label: 'Tipo', icon: 'people-outline' },
  { key: 'nombre_fantasia', label: 'Nombre fantasía', icon: 'sparkles-outline' },
  { key: 'sexo', label: 'Sexo', icon: 'male-female-outline' },
  { key: 'fec_nacimiento', label: 'Nacimiento', icon: 'calendar-outline' },
  { key: 'nro_telefono', label: 'Teléfono', icon: 'call-outline' },
  { key: 'direccion', label: 'Dirección', icon: 'location-outline' },
  { key: 'nro_ci', label: 'CI', icon: 'card-outline' },
  { key: 'nro_ruc', label: 'RUC', icon: 'document-text-outline' },
];

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function PersonaModal({
  persona,
  onClose,
  onEdit,
  onDelete,
}: {
  persona: Persona;
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
            <div className="artm-title">{persona.nombre.trim()}</div>
            {persona.ind_cliente_proveedor && (
              <span className="artm-badge on">
                <ion-icon name="pricetag" />
                {IND_LABEL[persona.ind_cliente_proveedor] ?? persona.ind_cliente_proveedor}
              </span>
            )}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="artm-grid">
          {DETALLE.map((d) => (
            <div key={d.key} className="artm-row">
              <span className="artm-ico"><ion-icon name={d.icon} /></span>
              <span className="artm-label">{d.label}</span>
              <span className={`artm-val${persona[d.key] == null || persona[d.key] === '' ? ' empty' : ''}`}>
                {persona[d.key] == null || persona[d.key] === '' ? '—' : String(persona[d.key]).trim()}
              </span>
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

function PersonaForm({
  mode,
  persona,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  persona: Persona | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  useEscClose(onClose);
  const [tipo, setTipo] = useState(persona?.tipo_persona ?? 'Física');
  const [nombre, setNombre] = useState(persona?.nombre ?? '');
  const [fantasia, setFantasia] = useState(persona?.nombre_fantasia ?? '');
  const [sexo, setSexo] = useState(persona?.sexo ?? '');
  const [fecNac, setFecNac] = useState(persona?.fec_nacimiento ?? '');
  const [telefono, setTelefono] = useState(persona?.nro_telefono ?? '');
  const [direccion, setDireccion] = useState(persona?.direccion ?? '');
  const [ci, setCi] = useState(persona?.nro_ci ?? '');
  const [ruc, setRuc] = useState(persona?.nro_ruc ?? '');
  const [ind, setInd] = useState(persona?.ind_cliente_proveedor ?? 'C');
  const [saving, setSaving] = useState(false);
  const valid = nombre.trim().length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({
        tipo_persona: tipo.trim() || null,
        nombre: nombre.trim(),
        nombre_fantasia: fantasia.trim() || null,
        sexo: sexo.trim() || null,
        fec_nacimiento: fecNac.trim() || null,
        nro_telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
        nro_ci: ci.trim() || null,
        nro_ruc: ruc.trim() || null,
        ind_cliente_proveedor: ind || null,
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
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nueva persona' : 'Modificar persona'}</div>
            {persona && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{persona.id_persona}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Tipo de persona</label>
          <select className="form-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="Física">Física</option>
            <option value="Jurídica">Jurídica</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Nombre</label>
          <input className="form-input" value={nombre} autoFocus onChange={(e) => setNombre(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Nombre fantasía</label>
          <input className="form-input" value={fantasia} onChange={(e) => setFantasia(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Sexo</label>
          <select className="form-input" value={sexo} onChange={(e) => setSexo(e.target.value)}>
            <option value="">— Seleccionar —</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Fecha de nacimiento</label>
          <input className="form-input" value={fecNac} placeholder="DD/MM/AAAA" onChange={(e) => setFecNac(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Teléfono</label>
          <input className="form-input" value={telefono} inputMode="tel" onChange={(e) => setTelefono(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Dirección</label>
          <input className="form-input" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">CI</label>
          <input className="form-input" value={ci} inputMode="numeric" onChange={(e) => setCi(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">RUC</label>
          <input className="form-input" value={ruc} onChange={(e) => setRuc(e.target.value)} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="cpw-label">Cliente / Proveedor</label>
          <select className="form-input" value={ind} onChange={(e) => setInd(e.target.value)}>
            <option value="C">Cliente</option>
            <option value="P">Proveedor</option>
            <option value="A">Ambos</option>
          </select>
        </div>

        <button className="cpw-submit" onClick={submit} disabled={!valid || saving}>
          {saving ? 'Guardando…' : mode === 'crear' ? 'Crear persona' : 'Guardar cambios'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ persona, onClose, onConfirm }: { persona: Persona; onClose: () => void; onConfirm: () => Promise<void> }) {
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
        <div className="confirm-title">Eliminar persona</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{persona.nombre.trim()}</strong> (#{persona.id_persona})? Esta acción no se puede deshacer.
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
