---
name: dotenv-environment-vars
description: "dotenv resuelve el problema de gestionar configuración sensible por entorno (desarrollo, testing, producción) sin hardcodear valores en el código fuente"
---
# dotenv-environment-vars

## Semantic Triggers
```
dotenv .env file loading Node.js, dotenvx encrypted .env for production, .env.example template committed, .env.production .env.test environment files, dotenvx encrypt decrypt key management, environment variable validation required keys
```

---

## 1. Definición Teórica

dotenv resuelve el problema de gestionar configuración sensible por entorno (desarrollo, testing, producción) sin hardcodear valores en el código fuente. El principio fundamental es el *principio de externalización* de The Twelve-Factor App: la configuración varía entre deploys, el código no. Un archivo `.env` local contiene valores de desarrollo, se ignora en git, mientras que `.env.example` sirve como template documentado. `dotenvx` extiende el concepto con cifrado para commits seguros — los valores encriptados pueden versionarse sin exponer secretos. La validación temprana de variables requeridas evita runtime errors por configuración incompleta.

## 2. Implementación de Referencia

La implementación recomendada usa `dotenv` para desarrollo local y `@dotenvx/dotenvx` para producción con valores encriptados. `.env` en `.gitignore`. `.env.example` con placeholder values commiteado. `dotenvx encrypt` cifra valores para commits seguros. La clave va al secret manager, no al repo.

### Ejemplo Práctico Avanzado

```javascript
// .env
HELLO="world"
SECRET_KEY="sk-..."

// index.js — dotenv (local dev)
require('dotenv').config()
// or: import 'dotenv/config'

// index.js — dotenvx (encrypted production)
require('@dotenvx/dotenvx').config()
// or: import '@dotenvx/dotenvx/config'

// Options
require('dotenv').config({ path: '/custom/path/.env', quiet: true, override: true })
```

```python
# Python equivalente con python-dotenv
from dotenv import load_dotenv
load_dotenv()                        # carga .env
load_dotenv(".env.production")        # entorno específico

# Validación de vars requeridas
import os
REQUIRED = ["DATABASE_URL", "SECRET_KEY", "API_ENDPOINT"]
missing = [v for v in REQUIRED if not os.getenv(v)]
if missing:
    raise RuntimeError(f"Missing required env vars: {missing}")
```

**Fuente oficial:** https://github.com/motdotla/dotenv — https://github.com/dotenvx/dotenvx

### Alternativa de Implementación Específica

Para proyectos Python, `python-dotenv` es la alternativa equivalente a dotenv JS. Para configuración con type safety y validación de tipos, usar `pydantic-settings` (basado en Pydantic v2): define clases con tipos y defaults, parse de `.env` automático. Para proyectos cloud-native, usar secrets manager nativo (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) en lugar de dotenvx.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Proyectos con múltiples entornos (dev/staging/prod), secretos locales que no deben versionarse, onboarding rápido de desarrolladores nuevos |
| **Cuándo evitar** | Proyectos con secret manager cloud nativo (AWS Secrets Manager, Vault) — añade dotenv como capa redundante. Configuración que no varía entre entornos — usar defaults en código |
| **Alternativas** | pydantic-settings: validación tipada con schemas Pydantic; cloud secrets manager: AWS/GCP/Azure native, rotación automática; HashiCorp Vault: enterprise-grade, dynamic secrets, leasing |
| **Coste/Complejidad** | Bajo: dotenv es cero-config; medio con dotenvx (gestión de claves de cifrado); alto si se combinan múltiples fuentes (env file + secrets manager + env vars del SO) con precedencia |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Variables con espacios en .env no se cargan correctamente

**¿Qué ocasionó el error?**
`KEY=value with spaces` sin comillas. dotenv por defecto tokeniza por espacios.

**¿Cómo se solucionó?**
Usar comillas: `KEY="value with spaces"` o `KEY='value with spaces'`. Los valores con comillas se parsean como string completo.

**¿Por qué funciona esta técnica?**
dotenv respeta quoting similar a bash. Comillas dobles y simples delimitan el valor completo.

### Caso: dotenv sobrescribe variables de entorno del sistema

**¿Qué ocasionó el error?**
`load_dotenv(override=True)` sobrescribe `PATH`, `HOME` y otras vars del sistema definidas en `.env`.

**¿Cómo se solucionó?**
Usar `override=False` (default) o cargar solo `.env` específico del proyecto. Documentar en `.env.example` qué variables son de proyecto vs sistema.

**¿Por qué funciona esta técnica?**
dotenv no sobrescribe vars existentes por defecto. El flag `override=True` fuerza sobreescritura y debe usarse con cuidado.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** Configuración de variables de entorno, secretos, .env file setup
- **Prioridad de carga:** Media — transversal pero no complejo; cargar junto con el skill del framework principal
- **Dependencias:** Ninguna; útil como complemento de cualquier skill que use configuración

### Tool Integration

```json
{
  "tool_name": "dotenv-environment-vars",
  "description": "Configura variables de entorno con dotenv/dotenvx, validación, .env.example y cifrado",
  "triggers": [".env", "environment variables", "dotenv", "configuration", "secrets", "env file"],
  "context_hint": "Inyectar la tabla de file convention + safety rules cuando el usuario pregunte sobre setup de entorno",
  "output_format": "markdown",
  "max_tokens": 800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre variables de entorno o configuración, carga el skill dotenv-environment-vars
y responde siguiendo la sección de implementación de referencia con ejemplos de .env + validación.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# dotenvx encrypt — cifrar .env para commits seguros
dotenvx encrypt
# genera .env.encrypted, .env.keys (NO commitear .env.keys)

# Ver .env actual (sin valores sensibles)
dotenvx ls

# Ejecutar comando con .env específico
dotenvx run -- node app.js
dotenvx run -f .env.production -- node app.js

# Python
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('KEY'))"

# Validar .env con schema
dotenvx ext validate --schema-file .env.example

# Precommit hook — .env.example sync automático
dotenvx ext precommit --install

# Node.js — modo debug dotenv
DEBUG=dotenv node app.js
```

### GUI / Web

- **dotenvx VSCode Extension:** Syntax highlighting para `.env`, `.env.encrypted`, autocompletado de claves
- **dotenvx Dashboard (web):** UI para gestionar `.env.encrypted` y claves por equipo (dotenvx.com)
- **GitGuardian:** Detecta secretos commiteados en PRs — complementa dotenvx
- **Infisical:** Self-hosted o cloud — gestión centralizada de secretos con dotenv export

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Cargar .env | `dotenvx run -- node app.js` | Launch config → envFile |
| Encriptar | `dotenvx encrypt` | Command Palette → Encrypt |
| Validar | `dotenvx ext validate` | VSCode problem matcher |
| Ver claves | `dotenvx ls` | Dotenvx Dashboard tab |

---

## 7. Cheatsheet Rápido

```bash
# .env.example template (committed)
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
SECRET_KEY="change-me-in-production"
API_ENDPOINT="http://localhost:3000"
```

```javascript
require('dotenv').config()
const missing = ["DATABASE_URL","SECRET_KEY"].filter(k => !process.env[k])
if (missing.length) throw new Error(`Missing: ${missing}`)
```

```bash
# dotenvx (production)
dotenvx encrypt && dotenvx run -- node app.js
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `fastapi-rest-development` | Complementario — configuración DB_URL, SECRET_KEY en API | Sí |
| `python-packaging-pyproject` | Complementario — variables de entorno en desarrollo | No |
| `postgresql-advanced` | Complementario — DATABASE_URL para conexión | Sí |
| `redis-caching-patterns` | Complementario — REDIS_URL y configuración de caché | No |

---

## 9. Metadatos del Skill

```yaml
---
id: dotenv-environment-vars
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/dotenv
tags: [dotenv, env, environment, configuration, secrets, dotenvx, twelve-factor, python-dotenv]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
