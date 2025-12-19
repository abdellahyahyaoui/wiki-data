# WikiConflicts CMS - Análisis Completo de Errores Arquitecturales

## 🚨 PROBLEMA CRÍTICO: ARQUITECTURA DUAL DEL CMS

El CMS tiene **DOS sistemas backend completamente separados** sirviendo en la misma ruta `/api/cms`:

### Backend #1: JSON Files (`server/routes/cms.js`)
- **Puerto**: /api/cms
- **Almacenamiento**: JSON files en `/public/data/`
- **Uso**: Fallback cuando MySQL no está disponible
- **Estado**: Tiene implementación COMPLETA de todo

### Backend #2: MySQL (`server/routes/cms-db.js`) 
- **Puerto**: /api/cms
- **Almacenamiento**: Base de datos MySQL
- **Uso**: Sistema principal cuando MySQL está conectado
- **Estado**: **INCOMPLETO** - Falta el 60% de endpoints

---

## 📋 MATRIZ DE ENDPOINTS POR SECCIÓN

### ✅ FOTOTECA (Completamente Implementada en MySQL)
| Endpoint | Método | cms-db.js | cms.js | Componente |
|----------|--------|-----------|--------|-----------|
| `/countries/:code/fototeca` | GET | ✅ | ✅ | FototecaEditor.js |
| `/countries/:code/fototeca` | POST | ✅ | ✅ | FototecaEditor.js |
| `/countries/:code/fototeca/:id` | PUT | ✅ | ✅ | FototecaEditor.js |
| `/countries/:code/fototeca/:id` | DELETE | ✅ | ✅ | FototecaEditor.js |

**ESTADO**: ✅ FUNCIONAL COMPLETO

---

### ⚠️ DESCRIPTION (Parcialmente Implementada en MySQL)
| Endpoint | Método | cms-db.js | cms.js | Componente |
|----------|--------|-----------|--------|-----------|
| `/countries/:code/description` | GET | ✅ | ✅ | DescriptionEditor.js |
| `/countries/:code/description` | PUT | ✅ | ✅ | DescriptionEditor.js |
| `/countries/:code/description` | POST | ❌ | ✅ | N/A |
| `/countries/:code/description` | DELETE | ❌ | ✅ | N/A |

**PROBLEMA**: 
- No hay POST para crear descripción (usa INSERT ... ON DUPLICATE KEY)
- No hay DELETE para eliminar descripción

---

### ❌ TIMELINE (COMPLETAMENTE FALTA en MySQL)
| Endpoint | Método | cms-db.js | cms.js | Componente |
|----------|--------|-----------|--------|-----------|
| `/countries/:code/timeline` | GET | ✅ | ✅ | TimelineEditor.js |
| `/countries/:code/timeline` | POST | ❌ | ✅ | TimelineEditor.js |
| `/countries/:code/timeline/:id` | GET | ❌ | ✅ | TimelineEditor.js |
| `/countries/:code/timeline/:id` | PUT | ❌ | ✅ | TimelineEditor.js |
| `/countries/:code/timeline/:id` | DELETE | ❌ | ✅ | TimelineEditor.js |

**CRÍTICO**: Solo GET funciona en MySQL. TimelineEditor llama a endpoints que NO existen en MySQL.

---

### ❌ TESTIMONIES (COMPLETAMENTE FALTA en MySQL)
| Endpoint | Método | cms-db.js | cms.js | Componente |
|----------|--------|-----------|--------|-----------|
| `/countries/:code/testimonies` | GET | ✅ | ✅ | TestimoniesEditor.js |
| `/countries/:code/testimonies` | POST | ❌ | ✅ | TestimoniesEditor.js |
| `/countries/:code/testimonies/:id` | GET | ❌ | ✅ | TestimoniesEditor.js |
| `/countries/:code/testimonies/:id` | PUT | ❌ | ✅ | TestimoniesEditor.js |
| `/countries/:code/testimonies/:id` | DELETE | ❌ | ✅ | TestimoniesEditor.js |
| `/countries/:code/testimonies/:id/testimony` | POST | ❌ | ✅ | TestimoniesEditor.js |
| `/countries/:code/testimonies/:id/testimony/:id` | PUT | ❌ | ✅ | TestimoniesEditor.js |
| `/countries/:code/testimonies/:id/testimony/:id` | DELETE | ❌ | ✅ | TestimoniesEditor.js |

**CRÍTICO**: Solo GET funciona en MySQL. TestimoniesEditor no puede crear ni editar.

---

### ❌ RESISTANCE (COMPLETAMENTE FALTA en MySQL)
| Endpoint | Método | cms-db.js | cms.js | Componente |
|----------|--------|-----------|--------|-----------|
| `/countries/:code/resistance` | GET | ✅ | ✅ | ResistanceEditor.js |
| `/countries/:code/resistance` | POST | ❌ | ✅ | ResistanceEditor.js |
| `/countries/:code/resistance/:id` | GET | ❌ | ✅ | ResistanceEditor.js |
| `/countries/:code/resistance/:id` | PUT | ❌ | ✅ | ResistanceEditor.js |
| `/countries/:code/resistance/:id` | DELETE | ❌ | ✅ | ResistanceEditor.js |
| `/countries/:code/resistance/:id/entry` | POST | ❌ | ✅ | ResistanceEditor.js |
| `/countries/:code/resistance/:id/entry/:id` | PUT | ❌ | ✅ | ResistanceEditor.js |
| `/countries/:code/resistance/:id/entry/:id` | DELETE | ❌ | ✅ | ResistanceEditor.js |

**CRÍTICO**: Solo GET funciona en MySQL. ResistanceEditor no puede crear ni editar.

---

### ❌ ANALYSTS (NO EXISTE EN MySQL)
| Endpoint | Método | cms-db.js | cms.js | Componente |
|----------|--------|-----------|--------|-----------|
| `/countries/:code/analysts` | GET | ❌ | ✅ | AnalystsEditor.js |
| `/countries/:code/analysts` | POST | ❌ | ✅ | AnalystsEditor.js |
| `/countries/:code/analysts/:id` | GET | ❌ | ✅ | AnalystsEditor.js |
| `/countries/:code/analysts/:id` | PUT | ❌ | ✅ | AnalystsEditor.js |
| `/countries/:code/analysts/:id` | DELETE | ❌ | ✅ | AnalystsEditor.js |

**CRÍTICO**: Completamente falta en cms-db.js. AnalystsEditor fallará.

---

### ❌ VELUM (NO EXISTE EN MySQL)
| Endpoint | Método | cms-db.js | cms.js | Componente |
|----------|--------|-----------|--------|-----------|
| `/velum` | GET | ❌ | ✅ | VelumEditor.js |
| `/velum` | POST | ❌ | ✅ | VelumEditor.js |
| `/velum/:id` | GET | ❌ | ✅ | VelumEditor.js |
| `/velum/:id` | PUT | ❌ | ✅ | VelumEditor.js |
| `/velum/:id` | DELETE | ❌ | ✅ | VelumEditor.js |

**CRÍTICO**: Completamente falta en cms-db.js. VelumEditor fallará.

---

### ❌ TERMINOLOGY (NO EXISTE EN MySQL)
| Endpoint | Método | cms-db.js | cms.js | Componente |
|----------|--------|-----------|--------|-----------|
| `/terminology` | GET | ❌ | ✅ | TerminologyEditor.js |
| `/terminology` | POST | ❌ | ✅ | TerminologyEditor.js |
| `/terminology/:id` | GET | ❌ | ✅ | TerminologyEditor.js |
| `/terminology/:id` | PUT | ❌ | ✅ | TerminologyEditor.js |
| `/terminology/:id` | DELETE | ❌ | ✅ | TerminologyEditor.js |

**CRÍTICO**: Completamente falta en cms-db.js. TerminologyEditor fallará.

---

## 🔄 FLUJO DE CLOUDINARY + MySQL

### Proceso CORRECTO (Fototeca):
```
1. Usuario selecciona imagen en FototecaEditor.js
2. Se sube a Cloudinary vía /api/upload/images
3. Cloudinary devuelve URL pública (ej: https://res.cloudinary.com/...)
4. Se guarda en MySQL: fototeca.url = URL_CLOUDINARY
5. Se lee desde fototeca.url al mostrar
```

**PROBLEMA**: Los otros editores (Testimonios, Timeline, Resistance, Analysts) usan el mismo flujo pero:
- Suben imágenes correctamente a Cloudinary
- Reciben la URL correctamente
- **PERO** no tienen endpoints POST/PUT/DELETE en MySQL para guardar los datos

---

## 📊 RESUMEN DE ERRORES

### Errores Críticos (Impiden uso del CMS):
1. **Timeline**: 4 de 5 endpoints faltan → ❌ COMPLETAMENTE ROTO
2. **Testimonies**: 7 de 8 endpoints faltan → ❌ COMPLETAMENTE ROTO
3. **Resistance**: 7 de 8 endpoints faltan → ❌ COMPLETAMENTE ROTO
4. **Analysts**: 5 de 5 endpoints faltan → ❌ COMPLETAMENTE ROTO
5. **Velum**: 5 de 5 endpoints faltan → ❌ COMPLETAMENTE ROTO
6. **Terminology**: 5 de 5 endpoints faltan → ❌ COMPLETAMENTE ROTO

### Errores Moderados:
1. **Description**: 2 de 4 endpoints faltan (POST, DELETE)
2. **Fototeca**: ✅ Completamente funcional

---

## 🎯 RAÍZ DEL PROBLEMA

### Causa #1: Desarrollo Incompleto
- `cms-db.js` está **a mitad de camino**
- Solo tiene endpoints READ (GET)
- Faltan todos los endpoints WRITE (POST, PUT, DELETE)

### Causa #2: Mezcla de Sistemas
- El código usa `cms.js` (JSON) como fallback
- Pero luego se migró a `cms-db.js` (MySQL)
- Nunca se completó la migración de `cms-db.js`
- Nunca se removió `cms.js` duplicado

### Causa #3: Inconsistencia en Rutas
- El frontend llama a `/api/cms/*` indiscriminadamente
- El servidor tiene DOS archivos sirviendo la MISMA ruta
- Cuando se carga `cms.js` primero → funciona TODO (JSON)
- Cuando se carga `cms-db.js` primero → funciona solo LECTURA (MySQL)

---

## 📝 LISTA DE FIXES REQUERIDOS

### Opción 1: Completar MySQL (Recomendado)
```
Agregar a cms-db.js:
✅ Timeline: POST, PUT, DELETE
✅ Testimonies: POST, PUT, DELETE + nested endpoints
✅ Resistance: POST, PUT, DELETE + nested endpoints
✅ Analysts: GET, POST, PUT, DELETE + nested endpoints
✅ Velum: GET, POST, PUT, DELETE + nested endpoints
✅ Terminology: GET, POST, PUT, DELETE
✅ Description: POST, DELETE
```

### Opción 2: Remover Duplicación
```
1. Decidir: ¿Usar JSON o MySQL?
2. Si MySQL: Completar cms-db.js y remover cms.js
3. Si JSON: Usar cms.js y remover cms-db.js
```

---

## 🔌 IMPACTO ACTUAL

### Con MySQL Conectado:
- ✅ Panel puede LEER datos (GET funciona)
- ❌ Panel **NO PUEDE** CREAR contenido
- ❌ Panel **NO PUEDE** EDITAR contenido  
- ❌ Panel **NO PUEDE** ELIMINAR contenido
- ❌ Fototeca es la ÚNICA que funciona (CRUD completo)

### Sin MySQL (JSON Fallback):
- ✅ **TODO FUNCIONA** (JSON tiene implementación completa)
- ✅ Panel PUEDE CREAR
- ✅ Panel PUEDE EDITAR
- ✅ Panel PUEDE ELIMINAR
- ⚠️ Los datos se guardan en JSON, no en MySQL

---

## 💾 RECOMENDACIÓN

**Completar la implementación de MySQL en `cms-db.js`** agregando:
1. Todos los endpoints POST/PUT/DELETE que faltan
2. Validación de permisos consistente
3. Soporte para cambios pendientes (approval workflow)
4. Manejo de bloques de contenido (contentBlocks)

Y luego:
1. Remover `cms.js` para evitar confusión
2. Usar solo `cms-db.js` como backend oficial
3. Usar JSON fallback solo para lectura (public-api.js)
