import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { TabsLayout } from './layout/TabsLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Perfil } from './pages/Perfil';
import { Modulo } from './pages/Modulo';
import { Articulos } from './pages/ConfiguracionInicial/Articulos';
import { Categorias } from './pages/ConfiguracionInicial/Categorias';
import { Marcas } from './pages/ConfiguracionInicial/Marcas';
import { Autores } from './pages/ConfiguracionInicial/Autores';
import { Editoriales } from './pages/ConfiguracionInicial/Editoriales';
import { Colores } from './pages/ConfiguracionInicial/Colores';
import { CodigosBarras } from './pages/ConfiguracionInicial/CodigosBarras';
import { Monedas } from './pages/ConfiguracionInicial/Monedas';
import { Vendedores } from './pages/ConfiguracionInicial/Vendedores';
import { IvaPage } from './pages/ConfiguracionInicial/Iva';
import { FormasTransacciones } from './pages/ConfiguracionInicial/FormasTransacciones';
import { Bancos } from './pages/ConfiguracionInicial/Bancos';
import { Personas } from './pages/DiaADia/Personas';
import { Timbrados } from './pages/DiaADia/Timbrados';
import { PreciosVentas } from './pages/DiaADia/PreciosVentas';
import { Inventarios } from './pages/DiaADia/Inventarios';
import { PuntoVenta } from './pages/DiaADia/PuntoVenta';
import { VentasGeneral } from './pages/Resultados/VentasGeneral';
import { menu } from './data/menu';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <AuthProvider>
      <DataProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <div className="app-shell">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <RequireAuth>
                    <TabsLayout />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/m/articulos" element={<Articulos />} />
                <Route path="/m/categorias" element={<Categorias />} />
                <Route path="/m/marcas" element={<Marcas />} />
                <Route path="/m/autores" element={<Autores />} />
                <Route path="/m/editoriales" element={<Editoriales />} />
                <Route path="/m/colores" element={<Colores />} />
                <Route path="/m/codigos-barras" element={<CodigosBarras />} />
                <Route path="/m/monedas" element={<Monedas />} />
                <Route path="/m/vendedores" element={<Vendedores />} />
                <Route path="/m/iva" element={<IvaPage />} />
                <Route path="/m/formas-transacciones" element={<FormasTransacciones />} />
                <Route path="/m/bancos" element={<Bancos />} />
                <Route path="/m/personas" element={<Personas />} />
                <Route path="/m/timbrados" element={<Timbrados />} />
                <Route path="/m/precios-ventas" element={<PreciosVentas />} />
                <Route path="/m/inventarios" element={<Inventarios />} />
                <Route path="/m/punto-venta" element={<PuntoVenta />} />
                <Route path="/m/ventas-general" element={<VentasGeneral />} />
                {menu.flatMap((g) => g.items ?? []).filter((it) => it.to.startsWith('/m/') && !['/m/articulos', '/m/categorias', '/m/marcas', '/m/autores', '/m/editoriales', '/m/colores', '/m/codigos-barras', '/m/monedas', '/m/vendedores', '/m/iva', '/m/formas-transacciones', '/m/bancos', '/m/personas', '/m/timbrados', '/m/precios-ventas', '/m/inventarios', '/m/punto-venta', '/m/ventas-general'].includes(it.to)).map((it) => (
                  <Route key={it.to} path={it.to} element={<Modulo />} />
                ))}
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
