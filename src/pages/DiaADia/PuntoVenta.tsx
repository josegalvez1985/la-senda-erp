import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const BASE = 'https://oracleapex.com/ords/lasenda';
const CREAR_VENTA_URL = `${BASE}/ventas/crear-completa`;

const safeParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
const fmt = (n: number) => new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(n || 0);
const num = (s: any) => { const n = Number(String(s ?? '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };

type Articulo = { id_articulo: number; descripcion: string; id_iva: number | null };
type Opcion = { id: number; label: string };
type Linea = { id_articulo: number; descripcion: string; cantidad: number; precio: number; id_iva: number; descuento: number };
type Pago = { id_forma: number; id_banco: number | null; total: number; observacion: string };

export function PuntoVenta() {
  const { authFetch, user } = useAuth();
  const { show } = useToast();

  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [precios, setPrecios] = useState<Map<number, number>>(new Map());
  const [personas, setPersonas] = useState<Opcion[]>([]);
  const [vendedores, setVendedores] = useState<Opcion[]>([]);
  const [monedas, setMonedas] = useState<Opcion[]>([]);
  const [timbrados, setTimbrados] = useState<any[]>([]);
  const [formas, setFormas] = useState<Opcion[]>([]);
  const [bancos, setBancos] = useState<Opcion[]>([]);
  const [ivaPct, setIvaPct] = useState<Map<number, number>>(new Map());
  const [cabeceras, setCabeceras] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [avisos, setAvisos] = useState<string[]>([]);

  const [q, setQ] = useState('');
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [cobrar, setCobrar] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setAvisos([]);
    const errs: string[] = [];
    const j = async (path: string, etiqueta: string): Promise<any[]> => {
      try {
        const r = await authFetch(`${BASE}/${path}`);
        if (!r.ok) { errs.push(`${etiqueta} (HTTP ${r.status})`); return []; }
        const d = await r.json();
        return Array.isArray(d) ? d : [];
      } catch {
        errs.push(etiqueta);
        return [];
      }
    };

    const [arts, precs, pers, vends, mons, timbs, frm, bnk, iva, cabs] = await Promise.all([
      j('articulos/listar', 'Artículos'),
      j('preciosventas/listar', 'Precios'),
      j('personas/listar', 'Clientes'),
      j('vendedores/listar', 'Vendedores'),
      j('monedas/listar', 'Monedas'),
      j('timbrados/listar', 'Timbrados'),
      j('formacobro/listar', 'Formas de pago'),
      j('bancos/listar', 'Bancos'),
      j('iva/listar', 'IVA'),
      j('ventascab/listar', 'Ventas previas'),
    ]);

    setArticulos(arts.map((a: any) => ({
      id_articulo: a.id_articulo,
      descripcion: String(a.descripcion ?? '').trim(),
      id_iva: a.id_iva ?? null,
    })));

    const pMap = new Map<number, { fecha: string; precio: number }>();
    precs.forEach((p: any) => {
      const prev = pMap.get(p.id_articulo);
      const fecha = String(p.fecha ?? '');
      if (!prev || fecha > prev.fecha) pMap.set(p.id_articulo, { fecha, precio: num(p.precio) });
    });
    setPrecios(new Map(Array.from(pMap, ([k, v]) => [k, v.precio])));

    setPersonas(pers.map((p: any) => ({ id: p.id_persona, label: String(p.nombre ?? '').trim() })));
    setVendedores(vends.map((v: any) => ({ id: v.id_vendedor, label: String(v.nombre ?? '').trim() })));
    setMonedas(mons.map((m: any) => ({ id: m.id_moneda, label: String(m.descripcion ?? '').trim() })));
    setTimbrados(timbs);
    setFormas(frm.map((f: any) => ({ id: f.id_forma, label: String(f.descripcion ?? '').trim() })));
    setBancos(bnk.map((b: any) => ({ id: b.id_banco, label: String(b.nombre ?? '').trim() })));
    setIvaPct(new Map(iva.map((i: any) => [i.id_iva, num(i.porcentaje ?? 0)])));
    setCabeceras(cabs);

    setAvisos(errs);
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grilla = useMemo(() => {
    const t = q.trim().toLowerCase();
    const conPrecio = articulos.filter((a) => precios.has(a.id_articulo));
    const list = t
      ? conPrecio.filter((a) => a.descripcion.toLowerCase().includes(t) || String(a.id_articulo).includes(t))
      : conPrecio;
    return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion));
  }, [q, articulos, precios]);

  const cantEnCarrito = (id: number) => carrito.find((l) => l.id_articulo === id)?.cantidad ?? 0;

  const addArticulo = (a: Articulo) => {
    setCarrito((c) => {
      const i = c.findIndex((l) => l.id_articulo === a.id_articulo);
      if (i >= 0) {
        const copy = [...c];
        copy[i] = { ...copy[i], cantidad: copy[i].cantidad + 1 };
        return copy;
      }
      return [...c, {
        id_articulo: a.id_articulo,
        descripcion: a.descripcion,
        cantidad: 1,
        precio: precios.get(a.id_articulo) ?? 0,
        id_iva: a.id_iva ?? 0,
        descuento: 0,
      }];
    });
  };

  const setLinea = (idx: number, patch: Partial<Linea>) =>
    setCarrito((c) => c.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const delLinea = (idx: number) => setCarrito((c) => c.filter((_, i) => i !== idx));

  const totales = useMemo(() => {
    let subtotal = 0, descuento = 0, iva = 0;
    carrito.forEach((l) => {
      const bruto = l.cantidad * l.precio;
      subtotal += bruto;
      descuento += l.descuento;
      const neto = bruto - l.descuento;
      const pct = ivaPct.get(l.id_iva) ?? 0;
      if (pct > 0) iva += neto - neto / (1 + pct / 100);
    });
    return { subtotal, descuento, iva, total: subtotal - descuento };
  }, [carrito, ivaPct]);

  const itemsCount = carrito.reduce((s, l) => s + l.cantidad, 0);
  const nuevaVenta = () => { setCarrito([]); setVerCarrito(false); setCobrar(false); };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>;
  }

  return (
    <div className="pos">
      <Header title="Punto de Venta" subtitle="Día a día" actionIcon="trash-outline" onAction={nuevaVenta} />

      {avisos.length > 0 && (
        <div className="pos-warn">
          <ion-icon name="warning-outline" />
          <span>No se pudo cargar: {avisos.join(', ')}.</span>
          <button onClick={cargar}>Reintentar</button>
        </div>
      )}

      <div className="pos-search">
        <ion-icon name="search-outline" />
        <input
          placeholder="Buscar artículo por nombre o código…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && <button onClick={() => setQ('')} aria-label="Limpiar"><ion-icon name="close" /></button>}
      </div>

      {grilla.length === 0 ? (
        <EmptyState icon="cube-outline" message={q ? 'Sin resultados.' : 'No hay artículos cargados.'} />
      ) : (
        <div className="pos-grid">
          {grilla.map((a) => {
            const cant = cantEnCarrito(a.id_articulo);
            return (
              <button key={a.id_articulo} className={`pos-tile${cant ? ' in' : ''}`} onClick={() => addArticulo(a)}>
                {cant > 0 && <span className="pos-tile-badge">{cant}</span>}
                <span className="pos-tile-name">{a.descripcion}</span>
                <span className="pos-tile-price">₲ {fmt(precios.get(a.id_articulo) ?? 0)}</span>
                <span className="pos-tile-add"><ion-icon name="add" /></span>
              </button>
            );
          })}
        </div>
      )}

      {itemsCount > 0 && !verCarrito && (
        <button className="pos-fab" onClick={() => setVerCarrito(true)}>
          <span className="pos-fab-badge">{itemsCount}</span>
          <ion-icon name="cart" />
          <span className="pos-fab-total">₲ {fmt(totales.total)}</span>
          <span className="pos-fab-go">Ver carrito <ion-icon name="chevron-up" /></span>
        </button>
      )}

      {verCarrito && (
        <CarritoSheet
          carrito={carrito}
          totales={totales}
          onClose={() => setVerCarrito(false)}
          onSetLinea={setLinea}
          onDelLinea={delLinea}
          onAdd={(idx) => setLinea(idx, { cantidad: carrito[idx].cantidad + 1 })}
          onSub={(idx) => setLinea(idx, { cantidad: Math.max(1, carrito[idx].cantidad - 1) })}
          onCobrar={() => { setVerCarrito(false); setCobrar(true); }}
        />
      )}

      {cobrar && (
        <CobroSheet
          total={totales.total}
          personas={personas}
          vendedores={vendedores}
          monedas={monedas}
          timbrados={timbrados}
          formas={formas}
          bancos={bancos}
          cabeceras={cabeceras}
          userName={user?.name ?? ''}
          onClose={() => setCobrar(false)}
          onConfirm={async (cab, pagos) => {
            const detalle = carrito.map((l) => ({
              id_articulo: l.id_articulo, cantidad: l.cantidad, precio: l.precio,
              id_iva: l.id_iva || null, descuento: l.descuento || null,
            }));
            const cobros = pagos.map((p) => ({
              id_forma: p.id_forma, id_banco: p.id_banco, total: p.total,
              observacion: p.observacion.trim() || null,
            }));
            const payload = {
              cabecera: JSON.stringify(cab),
              detalle: JSON.stringify(detalle),
              cobros: JSON.stringify(cobros),
            };
            try {
              const res = await authFetch(CREAR_VENTA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const text = await res.text();
              let data: any = null;
              try { data = text ? JSON.parse(text) : null; } catch { /* */ }
              const inner = typeof data?.resultado === 'string' ? safeParse(data.resultado) : data?.resultado ?? data;
              if (!res.ok || (inner && String(inner.ok) === 'false')) {
                throw new Error(inner?.msg || inner?.mensaje || data?.message || text || `HTTP ${res.status}`);
              }
              show(`Venta registrada (factura #${inner?.id_factura ?? ''})`, 'success');
              nuevaVenta();
              cargar();
            } catch (e: any) {
              console.error('[pos] error venta', { payload, error: e });
              const detail = e?.message === 'Failed to fetch' ? 'red/CORS — revisá Network.' : (e?.message ?? 'error');
              show(`No se pudo registrar la venta: ${detail}`, 'error');
              throw e;
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

function CarritoSheet({
  carrito, totales, onClose, onSetLinea, onDelLinea, onAdd, onSub, onCobrar,
}: {
  carrito: Linea[];
  totales: { subtotal: number; descuento: number; iva: number; total: number };
  onClose: () => void;
  onSetLinea: (idx: number, patch: Partial<Linea>) => void;
  onDelLinea: (idx: number) => void;
  onAdd: (idx: number) => void;
  onSub: (idx: number) => void;
  onCobrar: () => void;
}) {
  useEscClose(onClose);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet pos-cobro" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <span className="cpw-icon"><ion-icon name="cart" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Carrito</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{carrito.length} artículo(s)</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"><ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} /></button>
        </div>

        <div className="pos-cart">
          {carrito.map((l, idx) => {
            const importe = l.cantidad * l.precio - l.descuento;
            return (
              <div key={l.id_articulo} className="pos-line">
                <div className="pos-line-top">
                  <span className="pos-line-name">{l.descripcion}</span>
                  <button className="pos-line-del" onClick={() => onDelLinea(idx)} aria-label="Quitar">
                    <ion-icon name="trash-outline" />
                  </button>
                </div>
                <div className="pos-line-ctrl">
                  <div className="pos-qty">
                    <button onClick={() => onSub(idx)}><ion-icon name="remove" /></button>
                    <input value={l.cantidad} inputMode="numeric" onChange={(e) => onSetLinea(idx, { cantidad: Math.max(1, Math.round(num(e.target.value))) })} />
                    <button onClick={() => onAdd(idx)}><ion-icon name="add" /></button>
                  </div>
                  <label className="pos-line-field">
                    <span>Precio</span>
                    <input value={l.precio} inputMode="numeric" onChange={(e) => onSetLinea(idx, { precio: num(e.target.value) })} />
                  </label>
                  <label className="pos-line-field">
                    <span>Desc.</span>
                    <input value={l.descuento} inputMode="numeric" onChange={(e) => onSetLinea(idx, { descuento: num(e.target.value) })} />
                  </label>
                  <div className="pos-line-imp">₲ {fmt(importe)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pos-cobro-tot">
          <div className="pos-bar-row"><span>Subtotal</span><span>₲ {fmt(totales.subtotal)}</span></div>
          {totales.descuento > 0 && <div className="pos-bar-row"><span>Descuento</span><span>− ₲ {fmt(totales.descuento)}</span></div>}
          <div className="pos-bar-row muted"><span>IVA incluido</span><span>₲ {fmt(totales.iva)}</span></div>
          <div className="pos-bar-row total"><span>TOTAL</span><span>₲ {fmt(totales.total)}</span></div>
        </div>

        <button className="cpw-submit" onClick={onCobrar} disabled={carrito.length === 0}>
          Cobrar <ion-icon name="cash-outline" style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

function CobroSheet({
  total, personas, vendedores, monedas, timbrados, formas, bancos, cabeceras, userName, onClose, onConfirm,
}: {
  total: number;
  personas: Opcion[];
  vendedores: Opcion[];
  monedas: Opcion[];
  timbrados: any[];
  formas: Opcion[];
  bancos: Opcion[];
  cabeceras: any[];
  userName: string;
  onClose: () => void;
  onConfirm: (cab: Record<string, unknown>, pagos: Pago[]) => Promise<void>;
}) {
  useEscClose(onClose);
  const hoy = new Date().toISOString().slice(0, 10);

  const [tipComp, setTipComp] = useState('FCO');
  const [idPersona, setIdPersona] = useState(personas[0] ? String(personas[0].id) : '');
  const [idVendedor, setIdVendedor] = useState(() => {
    const m = vendedores.find((v) => v.label.toLowerCase() === userName.toLowerCase());
    return m ? String(m.id) : (vendedores[0] ? String(vendedores[0].id) : '');
  });
  const [idTimbrado, setIdTimbrado] = useState(timbrados[0] ? String(timbrados[0].id_timbrado) : '');
  const [pagos, setPagos] = useState<Pago[]>([{ id_forma: formas[0]?.id ?? 0, id_banco: null, total, observacion: '' }]);
  const [saving, setSaving] = useState(false);

  const timbrado = timbrados.find((t) => String(t.id_timbrado) === idTimbrado);
  const serie = timbrado?.serie ?? '';

  const nroComprobante = useMemo(() => {
    if (!timbrado) return null;
    const delSerie = cabeceras.filter((c) => c.ser_timbrado === timbrado.serie).map((c) => num(c.nro_comprobante));
    const max = delSerie.length ? Math.max(...delSerie) : 0;
    const base = num(timbrado.numero_desde) || 1;
    return Math.max(max + 1, base);
  }, [timbrado, cabeceras]);

  const pagado = pagos.reduce((s, p) => s + (p.total || 0), 0);
  const vuelto = pagado - total;
  const idMoneda = monedas[0]?.id ?? null;

  const setPago = (i: number, patch: Partial<Pago>) => setPagos((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const addPago = () => setPagos((ps) => [...ps, { id_forma: formas[0]?.id ?? 0, id_banco: null, total: Math.max(0, total - pagado), observacion: '' }]);
  const delPago = (i: number) => setPagos((ps) => ps.filter((_, j) => j !== i));

  const motivo =
    !idPersona ? 'Seleccioná un cliente' :
    !idVendedor ? 'Seleccioná un vendedor' :
    !idTimbrado || nroComprobante == null ? 'Seleccioná un timbrado' :
    idMoneda == null ? 'No hay monedas cargadas' :
    pagos.some((p) => !p.id_forma) ? 'Elegí la forma de pago' :
    pagado < total ? `Falta cobrar ₲ ${fmt(total - pagado)}` :
    null;

  const confirmar = async () => {
    if (motivo || saving) return;
    const cab = {
      tip_comprobante: tipComp,
      ser_timbrado: serie,
      nro_timbrado: num(timbrado?.nro_timbrado),
      nro_comprobante: nroComprobante,
      fec_comprobante: hoy,
      id_persona: Number(idPersona),
      id_moneda: idMoneda,
      tip_cambio: 1,
      id_timbrado: Number(idTimbrado),
      id_vendedor: Number(idVendedor),
    };
    setSaving(true);
    try { await onConfirm(cab, pagos); } catch { /* el padre avisa */ } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet pos-cobro" onClick={(e) => e.stopPropagation()}>
        <div className="artm-head">
          <span className="cpw-icon"><ion-icon name="cash-outline" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Cobrar venta</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total ₲ {fmt(total)}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"><ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} /></button>
        </div>

        <div className="pos-cobro-grid">
          <label className="cpw-label">Comprobante
            <select className="form-input" value={tipComp} onChange={(e) => setTipComp(e.target.value)}>
              <option value="FCO">Factura Contado</option>
              <option value="FCR">Factura Crédito</option>
            </select>
          </label>
          <label className="cpw-label">Timbrado
            <select className="form-input" value={idTimbrado} onChange={(e) => setIdTimbrado(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {timbrados.map((t) => (
                <option key={t.id_timbrado} value={String(t.id_timbrado)}>{t.serie} · {t.nro_timbrado ?? ''}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="cpw-label">Cliente
          <select className="form-input" value={idPersona} onChange={(e) => setIdPersona(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {personas.map((p) => <option key={p.id} value={String(p.id)}>{p.label}</option>)}
          </select>
        </label>

        <label className="cpw-label">Vendedor
          <select className="form-input" value={idVendedor} onChange={(e) => setIdVendedor(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {vendedores.map((v) => <option key={v.id} value={String(v.id)}>{v.label}</option>)}
          </select>
        </label>

        {serie && nroComprobante != null && (
          <div className="pos-cobro-nro">Nº {serie}-{String(nroComprobante).padStart(7, '0')}</div>
        )}

        <div className="pos-pagos">
          <div className="pos-pagos-head">
            <span>Formas de pago</span>
            <button onClick={addPago} type="button"><ion-icon name="add-circle-outline" /> Agregar</button>
          </div>
          {pagos.map((p, i) => {
            const forma = formas.find((f) => f.id === p.id_forma);
            const reqBanco = /transfer|tarjeta|cheque|banc|deb|cred|pos|qr/i.test(forma?.label ?? '');
            return (
              <div key={i} className="pos-pago">
                <select className="form-input" value={String(p.id_forma)} onChange={(e) => setPago(i, { id_forma: Number(e.target.value) })}>
                  <option value="0">— Forma —</option>
                  {formas.map((f) => <option key={f.id} value={String(f.id)}>{f.label}</option>)}
                </select>
                <input className="form-input" inputMode="numeric" value={p.total} onChange={(e) => setPago(i, { total: num(e.target.value) })} />
                {reqBanco && (
                  <select className="form-input" value={p.id_banco == null ? '' : String(p.id_banco)} onChange={(e) => setPago(i, { id_banco: e.target.value === '' ? null : Number(e.target.value) })}>
                    <option value="">— Banco —</option>
                    {bancos.map((b) => <option key={b.id} value={String(b.id)}>{b.label}</option>)}
                  </select>
                )}
                {pagos.length > 1 && (
                  <button className="pos-pago-del" onClick={() => delPago(i)} type="button"><ion-icon name="close" /></button>
                )}
              </div>
            );
          })}
        </div>

        <div className="pos-cobro-tot">
          <div className="pos-bar-row"><span>Pagado</span><span>₲ {fmt(pagado)}</span></div>
          <div className={`pos-bar-row ${vuelto < 0 ? 'falta' : 'total'}`}>
            <span>{vuelto < 0 ? 'Falta' : 'Vuelto'}</span>
            <span>₲ {fmt(Math.abs(vuelto))}</span>
          </div>
        </div>

        {motivo && <div className="pos-motivo">{motivo}</div>}

        <button className="cpw-submit" onClick={confirmar} disabled={!!motivo || saving}>
          {saving ? 'Registrando…' : 'Confirmar venta'}
          <ion-icon name={saving ? 'hourglass-outline' : 'checkmark'} style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}
