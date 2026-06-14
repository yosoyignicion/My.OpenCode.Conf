---
name: plugins-and-extensibility-architectures
description: "Plugin architectures allow extending application functionality without modifying core code"
---
# Plugins & Extensibility Architectures

## Semantic Triggers
```
plugin architecture extensibilidad, extension point hook system, plugin loader registry, micro kernel plugin architecture, plugin system spi, plugin isolation sandbox
```

---

## 1. Definición Teórica

Plugin architectures allow extending application functionality without modifying core code. The core defines extension points (hooks, interfaces, SPI) where plugins integrate. Patterns include: Plugin Registry (core loads plugins from a known location), Microkernel (minimal core, everything is a plugin), Hook System (event-driven extension points), and Pipeline (plugins as filter chain). Plugin isolation prevents plugins from crashing the host — sandboxing, versioned APIs, and resource limits are critical for production systems.

---

## 2. Implementación de Referencia

TypeScript with a Plugin Manager supporting dynamic loading, hooks, and sandboxed execution.

### Ejemplo Práctico Avanzado

```typescript
// ===== PLUGIN INTERFACES =====
interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  hooks: string[];  // which hooks this plugin hooks into
}

interface PluginContext {
  logger: Logger;
  config: Record<string, unknown>;
  dataStore: Map<string, unknown>;
  api: HostAPI;  // versioned API exposed to plugins
}

interface Plugin {
  manifest: PluginManifest;
  onInit?(ctx: PluginContext): Promise<void>;
  onStart?(ctx: PluginContext): Promise<void>;
  onStop?(ctx: PluginContext): Promise<void>;
}

// ===== HOST API (versioned, for backward compatibility) =====
class HostAPI {
  constructor(private version: number) {}

  async queryDatabase<T>(query: string, params: unknown[]): Promise<T[]> {
    if (this.version < 2) throw new Error('queryDatabase requires API v2+');
    return db.query(query, params).rows;
  }

  emitEvent(event: string, data: unknown): void {
    eventBus.emit(event, data);
  }

  getConfig(key: string): unknown {
    return config.get(key);
  }
}

// ===== PLUGIN MANAGER =====
class PluginManager {
  private plugins = new Map<string, Plugin>();
  private contexts = new Map<string, PluginContext>();
  private hooks = new Map<string, Set<string>>();  // hook → plugin names

  constructor(private pluginDir: string) {}

  async discoverAndLoad(): Promise<void> {
    const entries = await fs.readdir(this.pluginDir);
    for (const entry of entries) {
      if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
        await this.loadPlugin(path.join(this.pluginDir, entry));
      }
    }
  }

  async loadPlugin(filePath: string): Promise<void> {
    try {
      const pluginModule = await import(filePath);
      const plugin: Plugin = pluginModule.default || pluginModule;

      if (!plugin.manifest?.name) {
        console.warn(`Plugin ${filePath} missing manifest, skipping`);
        return;
      }

      // Check dependencies
      if (plugin.manifest.dependencies) {
        for (const dep of plugin.manifest.dependencies) {
          if (!this.plugins.has(dep)) {
            throw new Error(`Plugin ${plugin.manifest.name} requires ${dep}`);
          }
        }
      }

      // Create context with sandboxed API
      const ctx: PluginContext = {
        logger: console,
        config: this.getPluginConfig(plugin.manifest.name),
        dataStore: new Map(),
        api: new HostAPI(2),
      };

      // Register hooks
      if (plugin.manifest.hooks) {
        for (const hook of plugin.manifest.hooks) {
          if (!this.hooks.has(hook)) this.hooks.set(hook, new Set());
          this.hooks.get(hook)!.add(plugin.manifest.name);
        }
      }

      // Initialize
      await plugin.onInit?.(ctx);
      this.plugins.set(plugin.manifest.name, plugin);
      this.contexts.set(plugin.manifest.name, ctx);

      console.log(`Plugin loaded: ${plugin.manifest.name} v${plugin.manifest.version}`);
    } catch (err) {
      console.error(`Failed to load plugin ${filePath}:`, err);
    }
  }

  async startAll(): Promise<void> {
    for (const [name, plugin] of this.plugins) {
      try {
        await plugin.onStart?.(this.contexts.get(name)!);
      } catch (err) {
        console.error(`Plugin ${name} failed to start:`, err);
        // Isolate failure — don't crash the host
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const [name, plugin] of this.plugins) {
      try {
        await plugin.onStop?.(this.contexts.get(name)!);
      } catch (err) {
        console.error(`Plugin ${name} failed to stop:`, err);
      }
    }
  }

  async executeHook(hook: string, payload: unknown): Promise<void> {
    const pluginNames = this.hooks.get(hook);
    if (!pluginNames) return;

    for (const name of pluginNames) {
      const plugin = this.plugins.get(name);
      if (!plugin) continue;

      try {
        const hookFn = (plugin as any)[hook];
        if (hookFn) await hookFn.call(plugin, this.contexts.get(name), payload);
      } catch (err) {
        console.error(`Plugin ${name} hook ${hook} failed:`, err);
        // Isolate — one plugin failure doesn't affect others
      }
    }
  }

  private getPluginConfig(name: string): Record<string, unknown> {
    return (config.get(`plugins.${name}`) || {}) as Record<string, unknown>;
  }
}

// ===== EXAMPLE PLUGIN =====
// plugins/logging-plugin.js
export default {
  manifest: {
    name: 'request-logging',
    version: '1.0.0',
    description: 'Logs all HTTP requests',
    hooks: ['beforeRequest', 'afterResponse'],
  },
  async onInit(ctx: PluginContext) {
    ctx.logger.log('Logging plugin initialized');
  },
  async beforeRequest(ctx: PluginContext, request: any) {
    ctx.dataStore.set(`start-${request.id}`, Date.now());
    ctx.logger.log(`Request started: ${request.method} ${request.url}`);
  },
  async afterResponse(ctx: PluginContext, response: any) {
    const start = ctx.dataStore.get(`start-${response.requestId}`);
    const duration = Date.now() - (start as number);
    ctx.logger.log(`Request completed: ${response.status} (${duration}ms)`);
  },
};
```

**Fuente oficial:** https://www.eclipse.org/community/eclipse_newsletter/2017/september/article1.php

### Alternativa de Implementación Específica

Python with `importlib.metadata` for entry point discovery, `pluggy` for hook system, and `venv` for dependency isolation per plugin.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Aplicaciones extensibles por terceros (IDE, CMS, game engines), productos SaaS con features pluggables, sistemas con pipelines de procesamiento |
| **Cuándo evitar** | Sistemas con funcionalidad fija, plugins que requieren acceso profundo al core, equipos pequeños donde la extensibilidad es overkill |
| **Alternativas** | Monolítico con feature flags (más simple), Microservicios (cada servicio es independiente), Scripting embebido (Lua, Python) |
| **Coste/Complejidad** | Alta. API versionada, sandboxing, gestión de dependencias, ciclo de vida de plugins. Gran flexibilidad. Puede complicar debugging y seguridad |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Plugin conflict por dependencias incompatibles

**¿Qué ocasionó el error?**
Dos plugins requerían versiones diferentes de la misma librería, causando errores en tiempo de ejecución.

**¿Cómo se solucionó?**
```typescript
// Plugin isolation con módulos separados
class IsolatedPluginLoader {
  async loadPlugin(filePath: string): Promise<Plugin> {
    // Use vm module for sandboxed require
    const vm = require('vm');
    const sandbox = {
      require: (moduleName: string) => {
        // Redirect to plugin-specific node_modules
        const pluginModules = path.join(path.dirname(filePath), 'node_modules');
        return require(path.join(pluginModules, moduleName));
      },
      console: { ...console },
    };

    const code = await fs.readFile(filePath, 'utf-8');
    const script = new vm.Script(code);
    const context = vm.createContext(sandbox);
    script.runInContext(context);
    return sandbox.plugin;
  }
}
```

**¿Por qué funciona esta técnica?**
Cada plugin carga sus dependencias desde su propio `node_modules`, evitando conflictos de versiones.

### Caso: Plugin fuga de memoria

**¿Qué ocasionó el error?**
Un plugin no limpiaba sus listeners en `onStop`, causando que referencias al plugin muerto persistieran.

**¿Cómo se solucionó?**
```typescript
// Forzar cleanup en la detención del plugin
class SafePluginManager {
  async stopPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    // Set timeout for forced stop
    const forceStop = setTimeout(() => {
      console.warn(`Plugin ${name} stop timed out, forcing...`);
      this.forceCleanup(name);
    }, 5000);

    try {
      await plugin.onStop?.(this.contexts.get(name)!);
    } finally {
      clearTimeout(forceStop);
      this.forceCleanup(name);
    }
  }

  private forceCleanup(name: string): void {
    // Remove all references, cancel pending work
    this.plugins.delete(name);
    this.contexts.delete(name);
    // Clean up hook registrations
    for (const [, plugins] of this.hooks) plugins.delete(name);
  }
}
```

**¿Por qué funciona esta técnica?**
Timeout de forced stop + cleanup exhaustivo garantiza que los plugins se limpien completamente incluso si su `onStop` falla.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~800 tokens estimados al invocar este skill
- **Trigger de activación:** "plugin architecture", "extensibility", "plugin system", "hook system", "microkernel", "spi"
- **Prioridad de carga:** Media — relevante para sistemas extensibles
- **Dependencias:** `02-arquitectura-diseno/17-dependency-injection-inversion`, `02-arquitectura-diseno/21-pipeline-filter-architecture`

### Tool Integration

```json
{
  "tool_name": "plugins-and-extensibility-architectures",
  "description": "Implements Plugin/Extensibility architectures: Plugin Manager, hook system, sandboxed execution, versioned API",
  "triggers": ["plugin", "extensibility", "hook", "extension point", "microkernel", "spi"],
  "context_hint": "Inject when user asks about making applications extensible or plugin systems",
  "output_format": "code examples with Plugin Manager and hooks",
  "max_tokens": 1800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre arquitectura de plugins o extensibilidad, carga el skill plugins-and-extensibility-architectures
y responde siguiendo la sección de implementación de referencia. Prioriza ejemplos idiomáticos sobre teoría.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# List installed plugins
npm run plugins:list
# Install a plugin
npm run plugins:install -- --from ./path/to/plugin.js
# Disable plugin
npm run plugins:disable -- --name my-plugin
```

### GUI / Web

- **VS Code Extensions Marketplace**: Ejemplo de UI de plugins
- **WordPress Plugin Dashboard**: Gestión de plugins con activación/desactivación
- **Grafana Plugins**: Marketplace y gestión de plugins

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| List plugins | `npm run plugins:list` | Plugins settings |
| Disable plugin | `npm run plugins:disable -- --name {name}` | Toggle off |

---

## 7. Cheatsheet Rápido

```typescript
interface Plugin { manifest: PluginManifest; onInit(ctx): void; onStart?(ctx): void; onStop?(ctx): void; }
// PluginManager: loadPlugin(), startAll(), stopAll(), executeHook()
// Hooks: extension points defined by host, implemented by plugins
// Isolation: each plugin in sandbox, independent deps, timeout on stop
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-arquitectura-diseno/17-dependency-injection-inversion` | Complementario | Sí |
| `02-arquitectura-diseno/21-pipeline-filter-architecture` | Complementario | No |
| `02-arquitectura-diseno/06-gof-structural-patterns` | Complementario | No |
| `05-ia-agentica-datos/33-plugins-extensibility-agent` | Complementario | No |
| `02-arquitectura-diseno/30-bulkhead-circuit-breaker-resilience` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: plugins-and-extensibility-architectures
domain: 02-arquitectura-diseno
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [plugin, extensibility, hook-system, microkernel, spi, extension-point, isolation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
