import { useEffect } from 'react';

export type Field = {
  key: string;
  label: string;
  placeholder?: string;
  numeric?: boolean;
};

export function FormModal({
  open,
  title,
  fields,
  values,
  onChange,
  onClose,
  onSubmit,
  submitLabel = 'Guardar',
}: {
  open: boolean;
  title: string;
  fields: Field[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ flex: 1, fontSize: 20, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose}>
            <ion-icon name="close" style={{ fontSize: 24, color: 'var(--text-muted)' }} />
          </button>
        </div>

        {fields.map((f) => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              {f.label}
            </label>
            <input
              className="form-input"
              placeholder={f.placeholder}
              value={values[f.key] ?? ''}
              inputMode={f.numeric ? 'numeric' : 'text'}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          </div>
        ))}

        <button
          onClick={onSubmit}
          style={{
            width: '100%',
            background: 'var(--primary)',
            color: '#fff',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 16,
            fontWeight: 600,
            marginTop: 12,
          }}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
