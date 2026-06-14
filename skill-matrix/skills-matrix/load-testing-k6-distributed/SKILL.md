---
name: load-testing-k6-distributed
description: "k6 es una herramienta de load testing con scripting en JavaScript, output a Prometheus, y operador Kubernetes para ejecución distribuida"
---
# Load Testing with k6 (Distributed)

## Semantic Triggers
```
k6 load testing, distributed load test, k6 javascript, performance testing kubernetes, k6 operator, thresholds checks, virtual users vu, stress test peak, soak test endurance
```

---

## 1. Definición Teórica

k6 es una herramienta de load testing con scripting en JavaScript, output a Prometheus, y operador Kubernetes para ejecución distribuida. Soporta patrones smoke (1-5 VU), load (target VU), stress (2x target), soak (target VU por horas), y spike. Thresholds definen condiciones pass/fail en métricas (p95 latency < 500ms). Checks son aserciones durante la ejecución. El operador k6 permite distribuir carga desde múltiples nodos.

---

## 2. Implementación de Referencia

k6 v0.56+ con k6-operator v0.2+ para distributed testing. Integración con Prometheus remote write + Grafana dashboard.

### Ejemplo Práctico Avanzado

```javascript
import http from "k6/http"
import { check, sleep, group } from "k6"
import { Rate, Trend } from "k6/metrics"

const errorRate = new Rate("errors")
const apiLatency = new Trend("api_latency")
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000"

export const options = {
  stages: [
    { duration: "2m", target: 50 },    // ramp up
    { duration: "5m", target: 50 },    // hold
    { duration: "1m", target: 100 },   // spike
    { duration: "3m", target: 100 },   // hold peak
    { duration: "2m", target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
    errors: ["rate<0.05"],
  },
}

export default function () {
  group("API endpoints", () => {
    // GET /products
    const products = http.get(`${BASE_URL}/api/v1/products`, {
      tags: { endpoint: "products" },
    })
    check(products, {
      "products status 200": (r) => r.status === 200,
      "products body not empty": (r) => r.body.length > 0,
    })
    apiLatency.add(products.timings.duration)
    errorRate.add(products.status >= 400)

    // POST /orders
    const payload = JSON.stringify({
      product_id: 123,
      quantity: 2,
    })
    const order = http.post(`${BASE_URL}/api/v1/orders`, payload, {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "orders" },
    })
    check(order, {
      "order status 201": (r) => r.status === 201,
      "order has id": (r) => JSON.parse(r.body).id !== undefined,
    })
  })
  sleep(1)
}
---
# k6-operator distributed test
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: distributed-load-test
spec:
  parallelism: 4
  script:
    configMap:
      name: k6-test
      file: test.js
  arguments: --out output-prometheus-remote
  runner:
    image: grafana/k6:latest
    env:
      - name: BASE_URL
        value: "http://api-service:8000"
```

**Fuente oficial:** https://k6.io/docs/

### Alternativa de Implementación Específica

Artillery (Node.js YAML/JS) para equipos que prefieren configuración declarativa YAML sobre scripting JS directo.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Pruebas de rendimiento en CI, validación de SLOs, benchmark de API |
| **Cuándo evitar** | UI testing (Playwright mejor), pruebas de humo simples (curl basta) |
| **Alternativas** | Artillery (YAML), Locust (Python), wrk (C low-level), hey (Go CLI) |
| **Coste/Complejidad** | Bajo. k6 es gratuito y open-source. Distribuido requiere K8s y operador |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: k6 solo test, thresholds no fallan

**¿Qué ocasionó el error?**
Los thresholds usaban `p(95)<500` pero el endpoint real devolvía ~800ms. Sin embargo CI pasaba porque no se evaluaban thresholds contra métricas correlacionadas.

**¿Cómo se solucionó?**
Los thresholds se evalúan inline si forman parte de `export const options`. Se verificó que `http_req_duration` estuviera en `thresholds`, no en checks.

**¿Por qué funciona esta técnica?**
Thresholds son condiciones de pass/fail que detienen el test si se violan. Checks solo registran pass/fail sin detener.

### Caso: Distributed test no escala

**¿Qué ocasionó el error?**
`parallelism: 4` no generaba suficiente carga porque cada pod ejecutaba el mismo script completo.

**¿Cómo se solucionó?**
```yaml
spec:
  parallelism: 4
  arguments: --execution-segment=0:1/4  # cada pod ejecuta segmento diferente
```

**¿Por qué funciona esta técnica?**
Sin `execution-segment`, cada pod ejecuta el test completo duplicado. Con segmentación, se dividen los VUs.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** load testing, k6, performance test, stress test, vu, threshold
- **Prioridad de carga:** Baja — skill de testing
- **Dependencias:** `08-monitoring-prometheus-metrics`

### Tool Integration

```json
{
  "tool_name": "load-testing-k6-distributed",
  "description": "Pruebas de carga con k6, thresholds, checks, distributed testing con k6-operator",
  "triggers": ["load test", "k6", "performance test", "stress test", "benchmark"],
  "context_hint": "Activar cuando se hable de pruebas de rendimiento o carga",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre load testing o rendimiento, carga el skill
load-testing-k6-distributed. Proporciona scripts k6 con stages de ramp-up, thresholds,
checks, y distributed test con k6-operator en K8s.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Local
k6 run test.js
k6 run --vus 10 --duration 30s test.js
k6 run --out json=results.json test.js
k6 run --out prometheus-remote test.js

# Cloud
k6 cloud test.js
K6_CLOUD_TOKEN=xxx k6 run --out cloud test.js

# Distributed (K8s)
kubectl apply -f testrun.yaml
kubectl get testrun
kubectl logs distributed-load-test-1

# Post-processing
k6 convert results.json results.csv
```

### GUI / Web

- **k6 Cloud**: Dashboard SaaS con resultados visuales, comparativas históricas
- **Grafana + Prometheus**: Dashboard de resultados de k6 con métricas en vivo
- **k6 Studio**: UI para diseñar tests visualmente (arrastrar y soltar)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Run test | `k6 run test.js` | k6 Cloud → New Test |
| Stream results | `k6 run --out prometheus-remote test.js` | Grafana → k6 Dashboard |
| Cloud run | `k6 cloud test.js` | k6 Cloud → Run |

---

## 7. Cheatsheet Rápido

```javascript
// Test mínimo k6
import http from "k6/http"
import { check } from "k6"
export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
}
export default function () {
  const res = http.get("http://localhost:8000/health")
  check(res, { "status 200": (r) => r.status === 200 })
}
// CLI: k6 run test.js
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `08-monitoring-prometheus-metrics` | complementario (métricas de rendimiento) | Sí |
| `23-slas-slis-slos-error-budgets` | complementario (validación de SLOs) | No |
| `06-cicd-declarative-pipelines` | complementario (load test en CI) | Sí |
| `15-chaos-mesh-reliability-testing` | complementario (caos + carga) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: load-testing-k6-distributed
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [k6, load-testing, performance-testing, distributed-testing, thresholds, prometheus]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
