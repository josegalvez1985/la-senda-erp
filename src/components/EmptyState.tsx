export function EmptyState({ icon = 'file-tray-outline', message }: { icon?: string; message: string }) {
  return (
    <div className="empty-state">
      <ion-icon name={icon} />
      <span style={{ fontSize: 14 }}>{message}</span>
    </div>
  );
}
