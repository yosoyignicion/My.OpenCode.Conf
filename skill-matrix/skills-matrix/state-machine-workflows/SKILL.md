---
name: state-machine-workflows
description: "State Machines model entities as a finite set of states with well-defined transitions triggered by events"
---
# State Machines & Workflows

## Semantic Triggers
```
state machine estados transiciones, workflow engine máquina estados, finite state machine fsm, state machine guard conditions, workflow saga state machine, state machine eventos transiciones
```

---

## 1. Definición Teórica

State Machines model entities as a finite set of states with well-defined transitions triggered by events. Guards prevent invalid transitions by evaluating conditions. Actions execute side effects on transitions (enter/exit/transition). Workflow engines extend state machines with long-running processes, human tasks, timeouts, and compensation — effectively using state machines to model business processes. State machines make state logic explicit, testable, and visualizable, replacing nested conditionals and enum-switch anti-patterns.

---

## 2. Implementación de Referencia

TypeScript with XState-inspired state machine implementation and workflow patterns.

### Ejemplo Práctico Avanzado

```typescript
// ===== STATE MACHINE DEFINITION =====
type OrderState = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
type OrderEvent =
  | { type: 'CONFIRM' }
  | { type: 'SHIP' }
  | { type: 'DELIVER' }
  | { type: 'CANCEL'; reason: string };

interface Transition<TState, TEvent> {
  target: TState;
  guard?: (context: any, event: TEvent) => boolean;
  actions?: Array<(context: any, event: TEvent) => void>;
}

class StateMachine<TState extends string, TEvent extends { type: string }> {
  private transitions = new Map<string, Transition<TState, TEvent>>();
  private context: Record<string, unknown> = {};

  constructor(
    public currentState: TState,
    private initialState: TState,
    private onTransition?: (from: TState, to: TState, event: TEvent) => void
  ) {
    this.currentState = initialState;
  }

  addTransition(from: TState, eventType: TEvent['type'], transition: Transition<TState, TEvent>): this {
    const key = `${from}:${eventType}`;
    this.transitions.set(key, transition);
    return this;
  }

  setContext(ctx: Record<string, unknown>): void {
    this.context = ctx;
  }

  send(event: TEvent): boolean {
    const key = `${this.currentState}:${event.type}`;
    const transition = this.transitions.get(key);

    if (!transition) return false;  // no valid transition

    // Check guard
    if (transition.guard && !transition.guard(this.context, event)) return false;

    const previousState = this.currentState;

    // Execute exit actions of current state
    this.executeActions(`exit:${this.currentState}`, event);

    // Execute transition actions
    if (transition.actions) {
      transition.actions.forEach(action => action(this.context, event));
    }

    // Change state
    this.currentState = transition.target;

    // Execute entry actions of new state
    this.executeActions(`entry:${transition.target}`, event);

    // Notify
    this.onTransition?.(previousState, this.currentState, event);
    return true;
  }

  can(event: TEvent): boolean {
    const key = `${this.currentState}:${event.type}`;
    const transition = this.transitions.get(key);
    if (!transition) return false;
    if (transition.guard) return transition.guard(this.context, event);
    return true;
  }

  private executeActions(hook: string, event: TEvent): void {
    // Hooks registered as `entry:state` or `exit:state`
    // Implementation depends on hook registration
  }
}

// ===== CONCRETE ORDER STATE MACHINE =====
type OrderContext = {
  items: OrderItem[];
  amount: number;
  userRole: string;
  paymentId?: string;
  shipmentId?: string;
};

function createOrderMachine(initialState: OrderState = 'pending'): StateMachine<OrderState, OrderEvent> {
  const machine = new StateMachine<OrderState, OrderEvent>(
    initialState,
    'pending',
    (from, to, event) => {
      console.log(`Order state: ${from} → ${to} via ${event.type}`);
    }
  );

  machine
    .addTransition('pending', 'CONFIRM', {
      target: 'confirmed',
      guard: (ctx: OrderContext) => ctx.items.length > 0,
      actions: [
        (ctx) => { console.log('Order confirmed!'); },
      ],
    })
    .addTransition('pending', 'CANCEL', { target: 'cancelled' })
    .addTransition('confirmed', 'SHIP', {
      target: 'shipped',
      guard: (ctx: OrderContext) => !!ctx.paymentId,
    })
    .addTransition('confirmed', 'CANCEL', { target: 'cancelled' })
    .addTransition('shipped', 'DELIVER', {
      target: 'delivered',
      guard: (ctx: OrderContext) => !!ctx.shipmentId,
    });

  return machine;
}

// ===== WORKFLOW ENGINE =====
// Extended state machine with persistence, timeouts, and compensation

class WorkflowInstance<TState extends string, TEvent extends { type: string }> {
  private machine: StateMachine<TState, TEvent>;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    public id: string,
    machine: StateMachine<TState, TEvent>,
    private persistence: WorkflowPersistence
  ) {
    this.machine = machine;
  }

  async handleEvent(event: TEvent): Promise<boolean> {
    const previousState = this.machine.currentState;
    const handled = this.machine.send(event);

    if (handled) {
      await this.persistence.save(this.id, {
        from: previousState,
        to: this.machine.currentState,
        event: event.type,
        timestamp: new Date(),
        context: this.machine['context'],
      });
    }

    return handled;
  }

  startTimer(name: string, delayMs: number, event: TEvent): void {
    const timer = setTimeout(async () => {
      this.timers.delete(name);
      await this.handleEvent(event);
    }, delayMs);
    this.timers.set(name, timer);
  }

  cancelTimer(name: string): void {
    const timer = this.timers.get(name);
    if (timer) { clearTimeout(timer); this.timers.delete(name); }
  }

  async compensate(reason: string): Promise<void> {
    // Walk back through history
    const history = await this.persistence.getHistory(this.id);
    for (const entry of [...history].reverse()) {
      // Execute compensation for each step
      console.log(`Compensating: ${entry.from} → ${entry.to} (${entry.event})`);
    }
  }

  destroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}

interface WorkflowPersistence {
  save(id: string, entry: WorkflowEntry): Promise<void>;
  getHistory(id: string): Promise<WorkflowEntry[]>;
}

// ===== USAGE =====
const machine = createOrderMachine();
const workflow = new WorkflowInstance('order-123', machine, persistence);

workflow.setContext({ items: ['item1'], amount: 100, userRole: 'admin' });
await workflow.handleEvent({ type: 'CONFIRM' });  // pending → confirmed
await workflow.handleEvent({ type: 'SHIP' });       // confirmed → shipped
```

**Fuente oficial:** https://xstate.js.org/docs/

### Alternativa de Implementación Específica

Python with `transitions` library for simple state machines and `temporalio` for production workflow engine.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Flujos de negocio con estados claros, procesos multi-paso, orquestación de sagas, approval workflows, order processing |
| **Cuándo evitar** | Lógica condicional simple (if/else es suficiente), estados sin side effects, flujos lineales sin bifurcación |
| **Alternativas** | Enum + switch (simple pero no escalable), Sagas (para transacciones distribuidas), BPMN engine (Camunda, para procesos humanos) |
| **Coste/Complejidad** | Medio. State machine es fácil de visualizar y testear. Workflow engine añade persistencia y complejidad. Gran valor en procesos complejos |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Transición perdida por error de programación

**¿Qué ocasionó el error?**
Se añadió un nuevo estado pero se olvidó definir transiciones, causando que eventos válidos fueran ignorados silenciosamente.

**¿Cómo se solucionó?**
```typescript
// Validación exhaustiva de cobertura de transiciones
function validateMachine<TState extends string, TEvent extends { type: string }>(
  machine: StateMachine<TState, TEvent>,
  states: TState[],
  events: TEvent['type'][]
): string[] {
  const missing: string[] = [];
  for (const state of states) {
    for (const event of events) {
      if (!machine.canTransition(state, event)) {
        missing.push(`Missing transition: ${state} + ${event}`);
      }
    }
  }
  return missing;
}
// Usar en tests
const missing = validateMachine(orderMachine, states, events);
assert(missing.length === 0, `Missing transitions: ${missing.join(', ')}`);
```

**¿Por qué funciona esta técnica?**
Validación exhaustiva en tests detecta transiciones faltantes antes de llegar a producción.

### Caso: Estado ilegal por guard incorrecto

**¿Qué ocasionó el error?**
Un guard permitía confirmar una orden sin items porque la validación era `items.length >= 0` en lugar de `> 0`.

**¿Cómo se solucionó?**
```typescript
// Guard correcto
.addTransition('pending', 'CONFIRM', {
  target: 'confirmed',
  guard: (ctx: OrderContext) => ctx.items.length > 0,  // > 0, no >= 0
  actions: [/* ... */],
});

// Tests para guards
test('cannot confirm empty order', () => {
  const machine = createOrderMachine();
  machine.setContext({ items: [] });
  expect(machine.can({ type: 'CONFIRM' })).toBe(false);
});
```

**¿Por qué funciona esta técnica?**
Cada guard debe tener tests específicos verificando condiciones límite. `can()` permite chequear sin efectos secundarios.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "state machine", "workflow engine", "finite state machine", "xstate", "fsm", "workflow orchestration"
- **Prioridad de carga:** Alta — patrón fundamental para modelado de procesos
- **Dependencias:** `02-arquitectura-diseno/10-saga-orchestration-choreography`, `02-arquitectura-diseno/29-command-pattern-undo-redo`

### Tool Integration

```json
{
  "tool_name": "state-machine-workflows",
  "description": "Implements State Machines and Workflows: FSM, guards, actions, workflow engine with persistence, timers, compensation",
  "triggers": ["state machine", "workflow", "fsm", "xstate", "transition", "guard"],
  "context_hint": "Inject when user asks about state-based business logic or workflow orchestration",
  "output_format": "code examples with state machine and workflow engine",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre máquinas de estado o workflows, carga el skill state-machine-workflows y responde
siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Visualize state machine
npx xstate-viz --file machine.ts

# Test workflow
npm run test -- --grep "state machine"
```

### GUI / Web

- **XState Visualizer**: https://stately.ai/viz — visualización interactiva de state machines
- **Camunda Modeler**: Diseño de BPMN workflows
- **Temporal Web UI**: Dashboard de workflows en ejecución

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Visualize machine | `npx xstate-viz --file machine.ts` | Stately.ai import |
| Run workflow tests | `npm test -- --grep "state machine"` | — |

---

## 7. Cheatsheet Rápido

```typescript
// FSM: states, events, transitions, guards, actions
// addTransition('state', 'EVENT', { target: 'next', guard, actions })
// send({ type: 'EVENT' }) → boolean (handled?)
// can({ type: 'EVENT' }) → boolean (no side effects)
// Workflow: FSM + persistence + timers + compensation + history
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/10-saga-orchestration-choreography` | Complementario | Sí |
| `02-arquitectura-diseno/29-command-pattern-undo-redo` | Complementario | Sí |
| `02-arquitectura-diseno/07-gof-behavioral-patterns` | Complementario | Sí |
| `02-arquitectura-diseno/04-clean-architecture-principles` | Complementario | No |
| `03-sistemas-distribuidos/27-saga-pattern-distributed-coordination` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: state-machine-workflows
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [state-machine, workflow, fsm, xstate, guard, transition, workflow-engine, compensation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
