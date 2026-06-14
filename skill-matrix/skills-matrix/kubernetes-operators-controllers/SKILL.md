---
name: kubernetes-operators-controllers
description: "Los Operators extienden Kubernetes con recursos personalizados (CRDs) y controladores que automatizan el lifecycle de aplicaciones"
---
# Kubernetes Operators & Controllers

## Semantic Triggers
```
kubernetes operator, custom resource definition crd, controller reconciliation, kubebuilder operator sdk, control loop, finalizers adoption, helm operator pattern
```

---

## 1. Definición Teórica

Los Operators extienden Kubernetes con recursos personalizados (CRDs) y controladores que automatizan el lifecycle de aplicaciones. Construidos con kubebuilder u Operator SDK, implementan el patrón controller: watch → reconcile → update status. Finalizers previenen la eliminación prematura ejecutando cleanup antes de borrar el recurso. El patrón de adopción permite que recursos existentes sean gestionados por el operator.

---

## 2. Implementación de Referencia

Kubebuilder v4+ es el framework recomendado. Operator SDK v2+ (basado en kubebuilder) para proyectos Java/Ansible. Ambos generan scaffolding completo con controllers, webhooks, y RBAC.

### Ejemplo Práctico Avanzado

```go
// +kubebuilder:rbac:groups=myapp.example.com,resources=myapps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
func (r *MyAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var app myappv1.MyApp
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Ensure Deployment with server-side apply
    deploy := buildDeployment(&app)
    if err := r.Patch(ctx, deploy, client.Apply, client.ForceOwnership, client.FieldOwner("myapp-operator")); err != nil {
        return ctrl.Result{}, err
    }

    // Update status conditions
    app.Status.Ready = isDeploymentReady(deploy)
    app.Status.Replicas = deploy.Status.ReadyReplicas
    if err := r.Status().Update(ctx, &app); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}
```

**Fuente oficial:** https://book.kubebuilder.io/

### Alternativa de Implementación Específica

Para gestión de recursos simples sin Go, el Helm Operator Pattern usa un chart Helm como "implementación" del CRD, ejecutando `helm upgrade` en cada reconciliación, ideal para equipos que ya usan Helm extensivamente.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Automatización de lifecycle complejo (bases de datos, message brokers, certificados) |
| **Cuándo evitar** | CRUD simple que se puede lograr con Helm + Kustomize sin código |
| **Alternativas** | Helm hooks (sin Go), Crossplane (composite resources), Ansible Operator (sin programar) |
| **Coste/Complejidad** | Alto. Requiere desarrollo Go, testing en clúster real, manejo de versiones de CRD |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Reconcile loop infinito

**¿Qué ocasionó el error?**
El controller actualiza el status en cada reconcile, lo que dispara otro evento de watch, causando un loop infinito.

**¿Cómo se solucionó?**
```go
if !reflect.DeepEqual(app.Status, previousStatus) {
    if err := r.Status().Update(ctx, &app); err != nil {
        return ctrl.Result{}, err
    }
}
```
Se agregó verificación de cambio antes de actualizar status.

**¿Por qué funciona esta técnica?**
Evita escrituras innecesarias que dispararían reconciliaciones adicionales.

### Caso: CRD schema conflict en upgrade

**¿Qué ocasionó el error?**
Se eliminó un campo requerido del CRD v2, pero los recursos existentes en v1 no tenían el valor.

**¿Cómo se solucionó?**
```yaml
versions:
  - name: v1
    storage: true
    schema:
      openAPIV3Schema:
        properties:
          spec:
            properties:
              oldField:
                type: string
  - name: v2
    served: true
    storage: false
    schema:
      openAPIV3Schema: ...
```
Se mantuvo `storage: true` en v1 y se usó conversion webhook.

**¿Por qué funciona esta técnica?**
El storage version define el formato de persistencia. Los conversion webhooks traducen entre versiones.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~360 tokens al invocar este skill
- **Trigger de activación:** operator, controller, kubebuilder, crd, reconciliation, finalizer
- **Prioridad de carga:** Alta — skill avanzado de extensión K8s
- **Dependencias:** `10-container-orchestration-k8s-scheduling`, `20-package-management-helm-kustomize`

### Tool Integration

```json
{
  "tool_name": "kubernetes-operators-controllers",
  "description": "Desarrollo de Kubernetes Operators con kubebuilder, CRDs, controllers y finalizers",
  "triggers": ["operator", "kubebuilder", "crd", "controller", "reconcile", "finalizer"],
  "context_hint": "Activar cuando se necesite extender Kubernetes con recursos personalizados",
  "output_format": "markdown",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre operadores Kubernetes o CRDs, carga el skill
kubernetes-operators-controllers. Proporciona scaffolding de kubebuilder, patrón
reconcile, y manejo de finalizers con ejemplos en Go.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Scaffolding
kubebuilder init --domain myorg.io --repo github.com/myorg/my-operator
kubebuilder create api --group myapp --version v1 --kind MyApp --resource --controller
kubebuilder create webhook --group myapp --version v1 --kind MyApp --defaulting --programmatic-validation

# Build y deploy
make build && make docker-build docker-push IMG=myorg/operator:1.0.0
make deploy IMG=myorg/operator:1.0.0

# Debugging
kubectl logs -n operator-system deployment/my-operator-controller-manager -f
kubectl describe myapp my-resource

# Ver CRDs instalados
kubectl get crd | grep myorg
```

### GUI / Web

- **Lens**: CRD browser con schema visual y recursos asociados
- **Octant**: Dashboard de resources CRD custom
- **VS Code**: YAML extension con schema CRD autocomplete (needs CRD installed)
- **kubectl-operator plugin**: Gestión de operators en cluster

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generar CRD | `kubebuilder create api` | Lens → CRD → Create |
| Ver logs controller | `kubectl logs -l control-plane=controller-manager` | Lens → Pod → Logs |
| Forzar reconcile | `kubectl annotate myapp my-resource myapp-operator/reconcile="now"` | Octant → Resource → Annotate |

---

## 7. Cheatsheet Rápido

```go
// Reconcile mínimo
func (r *MyAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var app myappv1.MyApp
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }
    deploy := buildDeployment(&app)
    _ = r.Patch(ctx, deploy, client.Apply, client.ForceOwnership, client.FieldOwner("myapp-op"))
    app.Status.Ready = true
    _ = r.Status().Update(ctx, &app)
    return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `10-container-orchestration-k8s-scheduling` | dependiente (operators despliegan workloads) | Sí |
| `20-package-management-helm-kustomize` | complementario (operators via Helm pattern) | Sí |
| `01-gitops-declarative-reconciliation` | complementario (GitOps deploya operators) | No |
| `24-policy-as-code-opa-rego` | complementario (validación de CRDs) | No |

---

## 9. Metadatos del Skill

```yaml
---
id: kubernetes-operators-controllers
domain: 04-devops-platform
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/kubernetes
tags: [kubernetes-operators, kubebuilder, crd, controller, reconciliation-loop, finalizers]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
