import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const [email, setEmail] = useState(() => localStorage.getItem('@lasenda/remember-email') || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem('@lasenda/remember-email'));
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) {
      if (remember) localStorage.setItem('@lasenda/remember-email', email);
      else localStorage.removeItem('@lasenda/remember-email');
      navigate('/dashboard', { replace: true });
    } else {
      alert('Credenciales inválidas. Revisá email y contraseña (mín. 4 caracteres).');
    }
  };

  return (
    <div className="login">
      <button className="login-theme" onClick={toggle} aria-label="Cambiar tema">
        <ion-icon name={dark ? 'sunny-outline' : 'moon-outline'} style={{ fontSize: 18 }} />
        <span>{dark ? 'Claro' : 'Oscuro'}</span>
      </button>

      {/* Panel de marca — hero en móvil, columna izquierda en desktop */}
      <div className="login-brand">
        <div className="login-logo">
          <img src="/logo.png" alt="La Senda" />
        </div>
        <div className="login-title">La Senda</div>
        <div className="login-tagline">Sistema Administrativo · Librería Cristiana</div>
        <ul className="login-features">
          <li><ion-icon name="checkmark-circle" /> Control de ventas y compras</li>
          <li><ion-icon name="checkmark-circle" /> Inventario en tiempo real</li>
          <li><ion-icon name="checkmark-circle" /> Reportes y respaldos</li>
        </ul>
      </div>

      {/* Panel del formulario */}
      <div className="login-sheet">
        <div className="login-form">
          <div className="login-h1">Bienvenido</div>
          <div className="login-muted">Ingresá con tu cuenta para continuar.</div>

          <div className="login-field">
            <ion-icon name="mail-outline" style={{ fontSize: 18, color: 'var(--text-muted)' }} />
            <input
              placeholder="correo@lasenda.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="login-field">
            <ion-icon name="lock-closed-outline" style={{ fontSize: 18, color: 'var(--text-muted)' }} />
            <input
              placeholder="Contraseña"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
            <button onClick={() => setShowPass((v) => !v)} className="login-eye">
              <ion-icon name={showPass ? 'eye-off-outline' : 'eye-outline'} style={{ fontSize: 18, color: 'var(--text-muted)' }} />
            </button>
          </div>

          <div className="login-row">
            <button className="login-remember" onClick={() => setRemember((v) => !v)} type="button">
              <span className={`check${remember ? ' on' : ''}`}>
                {remember && <ion-icon name="checkmark" style={{ fontSize: 14, color: '#fff' }} />}
              </span>
              Recordar mi correo
            </button>
            <button className="login-forgot" type="button">¿Olvidaste tu contraseña?</button>
          </div>

          <button className="login-btn" onClick={onSubmit} disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
            <ion-icon name="arrow-forward" style={{ fontSize: 18 }} />
          </button>

          <div className="login-footer">© {new Date().getFullYear()} Librería La Senda</div>
        </div>
      </div>
    </div>
  );
}
