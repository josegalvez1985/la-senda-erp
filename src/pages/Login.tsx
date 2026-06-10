import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getRememberedUsername,
  unlockBiometric,
} from '../lib/biometric';

export function Login() {
  const navigate = useNavigate();
  const { login, applySession } = useAuth();
  const { theme, toggle } = useTheme();
  const { show } = useToast();
  const dark = theme === 'dark';
  const [username, setUsername] = useState(() => localStorage.getItem('@lasenda/remember-user') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('@lasenda/remember-pass') || '');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem('@lasenda/remember-user'));
  const [loading, setLoading] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [bioUser, setBioUser] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [available, enabled, name] = await Promise.all([
        isBiometricAvailable(),
        isBiometricEnabled(),
        getRememberedUsername(),
      ]);
      setBioReady(available && enabled);
      setBioUser(name);
    })();
  }, []);

  const onSubmit = async () => {
    if (loading) return;
    setLoading(true);
    const ok = await login(username.trim(), password);
    setLoading(false);
    if (ok) {
      if (remember) {
        localStorage.setItem('@lasenda/remember-user', username.trim());
        localStorage.setItem('@lasenda/remember-pass', password);
      } else {
        localStorage.removeItem('@lasenda/remember-user');
        localStorage.removeItem('@lasenda/remember-pass');
      }
      navigate('/dashboard', { replace: true });
    } else {
      show('Credenciales inválidas. Revisá usuario y contraseña.', 'error');
    }
  };

  const onBiometric = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const session = await unlockBiometric();
      applySession(session);
      navigate('/dashboard', { replace: true });
    } catch {
      show('No se pudo verificar tu biometría. Intentá de nuevo o usá tu contraseña.', 'error');
    } finally {
      setLoading(false);
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
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="La Senda" />
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
            <ion-icon name="person-outline" style={{ fontSize: 18, color: 'var(--text-muted)' }} />
            <input
              placeholder="Usuario"
              type="text"
              autoCapitalize="none"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
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
              Recordar usuario y contraseña
            </button>
            <button className="login-forgot" type="button">¿Olvidaste tu contraseña?</button>
          </div>

          <button className="login-btn" onClick={onSubmit} disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
            <ion-icon name="arrow-forward" style={{ fontSize: 18 }} />
          </button>

          {bioReady && (
            <>
              <div className="login-sep"><span>o</span></div>
              <button className="login-bio" onClick={onBiometric} disabled={loading} type="button">
                <span className="login-bio-ring">
                  <ion-icon name="finger-print" />
                </span>
                <span className="login-bio-txt">
                  <strong>Ingresar con biometría</strong>
                  {bioUser && <small>{bioUser}</small>}
                </span>
              </button>
            </>
          )}

          <div className="login-footer">© {new Date().getFullYear()} Librería La Senda</div>
        </div>
      </div>
    </div>
  );
}
