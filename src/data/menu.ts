export type MenuItem = { label: string; to: string; icon: string };
// Un grupo agrupa submódulos (items); si trae `to`, es un acceso directo sin hijos.
export type MenuGroup = { label: string; icon: string; to?: string; items?: MenuItem[] };

// Menú jerárquico: 3 grupos (Inicio) con sus submódulos.
export const menu: MenuGroup[] = [
  {
    label: 'Configuración Inicial',
    icon: 'settings-outline',
    items: [
      { label: 'Artículos', to: '/m/articulos', icon: 'pricetag-outline' },
      { label: 'Categorías', to: '/m/categorias', icon: 'albums-outline' },
      { label: 'Marcas', to: '/m/marcas', icon: 'ribbon-outline' },
      { label: 'Autores', to: '/m/autores', icon: 'create-outline' },
      { label: 'Editoriales', to: '/m/editoriales', icon: 'library-outline' },
      { label: 'Colores', to: '/m/colores', icon: 'color-palette-outline' },
      { label: 'Códigos de Barras', to: '/m/codigos-barras', icon: 'barcode-outline' },
      { label: 'Monedas', to: '/m/monedas', icon: 'cash-outline' },
      { label: 'Vendedores', to: '/m/vendedores', icon: 'people-circle-outline' },
      { label: 'IVA', to: '/m/iva', icon: 'receipt-outline' },
      { label: 'Formas de Transacciones', to: '/m/formas-transacciones', icon: 'swap-horizontal-outline' },
      { label: 'Bancos', to: '/m/bancos', icon: 'business-outline' },
    ],
  },
  {
    label: 'Día a día',
    icon: 'today-outline',
    items: [
      { label: 'Inventarios', to: '/m/inventarios', icon: 'layers-outline' },
      { label: 'Precios de Ventas', to: '/m/precios-ventas', icon: 'pricetags-outline' },
      { label: 'Timbrados', to: '/m/timbrados', icon: 'document-text-outline' },
      { label: 'Personas', to: '/m/personas', icon: 'person-outline' },
      { label: 'Punto de Venta', to: '/m/punto-venta', icon: 'storefront-outline' },
    ],
  },
  {
    label: 'Resultados',
    icon: 'bar-chart-outline',
    items: [
      { label: 'Ventas General', to: '/m/ventas-general', icon: 'trending-up-outline' },
      { label: 'Artículos', to: '/m/articulos-reporte', icon: 'pricetag-outline' },
      { label: 'Ventas por Cliente / Artículo', to: '/m/ventas-detalladas', icon: 'podium-outline' },
      { label: 'Ventas por Artículo', to: '/m/ventas-por-articulo', icon: 'cube-outline' },
    ],
  },
  {
    label: 'Perfil',
    icon: 'person-outline',
    to: '/perfil',
  },
];
