---
name: tauri-rust-desktop
description: "Tauri es un framework para construir aplicaciones de escritorio multiplataforma con un backend en Rust y un frontend web (cualquier framework: React, Vue, Svelte, etc.)"
---
# Tauri (Rust) Desktop

## Semantic Triggers
```
Tauri v2 Rust backend web frontend desktop app, tauri::command invoke frontend Rust communication, State Mutex AppHandle tauri state management, Tauri plugins shell dialog fs sql http, capabilities permissions security model, tauri build bundle DMG AppImage MSI
```

---

## 1. Definición Teórica

Tauri es un framework para construir aplicaciones de escritorio multiplataforma con un backend en Rust y un frontend web (cualquier framework: React, Vue, Svelte, etc.). A diferencia de Electron (que empaqueta Chromium completo), Tauri utiliza el WebView del sistema operativo (WebView2 en Windows, WKWebView en macOS, WebKitGTK en Linux), reduciendo el tamaño del bundle de ~150 MB a 3-8 MB. La comunicación entre frontend y backend se realiza mediante `invoke()` → `#[tauri::command]`. El modelo de seguridad es permission-based: cada funcionalidad (shell, fs, dialog, http) requiere permisos explícitos en el archivo de capabilities. El estado compartido se maneja con `State<T>` + `Mutex`/`RwLock`.

---

## 2. Implementación de Referencia

Tauri v2 (estable). Backend en Rust con `tauri::Builder`, frontend con Vite + React/TypeScript. Plugins oficiales para shell, dialog, fs, sql, http. Compilación con LTO para binarios mínimos.

### Ejemplo Práctico Avanzado

```rust
// src-tauri/src/lib.rs
use tauri::{AppHandle, Manager, State, Emitter};
use serde::{Serialize, Deserialize};
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Task {
    id: u64,
    name: String,
    done: bool,
}

struct AppState {
    tasks: Mutex<Vec<Task>>,
    counter: Mutex<u64>,
}

#[tauri::command]
fn add_task(state: State<AppState>, name: String) -> Result<Task, String> {
    let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    let mut counter = state.counter.lock().map_err(|e| e.to_string())?;
    *counter += 1;
    let task = Task { id: *counter, name, done: false };
    tasks.push(task.clone());
    Ok(task)
}

#[tauri::command]
fn list_tasks(state: State<AppState>) -> Result<Vec<Task>, String> {
    let tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    Ok(tasks.clone())
}

#[tauri::command]
fn toggle_task(state: State<AppState>, id: u64) -> Result<Task, String> {
    let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    let task = tasks.iter_mut().find(|t| t.id == id).ok_or("Task not found")?;
    task.done = !task.done;
    Ok(task.clone())
}

#[tauri::command]
fn delete_task(state: State<AppState>, id: u64) -> Result<(), String> {
    let mut tasks = state.tasks.lock().map_err(|e| e.to_string())?;
    tasks.retain(|t| t.id != id);
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! From Rust backend.", name)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .manage(AppState {
            tasks: Mutex::new(Vec::new()),
            counter: Mutex::new(0),
        })
        .invoke_handler(tauri::generate_handler![add_task, list_tasks, toggle_task, delete_task, greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// Frontend (React + TypeScript)
import { invoke } from "@tauri-apps/api/core"

interface Task {
  id: number
  name: string
  done: boolean
}

export async function addTask(name: string): Promise<Task> {
  return invoke<Task>("add_task", { name })
}

export async function listTasks(): Promise<Task[]> {
  return invoke<Task[]>("list_tasks")
}

export async function toggleTask(id: number): Promise<Task> {
  return invoke<Task>("toggle_task", { id })
}

export async function deleteTask(id: number): Promise<void> {
  return invoke("delete_task", { id })
}

export async function greet(name: string): Promise<string> {
  return invoke<string>("greet", { name })
}
```

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "dialog:default",
    "fs:default",
    "http:default"
  ]
}
```

**Fuente oficial:** https://v2.tauri.app/start/

### Alternativa de Implementación Específica

**Wails (Go)** para equipos que prefieren Go sobre Rust. Wails ofrece un modelo similar a Tauri (WebView del SO, backend en Go), con bindings automáticos y Hot Reload nativo. Ideal si el equipo ya usa Go para backend.

```go
// main.go
package main

import (
    "context"
    "fmt"
    "github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct{ ctx context.Context }

func (a *App) startup(ctx context.Context) { a.ctx = ctx }

func (a *App) Greet(name string) string {
    return fmt.Sprintf("Hello %s!", name)
}

func (a *App) GetPlatform() string {
    return runtime.Environment(a.ctx).Platform
}
```

**Fuente oficial:** https://wails.io/docs/introduction

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Apps de escritorio donde el tamaño del bundle y la seguridad son prioridad; equipos dispuestos a usar Rust |
| **Cuándo evitar** | Apps que necesitan Chromium DevTools avanzadas o extensiones de navegador; equipos sin experiencia en Rust |
| **Alternativas** | Electron (más ecosistema, 150 MB); Wails (Go, más simple que Rust); Flutter Desktop (Dart, rendimiento consistente) |
| **Coste/Complejidad** | Medio — Rust tiene curva de aprendizaje, pero Tauri abstrae la complejidad. El sistema de capabilities es más seguro que Electron. Bundle 3-8 MB con LTO. Compilación lenta en primera build (~2-5 min) |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Command `invoke` falla con "unknown command"

**¿Qué ocasionó el error?**
El comando no está registrado en `invoke_handler` o el nombre en Rust no coincide con el usado en frontend.

**¿Cómo se solucionó?**
Verificar que el comando esté en `generate_handler!` y que el nombre coincida (Tauri convierte snake_case a camelCase automáticamente):

```rust
// Rust — registrado
.invoke_handler(tauri::generate_handler![add_task])

// Frontend — Tauri convierte a camelCase
invoke("addTask", { name: "Buy milk" }) // ✅ correcto
// invoke("add_task", { name: "Buy milk" }) // ❌ incorrecto — Tauri espera camelCase
```

**¿Por qué funciona esta técnica?**
Tauri v2 convierte automáticamente los nombres de comandos Rust (snake_case) a camelCase para el frontend. Si usas snake_case en invoke, no encuentra el comando.

### Caso: Rust error "cannot mutably borrow" con State

**¿Qué ocasionó el error?**
Intentar tomar dos locks mutables en el mismo comando, causando un deadlock o error de borrow checker.

**¿Cómo se solucionó?**
Usar `RwLock` para lectura concurrente o estructurar el estado para minimizar locks:

```rust
use std::sync::RwLock;

struct AppState {
    tasks: RwLock<Vec<Task>>,
}

#[tauri::command]
fn list_tasks(state: State<AppState>) -> Result<Vec<Task>, String> {
    let tasks = state.tasks.read().map_err(|e| e.to_string())?;
    Ok(tasks.clone())
}
```

**¿Por qué funciona esta técnica?**
`RwLock` permite múltiples lecturas concurrentes y un solo escritor. Para comandos de solo lectura, `read()` no bloquea a otros lectores, mejorando el rendimiento.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~900 tokens estimados al invocar este skill
- **Trigger de activación:** "tauri", "rust desktop", "webview", "desktop app rust", "tauri v2" en la consulta
- **Prioridad de carga:** Media — creciendo en popularidad como alternativa a Electron
- **Dependencias:** `07-01-react-ui-development`, `07-04-typescript-type-system`

### Tool Integration

```json
{
  "tool_name": "tauri-rust-desktop",
  "description": "Guía de Tauri v2: Rust backend, invoke commands, state management, plugins, capabilities, build",
  "triggers": ["tauri", "rust", "desktop", "webview", "tauri v2"],
  "context_hint": "Inyectar sección 2 (Implementación) para ejemplos de commands Rust y frontend. FAQ para problemas de comandos y estado.",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre aplicaciones desktop con Tauri, carga el skill tauri-rust-desktop.
Usa Tauri v2. Los commands devuelven Result<T, String>.
State con Mutex/RwLock. Permisos vía capabilities.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear proyecto
npm create tauri-app@latest my-app -- --template react-ts

# Desarrollo (inicia Vite + Tauri dev server)
npm run tauri dev

# Build producción
npm run tauri build

# Ver comandos disponibles
npx tauri --help

# Lint Rust
cd src-tauri && cargo clippy

# Test Rust
cargo test

# Ver tamaño del binario
ls -lh src-tauri/target/release/bundle/
```

### GUI / Web

- **Tauri Inspector:** Abrir WebView DevTools con `Ctrl+Shift+I` (en desarrollo) o haciendo click derecho → Inspect
- **VS Code extension:** `tauri-vscode` — snippets, syntax highlighting para Tauri config, task runner
- **Rust Analyzer (VS Code):** Autocompletado, type checking, refactors para código Rust en `src-tauri/`
- **Cargo UI:** `cargo-ui` para visualizar dependencias y auditorías de seguridad

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Iniciar dev | `npm run tauri dev` | VS Code → Tasks → Run Task |
| Build release | `npm run tauri build` | VS Code → Tauri sidebar |
| Abrir Inspector | — | `Ctrl+Shift+I` (dev) / Click derecho |
| Compilar Rust solo | `cargo build --release` | VS Code → Rust Analyzer → Build |

---

## 7. Cheatsheet Rápido

```rust
// Rust command
#[tauri::command]
fn my_cmd(state: State<AppState>, name: String) -> Result<String, String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    Ok(format!("Hello {}", name))
}

// Main
tauri::Builder::default()
    .manage(AppState { data: Mutex::new(vec![]) })
    .invoke_handler(tauri::generate_handler![my_cmd])
    .run(tauri::generate_context!())?;
```

```typescript
// Frontend
const result = await invoke<string>("myCmd", { name: "World" })
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-10-electron-desktop-apps` | Alternativa | No |
| `07-01-react-ui-development` | Complementario | Sí |
| `07-04-typescript-type-system` | Complementario | Sí |
| `07-12-rest-api-integration-client` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: tauri-rust-desktop
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/tauri
tags: [tauri, rust, desktop, webview, cross-platform, frontend]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
