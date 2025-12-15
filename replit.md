# WikiConflicts CMS
Admin1234!
## Descripción
Aplicación CMS para documentar conflictos mundiales con timeline, testimonios, resistencia, fototeca y análisis.

## Replit Environment
- Frontend: React on port 5000 (0.0.0.0)
- Backend: Express.js on port 3001 (localhost)
- Database: MySQL external (with JSON fallback if MySQL unavailable)
- Run command: `npm run start` (runs both frontend and backend concurrently)

## Arquitectura

### Frontend
- React con react-router-dom
- Puerto: 5000 (host 0.0.0.0)
- Componentes principales en `/src`
- Panel de administración en `/src/admin`

### Backend
- Express.js
- Puerto: 3001 (host localhost)
- Rutas CMS en `/server/routes/cms-db.js`
- Conexión MySQL en `/server/db.js`

### Base de Datos
- MySQL externo (sldk595.piensasolutions.com)
- Charset: utf8mb4 para soporte Unicode completo
- Tablas principales: countries, sections, descriptions, timeline_events, witnesses, testimonies, resistors, resistance_entries, fototeca, analysts, analyses
- Tablas adicionales: velum_articles, terminology, section_headers, pending_changes, cms_users, predefined_countries

## Archivos Clave
- `server/db.js` - Conexión MySQL y creación de tablas
- `server/routes/cms-db.js` - Rutas CMS con MySQL
- `server/index.js` - Servidor Express principal
- `server/migrate-json-to-mysql.js` - Script de migración de JSON a MySQL
- `src/admin/AdminDashboard.js` - Dashboard con lista de países predefinidos
- `src/admin/components/FototecaEditor.js` - Editor con selector de galería

## Secrets
- MYSQL_HOST
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DATABASE

## Comandos
- `npm start` - Inicia frontend (5000) y backend (3001) concurrentemente
- `node server/migrate-json-to-mysql.js` - Migra datos JSON a MySQL

## Cambios Recientes (Diciembre 2025)
1. Migración de almacenamiento de archivos JSON a MySQL externo
2. Añadido charset utf8mb4 para soporte Unicode
3. Lista desplegable de países predefinidos en AdminDashboard
4. Selector de galería existente en FototecaEditor
5. Script de migración de datos JSON a MySQL
6. Nueva tabla y rutas para VELUM (artículos académicos)
7. Nueva tabla y rutas para Terminología (glosario)
8. Nueva tabla para encabezados de sección personalizables
9. Testimonios ahora cargan contenido completo desde MySQL

## Preferencias del Usuario
- Idioma: Español
