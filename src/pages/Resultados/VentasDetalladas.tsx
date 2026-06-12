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

type Vista = 'cliente' | 'articulo';
type Agg = { clave: string; nombre: string; cantidad: number; veces: number; total: number };

const COL_CLIENTE: Columna[] = [
  { header: 'Cliente', key: 'nombre' },
  { header: 'Facturas', key: 'cantidad', align: 'right' },
  { header: 'Total (Gs)', key: 'totalFmt', align: 'right' },
];
const COL_ARTICULO: Columna[] = [
  { header: 'Artículo', key: 'nombre' },
  { header: 'Veces vendido', key: 'veces', align: 'right' },
  { header: 'Cant. vendida', key: 'cantidad', align: 'right' },
  { header: 'Total (Gs)', key: 'totalFmt', align: 'right' },
];

export function VentasDetalladas() {
  const { authFetch } = useAuth();
  const { show } = useToast();

  const hoy = new Date().toLocaleDateString('en-CA');
  const inicioMes = `${hoy.slice(0, 8)}01`;
  const [desde, setDesde] = useState(inicioMes);
  const [hasta, setHasta] = useState(hoy);
  const [vista, setVista] = useState<Vista>('cliente');
  const [q, setQ] = useState('');

  // detalle crudo enriquecido con fecha, factura y nombres, para reagregar al cambiar filtros
  type Item = { fecha: string; idFactura: number; nroFactura: string; idPersona: number; cliente: string; idArticulo: number; articulo: string; cantidad: number; precio: number; descuento: number; importe: number };
  const [items, setItems] = useState<Item[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
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
      const [cabs, pers, arts] = await Promise.all([
        j('ventas-cabecera/listar'), j('personas/listar'), j('articulos/listar'),
      ]);
      if (!cabs.length) { setError(true); setLoading(false); return; }

      const nomPersona = new Map<number, string>();
      pers.forEach((p: any) => nomPersona.set(Number(p.id_persona), String(p.nombre ?? '').trim()));
      const nomArticulo = new Map<number, string>();
      arts.forEach((a: any) => nomArticulo.set(Number(a.id_articulo), String(a.descripcion ?? '').trim()));

      const porFactura = await Promise.all(cabs.map((c: any) => j(`ventas-detalle/por-factura/${c.id_factura}`)));

      const out: Item[] = [];
      cabs.forEach((c: any, i: number) => {
        const fecha = toISO(c.fec_comprobante);
        const idPersona = Number(c.id_persona);
        const cliente = nomPersona.get(idPersona) || `Cliente #${c.id_persona ?? '?'}`;
        const idFactura = Number(c.id_factura);
        const serie = String(c.ser_timbrado ?? '').trim();
        const nro = num(c.nro_comprobante);
        const nroFactura = serie && nro ? `${serie}-${String(nro).padStart(7, '0')}` : `#${c.id_factura ?? '?'}`;
        porFactura[i].forEach((l: any) => {
          const cantidad = num(l.cantidad);
          const precio = num(l.precio);
          const descuento = num(l.descuento);
          const importe = cantidad * precio - descuento;
          const idArticulo = Number(l.id_articulo);
          out.push({
            fecha, idFactura, nroFactura, idPersona, cliente, idArticulo,
            articulo: nomArticulo.get(idArticulo) || `Artículo #${l.id_articulo ?? '?'}`,
            cantidad, precio, descuento, importe,
          });
        });
      });
      setItems(out);
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

  const enRango = useMemo(
    () => items.filter((it) => it.fecha && it.fecha >= desde && it.fecha <= hasta),
    [items, desde, hasta]
  );

  const agregados = useMemo<Agg[]>(() => {
    const m = new Map<string, Agg & { facturas: Set<number> }>();
    enRango.forEach((it) => {
      const clave = vista === 'cliente' ? String(it.idPersona) : String(it.idArticulo);
      const nombre = vista === 'cliente' ? it.cliente : it.articulo;
      const a = m.get(clave) ?? { clave, nombre, cantidad: 0, veces: 0, total: 0, facturas: new Set<number>() };
      a.facturas.add(it.idFactura);
      if (vista === 'articulo') a.cantidad += it.cantidad;
      a.total += it.importe;
      m.set(clave, a);
    });
    const arr = [...m.values()];
    arr.forEach((a) => { a.veces = a.facturas.size; if (vista === 'cliente') a.cantidad = a.facturas.size; });
    return arr.map(({ facturas, ...a }) => a).sort((x, y) => y.total - x.total);
  }, [enRango, vista]);

  // facturas (con su detalle de líneas) por cliente, para la vista expandible
  const facturasPorCliente = useMemo(() => {
    const m = new Map<string, { idFactura: number; nro: string; fecha: string; total: number; lineas: Item[] }[]>();
    enRango.forEach((it) => {
      const arr = m.get(String(it.idPersona)) ?? [];
      let f = arr.find((x) => x.idFactura === it.idFactura);
      if (!f) { f = { idFactura: it.idFactura, nro: it.nroFactura, fecha: it.fecha, total: 0, lineas: [] }; arr.push(f); }
      f.total += it.importe;
      f.lineas.push(it);
      m.set(String(it.idPersona), arr);
    });
    m.forEach((arr) => arr.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)));
    return m;
  }, [enRango]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? agregados.filter((a) => a.nombre.toLowerCase().includes(t)) : agregados;
  }, [agregados, q]);

  const totalGeneral = filtrados.reduce((s, a) => s + a.total, 0);

  const datosExport = () => {
    const cols = vista === 'cliente' ? COL_CLIENTE : COL_ARTICULO;
    return {
      nombre: `ventas_por_${vista}_${desde}_a_${hasta}`,
      titulo: vista === 'cliente' ? 'Ventas por Cliente' : 'Ventas por Artículo',
      subtitulo: `Del ${desde} al ${hasta} · ${filtrados.length} ${vista === 'cliente' ? 'clientes' : 'artículos'} · Total ${formatGs(totalGeneral)}`,
      columnas: cols,
      filas: filtrados.map((a) => ({ ...a, cantidad: fmt(a.cantidad), veces: String(a.veces), totalFmt: fmt(a.total) })),
      pie: vista === 'cliente' ? ['TOTAL', '', fmt(totalGeneral)] : ['TOTAL', '', '', fmt(totalGeneral)],
    };
  };

  const onPDF = async () => {
    if (!filtrados.length) return show('No hay datos en el rango.', 'error');
    setExportando('pdf');
    try { await exportarPDF(datosExport()); } catch (e: any) { show(`Error PDF: ${e?.message ?? e}`, 'error'); }
    finally { setExportando(null); }
  };
  const onExcel = async () => {
    if (!filtrados.length) return show('No hay datos en el rango.', 'error');
    setExportando('excel');
    try {
      const d = datosExport();
      await exportarExcel({ nombre: d.nombre, columnas: d.columnas, filas: d.filas });
    } catch (e: any) { show(`Error Excel: ${e?.message ?? e}`, 'error'); }
    finally { setExportando(null); }
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <Header title="Ventas Detalladas" subtitle="Resultados" />

      <Card style={{ margin: '0 16px', padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button className={`vg-btn${vista === 'cliente' ? ' vg-pdf' : ''}`} style={{ flex: 1 }} onClick={() => setVista('cliente')}>
            <ion-icon name="people-outline" /> Por Cliente
          </button>
          <button className={`vg-btn${vista === 'articulo' ? ' vg-pdf' : ''}`} style={{ flex: 1 }} onClick={() => setVista('articulo')}>
            <ion-icon name="pricetag-outline" /> Por Artículo
          </button>
        </div>

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

      <SearchBar value={q} onChange={setQ} placeholder={vista === 'cliente' ? 'Buscar cliente…' : 'Buscar artículo…'} />

      <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
        <Card style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{vista === 'cliente' ? 'Clientes' : 'Artículos'}</div>
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
          {filtrados.map((a, i) => {
            const abierto = vista === 'cliente' && expandido === a.clave;
            return (
              <Card key={a.clave} style={{ paddingTop: 12, paddingBottom: 12 }}>
                <div
                  className="list-row"
                  style={vista === 'cliente' ? { cursor: 'pointer' } : undefined}
                  onClick={vista === 'cliente' ? () => setExpandido(abierto ? null : a.clave) : undefined}
                >
                  <div className="icon-circle" style={{ fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</div>
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.nombre}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                      {vista === 'cliente'
                        ? `${a.cantidad} factura${a.cantidad !== 1 ? 's' : ''}`
                        : `${a.veces} venta${a.veces !== 1 ? 's' : ''} · ${fmt(a.cantidad)} unidad${a.cantidad !== 1 ? 'es' : ''}`}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{formatGs(a.total)}</div>
                  {vista === 'cliente' && (
                    <ion-icon name={abierto ? 'chevron-up-outline' : 'chevron-down-outline'} style={{ marginLeft: 8, color: 'var(--text-muted)' }} />
                  )}
                </div>

                {abierto && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {(facturasPorCliente.get(a.clave) ?? []).map((f) => (
                      <div key={f.idFactura} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                          <span>Factura {f.nro}</span>
                          <span style={{ color: 'var(--primary)' }}>{formatGs(f.total)}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{f.fecha}</div>
                        {f.lineas.map((l, k) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', padding: '2px 0' }}>
                            <span>{fmt(l.cantidad)} × {l.articulo}</span>
                            <span>{formatGs(l.importe)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
