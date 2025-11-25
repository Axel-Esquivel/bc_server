# 02 – Resumen de módulos (MODULES_OVERVIEW)

Este documento lista los módulos principales del backend y su responsabilidad.

## 1. Núcleo / Core

- **CoreModule**
  - Logging, interceptores, filtros, middlewares.
  - Guards genéricos para JWT, roles, permisos.
- **ModuleLoaderModule**
  - Carga dinámica de módulos estilo Odoo.
  - Ver `12_MODULE_LOADER.md`.

## 2. Seguridad y acceso

- **AuthModule**
  - Login, registro, refresh tokens, `/auth/me`.
- **UsersModule**
  - Usuarios del sistema, datos básicos, relación con workspaces.
- **RolesModule**
  - Roles por workspace, colección de permisos.
- **PermissionsModule**
  - Permisos granulares (`resource:action:scope`).
- **WorkspacesModule**
  - Gestión de workspaces y sus miembros.
- **DevicesModule**
  - Dispositivos de acceso (deviceId), bloqueo y auditoría.

Ver `03_AUTH_WORKSPACES_ROLES.md` para detalles.

## 3. Productos y catálogos

- **CatalogsModule**
  - Catálogos generales (categorías, familias, etc.).
- **ProductsModule**
  - Productos genéricos.
- **VariantsModule**
  - Variantes vendibles con SKU y códigos de barra.
- **UomModule**
  - Unidades de medida.
- **ProvidersModule**
  - Proveedores.
- **PriceListsModule**
  - Listas de precios y reglas base.

Ver `04_PRODUCTS_VARIANTS_PROVIDERS.md`.

## 4. Bodegas, inventario y conteos físicos

- **WarehousesModule**
  - Bodegas y ubicaciones (junto con `WAREHOUSE_LOCATIONS.md`).
- **InventoryModule**
  - Movimientos de inventario, ledger y proyección de stock.
- **InventoryCountsModule**
  - Sesiones de conteo físico multi-ronda.

Ver `05_INVENTORY_STOCK_COSTS.md`, `WAREHOUSE_LOCATIONS.md` e `INVENTORY_COUNTS.md`.

## 5. Compras, ventas y clientes

- **PurchasesModule**
  - Sugerencias de compra, órdenes, recepciones (GRN).
- **PosModule**
  - Carritos, ventas, pagos, promociones.
- **CustomersModule**
  - Clientes, crédito, estados de cuenta.

Ver:
- `06_SALES_POS.md`
- `07_PURCHASES_REPLENISHMENT.md`
- `09_CLIENTS_CREDIT.md`
- `10_PRICING_DISCOUNTS_PROMOS.md`

## 6. Contabilidad y reportes

- **AccountingModule**
  - Catálogo de cuentas, asientos contables, reglas de impuestos.
- **ReportsModule**
  - Endpoints para reportes y BI.
  - Integración con microservicio `xlsx-ops`.

Ver:
- `08_ACCOUNTING_TAXES.md`
- `11_REPORTS_BI.md`

## 7. DevOps

- Documentos de soporte para:
  - Docker / docker-compose.
  - GitHub Actions.
  - Estrategias de despliegue.

Ver `13_DEVOPS_DOCKER_CI_CD.md`.
