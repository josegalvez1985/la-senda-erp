import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { menu } from '../data/menu';

const tabs = [
  { to: '/dashboard', label: 'Inicio', icon: 'grid-outline' },
];

function MenuTree({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  // Abre por defecto el grupo que contiene la ruta activa.
  const initial = menu.findIndex((g) => g.items?.some((i) => i.to === pathname));
  const [open, setOpen] = useState<number>(initial >= 0 ? initial : -1);

  return (
    <div className="menu-tree">
      {menu.map((g, i) => {
        // Grupo sin hijos = acceso directo.
        if (g.to) {
          return (
            <NavLink
              key={g.label}
              to={g.to}
              onClick={onNavigate}
              className={({ isActive }) => `menu-group-head menu-group-link${isActive ? ' active' : ''}`}
            >
              <ion-icon name={g.icon} class="menu-group-icon" />
              <span>{g.label}</span>
            </NavLink>
          );
        }
        const items = g.items ?? [];
        const expanded = open === i;
        return (
          <div key={g.label} className="menu-group">
            <button className={`menu-group-head${expanded ? ' open' : ''}`} onClick={() => setOpen(expanded ? -1 : i)}>
              <ion-icon name={g.icon} class="menu-group-icon" />
              <span>{g.label}</span>
              <ion-icon name="chevron-down" class="menu-chev" />
            </button>
            <div className="menu-items" style={{ maxHeight: expanded ? items.length * 46 : 0 }}>
              {items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  onClick={onNavigate}
                  className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
                >
                  <ion-icon name={it.icon} />
                  <span>{it.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TabsLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Sidebar — solo desktop */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="La Senda" />
          La Senda
        </div>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <ion-icon name={t.icon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
        <div className="sidebar-divider" />
        <MenuTree />
        <button className="sidebar-logout" onClick={onLogout}>
          <ion-icon name="log-out-outline" />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      {/* Botón menú — solo móvil */}
      <button className="menu-fab" onClick={() => setDrawer(true)} aria-label="Abrir menú">
        <ion-icon name="menu" />
      </button>

      {/* Drawer — solo móvil */}
      <div className={`drawer-backdrop${drawer ? ' open' : ''}`} onClick={() => setDrawer(false)} />
      <aside className={`drawer${drawer ? ' open' : ''}`}>
        <div className="drawer-head">
          <div className="sidebar-brand" style={{ padding: 0 }}>
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="La Senda" />
            La Senda
          </div>
          <button onClick={() => setDrawer(false)} aria-label="Cerrar menú">
            <ion-icon name="close" style={{ fontSize: 26, color: 'var(--text-muted)' }} />
          </button>
        </div>
        <div className="drawer-scroll">
          <MenuTree onNavigate={() => setDrawer(false)} />
        </div>
        <button className="sidebar-logout drawer-logout" onClick={onLogout}>
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
