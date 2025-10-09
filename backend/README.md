# Backend - Sistema de Transcripción

API REST construida con Node.js, Express, Prisma y BullMQ.

## Tecnologías

- **Node.js** 18+
- **Express** - Framework web
- **Prisma** - ORM para PostgreSQL
- **BullMQ** - Sistema de colas con Redis
- **TypeScript** - Tipado estático
- **Winston** - Logging
- **Jest** - Testing

## Estructura del Proyecto

```
src/
├── app.ts              # Configuración de Express
├── server.ts           # Punto de entrada
├── config/
│   └── env.ts          # Variables de entorno
├── controllers/        # Controladores de rutas
├── services/           # Lógica de negocio
├── middleware/         # Middlewares
├── routes/             # Definición de rutas
├── workers/            # Workers de BullMQ
├── prisma/            # Schema y migraciones
└── utils/             # Utilidades
```

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev
```

## Scripts Disponibles

```bash
npm run dev          # Servidor en modo desarrollo
npm run worker       # Worker en modo desarrollo
npm run build        # Compilar TypeScript
npm start            # Ejecutar en producción
npm test             # Ejecutar tests
npm run lint         # Linter
```

## Variables de Entorno

Ver archivo `.env.example` para la lista completa de variables requeridas.

### Variables Críticas

- `DATABASE_URL` - Conexión a PostgreSQL
- `REDIS_URL` - Conexión a Redis
- `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` - Ruta a credenciales de Google
- `TRANSCRIPTOR_URL` - URL del sistema de transcripción
- `CALLBACK_SECRET` - Secret para validar callbacks

## Migraciones

```bash
# Crear nueva migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones en producción
npx prisma migrate deploy

# Resetear base de datos (desarrollo)
npx prisma migrate reset
```

## Testing

```bash
# Todos los tests
npm test

# Tests con coverage
npm test -- --coverage

# Tests en modo watch
npm run test:watch
```

## Endpoints Principales

### POST /api/v1/upload
Subir audio para transcripción

### GET /api/v1/my-audios
Obtener audios del usuario

### POST /api/v1/callback/transcription
Recibir resultado de transcripción (externo)

Ver documentación completa de API en el README principal.

## Logging

Los logs se guardan en:
- `logs/combined.log` - Todos los logs
- `logs/error.log` - Solo errores

## Worker

El worker procesa la cola de audios de forma asíncrona:

```bash
npm run worker
```

El worker:
1. Toma jobs de la cola Redis
2. Envía el audio al sistema de transcripción
3. Actualiza el estado en la base de datos

## Desarrollo

### Hot Reload

```bash
npm run dev
```

### Debug

Agregar puntos de interrupción y ejecutar:

```bash
node --inspect dist/server.js
```

## Producción

```bash
# Build
npm run build

# Ejecutar
npm start

# Con PM2
pm2 start dist/server.js --name transcription-api
pm2 start dist/workers/audio.worker.js --name transcription-worker
```

## Troubleshooting

### Error de conexión a PostgreSQL

Verificar que PostgreSQL esté corriendo y las credenciales sean correctas.

### Error de conexión a Redis

Verificar que Redis esté corriendo:
```bash
redis-cli ping
```

### Prisma Client no encontrado

Regenerar el cliente:
```bash
npx prisma generate
```