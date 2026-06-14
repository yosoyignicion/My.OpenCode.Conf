# {skill-name-hyphenated}

## Semantic Triggers
```
trigger-phrase-one, trigger-phrase-two, trigger-phrase-three, trigger-phrase-four
```

---

## 1. Definición Teórica

{Cuatro líneas que definan el concepto con precisión técnica. Explicar el problema de base que resuelve, el principio fundamental de funcionamiento, el contexto arquitectónico donde aplica, y la razón por la que existe como patrón/tecnología diferenciada.}

---

## 2. Implementación de Referencia

{Descripción de la implementación recomendada actualizada. Framework/librería oficial, versión estable, idioma(es) soportados.}

### Ejemplo Práctico Avanzado

```{language}
// Ejemplo completo extraído o adaptado de fuentes oficiales.
// Debe mostrar el feature set principal del skill en un escenario real.
// Incluir manejo de errores, casos borde, y estilo idiomático.
```

**Fuente oficial:** {link a doc oficial o repositorio de referencia}

### Alternativa de Implementación Específica

{Caso de uso alternativo relevante —cuando la primera opción no es la ideal— con ejemplo concreto y fuente oficial.}

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | {Escenario ideal donde este skill brilla} |
| **Cuándo evitar** | {Escenario donde este skill añade complejidad innecesaria} |
| **Alternativas** | Lista de 2-3 alternativas con una línea de comparación cada una |
| **Coste/Complejidad** | {Impacto en rendimiento, mantenibilidad, curva de aprendizaje} |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: {Título del problema común}

**¿Qué ocasionó el error?**
{Descripción del síntoma y causa raíz. Basado en issues reales de repositorios oficiales o foros de la comunidad.}

**¿Cómo se solucionó?**
{Pasos concretos de la solución, con código si aplica. Referencia al PR/commit/issue original.}

**¿Por qué funciona esta técnica?**
{Explicación del principio subyacente que hace efectiva la solución.}

### Caso: {Segundo problema frecuente}

**¿Qué ocasionó el error?**
...

**¿Cómo se solucionó?**
...

**¿Por qué funciona esta técnica?**
...

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~{N} tokens estimados al invocar este skill
- **Trigger de activación:** {Frase exacta que el agente debe buscar en la consulta del usuario}
- **Prioridad de carga:** {Alta/Media/Baja} — {justificación}
- **Dependencias:** Lista de otros skills que deben cargarse antes o en conjunto

### Tool Integration

```json
{
  "tool_name": "{nombre-normalizado}",
  "description": "{descripción para el LLM de qué hace este skill}",
  "triggers": ["trigger1", "trigger2", "trigger3"],
  "context_hint": "{sugerencia de cómo inyectar el contenido en el prompt}",
  "output_format": "{markdown/json/text esperado}",
  "max_tokens": {N}
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre {tema}, carga el skill {skill-id} y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos
idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Comandos esenciales para desarrollo con este skill
# Incluir flags comunes, piping, y modos interactivos si aplica
```

### GUI / Web

{Descripción de cómo se visualiza o interactúa con este concepto en entornos gráficos:
- IDEs y herramientas visuales
- Dashboards web
- Herramientas de debugging/monitoreo visual
}

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| {acción común} | `{comando}` | `{Ctrl/CMD+key}` |

---

## 7. Cheatsheet Rápido

```{language}
// Fragmentos idiomáticos de uso común.
// < 15 líneas total. Para consulta rápida sin leer el skill completo.
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `{id}` | {complementario/dependiente/alternativa/superconjunto} | Sí/No |
| `{id}` | {complementario/dependiente/alternativa/superconjunto} | Sí/No |
| `{id}` | {complementario/dependiente/alternativa/superconjunto} | Sí/No |

---

## 9. Metadatos del Skill

```yaml
---
id: {skill-id}
domain: {domain-name}
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11  # 60 días sin uso
source: old-skills/{origen} | oficial | nueva-creacion
tags: [tag1, tag2, tag3]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
