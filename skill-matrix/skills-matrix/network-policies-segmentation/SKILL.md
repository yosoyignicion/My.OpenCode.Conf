---
name: network-policies-segmentation
description: "NetworkPolicies controlan el flujo de tráfico entre pods y endpoints externos en Kubernetes"
---
# Network Policies & Segmentation

## Semantic Triggers
```
kubernetes network policy, network segmentation, default deny ingress egress, pod selector policy, namespace isolation, cidr based policy, ipblock, network policy multi tenant
```

---

## 1. Definición Teórica

NetworkPolicies controlan el flujo de tráfico entre pods y endpoints externos en Kubernetes. Son implementadas por el plugin CNI (Calico, Cilium, Weave). El patrón base es default-deny para todos los namespaces (ingress + egress), luego añadir reglas allow específicas. `podSelector` targetea pods por label, `namespaceSelector` permite tráfico desde/hacia namespaces completos, `ipBlock` controla CIDRs externos. PolicyTypes define si la política aplica a ingress, egress, o ambos.

---

## 2. Implementación de Referencia

NetworkPolicy nativo de Kubernetes (networking.k8s.io/v1) con cualquier CNI. Calico v3.30+ para políticas avanzadas (service accounts, global network policies).

### Ejemplo Práctico Avanzado

```yaml
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: prod
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
  namespace: prod
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
          podSelector:
            matchLabels:
              app: istio-ingressgateway
      ports:
        - port: 8000
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
      ports:
        - port: 9090
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - port: 5432
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - port: 443
          protocol: TCP
    - to:
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-deny-all
  namespace: prod
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - port: 5432
```

**Fuente oficial:** https://kubernetes.io/docs/concepts/services-networking/network-policies/

### Alternativa de Implementación Específica

CiliumNetworkPolicy para políticas L7 (HTTP methods, paths, FQDN). Más granular que NetworkPolicy nativa pero requiere Cilium como CNI.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aislamiento multi-tenant, compliance (PCI, SOC2), minimizar blast radius |
| **Cuándo evitar** | Clusters single-team, todos los servicios en un namespace, sin requisitos de aislamiento |
| **Alternativas** | CiliumNetworkPolicy (L7), Calico GlobalNetworkPolicy (cluster-wide), OPA Gatekeeper (admission) |
| **Coste/Complejidad** | Medio. Debugging de políticas requiere entender flujos de red. Políticas mal configuradas causan outages |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Política default-deny bloquea DNS

**¿Qué ocasionó el error?**
La política default-deny no tenía regla egress para DNS (UDP 53), los pods no podían resolver nombres.

**¿Cómo se solucionó?**
```yaml
egress:
  - to:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: kube-system
        podSelector:
          matchLabels:
            k8s-app: kube-dns
    ports:
      - port: 53
        protocol: UDP
```
Siempre incluir regla DNS en políticas default-deny.

**¿Por qué funciona esta técnica?**
Los pods necesitan DNS para resolver servicios. Sin regla egress UDP 53, la resolución falla silenciosamente.

### Caso: Política no tiene efecto (tráfico no bloqueado)

**¿Qué ocasionó el error?**
El plugin CNI era Flannel, que no soporta NetworkPolicy. Las políticas se creaban pero no se enforceaban.

**¿Cómo se solucionó?**
```bash
# Cambiar a Calico o Cilium
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.30/manifests/calico.yaml
```

**¿Por qué funciona esta técnica?**
NetworkPolicy requiere un CNI que lo implemente. Flannel es simple (overlay) sin policy enforcement.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** network policy, segmentation, default deny, isolation, cni policy
- **Prioridad de carga:** Alta — crítico para seguridad K8s
- **Dependencias:** `11-ebpf-based-networking-cilium`

### Tool Integration

```json
{
  "tool_name": "network-policies-segmentation",
  "description": "Políticas de red Kubernetes, default-deny, segmentación por namespace y aislamiento multi-tenant",
  "triggers": ["network policy", "segmentation", "default deny", "isolation", "multi-tenant"],
  "context_hint": "Activar cuando se discuta seguridad de red o aislamiento",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre políticas de red o segmentación, carga el skill
network-policies-segmentation. Proporciona default-deny, reglas allow específicas, DNS,
y debugging de políticas de red K8s.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Listar políticas
kubectl get networkpolicy -A
kubectl describe networkpolicy -n prod api-allow

# Verificar conectividad
kubectl run test-$RANDOM --image=busybox -it --rm -- wget -O- http://api:8000
kubectl run test-$RANDOM --image=busybox -it --rm -- nslookup api

# Debug con netshoot
kubectl run netshoot --image=nicolaka/netshoot -it -- rm
netshoot# curl -v http://api:8000
netshoot# nc -zv database 5432

# Calico CLI
calicoctl get networkpolicy -A
calicoctl get workloadendpoint -n prod
```

### GUI / Web

- **Calico Enterprise UI**: Visual policy editor, service graph con políticas aplicadas
- **Cilium Hubble UI**: Flujo de red con políticas L3-L7 visibles
- **K9s**: NetworkPolicy view con colores de permit/deny
- **Octant**: NetworkPolicy visualization con source/dest/ports

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List policies | `kubectl get netpol -A` | K9s → `:netpol` |
| Test connect | `kubectl run test --image=busybox -it --rm -- wget ...` | Lens → Pod → Terminal |
| View flows | `kubectl logs -n kube-system -l k8s-app=calico-node` | Hubble → Flows |

---

## 7. Cheatsheet Rápido

```yaml
# Default deny (apply a cada namespace)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny }
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
# Allow app → DB
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: app-to-db }
spec:
  podSelector: { matchLabels: { app: database } }
  ingress:
    - from:
        - podSelector: { matchLabels: { app: api } }
      ports:
        - port: 5432
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `11-ebpf-based-networking-cilium` | complementario (políticas L7 con Cilium) | Sí |
| `03-container-internals-namespaces` | dependiente (network namespace) | No |
| `24-policy-as-code-opa-rego` | complementario (policy + network) | No |
| `18-mesh-data-planes-control-planes` | complementario (mesh + network policies) | No |
| `33-zero-trust-network-architectures` | complementario (zero-trust + policies) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: network-policies-segmentation
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [network-policies, network-segmentation, kubernetes-security, default-deny, isolation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
