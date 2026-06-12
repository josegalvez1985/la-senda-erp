import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
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

type VentaRow = { id: string; fecha: string; cliente: string; total: number };

const COLUMNAS: Columna[] = [
  { header: 'Factura', key: 'id' },
  { header: 'Fecha', key: 'fecha' },
  { header: 'Cliente', key: 'cliente' },
  { header: 'Total (Gs)', key: 'totalFmt', align: 'right' },
];

export function VentasGeneral() {
  const { authFetch } = useAuth();
  const { show } = useToast();

  const hoy = new Date().toLocaleDateString('en-CA');
  const inicioMes = `${hoy.slice(0, 8)}01`;
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [rows, setRows] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      const j = async (path: string): Promise<any[]> => {
        try {
          const r = await authFetch(`${BASE}/${path}`);
          if (!r.ok) return [];
          const d = await r.json();
          return Array.isArray(d) ? d : [];
        } catch { return []; }
      };
      const [cabs, pers] = await Promise.all([j('ventas-cabecera/listar'), j('personas/listar')]);
      if (!activo) return;

      const nombre = new Map<number, string>();
      pers.forEach((p: any) => nombre.set(Number(p.id_persona), String(p.nombre ?? '').trim()));

      const totales = await Promise.all(cabs.map(async (c: any) => {
        const lineas = await j(`ventas-detalle/por-factura/${c.id_factura}`);
        return lineas.reduce((s, l: any) => s + num(l.cantidad) * num(l.precio) - num(l.descuento), 0);
      }));
      if (!activo) return;

      setRows(cabs.map((c: any, i: number) => ({
        id: String(c.id_factura ?? ''),
        fecha: toISO(c.fec_comprobante),
        cliente: nombre.get(Number(c.id_persona)) || `Cliente #${c.id_persona ?? '?'}`,
        total: totales[i],
      })));
      setLoading(false);
    })();
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtradas = useMemo(
    () => rows
      .filter((r) => r.fecha && r.fecha >= desde && r.fecha <= hasta)
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)),
    [rows, desde, hasta]
  );
  const totalGeneral = filtradas.reduce((s, r) => s + r.total, 0);

  const datosExport = () => ({
    nombre: `ventas_${desde}_a_${hasta}`,
    titulo: 'Informe de Ventas General',
    subtitulo: `Del ${desde} al ${hasta} · ${filtradas.length} ventas · Total ${formatGs(totalGeneral)}`,
    columnas: COLUMNAS,
    filas: filtradas.map((r) => ({ ...r, totalFmt: new Intl.NumberFormat('es-PY').format(r.total) })),
    pie: ['', '', 'TOTAL', new Intl.NumberFormat('es-PY').format(totalGeneral)],
  });

  const onPDF = async () => {
    if (!filtradas.length) return show('No hay ventas en el rango.', 'error');
    setExportando('pdf');
    try { await exportarPDF(datosExport()); } catch (e: any) { show(`Error PDF: ${e?.message ?? e}`, 'error'); }
    finally { setExportando(null); }
  };
  const onExcel = async () => {
    if (!filtradas.length) return show('No hay ventas en el rango.', 'error');
    setExportando('excel');
    try {
      const d = datosExport();
      await exportarExcel({ nombre: d.nombre, columnas: COLUMNAS, filas: d.filas });
    } catch (e: any) { show(`Error Excel: ${e?.message ?? e}`, 'error'); }
    finally { setExportando(null); }
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Ventas General" subtitle="Resultados" />

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

      <div style={{ display: 'flex', gap: 12, padding: '12px 16px 0' }}>
        <Card style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Ventas</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{filtradas.length}</div>
        </Card>
        <Card style={{ flex: 1.6 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Total</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: 'var(--primary)' }}>{formatGs(totalGeneral)}</div>
        </Card>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
      ) : filtradas.length === 0 ? (
        <EmptyState icon="receipt-outline" message="No hay ventas en el rango seleccionado." />
      ) : (
        <div className="list" style={{ marginTop: 8 }}>
          {filtradas.map((r) => (
            <Card key={r.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="list-row">
                <div className="icon-circle"><ion-icon name="receipt-outline" style={{ fontSize: 18, color: 'var(--primary)' }} /></div>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.cliente}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Factura {r.id} · {r.fecha}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{formatGs(r.total)}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
