import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';

const URL = 'https://oracleapex.com/ords/lasenda/auth/clave';

type FieldKey = 'actual' | 'nueva' | 'confirm';

export function ChangePasswordModal({
  open,
  username,
  onClose,
}: {
  open: boolean;
  username: string;
  onClose: () => void;
}) {
  const { show } = useToast();
  const [vals, setVals] = useState({ actual: '', nueva: '', confirm: '' });
  const [reveal, setReveal] = useState<Record<FieldKey, boolean>>({ actual: false, nueva: false, confirm: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setVals({ actual: '', nueva: '', confirm: '' });
      setReveal({ actual: false, nueva: false, confirm: false });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k: FieldKey, v: string) => setVals((s) => ({ ...s, [k]: v }));
  const strong = vals.nueva.length >= 6;
  const valid = vals.actual.length > 0 && strong && vals.nueva === vals.confirm;

  const submit = async () => {
    if (loading || !valid) return;
    setLoading(true);
    try {
      const res = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, actual: vals.actual, nueva: vals.nueva }),
      });
      const data = await res.json().catch(() => ({}));
      const inner = typeof data.resultado === 'string' ? JSON.parse(data.resultado) : data.resultado ?? data;
      if (!res.ok || String(inner?.ok) !== 'true') {
        show(inner?.mensaje || 'No se pudo cambiar la contraseña. Verificá tu contraseña actual.', 'error');
        return;
      }
      show('Contraseña actualizada correctamente', 'success');
      onClose();
    } catch {
      show('Error de conexión. Intentá de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: FieldKey; label: string; placeholder: string }[] = [
    { key: 'actual', label: 'Contraseña actual', placeholder: 'Tu contraseña actual' },
    { key: 'nueva', label: 'Nueva contraseña', placeholder: 'Mínimo 6 caracteres' },
    { key: 'confirm', label: 'Confirmar nueva contraseña', placeholder: 'Repetí la nueva contraseña' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span className="cpw-icon"><ion-icon name="key-outline" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Cambiar contraseña</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{username}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        {fields.map((f) => (
          <div key={f.key} style={{ marginTop: 14 }}>
            <label className="cpw-label">{f.label}</label>
            <div className="cpw-field">
              <ion-icon name="lock-closed-outline" style={{ fontSize: 18, color: 'var(--text-muted)' }} />
              <input
                type={reveal[f.key] ? 'text' : 'password'}
                placeholder={f.placeholder}
                value={vals[f.key]}
                autoComplete={f.key === 'actual' ? 'current-password' : 'new-password'}
                onChange={(e) => set(f.key, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))}
                aria-label="Mostrar contraseña"
                style={{ display: 'flex' }}
              >
                <ion-icon
                  name={reveal[f.key] ? 'eye-off-outline' : 'eye-outline'}
                  style={{ fontSize: 18, color: 'var(--text-muted)' }}
                />
              </button>
            </div>
            {f.key === 'nueva' && vals.nueva.length > 0 && (
              <div className={`cpw-hint${strong ? ' ok' : ''}`}>
                <ion-icon name={strong ? 'checkmark-circle' : 'alert-circle'} />
                {strong ? 'Longitud suficiente' : 'Debe tener al menos 6 caracteres'}
              </div>
            )}
            {f.key === 'confirm' && vals.confirm.length > 0 && vals.nueva !== vals.confirm && (
              <div className="cpw-hint">
                <ion-icon name="alert-circle" /> No coincide con la nueva contraseña
              </div>
            )}
          </div>
        ))}

        <button className="cpw-submit" onClick={submit} disabled={!valid || loading}>
          {loading ? 'Guardando…' : 'Actualizar contraseña'}
          {!loading && <ion-icon name="arrow-forward" style={{ fontSize: 18 }} />}
        </button>
      </div>
    </div>
  );
}
