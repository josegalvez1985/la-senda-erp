import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';

const items: { icon: string; label: string }[] = [
  { icon: 'person-outline', label: 'Mis datos' },
  { icon: 'business-outline', label: 'Datos de la librería' },
  { icon: 'people-outline', label: 'Usuarios y roles' },
  { icon: 'pricetags-outline', label: 'Categorías y precios' },
  { icon: 'cloud-upload-outline', label: 'Respaldos' },
  { icon: 'help-circle-outline', label: 'Ayuda y soporte' },
];

export function Perfil() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const dark = theme === 'dark';

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={s.avatar}>{user?.name[0]}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>{user?.name}</div>
        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
        <div style={s.role}>
          <ion-icon name="shield-checkmark" style={{ fontSize: 12, color: 'var(--accent)' }} />
          <span>Administrador</span>
        </div>
      </div>

      <div className="theme-switch">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="icon-circle" style={{ width: 36, height: 36 }}>
            <ion-icon name={dark ? 'moon' : 'sunny'} style={{ fontSize: 18, color: 'var(--primary)' }} />
          </div>
          <span style={{ fontWeight: 500 }}>{dark ? 'Modo oscuro' : 'Modo claro'}</span>
        </div>
        <button className={`switch${dark ? ' on' : ''}`} onClick={toggle} aria-label="Cambiar tema">
          <span className="knob" />
        </button>
      </div>

      <Card style={{ padding: 0 }}>
        {items.map((it, i) => (
          <div key={it.label} style={{ ...s.row, borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="icon-circle" style={{ width: 36, height: 36 }}>
              <ion-icon name={it.icon} style={{ fontSize: 18, color: 'var(--primary)' }} />
            </div>
            <span style={{ flex: 1, fontWeight: 500 }}>{it.label}</span>
            <ion-icon name="chevron-forward" style={{ fontSize: 18, color: 'var(--text-muted)' }} />
          </div>
        ))}
      </Card>

      <button style={s.logout} onClick={() => { logout(); navigate('/login', { replace: true }); }}>
        <ion-icon name="log-out-outline" style={{ fontSize: 18 }} />
        Cerrar sesión
      </button>

      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>v1.0.0 · La Senda Admin</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  avatar: {
    width: 84, height: 84, borderRadius: 42, background: 'var(--primary)', color: '#fff',
    fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
  },
  role: {
    display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--primary)',
    color: 'var(--accent)', padding: '4px 10px', borderRadius: 12, marginTop: 12,
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1,
  },
  row: { display: 'flex', alignItems: 'center', padding: 12, gap: 12, cursor: 'pointer' },
  logout: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'var(--surface)', color: 'var(--danger)', border: '1px solid var(--danger)',
    padding: 12, borderRadius: 'var(--radius-md)', fontWeight: 600,
  },
};
