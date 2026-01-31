# Business Control Backend

Backend de Business Control construido con NestJS.

## ConfiguraciÃ³n de entorno
1. Copia el archivo `.env.example` a `.env` en la raÃ­z del proyecto.
2. Ajusta las variables segÃºn tu entorno (puerto, MongoDB, secretos JWT).
3. Consulta `docs/ENVIRONMENT.md` para una descripciÃ³n completa y pasos detallados.

## Scripts bÃ¡sicos
- `npm install`: instala dependencias.
- `npm run start:dev`: inicia el servidor en modo desarrollo.
- `npm run start`: inicia el servidor en modo producciÃ³n.
- `npm run test`: ejecuta las pruebas configuradas.

## MigraciÃ³n desde module_states (dev)
Este script migra los datos de `module_states` a las colecciones persistentes (`users`, `organizations`, `countries`, `currencies`, `org_modules`).

1. Configura la conexiÃ³n Mongo (usa las mismas variables del backend, por ejemplo `MONGO_URI` o `MONGO_HOST/MONGO_PORT`).
2. Ejecuta:
   - `node scripts/migrate-module-states.js`

El script solo realiza upserts y **no** borra documentos de `module_states`.
## MÃ¡s informaciÃ³n
Revisa la carpeta `docs/` para guÃ­as adicionales sobre mÃ³dulos, arquitectura y despliegue.


