import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { SearchBar } from '../../components/SearchBar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { exportarPDF, exportarExcel, Columna } from '../../lib/export';

const BASE = 'https://oracleapex.com/ords/lasenda';
const toISO = (v: any): string => {
  const s = String(v ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
};

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

type Fila = {
  id: string;
  descripcion: string;
  categoria: string;
  marca: string;
  autor: string;
  editorial: string;
  color: string;
  iva: string;
  estado: string;
  fecha: string;
};

const COLUMNAS: Columna[] = [
  { header: 'Código', key: 'id' },
  { header: 'Descripción', key: 'descripcion' },
  { header: 'Categoría', key: 'categoria' },
  { header: 'Marca', key: 'marca' },
  { header: 'Autor', key: 'autor' },
  { header: 'Editorial', key: 'editorial' },
  { header: 'Color', key: 'color' },
  { header: 'IVA', key: 'iva' },
  { header: 'Estado', key: 'estado' },
  { header: 'Fecha alta', key: 'fecha' },
];

const esActivo = (v: any) => /^(s|1|true|si|sí|a)/i.test(String(v ?? '').trim());

export function ArticulosReporte() {
  const { authFetch } = useAuth();
  const { show } = useToast();

  const [filas, setFilas] = useState<Fila[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

  const [q, setQ] = useState('');
  const [fCategoria, setFCategoria] = useState('');
  const [fEstado, setFEstado] = useState<'' | 'activo' | 'inactivo'>('');

  const cargar = async () => {
    setLoading(true);
    setError(false);
    const j = async (path: string): Promise<any[]> => {
      try {
        const r = await authFetch(`${BASE}/${path}`);
        if (!r.ok) return [];
        const d = await r.json();
        return Array.isArray(d) ? d : [];
      } catch { return []; }
    };
    try {
      const [arts, cats, marcas, autores, editoriales, colores, iva] = await Promise.all([
        j('articulos/listar'), j('categorias/listar'), j('marcas/listar'),
        j('autores/listar'), j('editoriales/listar'), j('colores/listar'), j('iva/listar'),
      ]);
      if (!arts.length) { setError(true); setLoading(false); return; }

      const map = (arr: any[], idKey: string, labelKey: string) => {
        const m = new Map<number, string>();
        arr.forEach((o) => m.set(Number(o[idKey]), String(o[labelKey] ?? '').trim()));
        return m;
      };
      const mCat = map(cats, 'id_categoria', 'descripcion');
      const mMarca = map(marcas, 'id_marca', 'descripcion');
      const mAutor = map(autores, 'id_autor', 'nombre');
      const mEdit = map(editoriales, 'id_editorial', 'nombre');
      const mColor = map(colores, 'id_color', 'descripcion');
      const mIva = map(iva, 'id_iva', 'descripcion');

      setCategorias([...mCat.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label)));

      setFilas((arts as Articulo[]).map((a) => ({
        id: String(a.id_articulo ?? ''),
        descripcion: String(a.descripcion ?? '').trim(),
        categoria: mCat.get(Number(a.id_categoria)) || '',
        marca: mMarca.get(Number(a.id_marca)) || '',
        autor: mAutor.get(Number(a.id_autor)) || '',
        editorial: mEdit.get(Number(a.id_editorial)) || '',
        color: mColor.get(Number(a.id_color)) || '',
        iva: mIva.get(Number(a.id_iva)) || '',
        estado: esActivo(a.activo) ? 'Activo' : 'Inactivo',
        fecha: toISO(a.fecha_alta),
      })));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas
      .filter((f) => !t || f.descripcion.toLowerCase().includes(t) || f.id.includes(t))
      .filter((f) => !fCategoria || f.categoria === fCategoria)
      .filter((f) => !fEstado || (fEstado === 'activo' ? f.estado === 'Activo' : f.estado === 'Inactivo'))
      .sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [filas, q, fCategoria, fEstado]);

  const activos = filtradas.filter((f) => f.estado === 'Activo').length;

  const datosExport = () => ({
    nombre: `articulos_${new Date().toLocaleDateString('en-CA')}`,
    titulo: 'Reporte de Artículos',
    subtitulo: `${filtradas.length} artículos · ${activos} activos${fCategoria ? ` · Categoría: ${fCategoria}` : ''}`,
    columnas: COLUMNAS,
    filas: filtradas,
  });

  const onPDF = async () => {
    if (!filtradas.length) return show('No hay artículos para exportar.', 'error');
    setExportando('pdf');
    try { await exportarPDF(datosExport()); } catch (e: any) { show(`Error PDF: ${e?.message ?? e}`, 'error'); }
    finally { setExportando(null); }
  };
  const onExcel = async () => {
    if (!filtradas.length) return show('No hay artículos para exportar.', 'error');
    setExportando('excel');
    try {
      const d = datosExport();
      await exportarExcel({ nombre: d.nombre, columnas: COLUMNAS, filas: d.filas });
    } catch (e: any) { show(`Error Excel: ${e?.message ?? e}`, 'error'); }
    finally { setExportando(null); }
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Artículos" subtitle="Resultados" />

      <Card style={{ margin: '0 16px', padding: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <label className="cpw-label" style={{ flex: 1 }}>Categoría
            <select className="form-input" value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>
          </label>
          <label className="cpw-label" style={{ flex: 1 }}>Estado
            <select className="form-input" value={fEstado} onChange={(e) => setFEstado(e.target.value as any)}>
              <option value="">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="vg-btn vg-pdf" onClick={onPDF} disabled={!!exportando}>
            <ion-icon name="document-text-outline" />
            {exportando === 'pdf' ? 'Generando…' : 'PDF'}
          </button>
          <button className="vg-btn vg-xls" onClick={onExcel} disabled={!!exportando}>
            <ion-icon name="grid-outline" />
            {exportando === 'excel' ? 'Generando…' : 'Excel'}
          </button>
        </div>
      </Card>

      <SearchBar value={q} onChange={setQ} placeholder="Buscar por nombre o código…" />

      <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
        <Card style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Artículos</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{filtradas.length}</div>
        </Card>
        <Card style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Activos</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: 'var(--primary)' }}>{activos}</div>
        </Card>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : error ? (
        <div className="art-state">
          <EmptyState icon="cloud-offline-outline" message="No se pudo cargar el listado." />
          <button className="art-retry" onClick={cargar}><ion-icon name="refresh-outline" /> Reintentar</button>
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon="cube-outline" message="No hay artículos para los filtros seleccionados." />
      ) : (
        <div className="list" style={{ marginTop: 8 }}>
          {filtradas.map((f) => (
            <Card key={f.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="list-row">
                <div className="icon-circle"><ion-icon name="pricetag-outline" style={{ fontSize: 18, color: 'var(--primary)' }} /></div>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.descripcion}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                    #{f.id}{f.categoria ? ` · ${f.categoria}` : ''}{f.marca ? ` · ${f.marca}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: f.estado === 'Activo' ? 'var(--primary)' : 'var(--text-muted)' }}>{f.estado}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
