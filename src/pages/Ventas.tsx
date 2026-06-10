import { useState } from 'react';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { SearchBar } from '../components/SearchBar';
import { SummaryCard } from '../components/SummaryCard';
import { EmptyState } from '../components/EmptyState';
import { FormModal, Field } from '../components/FormModal';
import { formatGs, todayISO } from '../data/mock';
import { useData } from '../context/DataContext';

const fields: Field[] = [
  { key: 'customer', label: 'Cliente', placeholder: 'Nombre del cliente' },
  { key: 'total', label: 'Total (Gs)', placeholder: '0', numeric: true },
  { key: 'items', label: 'Cantidad de ítems', placeholder: '1', numeric: true },
];

export function Ventas() {
  const { sales, addSale } = useData();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const filtered = sales.filter((s) => (s.customer + s.id).toLowerCase().includes(q.toLowerCase()));
  const total = sales.reduce((a, b) => a + b.total, 0);

  const onSubmit = () => {
    if (!form.customer || !form.total) return alert('Completá cliente y total.');
    addSale({
      customer: form.customer,
      total: Number(form.total) || 0,
      items: Number(form.items) || 1,
      date: todayISO(),
      status: 'Pagado',
    });
    setForm({});
    setOpen(false);
  };

  return (
    <>
      <Header title="Ventas" subtitle="Gestión de transacciones" onAction={() => setOpen(true)} />

      <div style={{ display: 'flex', gap: 12, padding: '0 16px 12px' }}>
        <SummaryCard label="Total del mes" value={formatGs(total)} />
        <SummaryCard label="Transacciones" value={sales.length} />
      </div>

      <SearchBar value={q} onChange={setQ} placeholder="Buscar cliente o N° de venta" />

      {filtered.length === 0 ? (
        <EmptyState icon="receipt-outline" message="No hay ventas que coincidan" />
      ) : (
        <div className="list">
          {filtered.map((item) => (
            <Card key={item.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="list-row">
                <div className="icon-circle"><ion-icon name="receipt" style={{ fontSize: 18, color: 'var(--primary)' }} /></div>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.customer}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{item.id} · {item.date} · {item.items} ítems</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{formatGs(item.total)}</div>
                  <Badge label={item.status} tone={item.status === 'Pagado' ? 'success' : 'warning'} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setOpen(true)}>
        <ion-icon name="add" />
      </button>

      <FormModal
        open={open}
        title="Nueva venta"
        fields={fields}
        values={form}
        onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
        submitLabel="Registrar venta"
      />
    </>
  );
}
