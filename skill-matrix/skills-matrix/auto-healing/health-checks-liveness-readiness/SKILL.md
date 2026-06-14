# health-checks-liveness-readiness

## Semantic Triggers
```
health check, liveness probe, readiness probe, startup probe, k8s probes, /healthz, /readyz, health endpoint, deep health check, graceful degradation
```

---

## 1. Definición Teórica

Los health checks en Kubernetes resuelven el problema de detectar el estado real de un pod para que el orquestador tome decisiones correctas: reiniciar pods colgados (liveness), enrutar tráfico solo a pods que pueden servirlo (readiness), y manejar tiempos de startup lentos (startup probe). El principio fundamental es la separación de tres preguntas: "¿está vivo el proceso?" (liveness → kill+restart), "¿puede servir tráfico?" (readiness → remove from service), "¿está arrancando?" (startup → disable other probes). Aplica exclusivamente en Kubernetes (y orquestadores equivalentes: Nomad, ECS). Existe como patrón diferenciada porque la ausencia de health checks hace que el orquestador trate cualquier pod en ejecución como healthy, resultando en: pods zombie (proceso vivo, app muerta) sirviendo 500s, pods sobrecargados recibiendo más tráfico, y deploys con race conditions durante rolling updates.

---

## 2. Implementación de Referencia

Stack de referencia: Kubernetes 1.30+, Spring Boot Actuator 3.2+ (Java), FastAPI + starlette (Python), net/http custom handlers (Go). Estándar: Kubernetes API server `/healthz` conventions.

### Ejemplo Práctico Avanzado

```java
// Spring Boot 3.2: custom HealthIndicators con circuit breakers
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {
    private final CircuitBreaker breaker;
    private final DatabaseClient db;
    private final RedisClient cache;

    @Override
    public Health health() {
        Health.Builder builder = new Health.Builder();

        // 1. Liveness check: ¿el proceso está vivo y respondiendo?
        //    (no incluye dependencias — un DB down no debe matar el pod)
        if (Thread.activeCount() > MAX_THREADS) {
            return builder.down().withDetail("reason", "thread exhaustion").build();
        }

        // 2. Readiness check: ¿puedo servir tráfico AHORA?
        //    (SÍ incluye dependencias críticas)
        if (breaker.getState() == CircuitBreaker.State.OPEN) {
            return builder.outOfService()  // outOfService = no traffic, no restart
                .withDetail("circuitBreaker", "OPEN")
                .build();
        }
        if (!db.ping()) {
            return builder.outOfService().withDetail("db", "unreachable").build();
        }
        if (cache.ping() == false && isCacheRequired()) {
            return builder.outOfService().withDetail("cache", "down").build();
        }

        return builder.up()
            .withDetail("db", "ok")
            .withDetail("cache", "ok")
            .withDetail("circuitBreaker", breaker.getState().name())
            .build();
    }
}
```

```yaml
# Kubernetes: probes configuradas correctamente
apiVersion: apps/v1
kind: Deployment
metadata: { name: payment-service }
spec:
  template:
    spec:
      # Startup probe: para apps con cold start largo (JVM, carga de modelos ML)
      # Una vez que pase, las otras probes se activan
      startupProbe:
        httpGet:
          path: /actuator/health/liveness  # SOLO liveness, no readiness
          port: 8080
        initialDelaySeconds: 10
        periodSeconds: 5
        failureThreshold: 30  # 30 * 5s = 150s máximo de startup

      containers:
      - name: payment
        image: payment:v1.2.0
        ports: [{ containerPort: 8080 }]

        # Liveness: ¿el proceso está vivo? (kill+restart si falla)
        livenessProbe:
          httpGet: { path: /actuator/health/liveness, port: 8080 }
          initialDelaySeconds: 0        # startupProbe ya manejó el arranque
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3           # 30s de fallos antes de kill
          successThreshold: 1

        # Readiness: ¿puede servir tráfico? (sacar del Service si falla)
        readinessProbe:
          httpGet: { path: /actuator/health/readiness, port: 8080 }
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 2
          failureThreshold: 2           # 10s para detectar
          successThreshold: 1           # 1 éxito = ready

        # IMPORTANTE: resources correctos para no throttlear el healthcheck
        resources:
          requests: { cpu: 250m, memory: 512Mi }
          limits:   { cpu: 1,    memory: 1Gi }

        # Lifecycle: dar tiempo para drenar conexiones in-flight
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]  # típico: > terminationGracePeriodSeconds / 2
```

**Fuente oficial:** [Kubernetes Liveness/Readiness Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) · [Spring Boot Actuator Health](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.endpoints.health)

### Alternativa de Implementación Específica

Linkerd/Envoy sidecars: la probe se mueve al sidecar, que es el primer punto de contacto. Permite health checks diferenciados (HTTP del pod, TCP del upstream, TLS handshake, etc.) sin tocar el código de aplicación.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Todo pod de Kubernetes en producción, especialmente con rolling deploys, HPA, service mesh |
| **Cuándo evitar** | Pods batch/one-shot (usar `activeDeadlineSeconds`), sidecars que no sirven tráfico (solo liveness mínimo) |
| **Alternativas** | Service mesh sidecar probes, External health checker (Pingdom, Blackbox exporter), Application-level health pages (Spring Admin Server) |
| **Coste/Complejidad** | Coste bajo (YAML + 1 endpoint HTTP); mal configurado causa restart loops o 503 storms; requiere monitorizar probe failures |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Liveness probe mata pods en cascada durante un pico de carga

**¿Qué ocasionó el error?**
El liveness check incluye latencia de la DB. Durante un pico de carga, la DB se vuelve lenta (P99 > 5s). El liveness probe hace timeout, Kubernetes mata el pod. El pod reiniciado añade más carga al DB. Cascada hasta que todos los pods están reiniciando en bucle.

**¿Cómo se solucionó?**
1. **Liveness NUNCA debe incluir dependencias externas** (DB, cache, APIs). Solo el proceso in-process: thread pool, heap, event loop.
2. **Readiness SÍ incluye dependencias** — pero marca `outOfService` (saca del Service, no mata).
3. Si una app realmente depende 100% de un DB, esa dependencia debe estar en el readiness, no en liveness. El pod se queda vivo pero sin tráfico hasta que el DB vuelva.

**¿Por qué funciona esta técnica?**
La liveness responde "¿el proceso está corrupto?" → si sí, kill. La readiness responde "¿puede hacer trabajo útil?" → si no, pausar tráfico. Mezclarlas convierte picos de carga legítimos en crash loops.

### Caso: Readiness probe no permite arrancar (timeout durante init)

**¿Qué ocasionó el error?**
App con cold start de 90s (carga config, warmup JVM, conexión pool a DB). El `initialDelaySeconds: 30` + `failureThreshold: 3` resulta en kill a los 60s, antes de terminar el startup.

**¿Cómo se solucionó?**
Usar **`startupProbe`** explícitamente, que desactiva las otras dos probes hasta que pase. `startupProbe.periodSeconds: 10` + `failureThreshold: 12` da 120s de margen. Una vez que la app está lista, el startup probe pasa a SUCCESS y las probes liveness/readiness se activan.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "health check", "liveness probe", "readiness probe", "/healthz", "graceful degradation"
- **Prioridad de carga:** Alta — obligatorio en producción K8s
- **Dependencias:** `container-orchestration-k8s-scheduling`, `circuit-breaker-pattern`, `graceful-shutdown-handling`

### Tool Integration

```json
{
  "tool_name": "health_checks_liveness_readiness",
  "description": "Diseña health checks para Kubernetes: separa liveness (proceso), readiness (tráfico) y startup (cold start). Evita restart loops y 503 storms.",
  "triggers": ["health check", "liveness", "readiness", "startup probe", "/healthz", "probe failure"],
  "context_hint": "Activar cuando el usuario diseñe deployments K8s, enfrente crash loops, o implemente rolling deploys.",
  "output_format": "markdown",
  "max_tokens": 900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre health checks, liveness o readiness probes,
carga el skill health-checks-liveness-readiness y advierte NUNCA incluir
dependencias externas en liveness (solo en readiness).
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver estado de pods y su readiness
kubectl get pods -n prod -o wide
kubectl describe pod <pod-name> -n prod  # sección "Conditions" muestra probe status

# Probar endpoint manualmente
kubectl port-forward pod/<pod-name> 8080:8080
curl -v http://localhost:8080/actuator/health/readiness

# Ver eventos de probe failure
kubectl get events -n prod --field-selector reason=Unhealthy

# Ejecutar probe desde dentro del pod
kubectl exec -it <pod> -- curl localhost:8080/actuator/health
```

### GUI / Web

- **k9s** (terminal UI): panel "Pods" con columna READY (1/1 = OK, 0/1 = not ready)
- **Lens / Octant**: vista de pods con heatmap de restart count y probe status
- **Grafana**: dashboard "K8s Probe Failures" con conteo de fallos por pod y razón
- **Datadog APM**: mapa de servicios con health score, integración con Kubernetes

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver estado de probes | `kubectl describe pod foo` | Click en pod en Lens |
| Probar endpoint | `kubectl port-forward` | `Ctrl+Shift+P` en Octant |
| Forzar re-evaluación readiness | `kubectl exec -- touch /ready` | Botón "Mark Ready" (custom controllers) |

---

## 7. Cheatsheet Rápido

```yaml
# Plantilla mínima: tres probes separadas
startupProbe:    { httpGet: { path: /healthz, port: 8080 }, periodSeconds: 5,  failureThreshold: 24 }
livenessProbe:   { httpGet: { path: /livez,  port: 8080 }, periodSeconds: 10, failureThreshold: 3  }
readinessProbe:  { httpGet: { path: /readyz, port: 8080 }, periodSeconds: 5,  failureThreshold: 2  }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `container-orchestration-k8s-scheduling` | Dependiente (K8s como host) | Sí |
| `circuit-breaker-pattern` | Complementario (CB → readiness outOfService) | Sí |
| `graceful-shutdown-handling` | Complementario (probe + drain) | Sí |
| `auto-healing-systems` | Superconjunto (recovery + health) | Sí |
| `monitoring-prometheus-metrics` | Dependiente (métricas de probe) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: health-checks-liveness-readiness
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [health-check, liveness, readiness, startup, kubernetes, probes, k8s, /healthz]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*
