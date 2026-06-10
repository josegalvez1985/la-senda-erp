import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { SearchBar } from '../../components/SearchBar';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/articulos/listar';

type Articulo = {
  id_articulo: number;
  descripcion: string;
  id_categoria: number | null;
  id_marca: number | null;
  id_autor: number | null;
  id_editorial: number | null;
  talle: string | null;
  id_color: number | null;
  id_iva: number | null;
  activo: string;
  fecha_alta: string;
};

export function Articulos() {
  const { token } = useAuth();
  const { show } = useToast();
  const [items, setItems] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Articulo | null>(null);
  const [form, setForm] = useState<{ mode: 'crear' | 'editar'; art: Articulo | null } | null>(null);
  const [del, setDel] = useState<Articulo | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(URL, { headers: { 'X-Token': token ?? '' } });
      if (!res.ok) throw new Error();
      const data: Articulo[] = await res.json();
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
      ? items.filter((a) => a.descripcion.toLowerCase().includes(t) || String(a.id_articulo).includes(t))
      : items;
    return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [items, q]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Artículos" subtitle="Configuración Inicial" onAction={() => setForm({ mode: 'crear', art: null })} />
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
        <EmptyState icon="cube-outline" message={q ? 'Sin resultados para tu búsqueda.' : 'No hay artículos cargados.'} />
      ) : (
        <>
          <div className="art-count">{filtered.length} artículo{filtered.length !== 1 ? 's' : ''}</div>
          <div className="art-list">
            {filtered.map((a) => (
              <button key={a.id_articulo} className="art-card" onClick={() => setSel(a)}>
                <div className="art-info">
                  <div className="art-name">{a.descripcion.trim()}</div>
                  <div className="art-meta">
                    <span className="art-chip">#{a.id_articulo}</span>
                    <span className="art-date">
                      <ion-icon name="calendar-outline" /> {a.fecha_alta}
                    </span>
                  </div>
                </div>
                <span className={`art-state-dot${a.activo === 'S' ? ' on' : ''}`} title={a.activo === 'S' ? 'Activo' : 'Inactivo'} />
                <ion-icon name="chevron-forward" class="art-arrow" />
              </button>
            ))}
          </div>
        </>
      )}

      {sel && (
        <ArticuloModal
          art={sel}
          onClose={() => setSel(null)}
          onEdit={() => {
            setForm({ mode: 'editar', art: sel });
            setSel(null);
          }}
          onDelete={() => {
            setDel(sel);
            setSel(null);
          }}
        />
      )}

      {form && (
        <ArticuloForm
          mode={form.mode}
          art={form.art}
          onClose={() => setForm(null)}
          onSave={() => {
            // TODO: conectar endpoint de crear/modificar
            show(form.mode === 'crear' ? 'Artículo creado (pendiente conectar API)' : 'Artículo modificado (pendiente conectar API)', 'success');
            setForm(null);
          }}
        />
      )}

      {del && (
        <ConfirmDelete
          art={del}
          onClose={() => setDel(null)}
          onConfirm={() => {
            // TODO: conectar endpoint de eliminar
            show('Artículo eliminado (pendiente conectar API)', 'success');
            setDel(null);
          }}
        />
      )}
    </div>
  );
}

const DETALLE: { key: keyof Articulo; label: string; icon: string }[] = [
  { key: 'id_articulo', label: 'Código', icon: 'barcode-outline' },
  { key: 'id_categoria', label: 'Categoría', icon: 'albums-outline' },
  { key: 'id_marca', label: 'Marca', icon: 'ribbon-outline' },
  { key: 'id_autor', label: 'Autor', icon: 'create-outline' },
  { key: 'id_editorial', label: 'Editorial', icon: 'library-outline' },
  { key: 'talle', label: 'Talle', icon: 'resize-outline' },
  { key: 'id_color', label: 'Color', icon: 'color-palette-outline' },
  { key: 'id_iva', label: 'IVA', icon: 'receipt-outline' },
  { key: 'fecha_alta', label: 'Fecha de alta', icon: 'calendar-outline' },
];

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function ArticuloModal({
  art,
  onClose,
  onEdit,
  onDelete,
}: {
  art: Articulo;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  useEscClose(onClose);
  const activo = art.activo === 'S';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="artm-title">{art.descripcion.trim()}</div>
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
          {DETALLE.map((d) => (
            <div key={d.key} className="artm-row">
              <span className="artm-ico"><ion-icon name={d.icon} /></span>
              <span className="artm-label">{d.label}</span>
              <span className={`artm-val${art[d.key] == null ? ' empty' : ''}`}>
                {art[d.key] == null ? '—' : String(art[d.key])}
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

const FORM_FIELDS: { key: keyof Articulo; label: string; numeric?: boolean }[] = [
  { key: 'descripcion', label: 'Descripción' },
  { key: 'id_categoria', label: 'Categoría', numeric: true },
  { key: 'id_marca', label: 'Marca', numeric: true },
  { key: 'id_autor', label: 'Autor', numeric: true },
  { key: 'id_editorial', label: 'Editorial', numeric: true },
  { key: 'talle', label: 'Talle' },
  { key: 'id_color', label: 'Color', numeric: true },
  { key: 'id_iva', label: 'IVA', numeric: true },
];

function ArticuloForm({
  mode,
  art,
  onClose,
  onSave,
}: {
  mode: 'crear' | 'editar';
  art: Articulo | null;
  onClose: () => void;
  onSave: () => void;
}) {
  useEscClose(onClose);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    FORM_FIELDS.forEach((f) => {
      const v = art?.[f.key];
      base[f.key] = v == null ? '' : String(v);
    });
    return base;
  });
  const [activo, setActivo] = useState(art ? art.activo === 'S' : true);

  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));
  const valid = vals.descripcion.trim().length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <span className="cpw-icon">
            <ion-icon name={mode === 'crear' ? 'add-circle-outline' : 'create-outline'} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{mode === 'crear' ? 'Nuevo artículo' : 'Modificar artículo'}</div>
            {art && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{art.id_articulo}</div>}
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        {FORM_FIELDS.map((f) => (
          <div key={f.key} style={{ marginTop: 12 }}>
            <label className="cpw-label">{f.label}</label>
            <input
              className="form-input"
              value={vals[f.key]}
              inputMode={f.numeric ? 'numeric' : 'text'}
              placeholder={f.numeric ? 'ID' : ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        ))}

        <div className="artf-switch">
          <span style={{ fontWeight: 500 }}>Activo</span>
          <button className={`switch${activo ? ' on' : ''}`} onClick={() => setActivo((v) => !v)} aria-label="Activo">
            <span className="knob" />
          </button>
        </div>

        <button className="cpw-submit" onClick={onSave} disabled={!valid}>
          {mode === 'crear' ? 'Crear artículo' : 'Guardar cambios'}
          <ion-icon name="checkmark" style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function ConfirmDelete({ art, onClose, onConfirm }: { art: Articulo; onClose: () => void; onConfirm: () => void }) {
  useEscClose(onClose);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet confirm-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="confirm-icon">
          <ion-icon name="trash-outline" />
        </span>
        <div className="confirm-title">Eliminar artículo</div>
        <div className="confirm-text">
          ¿Seguro que querés eliminar <strong>{art.descripcion.trim()}</strong> (#{art.id_articulo})? Esta acción no se puede deshacer.
        </div>
        <div className="confirm-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>
            <ion-icon name="trash-outline" /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
