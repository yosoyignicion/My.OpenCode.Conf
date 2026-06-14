# graceful-shutdown-handling

## Semantic Triggers
```
graceful shutdown, SIGTERM, SIGINT, signal handling, preStop hook, connection draining, termination grace period, in-flight requests, pod eviction, zero-downtime deploy
```

---

## 1. Definición Teórica

Graceful shutdown resuelve el problema de las conexiones truncadas y datos perdidos durante el ciclo de vida de un proceso (rolling deploys, scale-down, mantenimiento) permitiendo que el proceso complete el trabajo en vuelo antes de terminar. El principio fundamental es la "drain semantics": ante SIGTERM, el proceso (1) deja de aceptar nuevas conexiones, (2) marca su readiness probe como no-ready (saca del Service), (3) espera a que las conexiones in-flight terminen, (4) cierra limpiamente. Aplica en cualquier servidor de red (HTTP, gRPC, DB, message broker) que mantenga conexiones persistentes, y es crítico en Kubernetes donde los rolling deploys matan pods continuamente. Existe como patrón diferenciada porque el comportamiento por defecto de muchos runtimes (kill -9 inmediato, sin drain) resulta en errores 502/503 visibles al cliente, transacciones a mitad de camino, mensajes publicados parcialmente, y corrupciones en estado distribuido.

---

## 2. Implementación de Referencia

Stack de referencia: Kubernetes 1.30+ (preStop hooks, terminationGracePeriodSeconds), Go `os/signal` + `context.Context`, Spring Boot 3.2+ `SmartLifecycle`, Node.js `http.Server.close()`, Python `asyncio.Event`. Estándar: SIGTERM (15) graceful, SIGKILL (9) forzado.

### Ejemplo Práctico Avanzado

```go
// Go 1.22: HTTP server con graceful shutdown
package main

import (
    "context"
    "errors"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

type Server struct {
    httpServer *http.Server
    db         *sql.DB
    producer   *kafka.Producer
}

func (s *Server) Run(addr string) error {
    srv := &http.Server{
        Addr:    addr,
        Handler: s.router(),
        // ReadHeaderTimeout previene Slowloris attacks y libera conexiones rápido
        ReadHeaderTimeout: 5 * time.Second,
    }
    s.httpServer = srv

    // Escuchar SIGINT (Ctrl+C) y SIGTERM (Kubernetes)
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

    errCh := make(chan error, 1)
    go func() {
        log.Printf("server listening on %s", addr)
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            errCh <- err
        }
    }()

    select {
    case err := <-errCh:
        return err
    case sig := <-stop:
        log.Printf("received signal %v, starting graceful shutdown", sig)
        return s.gracefulShutdown(30 * time.Second)
    }
}

func (s *Server) gracefulShutdown(timeout time.Duration) error {
    // Fase 1: notificar al resto del sistema que estamos en drain
    log.Println("phase 1: marking unhealthy, refusing new connections")
    readiness.Store(false)  // atomic.Bool; readiness probe ahora devuelve 503

    // Fase 2: esperar a que Kubernetes saque el pod del Service
    // (preStop hook hace el resto si está configurado)
    time.Sleep(5 * time.Second)  // típico: terminationGracePeriodSeconds / 6

    // Fase 3: crear context con timeout para las conexiones in-flight
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    // Fase 4: cerrar el HTTP server (deja de aceptar, espera a in-flight)
    log.Println("phase 2: waiting for in-flight requests to complete")
    if err := s.httpServer.Shutdown(ctx); err != nil {
        log.Printf("http server shutdown error: %v", err)
        s.httpServer.Close()  // forzar cierre
    }

    // Fase 5: cerrar dependencias downstream (orden inverso al startup)
    log.Println("phase 3: flushing kafka producer and closing db")
    if err := s.producer.Flush(5 * time.Second); err != nil {
        log.Printf("kafka flush error: %v", err)
    }
    s.producer.Close()
    s.db.Close()

    log.Println("graceful shutdown complete")
    return nil
}
```

```yaml
# Kubernetes: configuration para que el drain funcione
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      # 30s desde SIGTERM hasta SIGKILL; debe ser > al drain time
      terminationGracePeriodSeconds: 30

      containers:
      - name: api
        image: api:v1.0.0
        ports: [{ containerPort: 8080 }]

        # preStop hook: corre ANTES de enviar SIGTERM
        # Útil para: warming de cache, deregister de service discovery, sleep
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Dar tiempo al endpoint readiness para propagarse
                # (kube-proxy + service mesh pueden tardar 1-2s en refresh)
                sleep 5
                # Notificar al load balancer externo (opcional)
                curl -X POST http://lb-admin/deregister?id=$POD_NAME

        # Readiness probe con short interval: detecta drain en <5s
        readinessProbe:
          httpGet: { path: /readyz, port: 8080 }
          periodSeconds: 2
          failureThreshold: 1   # 1 fallo = out of service
        livenessProbe:
          httpGet: { path: /livez, port: 8080 }
          periodSeconds: 10
          failureThreshold: 3
```

**Fuente oficial:** [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) · [Go net/http Server.Shutdown](https://pkg.go.dev/net/http#Server.Shutdown) · [Spring Boot Graceful Shutdown](https://docs.spring.io/spring-boot/docs/current/reference/html/web.html#web.graceful-shutdown)

### Alternativa de Implementación Específica

Node.js: usar `http.Server.closeIdleConnections()` + `http.Server.closeAllConnections()` (Node 18.2+). Específico para HTTP/1.1 keep-alive.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Todo servidor HTTP/gRPC en Kubernetes, message brokers (Kafka, RabbitMQ), DB connection pools, webhooks salientes |
| **Cuándo evitar** | Pods batch de corta duración (< 5s) sin estado, sidecars que solo reenvían tráfico (dejar al mesh manejar) |
| **Alternativas** | Service mesh connection draining (Linkerd, Istio), Connection draining del load balancer (AWS ALB target group deregistration_delay), Async work via queues (offload) |
| **Coste/Complejidad** | Coste bajo (handler de signal + 1 hook); mal implementado deja requests colgados hasta el SIGKILL; requiere monitorizar el drain time |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Deploy rolling deja usuarios viendo 502s al inicio

**¿Qué ocasionó el error?**
Kubernetes envía SIGTERM al pod viejo, pero el Service (kube-proxy, AWS NLB) tarda 5-10s en actualizar las iptables y dejar de enviarle tráfico. Durante esos segundos, el pod recibe requests que ya no puede procesar correctamente (está cerrando), resultando en 502/504 al cliente.

**¿Cómo se solucionó?**
1. **preStop hook con `sleep 5`**: da tiempo a kube-proxy/service-mesh para refrescar antes de matar el proceso
2. **Readiness probe rápida** (periodSeconds: 2, failureThreshold: 1): marca no-ready inmediatamente al inicio del shutdown
3. **Increase terminationGracePeriodSeconds** a 30-60s (default es 30s) para dar margen al drain
4. En AWS: configurar `deregistration_delay.timeout_seconds=10` en el Target Group

**¿Por qué funciona esta técnica?**
El sleep en preStop es la única forma confiable de esperar a que el plano de control propague el cambio. Readiness rápido acelera la salida del balanceador. La gracia extendida da tiempo al drain sin matar al proceso.

### Caso: In-flight requests colgados en SIGTERM bloquean el deploy

**¿Qué ocasionó el error?**
Una request lenta (consulta a DB de 60s) está en vuelo cuando llega SIGTERM. El `httpServer.Shutdown(ctx)` espera a que termine, pero el context timeout (30s) se agota y Kubernetes envía SIGKILL a los 30s, truncando la request.

**¿Cómo se solucionó?**
1. **Client-side timeout**: cada request HTTP tiene un timeout de 25s; el server nunca debería tener una request de 60s
2. **Async offloading**: si el trabajo es lento (>10s), pasarlo a una cola (SQS, Kafka) y devolver 202 Accepted
3. **Force close en último momento**: si el context expira, cerrar conexiones sin esperar (acceptable: el cliente verá 503 y reintentará con idempotency key)

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "graceful shutdown", "SIGTERM", "drain", "termination", "preStop", "rolling deploy"
- **Prioridad de carga:** Alta — obligatorio en zero-downtime deploys
- **Dependencias:** `health-checks-liveness-readiness`, `container-orchestration-k8s-scheduling`, `auto-healing-systems`

### Tool Integration

```json
{
  "tool_name": "graceful_shutdown_handling",
  "description": "Implementa graceful shutdown para servidores HTTP/gRPC: drain de conexiones in-flight, propagación a service discovery, preStop hooks, termination grace period.",
  "triggers": ["graceful shutdown", "SIGTERM", "drain", "preStop", "termination", "rolling deploy", "502 errors"],
  "context_hint": "Activar cuando el usuario diseñe rolling deploys, enfrente 502s durante deploys, o implemente signal handlers.",
  "output_format": "markdown",
  "max_tokens": 1000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre graceful shutdown, SIGTERM, drain o rolling
deploys, carga el skill graceful-shutdown-handling y recomienda preStop hook
con sleep + readiness rápido + terminationGracePeriodSeconds ≥ 30s.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver terminationGracePeriodSeconds de un pod
kubectl get pod <pod> -o jsonpath='{.spec.terminationGracePeriodSeconds}'

# Probar shutdown manualmente (envía SIGTERM)
kubectl exec -it <pod> -- kill -TERM 1

# Ver eventos de termination
kubectl get events --field-selector reason=Killing

# Simular carga durante deploy
hey -n 1000 -c 50 http://api.example.com/health &
kubectl rollout restart deploy/api
wait
```

### GUI / Web

- **k9s**: vista de pod con restart count y "Terminating" state
- **Lens**: timeline de eventos del pod con SIGTERM/SIGKILL timestamps
- **Grafana**: dashboard "Deploy Impact" con error rate durante rolling updates
- **Argo Rollouts UI**: visualize de blue-green/canary con métricas por step

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver YAML del pod | `kubectl get pod -o yaml` | `Ctrl+Y` en Lens |
| Rollout restart | `kubectl rollout restart deploy/foo` | Botón "Restart" en Argo CD |
| Forzar termination | `kubectl delete pod foo --force --grace-period=0` | N/A (acción peligrosa) |

---

## 7. Cheatsheet Rápido

```go
// Go: patron minimo graceful shutdown
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
if err := server.Shutdown(ctx); err != nil { log.Fatal(err) }
```

```yaml
# K8s: preStop + grace period
terminationGracePeriodSeconds: 30
lifecycle:
  preStop: { exec: { command: ["sh","-c","sleep 5"] } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `health-checks-liveness-readiness` | Complementario (readiness = drain signal) | Sí |
| `container-orchestration-k8s-scheduling` | Dependiente (K8s lifecycle) | Sí |
| `auto-healing-systems` | Complementario (recuperación = restart limpio) | Sí |
| `circuit-breaker-pattern` | Complementario (CB durante shutdown) | No |
| `monitoring-prometheus-metrics` | Dependiente (métricas de drain) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: graceful-shutdown-handling
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [graceful-shutdown, SIGTERM, drain, preStop, rolling-deploy, kubernetes, zero-downtime]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*
