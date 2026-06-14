---
name: bare-metal-vs-virtualization
description: "Bare metal deploya contenedores directamente sobre hardware físico sin hypervisor, ofreciendo máximo rendimiento (0% overhead)"
---
# Bare Metal vs Virtualization

## Semantic Triggers
```
bare metal kubernetes, virtualization kvm, kubernetes on bare metal, vm vs container overhead, bare metal vs vm performance, kubevirt, virtuozzo, metal3, proxmox, hypervisor comparison
```

---

## 1. Definición Teórica

Bare metal deploya contenedores directamente sobre hardware físico sin hypervisor, ofreciendo máximo rendimiento (0% overhead). Virtualización (KVM, VMware, Proxmox) provee aislamiento y multi-tenencia con VMs de kernel dedicado. KubeVirt unifica ambos mundos — VMs dentro de K8s como pods. Metal3 provee provisioning bare metal via APIs Kubernetes (Ironic). La brecha de rendimiento: bare metal = 0% overhead, KVM = ~2% CPU, ~5% network.

---

## 2. Implementación de Referencia

KubeVirt v1.4+ para VMs en K8s. Metal3 v1.8+ para bare metal provisioning. Proxmox VE v8+ para hypervisor KVM.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: legacy-app-vm
spec:
  running: true
  template:
    spec:
      domain:
        cpu:
          cores: 4
          sockets: 1
          threads: 1
          model: host-passthrough
        memory:
          guest: 8Gi
          hugepages:
            pageSize: 2Mi
        resources:
          requests:
            memory: 8Gi
            cpu: 4
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
            - name: cloudinitdisk
              cloudInitNoCloud:
                userDataBase64: IyMg...
          interfaces:
            - name: default
              bridge: {}
          gpus:
            - deviceName: nvidia.com/TeslaT4
              name: gpu1
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          dataVolume:
            name: fedora-dv
      nodeSelector:
        node.kubernetes.io/instance-type: "gpu-node"
---
apiVersion: metal3.io/v1alpha1
kind: BareMetalHost
metadata:
  name: node-1
spec:
  online: true
  bmc:
    address: ipmi://10.0.0.10:623
    credentialsName: node-1-bmc
  bootMACAddress: 00:11:22:33:44:55
  image:
    url: http://provisioner/images/k8s-ubuntu-22.04.qcow2
    checksum: http://provisioner/images/k8s-ubuntu-22.04.qcow2.md5
  consumerRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: Metal3Machine
    name: node-1-machine
---
# Storage comparison: local NVMe vs SAN
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-nvme
spec:
  storageClassName: local-nvme
  local:
    path: /mnt/nvme
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values: ["bare-metal-node-1"]
```

**Fuente oficial:** https://kubevirt.io/user-guide/

### Alternativa de Implementación Específica

Proxmox VE + Talos Linux para bare-metal K8s con VM-based control plane y bare-metal workers usando PCI passthrough para GPUs/NVMe.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | High-throughput networking, GPUs, low-latency trading, DB at scale (bare metal). Multi-tenant, legacy OS, strong isolation (VM) |
| **Cuándo evitar** | Workloads standard sin requisitos especiales (VM suficiente) |
| **Alternativas** | KVM (VM), Proxmox (VM + K8s), VMware (enterprise), Nutanix (hyperconverged) |
| **Coste/Complejidad** | Medio-alto. Bare metal requiere provisioning automation. KubeVirt añade overhead operativo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: KubeVirt VM no inicia

**¿Qué ocasionó el error?**
La VM no tenía suficiente memoria hugepages y el nodo no las tenía configuradas.

**¿Cómo se solucionó?**
```bash
# En cada nodo KubeVirt
echo "vm.nr_hugepages=4096" >> /etc/sysctl.conf
sysctl -p
# Label nodo
kubectl label node nodo1 kubevirt.io/schedulable=true
```

**¿Por qué funciona esta técnica?**
KubeVirt usa hugepages para rendimiento de memoria. Sin suficiente, la VM falla en scheduling.

### Caso: Bare metal K8s no detecta NICs

**¿Qué ocasionó el error?**
El driver de red no estaba compilado en el kernel de la imagen utilizada por Metal3.

**¿Cómo se solucionó?**
Se usó una imagen kernel con módulos incluidos: `kernel-rt` con `mlx5_core` y `i40e` drivers.

**¿Por qué funciona esta técnica?**
Bare metal necesita drivers específicos de hardware compilados en el kernel. Las imágenes genéricas no incluyen todos.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~400 tokens al invocar este skill
- **Trigger de activación:** bare metal, virtualization, kvm, kubevirt, metal3, physical server
- **Prioridad de carga:** Media — skill de infraestructura
- **Dependencias:** `19-container-runtimes-containerd-cri`

### Tool Integration

```json
{
  "tool_name": "bare-metal-vs-virtualization",
  "description": "Comparativa bare metal vs virtualización, KubeVirt VMs en K8s, Metal3 provisioning",
  "triggers": ["bare metal", "virtualization", "kvm", "kubevirt", "metal3"],
  "context_hint": "Activar cuando se discuta elección de infraestructura física",
  "output_format": "markdown",
  "max_tokens": 2000
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre bare metal vs VMs o KubeVirt, carga el skill
bare-metal-vs-virtualization. Proporciona configuraciones de KubeVirt VMs con GPU passthrough,
Metal3 BareMetalHost, y casos de uso para cada enfoque.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# KubeVirt
kubectl apply -f vm.yaml
kubectl get vms
kubectl get vms -o yaml
virtctl start legacy-app-vm
virtctl stop legacy-app-vm
virtctl console legacy-app-vm

# Metal3
kubectl get baremetalhost -A
kubectl describe baremetalhost node-1
metal3ctl get node

# Rendimiento bare metal
lscpu | grep "Model name"
numactl --hardware
lstopo --of console

# Comparativa
perf stat -e instructions,cycles,cache-misses ./benchmark
```

### GUI / Web

- **KubeVirt UI (kubevirt-web-ui)**: Dashboard de VMs, console VNC/SPICE, métricas de VM
- **Proxmox VE UI**: Gestión de VMs, storage, red, HA cluster
- **Metal3 UI**: Bare metal inventory, provisioning status, BMC control
- **OpenStack Horizon**: Dashboard de VMs (openstack based)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List VMs | `kubectl get vms` | KubeVirt UI → VirtualMachines |
| Start VM | `virtctl start <vm>` | KubeVirt UI → Start |
| VM console | `virtctl console <vm>` | KubeVirt UI → Console |

---

## 7. Cheatsheet Rápido

```yaml
# KubeVirt VM mínima
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata: { name: test-vm }
spec:
  running: true
  template:
    spec:
      domain:
        cpu: { cores: 2 }
        memory: { guest: 4Gi }
        devices:
          disks:
            - name: rootdisk
              disk: { bus: virtio }
      volumes:
        - name: rootdisk
          containerDisk:
            image: kubevirt/fedora-cloud-image:latest
---
# CLI
virtctl start test-vm
virtctl console test-vm
kubectl get vms
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `19-container-runtimes-containerd-cri` | complementario (runtimes + VMs) | Sí |
| `03-container-internals-namespaces` | complementario (aislamiento VM vs container) | No |
| `05-infrastructure-as-code-terraform` | complementario (Terraform + bare metal) | Sí |
| `14-immutable-infrastructure-packer` | complementario (golden images + VMs) | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: bare-metal-vs-virtualization
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [bare-metal, virtualization, kvm, kubevirt, metal3, proxmox, infrastructure]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
