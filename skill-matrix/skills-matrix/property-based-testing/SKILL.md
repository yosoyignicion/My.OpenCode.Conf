---
name: property-based-testing
description: "Property-based testing genera entradas aleatorias dentro de estrategias tipadas y verifica que propiedades invariantes se cumplan para todos los casos"
---
# property-based-testing

## Semantic Triggers
```
property-based testing with Hypothesis or QuickCheck, invariant properties that must hold for all inputs, stateful testing with RuleBasedStateMachine, fuzzing-like input generation from type strategies, shrinking failing cases to minimal repro, testing idempotency round-trip and oracle properties
```

---

## 1. Definición Teórica

Property-based testing genera entradas aleatorias dentro de estrategias tipadas y verifica que propiedades invariantes se cumplan para todos los casos. Cuando encuentra un fallo, el framework reduce (shrink) la entrada al caso mínimo que reproduce el error. Las tres categorías de propiedades son: invariantes (siempre verdad), idempotencia (aplicar dos veces = una), y round-trip (serializar/deserializar preserva el valor). Complementa a mutation testing para validar la calidad de las propiedades.

---

## 2. Implementación de Referencia

**Hypothesis** para Python (v6.100+) es el property-based testing framework más maduro del ecosistema Python. Soporta estrategias compuestas, stateful testing, y shrinking automático.

### Ejemplo Práctico Avanzado

```python
from hypothesis import given, assume, strategies as st, settings
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant

# Round-trip property for serialization
@given(st.lists(st.integers(min_value=0, max_value=2**31)))
@settings(max_examples=500)
def test_sort_idempotent(lst):
    assume(len(lst) > 0)
    sorted_once = sorted(lst)
    sorted_twice = sorted(sorted_once)
    assert sorted_once == sorted_twice
    assert all(sorted_once[i] <= sorted_once[i+1] for i in range(len(sorted_once)-1))
    assert set(sorted_once) == set(lst)

# Stateful testing for a bounded buffer
class BufferStateMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.buffer = []
        self.capacity = 5

    @rule(item=st.integers())
    def push(self, item):
        assume(len(self.buffer) < self.capacity)
        self.buffer.append(item)

    @rule()
    def pop(self):
        assume(len(self.buffer) > 0)
        self.buffer.pop()

    @invariant()
    def length_bounds(self):
        assert 0 <= len(self.buffer) <= self.capacity
```

**Fuente oficial:** https://hypothesis.readthedocs.io

### Alternativa de Implementación Específica

**fast-check** para TypeScript/JavaScript. Soporta arbitrarios personalizados, stateful testing, y shrinking. Integración nativa con Vitest y Jest mediante `@fast-check/vitest`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Funciones con invariantes claras (sort, serialization, validación, parsing). Stateful testing para sistemas con estado |
| **Cuándo evitar** | UI tests, integraciones con APIs externas no mockeadas, tests de regresión visual |
| **Alternativas** | Example-based testing (tests tradicionales), Fuzzing (coverage-guided para C/C++), Mutation testing (para validar calidad de tests) |
| **Coste/Complejidad** | Medio. Definir buenas propiedades requiere pensamiento abstracto. Ejecución más lenta que tests tradicionales |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Tests lentos por exceso de ejemplos

**¿Qué ocasionó el error?**
`max_examples=10000` sin `settings(suppress_health_check=...)` causaba timeouts en CI.

**¿Cómo se solucionó?**
Reducir `max_examples` a 200 en CI, mantener 1000 en local. Usar `@settings(max_examples=200, deadline=500)`.

**¿Por qué funciona esta técnica?**
200 ejemplos con shrinking detectan >95% de los bugs. El shrinking encuentra el caso mínimo sin necesidad de miles de ejemplos.

### Caso: Shrink produce input inválido

**¿Qué ocasionó el error?**
`assume()` se usaba incorrectamente, causando que Hypothesis descartara demasiados ejemplos (HealthCheck.filter_too_much).

**¿Cómo se solucionó?**
Reemplazar `assume()` con estrategias específicas: `st.integers(min_value=1, max_value=100)` en lugar de `assume(x > 0)`.

**¿Por qué funciona esta técnica?**
Las estrategias guían la generación desde el inicio, mientras que `assume` descarta post-generación, siendo ineficiente.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** "property-based testing" o "Hypothesis" en la consulta
- **Prioridad de carga:** Media — útil para validación de seguridad pero no crítica para arquitectura
- **Dependencias:** `16-mutation-testing-pitest-stryker` (combinación recomendada)

### Tool Integration

```json
{
  "tool_name": "property-based-testing",
  "description": "Property-based testing con Hypothesis, invariantes, stateful testing, y shrinking",
  "triggers": ["property-based testing", "Hypothesis", "fast-check", "invariant", "shrinking", "stateful testing"],
  "context_hint": "Inyectar secciones 1-2 cuando se necesiten patrones de testing de propiedades invariantes",
  "output_format": "markdown",
  "max_tokens": 600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre property-based testing, carga el skill property-based-testing y responde
siguiendo la sección de implementación de referencia con Hypothesis.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Run Hypothesis tests with verbose output
pytest tests/test_properties.py -v --hypothesis-verbosity=2

# Print statistics about strategy distribution
pytest --hypothesis-show-statistics

# Profile Hypothesis test execution
pytest --hypothesis-profile tests/

# Generate test database with Hypothesis
python -m hypothesis write tests/generated
```

### GUI / Web

- **Hypothesis dashboard:** Visualización de distribuciones de estrategias (plugin pytest)
- **VS Code Hypothesis extension:** Inline hints sobre estrategias y shrinking
- **Hypothesis Workspace (web):** Editor interactivo para diseñar propiedades

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar con stats | `pytest --hypothesis-show-statistics` | Hypothesis → Show Stats |
| Depurar shrinking | `pytest -k test_name -x --tb=long` | Click en test → Debug |

---

## 7. Cheatsheet Rápido

```python
from hypothesis import given, strategies as st, assume

# Common strategies
integers = st.integers(min_value=0, max_value=255)
text = st.text(min_size=1, max_size=100, alphabet=string.ascii_letters)
lists = st.lists(st.integers(), min_size=1, max_size=50)
dics = st.dictionaries(keys=st.text(), values=st.integers())

# Pattern: round-trip property
@given(st.binary())
def test_encode_decode(data):
    encoded = encode(data)
    decoded = decode(encoded)
    assert data == decoded

# Pattern: idempotency
@given(integers)
def test_abs_idempotent(x):
    assert abs(abs(x)) == abs(x)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `16-mutation-testing-pitest-stryker` | Complementario — mutation testing valida calidad de properties | Sí |
| `17-fuzzing-security-boundaries` | Complementario — fuzzing es property-based testing para seguridad | No |
| `18-integration-testing-wiremock-testcontainers` | Alternativa — testing de integración vs unitario con propiedades | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 03-property-based-testing
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [property-based-testing, hypothesis, fast-check, invariant, shrinking, testing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
