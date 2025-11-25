# 11 – Reportes y BI

Define los reportes estándar y la integración con BI.

## 1. Reportes base

- Ventas:
  - por día
  - por tienda / warehouse
  - por SKU
- Rotación de inventario:
  - días de inventario
  - productos de baja rotación.
- Margen por categoría.
- Proyección de vencimientos:
  - Por lote y fecha de expiración.

## 2. Endpoints

- `/reports/sales`
- `/reports/inventory-rotation`
- `/reports/margins`
- `/reports/expiry-projection`
- `/reports/export` (para generar Excel vía xlsx-ops).

## 3. Integración con xlsx-ops

- Microservicio externo para:
  - Plantillas Excel.
  - Compactación de hojas.
  - Generación de reportes descargables.
- El backend envía datasets y recibe un buffer de archivo.

## 4. Futuro (BI avanzado)

- Generar vistas materializadas en MongoDB o en otra base.
- Exponer datos a herramientas externas de BI.
