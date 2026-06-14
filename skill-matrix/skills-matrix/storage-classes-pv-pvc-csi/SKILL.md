---
name: storage-classes-pv-pvc-csi
description: "PV (PersistentVolume) es un recurso de almacenamiento en el clúster"
---
# Storage Classes, PV, PVC & CSI

## Semantic Triggers
```
persistent volume pv, persistent volume claim pvc, storage class, csi driver, dynamic provisioning, statefulset storage, ebs csi, efs csi, rook ceph, local ssd storage
```

---

## 1. Definición Teórica

PV (PersistentVolume) es un recurso de almacenamiento en el clúster. PVC (PersistentVolumeClaim) es una solicitud de almacenamiento. Se vinculan 1:1. StorageClass permite aprovisionamiento dinámico de PVs. CSI (Container Storage Interface) extiende K8s a cualquier backend: AWS EBS, GCE PD, Ceph RBD, NFS. Access Modes: ReadWriteOnce (RWO), ReadOnlyMany (ROX), ReadWriteMany (RWX). Reclaim Policy: Retain (conservar al borrar PVC), Delete (auto-eliminar).

---

## 2. Implementación de Referencia

AWS EBS CSI Driver v1.40+, GCE PD CSI Driver, Rook Ceph v1.16+ para storage definido por software. Velero v1.15+ para backup/restore.

### Ejemplo Práctico Avanzado

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-east-1:123456789:key/abc-123"
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
mountOptions:
  - noatime
  - discard
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: postgres
              topologyKey: topology.kubernetes.io/zone
      containers:
        - name: postgres
          image: postgres:16
          env:
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 1
              memory: 4Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
---
# Rook Ceph Block StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/fstype: ext4
allowVolumeExpansion: true
reclaimPolicy: Delete
```

**Fuente oficial:** https://kubernetes.io/docs/concepts/storage/storage-classes/

### Alternativa de Implementación Específica

Rook Ceph para storage definido por software on-premise. Ofrece RBD (block), CephFS (file), y S3-compatible object store (RGW) desde el mismo cluster.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Stateful workloads (bases de datos), backup/restore, shared storage RWX |
| **Cuándo evitar** | Workloads stateless (ConfigMap/EmptyDir suficiente), storage efímero |
| **Alternativas** | EBS (block), EFS (file, RWX), Rook Ceph (DIY), Portworx (enterprise), Longhorn (open-source) |
| **Coste/Complejidad** | Medio. CSI drivers requieren IAM roles. Rook Ceph requiere operación especializada |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: PVC stuck en Pending

**¿Qué ocasionó el error?**
El StorageClass `volumeBindingMode: WaitForFirstConsumer` pero el pod no se creaba (pending por otro motivo).

**¿Cómo se solucionó?**
Se verificó que el pod no tuviera otros issues (CPU, afinidad) o se usó `Immediate` binding:
```yaml
volumeBindingMode: Immediate  # provisión inmediata sin esperar pod
```

**¿Por qué funciona esta técnica?**
`WaitForFirstConsumer` retrasa la provisión hasta que un pod usa el PVC. Si el pod nunca se crea, el PVC queda Pending.

### Caso: Volume expansion fails

**¿Qué ocasionó el error?**
El StorageClass no tenía `allowVolumeExpansion: true`, y el PVC se editó para aumentar storage.

**¿Cómo se solucionó?**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
allowVolumeExpansion: true  # ← habilitar expansion
```

**¿Por qué funciona esta técnica?**
K8s no permite expandir PVs sin `allowVolumeExpansion: true`. Es un safety para prevenir corrupción accidental.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~420 tokens al invocar este skill
- **Trigger de activación:** storage, pv, pvc, storage class, csi, persistent volume, statefulset
- **Prioridad de carga:** Alta — esencial para workloads stateful
- **Dependencias:** `10-container-orchestration-k8s-scheduling`

### Tool Integration

```json
{
  "tool_name": "storage-classes-pv-pvc-csi",
  "description": "Almacenamiento en K8s: StorageClasses, PV/PVC, CSI drivers, StatefulSet volumeClaimTemplates",
  "triggers": ["storage", "persistent volume", "pvc", "storage class", "csi", "statefulset"],
  "context_hint": "Activar cuando se discuta almacenamiento persistente en K8s",
  "output_format": "markdown",
  "max_tokens": 2100
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre almacenamiento K8s, carga el skill
storage-classes-pv-pvc-csi. Proporciona StorageClass con CSI driver (EBS, Ceph),
StatefulSet con volumeClaimTemplates, y troubleshooting de PVC Pending.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Storage resources
kubectl get storageclass
kubectl describe storageclass fast-ssd
kubectl get pv
kubectl get pvc -A
kubectl describe pvc data

# Expand PVC
kubectl edit pvc data -n prod
# cambiar storage: 100Gi → 200Gi

# CSI debugging
kubectl logs -n kube-system ebs-csi-controller-0
kubectl describe csidriver ebs.csi.aws.com

# Rook Ceph
kubectl -n rook-ceph get cephcluster
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd df

# Backup (Velero)
velero backup create postgres-backup --include-namespaces prod
velero restore create --from-backup postgres-backup
```

### GUI / Web

- **Lens**: Storage Classes, PV/PVC browser con estado y binding
- **Rook Dashboard**: Ceph cluster status, OSDs, pools, RBD images
- **AWS EBS Console**: Volúmenes, snapshots, IOPS performance
- **Velero UI**: Backup/restore calendar y schedules

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List PVC | `kubectl get pvc -A` | Lens → Storage → PVCs |
| Expand | `kubectl edit pvc <name>` | Lens → PVC → Expand |
| Ceph status | `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s` | Rook Dashboard → Status |

---

## 7. Cheatsheet Rápido

```yaml
# StorageClass EBS gp3 mínima
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata: { name: fast-ssd }
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
allowVolumeExpansion: true
reclaimPolicy: Delete
---
# PVC mínima
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: data }
spec:
  accessModes: [ReadWriteOnce]
  resources: { requests: { storage: 100Gi } }
---
# CLI
kubectl get storageclass,pv,pvc -A
kubectl describe pvc data
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `10-container-orchestration-k8s-scheduling` | complementario (topology + storage) | Sí |
| `30-cost-optimization-finops-kubernetes` | complementario (costo de storage) | Sí |
| `27-bare-metal-vs-virtualization` | complementario (local NVMe storage) | No |
| `20-package-management-helm-kustomize` | complementario (storage en charts) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: storage-classes-pv-pvc-csi
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [storage, persistent-volume, pvc, storage-class, csi, statefulset, rook-ceph]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
