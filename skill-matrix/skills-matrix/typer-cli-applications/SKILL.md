---
name: typer-cli-applications
description: "Typer resuelve el problema de construir interfaces de línea de comandos (CLI) en Python con mínima ceremonia, aprovechando type hints para generar automáticamente parsing de argumentos, help text y..."
---
# typer-cli-applications

## Semantic Triggers
```
Typer CLI app subcommands Annotated arguments options, Rich integration rich_markup_mode colorful output, typer.Abort error handling, Click compatibility migration, required optional arguments with Annotated, multiple values list option typer
```

---

## 1. Definición Teórica

Typer resuelve el problema de construir interfaces de línea de comandos (CLI) en Python con mínima ceremonia, aprovechando type hints para generar automáticamente parsing de argumentos, help text y validación. El principio fundamental es que los parámetros de la función decorada con `@app.command()` determinan automáticamente el comportamiento del CLI — tipos, defaults, required/optional. Construido sobre Click, hereda su robustez pero con una API más declarativa y menos boilerplate. Arquitectónicamente, Typer sigue el patrón de *declarative CLI* (inspirado en FastAPI), donde la documentación y validación se derivan del código, no se duplican.

## 2. Implementación de Referencia

La implementación recomendada usa `Typer()` (no `typer.run()`) para extensibilidad con subcomandos. `Annotated` style para argumentos/options (Python 3.10+). `typer.Abort()` para errores limpios. `rich_markup_mode="rich"` para output coloreado. Multiple values via `Annotated[list[str] | None, typer.Option()]`.

### Ejemplo Práctico Avanzado

```python
import typer
from typing import Annotated

app = typer.Typer()  # Always use Typer() over typer.run()

@app.command()
def hello(name: str):
    print(f"Hello {name}")

# Annotated Style (preferred)
# Optional argument with default
def hello(name: Annotated[str, typer.Argument()] = "World"):
    print(f"Hello {name}")

# Required option with short flag
def main(user_name: Annotated[str, typer.Option("--name", "-n")]):
    pass

# Multiple values
def main(user: Annotated[list[str] | None, typer.Option()] = None):
    if not user: raise typer.Abort()
    for u in user: print(f"Processing {u}")

# Rich Markup
app = typer.Typer(rich_markup_mode="rich")
print("[bold red]Alert![/bold red] :boom:")
```

**Fuente oficial:** https://typer.tiangolo.com/ — https://rich.readthedocs.io/

### Alternativa de Implementación Específica

Si el CLI requiere verificación tipográfica con mypy/pyright estricta, usar `Annotated` con `typer.Argument(help="...")` en lugar del estilo positional. Para CLIs extremadamente simples (un solo comando sin opciones), `typer.run()` es aceptable. Para migración desde Click, Typer permite usar opciones Click legacy dentro de un comando Typer mediante `ctx.ensure_object(dict)`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Herramientas CLI Python: scripts de gestión, migraciones, import/export, herramientas DevOps. Equipos Python 3.10+ que valoran type hints y autocompletado |
| **Cuándo evitar** | CLIs que requieren parsing extremadamente complejo (múltiples niveles de subcomandos anidados con herencia de opciones) — Click puro es más explícito. Scripts de una sola línea — argparse built-in es suficiente |
| **Alternativas** | Click: más control granular, callbacks, grupos complejos; argparse: built-in, zero dependencies, más verboso; Rich CLI: CLI + TUI con paneles y tablas interactivas |
| **Coste/Complejidad** | Bajo para CLIs simples con 1-5 comandos; medio para multi-comando con opciones compartidas y callbacks de validación; alto si se combina con Rich progresivo (spinners, paneles) que añade complejidad al testing |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: typer.Option() no detecta el flag corto correctamente

**¿Qué ocasionó el error?**
Typer genera nombres automáticos basados en el nombre del parámetro. Para `verbose: bool`, Typer crea `--verbose`/`--no-verbose`. El flag corto `-v` debe especificarse explícitamente.

**¿Cómo se solucionó?**
```python
def main(verbose: Annotated[bool, typer.Option("--verbose", "-v")] = False):
    pass
```

**¿Por qué funciona esta técnica?**
Typer permite especificar manualmente el nombre largo y corto. Si no se especifica, autogenera basado en el nombre del parámetro.

### Caso: typer.Abort() no muestra mensaje de error

**¿Qué ocasionó el error?**
`typer.Abort()` lanza SystemExit sin mensaje. Si no se imprime un mensaje antes, el usuario no sabe por qué falló.

**¿Cómo se solucionó?**
```python
if not user:
    typer.echo("Error: No users provided", err=True)
    raise typer.Abort()
```

**¿Por qué funciona esta técnica?**
`typer.echo()` imprime a stderr; `typer.Abort()` lanza SystemExit(1). Combinados, proveen mensaje de error + exit code correcto.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** Crear CLI Python con argumentos y opciones, Typer app
- **Prioridad de carga:** Alta — Typer es el estándar para CLI Python moderno
- **Dependencias:** Ninguna; complementario con `python-packaging-pyproject` para entry_points

### Tool Integration

```json
{
  "tool_name": "typer-cli-applications",
  "description": "Construye CLIs Python con Typer: argumentos, opciones, subcomandos, Rich markup y validación",
  "triggers": ["typer", "cli", "command line", "python cli", "entry points", "console scripts"],
  "context_hint": "Inyectar ejemplo Annotated style + subcomandos cuando el usuario necesite un CLI; FAQ para debugging",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre crear una CLI Python, carga el skill typer-cli-applications y responde
siguiendo la sección de implementación de referencia. Prioriza Annotated style sobre positional arguments.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ejecutar CLI
python -m my_cli --help
my-cli --name Alice -v

# Modo debug — trace de llamadas
python -m my_cli --name Alice --verbose

# Shell completion (bash/zsh/fish)
eval "$(my-cli --install-completion)"
my-cli --<TAB>                      # autocompletado

# Testing CLI con CliRunner
python -c "
from typer.testing import CliRunner
runner = CliRunner()
result = runner.invoke(app, ['--name', 'Alice'])
assert result.exit_code == 0
"

# Con uv para instalación
uv tool install my-cli              # instala global
my-cli --help
```

### GUI / Web

- **Rich Live Display:** `rich.live.Live` para dashboards CLI en tiempo real
- **Rich Inspector:** `from rich import inspect; inspect(app)` para inspeccionar comandos y opciones
- **Textual:** Framework TUI de Rich — CLIs interactivos con paneles, botones y tabs
- **Click CLI + Flask:** Typer como CLI para aplicaciones Flask/FastAPI (migraciones, seeds)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Help | `cli --help` | `cli <TAB><TAB>` (completion) |
| Verbose | `cli -v` | `--verbose` flag autocompleta |
| Subcommand list | `cli --help` | `cli <sub> --help` |
| Completion install | `cli --install-completion` | Shell hook auto |
| Debug trace | `cli --verbose` | `RICH_LOG=1 cli` |

---

## 7. Cheatsheet Rápido

```python
import typer
from typing import Annotated

app = typer.Typer(rich_markup_mode="rich")

@app.command()
def main(name: Annotated[str, typer.Argument(help="Name to greet")],
         count: Annotated[int, typer.Option("-c", "--count")] = 1,
         verbose: Annotated[bool, typer.Option("-v", "--verbose")] = False):
    """[bold]Greet[/bold] someone multiple times."""
    if verbose: typer.echo(f"Greeting {name} {count} times")
    for _ in range(count): print(f"Hello {name}")

if __name__ == "__main__": app()
```

```bash
python cli.py Alice -c 3 -v && eval "$(cli --install-completion)"
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `python-packaging-pyproject` | Complementario — entry_points console_scripts en pyproject.toml | Sí |
| `pytest-testing-quality` | Complementario — CliRunner para tests de CLI | Sí |
| `dotenv-environment-vars` | Complementario — configuración via vars de entorno | No |
| `async-python-concurrency` | Complementario — CLI async con asyncio.run() | No |

---

## 9. Metadatos del Skill

```yaml
---
id: typer-cli-applications
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/typer
tags: [typer, cli, command-line, python, rich, annotated, click, console-scripts]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
