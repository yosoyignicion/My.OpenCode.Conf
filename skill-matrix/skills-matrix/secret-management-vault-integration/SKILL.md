---
name: secret-management-vault-integration
description: "HashiCorp Vault gestiona secretos con generación dinámica, rotación automática, y auditoría"
---
# Secret Management & Vault Integration

## Semantic Triggers
```
hashicorp vault, secret management kubernetes, vault agent injector, dynamic secrets, vault transit encryption, secrets store csi driver, external secrets operator, secret rotation auto
```

---

## 1. Definición Teórica

HashiCorp Vault gestiona secretos con generación dinámica, rotación automática, y auditoría. Dynamic secrets (ej: credenciales de DB con TTL) se revocan automáticamente al expirar. Vault Agent Injector autentica via service account token de K8s y renderiza secretos en shared volumes. External Secrets Operator sincroniza secretos de Vault/AWS/Azure a K8s Secrets sin almacenamiento en etcd. Transit Engine provee encryption-as-a-service.

---

## 2. Implementación de Referencia

HashiCorp Vault v1.18+ con auto-unseal via KMS. External Secrets Operator v0.12+ como capa de sincronización. Vault Agent Injector para montaje sidecar.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-database
spec:
  provider: vault
  parameters:
    roleName: api-role
    vaultAddress: https://vault.internal:8200
    vaultK8sNamespace: prod
    objects: |
      - objectName: "db-password"
        secretPath: "secret/data/prod/database"
        secretKey: "password"
      - objectName: "db-host"
        secretPath: "secret/data/prod/database"
        secretKey: "host"
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-es
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: api-secrets
    deletionPolicy: Delete
  data:
    - secretKey: db-password
      remoteRef:
        key: secret/data/prod/database
        property: password
    - secretKey: db-host
      remoteRef:
        key: secret/data/prod/database
        property: host
---
apiVersion: v1
kind: Pod
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "api-role"
    vault.hashicorp.com/agent-inject-secret-db: "secret/data/prod/database"
spec:
  serviceAccountName: api-sa
  containers:
    - name: app
      image: myapp:1.0.0
      volumeMounts:
        - mountPath: /vault/secrets
          name: vault-secrets
  volumes:
    - name: vault-secrets
      emptyDir: { medium: Memory }
```

**Fuente oficial:** https://developer.hashicorp.com/vault/docs

### Alternativa de Implementación Específica

SealedSecrets (Bitnami) para equipos pequeños que solo necesitan encriptar secretos en Git sin operar Vault. Encriptación con clave pública/privada dentro del clúster.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Múltiples equipos, compliance (audit logging), rotación automática, multi-cloud secrets |
| **Cuándo evitar** | 1-2 microservicios, equipo pequeño sin capacidad de operar Vault |
| **Alternativas** | AWS Secrets Manager (SaaS), SealedSecrets (Git-native), SOPS (files), Azure Key Vault |
| **Coste/Complejidad** | Alto. Operar Vault requiere alta disponibilidad, unseal management, y políticas de acceso |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Vault Agent sin permisos para leer secretos

**¿Qué ocasionó el error?**
La service account del pod no tenía binding a la política de Vault. Vault Agent recibía 403.

**¿Cómo se solucionó?**
```bash
vault policy write api-policy - <<EOF
path "secret/data/prod/*" {
  capabilities = ["read"]
}
EOF
vault write auth/kubernetes/role/api-role \
  bound_service_account_names=api-sa \
  bound_service_account_namespaces=prod \
  policies=api-policy
```

**¿Por qué funciona esta técnica?**
Vault autoriza basado en la service account K8s. La política define qué paths puede leer el pod.

### Caso: Dynamic DB credentials no se revocan

**¿Qué ocasionó el error?**
El TTL de la credencial dinámica era demasiado largo (720h), y las conexiones activas mantenían la sesión abierta.

**¿Cómo se solucionó?**
```bash
vault write database/roles/api-role \
  db_name=postgres-prod \
  creation_statements="CREATE USER \"{{name}}\" WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';" \
  default_ttl=1h \
  max_ttl=24h
```
Se redujo TTL a 1h para forzar rotación frecuente.

**¿Por qué funciona esta técnica?**
Dynamic secrets tienen TTL. Al expirar, Vault revoca la credencial. TTLs cortos mejoran seguridad.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** vault, secret management, dynamic secrets, secrets store csi, external secrets
- **Prioridad de carga:** Alta — crítico para seguridad
- **Dependencias:** `29-configmap-secrets-hot-reloading`

### Tool Integration

```json
{
  "tool_name": "secret-management-vault-integration",
  "description": "Gestión de secretos con HashiCorp Vault, External Secrets Operator, y CSI driver",
  "triggers": ["vault", "secrets", "dynamic secrets", "secret management", "external secrets"],
  "context_hint": "Activar cuando se discuta almacenamiento seguro de credenciales",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre gestión de secretos o Vault, carga el skill
secret-management-vault-integration. Proporciona ExternalSecret CRD, Vault Agent Injector
config, dynamic DB credentials, y troubleshooting de autenticación.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Vault CLI
vault operator init -key-shares=5 -key-threshold=3
vault operator unseal <key>
vault secrets enable -path=secret kv-v2
vault kv put secret/prod/database password=s3cr3t host=db.example.com
vault kv get secret/prod/database

# Autenticación
vault login -method=kubernetes role=api-role
vault token create -policy=api-policy

# Dynamic secrets
vault read database/creds/api-role

# ESO
kubectl get externalsecret -A
kubectl get clustersecretstore
```

### GUI / Web

- **Vault UI**: `https://vault:8200/ui` — navegación de secretos, políticas, y autenticación
- **External Secrets Operator UI**: Dashboard de estado de sincronización
- **HashiCorp Cloud Platform**: Vault Cloud gestión SaaS

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Get secret | `vault kv get secret/prod/db` | Vault UI → Secret → Read |
| Crear política | `vault policy write name policy.hcl` | Vault UI → Policies |
| Ver estado | `vault status` | Vault UI → Status |

---

## 7. Cheatsheet Rápido

```yaml
# ESO mínimo
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata: { name: app-secrets }
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target: { name: app-secrets }
  data:
    - secretKey: db-password
      remoteRef:
        key: secret/data/prod/database
        property: password
---
# Vault CLI rápido
vault kv put secret/prod/api key=value
vault login -method=kubernetes role=app-role
vault read database/creds/app-role
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `29-configmap-secrets-hot-reloading` | complementario (configmaps + secrets) | Sí |
| `22-artifact-registries-security` | complementario (registro + signing) | No |
| `24-policy-as-code-opa-rego` | complementario (policy + secrets) | No |
| `09-cryptography-symmetric-asymmetric` | complementario (fundamentos crypto) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: secret-management-vault-integration
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [vault, secret-management, dynamic-secrets, external-secrets-operator, csi-driver, security]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
