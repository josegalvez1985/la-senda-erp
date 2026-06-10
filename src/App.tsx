import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { TabsLayout } from './layout/TabsLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Ventas } from './pages/Ventas';
import { Compras } from './pages/Compras';
import { Stock } from './pages/Stock';
import { Perfil } from './pages/Perfil';

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
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
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
                <Route path="/ventas" element={<Ventas />} />
                <Route path="/compras" element={<Compras />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/perfil" element={<Perfil />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
