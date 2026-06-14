---
name: command-pattern-undo-redo
description: "The Command pattern encapsulates a request as an object, allowing parameterization, queuing, logging, and undo/redo"
---
# Command Pattern: Undo & Redo

## Semantic Triggers
```
command pattern undo redo, command history deshacer rehacer, command encapsulado operación, memento snapshot estado, command queue transactional, command pattern macro composición
```

---

## 1. Definición Teórica

The Command pattern encapsulates a request as an object, allowing parameterization, queuing, logging, and undo/redo. Each command implements `execute()` and `undo()`. A Command History maintains two stacks (undo and redo) to navigate through state changes. The Memento pattern complements Command for saving/restoring state snapshots when inverse operations are complex. Macro Commands compose multiple commands into a single composite operation. Command queuing enables transactional execution and deferred processing.

---

## 2. Implementación de Referencia

TypeScript with Command interface, undo/redo history, macro commands, and memento-based state capture.

### Ejemplo Práctico Avanzado

```typescript
// ===== COMMAND INTERFACE =====
interface Command {
  readonly name: string;
  execute(): Promise<void>;
  undo(): Promise<void>;
  canUndo(): boolean;
}

// ===== CONCRETE COMMANDS =====
class UpdateOrderStatusCommand implements Command {
  readonly name = 'UpdateOrderStatus';

  constructor(
    private orderId: string,
    private newStatus: string,
    private previousStatus: string
  ) {}

  async execute(): Promise<void> {
    await db.updateTable('orders')
      .set({ status: this.newStatus })
      .where('id', '=', this.orderId)
      .execute();
  }

  async undo(): Promise<void> {
    await db.updateTable('orders')
      .set({ status: this.previousStatus })
      .where('id', '=', this.orderId)
      .execute();
  }

  canUndo(): boolean { return true; }
}

class AddOrderItemCommand implements Command {
  readonly name = 'AddOrderItem';
  private itemId: string;

  constructor(
    private orderId: string,
    private productId: string,
    private quantity: number
  ) {
    this.itemId = crypto.randomUUID();
  }

  async execute(): Promise<void> {
    await db.insertInto('order_items')
      .values({ id: this.itemId, order_id: this.orderId, product_id: this.productId, quantity: this.quantity })
      .execute();
  }

  async undo(): Promise<void> {
    await db.deleteFrom('order_items')
      .where('id', '=', this.itemId)
      .execute();
  }

  canUndo(): boolean { return true; }
}

class SendEmailCommand implements Command {
  readonly name = 'SendEmail';

  constructor(private to: string, private subject: string, private body: string) {}

  async execute(): Promise<void> {
    await emailService.send(this.to, this.subject, this.body);
  }

  async undo(): Promise<void> {
    // Cannot unsend an email — just log
    console.log(`Cannot undo email to ${this.to}`);
  }

  canUndo(): boolean { return false; }
}

// ===== COMMAND HISTORY (UNDO/REDO) =====
class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory = 50;
  private onStateChange?: (undoCount: number, redoCount: number) => void;

  constructor(maxHistory = 50, onStateChange?: (undoCount: number, redoCount: number) => void) {
    this.maxHistory = maxHistory;
    this.onStateChange = onStateChange;
  }

  async execute(command: Command): Promise<void> {
    await command.execute();
    this.undoStack.push(command);
    this.redoStack = [];  // clear redo on new command
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();  // forget oldest
    }
    this.notify();
  }

  async undo(): Promise<boolean> {
    const command = this.undoStack.pop();
    if (!command || !command.canUndo()) return false;

    await command.undo();
    this.redoStack.push(command);
    this.notify();
    return true;
  }

  async redo(): Promise<boolean> {
    const command = this.redoStack.pop();
    if (!command) return false;

    await command.execute();
    this.undoStack.push(command);
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1].canUndo();
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoCount(): number { return this.undoStack.length; }
  getRedoCount(): number { return this.redoStack.length; }

  getUndoDescription(): string | null {
    const last = this.undoStack[this.undoStack.length - 1];
    return last ? `${last.name}: ${JSON.stringify(last)}` : null;
  }

  private notify(): void {
    this.onStateChange?.(this.undoStack.length, this.redoStack.length);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}

// ===== MACRO COMMAND =====
class MacroCommand implements Command {
  readonly name = 'Macro';
  private commands: Command[] = [];

  constructor(name: string, commands: Command[]) {
    this.name = `Macro: ${name}`;
    this.commands = commands;
  }

  async execute(): Promise<void> {
    // Execute all, if any fails, rollback executed ones
    const executed: Command[] = [];
    try {
      for (const cmd of this.commands) {
        await cmd.execute();
        executed.push(cmd);
      }
    } catch (err) {
      // Rollback in reverse order
      for (const cmd of [...executed].reverse()) {
        try { await cmd.undo(); } catch (e) { /* log */ }
      }
      throw err;
    }
  }

  async undo(): Promise<void> {
    for (const cmd of [...this.commands].reverse()) {
      await cmd.undo();
    }
  }

  canUndo(): boolean {
    // Macro can undo only if ALL commands can undo
    return this.commands.every(c => c.canUndo());
  }
}

// ===== MEMENTO-BASED SNAPSHOT =====
// For complex state where inverse operations are impractical
interface Memento {
  state: Record<string, unknown>;
  timestamp: Date;
}

class MementoCommand<T extends { save(): Memento; restore(m: Memento): void }> implements Command {
  readonly name = 'MementoCommand';
  private snapshot: Memento | null = null;

  constructor(
    private target: T,
    private action: () => Promise<void>,
    private description: string
  ) {
    this.name = description;
  }

  async execute(): Promise<void> {
    this.snapshot = this.target.save();  // snapshot before
    await this.action();
  }

  async undo(): Promise<void> {
    if (this.snapshot) {
      this.target.restore(this.snapshot);
    }
  }

  canUndo(): boolean { return this.snapshot !== null; }
}

// ===== USAGE =====
const history = new CommandHistory(50, (undo, redo) => {
  console.log(`Undo: ${undo}, Redo: ${redo}`);
  updateUI(undo, redo);  // enable/disable buttons
});

// UI event handlers
async function onStatusChange(orderId: string, newStatus: string, prevStatus: string) {
  await history.execute(new UpdateOrderStatusCommand(orderId, newStatus, prevStatus));
}

async function onUndo() {
  await history.undo();
}

async function onRedo() {
  await history.redo();
}

// Macro: "Place Order" is composed of multiple commands
const placeOrderMacro = new MacroCommand('PlaceOrder', [
  new AddOrderItemCommand(orderId, productId, 2),
  new UpdateOrderStatusCommand(orderId, 'confirmed', 'pending'),
]);
await history.execute(placeOrderMacro);
```

**Fuente oficial:** https://refactoring.guru/design-patterns/command

### Alternativa de Implementación Específica

Python with `__call__` for command execution and `__repr__` for command descriptions. Use `deque` for history with maxlen.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Editores y herramientas de diseño, aplicaciones con deshacer/rehacer, sistemas que requieren auditoría de cambios, procesos transaccionales |
| **Cuándo evitar** | Operaciones sin inversa clara, sistemas batch sin interacción humana, cuando la simplicidad de estado actual es suficiente |
| **Alternativas** | Event Sourcing (full audit trail, pero más complex), Memento puro (snapshot sin comandos), Optimistic concurrency (control de versiones) |
| **Coste/Complejidad** | Medio. Command history es fácil de entender. Undo requiere diseñar la inversa. Macro commands añaden complejidad transaccional |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Undo de operación no reversible

**¿Qué ocasionó el error?**
Se intentó undo de un email enviado, que es inherentemente irreversible.

**¿Cómo se solucionó?**
```typescript
// Marcar comandos como no-undable
class SendEmailCommand implements Command {
  canUndo(): boolean { return false; }  // explícitamente no reversible
}

// UI deshabilita undo cuando el tope no es undable
const canUndo = history.canUndo();  // check if top command supports undo
undoButton.disabled = !canUndo;

// O compensar en lugar de deshacer exactamente
class SendEmailCommand implements Command {
  async undo(): Promise<void> {
    await emailService.send(this.to, 'Re: ' + this.subject, 'This action has been reversed.');
    // compensation email instead of undo
  }
}
```

**¿Por qué funciona esta técnica?**
Commands que no pueden deshacerse deben reportar `canUndo()=false`. Alternativamente, implementar compensación en lugar de undo exacto.

### Caso: Memory leak por history sin límite

**¿Qué ocasionó el error?**
El history de comandos crecía sin límite en una aplicación de dibujo, agotando la memoria.

**¿Cómo se solucionó?**
```typescript
class BoundedCommandHistory {
  private stack: Command[] = [];
  private maxSize = 100;

  async execute(cmd: Command): Promise<void> {
    this.stack.push(cmd);
    if (this.stack.length > this.maxSize) {
      const removed = this.stack.shift();
      if (removed && typeof (removed as any).discard === 'function') {
        (removed as any).discard();  // cleanup resources
      }
    }
  }
}
```

**¿Por qué funciona esta técnica?**
History acotado previene crecimiento infinito. Al descartar comandos viejos, se liberan recursos asociados.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "command pattern", "undo redo", "command history", "macro command", "memento command", "transactional command"
- **Prioridad de carga:** Media — relevante para UI y editores
- **Dependencias:** `02-arquitectura-diseno/07-gof-behavioral-patterns`, `02-arquitectura-diseno/24-state-machine-workflows`

### Tool Integration

```json
{
  "tool_name": "command-pattern-undo-redo",
  "description": "Implements Command pattern: undo/redo history, macro commands, memento snapshots, bounded history, non-reversible commands",
  "triggers": ["command pattern", "undo redo", "command history", "macro command", "memento"],
  "context_hint": "Inject when user asks about undo/redo functionality or command-based operations",
  "output_format": "code examples with history stack and macro composition",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre patrón Command, undo/redo o historial de comandos, carga el skill command-pattern-undo-redo
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Debug command history
curl -s http://localhost:3000/history | jq '.'
# Execute undo via API
curl -X POST http://localhost:3000/history/undo
```

### GUI / Web

- **Redux DevTools**: Time-travel debugging (undo/redo for state)
- **Figma/Photoshop**: Undo/redo UI con stack visual
- **VSCode**: Command palette y undo stack

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Undo | — | `Ctrl+Z` |
| Redo | — | `Ctrl+Shift+Z` / `Ctrl+Y` |
| Clear history | — | `Ctrl+Alt+Z` (app-specific) |

---

## 7. Cheatsheet Rápido

```typescript
interface Command { execute(): Promise<void>; undo(): Promise<void>; canUndo(): boolean; }
class CommandHistory { async execute(cmd); async undo(); async redo(); canUndo(); canRedo(); }
class MacroCommand implements Command { execute() { for cmd in commands: cmd.execute() } undo() { reverse: cmd.undo() } }
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/07-gof-behavioral-patterns` | Dependiente | Sí |
| `02-arquitectura-diseno/24-state-machine-workflows` | Complementario | No |
| `02-arquitectura-diseno/13-domain-events-dispatching` | Complementario | No |
| `02-arquitectura-diseno/09-event-sourcing-eventstore` | Alternativa | No |
| `02-arquitectura-diseno/35-state-management-patterns` | Complementario | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: command-pattern-undo-redo
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [command-pattern, undo-redo, command-history, macro-command, memento, reversible-operations]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
