# chaos-engineering

## Semantic Triggers
```
chaos engineering, chaos testing, fault injection, chaos mesh, litmus, gremlins, netflix chaos monkey, resilience testing, game day, blast radius
```

---

## 1. Definición Teórica

Chaos engineering resuelve el problema de descubrir fallos sistémicos antes de que se manifiesten en producción mediante experimentación controlada (inyección de fallos) en sistemas distribuidos. El principio fundamental es el método científico aplicado a infraestructura: formar una hipótesis sobre el comportamiento del sistema, introducir una variable (latencia, errores, caída de un nodo), medir la desviación, y aprender. Aplica en cualquier arquitectura distribuida de producción (microservicios, serverless, cloud-native). Existe como disciplina diferenciada del testing tradicional porque ataca la "resiliencia sistémica" — propiedades emergentes que solo aparecen bajo carga, concurrencia y fallos parciales — propiedades que los tests unitarios y de integración no pueden verificar al no conocer el "unknown-unknowns" (modos de fallo que no se anticipan).

---

## 2. Implementación de Referencia

Tooling de referencia: Chaos Mesh 2.7+ (CNCF Incubating, K8s-native), LitmusChaos 3.x (multi-platform), AWS Fault Injection Service (FIS). Estándar: Principles of Chaos Engineering (https://principlesofchaos.org/).

### Ejemplo Práctico Avanzado

```yaml
# Chaos Mesh 2.7: experimento de stress CPU en un deployment
# Caso: validar que el HPA escala correctamente cuando los pods se degradan
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress-50-percent
  namespace: chaos-testing
spec:
  mode: One  # afecta un pod seleccionado aleatoriamente
  selector:
    namespaces: [production]
    labelSelectors:
      app: api-server
      tier: backend
  stressors:
    cpu:
      workers: 2
      load: 50  # 50% de 1 core
  duration: "5m"
  scheduler:
    cron: "@every 30m"  # repetir cada 30 min en horario laboral
---
# NetworkChaos: simular latencia entre microservicios
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: latency-checkout-to-payment
  namespace: chaos-testing
spec:
  action: delay  # delay | loss | duplicate | corrupt | partition
  mode: all
  selector:
    namespaces: [production]
    labelSelectors:
      app: payment-service
  delay:
    latency: "300ms"
    jitter: "50ms"
    correlation: "75"  # 75% de packets afectados
  duration: "10m"
  direction: to  # afectar tráfico saliente
  target:
    selector:
      namespaces: [production]
      labelSelectors:
        app: checkout-service
---
# PodChaos: forzar caída de un pod para validar self-healing
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-stateful
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [production]
    labelSelectors:
      app: postgres-replica
  gracePeriod: 30
  duration: "1h"
  scheduler:
    cron: "0 14 * * 2"  # solo martes 14:00 UTC (game day semanal)
---
# WorkflowChaos: orquestar varios experimentos en secuencia
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: game-day-2026-q2
  namespace: chaos-testing
spec:
  entry: game-day-step-1
  templates:
    - name: game-day-step-1
      templateType: Serial
      children:
        - latency-injection
        - cpu-stress
        - pod-kill
      duration: "30m"
    - name: latency-injection
      templateType: NetworkChaos
      duration: "10m"
      networkChaos:
        action: delay
        selector:
          namespaces: [production]
          labelSelectors: { app: payment-service }
        delay: { latency: "1s", correlation: "100" }
    - name: cpu-stress
      templateType: StressChaos
      duration: "5m"
      stressChaos:
        mode: one
        selector:
          namespaces: [production]
          labelSelectors: { app: api-server }
        stressors: { cpu: { workers: 4, load: 90 } }
    - name: pod-kill
      templateType: PodChaos
      duration: "1m"
      podChaos:
        action: pod-kill
        mode: one
        selector:
          namespaces: [production]
          labelSelectors: { app: cache-service }
```

**Fuente oficial:** [Chaos Mesh Documentation](https://chaos-mesh.org/docs/) · [Principles of Chaos](https://principlesofchaos.org/) · [AWS FIS](https://docs.aws.amazon.com/fis/latest/userguide/what-is.html)

### Alternativa de Implementación Específica

Gremlin (SaaS): plataforma comercial con UI gráfica, "Game Days" programados, integración con Slack/PD. Más caro pero más seguro (safety features avanzados, blast radius controls).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas distribuidos en producción con SLA estrictos, post-incident retrospectives, antes de migraciones mayores, validando auto-scaling y self-healing |
| **Cuándo evitar** | Sistemas no-instrumentados (sin métricas), equipos sin runbooks, sistemas con efectos irreversibles (transacciones financieras, médicos) sin dry-run |
| **Alternativas** | Load testing (volumen, no fallos), Integration testing con Testcontainers (mejor que nada), Staging con datos sintéticos (menos real) |
| **Coste/Complejidad** | Coste medio-alto (Chaos Mesh open-source, Gremlin ~$100/mes); ROI demostrado en prevención de outages; requiere cultura de "blameless post-mortems" |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Chaos experiment causa outage real en producción

**¿Qué ocasionó el error?**
Un `PodChaos` con `mode=all` en lugar de `mode=one` mató todos los pods de un StatefulSet simultáneamente, sin respetar `gracePeriod`. La aplicación no tenía quorum (Redis cluster 3-nodos cayó a 0 healthy).

**¿Cómo se solucionó?**
1. Implementar **blast radius controls**: usar `mode=one` o `mode=fixed-percent:25` siempre en producción
2. Configurar **abort conditions** (Chaos Mesh): `AbortCondition{selector: errorRate>50%}` aborta el experimento automáticamente
3. Establecer **safety net**: `pause: true` por defecto, requiere un humano que lo reanude tras validar hypothesis
4. Referencia: Chaos Mesh 2.7+ introdujo `Spec.AbortWithCondition` para esto

**¿Por qué funciona esta técnica?**
El blast radius control limita el peor caso. Las abort conditions usan las mismas métricas SLO que se quieren validar como criterio de stop. El pause manual añade un humano-en-el-loop para reducir el riesgo de experimentos en horario de bajo tráfico.

### Caso: Equipo rechaza chaos engineering por miedo a romper producción

**¿Qué ocasionó el error?**
Cultura organizacional aversa al riesgo, miedo a ser culpado si un experimento causa daño, falta de sponsorship técnico.

**¿Cómo se solucionó?**
1. Empezar en **staging** con experimentos non-destructive (latency, network delay) — nunca pod-kill en el día 1
2. Programar **Game Days mensuales** con horario fijo, agenda pública, y post-mortem blameless
3. Mostrar **métricas de SLO improvement** después de cada experimento que descubre un bug
4. Usar el principio de Netflix: "failure is a feature, not a bug"

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1200 tokens estimados al invocar este skill
- **Trigger de activación:** "chaos engineering", "fault injection", "resilience testing", "game day", "chaos mesh"
- **Prioridad de carga:** Media — relevante para SREs y equipos de plataforma
- **Dependencias:** `container-orchestration-k8s-scheduling`, `auto-healing-systems`, `monitoring-prometheus-metrics`

### Tool Integration

```json
{
  "tool_name": "chaos_engineering",
  "description": "Diseña y ejecuta experimentos de chaos engineering: inyección controlada de fallos (latencia, caída, CPU stress) para validar resiliencia sistémica.",
  "triggers": ["chaos engineering", "fault injection", "resilience", "chaos mesh", "game day", "blast radius"],
  "context_hint": "Cargar cuando el usuario mencione validación de resiliencia, post-mortems recurrentes, o preparación para migraciones.",
  "output_format": "markdown",
  "max_tokens": 1300
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre chaos engineering, fault injection o game
days, carga el skill chaos-engineering y prioriza Chaos Mesh (CNCF) sobre
soluciones comerciales salvo requisito de safety features avanzados.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Instalar Chaos Mesh
curl -sL https://mirrors.chaos-mesh.org/v2.7.0/install.sh | bash

# Listar experimentos activos
kubectl get stresschaos,networkchaos,podchaos -A

# Pausar todos los experimentos (emergencia)
kubectl patch chaos namespace/chaos-testing --type=merge -p '{"spec":{"pause":true}}'

# Ver resultados de un experimento
kubectl describe podchaos game-day-2026-q2 -n chaos-testing
```

### GUI / Web

- **Chaos Dashboard** (Chaos Mesh): UI web con vista de experimentos, eventos, y métricas
- **Grafana**: dashboard "Chaos Events" con anotaciones de experimentos y SLO impact
- **Datadog Chaos Experiments** (beta): integración con APM
- **Gremlin Web UI**: orquestación visual, "attacks" predefinidos, blast radius slider

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Pausar todos los experimentos | `chaosctl pause` | Botón "Pause" en Dashboard |
| Lanzar experimento predefinido | `kubectl apply -f exp.yaml` | Click "Run Attack" en Gremlin |
| Exportar resultados | `kubectl get events -o yaml` | Botón "Export" en Chaos Dashboard |

---

## 7. Cheatsheet Rápido

```yaml
# Plantilla mínima de un experimento Chaos Mesh
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata: { name: pod-kill-test, namespace: chaos-testing }
spec:
  action: pod-kill
  mode: one  # blast radius: solo un pod
  selector: { namespaces: [staging], labelSelectors: { app: api } }
  duration: "5m"
  abortCondition: { selector: { type: "ErrorRate" } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `auto-healing-systems` | Complementario (valida el healer) | Sí |
| `container-orchestration-k8s-scheduling` | Dependiente (host K8s) | Sí |
| `monitoring-prometheus-metrics` | Dependiente (SLOs de referencia) | Sí |
| `predictive-failure-detection` | Superconjunto (ML + chaos) | No |
| `service-mesh-envoy-sidecars` | Complementario (injection en sidecar) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: chaos-engineering
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [chaos-engineering, fault-injection, resilience, chaos-mesh, game-day, SRE, CNCF]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*
