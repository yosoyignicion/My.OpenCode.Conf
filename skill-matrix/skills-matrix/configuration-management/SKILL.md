---
name: configuration-management
description: "Configuration management externalizes settings from code via environment variables, `.env` files, and config servers"
---
# Configuration Management

## Semantic Triggers
```
configuration management settings pydantic, environment variables config, config validation startup fail fast, multi env configuration, secret injection config, pydantic base settings validation
```

---

## 1. Definición Teórica

Configuration management externalizes settings from code via environment variables, `.env` files, and config servers. Typed settings classes (Pydantic BaseSettings / envalid) validate at instantiation and fail fast on missing required values. The Twelve-Factor App principle states that config varies across deployments — code should be strictly separated from config. `.env` files for development, environment variables for production, secret managers for sensitive values. Never commit real secrets; use `.env.example` as a template with placeholder values.

---

## 2. Implementación de Referencia

TypeScript with envalid (Node) and Python with pydantic-settings, including validation, multi-env, secret injection.

### Ejemplo Práctico Avanzado

```typescript
// ===== TYPESCRIPT: envalid =====
import { str, num, bool, url, cleanEnv, makeValidator } from 'envalid';
import dotenv from 'dotenv';

// Load .env first
dotenv.config();

// Custom validator
const semver = makeValidator<string>((input: string) => {
  if (!/^\d+\.\d+\.\d+$/.test(input)) throw new Error('Must be semver format');
  return input;
});

const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production', 'test', 'staging'] as const }),
  PORT: num({ default: 3000, devDefault: 4000 }),  // different default in dev
  DATABASE_URL: url(),
  REDIS_URL: url({ default: 'redis://localhost:6379' }),
  SECRET_KEY: str(),
  LOG_LEVEL: str({ choices: ['debug', 'info', 'warn', 'error'] as const, default: 'info' }),
  APP_VERSION: semver({ default: '1.0.0' }),
  FEATURE_FLAG_NEW_CHECKOUT: bool({ default: false }),
  MAX_CONNECTIONS: num({ default: 10, min: 1, max: 100 }),
  API_EXTERNAL_URL: url({ default: undefined }),
});

// Typed and validated — throws on startup if missing required
console.log(env.DATABASE_URL);  // string, guaranteed valid URL
console.log(env.PORT);          // number, guaranteed 3000 or 4000 in dev

// ===== PYTHON: pydantic-settings =====
// config/settings.py
/*
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, SecretStr, field_validator, Field
from typing import Literal

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Required
    database_url: AnyUrl
    secret_key: SecretStr

    # Optional with defaults
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARN", "ERROR"] = "INFO"
    port: int = Field(default=8000, ge=1024, le=65535)

    # Nested prefix
    redis_url: AnyUrl = "redis://localhost:6379"
    redis_max_connections: int = 10

    # Custom validation
    @field_validator("database_url")
    @classmethod
    def validate_db_scheme(cls, v: AnyUrl) -> AnyUrl:
        allowed = {"postgresql", "postgres", "sqlite", "mysql"}
        if v.scheme not in allowed:
            raise ValueError(f"Unsupported scheme: {v.scheme}. Use: {allowed}")
        return v

settings = Settings()  # validates immediately
print(settings.database_url)
print(settings.secret_key.get_secret_value())  # careful with this!
*/

// ===== MULTI-ENVIRONMENT CONFIG =====
// config/index.ts
type Environment = 'development' | 'staging' | 'production';

interface EnvironmentConfig {
  apiUrl: string;
  sentryDsn: string | null;
  logLevel: string;
  featureFlags: Record<string, boolean>;
}

const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: 'http://localhost:3001',
    sentryDsn: null,
    logLevel: 'debug',
    featureFlags: { newCheckout: true, aiRecommendations: true },
  },
  staging: {
    apiUrl: 'https://staging-api.example.com',
    sentryDsn: 'https://staging@sentry.io/123',
    logLevel: 'info',
    featureFlags: { newCheckout: true, aiRecommendations: false },
  },
  production: {
    apiUrl: 'https://api.example.com',
    sentryDsn: env.SENTRY_DSN || null,
    logLevel: 'warn',
    featureFlags: { newCheckout: false, aiRecommendations: true },
  },
};

function getConfig(): EnvironmentConfig {
  const environment = (process.env.NODE_ENV || 'development') as Environment;
  return configs[environment];
}

// ===== SECRET INJECTION =====
// Never in .env committed. Use secret manager in production.

interface SecretProvider {
  getSecret(name: string): Promise<string>;
}

class VaultSecretProvider implements SecretProvider {
  constructor(private vaultAddr: string, private vaultToken: string) {}

  async getSecret(name: string): Promise<string> {
    const response = await fetch(`${this.vaultAddr}/v1/secret/data/${name}`, {
      headers: { 'X-Vault-Token': this.vaultToken },
    });
    const data = await response.json();
    return data.data.data.value;
  }
}

class EnvSecretProvider implements SecretProvider {
  async getSecret(name: string): Promise<string> {
    const value = process.env[name];
    if (!value) throw new Error(`Secret ${name} not found`);
    return value;
  }
}

// ===== .ENV.EXAMPLE TEMPLATE =====
// .env.example (committed to repo)
// # Copy to .env and fill in values
// DATABASE_URL=postgresql://user:password@localhost:5432/db
// SECRET_KEY=change-me-in-production
// PORT=3000
// LOG_LEVEL=info
// FEATURE_FLAG_NEW_CHECKOUT=false

// ===== CONFIG AUDIT =====
class ConfigAuditor {
  checkSecurity(env: typeof env): string[] {
    const warnings: string[] = [];

    if (env.NODE_ENV === 'production') {
      if (env.DATABASE_URL.includes('localhost')) {
        warnings.push('Production DB should not be on localhost');
      }
      if (env.LOG_LEVEL === 'debug') {
        warnings.push('Production log level should be info or warn');
      }
    }

    if (env.SECRET_KEY === 'change-me' || env.SECRET_KEY.length < 32) {
      warnings.push('SECRET_KEY is too short or default');
    }

    return warnings;
  }
}
```

**Fuente oficial:** https://docs.pydantic.dev/latest/concepts/pydantic_settings/

### Alternativa de Implementación Específica

Go with `envconfig` struct tags or `viper` for full config management (file + env + remote). Rust with `config` crate.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier aplicación en producción, sistemas multi-ambiente, compliance que requiere separation of concerns |
| **Cuándo evitar** | Scripts one-off, prototipos donde todas las configs son hardcodeadas |
| **Alternativas** | JSON/YAML config files (más flexible, menos estándar), Feature flags as a service (LaunchDarkly), Config servers (Consul, etcd) |
| **Coste/Complejidad** | Bajo. Typed settings son fáciles de implementar y mantener. Fail-fast previene bugs de configuración en producción |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Secretos commitheados por error

**¿Qué ocasionó el error?**
Un archivo `.env` con contraseñas reales se commithead al repositorio.

**¿Cómo se solucionó?**
```gitignore
# .gitignore
.env
.env.local
*.key
!*.example

# Remediation:
git rm --cached .env
git commit -m "Remove accidentally committed .env"
# Rotar todos los secretos expuestos inmediatamente
```

**¿Por qué funciona esta técnica?**
`.env` en `.gitignore` previene el problema. `.env.example` es el archivo que se commitea con placeholders. Si ocurre, rotar secretos es mandatory.

### Caso: Config faltante detectada tarde

**¿Qué ocasionó el error?**
Una variable de entorno requerida no estaba definida, pero el error solo aparecía cuando se intentaba usar, no al iniciar.

**¿Cómo se solucionó?**
```typescript
// Fail-fast: validar TODAS las configs al iniciar
function validateConfig(): void {
  const required = ['DATABASE_URL', 'SECRET_KEY', 'NODE_ENV'] as const;
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required config: ${missing.join(', ')}`);
    process.exit(1);  // fail immediately
  }
}

validateConfig();  // al inicio del entry point
```

**¿Por qué funciona esta técnica?**
Fail-fast garantiza que la aplicación no arranque con configuraciones incompletas. El error es inmediato y claro, no un crash misterioso en runtime.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~780 tokens estimados al invocar este skill
- **Trigger de activación:** "configuration management", "environment variables", "env file", "pydantic settings", "config validation", "secrets"
- **Prioridad de carga:** Alta — esencial para cualquier aplicación
- **Dependencias:** `06-seguridad-sdlc/10-key-management-kms-rotation`, `08-ingenieria-herramientas/07-dotenv-environment-vars`

### Tool Integration

```json
{
  "tool_name": "configuration-management",
  "description": "Implements config management: typed settings, .env files, multi-env config, secret injection, fail-fast validation, config audit",
  "triggers": ["configuration", "env vars", "settings", "pydantic settings", "config validation", "secrets"],
  "context_hint": "Inject when user asks about configuration or environment management",
  "output_format": "code examples with envalid and pydantic-settings",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre gestión de configuración o variables de entorno, carga el skill configuration-management
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Run with specific env
NODE_ENV=production DATABASE_URL=postgres://... node app.js

# Validate .env file
node -e "require('./dist/config'); console.log('Config valid')"

# Check current config
curl -s http://localhost:3000/admin/config | jq '.'

# Generate .env.example
grep -r "process.env\." app/ | sort -u > .env.example
```

### GUI / Web

- **Vault UI**: Gestión de secretos en HashiCorp Vault
- **Doppler**: Dashboard de configuración multi-ambiente
- **AWS Parameter Store / Secrets Manager**: Consolas de gestión de config

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Validate config | `node -e "require('./config'); console.log('OK')"` | — |
| Check env vars | `printenv | grep MY_APP` | Doppler dashboard |

---

## 7. Cheatsheet Rápido

```typescript
// envalid: cleanEnv(process.env, { PORT: num({ default: 3000 }) })
// Python: class Settings(BaseSettings): database_url: AnyUrl
// .env: KEY=VALUE (never committed)
// .env.example: KEY=placeholder (committed)
// Fail-fast: validate at startup, exit if missing required
// Secrets: never in code, use secret manager or env vars
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-ingenieria-herramientas/07-dotenv-environment-vars` | Herramienta | Sí |
| `06-seguridad-sdlc/10-key-management-kms-rotation` | Complementario | No |
| `02-arquitectura-diseno/34-structured-logging-patterns` | Complementario | No |
| `04-devops-platform/12-secret-management-vault-integration` | Herramienta | No |
| `02-arquitectura-diseno/37-configuration-management` | — | — |

---

## 9. Metadatos del Skill

```yaml
---
id: configuration-management
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/37-configuration-management
tags: [configuration, env-vars, pydantic-settings, config-validation, fail-fast, secrets, dotenv]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
