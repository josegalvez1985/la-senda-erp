import { useState } from 'react';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { SearchBar } from '../components/SearchBar';
import { EmptyState } from '../components/EmptyState';
import { FormModal, Field } from '../components/FormModal';
import { formatGs } from '../data/mock';
import { useData } from '../context/DataContext';

const fields: Field[] = [
  { key: 'title', label: 'Título', placeholder: 'Nombre del libro' },
  { key: 'author', label: 'Autor', placeholder: 'Autor' },
  { key: 'sku', label: 'SKU', placeholder: 'COD-000' },
  { key: 'category', label: 'Categoría', placeholder: 'Biblias, Devocionales…' },
  { key: 'price', label: 'Precio (Gs)', placeholder: '0', numeric: true },
  { key: 'cost', label: 'Costo (Gs)', placeholder: '0', numeric: true },
  { key: 'stock', label: 'Stock inicial', placeholder: '0', numeric: true },
  { key: 'minStock', label: 'Stock mínimo', placeholder: '0', numeric: true },
];

export function Stock() {
  const { products, addProduct, adjustStock } = useData();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const filtered = products.filter((p) => (p.title + p.author + p.sku).toLowerCase().includes(q.toLowerCase()));
  const bajo = products.filter((p) => p.stock <= p.minStock).length;

  const onSubmit = () => {
    if (!form.title || !form.sku) return alert('Completá título y SKU.');
    addProduct({
      title: form.title,
      author: form.author || '—',
      sku: form.sku,
      category: form.category || 'General',
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
    });
    setForm({});
    setOpen(false);
  };

  return (
    <>
      <Header title="Stock" subtitle="Inventario en tiempo real" onAction={() => setOpen(true)} />

      {bajo > 0 && (
        <div style={s.alert}>
          <ion-icon name="alert-circle" style={{ fontSize: 20, color: 'var(--danger)' }} />
          <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}>{bajo} productos con stock crítico</span>
        </div>
      )}

      <SearchBar value={q} onChange={setQ} placeholder="Buscar por título, autor o SKU" />

      {filtered.length === 0 ? (
        <EmptyState icon="book-outline" message="No hay productos que coincidan" />
      ) : (
        <div className="list">
          {filtered.map((item) => {
            const low = item.stock <= item.minStock;
            return (
              <Card key={item.id} style={{ paddingTop: 12, paddingBottom: 12 }}>
                <div style={{ display: 'flex' }}>
                  <div style={s.cover}><ion-icon name="book" style={{ fontSize: 22, color: 'var(--primary)' }} /></div>
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{item.author} · {item.sku}</div>
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, gap: 8 }}>
                      <span style={s.cat}>{item.category}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{formatGs(item.price)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: low ? 'var(--danger)' : 'var(--text)' }}>{item.stock}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {low ? 'crítico' : 'en stock'}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button style={s.adj} onClick={() => adjustStock(item.id, -1)}>
                        <ion-icon name="remove" style={{ fontSize: 14, color: 'var(--danger)' }} />
                      </button>
                      <button style={s.adj} onClick={() => adjustStock(item.id, 1)}>
                        <ion-icon name="add" style={{ fontSize: 14, color: 'var(--primary)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <FormModal
        open={open}
        title="Nuevo producto"
        fields={fields}
        values={form}
        onChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
        submitLabel="Agregar producto"
      />
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  alert: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'color-mix(in srgb, var(--danger) 14%, var(--surface))', margin: '0 16px 12px', padding: 12,
    borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--danger)',
  },
  cover: {
    width: 56, height: 72, borderRadius: 8, background: 'var(--surface-alt)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cat: {
    fontSize: 10, color: 'var(--primary-soft)', background: '#E5F0E9',
    padding: '2px 8px', borderRadius: 6, fontWeight: 600,
  },
  adj: {
    width: 28, height: 28, borderRadius: 14, background: 'var(--surface-alt)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
