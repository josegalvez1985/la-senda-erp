export type Product = {
  id: string;
  title: string;
  author: string;
  sku: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  category: string;
};

export const products: Product[] = [
  { id: 'p1', title: 'Biblia Reina Valera 1960', author: 'Sociedades Bíblicas', sku: 'BIB-001', stock: 24, minStock: 10, price: 89900, cost: 55000, category: 'Biblias' },
  { id: 'p2', title: 'Devociones Diarias', author: 'Sara Aldana', sku: 'DEV-014', stock: 8, minStock: 12, price: 18500, cost: 11000, category: 'Devocionales' },
  { id: 'p3', title: 'Teología Sistemática', author: 'W. Grudem', sku: 'TEO-220', stock: 5, minStock: 4, price: 145000, cost: 92000, category: 'Teología' },
  { id: 'p4', title: 'El Arca de Noé', author: 'Lucía Pérez', sku: 'INF-077', stock: 32, minStock: 10, price: 32000, cost: 18000, category: 'Infantil' },
  { id: 'p5', title: 'Cantos de Adoración', author: 'Min. La Senda', sku: 'MUS-009', stock: 14, minStock: 6, price: 27500, cost: 15000, category: 'Música' },
  { id: 'p6', title: 'Caminos de Fe', author: 'R. Mendoza', sku: 'VID-130', stock: 2, minStock: 8, price: 24900, cost: 14000, category: 'Vida Cristiana' },
];

export type Sale = { id: string; date: string; customer: string; total: number; items: number; status: 'Pagado' | 'Pendiente' };
export const sales: Sale[] = [
  { id: 'V-1042', date: '2026-06-09', customer: 'María González', total: 124900, items: 3, status: 'Pagado' },
  { id: 'V-1041', date: '2026-06-09', customer: 'Iglesia Bethel', total: 549000, items: 12, status: 'Pagado' },
  { id: 'V-1040', date: '2026-06-08', customer: 'Pastor R. Núñez', total: 89900, items: 1, status: 'Pendiente' },
  { id: 'V-1039', date: '2026-06-08', customer: 'Mostrador', total: 46000, items: 2, status: 'Pagado' },
  { id: 'V-1038', date: '2026-06-07', customer: 'Colegio Cristiano JV', total: 320000, items: 10, status: 'Pagado' },
];

export type Purchase = { id: string; date: string; supplier: string; total: number; items: number; status: 'Recibido' | 'En tránsito' };
export const purchases: Purchase[] = [
  { id: 'C-307', date: '2026-06-08', supplier: 'Editorial Vida', total: 1850000, items: 60, status: 'Recibido' },
  { id: 'C-306', date: '2026-06-05', supplier: 'Distribuidora Peniel', total: 920000, items: 35, status: 'En tránsito' },
  { id: 'C-305', date: '2026-06-02', supplier: 'CLIE', total: 1240000, items: 48, status: 'Recibido' },
  { id: 'C-304', date: '2026-05-28', supplier: 'Editorial Vida', total: 540000, items: 22, status: 'Recibido' },
];

export const formatGs = (n: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(n);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const formatLongDate = (d = new Date()) => {
  const s = new Intl.DateTimeFormat('es-PY', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
