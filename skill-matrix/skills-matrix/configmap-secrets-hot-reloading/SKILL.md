---
name: configmap-secrets-hot-reloading
description: "ConfigMaps y Secrets inyectan configuración en pods como variables de entorno o volúmenes montados"
---
# ConfigMap / Secrets & Hot Reloading

## Semantic Triggers
```
kubernetes configmap, kubernetes secrets, hot reload config, configmap update pod reload, reloader stakater, env from configmap, volume mount configmap, immutable configmap, secret encryption etcd
```

---

## 1. Definición Teórica

ConfigMaps y Secrets inyectan configuración en pods como variables de entorno o volúmenes montados. ConfigMaps se almacenan en etcd sin encriptar; Secrets están base64 (no encriptados en reposo por defecto). `immutable: true` mejora rendimiento y seguridad pero impide cambios — debe recrearse. Hot reloading con herramientas como Stakater Reloader detecta cambios en ConfigMap/Secret y trigger restart rolling de los pods asociados.

---

## 2. Implementación de Referencia

Stakater Reloader v1.3+ para auto-restart. K8s nativo `encryption-provider-config` para encriptación etcd. External Secrets Operator para sincronización cloud.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  labels:
    app: api
immutable: false
data:
  LOG_LEVEL: "info"
  DB_POOL_SIZE: "10"
  REDIS_HOST: "redis-primary"
  REDIS_PORT: "6379"
  app.yaml: |
    server:
      port: 8000
      timeout: 30s
      readTimeout: 10s
    metrics:
      enabled: true
      path: /metrics
---
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  labels:
    app: api
type: Opaque
stringData:
  DB_PASSWORD: s3cr3t!
  DB_USER: app_user
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  annotations:
    reloader.stakater.com/auto: "true"
    reloader.stakater.com/match: "true"
spec:
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/myorg/api:1.0.0
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: DB_PASSWORD
          envFrom:
            - configMapRef:
                name: api-config
                optional: false
          volumeMounts:
            - name: config-volume
              mountPath: /etc/app
              readOnly: true
      volumes:
        - name: config-volume
          configMap:
            name: api-config
            items:
              - key: app.yaml
                path: app.yaml
      terminationGracePeriodSeconds: 30
---
# Reloader: detecta cambios y restart pods
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  annotations:
    reloader.stakater.com/reload: "true"  # trigger restart
data:
  LOG_LEVEL: "debug"  # cambio → Reloader restart pods
---
# Immutable ConfigMap (mejor rendimiento)
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config-immutable
immutable: true
data:
  feature-flags.yaml: |
    new_checkout: true
    dark_mode: false
```

**Fuente oficial:** https://kubernetes.io/docs/concepts/configuration/configmap/

### Alternativa de Implementación Específica

Reloader con `reloader.stakater.com/auto: "true"` en el Deployment para detectar cambios en ConfigMaps y Secrets referenciados, y trigger rolling restart automático sin downtime.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Configuración dinámica, secretos de aplicación, hot reload sin downtime |
| **Cuándo evitar** | Configuración que nunca cambia (usar immutable), secretos cloud (ESO mejor) |
| **Alternativas** | Reloader (auto-restart), k8s-sidecar-injector (contenedor sidecar), ConfigMap watch (DIY) |
| **Coste/Complejidad** | Bajo. Reloader es simple de instalar. Secrets en etcd requieren encryption config |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Reloader no restart pods después de cambio

**¿Qué ocasionó el error?**
La anotación `reloader.stakater.com/auto: "true"` estaba en el ConfigMap, no en el Deployment.

**¿Cómo se solucionó?**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  annotations:
    reloader.stakater.com/auto: "true"  # ← en el Deployment
```

**¿Por qué funciona esta técnica?**
Reloader watch deployments con anotación `auto: true`. Las anotaciones en ConfigMaps no activan el restart.

### Caso: Secret en etcd visible en texto plano

**¿Qué ocasionó el error?**
Por defecto, K8s no encripta Secrets en etcd. `kubectl get secret -o yaml` muestra base64 pero cualquiera con acceso a etcd lee en plano.

**¿Cómo se solucionó?**
```bash
# encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets]
    providers:
      - aesgcm:
          keys:
            - name: key1
              secret: <base64-key>
      - identity: {}
```

**¿Por qué funciona esta técnica?**
`EncryptionConfiguration` encripta datos en etcd. `aesgcm` provee encriptación en reposo.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** configmap, secret, hot reload, reloader, configuration, immutable
- **Prioridad de carga:** Alta — fundamental para configuración K8s
- **Dependencias:** `12-secret-management-vault-integration`

### Tool Integration

```json
{
  "tool_name": "configmap-secrets-hot-reloading",
  "description": "Gestión de ConfigMaps y Secrets, hot reloading con Reloader, e inmutabilidad",
  "triggers": ["configmap", "secret", "hot reload", "configuration", "reloader"],
  "context_hint": "Activar cuando se discuta configuración de aplicaciones K8s",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre ConfigMaps, Secrets, o hot reloading, carga el skill
configmap-secrets-hot-reloading. Proporciona ConfigMap con env y volumen mount, Secrets seguro,
Reloader annotation para auto-restart, y encryption at rest.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear y ver
kubectl create configmap app-config --from-literal=key=value --from-file=config.yaml
kubectl create secret generic db-secret --from-literal=password=abc123
kubectl get configmap app-config -o yaml
kubectl describe secret db-secret

# Reloader
kubectl get pods -l app=api -w  # ver restart

# Immutable
kubectl create configmap immutable-config --from-file=config.json
kubectl annotate configmap immutable-config immutable=true

# Encriptación etcd
kubectl -n kube-system get pods -l component=kube-apiserver
kubectl -n kube-system exec kube-apiserver-0 -- ps aux | grep encryption

# Debug
kubectl exec deploy/api -- env | grep LOG_LEVEL
kubectl exec deploy/api -- cat /etc/app/app.yaml
```

### GUI / Web

- **Lens**: ConfigMaps y Secrets browser con valores decodeados, diff entre versiones
- **K9s**: ConfigMap/Secret view con decode inline
- **SealedSecrets UI**: Dashboard de gestión de secretos encriptados

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver ConfigMap | `kubectl get cm -A` | Lens → Config → ConfigMaps |
| Decode secret | `kubectl get secret -o jsonpath='{.data.password}' | base64 -d` | Lens → Secret → Reveal |
| Edit ConfigMap | `kubectl edit cm api-config` | Lens → ConfigMap → Edit |

---

## 7. Cheatsheet Rápido

```yaml
# ConfigMap mínimo
apiVersion: v1
kind: ConfigMap
metadata: { name: app-config }
data:
  KEY: value
  app.yaml: |
    server:
      port: 8000
---
# Deployment que usa ConfigMap + Secret
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: PASSWORD
              valueFrom:
                secretKeyRef: { name: db-secret, key: password }
          envFrom:
            - configMapRef: { name: app-config }
          volumeMounts:
            - name: config
              mountPath: /etc/config
      volumes:
        - name: config
          configMap: { name: app-config, items: [{ key: app.yaml, path: app.yaml }] }
---
# Reloader auto-restart
annotations:
  reloader.stakater.com/auto: "true"
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `12-secret-management-vault-integration` | complementario (Vault + Secrets) | Sí |
| `20-package-management-helm-kustomize` | complementario (values + ConfigMaps) | No |
| `09-log-aggregation-loki-elasticsearch` | complementario (logs de config) | No |
| `04-kubernetes-operators-controllers` | complementario (operators usan ConfigMaps) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: configmap-secrets-hot-reloading
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [configmap, secrets, hot-reloading, reloader, kubernetes-config, immutable]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
