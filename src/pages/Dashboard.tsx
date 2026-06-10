import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { formatGs, formatLongDate, todayISO } from '../data/mock';

const actions = [
  { icon: 'cart', label: 'Nueva venta', color: 'var(--primary)', go: '/ventas' },
  { icon: 'cube', label: 'Nueva compra', color: 'var(--primary-soft)', go: '/compras' },
  { icon: 'barcode', label: 'Stock', color: 'var(--accent)', go: '/stock' },
  { icon: 'stats-chart', label: 'Perfil', color: '#5C6A63', go: '/perfil' },
];

export function Dashboard() {
  const { user } = useAuth();
  const { products, sales } = useData();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const dark = theme === 'dark';

  const today = sales.filter((s) => s.date === todayISO());
  const totalHoy = today.reduce((a, b) => a + b.total, 0);
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
            <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>{today.length}</span>
          </span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            {today.length === 1 ? 'transacción hoy' : 'transacciones hoy'}
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
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Últimas ventas</div>
        <button onClick={() => navigate('/ventas')} style={{ color: 'var(--primary-soft)', fontWeight: 600, fontSize: 13 }}>Ver todas</button>
      </div>

      <div className="list">
        {sales.slice(0, 4).map((sale) => (
          <Card key={sale.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
            <div className="list-row">
              <div className="icon-circle"><ion-icon name="receipt-outline" style={{ fontSize: 18, color: 'var(--primary)' }} /></div>
              <div style={{ flex: 1, marginLeft: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{sale.customer}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{sale.id} · {sale.items} ítems</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{formatGs(sale.total)}</div>
                <Badge label={sale.status} tone={sale.status === 'Pagado' ? 'success' : 'warning'} />
              </div>
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
