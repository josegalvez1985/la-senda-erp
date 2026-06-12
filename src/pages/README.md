# Páginas

Organización por menú principal (ver `src/data/menu.ts`). Cada formulario nuevo va en la carpeta de su grupo y se enruta en `src/App.tsx`.

Estado: ✅ página propia (CRUD conectado) · ⏳ placeholder `Modulo.tsx`.

```
pages/
  ConfiguracionInicial/  ✅ Artículos, Categorías, Marcas, Autores, Editoriales,
                         Colores, Códigos de Barras, Monedas, Vendedores, IVA,
                         Formas de Transacciones, Bancos  (grupo completo)
  DiaADia/               ✅ Personas, Inventarios, Precios de Ventas, Timbrados,
                            Punto de Venta
  Resultados/            ✅ Ventas General (informe + export PDF/Excel)
  Dashboard.tsx          Inicio (KPIs + gráfico de ventas por día)
  Perfil.tsx             Perfil (ítem raíz)
  Login.tsx              Login (muestra versión: v{package.json} · fecha de build)
  Modulo.tsx             Placeholder "en construcción" para módulos sin página propia
```

Endpoints (base `https://oracleapex.com/ords/lasenda/`): cada módulo CRUD expone `…/listar`, `…/crear`, `…/actualizar/:id`, `…/eliminar/:id`. El path no siempre coincide con la ruta del menú: Formas de Transacciones → `formacobro`, Códigos de Barras → `codbarras`.

## Ventas (3 módulos separados)

El POS y los informes **no** usan un endpoint monolítico; la venta se arma en 3 pasos:

- `ventas-cabecera/` — `crear`, `listar`, `obtener/:id`, `estado/:id` (PUT), `eliminar/:id`. La cabecera **no** guarda `total`; se calcula del detalle.
- `ventas-detalle/` — `crear`, `por-factura/:id`, `obtener/:nro_linea/:id`, `actualizar/:nro_linea/:id`, `eliminar/:nro_linea/:id`. `nro_linea` lo genera un trigger (no se envía al crear).
- `ventas-cobros/` — `crear`, `por-factura/:id`, `obtener/:id`, `actualizar/:id`, `eliminar/:id`.

Flujo de cobro ([DiaADia/PuntoVenta.tsx](DiaADia/PuntoVenta.tsx)): `POST ventas-cabecera/crear` → `id_factura` → un `POST ventas-detalle/crear` por línea → un `POST ventas-cobros/crear` por pago.

Total por factura: `Σ (cantidad × precio − descuento)` del detalle. Dashboard y Ventas General lo calculan en cliente (N llamadas a `ventas-detalle/por-factura/:id`); cliente por nombre cruzando `id_persona` con `personas/listar`.

## Export e infra

- [lib/export.ts](../lib/export.ts) — `exportarPDF` (jsPDF + autotable) y `exportarExcel` (SheetJS). En web descarga directo; en Capacitor escribe a `Directory.Cache` y abre `Share`.
- En **dev**, `authFetch` reescribe `https://oracleapex.com` → ruta relativa y Vite proxia `/ords` (evita CORS en `localhost`). En el APK usa la URL absoluta.
- Fotos de artículo: `articulos/foto/:id` devuelve un blob (no viene en `listar`); cargar con `authFetch` + `URL.createObjectURL`.
