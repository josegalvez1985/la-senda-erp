export type BadgeTone = 'success' | 'warning' | 'info';

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
