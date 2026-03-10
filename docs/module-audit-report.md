# Backend Module Audit Report

Scope: `server/src/modules` (NestJS)

**Resumen**
1. `module.config.ts` actualizado para reflejar dependencias reales (sin contar imports de metadata).
2. `module-registry.data.ts` registra `outbox`, `product-categories` y `realtime` (soporte interno).
3. `modules.catalog.ts` limpio de llaves inexistentes (`Organizations`, `settings`, `realtime`).

| Modulo | Ubicacion | module.config.ts | Dependencias declaradas | Dependencias reales (imports) | Estado | Riesgos | Recomendacion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| accounting | `src/modules/accounting` | si | organizations | organizations | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| auth | `src/modules/auth` | si | companies, devices, organizations, users | companies, devices, organizations, users | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| branches | `src/modules/branches` | si | auth, companies | auth, companies | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| chat | `src/modules/chat` | si | auth, realtime | auth, realtime | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| companies | `src/modules/companies` | si | auth, countries, currencies, module-loader, organizations, users | auth, countries, currencies, module-loader, organizations, users | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| countries | `src/modules/countries` | si | auth, organizations | auth, organizations | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| currencies | `src/modules/currencies` | si | auth, organizations | auth, organizations | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| customers | `src/modules/customers` | si | - | - | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| dashboard | `src/modules/dashboard` | si | auth, companies, organizations | auth, companies, organizations | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| devices | `src/modules/devices` | si | auth | auth | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| health | `src/modules/health` | si | - | - | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| inventory | `src/modules/inventory` | si | outbox, realtime, warehouses | outbox, realtime, warehouses | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| inventory-adjustments | `src/modules/inventory-adjustments` | si | stock, stock-movements | stock, stock-movements | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| inventory-counts | `src/modules/inventory-counts` | si | companies, inventory | companies, inventory | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| inventory-events | `src/modules/inventory-events` | si | locations, outbox, stock-movements | locations, outbox, stock-movements | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| locations | `src/modules/locations` | si | - | - | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| module-loader | `src/modules/module-loader` | si | accounting, auth, branches, chat, companies, countries, currencies, customers, dashboard, devices, health, inventory, inventory-adjustments, inventory-counts, inventory-events, locations, organizations, outbox, permissions, pos, prepaid, price-lists, product-categories, products, providers, purchases, realtime, reports, roles, stock, stock-movements, stock-reservations, transfers, uom, users, warehouses | accounting, auth, branches, chat, companies, countries, currencies, customers, dashboard, devices, health, inventory, inventory-adjustments, inventory-counts, inventory-events, locations, organizations, outbox, permissions, pos, prepaid, price-lists, product-categories, products, providers, purchases, realtime, reports, roles, stock, stock-movements, stock-reservations, transfers, uom, users, warehouses | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| organizations | `src/modules/organizations` | si | accounting, auth, branches, companies, module-loader, price-lists, uom, users, warehouses | accounting, auth, branches, companies, module-loader, price-lists, uom, users, warehouses | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| outbox | `src/modules/outbox` | si | realtime | realtime | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| permissions | `src/modules/permissions` | si | auth, roles | auth, roles | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| pos | `src/modules/pos` | si | auth, companies, inventory, organizations, outbox, prepaid, realtime | auth, companies, inventory, organizations, outbox, prepaid, realtime | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| prepaid | `src/modules/prepaid` | si | auth, organizations, outbox | auth, organizations, outbox | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| price-lists | `src/modules/price-lists` | si | - | - | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| product-categories | `src/modules/product-categories` | si | auth | auth | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| products | `src/modules/products` | si | auth, organizations, price-lists | auth, organizations, price-lists | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| providers | `src/modules/providers` | si | - | - | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| purchases | `src/modules/purchases` | si | companies, inventory, products, providers, stock | companies, inventory, products, providers, stock | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| reports | `src/modules/reports` | si | - | - | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| roles | `src/modules/roles` | si | auth | auth | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| stock | `src/modules/stock` | si | - | - | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| stock-movements | `src/modules/stock-movements` | si | locations, organizations, outbox, stock | locations, organizations, outbox, stock | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| stock-reservations | `src/modules/stock-reservations` | si | outbox, stock | outbox, stock | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| transfers | `src/modules/transfers` | si | locations, outbox, stock-movements, stock-reservations | locations, outbox, stock-movements, stock-reservations | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| uom | `src/modules/uom` | si | - | - | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| users | `src/modules/users` | si | auth, branches, companies, organizations | auth, branches, companies, organizations | interno | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |
| warehouses | `src/modules/warehouses` | si | locations | locations | correcto | Sin hallazgos mayores en dependencia/registros. | Sin cambios recomendados en esta fase. |

**Soporte fuera de `src/modules`**
1. `realtime` vive en `server/src/realtime` pero se registra para dependencias internas; no es instalable.