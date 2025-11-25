# Arranque local rápido

1. Clona el repositorio y entra en la carpeta `server` (este proyecto).
2. Copia `.env.example` a `.env` y personaliza las variables para tu entorno.
3. Asegúrate de tener MongoDB levantado en tu máquina o en un contenedor accesible.
4. Instala dependencias con `npm install`.
5. Ejecuta `npm run start:dev` para levantar el backend en modo desarrollo.
6. La API quedará disponible en `http://localhost:3000/api` por defecto.

## Notas
- Si necesitas credenciales diferentes para MongoDB, cámbialas en `MONGO_URI`/`MONGODB_URI` y en `MONGODB_DB`.
- Los secretos JWT deben ser distintos en cada entorno. No uses los valores de ejemplo en producción.
