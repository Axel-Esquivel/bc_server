# 13 – DevOps, Docker y CI/CD

Define la estrategia de empaquetado y despliegue del backend.

## 1. Docker

- El backend se empaqueta en una imagen Node.js:
  - Multi-stage:
    - Etapa de build (instala dependencias, corre `npm run build`).
    - Etapa final (solo código compilado + `node_modules` necesarios).
- Variables de entorno:
  - `MONGO_URI`
  - `JWT_SECRET`
  - Puertos, etc.

## 2. docker-compose

- Servicios mínimos:
  - `api` (backend)
  - `mongo` (base de datos)
- Opcionales:
  - `redis`
  - `xlsx-ops` (microservicio Excel)

## 3. CI/CD con GitHub Actions

- Pipelines sugeridos:
  - `build.yml`:
    - Instalar dependencias.
    - Correr `lint`, `test`, `build`.
  - `test.yml`:
    - Ejecutar pruebas unitarias.
  - `deploy.yml`:
    - Construir y publicar imagen Docker.
    - Desplegar al entorno (según configuración del proyecto real).

## 4. Buenas prácticas

- No subir `.env` reales al repositorio.
- Usar `.env.example` como plantilla.
- Definir secretos en GitHub para tokens y contraseñas.
