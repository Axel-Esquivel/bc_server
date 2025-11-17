# Sprint 2 — Prompts

UoM:
1) uom.module.ts
2) uom.model.ts { code, name, category, factorToBase:number>0 } índices por code/category
3) uom.service.ts CRUD
4) uom.controller.ts CRUD

Product/Variant:
5) product.model.ts { name, brandId?, categoryId?, attributes?, isActive }
6) product-variant.model.ts { productId, name, uomId, uomQty, barcodes[], sku?, trackByBatch?, expiryRequired? }
7) products.service.ts CRUD product
8) variants.service.ts CRUD variant + generateSKU()
9) products.controller.ts
10) variants.controller.ts

Providers:
11) provider.model.ts { name, nit?, products:variantId[] }
12) providers.service.ts / controller.ts

Pricing:
13) price-list.model.ts { name, currency, priority, active }
14) price-rule.model.ts { priceListId, variantId?, categoryId?, minQty?, price?, discountPct?, channel?, dateFrom?, dateTo? }
15) pricing.service.ts `getEffectivePrice(variantId, companyId, channel, qty, date)`
