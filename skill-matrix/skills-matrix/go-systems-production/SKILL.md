---
name: go-systems-production
description: "Go resuelve la programación concurrente de sistemas con un modelo de gorutinas (∼4KB de stack, multiplexadas sobre hilos OS) y canales (CSP — Communicating Sequential Processes), combinando la prod..."
---
# Go Systems Programming for Production

## Semantic Triggers
```
goroutine leak detection pprof, errgroup.Group concurrency limit, graceful shutdown signal handling, panic recovery middleware HTTP, Go runtime debug stack dump, worker pool panic per-task recovery
```

---

## 1. Definición Teórica

Go resuelve la programación concurrente de sistemas con un modelo de gorutinas (∼4KB de stack, multiplexadas sobre hilos OS) y canales (CSP — Communicating Sequential Processes), combinando la productividad de lenguajes dinámicos con el rendimiento de compilados. El principio fundamental es que el scheduler de Go distribuye M gorutinas sobre N hilos OS (modelo M:N), con canales como primitiva de comunicación que integra sincronización en el paso de mensajes. Arquitectónicamente, el runtime incluye garbage collector concurrente (pausas <1ms), profiling integrado (pprof), y detección de gorutinas bloqueadas. Go está diseñado para servicios de red (HTTP, gRPC), herramientas CLI, y automatización, donde la simplicidad del lenguaje y la velocidad de compilación compensan la falta de genéricos avanzados (mejorados en Go 1.18+) y control de memoria.

---

## 2. Implementación de Referencia

Go ≥1.23 (último estable). Frameworks: `net/http` (stdlib), `chi`/`gin` (routing), `golang.org/x/sync/errgroup`. Idiomas: Go (nativo).

### Ejemplo Práctico Avanzado

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/signal"
    "runtime"
    "syscall"
    "time"

    "golang.org/x/sync/errgroup"
)

// Servidor HTTP con graceful shutdown y errgroup
func serveGracefully(ctx context.Context, addr string, handler http.Handler) error {
    srv := &http.Server{Addr: addr, Handler: handler}
    g, ctx := errgroup.WithContext(ctx)

    // Goroutine del servidor
    g.Go(func() error {
        log.Printf("Server starting on %s", addr)
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            return fmt.Errorf("server: %w", err)
        }
        return nil
    })

    // Goroutine de señal
    g.Go(func() error {
        sig := make(chan os.Signal, 1)
        signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
        select {
        case s := <-sig:
            log.Printf("Received signal: %v", s)
        case <-ctx.Done():
            log.Printf("Context cancelled: %v", ctx.Err())
        }
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
        defer cancel()
        return srv.Shutdown(shutdownCtx)
    })

    return g.Wait() // primer error o ctx.Done()
}

// Panic recovery middleware
func RecoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if rec := recover(); rec != nil {
                buf := make([]byte, 4096)
                n := runtime.Stack(buf, false)
                log.Printf("PANIC %s %s: %v\n%s",
                    r.Method, r.URL.Path, rec, buf[:n])
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

// Goroutine leak detector
type LeakDetector struct {
    threshold int
    baseline  int
}

func NewLeakDetector(threshold int) *LeakDetector {
    return &LeakDetector{
        threshold: threshold,
        baseline:  runtime.NumGoroutine(),
    }
}

func (d *LeakDetector) Check() error {
    current := runtime.NumGoroutine()
    if diff := current - d.baseline; diff > d.threshold {
        buf := make([]byte, 4096)
        n := runtime.Stack(buf, true)
        return fmt.Errorf("goroutine leak: %d over baseline (%d total)\n%s",
            diff, current, buf[:n])
    }
    return nil
}

// Handler de ejemplo
func helloHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello from Go!\nGoroutines: %d", runtime.NumGoroutine())
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/", helloHandler)
    mux.HandleFunc("/debug/pprof/goroutine", func(w http.ResponseWriter, r *http.Request) {
        // Exponer stack de gorutinas para debugging
        buf := make([]byte, 65536)
        n := runtime.Stack(buf, true)
        w.Header().Set("Content-Type", "text/plain")
        w.Write(buf[:n])
    })

    handler := RecoveryMiddleware(mux)

    // Monitoreo de leaks periódico
    detector := NewLeakDetector(10)
    go func() {
        ticker := time.NewTicker(30 * time.Second)
        for range ticker.C {
            if err := detector.Check(); err != nil {
                log.Printf("WARNING: %v", err)
            }
        }
    }()

    ctx := context.Background()
    if err := serveGracefully(ctx, ":8080", handler); err != nil {
        log.Fatalf("Server error: %v", err)
    }
    log.Println("Server stopped gracefully")
}
```

**Fuente oficial:** https://pkg.go.dev/golang.org/x/sync/errgroup

### Alternativa de Implementación Específica

**Worker pool con errgroup y límite de concurrencia:**

```go
func processBatch(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10) // máximo 10 gorutinas concurrentes

    for _, item := range items {
        item := item // capturar variable de bucle
        g.Go(func() error {
            select {
            case <-ctx.Done():
                return ctx.Err()
            default:
                return processItem(ctx, item)
            }
        })
    }
    return g.Wait()
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Microservicios HTTP/gRPC, herramientas CLI, proxies/balanceadores, automatización, agents, sistemas donde la rapidez de compilación y despliegue importa |
| **Cuándo evitar** | Sistemas con requisitos de latencia <1μs (Go GC ~10μs pausas), kernels/drivers, sistemas embebidos sin runtime, aplicaciones GUI complejas (no hay binding nativo) |
| **Alternativas** | Rust (más control de memoria, menos GC overhead), Java/Kotlin (más madurez en microservicios, mejor tooling empresarial), C++/C (cuando no hay runtime acceptable), Zig (sin GC, compilación rápida) |
| **Coste/Complejidad** | Bajo: Go es simple de aprender, compila rápido (segundos), despliegue con binario estático único. El modelo de concurrencia (gorutinas + canales) es más simple que async/await de Rust. La gestión de dependencias con Go modules es robusta |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Goroutine leak: 100k gorutinas bloqueadas en read

**¿Qué ocasionó el error?**
Un worker pool leía de un canal sin cerrar. Cuando el productor terminó, el canal nunca se cerró, y los workers quedaron bloqueados en `ch <- data` esperando un lector que ya no existe.

**¿Cómo se solucionó?**
Cerrar el canal cuando el productor termina y detectar el cierre en los workers:

```go
// Productor
go func() {
    defer close(ch) // cerrar canal al terminar
    for _, item := range items {
        select {
        case ch <- item:
        case <-ctx.Done():
            return
        }
    }
}()

// Workers
for item := range ch { // range detecta cierre
    process(item)
}
```

**¿Por qué funciona esta técnica?**
`defer close(ch)` garantiza que el canal se cierre aunque el productor falle. Los workers con `range ch` salen automáticamente cuando el canal se cierra. Sin `close`, los workers esperan eternamente (goroutine leak).

### Caso: errgroup cancela contexto pero no mata gorutinas

**¿Qué ocasionó el error?**
`errgroup` cancela el contexto cuando una gorutina retorna error, pero las otras gorutinas no observan el contexto y siguen ejecutándose hasta completar su trabajo, retrasando el shutdown.

**¿Cómo se solucionó?**
Propagar el contexto a todas las operaciones bloqueantes:

```go
g.Go(func() error {
    // ❌ No observa contexto
    resp, err := http.Post("https://api.example.com", "text/plain", body)

    // ✅ Observa contexto
    req, _ := http.NewRequestWithContext(ctx, "POST", "https://api.example.com", body)
    resp, err := http.DefaultClient.Do(req)
    return err
})
```

**¿Por qué funciona esta técnica?**
`errgroup.WithContext` crea un contexto cancelable. `g.Go` recibe este contexto. Si una gorutina falla, el contexto se cancela. Las demás gorutinas deben usar este contexto para ser notificadas y abortar. Sin propagación del contexto, el cancel es ignorado.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~190 tokens estimados al invocar este skill
- **Trigger de activación:** `goroutine leak detection pprof`
- **Prioridad de carga:** Alta — Go es runtime popular para microservicios
- **Dependencias:** `23-process-scheduler-namespaces` (scheduling de gorutinas), `17-signals-and-interrupts-handling` (signal handling)

### Tool Integration

```json
{
  "tool_name": "go-systems-production",
  "description": "Desarrollo Go en producción: errgroup, graceful shutdown, pprof, worker pools, panic recovery",
  "triggers": ["Go", "goroutine", "errgroup", "graceful shutdown", "pprof", "panic recovery", "leak detection"],
  "context_hint": "Inyectar ejemplo de servidor HTTP con errgroup, graceful shutdown y goroutine leak detector",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Go en producción o concurrencia Go, carga el skill
go-systems-production. Proporciona ejemplos de errgroup con SetLimit, graceful shutdown
mediante signal.Notify, y detección de goroutine leaks con pprof.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Compilar
go build -o myapp ./

# Profiling con pprof
go tool pprof -http=:8081 http://localhost:8080/debug/pprof/goroutine
go tool pprof -http=:8081 http://localhost:8080/debug/pprof/heap

# Tracing
go test -trace=trace.out ./...
go tool trace trace.out

# Race detection
go test -race ./...
```

### GUI / Web

- **pprof web UI**: http://localhost:8081 con flamegraph, graph, top
- **GoLand (JetBrains)**: debug con goroutine profiling
- **VSCode + Go extension**: integración de pprof y dlv (delve debugger)
- **Grafana + expvar**: dashboards de métricas Go runtime

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ejecutar con race | `go run -race main.go` | `GoLand → Run with Race Detector` |
| Pprof web UI | `go tool pprof -http=:8081 <url>` | `VSCode → Command Palette → Go: Pprof` |
| Ver gorutinas | `curl localhost:8080/debug/pprof/goroutine?debug=2` | `GoLand → Goroutines tab` |

---

## 7. Cheatsheet Rápido

```go
// Go production essentials — 12 líneas
g, ctx := errgroup.WithContext(context.Background())
g.SetLimit(10) // máximo 10 gorutinas
g.Go(func() error {
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
        return work(ctx)
    }
})
err := g.Wait() // primer error o nil
// Graceful shutdown: signal.Notify → srv.Shutdown(ctx, 15s)
// Leak: runtime.NumGoroutine() + pprof
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `23-process-scheduler-namespaces` | complementario — M:N scheduling | Sí |
| `17-signals-and-interrupts-handling` | dependiente — signal handling | Sí |
| `27-rust-systems-programming` | alternativo — Rust vs Go | No |
| `13-garbage-collection-algorithms` | dependiente — Go GC pacing | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: go-systems-production
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/30-go-systems-production
tags: [Go, goroutine, errgroup, graceful-shutdown, pprof, panic-recovery, worker-pool]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
