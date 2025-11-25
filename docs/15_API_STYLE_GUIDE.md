# 15 – Guía de estilo de API (API_STYLE_GUIDE)

Define cómo deben verse y comportarse las APIs del backend.

## 1. Formato de respuesta estándar

Todas las respuestas deben seguir la interfaz:

```ts
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  result: T;
  error: any;
}
```

- `status`:
  - `'success'` si la operación fue exitosa.
  - `'error'` si algo falló.
- `message`:
  - Mensaje humano resumido de lo que pasó.
- `result`:
  - Datos de la operación (puede ser `null`).
- `error`:
  - Detalles del error (para debugging, manejar cuidadosamente en producción).

Un interceptor global se encarga de envolver las respuestas.

## 2. Convenciones de rutas

- Prefijo global: `/api`.
- Nombres en plural y en minúscula con guiones:
  - `/api/products`
  - `/api/price-lists`
  - `/api/inventory-counts`
- Endpoints específicos:
  - Acciones verbales como subrutas:
    - `/api/customers/:id/credit`
    - `/api/purchases/orders/:id/confirm`
    - `/api/inventory-counts/:id/post`

## 3. HTTP status codes

- `200 OK` / `201 Created` para operaciones exitosas.
- `400 Bad Request` para errores de validación.
- `401 Unauthorized` cuando falta o es inválido el token.
- `403 Forbidden` cuando faltan permisos.
- `404 Not Found` cuando el recurso no existe.
- `500 Internal Server Error` para errores inesperados.

Aunque el `status` HTTP sea 4xx/5xx, se debe respetar la estructura `ApiResponse`.

## 4. DTOs y validación

- Cada endpoint que reciba datos deberá usar un DTO:
  - Decorado con `class-validator`.
- No aceptar objetos sin tipar (`any`) en controllers.
- Mantener DTOs separados de modelos de persistencia.

## 5. Paginación y filtros

- Paginación estándar:
  - `page` (número, base 1)
  - `limit`
- Respuesta de listas debe incluir metadatos:
  - `total`
  - `page`
  - `limit`
- Filtros:
  - Usar query params, por ejemplo:
    - `/api/products?search=...&categoryId=...`

## 6. Versionado (futuro)

- Se puede considerar prefijo `/api/v1` en el futuro.
- Por ahora, mantener `/api` a secas.
