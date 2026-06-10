import { Card } from './Card';

export function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  const tint = tone ? { color: tone } : undefined;
  return (
    <Card style={{ flex: 1 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, ...tint }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, ...tint }}>{value}</div>
    </Card>
  );
}
