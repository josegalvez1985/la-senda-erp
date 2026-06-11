# Páginas

Organización por menú principal (ver `src/data/menu.ts`). Cada formulario nuevo va en la carpeta de su grupo y se enruta en `src/App.tsx`.

Estado: ✅ página propia (CRUD conectado) · ⏳ placeholder `Modulo.tsx`.

```
pages/
  ConfiguracionInicial/  ✅ Artículos, Categorías, Marcas, Autores, Editoriales,
                         Colores, Códigos de Barras, Monedas, Vendedores, IVA,
                         Formas de Transacciones, Bancos  (grupo completo)
  DiaADia/               ✅ Personas
                         ⏳ Inventarios, Precios de Ventas, Timbrados,
                            Punto de Venta, Facturas
  Resultados/            ⏳ Ventas General
  Dashboard.tsx          Inicio (ítem raíz)
  Perfil.tsx             Perfil (ítem raíz)
  Login.tsx              Login
  Modulo.tsx             Placeholder "en construcción" para módulos sin página propia
```

Endpoints (base `https://oracleapex.com/ords/lasenda/`): cada módulo expone `…/listar`, `…/crear`, `…/actualizar/:id`, `…/eliminar/:id`. El path no siempre coincide con la ruta del menú: Formas de Transacciones → `formacobro`, Códigos de Barras → `codbarras`.
