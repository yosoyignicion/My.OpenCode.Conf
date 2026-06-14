---
name: nlp-pipeline-processing
description: "Pipeline offline de NLP para interpretación de comandos en lenguaje natural usando spaCy: reconocimiento de intención mediante Matcher pre-tagger (registra patrones de verbos antes del etiquetado e..."
---
# nlp-pipeline-processing

## Semantic Triggers
```
nlp pipeline, intent recognition, entity extraction, spacy nlp, natural language command, command parser, dependency parsing, phrase matcher, confidence weighting
```

---

## 1. Definición Teórica

Pipeline offline de NLP para interpretación de comandos en lenguaje natural usando spaCy: reconocimiento de intención mediante Matcher pre-tagger (registra patrones de verbos antes del etiquetado estándar), extracción de entidades mediante dependencia sintáctica (amod) y PhraseMatcher, y parseo estructurado en objetos de acción con confianza ponderada. Resuelve el problema de que los comandos en lenguaje natural son ambiguos y requieren análisis sintáctico-semántico para ser ejecutables.

---

## 2. Implementación de Referencia

Librerías: spaCy (es_core_news_sm / en_core_web_sm), Matcher, PhraseMatcher. Python 3.12+. Lazy loading del modelo.

### Ejemplo Práctico Avanzado

```python
import spacy
from spacy.matcher import Matcher, PhraseMatcher
from dataclasses import dataclass, field
from typing import List, Optional, Literal
import importlib.util

@dataclass
class ParseResult:
    intent: str = ""
    entities: dict = field(default_factory=dict)
    confidence: float = 0.0
    action_type: Optional[str] = None
    success: bool = False
    error: Optional[str] = None

class NLPPipeline:
    def __init__(self, lang: str = "es"):
        self.lang = lang
        self.nlp = None
        self.intent_matcher = None
        self.entity_matcher = None
        self._lazy_load()

    def _lazy_load(self):
        """Load spaCy model on first use (saves ~1.5s startup)"""
        if self.nlp is not None:
            return

        model_map = {"es": "es_core_news_sm", "en": "en_core_web_sm"}
        model_name = model_map.get(self.lang, "es_core_news_sm")

        try:
            self.nlp = spacy.load(model_name)
        except OSError:
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", model_name], check=True)
            self.nlp = spacy.load(model_name)

        self._setup_matchers()

    def _setup_matchers(self):
        self.intent_matcher = Matcher(self.nlp.vocab)

        # Intent patterns (verbs)
        intents = {
            "CREATE": ["crear", "dibujar", "hacer", "generar", "añadir", "agregar", "insertar", "poner"],
            "MODIFY": ["cambiar", "modificar", "mover", "editar", "actualizar", "transformar"],
            "DELETE": ["borrar", "eliminar", "quitar", "remover"],
            "EXPORT": ["exportar", "guardar", "convertir"],
            "STYLE": ["colorear", "pintar", "estilizar", "decorar"],
            "ANALYZE": ["analizar", "revisar", "comprobar", "evaluar", "inspeccionar"],
            "SEARCH": ["buscar", "encontrar", "localizar", "consultar"],
        }

        for intent_name, verbs in intents.items():
            patterns = [[{"LEMMA": {"IN": verbs}}]]
            self.intent_matcher.add(intent_name, patterns)

        # Entity matcher via PhraseMatcher for multi-word entities
        self.entity_matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        self.known_entities = [
            "rojo", "azul", "verde", "grande", "pequeño", "cuadrado",
            "círculo", "triángulo", "SVG", "PNG", "archivo",
        ]
        patterns = [self.nlp(entity) for entity in self.known_entities]
        self.entity_matcher.add("KNOWN_ENTITIES", patterns)

    def interpret(self, text: str) -> ParseResult:
        """Full pipeline: intent → entities → parse"""
        self._lazy_load()
        doc = self.nlp(text)

        # Step 1: Intent recognition (runs before tagger via pre-trigger)
        matches = self.intent_matcher(doc)
        intent_scores = {}
        for match_id, start, end in matches:
            intent_name = self.nlp.vocab.strings[match_id]
            intent_scores[intent_name] = intent_scores.get(intent_name, 0) + 1.0

        if not intent_scores:
            return ParseResult(success=False, error="No intent detected")

        best_intent = max(intent_scores, key=intent_scores.get)
        intent_confidence = min(0.5 + 0.15 * (intent_scores[best_intent] - 1), 1.0)

        # Step 2: Entity extraction
        entities = {}
        verb_score = 0.0

        # via dependency parsing (amod, dobj)
        for token in doc:
            if token.dep_ == "amod" and token.head.pos_ == "NOUN":
                entities.setdefault("attributes", []).append(token.text)
            if token.dep_ == "dobj":
                entities.setdefault("objects", []).append(token.text)
                verb_score = 0.85

        # via PhraseMatcher
        phrase_matches = self.entity_matcher(doc)
        for match_id, start, end in phrase_matches:
            span = doc[start:end]
            entities.setdefault("known", []).append(span.text)

        # Confidence calculation
        entity_score = min(0.1 * len(entities), 0.5)
        confidence = min(intent_confidence + verb_score + entity_score, 1.0)

        return ParseResult(
            intent=best_intent,
            entities=entities,
            confidence=round(confidence, 2),
            action_type=best_intent.lower(),
            success=True,
        )

    def __call__(self, text: str) -> ParseResult:
        return self.interpret(text)

pipeline = NLPPipeline("es")
result = pipeline("crear un círculo rojo grande")
print(f"Intent: {result.intent} (confidence: {result.confidence})")
print(f"Entities: {result.entities}")
print(f"Success: {result.success}")
```

**Fuente oficial:** NLP Pipeline de OCS v2.1 basado en spaCy.

### Alternativa de Implementación Específica

Para inglés, usar `en_core_web_sm` con los mismos patrones traducidos. Para rendimiento máximo, usar `spacy` con pipeline mínimo (`nlp = spacy.load("es_core_news_sm", disable=["ner", "parser"])`).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Procesamiento offline de comandos en lenguaje natural, chatbots con dominio específico, sistemas sin conexión a API de NLP. |
| **Cuándo evitar** | Comprensión de lenguaje profunda (usa LLM), idiomas sin modelo spaCy, necesidades de alta precisión semántica. |
| **Alternativas** | 1) spaCy + Matcher (rápido, offline). 2) LLM-based (preciso, online, caro). 3) Rasa NLU (framework completo). |
| **Coste/Complejidad** | Bajo: spaCy es rápido (~0.06s por frase) y no requiere GPU. La configuración de matchers es simple pero requiere mantenimiento de vocabulario. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: El intent matcher no reconoce verbos conjugados

**¿Qué ocasionó el error?** El patrón usa `LEMMA` pero el matcher pre-tagger se ejecuta antes del tagger estándar, y el lematizador puede no estar disponible en ese punto del pipeline.

**¿Cómo se solucionó?** Mover el matcher después del tagger usando `nlp.add_pipe("intent_matcher", after="tagger")` en lugar de `before`. Asegurar que el modelo incluya lematizador (`es_core_news_sm` lo incluye).

**¿Por qué funciona esta técnica?** El tagger proporciona etiquetas POS necesarias para el lematizador. Colocar el matcher después del tagger garantiza que los lemas estén disponibles.

### Caso: spaCy tarda demasiado en cargar (primer uso)

**¿Qué ocasionó el error?** Cargar `es_core_news_sm` toma ~1.5s en disco lento o primera carga (descarga + compilación).

**¿Cómo se solucionó?** Implementar lazy loading: cargar el modelo solo en la primera llamada a `interpret()`. También precargar en background durante el inicio del agente.

**¿Por qué funciona esta técnica?** Lazy loading difiere el coste de carga al primer uso real. Precarga en background oculta la latencia.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1000 tokens estimados al invocar este skill
- **Trigger de activación:** "nlp" "interpretar comando" "spacy" "intent recognition" "parser"
- **Prioridad de carga:** Alta — interfaz de lenguaje natural para comandos
- **Dependencias:** `39-nlp-pipeline-processing` (recursivo), `34-autoprompting-engineering`

### Tool Integration

```json
{
  "tool_name": "nlp-pipeline-processing",
  "description": "Pipeline NLP offline con spaCy: intent recognition via Matcher, entity extraction via dependencias y PhraseMatcher, confidence weighting. Lazy loading, soporte español/inglés.",
  "triggers": ["nlp", "intent recognition", "entity extraction", "spacy", "command parser", "natural language"],
  "context_hint": "Inyectar sección 2 para NLPPipeline; sección 4 para lazy loading y lematización.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Para interpretar comandos en lenguaje natural, cargar nlp-pipeline-processing.
Usar NLPPipeline.interpret(text) que devuelve intent + entities + confidence.
Lazy loading del modelo spaCy en primer uso. Pre-tagger para intención antes de POS.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Probar interpretación
python -c "from nlp_pipeline import NLPPipeline; p=NLPPipeline(); r=p.interpret('crear un círculo azul'); print(r)"
python -c "from nlp_pipeline import NLPPipeline; p=NLPPipeline('en'); r=p.interpret('create a red square'); print(r)"

# Medir tiempo
python -c "import time; from nlp_pipeline import NLPPipeline; p=NLPPipeline(); s=time.time(); p.interpret('test'); print(f'First: {(time.time()-s)*1000:.0f}ms'); s=time.time(); p.interpret('test'); print(f'Subsequent: {(time.time()-s)*1000:.0f}ms')"
```

### GUI / Web

- **spaCy Explorer**: Visualización de árbol de dependencias y entidades reconocidas (https://explosion.ai/demos)
- **Intent Dashboard**: Log de intenciones detectadas con confianza y entidades extraídas
- **Pattern Editor**: UI para añadir/modificar patrones de Matcher visualmente

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Interpretar | `python -c "NLPPipeline().interpret('text')"` | spaCy Explorer "Parse" |
| Ver dependencias | N/A | Explorer "Dependencies" |

---

## 7. Cheatsheet Rápido

```python
from nlp_pipeline import NLPPipeline
p = NLPPipeline("es")
r = p.interpret("crear un círculo rojo")
# r.intent → "CREATE", r.entities → {attributes: ["rojo"], objects: ["círculo"]}
# r.confidence → 0.85, r.success → True
# Intentos: CREATE, MODIFY, DELETE, EXPORT, STYLE, ANALYZE, SEARCH
# Lazy loading: modelo carga en primer uso (~0.06s después)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `34-autoprompting-engineering` | Complementario (prompt design + NLP) | Sí |
| `04-tool-use-function-calling` | Complementario (NLP results → tool calls) | No |
| `01-agentic-multiloop-orchestration` | Complementario (NLP como entrada del loop) | No |
| `39-nlp-pipeline-processing` | (recursivo) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: nlp-pipeline-processing
domain: 05-ia-agentica-datos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/nlp-engine
tags: [nlp, spacy, intent-recognition, entity-extraction, matcher, dependency-parsing, lazy-loading]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
