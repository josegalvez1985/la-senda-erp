import { useMemo, useState } from 'react';
import { Card } from './Card';
import { formatGs } from '../data/mock';

type Venta = { fecha: string; total: number };
type Modo = 'barras' | 'lineal';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
// paleta para colorear cada barra por día (se cicla)
const PALETA = ['#6C8AE4', '#5BC0BE', '#F2A65A', '#E4736C', '#9B7EDE', '#54B689', '#EAB54E', '#5FA8D3', '#D96BA0', '#7FB069'];
// limita a 5 elementos cuando está colapsado; garantiza que el seleccionado sea visible
const limitar = <T,>(arr: T[], sel: T, expandido: boolean): T[] => {
  if (expandido || arr.length <= 5) return arr;
  const base = arr.slice(0, 5);
  return base.includes(sel) ? base : [...arr.slice(0, 4), sel];
};

const compactGs = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
};

export function VentasChart({ ventas }: { ventas: Venta[] }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth()); // 0-11
  const [modo, setModo] = useState<Modo>('barras');
  const [verAnios, setVerAnios] = useState(false);
  const [verMeses, setVerMeses] = useState(false);

  // años disponibles a partir de las ventas (incluye el actual)
  const anios = useMemo(() => {
    const set = new Set<number>([hoy.getFullYear()]);
    ventas.forEach((v) => { const y = Number(v.fecha.slice(0, 4)); if (y) set.add(y); });
    return Array.from(set).sort((a, b) => b - a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventas]);

  // total por día del mes/año seleccionado, un valor por cada día del mes
  const datos = useMemo(() => {
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const acc = new Array(diasMes).fill(0);
    ventas.forEach((v) => {
      const [y, m, d] = v.fecha.split('-').map(Number);
      if (y === anio && m === mes + 1 && d >= 1 && d <= diasMes) acc[d - 1] += v.total;
    });
    return acc.map((total, i) => ({ dia: i + 1, total }));
  }, [ventas, anio, mes]);

  const maxY = Math.max(1, ...datos.map((d) => d.total));
  const totalMes = datos.reduce((s, d) => s + d.total, 0);

  // geometría del SVG
  const W = 520, H = 200, padL = 8, padR = 8, padT = 12, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = datos.length;
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (val: number) => padT + innerH - (val / maxY) * innerH;
  const barW = Math.max(3, (innerW / n) * 0.55);

  // path de la línea suavizada + área
  const linePath = datos.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.total).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;


  return (
    <Card style={{ margin: '8px 16px 0', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Ventas por día</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
            {MESES[mes]} {anio} · {formatGs(totalMes)}
          </div>
        </div>
        <div className="seg">
          <button className={`seg-btn${modo === 'barras' ? ' on' : ''}`} onClick={() => setModo('barras')} aria-label="Barras">
            <ion-icon name="bar-chart-outline" />
          </button>
          <button className={`seg-btn${modo === 'lineal' ? ' on' : ''}`} onClick={() => setModo('lineal')} aria-label="Lineal">
            <ion-icon name="trending-up-outline" />
          </button>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="vc-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="vc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* líneas guía horizontales */}
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={padL} x2={W - padR} y1={padT + innerH - g * innerH} y2={padT + innerH - g * innerH}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
        ))}

        {modo === 'barras' ? (
          datos.map((d, i) => {
            const h = (d.total / maxY) * innerH;
            return (
              <rect key={i} x={x(i) - barW / 2} y={padT + innerH - h} width={barW} height={Math.max(0, h)}
                rx={Math.min(4, barW / 2)} fill={PALETA[i % PALETA.length]}>
                <title>{`${d.dia} ${MESES[mes]}: ${formatGs(d.total)}`}</title>
              </rect>
            );
          })
        ) : (
          <>
            <path d={areaPath} fill="url(#vc-area)" />
            <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            {datos.map((d, i) => d.total > 0 && (
              <circle key={i} cx={x(i)} cy={y(d.total)} r="2.2" fill="var(--primary)" stroke="var(--surface)" strokeWidth="1">
                <title>{`${d.dia} ${MESES[mes]}: ${formatGs(d.total)}`}</title>
              </circle>
            ))}
          </>
        )}

        {/* etiquetas eje X: todos los días */}
        {datos.map((d, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="7.5" fill="var(--text-muted)">{d.dia}</text>
        ))}
        {/* etiqueta del máximo */}
        <text x={padL} y={padT - 2} fontSize="9" fill="var(--text-muted)">{compactGs(maxY)}</text>
      </svg>

      {/* Filtros */}
      <div style={{ marginTop: 14 }}>
        <div className="vc-flabel">Año</div>
        <div className="vc-radios">
          {limitar(anios, anio, verAnios).map((y) => (
            <label key={y} className={`vc-radio${anio === y ? ' on' : ''}`}>
              <input type="radio" name="vc-anio" checked={anio === y} onChange={() => setAnio(y)} />
              {y}
            </label>
          ))}
          {anios.length > 5 && (
            <button type="button" className="vc-more" onClick={() => setVerAnios((v) => !v)}>
              {verAnios ? 'Ver menos' : `Ver más (${anios.length - 5})`}
            </button>
          )}
        </div>

        <div className="vc-flabel" style={{ marginTop: 10 }}>Mes</div>
        <div className="vc-radios">
          {limitar(MESES.map((_, i) => i), mes, verMeses).map((i) => (
            <label key={i} className={`vc-radio${mes === i ? ' on' : ''}`}>
              <input type="radio" name="vc-mes" checked={mes === i} onChange={() => setMes(i)} />
              {MESES[i]}
            </label>
          ))}
          {MESES.length > 5 && (
            <button type="button" className="vc-more" onClick={() => setVerMeses((v) => !v)}>
              {verMeses ? 'Ver menos' : `Ver más (${MESES.length - 5})`}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
