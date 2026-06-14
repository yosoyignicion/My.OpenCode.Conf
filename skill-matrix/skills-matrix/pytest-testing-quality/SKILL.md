---
name: pytest-testing-quality
description: "pytest resuelve el problema de verificar automáticamente que el código se comporta como se espera, mediante un framework de testing con fixtures reutilizables, parametrización nativa y un sistema d..."
---
# pytest-testing-quality

## Semantic Triggers
```
pytest fixtures conftest scope, parametrize multiple inputs test cases, mocking with pytest-mock mocker, async pytest asyncio mark, tmp_path fixture temporary files, coverage report pytest-cov term-missing
```

---

## 1. Definición Teórica

pytest resuelve el problema de verificar automáticamente que el código se comporta como se espera, mediante un framework de testing con fixtures reutilizables, parametrización nativa y un sistema de aserciones intuitivo. El principio fundamental es que los tests deben ser *deterministas, aislados y rápidos* — las fixtures permiten inyectar dependencias sin acoplamiento, la parametrización cubre múltiples casos con un solo test, y el sistema de discovery automático elimina boilerplate. Arquitectónicamente, pytest reemplaza a unittest (estándar library) con una sintaxis más concisa y plugins para mocking, cobertura y testing asíncrono.

## 2. Implementación de Referencia

La implementación recomendada usa pytest con fixtures con scope (`function`/`class`/`module`/`session`), `@pytest.mark.parametrize` para tests data-driven, `pytest-mock` (mocker fixture sobre `unittest.mock`), `tmp_path` para archivos temporales, `@pytest.mark.asyncio` para tests async, y `pytest-cov` para cobertura.

### Ejemplo Práctico Avanzado

```python
@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = Session(engine)
    yield session
    session.close()

def test_create_user(db_session):
    db_session.add(User(name="a"))
    db_session.commit()

@pytest.mark.parametrize("email,valid", [("a@b.com", True), ("not-email", False), ("", False)])
def test_email_validation(email, valid):
    assert is_valid(email) == valid

def test_external_api(mocker):
    mock_get = mocker.patch("requests.get")
    mock_get.return_value.json.return_value = {"ok": True}
    assert call_api() == {"ok": True}

@pytest.mark.asyncio
async def test_async():
    assert await fetch_data() == expected
```

**Fuente oficial:** https://docs.pytest.org/ — https://pytest-mock.readthedocs.io/

### Alternativa de Implementación Específica

Para proyectos que requieren test doubles más sofisticados (verificación de llamadas en orden, espiar atributos), usar `unittest.mock` directamente con `pytest-mock` como wrapper. Para BDD, `pytest-bdd` permite escribir escenarios Gherkin. Para snapshot testing, `syrupy` (compatible con pytest). Para fuzzing, `hypothesis` genera casos de prueba automáticamente a partir de propiedades.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier proyecto Python: tests unitarios, de integración, funcionales. Equipos que valoran legibilidad y velocidad. Proyectos con fixtures compartidas |
| **Cuándo evitar** | Tests que requieren mocking muy específico de CPython internals (usar ctypes testing). Proyectos que ya tienen suite unittest madura y sin tiempo de migración |
| **Alternativas** | unittest: built-in, verboso, no tiene fixtures nativas; hypothesis: generativo, complementa pytest para fuzzing; tox/nox: para testing multi-versión, no reemplazan framework |
| **Coste/Complejidad** | Bajo: pytest reduce boilerplate significativamente. Medio: fixtures con scope session requieren cuidado con estado compartido. Alto: async fixtures + pytest-asyncio puede tener curvas de depuración |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Test que pasa en local falla en CI por ruta de archivo

**¿Qué ocasionó el error?**
Uso de rutas absolutas o relativas al CWD. En CI, el directorio de trabajo puede diferir.

**¿Cómo se solucionó?**
Usar `tmp_path` fixture para archivos temporales y `pathlib.Path` para rutas relativas al archivo de test: `DATA_DIR = Path(__file__).parent / "data"`.

**¿Por qué funciona esta técnica?**
`tmp_path` provee un directorio temporal único por test (aislado y limpiado automáticamente). `Path(__file__)` es siempre relativo al archivo actual, no al CWD.

### Caso: mock.patch no funciona — el método original se sigue llamando

**¿Qué ocasionó el error?**
Se parcheó la función después de que el módulo bajo test ya la importara. `mocker.patch("requests.get")` funciona solo si el módulo bajo test hace `import requests` (no `from requests import get`).

**¿Cómo se solucionó?**
Parchear donde se usa: `mocker.patch("mymodule.requests.get")` en lugar de `mocker.patch("requests.get")`. O reestructurar imports para usar el módulo completo.

**¿Por qué funciona esta técnica?**
Python busca el símbolo en el namespace del módulo bajo test, no en el módulo original. Parchear en el punto de importación asegura que el test intercepte la llamada.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** Escribir tests para validar función/módulo, cubrir casos borde
- **Prioridad de carga:** Alta — testing es transversal a cualquier desarrollo Python
- **Dependencias:** Preferible junto con `python-packaging-pyproject` si se necesita configurar testpaths

### Tool Integration

```json
{
  "tool_name": "pytest-testing-quality",
  "description": "Escribe tests idiomáticos con fixtures, parametrización, mocking y cobertura",
  "triggers": ["pytest", "unit test", "fixtures", "mocking", "test coverage", "async test", "parametrize"],
  "context_hint": "Inyectar ejemplo práctico (sección 2) cuando el usuario pida ayuda con tests; sección 4 (FAQ) cuando depure fallos",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre testing Python, carga el skill pytest-testing-quality y responde
siguiendo la sección de implementación de referencia con ejemplos concretos para su caso.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ejecutar todos los tests
pytest

# Con cobertura
pytest --cov=src --cov-report=term-missing --cov-report=html

# Filtrar por nombre
pytest -k "user or email" -v

# Último fallo primero
pytest --ff

# Stop on first failure
pytest -x

# Modo verbose con stdout
pytest -v -s

# Tests fallidos + entorno
pytest --lf --showlocals

# Perfil de tests lentos
pytest --durations=10

# Con tox multi-versión
tox run-parallel
```

### GUI / Web

- **VSCode:** Testing sidebar — descubre tests automáticamente, run/debug inline, cobertura coloreada
- **PyCharm:** Run con gutter icons, debugger integrado, coverage tool window
- **CI (GitHub Actions):** `pytest --junitxml=report.xml` para integración con test reports
- **Coverage HTML:** `pytest --cov-report=html` — abre `htmlcov/index.html` en navegador

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Run all tests | `pytest` | Ctrl+Shift+P → Test: Run All |
| Run file test | `pytest tests/test_user.py` | Gutter icon ▶ (VSCode) |
| Debug test | `pytest -x --pdb` | Right-click → Debug Test |
| Re-run last | `pytest --lf` | Ctrl+Shift+P → Test: Re-run |
| Coverage | `pytest --cov=src` | Ctrl+Shift+P → Coverage |

---

## 7. Cheatsheet Rápido

```python
@pytest.fixture
def db(): ... yield ... cleanup()
@pytest.mark.parametrize("x,expected", [(1,2),(3,4)])
def test_add(x, expected): assert add(x) == expected
def test_api(mocker):
    m = mocker.patch("requests.get")
    m.return_value.json.return_value = {"ok": True}
def test_tmp(tmp_path):
    f = tmp_path / "data.txt"
    f.write_text("hello")
    assert f.read_text() == "hello"
```

```bash
pytest -v -k "pattern" --cov=src --cov-report=term-missing --ff
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `python-packaging-pyproject` | Complementario — pytest como dev dependency | Sí |
| `async-python-concurrency` | Complementario — @pytest.mark.asyncio para código async | Sí |
| `postgresql-advanced` | Complementario — fixtures DB para tests de integración | No |
| `fastapi-rest-development` | Complementario — TestClient para endpoints | No |

---

## 9. Metadatos del Skill

```yaml
---
id: pytest-testing-quality
domain: 08-ingenieria-herramientas
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/pytest-testing
tags: [pytest, testing, fixtures, mocking, coverage, python, quality, test-automation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
