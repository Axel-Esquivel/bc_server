# Entorno y configuración

## Resumen
El backend de Business Control usa variables de entorno para definir puertos de arranque, conexión a base de datos y secretos JWT. Para iniciar rápidamente, copia el archivo `.env.example` en la raíz del backend a `.env` y ajusta los valores según tu entorno.

## Variables de entorno
A continuación se listan las variables actualmente leídas por la aplicación. Usa los ejemplos como referencia y evita reutilizar estos valores en producción.

| Variable | Descripción | Valor de ejemplo |
| --- | --- | --- |
| `PORT` | Puerto HTTP donde se expone la API. | `3000` |
| `MONGO_URI` | URI principal de conexión a MongoDB. Tiene prioridad si se define. | `mongodb://localhost:27017/business_control` |
| `MONGODB_URI` | URI alternativa de conexión a MongoDB, usada si `MONGO_URI` no está presente. | `mongodb://localhost:27017/business_control` |
| `MONGODB_DB` | Nombre de la base de datos MongoDB a usar. | `business_control` |
| `JWT_SECRET` | Clave para firmar y validar los JWT de acceso. | `change_me_in_production` |
| `JWT_REFRESH_SECRET` | Clave para firmar y validar los JWT de refresco. | `change_me_also` |

> Nota: Los tiempos de expiración de los tokens y el límite de peticiones están definidos en código y actualmente no se leen de variables de entorno.

## Pasos rápidos
1. Copia el archivo de plantilla: `cp .env.example .env`.
2. Ajusta `MONGO_URI`/`MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET` y `JWT_REFRESH_SECRET` con valores seguros para tu entorno.
3. Instala dependencias: `npm install`.
4. Inicia el servidor en modo desarrollo: `npm run start:dev`.

## Entornos típicos
- **Desarrollo local**: Usar MongoDB en localhost (`MONGO_URI=mongodb://localhost:27017/business_control`) suele ser suficiente. Asegúrate de que la base de datos esté en ejecución antes de levantar el backend.
- **Docker**: Si utilizas `docker-compose`, expón las variables anteriores en el servicio del backend para que NestJS pueda leerlas. Ajusta `MONGO_URI` a la URL del contenedor de MongoDB (por ejemplo, `mongodb://mongo:27017/business_control`) y define secretos propios mediante variables de entorno o un archivo `.env` montado en el contenedor.
