---
name: fastapi-rest-development
description: "FastAPI resuelve el problema de construir APIs REST con validación automática, documentación interactiva y alto rendimiento"
---
# fastapi-rest-development

## Semantic Triggers
```
FastAPI REST API Pydantic v2 validation, APIRouter dependency injection Depends, async lifespan context manager app factory, HTTPException status codes 404 409 403, Pydantic model_dump from_attributes, CRUD endpoints POST GET PUT DELETE
```

---

## 1. Definición Teórica

FastAPI resuelve el problema de construir APIs REST con validación automática, documentación interactiva y alto rendimiento. El principio fundamental es el uso de type hints de Python para definir esquemas de datos (Pydantic v2), que generan automáticamente validación de entrada/salida, serialización y documentación OpenAPI. Arquitectónicamente, FastAPI se sitúa sobre Starlette (ASGI), heredando su modelo asíncrono y soporte nativo para WebSockets, Server-Sent Events y streaming. Existe como alternativa moderna a Flask/Django REST Framework para APIs que requieren type-safety, rendimiento y documentación auto-generada.

## 2. Implementación de Referencia

La implementación recomendada usa FastAPI con Pydantic v2 schemas, app factory pattern con `lifespan` para startup/shutdown, router por recurso con prefix + tags, `Depends` injection para sesiones DB/auth, `model_dump()` sobre legacy `.dict()`, y `from_attributes=True` sobre `orm_mode`.

### Ejemplo Práctico Avanzado

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Depends, HTTPException

@asynccontextmanager
async def lifespan(app): yield

def create_app():
    app = FastAPI(lifespan=lifespan)
    app.include_router(users.router, prefix="/users", tags=["users"])
    return app

router = APIRouter()

@router.post("/")
def create(payload: UserCreate, db=Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(409, "Email exists")
    user = User(**payload.model_dump())
    db.add(user); db.commit(); db.refresh(user)
    return user

from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; email: str; name: str
```

**Fuente oficial:** https://fastapi.tiangolo.com/ — https://docs.pydantic.dev/latest/

### Alternativa de Implementación Específica

Para APIs que requieren GraphQL, usar Strawberry (type-safe, codegen desde schema). Para APIs puramente asíncronas con WebSockets pesados, considerar Litestar (ASGI nativo, DI avanzado, WebSocket nativo sin dependencia extra). Para APIs mínimas de alto rendimiento, usar `FastAPI` sin `Depends` y con handlers síncronos para evitar overhead del event loop.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | APIs REST con validación compleja, documentación automática, equipos TypeScript/Python que valoran type hints; proyectos que necesitan OpenAPI para codegen de cliente |
| **Cuándo evitar** | APIs extremadamente simples (Flask con Pydantic es más ligero); proyectos que requieren GraphQL puro; equipos que evitan async/await (Flask+WSGI es más simple) |
| **Alternativas** | Flask + Pydantic + marshmallow: más control, menos magia; Litestar: ASGI nativo con DI avanzado sin dependencias; Django + DRF: ecosistema completo (ORM, admin, auth) pero más pesado |
| **Coste/Complejidad** | Bajo para CRUD simple; medio con auth, rate limiting, background tasks; alto si se combina con WebSockets + streaming + long polling. La documentación OpenAPI reduce drásticamente el coste de comunicación frontend-backend |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Pydantic v1 schema no valida correctamente con v2

**¿Qué ocasionó el error?**
`orm_mode = True` y `.dict()` son de v1 y no funcionan en v2. `ConfigDict.from_attributes` reemplaza `orm_mode`. `model_dump()` reemplaza `.dict()`.

**¿Cómo se solucionó?**
Cambiar `class Config: orm_mode = True` → `model_config = ConfigDict(from_attributes=True)`. Cambiar `.dict()` → `.model_dump()`. Cambiar `@validator` → `@field_validator`.

**¿Por qué funciona esta técnica?**
Pydantic v2 reescribió el motor de validación en Rust (pydantic-core). Las APIs cambiaron para ser más explícitas y performantes.

### Caso: CORS bloquea peticiones desde frontend local

**¿Qué ocasionó el error?**
El frontend (localhost:3000) hace fetch a la API (localhost:8000). El navegador bloquea la petición por política CORS.

**¿Cómo se solucionó?**
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
```

**¿Por qué funciona esta técnica?**
FastAPI añade los headers `Access-Control-Allow-Origin` en las respuestas, indicando al navegador que el origen está permitido.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~700 tokens estimados al invocar este skill
- **Trigger de activación:** API REST endpoint CRUD, FastAPI app, validación Pydantic
- **Prioridad de carga:** Alta — FastAPI es el framework REST dominante en Python 2026
- **Dependencias:** Cargar con `pydantic-v2` y `async-python-concurrency` para endpoints async

### Tool Integration

```json
{
  "tool_name": "fastapi-rest-development",
  "description": "Construye APIs REST con FastAPI + Pydantic v2 incluyendo routers, DI, validación y CRUD",
  "triggers": ["fastapi", "api rest", "pydantic", "endpoint", "crud", "openapi"],
  "context_hint": "Inyectar ejemplo de router + schema + DI cuando el usuario pida endpoints; FAQ para errores comunes",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre APIs REST en Python, carga el skill fastapi-rest-development y responde
siguiendo la sección de implementación de referencia con Pydantic v2 y app factory pattern.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Iniciar servidor con recarga automática
fastapi dev main.py           # uvicorn con recarga
uvicorn app.main:app --reload --port 8000

# Probar endpoints
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","name":"Alice"}'

# Documentación interactiva (abrir en navegador)
open http://localhost:8000/docs        # Swagger UI
open http://localhost:8000/redoc       # ReDoc

# Generar cliente TypeScript desde OpenAPI
npx openapi-typescript http://localhost:8000/openapi.json -o client.ts

# Tests con TestClient
pytest tests/ -v -k "user"
```

### GUI / Web

- **Swagger UI (/docs):** Probar endpoints interactivamente desde el navegador
- **ReDoc (/redoc):** Documentación más legible (3-column layout)
- **VSCode:** REST Client extension — archivos `.http` para probar endpoints
- **Postman/Insomnia:** Importar OpenAPI desde `/openapi.json`
- **FastAPI Debugger:** VSCode launch.json con `"module": "uvicorn"` para debugging paso a paso

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Start dev server | `fastapi dev main.py` | Ctrl+F5 (VSCode) |
| Open docs | `open http://localhost:8000/docs` | Ctrl+Click on terminal URL |
| Test endpoint | `curl -X POST ...` | REST Client → Send Request |
| Regenerate client | `npx openapi-typescript ...` | Pre-commit hook |

---

## 7. Cheatsheet Rápido

```python
from fastapi import FastAPI, APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/items", tags=["items"])
app = FastAPI(); app.include_router(router)

class ItemIn(BaseModel):
    name: str
class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; name: str

@router.post("/", response_model=ItemOut)
def create(payload: ItemIn, db=Depends(get_db)):
    obj = Model(**payload.model_dump()); db.add(obj); db.commit(); db.refresh(obj)
    return obj
```

```bash
fastapi dev main.py && curl localhost:8000/docs
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `async-python-concurrency` | Complementario — handlers async, lifespan, tareas background | Sí |
| `pytest-testing-quality` | Complementario — TestClient y tests de integración | Sí |
| `python-packaging-pyproject` | Complementario — dependencia FastAPI en pyproject.toml | Sí |
| `sqlite-sqlalchemy-persistence` | Complementario — DB session management + DI | No |

---

## 9. Metadatos del Skill

```yaml
---
id: fastapi-rest-development
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/fastapi-crud
tags: [fastapi, pydantic, rest, api, python, openapi, swagger, crud, async]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
