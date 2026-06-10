import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type ToastType = 'error' | 'success' | 'info';
type Toast = { id: number; msg: string; type: ToastType; leaving?: boolean };

const Ctx = createContext<{ show: (msg: string, type?: ToastType) => void } | null>(null);

const DURATION = 4000;

const meta: Record<ToastType, { icon: string; title: string }> = {
  error: { icon: 'close-circle', title: 'Error' },
  success: { icon: 'checkmark-circle', title: 'Listo' },
  info: { icon: 'information-circle', title: 'Aviso' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 280);
  }, []);

  const show = useCallback((msg: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => dismiss(id), DURATION);
  }, [dismiss]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}${t.leaving ? ' toast-leaving' : ''}`} role="alert">
            <span className="toast-icon">
              <ion-icon name={meta[t.type].icon} />
            </span>
            <div className="toast-body">
              <div className="toast-title">{meta[t.type].title}</div>
              <div className="toast-msg">{t.msg}</div>
            </div>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Cerrar">
              <ion-icon name="close" />
            </button>
            <span className="toast-bar" style={{ animationDuration: `${DURATION}ms` }} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast fuera de ToastProvider');
  return c;
};
