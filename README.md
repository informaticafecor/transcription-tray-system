# 🎙️ Sistema de Bandeja Inteligente de Transcripción de Audios

Sistema completo de gestión y transcripción de audios basado en arquitectura cliente-servidor, con integración a Google Drive y sistema de transcripción externo.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Deployment](#deployment)

## ✨ Características

### Backend (Node.js + Express + Prisma)
- ✅ API REST con autenticación JWT
- ✅ Subida de audios a Google Drive
- ✅ Sistema de colas con BullMQ + Redis
- ✅ Integración con sistema de transcripción externo
- ✅ Callbacks HTTP para recibir resultados
- ✅ Control de cuotas diarias por usuario
- ✅ PostgreSQL con Prisma ORM
- ✅ Logging con Winston
- ✅ Rate limiting y seguridad con Helmet

### Frontend (Angular 17)
- ✅ Dashboard para usuarios
- ✅ Dashboard administrativo
- ✅ Upload de archivos con validación
- ✅ Vista en tiempo real del estado de transcripciones
- ✅ Polling automático para actualizaciones
- ✅ Interfaz responsive y moderna

### Infraestructura
- ✅ Docker Compose para orquestación
- ✅ PostgreSQL + Redis
- ✅ Worker separado para procesamiento
- ✅ Health checks y restart policies

## 🏗️ Arquitectura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Angular   │─────▶│   Backend    │─────▶│  PostgreSQL │
│  Frontend   │      │   (API)      │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ├──────────────┐
                            │              │
                     ┌──────▼──────┐ ┌─────▼─────┐
                     │   Redis     │ │  Worker   │
                     │   (Queue)   │ │ (BullMQ)  │
                     └─────────────┘ └───────────┘
                            │              │
                            │         ┌────▼──────┐
                            │         │  Google   │
                            │         │  Drive    │
                            │         └───────────┘
                            │
                     ┌──────▼──────────┐
                     │  Sistema de     │
                     │  Transcripción  │
                     │   (Externo)     │
                     └─────────────────┘
```

## 📦 Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **PostgreSQL** 15+ (si se ejecuta localmente)
- **Redis** 7+ (si se ejecuta localmente)

### Credenciales Necesarias

1. **Google Service Account** con acceso a Google Drive API
2. **Sistema de Autenticación** externo funcionando
3. **Sistema de Transcripción** externo con API REST

## 🚀 Instalación

### Opción 1: Docker Compose (Recomendado)

```bash
# Clonar el repositorio
git clone <repository-url>
cd transcription-tray-system

# Copiar archivos de ejemplo
cp backend/.env.example backend/.env
cp frontend/src/environments/environment.ts.example frontend/src/environments/environment.ts

# Editar variables de entorno
nano backend/.env

# Agregar credenciales de Google Drive
mkdir -p backend/credentials
# Copiar service-account.json a backend/credentials/

# Levantar todos los servicios
docker-compose up --build
```

### Opción 2: Desarrollo Local

#### Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
nano .env

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Iniciar servidor de desarrollo
npm run dev

# En otra terminal, iniciar worker
npm run worker
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en:
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- Adminer (DB): http://localhost:8080
- Redis Commander: http://localhost:8081

## ⚙️ Configuración

### Variables de Entorno del Backend

Editar `backend/.env`:

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/transcription_db

# Redis
REDIS_URL=redis://localhost:6379

# Google Drive
GOOGLE_SERVICE_ACCOUNT_JSON_PATH=./credentials/service-account.json
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here

# APIs Externas
TRANSCRIPTOR_URL=https://api.transcriptor.example.com/process
AUTH_VERIFY_URL=https://auth.example.com/api/verify

# Seguridad
CALLBACK_SECRET=your-secret-key-min-32-chars
JWT_SECRET=your-jwt-secret-key

# Límites
MAX_DAILY_UPLOADS=5
MAX_FILE_SIZE_MB=50
```

### Configurar Google Drive API

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un proyecto nuevo
3. Habilitar Google Drive API
4. Crear Service Account
5. Descargar JSON de credenciales
6. Guardar como `backend/credentials/service-account.json`
7. Compartir carpeta de Drive con el email del Service Account

### Configurar Frontend

Editar `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  authApiUrl: 'http://localhost:3001/api/auth',
  pollingInterval: 5000,
  maxFileSize: 50 * 1024 * 1024,
};
```

## 🎮 Ejecución

### Docker Compose - Producción

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

### Docker Compose - Desarrollo

```bash
# Solo base de datos y Redis
docker-compose -f docker-compose.dev.yml up -d

# Ejecutar backend y frontend localmente
cd backend && npm run dev
cd frontend && npm start
```

### Comandos Útiles

```bash
# Backend
npm run dev          # Servidor desarrollo
npm run worker       # Worker desarrollo
npm run build        # Build producción
npm test             # Ejecutar tests
npm run lint         # Linter

# Prisma
npx prisma studio    # UI para base de datos
npx prisma migrate dev --name migration_name
npx prisma generate

# Frontend
npm start            # Servidor desarrollo
npm run build:prod   # Build producción
npm test             # Ejecutar tests
```

## 📡 API Endpoints

### Autenticación
Todos los endpoints (excepto callback) requieren header:
```
Authorization: Bearer <jwt-token>
```

### Endpoints Disponibles

#### Usuario

**POST** `/api/v1/upload`
- Subir audio para transcripción
- Body: `multipart/form-data` con campo `audio`
- Respuesta: `{ success, message, data: { id, filename, status, createdAt } }`

**GET** `/api/v1/my-audios`
- Obtener audios del usuario actual
- Query params: `status`, `limit`, `offset`
- Respuesta: `{ success, data: [...], pagination }`

**GET** `/api/v1/audios/:id`
- Obtener detalles de un audio específico
- Respuesta: `{ success, data: {...} }`

**DELETE** `/api/v1/audios/:id`
- Eliminar un audio
- Respuesta: `{ success, message }`

**GET** `/api/v1/stats`
- Estadísticas del usuario/sistema
- Respuesta: `{ success, data: { audios, queue } }`

#### Admin

**GET** `/api/v1/admin/audios`
- Ver todos los audios del sistema
- Query params: `status`, `userId`, `limit`, `offset`
- Requiere: rol `admin`

#### Callback (Sistema Externo)

**POST** `/api/v1/callback/transcription`
- Recibir resultado de transcripción
- Headers: `X-Callback-Secret: <secret>`
- Body:
```json
{
  "audio_id": "uuid",
  "status": "completed|error",
  "transcription_text": "texto transcrito",
  "error_message": "mensaje de error",
  "duration": 123.45
}
```

### Ejemplo de Uso con cURL

```bash
# Upload audio
curl -X POST http://localhost:3000/api/v1/upload \
  -H "Authorization: Bearer <token>" \
  -F "audio=@/path/to/audio.mp3"

# Obtener mis audios
curl http://localhost:3000/api/v1/my-audios \
  -H "Authorization: Bearer <token>"

# Obtener detalles
curl http://localhost:3000/api/v1/audios/<audio-id> \
  -H "Authorization: Bearer <token>"
```

## 🧪 Testing

### Backend

```bash
cd backend

# Todos los tests
npm test

# Tests con coverage
npm test -- --coverage

# Tests en modo watch
npm run test:watch

# Solo tests de integración
npm run test:integration
```

### Frontend

```bash
cd frontend

# Tests unitarios
npm test

# Tests con coverage
npm test -- --code-coverage
```

## 📊 Monitoreo

### Logs

```bash
# Ver logs del backend
docker-compose logs -f backend

# Ver logs del worker
docker-compose logs -f worker

# Logs en archivo (local)
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

### Base de Datos

Acceder a Adminer: http://localhost:8080
- Sistema: PostgreSQL
- Servidor: postgres
- Usuario: transcription_user
- Contraseña: transcription_pass
- Base de datos: transcription_db

### Redis

Acceder a Redis Commander: http://localhost:8081

### Prisma Studio

```bash
cd backend
npx prisma studio
```

Disponible en: http://localhost:5555

## 🚢 Deployment

### Variables de Producción

1. Generar secrets seguros:
```bash
openssl rand -base64 32  # Para CALLBACK_SECRET
openssl rand -base64 32  # Para JWT_SECRET
```

2. Configurar URLs de producción
3. Habilitar HTTPS
4. Configurar límites de rate limiting
5. Configurar backups de PostgreSQL

### Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:4200;
    }
}
```

## 🛡️ Seguridad

- ✅ Autenticación JWT
- ✅ Rate limiting configurado
- ✅ Helmet.js para headers de seguridad
- ✅ CORS configurado
- ✅ Validación de archivos (tipo, tamaño)
- ✅ Cuotas diarias por usuario
- ✅ Secrets para callbacks

## 🤝 Contribución

1. Fork el proyecto
2. Crear branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT.

## 👥 Soporte

Para soporte y preguntas:
- Crear un issue en GitHub
- Email: support@example.com

## 🔧 Troubleshooting

### Error: Cannot connect to PostgreSQL
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps

# Ver logs de PostgreSQL
docker-compose logs postgres
```

### Error: Redis connection refused
```bash
# Reiniciar Redis
docker-compose restart redis
```

### Error: Google Drive credentials invalid
- Verificar que el archivo JSON esté en `backend/credentials/`
- Verificar permisos del Service Account
- Verificar que la carpeta de Drive esté compartida

### Worker no procesa jobs
```bash
# Ver logs del worker
docker-compose logs -f worker

# Verificar cola en Redis Commander
# http://localhost:8081
```

---

**Desarrollado con ❤️ para gestión eficiente de transcripciones de audio**