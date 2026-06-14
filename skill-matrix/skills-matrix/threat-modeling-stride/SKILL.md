---
name: threat-modeling-stride
description: "STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege) es el framework de threat modeling de Microsoft que clasifica amenazas en 6 categorías"
---
# threat-modeling-stride

## Semantic Triggers
```
STRIDE spoofing tampering repudiation information disclosure denial of service elevation of privilege, threat modeling data flow diagram DFD, STRIDE per element security analysis, trust boundaries and privilege escalation paths, mitigation strategies for each STRIDE category, threat modeling as code with pytm or threatdragon
```

---

## 1. Definición Teórica

STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege) es el framework de threat modeling de Microsoft que clasifica amenazas en 6 categorías. Cada elemento en un Diagrama de Flujo de Datos (DFD) se analiza contra las categorías STRIDE relevantes. Las trust boundaries marcan transiciones entre niveles de privilegio. El objetivo es identificar amenazas antes de escribir código, siguiendo el principio de "shift left" en seguridad.

---

## 2. Implementación de Referencia

**pytm** (Python Threat Modeling) v0.9+ y OWASP Threat Dragon son las herramientas recomendadas. pytm permite definir modelos de amenazas como código Python y generar diagramas y reportes.

### Ejemplo Práctico Avanzado

```python
from pytm import TM, Server, Dataflow, Database, Boundary, Actor

tm = TM("Payment Processing System")
internet = Boundary("Internet")
dmz = Boundary("DMZ")
internal = Boundary("Internal Network")

user = Actor("End User", in_boundary=internet)
web = Server("Web Server", in_boundary=dmz)
api = Server("API Gateway", in_boundary=dmz)
db = Database("Payment DB", in_boundary=internal)

df1 = Dataflow(user, web, "HTTPS Login Request")
df1.order = 1
df2 = Dataflow(web, api, "REST API Call")
df2.order = 2
df3 = Dataflow(api, db, "Parameterized SQL Query")
df3.order = 3

tm.process()
tm.output("payment-system.html")
```

**Fuente oficial:** https://github.com/izar/pytm

### Alternativa de Implementación Específica

**Threat Dragon** (OWASP): Alternativa gráfica con almacenamiento JSON. Ideal para equipos no-técnicos que necesitan colaborar en threat models sin código. Sincroniza con git para versionado.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Al diseñar sistemas con múltiples trust boundaries, especialmente si procesan datos sensibles o financieros |
| **Cuándo evitar** | Proyectos pequeños (<3 servicios) sin datos sensibles — el overhead no justifica el beneficio |
| **Alternativas** | PASTA (Process for Attack Simulation & Threat Analysis) — más orientado a riesgo; LINDDUN — enfocado en privacidad; VAST — escalable para grandes organizaciones |
| **Coste/Complejidad** | Medio. Curva de aprendizaje inicial moderada. Requiere entrenamiento del equipo en DFD y clasificación STRIDE |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Falsos negativos en threat models manuales

**¿Qué ocasionó el error?**
Equipos que omiten trust boundaries internas entre microservicios, asumiendo que la red interna es segura. Esto ignoró amenazas de EoP internas (CVE-2020-1472 — Netlogon EoP).

**¿Cómo se solucionó?**
Modelar cada microservicio como un proceso separado con su propia trust boundary. Aplicar STRIDE a cada data flow entre servicios.

**¿Por qué funciona esta técnica?**
La descomposición granular expone data flows que de otro modo pasarían desapercibidos, revelando vectores de ataque laterales.

### Caso: Threat models desactualizados

**¿Qué ocasionó el error?**
El threat model se creó al inicio del proyecto y nunca se actualizó. Cambios arquitectónicos posteriores introdujeron nuevas trust boundaries no analizadas.

**¿Cómo se solucionó?**
Integrar el threat model en el pipeline de CI/CD. Cada PR que modifique la arquitectura (según archivos DFD) dispara una revisión automatizada.

**¿Por qué funciona esta técnica?**
El threat model como código (pytm) permite diff y revisión automatizada, manteniéndolo sincronizado con la implementación.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** "threat model" o "STRIDE" en la consulta del usuario
- **Prioridad de carga:** Alta — la seguridad arquitectónica es fundamental antes de implementar
- **Dependencias:** `04-owasp-top-10-mitigation`, `05-zero-trust-architecture-sdlc`

### Tool Integration

```json
{
  "tool_name": "threat-modeling-stride",
  "description": "Guía de threat modeling con STRIDE, DFD, y herramientas como pytm y OWASP Threat Dragon",
  "triggers": ["STRIDE", "threat model", "DFD", "trust boundary", "pytm"],
  "context_hint": "Inyectar secciones 1-2-4 cuando se detecten consultas sobre análisis de amenazas arquitectónicas",
  "output_format": "markdown",
  "max_tokens": 600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre threat modeling o STRIDE, carga el skill threat-modeling-stride y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos con pytm sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generar threat model con pytm
python -m pytm --tm payment-system.py --output report.html

# Validar threat model existente
python -m pytm --validate threat-model.yaml

# Ejecutar análisis STRIDE automatizado con Threat Dragon CLI
threat-dragon import threat-model.json && threat-dragon report threat-model.json
```

### GUI / Web

- **OWASP Threat Dragon:** Editor web/desktop de threat models con exportación JSON
- **Microsoft Threat Modeling Tool:** GUI Windows con plantillas por tipo de aplicación
- **Iris (SecurityMB):** Herramienta colaborativa basada en web

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generar reporte | `pytm --tm model.py --output report.html` | `File → Export → HTML` |
| Validar modelo | `pytm --validate model.yaml` | `Tools → Validate` |

---

## 7. Cheatsheet Rápido

```python
# STRIDE per element mapping
elements = {
    "ExternalEntity": ["Spoofing", "Repudiation"],
    "Process": ["Spoofing", "Tampering", "Repudiation", "Info Disclosure", "DoS", "EoP"],
    "DataStore": ["Tampering", "Info Disclosure", "Repudiation"],
    "DataFlow": ["Tampering", "Info Disclosure"]
}

# Quick mitigation mapping
mitigations = {
    "Spoofing": "Authentication",
    "Tampering": "Integrity hashes/signing",
    "Repudiation": "Audit logging",
    "Info Disclosure": "Encryption/ACLs",
    "DoS": "Rate limiting/autoscaling",
    "EoP": "Least privilege"
}
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `04-owasp-top-10-mitigation` | Complementario — las mitigaciones STRIDE se mapean a OWASP Top 10 | Sí |
| `05-zero-trust-architecture-sdlc` | Complementario — trust boundaries son fundamentales en Zero Trust | Sí |
| `08-static-application-security-testing-sast` | Dependiente — SAST encuentra vulnerabilidades identificadas en threat model | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 01-threat-modeling-stride
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [threat-modeling, stride, pytm, threat-dragon, dfd, security-architecture]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
