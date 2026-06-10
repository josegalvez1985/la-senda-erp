export function Header({
  title,
  subtitle,
  onAction,
  actionIcon = 'add',
}: {
  title: string;
  subtitle?: string;
  onAction?: () => void;
  actionIcon?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 12px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{title}</div>
        {subtitle && <div style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 13 }}>{subtitle}</div>}
      </div>
      {onAction && (
        <button
          onClick={onAction}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ion-icon name={actionIcon} style={{ fontSize: 20 }} />
        </button>
      )}
    </div>
  );
}
