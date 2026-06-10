import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { to: '/dashboard', label: 'Inicio', icon: 'grid-outline' },
  { to: '/ventas', label: 'Ventas', icon: 'cart-outline' },
  { to: '/compras', label: 'Compras', icon: 'cube-outline' },
  { to: '/stock', label: 'Stock', icon: 'layers-outline' },
  { to: '/perfil', label: 'Perfil', icon: 'person-outline' },
];

export function TabsLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Sidebar — solo desktop */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="La Senda" />
          La Senda
        </div>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <ion-icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
        <button className="sidebar-logout" onClick={onLogout}>
          <ion-icon name="log-out-outline" />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <main className="content-main">
        <div className="scroll-area">
          <div className="page-wrap">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Tab bar — solo móvil */}
      <nav className="tab-bar">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
            <ion-icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
