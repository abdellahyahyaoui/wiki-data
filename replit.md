# WikiConflicts - Análisis Completo del Proyecto

Una plataforma web full-stack para documentar y gestionar información sobre conflictos alrededor del mundo.

## 🏗️ Arquitectura del Proyecto

### Frontend (React)
- **Framework**: React 18 con react-router-dom
- **Build Tool**: react-scripts
- **Estado Global**: React Context (AuthContext, LanguageContext)
- **Componentes Principales**:
  - Página pública (Home)
  - Vista de países (Country view)
  - Sistema de mapas interactivos (WorldMap, MapAfrica, MapAsia, etc)
  - Panel de administración completo

### Backend (Node.js + Express)
- **Puerto**: 5000
- **Base de datos**: MySQL (con fallback JSON)
- **Autenticación**: JWT con cookies
- **Almacenamiento de archivos**: Cloudinary
- **Líneas de código**: ~3,789 líneas totales

## 📁 Estructura de Carpetas

### `/server` - Backend
```
server/
├── routes/
│   ├── auth.js           (Autenticación de usuarios, gestión de roles)
│   ├── cms-db.js         (Endpoints de contenido por país)
│   ├── cms.js            (Rutas de CMS adicionales)
│   ├── public-api.js     (API pública para frontend)
│   └── upload.js         (Carga de archivos a Cloudinary)
├── middleware/
│   └── auth.js           (JWT, permisos, validación de tokens)
├── cloudinaryConfig.js   (Configuración de Cloudinary)
├── db.js                 (Pool MySQL y creación de tablas)
├── index.js              (Servidor principal)
└── data/
    ├── users.json        (Almacenamiento de usuarios)
    ├── jwt-secret.key    (Secreto JWT local)
    └── pending-changes.json (Cambios pendientes de aprobación)
```

### `/src` - Frontend

#### `/src/admin` - Panel Administrativo
```
admin/
├── components/
│   ├── AnalystsEditor.js          (Editor de analistas)
│   ├── DescriptionEditor.js       (Editor de descripciones)
│   ├── FototecaEditor.js          (Gestor de fototeca)
│   ├── GalleryManager.js          (Galería de imágenes)
│   ├── ImageUploader.js           (Cargador de imágenes)
│   ├── MediaEditor.js             (Editor multimedia)
│   ├── MultiMediaUploader.js      (Cargador múltiple)
│   ├── ResistanceEditor.js        (Editor de resistencia)
│   ├── RichContentEditor.js       (Editor de contenido enriquecido)
│   ├── TerminologyEditor.js       (Gestor de terminología)
│   ├── TestimoniesEditor.js       (Editor de testimonios)
│   ├── TimelineEditor.js          (Editor de línea de tiempo)
│   └── VelumEditor.js             (Editor de artículos Velum)
├── AdminLogin.js                  (Pantalla de login)
├── AdminDashboard.js              (Dashboard principal)
├── AdminCountry.js                (Gestión por país)
├── AdminUsers.js                  (Gestión de usuarios)
├── AdminPending.js                (Cambios pendientes de aprobación)
└── admin.css                      (Estilos del admin)
```

#### `/src/components` - Componentes Públicos
```
components/
├── WorldMap.js         (Mapa mundial interactivo)
├── MapAfrica.js        (Mapa de África)
├── MapAsia.js          (Mapa de Asia)
├── MapEurope.js        (Mapa de Europa)
├── MapLatinAmerica.js  (Mapa de América Latina)
├── FloatingCountries.jsx
├── ChaptersOverlay.jsx
└── MobileMenu.jsx
```

#### `/src/layout` - Layouts
```
layout/
├── CountryLayout.jsx      (Layout principal de país)
├── CountryHeader.jsx      (Encabezado del país)
├── CountryContent.jsx     (Contenido principal)
├── CountrySidebar.jsx     (Barra lateral)
└── MediaGallery.jsx       (Galería de medios)
```

#### `/src/context` - Contextos Globales
```
context/
├── AuthContext.js         (Autenticación y usuario actual)
└── LanguageContext.js     (Gestión de idiomas)
```

#### `/src/pages` - Páginas Principales
```
pages/
├── Home.js       (Página de inicio)
└── Country.js    (Página de país)
```

## 🔐 Sistema de Autenticación

### Flujo de Autenticación
1. Usuario hace login con credenciales
2. Backend valida contra `users.json` o base de datos
3. Se genera JWT con expiración de 24h
4. Token se almacena en cookie HTTP-only
5. Middleware valida token en cada request protegido

### Roles y Permisos
```
- admin: Acceso total, gestión de usuarios, aprobación de cambios
- editor: Acceso limitado según permisos específicos
  - canCreate: Puede crear contenido
  - canEdit: Puede editar contenido
  - canDelete: Puede eliminar contenido
  - requiresApproval: Los cambios necesitan aprobación
```

### Usuario Admin Por Defecto
- Usuario: `admin`
- Contraseña: `Admin1234!` (configurable con `ADMIN_INITIAL_PASSWORD`)
- Se crea automáticamente en el primer inicio

## 📊 Estructura de Base de Datos MySQL

### Tablas Principales

| Tabla | Propósito |
|-------|-----------|
| `countries` | Países disponibles |
| `sections` | Secciones por país |
| `descriptions` | Descripciones de países |
| `timeline_events` | Eventos de línea de tiempo |
| `witnesses` | Testigos/Testimonios |
| `testimonies` | Testimonios individuales |
| `resistors` | Actores de resistencia |
| `resistance_entries` | Entradas de resistencia |
| `fototeca` | Galería multimedia |
| `analysts` | Analistas |
| `analyses` | Análisis individuales |
| `velum_articles` | Artículos especiales |
| `terminology` | Términos y definiciones |
| `cms_users` | Usuarios del CMS |
| `pending_changes` | Cambios pendientes de aprobación |
| `predefined_countries` | Lista de países disponibles |

## ☁️ Integración Cloudinary

### Configuración
- **Cloud Name**: `CLOUDINARY_NAME`
- **API Key**: `CLOUDINARY_API_KEY`
- **API Secret**: `CLOUDINARY_API_SECRET`
- **Carpeta**: `wikiconflicts`
- **Formatos permitidos**: jpg, png, jpeg, gif, mp4, mov, avi
- **Límite de tamaño**: 50MB

### Endpoints de Carga
- `POST /api/upload/image` - Una imagen
- `POST /api/upload/images` - Múltiples imágenes (máx 10)
- `POST /api/upload/video` - Un video
- `POST /api/upload/youtube` - Video de YouTube
- `POST /api/upload/media` - Archivo multimedia genérico

## 🔄 Rutas API

### Autenticación (`/api/auth`)
- `POST /login` - Iniciar sesión
- `POST /logout` - Cerrar sesión
- `GET /me` - Obtener usuario actual
- `GET /users` - Listar usuarios (admin)
- `POST /users` - Crear usuario (admin)

### CMS (`/api/cms`)
- `GET /countries` - Listar países
- `POST /countries` - Crear país (admin)
- `GET /countries/:code/*` - Obtener contenido del país
- `POST /countries/:code/*` - Crear contenido (autenticado)
- `PUT /countries/:code/*` - Actualizar contenido (autenticado)
- `DELETE /countries/:code/*` - Eliminar contenido (autenticado)

### Contenido Específico
- **Fototeca**: `/api/cms/countries/:code/fototeca`
- **Testimonios**: `/api/cms/countries/:code/testimonies`
- **Timeline**: `/api/cms/countries/:code/timeline`
- **Resistencia**: `/api/cms/countries/:code/resistance`
- **Análisis**: `/api/cms/countries/:code/analysts`
- **Descripción**: `/api/cms/countries/:code/description`

### API Pública (`/api/public`)
- Endpoints sin autenticación para mostrar contenido

## 🚀 Proceso de Build y Deploy

### Scripts NPM
```bash
npm install    # Instalar dependencias
npm run build  # Compilar frontend React
npm start      # Ejecutar servidor
npm run dev    # Build + servidor
```

### Build Process
1. React se compila a carpeta `/build`
2. Express sirve el contenido estático desde `/build`
3. API routes se sirven desde `/api/*`
4. Fallback a `index.html` para SPA routing

### Deployment
- **Target**: Autoscale (stateless)
- **Build**: `npm run build`
- **Run**: `node server/index.js`
- **Port**: 5000

## 🛠️ Dependencias Principales

### Backend
- `express` - Framework web
- `mysql2/promise` - Cliente MySQL
- `jsonwebtoken` - Tokens JWT
- `bcryptjs` - Hash de contraseñas
- `multer` + `multer-storage-cloudinary` - Carga de archivos
- `cloudinary` - Servicio de almacenamiento
- `cors` - Manejo de CORS
- `cookie-parser` - Parsing de cookies
- `dotenv` - Variables de entorno

### Frontend
- `react` - Librería UI
- `react-router-dom` - Routing
- `react-globe.gl` - Globo 3D interactivo
- `react-simple-maps` - Mapas SVG
- `three` - Gráficos 3D

## 📝 Variables de Entorno Requeridas

```
MYSQL_HOST=host
MYSQL_USER=user
MYSQL_PASSWORD=password
MYSQL_DATABASE=database
CLOUDINARY_NAME=name
CLOUDINARY_API_KEY=key
CLOUDINARY_API_SECRET=secret
NODE_ENV=production|development
ADMIN_INITIAL_PASSWORD=pass (default: Admin1234!)
JWT_SECRET=secret (opcional, se genera automáticamente)
```

## 🎯 Funcionalidades Principales

### Panel Público
- Visualización de mapa mundial interactivo
- Acceso a información de países
- Visualización de líneas de tiempo
- Testimonios de testigos
- Información de resistencia
- Artículos especiales (Velum)
- Galería multimedia
- Multi-idioma (ES/EN)

### Panel Administrativo
- **Gestión de Países**: Crear y configurar países
- **Gestor de Contenido**: Editar todos los tipos de contenido
- **Gestión de Usuarios**: Crear usuarios con roles y permisos
- **Aprobación de Cambios**: Revisar cambios pendientes
- **Carga de Medios**: Subir imágenes y videos
- **Gestión de Testimonios**: Agregar y editar testimonios
- **Gestión de Análisis**: Administrar análisis de expertos
- **Fototeca**: Organizar galería multimedia

## 🔧 Estado Actual

✅ **MySQL**: Conectado y funcionando  
✅ **Cloudinary**: Configurado  
✅ **Frontend**: Compilado y sirviendo  
✅ **Backend**: Corriendo en puerto 5000  
✅ **Autenticación**: Funcional con JWT  

## 📱 Deployment

El proyecto está configurado para:
- **Despliegue**: Autoscale (sin estado)
- **Build**: Automático con `npm run build`
- **Servidor**: Node.js Express
- **Escalabilidad**: Sin dependencias de memoria local

---
**Última actualización**: 19/12/2025
**Estado**: ✅ Listo para producción
