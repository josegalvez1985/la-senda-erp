import { useState } from 'react';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { SummaryCard } from '../components/SummaryCard';
import { EmptyState } from '../components/EmptyState';
import { FormModal, Field } from '../components/FormModal';
import { formatGs, todayISO } from '../data/mock';
import { useData } from '../context/DataContext';

const fields: Field[] = [
  { key: 'supplier', label: 'Proveedor', placeholder: 'Nombre del proveedor' },
  { key: 'total', label: 'Total (Gs)', placeholder: '0', numeric: true },
  { key: 'items', label: 'Cantidad de ítems', placeholder: '1', numeric: true },
];

export function Compras() {
  const { purchases, addPurchase } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const total = purchases.reduce((a, b) => a + b.total, 0);

  const onSubmit = () => {
    if (!form.supplier || !form.total) return alert('Completá proveedor y total.');
    addPurchase({
      supplier: form.supplier,
      total: Number(form.total) || 0,
      items: Number(form.items) || 1,
      date: todayISO(),
      status: 'En tránsito',
    });
    setForm({});
    setOpen(false);
  };

  return (
    <>
      <Header title="Compras" subtitle="Órdenes a proveedores" onAction={() => setOpen(true)} />

      <div style={{ display: 'flex', gap: 12, padding: '0 16px 12px' }}>
        <SummaryCard label="Invertido" value={formatGs(total)} />
        <SummaryCard label="Órdenes" value={purchases.length} />
      </div>

      {purchases.length === 0 ? (
        <EmptyState icon="cube-outline" message="No hay órdenes de compra" />
      ) : (
        <div className="list">
          {purchases.map((item) => (
            <Card key={item.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
              <div className="list-row">
                <div className="icon-circle"><ion-icon name="cube" style={{ fontSize: 18, color: 'var(--primary-soft)' }} /></div>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.supplier}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{item.id} · {item.date} · {item.items} ítems</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{formatGs(item.total)}</div>
                  <Badge label={item.status} tone={item.status === 'Recibido' ? 'success' : 'info'} />
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
        title="Nueva compra"
        fields={fields}
        values={form}
        onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
        submitLabel="Registrar compra"
      />
    </>
  );
}
