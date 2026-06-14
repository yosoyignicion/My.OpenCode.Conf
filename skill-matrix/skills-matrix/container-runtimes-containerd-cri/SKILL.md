---
name: container-runtimes-containerd-cri
description: "Los container runtimes implementan la CRI (Container Runtime Interface), protocolo gRPC entre kubelet y runtime"
---
# Container Runtimes (containerd / CRI)

## Semantic Triggers
```
container runtime, containerd, cri o runtime interface, dockershim removal, cri o vs containerd, crictl, nerdctl, kubernetes container runtime, low level runtime runc
```

---

## 1. Definición Teórica

Los container runtimes implementan la CRI (Container Runtime Interface), protocolo gRPC entre kubelet y runtime. Containerd (CNCF graduated) es el estándar de la industria, usado por Docker, EKS, GKE. CRI-O es más ligero, usado en Fedora CoreOS. Debajo de ellos, runc ejecuta contenedores via syscalls del kernel. Kata Containers ejecuta cada contenedor en su propia VM ligera. gVisor intercepta syscalls con un kernel userspace.

---

## 2. Implementación de Referencia

Containerd v2.1+ con runc v1.2+. CRI-O v1.32+ como alternativa minimalista. Ambos con RuntimeClass para sandboxing (gVisor/Kata).

### Ejemplo Práctico Avanzado

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
---
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-workload
spec:
  runtimeClassName: gvisor
  containers:
    - name: app
      image: untrusted-app:latest
      securityContext:
        seccompProfile:
          type: RuntimeDefault
        allowPrivilegeEscalation: false
        capabilities:
          drop: ["ALL"]
---
# Verify runtime with crictl
# crictl --runtime-endpoint unix:///run/containerd/containerd.sock ps
# crictl --runtime-endpoint unix:///run/crio/crio.sock ps
---
# containerd config.toml
version = 2
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
  runtime_type = "io.containerd.runsc.v1"
```

**Fuente oficial:** https://containerd.io/docs/

### Alternativa de Implementación Específica

CRI-O con crun (runtime en C/Rust) para entornos que priorizan bajo overhead y tiempo de inicio rápido. Usado por defecto en OKD (OpenShift).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | K8s 1.24+ (dockershim removido), needs sandboxing gVisor/Kata, performance crítico |
| **Cuándo evitar** | Entornos legacy con dependencia de Docker daemon |
| **Alternativas** | containerd (más features), CRI-O (más ligero), Docker Engine (legacy), Podman (daemonless) |
| **Coste/Complejidad** | Bajo. containerd es default en K8s. CRI-O requiere configuración adicional. Sandboxing incrementa overhead |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: crictl no encuentra contenedores

**¿Qué ocasionó el error?**
`crictl` usa default socket `/var/run/dockershim.sock` que no existe con containerd.

**¿Cómo se solucionó?**
```bash
export CONTAINER_RUNTIME_ENDPOINT=unix:///run/containerd/containerd.sock
crictl ps
# O configurar /etc/crictl.yaml:
runtime-endpoint: unix:///run/containerd/containerd.sock
```

**¿Por qué funciona esta técnica?**
crictl necesita el socket correcto del runtime. containerd usa `/run/containerd/containerd.sock`, no dockershim.

### Caso: Pod con runtimeClass gvisor no inicia

**¿Qué ocasionó el error?**
gVisor `runsc` no estaba instalado en los nodos. `runtimeClassName: gvisor` no encontraba el handler.

**¿Cómo se solucionó?**
```bash
# En cada nodo
apt-get install -y runsc
runsc install
# o containerd config
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
  runtime_type = "io.containerd.runsc.v1"
```

**¿Por qué funciona esta técnica?**
RuntimeClass necesita el handler registrado en el runtime (containerd/cri-o). Sin instalación, no hay handler.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~380 tokens al invocar este skill
- **Trigger de activación:** container runtime, containerd, cri-o, runc, gvisor, kata, crictl
- **Prioridad de carga:** Alta — fundacional para entender contenedores
- **Dependencias:** `03-container-internals-namespaces`

### Tool Integration

```json
{
  "tool_name": "container-runtimes-containerd-cri",
  "description": "Container runtimes K8s: containerd, CRI-O, runc, gVisor, Kata, crictl debugging",
  "triggers": ["container runtime", "containerd", "cri-o", "runc", "crictl", "runtime class"],
  "context_hint": "Activar cuando se discuta runtime de contenedores o debugging",
  "output_format": "markdown",
  "max_tokens": 1900
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre container runtimes o CRI, carga el skill
container-runtimes-containerd-cri. Enfócate en containerd vs CRI-O, RuntimeClass config,
y debugging con crictl/nerdctl.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# crictl (debugging universal)
crictl ps -a
crictl images
crictl logs <container-id> --tail=50
crictl exec -it <container-id> sh
crictl inspect <container-id>

# nerdctl (CLI para containerd)
nerdctl ps -a
nerdctl images
nerdctl pull ghcr.io/myorg/api:1.0.0
nerdctl run -it --rm alpine sh

# containerd
ctr images list
ctr container list
ctr task list

# Ver runtime classes instalados
kubectl get runtimeclass
kubectl describe runtimeclass gvisor

# Probar runtime
crictl runp <pod-config>.yaml
```

### GUI / Web

- **Lens**: Container runtime info en node details, RuntimeClass por pod
- **containerd Dashboard**: Métricas de containerd via Prometheus (puerto 1338)
- **Docker Desktop**: Resource usage con containerd backend
- **Podman Desktop**: Gestión visual de contenedores con alternativa daemonless

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List containers | `crictl ps` | Lens → Pod → Containers |
| Ver logs | `crictl logs <id> --tail=50` | Lens → Pod → Logs |
| Exec en container | `crictl exec -it <id> sh` | Lens → Pod → Terminal |

---

## 7. Cheatsheet Rápido

```bash
# Debugging universal con crictl
export CONTAINER_RUNTIME_ENDPOINT=unix:///run/containerd/containerd.sock
crictl ps -a
crictl logs <id>
crictl exec -it <id> sh
crictl images

# RuntimeClass
kubectl get runtimeclass
# nerdctl
nerdctl ps -a
nerdctl pull nginx
nerdctl run -it --rm alpine
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-container-internals-namespaces` | dependiente (namespaces + runtimes) | Sí |
| `10-container-orchestration-k8s-scheduling` | complementario (scheduling + runtime class) | Sí |
| `27-bare-metal-vs-virtualization` | complementario (Kata VM vs contenedor) | No |
| `21-network-policies-segmentation` | complementario (red + runtime) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: container-runtimes-containerd-cri
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [container-runtime, containerd, cri-o, runc, gvisor, kata, crictl, nerdctl]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
