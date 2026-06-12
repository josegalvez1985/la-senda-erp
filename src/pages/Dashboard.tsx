import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { formatGs, formatLongDate, todayISO } from '../data/mock';

const BASE = 'https://oracleapex.com/ords/lasenda';
const num = (s: any) => { const n = Number(String(s ?? '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };

// formatea una fecha ISO (YYYY-MM-DD) de forma segura; si es inválida devuelve el texto original
const fechaLarga = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? (iso || '—') : formatLongDate(d);
};

type DiaVenta = { fecha: string; total: number; cantidad: number };
type Venta = { id: string; fecha: string; total: number; cliente: string };

const actions = [
  { icon: 'stats-chart', label: 'Perfil', color: '#5C6A63', go: '/perfil' },
];

export function Dashboard() {
  const { user, authFetch } = useAuth();
  const { products } = useData();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const dark = theme === 'dark';

  const [porDia, setPorDia] = useState<DiaVenta[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    (async () => {
      const j = async (path: string): Promise<any[]> => {
        try {
          const r = await authFetch(`${BASE}/${path}`);
          if (!r.ok) return [];
          const d = await r.json();
          return Array.isArray(d) ? d : [];
        } catch { return []; }
      };
      const [dias, cabs] = await Promise.all([j('ventas/por-dia'), j('ventascab/listar')]);
      if (!activo) return;
      setPorDia(dias.map((d: any) => ({
        fecha: String(d.fecha ?? '').slice(0, 10),
        total: num(d.total),
        cantidad: num(d.cantidad),
      })));
      setVentas(cabs.map((c: any) => ({
        id: String(c.id_venta ?? ''),
        fecha: String(c.fecha ?? '').slice(0, 10),
        total: num(c.total),
        cliente: String(c.cliente ?? '').trim() || 'Sin cliente',
      })));
      setLoading(false);
    })();
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoy = useMemo(() => porDia.find((d) => d.fecha === todayISO()), [porDia]);
  const totalHoy = hoy?.total ?? 0;
  const transHoy = hoy?.cantidad ?? 0;
  const ultimasVentas = useMemo(
    () => [...ventas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (a.id < b.id ? 1 : -1))).slice(0, 4),
    [ventas]
  );
  const ultimosDias = useMemo(
    () => [...porDia].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 5),
    [porDia]
  );
  const bajoStock = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="La Senda" style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', display: 'block' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Hola, {user?.name.split(' ')[0]} 👋</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatLongDate()}</div>
        </div>
        <button style={s.themeBtn} onClick={toggle} aria-label="Cambiar tema">
          <span style={{ fontSize: 16 }}>{dark ? '☀️' : '🌙'}</span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{dark ? 'Claro' : 'Oscuro'}</span>
        </button>
      </div>

      <div style={s.hero}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>Ventas de hoy</div>
        <div style={{ color: '#fff', fontSize: 34, fontWeight: 700, marginTop: 6 }}>{formatGs(totalHoy)}</div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, gap: 10 }}>
          <span style={s.heroChip}>
            <ion-icon name="receipt-outline" style={{ fontSize: 14, color: 'var(--accent)' }} />
            <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>{transHoy}</span>
          </span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            {transHoy === 1 ? 'transacción hoy' : 'transacciones hoy'}
          </span>
        </div>
      </div>

      <div className="action-grid">
        {actions.map((a) => (
          <button key={a.label} style={s.action} onClick={() => navigate(a.go)}>
            <span style={{ ...s.actionIcon, background: a.color }}>
              <ion-icon name={a.icon} style={{ fontSize: 20, color: '#fff' }} />
            </span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '16px 16px 0' }}>
        <Card style={{ flex: 1 }}>
          <div style={s.kpiLabel}>Productos</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{products.length}</div>
          <div style={s.kpiHint}>en catálogo</div>
        </Card>
        <Card style={{ flex: 1 }}>
          <div style={{ ...s.kpiLabel, color: 'var(--danger)' }}>Bajo stock</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: 'var(--danger)' }}>{bajoStock}</div>
          <div style={s.kpiHint}>requieren reposición</div>
        </Card>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '24px 16px 8px' }}>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Ventas por día</div>
      </div>

      <div className="list">
        {loading ? (
          <Card style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando…</div>
          </Card>
        ) : ultimosDias.length === 0 ? (
          <Card style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin ventas registradas.</div>
          </Card>
        ) : ultimosDias.map((d) => (
          <Card key={d.fecha} style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div className="list-row">
              <div className="icon-circle"><ion-icon name="calendar-outline" style={{ fontSize: 18, color: 'var(--primary)' }} /></div>
              <div style={{ flex: 1, marginLeft: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fechaLarga(d.fecha)}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{d.cantidad} {d.cantidad === 1 ? 'venta' : 'ventas'}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatGs(d.total)}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '24px 16px 8px' }}>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Últimas ventas</div>
      </div>

      <div className="list">
        {loading ? (
          <Card style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Cargando…</div>
          </Card>
        ) : ultimasVentas.length === 0 ? (
          <Card style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin ventas registradas.</div>
          </Card>
        ) : ultimasVentas.map((v, i) => (
          <Card key={v.id || `v-${i}`} style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div className="list-row">
              <div className="icon-circle"><ion-icon name="receipt-outline" style={{ fontSize: 18, color: 'var(--primary)' }} /></div>
              <div style={{ flex: 1, marginLeft: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{v.cliente}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Venta {v.id} · {fechaLarga(v.fecha)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatGs(v.total)}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  themeBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    height: 44, padding: '0 16px', borderRadius: 22,
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)',
  },
  hero: { background: 'var(--primary)', margin: '8px 16px 0', borderRadius: 'var(--radius-xl)', padding: 24 },
  heroChip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(201,162,76,0.15)',
    padding: '4px 10px', borderRadius: 12,
  },
  action: {
    background: '#fff', borderRadius: 'var(--radius-lg)', padding: 12,
    display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)',
    textAlign: 'left',
  },
  actionIcon: { width: 38, height: 38, borderRadius: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kpiLabel: { color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  kpiHint: { color: 'var(--text-muted)', fontSize: 11, marginTop: 2 },
};
