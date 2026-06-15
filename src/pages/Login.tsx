import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
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
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const { show } = useToast();
  const dark = theme === 'dark';
  const isWeb = !Capacitor.isNativePlatform();
  const [username, setUsername] = useState(() => localStorage.getItem('@lasenda/remember-user') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('@lasenda/remember-pass') || '');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem('@lasenda/remember-user'));
  const [loading, setLoading] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const [bioUser, setBioUser] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const isIos = isWeb && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    isWeb &&
    (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);

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

  // Android/Chrome: en cuanto el navegador ofrece instalar, lanzamos el diálogo
  // automáticamente (una sola vez), sin esperar a que el usuario toque el botón.
  useEffect(() => {
    const onPrompt = async (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (isStandalone || localStorage.getItem('@lasenda/pwa-prompted')) return;
      localStorage.setItem('@lasenda/pwa-prompted', '1');
      (e as any).prompt();
      await (e as any).userChoice;
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [isStandalone]);

  // iOS/Safari: no existe API de instalación; mostramos el modal guiado
  // automáticamente al entrar (una vez), ya que es el único camino posible.
  useEffect(() => {
    if (isIos && !isStandalone && !localStorage.getItem('@lasenda/pwa-prompted')) {
      localStorage.setItem('@lasenda/pwa-prompted', '1');
      setShowIosHelp(true);
    }
  }, [isIos, isStandalone]);

  const onInstall = async () => {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } else {
      show('Para instalar, abrí el menú del navegador y elegí “Instalar app” o “Agregar a pantalla de inicio”.', 'info');
    }
  };

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
      // la biometría desbloquea las credenciales; el token se obtiene con un login fresco
      const session = await unlockBiometric();
      const ok = await login(session.username, session.password);
      if (!ok) {
        show('Tu sesión guardada ya no es válida. Ingresá con tu contraseña.', 'error');
        return;
      }
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
        {isWeb && !isStandalone && (
          <button className="login-apk" onClick={onInstall} type="button">
            <ion-icon name={isIos ? 'logo-apple' : 'logo-android'} style={{ fontSize: 20 }} />
            <span>Instalar app{isIos ? ' (iPhone / iPad)' : ' (Android)'}</span>
          </button>
        )}
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

          <div className="login-footer">
            © {new Date().getFullYear()} Librería La Senda
            <span className="login-version">v{__APP_VERSION__} · {__BUILD_DATE__}</span>
          </div>
        </div>
      </div>

      {isIos && showIosHelp && !isStandalone && (
        <div className="pwa-modal" onClick={() => setShowIosHelp(false)}>
          <div className="pwa-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="pwa-modal-close" onClick={() => setShowIosHelp(false)} aria-label="Cerrar">
              <ion-icon name="close" />
            </button>
            <div className="pwa-modal-logo">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="La Senda" />
            </div>
            <h3>Instalá La Senda en tu iPhone</h3>
            <p className="pwa-modal-sub">Tené la app a un toque, como cualquier otra.</p>
            <ol className="pwa-steps">
              <li>
                <span className="pwa-step-n">1</span>
                <span>Tocá <strong>Compartir</strong> <ion-icon name="share-outline" /> en la barra de Safari.</span>
              </li>
              <li>
                <span className="pwa-step-n">2</span>
                <span>Elegí <strong>“Agregar a inicio”</strong> <ion-icon name="add-circle-outline" />.</span>
              </li>
              <li>
                <span className="pwa-step-n">3</span>
                <span>Confirmá con <strong>Agregar</strong>. ¡Listo!</span>
              </li>
            </ol>
            <button className="pwa-modal-ok" onClick={() => setShowIosHelp(false)}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
