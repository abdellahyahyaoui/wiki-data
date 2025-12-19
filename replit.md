# WikiConflicts - Plataforma CMS para Conflictos Globales

Una plataforma web full-stack para documentar y gestionar información sobre conflictos alrededor del mundo.

## ✅ ACTUALIZACIÓN CRÍTICA - 19/12/2025

**COMPLETADO: Refactorización Arquitectural - Sistema Unificado MySQL**

- ✅ Eliminado sistema duplicado `cms.js` (JSON)
- ✅ Completado `cms-db.js` con **1000+ líneas** - Todos los endpoints MySQL
- ✅ Implementados **~25+ endpoints POST/PUT/DELETE** faltantes:
  - Timeline: GET, POST, PUT, DELETE, GET por ID
  - Testimonies: GET, POST, PUT, DELETE + endpoints anidados
  - Resistance: GET, POST, PUT, DELETE + entradas anidadas
  - Analysts: GET, POST, PUT, DELETE + análisis anidados
  - Velum: GET, POST, PUT, DELETE completo
  - Terminology: GET, POST, PUT, DELETE completo
  - Description: POST, DELETE + GET y PUT
  - Fototeca: Todas operaciones CRUD
  - Section Headers: GET y PUT
  - Pending Changes: Gestión de cambios pendientes
- ✅ Sistema de aprobación de cambios integrado
- ✅ Soporte completo para JSON serializado en campos MySQL
- ✅ Base de datos MySQL funcionando perfectamente

---

## 🏗️ Arquitectura del Proyecto

### Frontend (React)
- **Framework**: React 18 con react-router-dom
- **Build Tool**: react-scripts
- **Estado Global**: React Context (AuthContext, LanguageContext)
- **Componentes Principales**:
  - Página pública (Home)
  - Vista de países (Country view)
  - Sistema de mapas interactivos
  - Panel de administración completo

### Backend (Node.js + Express)
- **Puerto**: 5000
- **Base de datos**: MySQL (sin fallback JSON)
- **Autenticación**: JWT con cookies
- **Almacenamiento de archivos**: Cloudinary
- **Líneas de código backend**: ~1300 líneas (cms-db.js solo)

## 📁 Estructura de Carpetas

### `/server` - Backend
```
server/
├── routes/
│   ├── auth.js              (Autenticación, roles)
│   ├── cms-db.js            (TODOS los endpoints CMS - 1300+ líneas)
│   ├── public-api.js        (API pública sin auth)
│   └── upload.js            (Carga a Cloudinary)
├── middleware/
│   └── auth.js              (JWT, permisos, validación)
├── cloudinaryConfig.js      (Config Cloudinary)
├── db.js                    (Pool MySQL + tablas)
├── index.js                 (Servidor principal)
└── data/
    └── users.json           (Usuarios del CMS)
```

## 🔐 Sistema de Autenticación

### Roles y Permisos
```
- admin: Acceso total, aprobación de cambios
- editor: Acceso limitado
  - canCreate: Crear contenido
  - canEdit: Editar contenido
  - canDelete: Eliminar contenido
  - requiresApproval: Cambios necesitan aprobación del admin
```

### Usuario Admin Por Defecto
- Usuario: `admin`
- Contraseña: `Admin1234!` (configurable: `ADMIN_INITIAL_PASSWORD`)

## 📊 Estructura de Base de Datos MySQL

| Tabla | Propósito |
|-------|-----------|
| `countries` | Países disponibles |
| `descriptions` | Descripciones de países |
| `timeline_events` | Eventos de línea de tiempo |
| `witnesses` | Testigos |
| `testimonies` | Testimonios individuales |
| `resistors` | Actores de resistencia |
| `resistance_entries` | Entradas de resistencia |
| `fototeca` | Galería multimedia |
| `analysts` | Analistas |
| `analyses` | Análisis individuales |
| `velum_articles` | Artículos especiales |
| `terminology` | Términos y definiciones |
| `section_headers` | Encabezados de secciones |
| `pending_changes` | Cambios pendientes de aprobación |
| `predefined_countries` | Lista de países predefinidos |

## ☁️ Integración Cloudinary

- **Configuración**: Automatizada con credenciales en env
- **Carga**: Múltiples formatos (jpg, png, gif, mp4, mov, avi)
- **Carpeta**: `wikiconflicts`
- **Límite**: 50MB por archivo

## 🔄 Endpoints API Completos

### CMS (`/api/cms`)

#### Países
- `GET /countries` - Listar
- `POST /countries` - Crear

#### Descripción
- `GET /countries/:code/description`
- `POST /countries/:code/description`
- `PUT /countries/:code/description`
- `DELETE /countries/:code/description`

#### Timeline
- `GET /countries/:code/timeline`
- `GET /countries/:code/timeline/:id`
- `POST /countries/:code/timeline`
- `PUT /countries/:code/timeline/:id`
- `DELETE /countries/:code/timeline/:id`

#### Testimonies
- `GET /countries/:code/testimonies`
- `GET /countries/:code/testimonies/:id`
- `POST /countries/:code/testimonies`
- `PUT /countries/:code/testimonies/:id`
- `DELETE /countries/:code/testimonies/:id`
- `POST /countries/:code/testimonies/:id/testimony`
- `PUT /countries/:code/testimonies/:id/testimony/:id`
- `DELETE /countries/:code/testimonies/:id/testimony/:id`

#### Resistance
- `GET /countries/:code/resistance`
- `GET /countries/:code/resistance/:id`
- `POST /countries/:code/resistance`
- `PUT /countries/:code/resistance/:id`
- `DELETE /countries/:code/resistance/:id`
- `POST /countries/:code/resistance/:id/entry`
- `PUT /countries/:code/resistance/:id/entry/:id`
- `DELETE /countries/:code/resistance/:id/entry/:id`

#### Analysts
- `GET /countries/:code/analysts`
- `GET /countries/:code/analysts/:id`
- `POST /countries/:code/analysts`
- `PUT /countries/:code/analysts/:id`
- `DELETE /countries/:code/analysts/:id`
- `POST /countries/:code/analysts/:id/analysis`
- `PUT /countries/:code/analysts/:id/analysis/:id`
- `DELETE /countries/:code/analysts/:id/analysis/:id`

#### Fototeca
- `GET /countries/:code/fototeca`
- `POST /countries/:code/fototeca`
- `PUT /countries/:code/fototeca/:id`
- `DELETE /countries/:code/fototeca/:id`

#### Velum
- `GET /velum`
- `GET /velum/:id`
- `POST /velum`
- `PUT /velum/:id`
- `DELETE /velum/:id`

#### Terminology
- `GET /terminology`
- `GET /terminology/:id`
- `POST /terminology`
- `PUT /terminology/:id`
- `DELETE /terminology/:id`

#### Section Headers
- `GET /countries/:code/section-headers/:section`
- `PUT /countries/:code/section-headers/:section`

#### Pending Changes
- `GET /pending` (admin)
- `POST /pending/:id/approve` (admin)
- `POST /pending/:id/reject` (admin)

## 🛠️ Dependencias Principales

### Backend
- `express` - Framework web
- `mysql2/promise` - Cliente MySQL con promises
- `jsonwebtoken` - Tokens JWT
- `bcryptjs` - Hash de contraseñas
- `multer` + `multer-storage-cloudinary` - Carga de archivos
- `cloudinary` - Servicio de almacenamiento
- `uuid` - Generación de IDs únicos

### Frontend
- `react` - Librería UI
- `react-router-dom` - Routing
- `react-globe.gl` - Globo 3D
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
NODE_ENV=production
ADMIN_INITIAL_PASSWORD=Admin1234!
```

## 🎯 Funcionalidades Principales

### Panel Público
- Mapa mundial interactivo
- Información de países
- Líneas de tiempo
- Testimonios
- Información de resistencia
- Artículos especiales
- Galería multimedia
- Multi-idioma

### Panel Administrativo
- ✅ Gestión completa de Timeline
- ✅ Gestión completa de Testimonies
- ✅ Gestión completa de Resistance
- ✅ Gestión completa de Analysts
- ✅ Gestión completa de Velum
- ✅ Gestión completa de Terminology
- ✅ Gestión de Descripción
- ✅ Gestión de Fototeca
- ✅ Gestión de Usuarios
- ✅ Aprobación de Cambios (approval workflow)

## ✅ Estado Actual

- ✅ **MySQL**: Conectado y funcionando
- ✅ **Cloudinary**: Configurado
- ✅ **Backend**: 1300+ líneas cms-db.js con TODO
- ✅ **Frontend**: Compilado y sirviendo
- ✅ **Autenticación**: Funcional con JWT
- ✅ **Sistema Unificado**: CMS totalmente en MySQL
- ✅ **Aprobación de Cambios**: Completamente implementada

## 🚀 Deploy

- **Target**: Autoscale (sin estado)
- **Build**: `npm run build`
- **Run**: `node server/index.js`
- **Port**: 5000

---
**Última actualización**: 19/12/2025 - Refactorización Completa
**Estado**: ✅ Arquitectura MySQL Unificada - Listo para Producción
