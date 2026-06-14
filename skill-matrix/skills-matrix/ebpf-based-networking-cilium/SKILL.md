---
name: ebpf-based-networking-cilium
description: "Cilium reemplaza kube-proxy con eBPF para networking escalable y de alto rendimiento"
---
# eBPF-Based Networking (Cilium)

## Semantic Triggers
```
ebpf networking, cilium kubernetes, ebpf data plane, kube proxy replacement, cilium network policy, hubble observability, cluster mesh, ebpf xdp tc
```

---

## 1. Definición Teórica

Cilium reemplaza kube-proxy con eBPF para networking escalable y de alto rendimiento. Los programas eBPF se ejecutan en el kernel Linux, permitiendo comunicación rápida pod-to-pod, encriptación transparente, y políticas de red L3-L7. Hubble proporciona observabilidad eBPF-native con visibilidad de flujos en tiempo real. Cluster Mesh extiende redes multi-clúster con servicios compartidos.

---

## 2. Implementación de Referencia

Cilium v1.16+ como DaemonSet con kubeProxyReplacement enabled. Hubble Relay para visibilidad cluster-wide. Cluster Mesh para multi-cluster.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-security-policy
  namespace: prod
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: ingress-gateway
      toPorts:
        - ports:
            - port: "8000"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: "/api/v1/.*"
              - method: POST
                path: "/api/v1/orders"
    - fromEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: monitoring
      toPorts:
        - ports:
            - port: "9090"
              protocol: TCP
  egress:
    - toEndpoints:
        - matchLabels:
            app: database
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    - toFQDNs:
        - matchName: "api.external.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
---
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: allow-dns
spec:
  endpointSelector: {}
  egress:
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
```

**Fuente oficial:** https://docs.cilium.io/

### Alternativa de Implementación Específica

Calico con eBPF data plane para entornos que necesitan network policies tradicionales (no L7) pero con rendimiento mejorado sobre iptables.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Clusters K8s grandes (>100 nodos), necesidad de políticas L7, encriptación transparente, multi-cluster |
| **Cuándo evitar** | Clusters pequeños con iptables suficiente, equipos sin experiencia eBPF |
| **Alternativas** | Calico (network policies maduras), Weave (simple), Flannel (básico), Kube-router (integrado) |
| **Coste/Complejidad** | Medio-alto. eBPF tiene overhead de kernel. Hubble consume recursos. Cluster Mesh requiere planificación de CIDR |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: kube-proxy conflictos con Cilium

**¿Qué ocasionó el error?**
kube-proxy y Cilium compitiendo por el mismo tráfico ClusterIP causaban conectividad intermitente.

**¿Cómo se solucionó?**
```bash
# Instalar Cilium con kubeProxyReplacement
helm upgrade cilium cilium/cilium --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set nodeinit.removeCbrChain=true
# Remover kube-proxy
kubectl -n kube-system delete ds kube-proxy
```

**¿Por qué funciona esta técnica?**
Cilium con `kubeProxyReplacement=true` implementa ClusterIP, NodePort, LoadBalancer via eBPF sin iptables.

### Caso: Hubble no muestra flujos L7

**¿Qué ocasionó el error?**
Hubble L7 visibility requiere anotaciones específicas en los pods. Sin ellas, solo muestra metadata L3/L4.

**¿Cómo se solucionó?**
```yaml
annotations:
  cilium.io/hubble.l7-visibility: "http"
```
Anotación para habilitar visibilidad HTTP en los flujos.

**¿Por qué funciona esta técnica?**
Cilium inyecta un proxy L7 en el sidecar cuando se anota el pod. Sin la anotación, solo observa cabeceras de paquetes.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~390 tokens al invocar este skill
- **Trigger de activación:** cilium, ebpf, hubble, network policy, kube-proxy replacement, cluster mesh
- **Prioridad de carga:** Media — skill avanzado de redes
- **Dependencias:** `21-network-policies-segmentation`, `03-container-internals-namespaces`

### Tool Integration

```json
{
  "tool_name": "ebpf-based-networking-cilium",
  "description": "Configuración de redes eBPF con Cilium, políticas L3-L7, Hubble observabilidad y Cluster Mesh",
  "triggers": ["cilium", "ebpf", "hubble", "cilium network policy", "cluster mesh"],
  "context_hint": "Activar cuando se discuta redes K8s de alto rendimiento o políticas de red avanzadas",
  "output_format": "markdown",
  "max_tokens": 1950
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre redes K8s con eBPF o Cilium, carga el skill
ebpf-based-networking-cilium. Proporciona CiliumNetworkPolicy L7, configuración Hubble,
y kubeProxyReplacement con troubleshooting.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Estado de Cilium
cilium status
cilium connectivity test
cilium config view

# Hubble CLI
hubble observe --from-pod prod/api --to-pod prod/database
hubble observe --verdict DROPPED
hubble serve --port 4245 &

# Debugging
cilium endpoint list
cilium bpf lb list
cilium identity list

# Cluster Mesh
cilium clustermesh status
cilium clustermesh enable --service-type NodePort
```

### GUI / Web

- **Hubble UI**: `http://localhost:12000` — service map visual, flujos de red en vivo, políticas aplicadas
- **Cilium Dashboard (Grafana)**: Métricas de red, drops por política, performance de eBPF
- **Tetragon**: Security observability con eBPF — detección de comportamientos anómalos

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver flujos | `hubble observe --since 5m` | Hubble UI → Service Map |
| Test conectividad | `cilium connectivity test` | Lens → Cilium tab |
| Ver políticas | `cilium policy get` | Hubble UI → Policy View |

---

## 7. Cheatsheet Rápido

```yaml
# Política L7 mínima
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata: { name: api-ingress, namespace: prod }
spec:
  endpointSelector: { matchLabels: { app: api } }
  ingress:
    - fromEndpoints:
        - matchLabels: { app: gateway }
      toPorts:
        - ports: [{ port: "8000", protocol: TCP }]
          rules:
            http:
              - method: GET
                path: "/api/v1/.*"
---
# CLI rápido
cilium status --wait
hubble observe --from-pod prod/api -f
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `21-network-policies-segmentation` | complementario (políticas de red) | Sí |
| `03-container-internals-namespaces` | dependiente (namespaces de red) | No |
| `18-mesh-data-planes-control-planes` | complementario (service mesh + eBPF) | No |
| `08-monitoring-prometheus-metrics` | complementario (métricas Hubble) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: ebpf-based-networking-cilium
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [ebpf, cilium, kubernetes-networking, hubble, kube-proxy-replacement, cluster-mesh]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
