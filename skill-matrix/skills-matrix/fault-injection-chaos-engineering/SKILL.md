---
name: fault-injection-chaos-engineering
description: "Chaos engineering tests system resilience by injecting controlled failures"
---
# Fault Injection & Chaos Engineering

## Semantic Triggers
```
chaos engineering principles steady state and hypothesis, fault injection with litmus chaos and chaos mesh, network fault injection latency packet loss partition, application level fault injection error responses and delays, blast radius minimization and chaos experiments in production, automated chaos experiments with gameday and cross functional
```

---

## 1. Definición Teórica

Chaos engineering tests system resilience by injecting controlled failures. It solves the problem of discovering system weaknesses before they cause production incidents. Key distinction from traditional testing: chaos experiments verify system behavior under unknown failure conditions, not predefined test cases. The scientific method is applied to production — hypothesize steady state, inject fault, measure impact, improve.

---

## 2. Implementación de Referencia

**Litmus** (CNCF) — Kubernetes-native chaos engineering. **Chaos Mesh** — fault injection for Kubernetes. **Gremlin** — SaaS chaos engineering platform. **toxiproxy** — application-level network fault injection. **Envoy fault injection** — service mesh level latency/error injection.

### Ejemplo Práctico Avanzado

```yaml
# Litmus ChaosEngine — pod kill + CPU stress
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: payment-chaos
  namespace: default
spec:
  appinfo:
    appns: "default"
    applabel: "app=payment"
    appkind: "deployment"
  chaosServiceAccount: litmus-admin
  monitoring: true
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        - name: CHAOS_INTERVAL
          value: "10"
        - name: PODS_AFFECTED_PERC
          value: "50"
        - name: RAMP_TIME
          value: "10"
  - name: pod-cpu-hog
    spec:
      components:
        env:
        - name: CPU_CORES
          value: "1"
        - name: TOTAL_CHAOS_DURATION
          value: "30"
        - name: TARGET_PODS
          value: "1"
  - name: pod-network-latency
    spec:
      components:
        env:
        - name: NETWORK_LATENCY
          value: "500"  # ms
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        - name: PODS_AFFECTED_PERC
          value: "25"
```

```python
# Application-level fault injection
import random
import asyncio
from dataclasses import dataclass

@dataclass
class FaultConfig:
    """Configuration for controlled fault injection."""
    latency_p: float = 0.0       # probability of injecting latency
    latency_ms: int = 500         # latency duration in ms
    error_p: float = 0.0         # probability of returning error
    error_code: int = 500        # HTTP status code for error
    exception_p: float = 0.0     # probability of throwing exception

class FaultInjector:
    """Injects controlled faults into service calls for chaos testing."""
    def __init__(self, config: FaultConfig = None, enabled: bool = False):
        self.config = config or FaultConfig()
        self.enabled = enabled
        self.metrics = {"latency_injected": 0, "errors_injected": 0, "total_calls": 0}

    async def inject(self):
        """Apply fault injection based on configuration."""
        if not self.enabled:
            return
        self.metrics["total_calls"] += 1

        if random.random() < self.config.latency_p:
            self.metrics["latency_injected"] += 1
            await asyncio.sleep(self.config.latency_ms / 1000.0)

        if random.random() < self.config.error_p:
            self.metrics["errors_injected"] += 1
            raise FaultInjectedError(
                status_code=self.config.error_code,
                message=f"Injected fault: {self.config.error_code} error"
            )

        if random.random() < self.config.exception_p:
            self.metrics["errors_injected"] += 1
            raise RuntimeError("Injected exception for chaos testing")

# Middleware for FastAPI
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()
fault_injector = FaultInjector(
    config=FaultConfig(latency_p=0.1, latency_ms=200, error_p=0.05),
    enabled=os.getenv("CHAOS_ENABLED") == "true",
)

@app.middleware("http")
async def chaos_middleware(request: Request, call_next):
    await fault_injector.inject()
    try:
        return await call_next(request)
    except FaultInjectedError as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.message})

# Chaos experiment orchestrator
class ChaosExperiment:
    def __init__(self, name: str, hypothesis: str, targets: list[dict], steady_state_metric: str):
        self.name = name
        self.hypothesis = hypothesis
        self.targets = targets
        self.steady_state_metric = steady_state_metric

    async def run(self):
        """Run chaos experiment with rollback."""
        pre_metrics = await self._get_metrics()
        logging.info(f"Experiment {self.name}: pre-metrics = {pre_metrics}")

        await self._inject_fault()
        await asyncio.sleep(self.duration)
        await self._rollback()

        post_metrics = await self._get_metrics()
        self._analyze(pre_metrics, post_metrics)
```

**Fuente oficial:** https://litmuschaos.io/docs/

### Alternativa de Implementación Específica

**Chaos Mesh** — similar to Litmus, with built-in NetworkChaos, PodChaos, StressChaos, IOChaos, HTTPChaos. **Gremlin** — SaaS platform with pre-built experiments (shutdown, CPU, memory, blackhole, DNS). **Toxiproxy** — TCP proxy for injecting latency, jitter, and disconnections.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Production systems with resilience SLOs, microservices transitioning to production, post-incident validation of fixes, compliance (SOC 2 requires resilience testing) |
| **Cuándo evitar** | Non-production systems without production traffic patterns. Systems without monitoring (can't measure impact). Team without incident response experience |
| **Alternativas** | Load testing (k6) for performance. Failure mode testing (unit tests for error handling). GameDays (manual chaos exercises) |
| **Coste/Complejidad** | High — requires mature observability, blast radius controls, automated rollback, and cultural buy-in. Start with staging, then low-impact experiments in production |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Chaos experiment causes cascading failure

**¿Qué ocasionó el error?**
A pod-kill experiment kills 50% of payment service pods. The remaining pods can't handle the redirecting traffic. They also crash. The payment service is completely down.

**¿Cómo se solucionó?**
Start with tiny blast radius: 1 pod (not 50%). Verify HPA scales up quickly. Monitor deployment error rate and automatically stop experiment if error rate > 5%. Use gradual traffic increase.

**¿Por qué funciona esta técnica?**
Small blast radius limits impact. Automated experiment halting (steady state check) prevents cascading failures. Gradual rollout validates resilience at each level.

### Caso: False confidence from staging chaos tests

**¿Qué ocasionó el error?**
Chaos experiments in staging pass all tests. In production, the same experiments fail — because staging has lower traffic, fewer replicas, and different network conditions.

**¿Cómo se solucionó?**
Run experiments in production with careful blast radius controls. Use shadow traffic or mirroring for initial validation. Gradually increase production traffic percentage.

**¿Por qué funciona esta técnica?**
Production traffic patterns (thundering herds, request bursts, concurrent user behavior) are hard to simulate. Production experiments with guardrails reveal real weaknesses while minimizing impact.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "chaos engineering", "fault injection", "litmus", "chaos mesh", "game day"
- **Prioridad de carga:** Media — importante para validación de resiliencia
- **Dependencias:** `fault-injection-chaos-engineering`, `observability-patterns`

### Tool Integration

```json
{
  "tool_name": "fault-injection-chaos-engineering",
  "description": "Chaos engineering: fault injection (network, pod, CPU, memory), steady state hypothesis, blast radius, Litmus/Chaos Mesh",
  "triggers": ["chaos engineering", "fault injection", "litmus", "chaos mesh", "game day", "resilience testing"],
  "context_hint": "Load when user asks about chaos engineering, fault injection, or resilience testing patterns",
  "output_format": "markdown",
  "max_tokens": 950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre chaos engineering o fault injection, carga el skill
fault-injection-chaos-engineering. Prioriza Litmus/Chaos Mesh configuration
con blast radius control sobre teoría de principios de chaos.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Litmus: list and run experiments
kubectl get chaosexperiments -A
kubectl apply -f chaosengine.yaml
kubectl describe chaosengine payment-chaos

# Chaos Mesh: create network fault
kubectl apply -f network-delay.yaml
kubectl get networkchaos -A

# Gremlin: run attack (requires API key)
gremlin attack shutdown -l 30
gremlin attack latency --duration 60 --delay 500

# Toxiproxy: proxy-based fault injection
toxiproxy-cli create payment-proxy -l localhost:26379 -u upstream:6379
toxiproxy-cli toxic add payment-proxy -t latency -a latency=1000

# Verify fault injection
kubectl logs -l app=payment --tail=50 | grep "chaos\|fault\|inject"
kubectl top pods | grep payment
```

### GUI / Web

- **Litmus ChaosCenter** — experiment workflow, schedule, blast radius controls, result analysis
- **Chaos Mesh Dashboard** — fault visualization, experiment history, resource usage
- **Gremlin Web** — attack library, targeting, blast radius, real-time experiment monitoring
- **Grafana** — chaos experiment overlay on dashboards: mark experiment start/end on metrics

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List exp | `kubectl get chaosexperiments -A` | Litmus ChaosCenter → Experiments |
| Run exp | `kubectl apply -f chaosengine.yaml` | Chaos Mesh → New Experiment |
| Network fault | `kubectl apply -f network-delay.yaml` | Gremlin → Attacks → New Attack |
| Verify | `kubectl logs -l app=payment \| grep fault` | Grafana → Chaos overlay |

---

## 7. Cheatsheet Rápido

```yaml
# Chaos engineering principles:
# 1. Define steady state (SLOs, metrics)
# 2. Hypothesis: system remains within SLOs during fault
# 3. Inject fault (small blast radius)
# 4. Measure impact vs hypothesis
# 5. Improve and automate

# Litmus experiment types:
#   pod-delete, pod-cpu-hog, pod-memory-hog
#   pod-network-latency, pod-network-loss, pod-network-partition

# Blast radius controls:
#   PODS_AFFECTED_PERC: 50 → 50% pods affected
#   TOTAL_CHAOS_DURATION: 60s
#   TARGET_PODS: 1 → limit to 1 pod
#   RAMP_TIME: 10s → gradual injection

# Always: automated rollback, steady state check, kill switch
# Never: experiment without observability or blast radius limits
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `slas-slis-slos-error-budgets` | contexto — SLOs define steady state hypothesis | Sí |
| `backpressure-and-flow-control` | complementario — resilience patterns validated by chaos | No |
| `network-partitions-split-brain` | complementario — network partition experiments | No |
| `bulkhead-circuit-breaker-resilience` | complementario — validate circuit breakers via chaos | No |
| `monitoring-prometheus-metrics` | requisito — metrics for steady state verification | No |

---

## 9. Metadatos del Skill

```yaml
---
id: fault-injection-chaos-engineering
domain: 03-sistemas-distribuidos
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [chaos-engineering, fault-injection, litmus, chaos-mesh, gremlin, resilience, game-day, blast-radius]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
