# WikiConflicts CMS - Estado Actualizado

## FECHA: 2024-12-14

## RESUMEN
Solucionados problemas de carga de contenido del CMS en el frontend.

## PROBLEMAS SOLUCIONADOS

### 1. Conexión MySQL
- Faltaba MYSQL_PASSWORD como secret - ya añadido
- MySQL ahora conecta correctamente

### 2. API Base URL
- Frontend usaba URL externa en producción
- Cambiado `src/utils/apiBase.js` a usar string vacío para servidor local

### 3. Velum y Terminología
- Antes: usaban fetch directo a archivos estáticos /data/...
- Ahora: usan funciones API desde api.js
- Añadidos endpoints: `/terminology/index`, `/terminology/category/:category/:letter`

### 4. Testimonios/Resistencia/Análisis específicos
- Antes: fetch directo a archivos JSON
- Ahora: usan nuevas funciones API
- Añadidos endpoints: 
  - `/countries/:code/testimonies/:witnessId/:testimonyId`
  - `/countries/:code/resistance/:resistorId/:entryId`
  - `/countries/:code/analysts/:analystId/:analysisId`

## ARCHIVOS MODIFICADOS
- `src/utils/apiBase.js` - API_BASE = ''
- `src/utils/api.js` - Añadidas funciones: getTerminologyIndex, getTerminologyByCategory, getSpecificTestimony, getSpecificResistanceEntry, getSpecificAnalysis
- `src/layout/CountryContent.jsx` - Actualizado para usar API en todas las secciones
- `server/routes/public-api.js` - Añadidos nuevos endpoints

## ARQUITECTURA
- Backend: Express.js puerto 5000
- MySQL: sldk595.piensasolutions.com / qapb973
- Frontend: React construido en /build
- Workflow: "WikiConflicts App" corriendo

## ACCESO ADMIN
- Usuario: admin
- Contraseña: Admin1234! (o valor en ADMIN_INITIAL_PASSWORD)

## ESTADO ACTUAL
- Servidor corriendo con MySQL conectado
- Todas las secciones deberían cargar contenido desde la base de datos
- App lista para usar y añadir contenido desde el panel admin