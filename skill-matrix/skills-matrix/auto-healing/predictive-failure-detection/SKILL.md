# predictive-failure-detection

## Semantic Triggers
```
predictive failure, AIOps, anomaly detection, predictive maintenance, ML monitoring, Prophet, forecasting, incident prediction, SLO burn rate, error budget exhaustion
```

---

## 1. Definición Teórica

Predictive failure detection resuelve el problema de anticipar incidentes antes de que se materialicen mediante técnicas de machine learning y análisis de series temporales aplicadas a métricas operacionales (latencia, error rate, saturación). El principio fundamental es la detección de anomalías: comparar el patrón actual contra un modelo del "comportamiento normal" aprendido históricamente, y disparar alertas cuando la desviación excede un umbral antes de que la métrica cruce el umbral de SLO. Aplica en sistemas maduros con telemetría robusta (Prometheus, Datadog, CloudWatch) y bases de datos históricas de > 30 días. Existe como categoría diferenciada del monitoring reactivo tradicional (alertar cuando CPU > 90%) porque predice transiciones: "la latencia está subiendo con pendiente positiva y en 35 minutos cruzará el SLO" → acción preventiva (escalar proactivamente, drenar tráfico). Complementa pero no reemplaza el monitoring tradicional: ambos coexisten.

---

## 2. Implementación de Referencia

Tooling de referencia: Prometheus + Prophet (Facebook) o ARIMA, AWS DevOps Guru, Azure Metrics Advisor, Datadog Forecast, Grafana ML, Elastic ML. Lenguajes: Python (pandas, prophet, scikit-learn), R (forecast), SQL para pre-aggregación.

### Ejemplo Práctico Avanzado

```python
# Python 3.12: Prophet + Prometheus para predecir SLO breach
import pandas as pd
from prophet import Prophet
from prometheus_api_client import PrometheusConnect
from datetime import datetime, timedelta
import numpy as np

class SLOBurnPredictor:
    """
    Predice cuándo se agotará el error budget basándose en la velocidad
    de burn actual. Implementa el algoritmo de Google SRE Workbook.
    """
    
    def __init__(self, prometheus_url: str, slo_target: float, window_days: int = 28):
        self.prom = PrometheusConnect(url=prometheus_url, disable_ssl=True)
        self.slo_target = slo_target  # 0.999 = 99.9%
        self.window_days = window_days
        self.error_budget = (1 - slo_target) * window_days * 24 * 60  # minutos
        
    def get_metric_history(self, query: str) -> pd.DataFrame:
        """Extrae métrica de Prometheus como DataFrame."""
        start = datetime.now() - timedelta(days=self.window_days)
        end = datetime.now()
        result = self.prom.custom_query_range(
            query=query, start_time=start, end_time=end, step='5m'
        )
        df = pd.DataFrame(result[0]['values'], columns=['timestamp', 'value'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
        df['value'] = df['value'].astype(float)
        return df
    
    def predict_burn_rate(self, sli_query: str) -> dict:
        """
        Calcula burn rate actual y predice cuándo se agotará el budget.
        Burn rate = velocidad de consumo del error budget.
        """
        df = self.get_metric_history(sli_query)
        df['error_rate'] = 1 - df['value']  # SLI = success rate → error = 1 - SLI
        
        # Rolling burn rate (Google SRE: 1h window para alertas rápidas)
        df['burn_1h'] = df['error_rate'].rolling('1h').mean()
        df['burn_6h'] = df['error_rate'].rolling('6h').mean()
        df['burn_24h'] = df['error_rate'].rolling('24h').mean()
        
        # Predicción Prophet sobre la tendencia
        prophet_df = df.reset_index()[['timestamp', 'burn_1h']].rename(
            columns={'timestamp': 'ds', 'burn_1h': 'y'}
        ).dropna()
        
        model = Prophet(
            changepoint_prior_scale=0.05,  # flexibilidad a cambios
            interval_width=0.95,
            daily_seasonality=True,
            weekly_seasonality=True,
        ).fit(prophet_df)
        
        future = model.make_future_dataframe(periods=6 * 60, freq='5min')  # 6h ahead
        forecast = model.predict(future)
        
        # Calcular cuándo burn rate x tiempo = error budget restante
        budget_consumed_1h = df['burn_1h'].iloc[-1] * 60  # minutos de budget
        if budget_consumed_1h > 0:
            hours_to_exhaustion = (self.error_budget - budget_consumed_1h) / (budget_consumed_1h / 60)
        else:
            hours_to_exhaustion = float('inf')
        
        return {
            'current_burn_1h': float(df['burn_1h'].iloc[-1]),
            'current_burn_6h': float(df['burn_6h'].iloc[-1]),
            'budget_remaining_pct': float(100 * (1 - budget_consumed_1h / self.error_budget)),
            'hours_to_exhaustion': float(hours_to_exhaustion),
            'forecast_6h': forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(72).to_dict('records'),
            'anomaly_detected': df['burn_1h'].iloc[-1] > 14.4 * (1 - self.slo_target),  # 2% budget en 1h
        }
    
    def alert_if_critical(self, prediction: dict) -> list:
        """Genera alertas estructuradas si la predicción es crítica."""
        alerts = []
        # Google SRE: 2% budget en 1h = 1h burn rate 14.4x el target
        if prediction['anomaly_detected']:
            alerts.append({
                'severity': 'critical',
                'summary': f"SLO burn rate crítico: {prediction['current_burn_1h']:.1f}x",
                'description': f"Error budget se agotará en {prediction['hours_to_exhaustion']:.1f}h",
                'action': 'investigate_now',
            })
        elif prediction['hours_to_exhaustion'] < 72:
            alerts.append({
                'severity': 'warning',
                'summary': f"Error budget bajo: {prediction['budget_remaining_pct']:.1f}%",
                'action': 'plan_remediation',
            })
        return alerts

# Uso en producción
predictor = SLOBurnPredictor(
    prometheus_url='http://prometheus.monitoring:9090',
    slo_target=0.999,  # 99.9% SLO
    window_days=28,
)
prediction = predictor.predict_burn_rate(
    sli_query='sum(rate(http_requests_total{status=~"5..",service="checkout"}[5m])) / sum(rate(http_requests_total{service="checkout"}[5m]))'
)
alerts = predictor.alert_if_critical(prediction)
```

```yaml
# Grafana ML: alerta con forecast
apiVersion: 1
groups:
  - orgId: 1
    name: slo-burn-forecast
    interval: 1m
    rules:
      - uid: slo-forecast-checkout
        title: "SLO burn rate (predicted)"
        condition: B
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: 'sum(rate(http_requests_total{status=~"5..",service="checkout"}[5m])) / sum(rate(http_requests_total{service="checkout"}[5m]))'
          - refId: B
            datasourceUid: '__expr__'
            model:
              type: reduce
              expression: A
              reducer: last
              window: 1h
        noDataState: OK
        execErrState: Alerting
        for: 5m
        annotations:
          summary: "Burn rate predicted to exhaust budget in {{ $labels.hours_to_exhaustion }}h"
          runbook_url: "https://wiki.example.com/runbooks/checkout-slo"
```

**Fuente oficial:** [Google SRE Workbook — Burn Rate Alerts](https://sre.google/workbook/alerting-on-slos/) · [Prophet Documentation](https://facebook.github.io/prophet/) · [AWS DevOps Guru](https://aws.amazon.com/devops-guru/)

### Alternativa de Implementación Específica

Datadog Forecast: SaaS-managed ML forecasting, integración nativa con métricas Datadog. Más caro pero sin运维 de modelos.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas con telemetría histórica rica (> 30 días), SLOs definidos con error budget, equipos SRE maduros, métricas con estacionalidad (tráfico diario/semanal) |
| **Cuándo evitar** | Sistemas nuevos sin histórico, métricas con ruido excesivo (baja señal/ruido), equipos sin capacidad de actuar sobre la predicción |
| **Alternativas** | Threshold-based alerting (más simple, reactivo), Statistical Process Control (SPC) sin ML, Observability + dashboards (sin alertas) |
| **Coste/Complejidad** | Coste alto (Prophet + Prometheus 1-2 semanas setup, o SaaS $$$); ROI en prevención de outages ($$$ saved); requiere data scientist o MLOps platform |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Predicción genera demasiados falsos positivos

**¿Qué ocasionó el error?**
El modelo Prophet aprendió "normal" durante una semana con bajo tráfico, luego el lunes siguiente (pico semanal) marca una anomalía. El equipo ignora las alertas, alert fatigue.

**¿Cómo se solucionó?**
1. **Añadir seasonality explícita**: Prophet detecta `weekly_seasonality=True` pero no capta bien anomalías recurrentes; combinar con `holidays` parameter para festividades
2. **Ensemble con múltiples ventanas**: comparar 1h, 6h, 24h burn rates (algoritmo Google SRE multi-window). Solo alertar cuando varias ventanas coinciden
3. **Anomaly score con threshold adaptativo**: en lugar de threshold fijo, usar `anomaly_score > 3` (3 sigmas) calculado sobre el histórico
4. **Feedback loop**: registrar feedback de analistas (`is_real_anomaly: true|false`) y reentrenar el modelo con esos labels

**¿Por qué funciona esta técnica?**
El multi-window burn rate evita alertas por picos espurios. El threshold adaptativo se ajusta a la varianza natural. El feedback loop permite que el modelo evolucione con el sistema.

### Caso: Predicción correcta pero acción imposible

**¿Qué ocasionó el error?**
El modelo predice "memory exhaustion en 4h". El equipo on-call no puede escalar porque el HPA está configurado con `minReplicas=1` y el cluster está al 100% de capacidad. La predicción es correcta pero la acción no es posible.

**¿Cómo se solucionó?**
1. **Alert routing diferenciado**: enviar predicciones de "impossible to remediate" a platform team (que puede provisionar nodos), no a app team
2. **Auto-remediation con runbooks**: conectar la predicción a `auto-remediation-runbooks` para acciones que SÍ se pueden automatizar
3. **Capacity planning signals**: track de predicciones frecuentes como input para decisiones de capacity (Reserved Instances, nodos pre-warm)

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~1100 tokens estimados al invocar este skill
- **Trigger de activación:** "predictive failure", "anomaly detection", "AIOps", "SLO burn rate", "error budget"
- **Prioridad de carga:** Baja — relevante solo para equipos SRE con telemetría madura
- **Dependencias:** `monitoring-prometheus-metrics`, `auto-remediation-runbooks`, `agent-human-in-the-loop-hitl`

### Tool Integration

```json
{
  "tool_name": "predictive_failure_detection",
  "description": "Implementa detección predictiva de fallos con ML (Prophet, ARIMA) y SLO burn rate alerts (Google SRE). Predice SLO breaches antes de que ocurran.",
  "triggers": ["predictive", "anomaly detection", "AIOps", "SLO burn", "error budget", "forecasting"],
  "context_hint": "Activar cuando el usuario mencione SLOs, error budget, alertas reactivas, o deseo de prevenir incidentes.",
  "output_format": "markdown",
  "max_tokens": 1200
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre anomaly detection, predictive monitoring o
SLO burn rate, carga el skill predictive-failure-detection y prioriza el
algoritmo multi-window burn rate de Google SRE sobre alertas de threshold fijo.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ejecutar predicción SLO burn rate
python3 slo_burn_predictor.py --service checkout --slo 0.999 --window 28d

# Query Prometheus para burn rate
curl -G http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.."}[5m])) / (1 - 0.999)'

# Visualizar forecast en Grafana
grafana-cli dashboard import slo-burn-forecast

# AWS DevOps Guru insights
aws devops-guru describe-insight --id <insight-id>
```

### GUI / Web

- **Grafana**: dashboard "SLO Burn Rate Forecast" con bandas de confianza Prophet
- **Datadog SLO**: vista de "burn rate" con forecast y alert customization
- **AWS DevOps Guru Console**: insights agrupados por recurso con anomaly correlation
- **New Relic Applied Intelligence**: anomalías detectadas + suggested actions

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver burn rate actual | `curl prometheus/api/v1/query` | Panel "SLO" en Grafana |
| Lanzar predicción | `python3 slo_burn_predictor.py` | Botón "Run Forecast" en Datadog |
| Marcar anomalía como falsa | N/A | Click "Mark as false positive" en Datadog |

---

## 7. Cheatsheet Rápido

```python
# Multi-window burn rate (Google SRE)
burn_1h = error_rate.rolling('1h').mean()
burn_6h = error_rate.rolling('6h').mean()
alert = burn_1h > 14.4 * (1 - slo) and burn_6h > 6 * (1 - slo)
# 14.4x = 2% budget in 1h; 6x = 5% budget in 6h
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `monitoring-prometheus-metrics` | Dependiente (fuente de datos) | Sí |
| `auto-remediation-runbooks` | Complementario (predicción → acción) | Sí |
| `agent-human-in-the-loop-hitl` | Complementario (HITL en alertas) | Sí |
| `auto-healing-systems` | Superconjunto (auto + predictive) | No |
| `slas-slis-slos-error-budgets` | Dependiente (SLOs base) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: predictive-failure-detection
domain: resilience-and-recovery
version: 1.0.0
created: 2026-06-14
updated: 2026-06-14
author: opencode-agent
status: active
archive_after: 2026-08-13
source: nueva-creacion
tags: [predictive, AIOps, anomaly-detection, SLO, burn-rate, error-budget, ML, Prophet]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-14*
