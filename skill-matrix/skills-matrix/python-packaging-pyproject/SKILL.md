---
name: python-packaging-pyproject
description: "Python packaging moderno resuelve el problema de distribuir, instalar y versionar código Python de forma reproducible"
---
# python-packaging-pyproject

## Semantic Triggers
```
pyproject.toml modern Python packaging, uv fast package manager pip alternative, hatchling build backend, entry points console_scripts CLI, optional dependencies dev test web groups, sdist wheel build twine publish PyPI
```

---

## 1. Definición Teórica

Python packaging moderno resuelve el problema de distribuir, instalar y versionar código Python de forma reproducible. El principio fundamental es el PEP 621 que centraliza toda la configuración en un único `pyproject.toml`, eliminando el caos de `setup.py`/`setup.cfg`/`requirements.txt`. Arquitectónicamente, se separa el *build backend* (hatchling, setuptools, poetry) del *package manager* (uv, pip, poetry). Existe como evolución necesaria tras años de fragmentación en el ecosistema Python, proporcionando un estándar unificado para desarrollo, CI/CD y publicación.

## 2. Implementación de Referencia

La implementación recomendada usa `hatchling` como build backend (zero-config, estándar) y `uv` como package manager (10-100x más rápido que pip). Entry points via `[project.scripts]`. Grupos de dependencias opcionales con `[project.optional-dependencies]`. Build: `uv build` → `uv publish`.

### Ejemplo Práctico Avanzado

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-package"
version = "0.1.0"
description = "A useful Python package"
readme = "README.md"
requires-python = ">=3.11"
license = { text = "MIT" }
authors = [{ name = "Alice", email = "alice@example.com" }]
dependencies = ["httpx>=0.27", "pydantic>=2.0"]
[project.optional-dependencies]
dev = ["pytest>=8", "ruff>=0.5", "mypy>=1.10"]
web = ["fastapi>=0.110", "uvicorn[standard]"]
[project.scripts]
my-cli = "my_package.cli:main"
[tool.ruff]
line-length = 100
[tool.pytest.ini_options]
testpaths = ["tests"]
```

```bash
# uv commands
uv venv && uv pip sync pyproject.toml && uv pip install -e ".[dev]"
uv lock && uv add httpx && uv build && uv publish
```

**Fuente oficial:** https://packaging.python.org/ — https://hatch.pypa.io/ — https://docs.astral.sh/uv/

### Alternativa de Implementación Específica

Si el proyecto requiere dependencias dinámicas o scripts de build complejos (extensiones C, bindings), usar `setuptools` con `setup.py` mínimo + `pyproject.toml`. Para monorepos con múltiples paquetes interdependientes, considerar `pixi` (conda-based) o `rye` (uv-based con workspace support). Poetry sigue siendo viable pero más lento y con lockfile propio.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Paquetes Python nuevos o migraciones, proyectos con dependencias claras, equipos que usan Python 3.11+, publicación en PyPI |
| **Cuándo evitar** | Proyectos que requieren setup.py dinámico (build-time code generation complejo), dependencias condicionales por plataforma, proyectos legacy con setup.py extenso sin tiempo de migración |
| **Alternativas** | poetry: lockfile propio, más lento pero con CLI unificada; rye: workspace monorepo nativo, basado en uv; conda/pixi: para data science con dependencias nativas (C, CUDA) |
| **Coste/Complejidad** | Bajo para paquetes simples sin dependencias nativas; medio si se necesita compilar C-extensions o distribuir binarios (manylinux). uv reduce drásticamente el tiempo de instalación en CI |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: ImportError after pip install — módulo no encontrado

**¿Qué ocasionó el error?**
La estructura de directorios no coincide con el `name` en `[project]`. Si el proyecto se llama `my-package`, pip espera un directorio `my_package/` (guión bajo, no guión). O el `package-dir` no está configurado.

**¿Cómo se solucionó?**
Añadir `[tool.hatch.build.targets.wheel] packages = ["my_package"]` o renombrar el directorio para que coincida con el `name` normalizado (guiones bajos).

**¿Por qué funciona esta técnica?**
PEP 423 normaliza los nombres de paquete reemplazando guiones con guiones bajos. El build backend debe saber qué directorios incluir en el wheel.

### Caso: uv lock conflict — dependencias incompatibles

**¿Qué ocasionó el error?**
Dos dependencias requieren versiones diferentes de la misma librería (ej: httpx>=0.27 vs httpx<0.28 + otra que requiere >=0.28).

**¿Cómo se solucionó?**
Usar `uv tree` para visualizar el árbol de dependencias y encontrar el conflicto. Luego actualizar la dependencia problemática o usar `uv add --upgrade-package <name>`.

**¿Por qué funciona esta técnica?**
uv calcula el grafo de dependencias completo (SAT solver) y reporta conflictos con precisión. `uv tree` permite inspeccionar qué paquete trae cada dependencia transitiva.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~700 tokens estimados al invocar este skill
- **Trigger de activación:** Necesito empaquetar mi proyecto Python, pyproject.toml setup, configuración
- **Prioridad de carga:** Alta — es el skill fundacional para cualquier proyecto Python
- **Dependencias:** Ninguna; puede cargarse junto con `pytest-testing-quality`, `fastapi-rest-development`

### Tool Integration

```json
{
  "tool_name": "python-packaging-pyproject",
  "description": "Configura pyproject.toml, build backend, dependencias, entry points y publicación usando hatchling + uv",
  "triggers": ["pyproject.toml", "pip install", "uv", "hatchling", "python packaging", "pypi", "dependencies"],
  "context_hint": "Inyectar la sección 2 completa cuando el usuario necesite crear o debuggear un pyproject.toml",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre empaquetado Python, carga el skill python-packaging-pyproject y responde
siguiendo la sección de implementación de referencia. Prioriza uv + hatchling sobre setuptools legacy.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Proyecto nuevo
uv init my-package
cd my-package

# Entorno virtual + dependencias
uv venv
source .venv/bin/activate
uv add httpx pydantic
uv add --dev pytest ruff mypy

# Instalar en modo editable
uv pip install -e ".[dev]"

# Lockfile reproducible
uv lock

# Build
uv build          # genera dist/*.tar.gz + dist/*.whl

# Publicar
uv publish        # solicita token PyPI

# Con pip tradicional
pip install -e ".[dev]"
python -m build
twine check dist/*
twine upload dist/*
```

### GUI / Web

- **PyPI (pypi.org):** Dashboard de paquetes publicados, releases, estadísticas de descarga
- **GitHub + PyPI:** Trusted publishing via OIDC — sin tokens manuales
- **VSCode:** Pylance resuelve tipos desde pyproject.toml; Ruff lintea automáticamente
- **Dependabot/Renovate:** PRs automáticos para actualizar dependencias en pyproject.toml

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Crear proyecto | `uv init .` | Ctrl+Shift+P → Python: Create Environment |
| Añadir dep | `uv add httpx` | Ctrl+Shift+P → Add Dependency |
| Ejecutar tests | `uv run pytest` | Ctrl+Shift+P → Python: Run Tests |
| Build + publish | `uv build && uv publish` | GitHub Actions trigger |

---

## 7. Cheatsheet Rápido

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
[project]
name = "pkg"; version = "0.1.0"; requires-python = ">=3.11"
dependencies = ["httpx"]
[project.optional-dependencies]
dev = ["pytest"]
[project.scripts]
cli = "pkg.cli:main"
```

```bash
uv init . && uv add httpx && uv lock && uv build && uv publish
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `pytest-testing-quality` | Complementario — pytest en optional-dependencies dev | Sí |
| `fastapi-rest-development` | Complementario — dependencia web típica en pyproject | Sí |
| `dotenv-environment-vars` | Complementario — configuración de entorno en desarrollo | No |
| `docker-compose-watch` | Complementario — empaquetado para deploy containerizado | No |

---

## 9. Metadatos del Skill

```yaml
---
id: python-packaging-pyproject
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/python-packaging
tags: [python, packaging, pyproject.toml, uv, hatchling, pip, pypi, dependencies]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
