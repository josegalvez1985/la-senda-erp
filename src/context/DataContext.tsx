import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  products as seedProducts,
  sales as seedSales,
  purchases as seedPurchases,
  Product,
  Sale,
  Purchase,
} from '../data/mock';

type DataCtx = {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  addProduct: (p: Omit<Product, 'id'>) => void;
  adjustStock: (id: string, delta: number) => void;
  addSale: (s: Omit<Sale, 'id'>) => void;
  addPurchase: (p: Omit<Purchase, 'id'>) => void;
};

const STORAGE_KEY = '@lasenda/data';
const Ctx = createContext<DataCtx | null>(null);

const genId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}`;

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [sales, setSales] = useState<Sale[]>(seedSales);
  const [purchases, setPurchases] = useState<Purchase[]>(seedPurchases);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d.products) setProducts(d.products);
      if (d.sales) setSales(d.sales);
      if (d.purchases) setPurchases(d.purchases);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, sales, purchases }));
    }
  }, [products, sales, purchases, hydrated]);

  const addProduct: DataCtx['addProduct'] = (p) =>
    setProducts((prev) => [{ ...p, id: genId('p') }, ...prev]);

  const adjustStock: DataCtx['adjustStock'] = (id, delta) =>
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p))
    );

  const addSale: DataCtx['addSale'] = (s) =>
    setSales((prev) => [{ ...s, id: genId('V') }, ...prev]);

  const addPurchase: DataCtx['addPurchase'] = (p) =>
    setPurchases((prev) => [{ ...p, id: genId('C') }, ...prev]);

  return (
    <Ctx.Provider value={{ products, sales, purchases, addProduct, adjustStock, addSale, addPurchase }}>
      {children}
    </Ctx.Provider>
  );
}

export const useData = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData fuera de DataProvider');
  return c;
};
