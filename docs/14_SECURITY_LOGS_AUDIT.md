# 14 – Seguridad, Logs y Auditoría

Define cómo se manejan seguridad, logs y auditoría en el backend.

## 1. Seguridad

- Autenticación con JWT (ver `03_AUTH_WORKSPACES_ROLES.md`).
- Autorización con roles y permisos.
- Rate limiting en endpoints sensibles (login, etc.).
- Sanitización de entrada:
  - Usar `ValidationPipe` global.
  - No confiar en datos del cliente.

## 2. Auditoría

- Cada request relevante debe registrar:
  - `method`
  - `url`
  - `statusCode`
  - `userId` (o `anonymous`)
  - `workspaceId` (o `n/a`)
  - `deviceId` (si existe)
  - `ip`
  - `requestId`
  - `durationMs`

- Middleware / interceptor de auditoría:
  - Adjunta `auditContext` al request.
  - Captura datos al finalizar la respuesta.

## 3. Logs

- Nivel de logs:
  - `LOG` para eventos normales.
  - `WARN` para situaciones extrañas pero no fatales.
  - `ERROR` para excepciones no esperadas.
- No loggear:
  - Contraseñas.
  - Tokens completos.
  - Datos sensibles de tarjetas, etc.

## 4. Manejo de errores

- Filtro global:
  - Convierte cualquier excepción en `ApiResponse` con:
    - `status: 'error'`
    - `message` amigable.
    - `error` con detalles para debugging (según entorno).
- No exponer trace completo en producción.
