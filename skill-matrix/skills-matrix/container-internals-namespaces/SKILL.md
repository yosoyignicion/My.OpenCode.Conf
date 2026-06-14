---
name: container-internals-namespaces
description: "Los contenedores Linux usan namespaces del kernel para aislamiento (PID, network, mount, UTS, IPC, user, cgroup) y cgroups v2 para límites de recursos (CPU, memoria, I/O, PIDs)"
---
# Container Internals & Namespaces

## Semantic Triggers
```
linux namespaces, cgroups, container isolation, pid namespace, mount namespace, network namespace, user namespace, uts namespace, union filesystem overlayfs, container security
```

---

## 1. Definición Teórica

Los contenedores Linux usan namespaces del kernel para aislamiento (PID, network, mount, UTS, IPC, user, cgroup) y cgroups v2 para límites de recursos (CPU, memoria, I/O, PIDs). Cada namespace aísla un recurso global diferente: PID namespace hace que los procesos vean solo su propio árbol, network namespace proporciona su propio stack de red, mount namespace aísla montajes del sistema de archivos. OverlayFS une capas de imagen de solo lectura con una capa writable del contenedor.

---

## 2. Implementación de Referencia

El runtime de contenedores por defecto es containerd con runc como runtime de bajo nivel. La configuración de seguridad se define a nivel de pod en Kubernetes.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-container
  labels:
    app: secure-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    runAsGroup: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
    supplementalGroups: [1001]
  containers:
    - name: app
      image: myapp:1.0.0
      securityContext:
        allowPrivilegeEscalation: false
        privileged: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
          add: ["NET_BIND_SERVICE"]
      resources:
        requests:
          memory: "128Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "200m"
```

**Fuente oficial:** https://kubernetes.io/docs/concepts/security/pod-security-standards/

### Alternativa de Implementación Específica

Pod Security Admission (PSA) reemplaza a PodSecurityPolicy desde K8s 1.23+. Define tres modos: `privileged`, `baseline`, `restricted`. El modo `restricted` fuerza `runAsNonRoot`, `readOnlyRootFilesystem`, y `drop: ["ALL"]`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aislamiento de procesos en entornos multi-tenant, hardening de contenedores |
| **Cuándo evitar** | Contenedores efímeros de desarrollo sin requisitos de seguridad |
| **Alternativas** | Podman (daemonless, mejor aislamiento de usuarios), Firecracker (micro-VM para aislamiento total), gVisor (kernel userspace para sandboxing) |
| **Coste/Complejidad** | Bajo. Linux soporta namespaces nativamente. La complejidad está en la configuración correcta |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Pod no puede iniciar por seccomp

**¿Qué ocasionó el error?**
El perfil seccomp `RuntimeDefault` bloquea la syscall `clone` con ciertos flags que la aplicación necesita.

**¿Cómo se solucionó?**
```yaml
securityContext:
  seccompProfile:
    type: Localhost
    localhostProfile: profiles/myapp-profile.json
```
Perfil personalizado que permite syscalls específicas necesarias.

**¿Por qué funciona esta técnica?**
`RuntimeDefault` es restrictivo. Un perfil local permite syscalls adicionales auditando primero.

### Caso: Contenedor corre como root a pesar de configuración

**¿Qué ocasionó el error?**
El `securityContext` a nivel de contenedor no tenía `runAsNonRoot: true`, solo a nivel de pod.

**¿Cómo se solucionó?**
```yaml
spec:
  containers:
    - name: app
      securityContext:
        runAsNonRoot: true  # ← duplicar a nivel contenedor
```

**¿Por qué funciona esta técnica?**
El Pod `securityContext` es default. El contenedor puede sobrescribirlo. Siempre definir ambos.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~340 tokens al invocar este skill
- **Trigger de activación:** namespaces, cgroups, container isolation, seccomp, security context
- **Prioridad de carga:** Alta — fundacional para entender contenedores
- **Dependencias:** `19-container-runtimes-containerd-cri`

### Tool Integration

```json
{
  "tool_name": "container-internals-namespaces",
  "description": "Aislamiento de contenedores Linux, namespaces, cgroups, seccomp y seguridad de pods",
  "triggers": ["namespace", "cgroup", "container isolation", "seccomp", "security context"],
  "context_hint": "Inyectar cuando se discuta seguridad de contenedores o aislamiento",
  "output_format": "markdown",
  "max_tokens": 1700
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre seguridad de contenedores o namespaces Linux, carga el skill
container-internals-namespaces. Enfócate en seccomp profiles, Pod Security Standards,
y configuración de securityContext en Kubernetes.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Ver namespaces activos
lsns
lsns -t pid

# Ver cgroups v2 de un proceso
cat /proc/$(pidof app)/cgroup
cat /sys/fs/cgroup/system.slice/$(systemctl show -p MainPID app.service | cut -d= -f2)/memory.current

# nsenter para entrar a namespace de contenedor
nsenter -t $(docker inspect --format '{{.State.Pid}}' mycontainer) -n ip addr

# Probar perfil seccomp
docker run --security-opt seccomp=profiles/deny.json alpine echo "test"

# Pod Security Admission dry run
kubectl label --dry-run=server ns prod pod-security.kubernetes.io/enforce=restricted
```

### GUI / Web

- **Pod Security Admission dashboard**: Visualización de políticas PSA por namespace
- **Docker Desktop**: Resource tab muestra uso de CPU/memoria por contenedor
- **Lens/OpenLens**: Security context view en pod inspector
- **K9s**: Visor de seguridad de pods con colores de advertencia

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Ver namespaces | `lsns` | Lens → Pod → Security |
| Ver cgroups | `cat /proc/PID/cgroup` | htop → F9 → Tree |
| Test seccomp | `docker run --security-opt seccomp=...` | Docker Desktop → Security tab |

---

## 7. Cheatsheet Rápido

```yaml
# Pod seguro mínimo (restricted)
apiVersion: v1
kind: Pod
metadata: { name: secure }
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: alpine:latest
      securityContext:
        allowPrivilegeEscalation: false
        capabilities: { drop: ["ALL"] }
        readOnlyRootFilesystem: true
      resources:
        limits: { cpu: 200m, memory: 256Mi }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `19-container-runtimes-containerd-cri` | complementario (runtime y CRI) | Sí |
| `10-container-orchestration-k8s-scheduling` | dependiente (scheduling usa namespaces) | No |
| `27-bare-metal-vs-virtualization` | complementario (vm vs container aislamiento) | No |
| `21-network-policies-segmentation` | complementario (network isolation) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: container-internals-namespaces
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [linux-namespaces, cgroups, container-isolation, seccomp, security-context, pod-security]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
