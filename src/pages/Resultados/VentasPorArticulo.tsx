import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { SearchBar } from '../../components/SearchBar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatGs } from '../../data/mock';
import { exportarPDF, exportarExcel, Columna } from '../../lib/export';

const BASE = 'https://oracleapex.com/ords/lasenda';
const num = (s: any) => { const n = Number(String(s ?? '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
const toISO = (v: any): string => {
  const s = String(v ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
};
const fmt = (n: number) => new Intl.NumberFormat('es-PY').format(Math.round(n));

type Linea = { fecha: string; idArticulo: number; articulo: string; cantidad: number; importe: number };
type Agg = { clave: string; articulo: string; cantidad: number; total: number };

const COLUMNAS: Columna[] = [
  { header: 'Artículo', key: 'articulo' },
  { header: 'Cantidad', key: 'cantFmt', align: 'right' },
  { header: 'Total (Gs)', key: 'totalFmt', align: 'right' },
];

export function VentasPorArticulo() {
  const { authFetch } = useAuth();
  const { show } = useToast();

  const hoy = new Date().toLocaleDateString('en-CA');
  const inicioMes = `${hoy.slice(0, 8)}01`;
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [q, setQ] = useState('');

  const [lineas, setLineas] = useState<Linea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

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
      const [cabs, arts] = await Promise.all([j('ventas-cabecera/listar'), j('articulos/listar')]);
      if (!cabs.length) { setError(true); setLoading(false); return; }

      const nomArticulo = new Map<number, string>();
      arts.forEach((a: any) => nomArticulo.set(Number(a.id_articulo), String(a.descripcion ?? '').trim()));

      const porFactura = await Promise.all(cabs.map((c: any) => j(`ventas-detalle/por-factura/${c.id_factura}`)));

      const out: Linea[] = [];
      cabs.forEach((c: any, i: number) => {
        const fecha = toISO(c.fec_comprobante);
        porFactura[i].forEach((l: any) => {
          const cantidad = num(l.cantidad);
          const idArticulo = Number(l.id_articulo);
          out.push({
            fecha, idArticulo,
            articulo: nomArticulo.get(idArticulo) || `Artículo #${l.id_articulo ?? '?'}`,
            cantidad,
            importe: cantidad * num(l.precio) - num(l.descuento),
          });
        });
      });
      setLineas(out);
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

  const agregados = useMemo<Agg[]>(() => {
    const m = new Map<string, Agg>();
    lineas
      .filter((l) => l.fecha && l.fecha >= desde && l.fecha <= hasta)
      .forEach((l) => {
        const clave = String(l.idArticulo);
        const a = m.get(clave) ?? { clave, articulo: l.articulo, cantidad: 0, total: 0 };
        a.cantidad += l.cantidad;
        a.total += l.importe;
        m.set(clave, a);
      });
    return [...m.values()].sort((x, y) => y.total - x.total);
  }, [lineas, desde, hasta]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? agregados.filter((a) => a.articulo.toLowerCase().includes(t)) : agregados;
  }, [agregados, q]);

  const totalGeneral = filtrados.reduce((s, a) => s + a.total, 0);

  const datosExport = () => ({
    nombre: `ventas_por_articulo_${desde}_a_${hasta}`,
    titulo: 'Ventas por Artículo',
    subtitulo: `Del ${desde} al ${hasta} · ${filtrados.length} artículos · Total ${formatGs(totalGeneral)}`,
    columnas: COLUMNAS,
    filas: filtrados.map((a) => ({ articulo: a.articulo, cantFmt: fmt(a.cantidad), totalFmt: fmt(a.total) })),
    pie: ['TOTAL', '', fmt(totalGeneral)],
  });

  const onPDF = async () => {
    if (!filtrados.length) return show('No hay ventas en el rango.', 'error');
    setExportando('pdf');
    try { await exportarPDF(datosExport()); } catch (e: any) { show(`Error PDF: ${e?.message ?? e}`, 'error'); }
    finally { setExportando(null); }
  };
  const onExcel = async () => {
    if (!filtrados.length) return show('No hay ventas en el rango.', 'error');
    setExportando('excel');
    try {
      const d = datosExport();
      await exportarExcel({ nombre: d.nombre, columnas: COLUMNAS, filas: d.filas });
    } catch (e: any) { show(`Error Excel: ${e?.message ?? e}`, 'error'); }
    finally { setExportando(null); }
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Ventas por Artículo" subtitle="Resultados" />

      <Card style={{ margin: '0 16px', padding: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <label className="cpw-label" style={{ flex: 1 }}>Desde
            <input className="form-input" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="cpw-label" style={{ flex: 1 }}>Hasta
            <input className="form-input" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
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

      <SearchBar value={q} onChange={setQ} placeholder="Buscar artículo…" />

      <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
        <Card style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Artículos</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{filtrados.length}</div>
        </Card>
        <Card style={{ flex: 1.6 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Total</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: 'var(--primary)' }}>{formatGs(totalGeneral)}</div>
        </Card>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : error ? (
        <div className="art-state">
          <EmptyState icon="cloud-offline-outline" message="No se pudo cargar la información de ventas." />
          <button className="art-retry" onClick={cargar}><ion-icon name="refresh-outline" /> Reintentar</button>
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon="receipt-outline" message="No hay ventas en el rango seleccionado." />
      ) : (
        <div className="list" style={{ marginTop: 8 }}>
          {filtrados.map((a, i) => (
            <Card key={a.clave} style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="list-row">
                <div className="icon-circle" style={{ fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</div>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.articulo}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{fmt(a.cantidad)} unidad{a.cantidad !== 1 ? 'es' : ''}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{formatGs(a.total)}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
