---
name: docker-compose-watch
description: "Docker Compose Watch resuelve el problema del desarrollo local con contenedores: cómo sincronizar cambios de código en tiempo real sin reconstruir manualmente la imagen"
---
# docker-compose-watch

## Semantic Triggers
```
Docker Compose watch file sync hot reload, develop watch sync rebuild sync+restart, docker compose up --watch live development, ignore node_modules .git IDE temp files, bind mount vs watch granularity, action sync: copy files to container
```

---

## 1. Definición Teórica

Docker Compose Watch resuelve el problema del desarrollo local con contenedores: cómo sincronizar cambios de código en tiempo real sin reconstruir manualmente la imagen. El principio fundamental es que durante el desarrollo, los archivos del host deben reflejarse en el contenedor sin pasar por el build de la imagen Docker. A diferencia de bind mounts tradicionales (que sincronizan todo un directorio), Watch ofrece granularidad: `sync` copia archivos específicos sin reiniciar, `rebuild` reconstruye la imagen cuando cambian dependencias, y `sync+restart` copia archivos y reinicia el proceso. Arquitectónicamente, es un reemplazo moderno de herramientas como `nodemon` + bind mount, integrado nativamente en Docker Compose 2.22+.

## 2. Implementación de Referencia

La implementación recomendada usa Docker Compose 2.22+ con `docker compose up --watch`. Define `develop.watch` en `compose.yaml` con acciones `sync`, `rebuild` y `sync+restart`. Ignora `node_modules/`, `.git`, y archivos temporales de IDE automáticamente.

### Ejemplo Práctico Avanzado

```yaml
services:
  web:
    build: .
    develop:
      watch:
        - action: sync
          path: ./web
          target: /src/web
          initial_sync: true
          ignore:
            - node_modules/
        - action: rebuild
          path: package.json
        - action: sync+restart
          path: ./nginx.conf
          target: /etc/nginx/conf.d/default.conf
  db:
    image: postgres:17
    develop:
      watch:
        - action: sync
          path: ./init-db
          target: /docker-entrypoint-initdb.d
```

```sh
docker compose up --watch
# or separately:
docker compose up -d
docker compose watch
```

**Fuente oficial:** https://docs.docker.com/compose/file-watch/

### Alternativa de Implementación Específica

Para proyectos que no pueden usar Docker Compose 2.22+, usar bind mounts tradicionales (`volumes:`) + herramientas externas de hot-reload (nodemon, air, reflex). Para desarrollo con Tilt (Kubernetes local), el equivalente es `tilt up` con live_update. Para entornos serverless, `serverless-offline` + `--watch`. La principal diferencia frente a bind mounts es granularidad: Watch permite sync parcial y acciones específicas por archivo.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Desarrollo local con Docker Compose, proyectos JavaScript/Python/Go con hot-reload, equipos que necesitan ciclo rápido de edit → see changes en contenedor |
| **Cuándo evitar** | Producción (Watch no está diseñado para deploy); proyectos que ya usan Tilt/Skaffold (herramientas más potentes); bind mounts funcionan bien para equipos pequeños con config simple |
| **Alternativas** | Tilt: live_update + build profiles + K8s integration; Skaffold: file sync + build + deploy para K8s; Bind mounts: más simples pero menos granulares; Compose Classic volumes: funcional pero sin acciones condicionales |
| **Coste/Complejidad** | Bajo: `docker compose up --watch` es un comando único; medio: configurar acciones correctas (sync vs rebuild vs sync+restart); bajo: no require herramientas externas ni config adicional del framework |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: sync no copia archivos al contenedor

**¿Qué ocasionó el error?**
El contenedor ejecuta el proceso con un usuario diferente (`USER appuser`) que no tiene permisos de escritura en el `target`.

**¿Cómo se solucionó?**
Asegurar que el usuario del contenedor tenga permisos en el directorio target. En Dockerfile: `RUN chown -R appuser:appuser /src/web` o usar `USER root` temporal para sync.

**¿Por qué funciona esta técnica?**
Watch copia archivos usando `cp` dentro del contenedor. Si el usuario no tiene permiso de escritura, la copia falla silenciosamente.

### Caso: `ignore` no excluye `node_modules`

**¿Qué ocasionó el error?**
El patrón `ignore: ["node_modules"]` no coincide con subdirectorios. Los directorios se vigilan recursivamente.

**¿Cómo se solucionó?**
Asegurar usar `node_modules/` con trailing slash:
```yaml
ignore:
  - node_modules/
  - .git/
```

**¿Por qué funciona esta técnica?**
Watch requiere trailing slash para ignorar directorios completos. Sin trailing slash, el patrón no coincide con subdirectorios.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** docker compose watch, hot reload con contenedores, desarrollo con Docker
- **Prioridad de carga:** Alta — desarrollo local con contenedores es práctica estándar
- **Dependencias:** Cargar junto con `bash-scripting-advanced` si se usan entrypoints script

### Tool Integration

```json
{
  "tool_name": "docker-compose-watch",
  "description": "Configura Docker Compose Watch para desarrollo local con hot-reload vía sync/rebuild/sync+restart",
  "triggers": ["docker compose watch", "docker hot reload", "compose develop", "docker dev", "file sync docker"],
  "context_hint": "Inyectar ejemplo compose.yaml con develop.watch cuando el usuario necesite hot-reload en Docker",
  "output_format": "markdown",
  "max_tokens": 800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre desarrollo local con Docker, carga el skill docker-compose-watch y responde
siguiendo la sección de implementación de referencia con ejemplos de sync/rebuild/sync+restart.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Iniciar con watch (hot reload automático)
docker compose up --watch

# En terminal separada
docker compose up -d && docker compose watch

# Ver logs del watch
docker compose logs --follow

# Build inicial + watch
docker compose up --build --watch

# Sin watch (modo normal)
docker compose up

# Ver servicios activos
docker compose ps

# Detener todo
docker compose down
```

### GUI / Web

- **Docker Desktop:** Dashboard visual de contenedores, logs, terminal integrada. Watch activo se ve en la columna "Watching" de cada contenedor
- **VSCode Dev Containers:** "Reopen in Container" con Dev Container — integración más profunda que Watch
- **Portainer:** GUI web para gestión de contenedores, pero no soporta watch directamente
- **LazyDocker:** TUI en terminal para ver logs y estado de contenedores

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Up with watch | `docker compose up --watch` | Docker Desktop → Start |
| Watch logs | `docker compose logs -f web` | Container → Logs tab |
| Restart service | `docker compose restart web` | Container → Restart |
| Open shell | `docker compose exec web bash` | Container → Exec |
| Down | `docker compose down` | Container → Stop |

---

## 7. Cheatsheet Rápido

```yaml
services:
  web:
    build: .
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json
        - action: sync+restart
          path: ./config
          target: /app/config
```

```bash
docker compose up --watch && docker compose logs -f
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `bash-scripting-advanced` | Complementario — entrypoint scripts en Docker | Sí |
| `background-jobs-queues` | Complementario — docker compose con worker + Redis | Sí |
| `postgresql-advanced` | Complementario — servicio db en docker compose | No |
| `redis-caching-patterns` | Complementario — servicio redis en docker compose | No |

---

## 9. Metadatos del Skill

```yaml
---
id: docker-compose-watch
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ocs-shared-skills/docker-compose-watch
tags: [docker, docker-compose, watch, hot-reload, development, compose, file-sync, dev-container]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
