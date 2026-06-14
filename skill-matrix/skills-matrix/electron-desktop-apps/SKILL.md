---
name: electron-desktop-apps
description: "Electron es un framework para construir aplicaciones de escritorio multiplataforma usando Chromium como renderizador y Node.js como proceso principal"
---
# Electron Desktop Apps

## Semantic Triggers
```
Electron main process renderer process IPC contextBridge, BrowserWindow preload script context isolation, electron-builder packaging NSIS DMG AppImage, auto-updater electron-updater GitHub releases, system Tray application Menu native API, security contextIsolation nodeIntegration sandbox CSP
```

---

## 1. Definición Teórica

Electron es un framework para construir aplicaciones de escritorio multiplataforma usando Chromium como renderizador y Node.js como proceso principal. La arquitectura tiene tres capas: Main Process (Node.js, acceso al sistema), Preload Script (puente seguro entre main y renderer mediante `contextBridge`), y Renderer Process (Chromium, carga la interfaz web). El modelo de seguridad se basa en `contextIsolation: true` (separa el contexto del renderer de Node.js), `nodeIntegration: false` (deshabilita `require()` en el renderer), y `sandbox: true` (restringe aún más el renderer). La comunicación se realiza mediante IPC con `ipcMain.handle()` / `ipcRenderer.invoke()` para request-response, y eventos para one-way notifications.

---

## 2. Implementación de Referencia

Electron 33+ con Vite para el frontend. Seguridad máxima habilitada por defecto. `electron-builder` o Electron Forge para empaquetado. `electron-updater` para actualizaciones automáticas vía GitHub Releases o S3.

### Ejemplo Práctico Avanzado

```javascript
// Main Process
const { app, BrowserWindow, ipcMain, Menu, Tray, dialog, nativeTheme } = require("electron")
const path = require("path")
const fs = require("fs/promises")
const { autoUpdater } = require("electron-updater")

let mainWindow
let tray = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  })
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }

  const menu = Menu.buildFromTemplate([
    { label: "File", submenu: [
      { label: "Open", accelerator: "CmdOrCtrl+O", click: () => openFile() },
      { type: "separator" }, { role: "quit" },
    ]},
    { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }] },
  ])
  Menu.setApplicationMenu(menu)

  tray = new Tray(path.join(__dirname, "assets/trayIcon.png"))
  tray.setToolTip("My Electron App")
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Show", click: () => mainWindow.show() },
    { label: "Quit", click: () => app.quit() },
  ]))
}

app.whenReady().then(() => { createWindow(); autoUpdater.checkForUpdatesAndNotify() })
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit() })
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// IPC handlers
ipcMain.handle("get-config", async () => {
  const configPath = path.join(app.getPath("userData"), "config.json")
  try { return JSON.parse(await fs.readFile(configPath, "utf-8")) } catch { return {} }
})

ipcMain.handle("save-file", async (_event, data) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    filters: [{ name: "JSON", extensions: ["json"] }],
  })
  if (canceled) return { success: false }
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
  return { success: true, path: filePath }
})

// Auto-update
autoUpdater.on("update-available", () => mainWindow.webContents.send("update-progress", "downloading"))
autoUpdater.on("download-progress", (p) => mainWindow.webContents.send("update-progress", p.percent))
autoUpdater.on("update-downloaded", () => {
  dialog.showMessageBox({ type: "info", buttons: ["Restart", "Later"], message: "Update downloaded. Restart?" })
    .then(({ response }) => { if (response === 0) autoUpdater.quitAndInstall() })
})
```

```javascript
// Preload — contextBridge
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveFile: (data) => ipcRenderer.invoke("save-file", data),
  getTheme: () => ipcRenderer.invoke("get-theme"),
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  onUpdateProgress: (callback) => {
    const handler = (_event, progress) => callback(progress)
    ipcRenderer.on("update-progress", handler)
    return () => ipcRenderer.removeListener("update-progress", handler)
  },
})
```

```typescript
// Renderer (React + TypeScript)
declare global {
  interface Window {
    electronAPI: {
      getConfig: () => Promise<Record<string, unknown>>
      saveFile: (data: unknown) => Promise<{ success: boolean; path?: string }>
      getTheme: () => Promise<"light" | "dark">
      minimize: () => void; maximize: () => void; close: () => void
      onUpdateProgress: (cb: (p: number | string) => void) => () => void
    }
  }
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  useEffect(() => { window.electronAPI.getTheme().then(setTheme) }, [])
  return (
    <div className={theme}>
      <h1>Electron + React</h1>
      <button onClick={() => window.electronAPI.minimize()}>_</button>
      <button onClick={() => window.electronAPI.close()}>X</button>
    </div>
  )
}
```

**Fuente oficial:** https://www.electronjs.org/docs/latest

### Alternativa de Implementación Específica

**Tauri** para equipos que priorizan tamaño de bundle pequeño (3-8 MB vs ~150 MB de Electron), rendimiento, y seguridad. Tauri usa Rust como backend y WebView del sistema operativo en lugar de Chromium empaquetado. Ver skill `11-tauri-rust-desktop`.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Apps de escritorio que necesitan acceso completo a APIs nativas; equipos con experiencia en web/Node.js |
| **Cuándo evitar** | Apps simples que podrían ser PWAs; proyectos donde el tamaño del bundle (~150 MB) es crítico; equipos dispuestos a aprender Rust (Tauri) |
| **Alternativas** | Tauri (Rust, 3-8 MB, más seguro); Flutter Desktop (Dart); Wails (Go, ligero); PWA (sin instalación) |
| **Coste/Complejidad** | Alto — arquitectura main/preload/renderer requiere disciplina de seguridad. Bundle grande (~150 MB). Actualizaciones de Chromium requieren rebuilds frecuentes. DX buena con Vite + HMR |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: `require is not defined` en el renderer

**¿Qué ocasionó el error?**
Intentar usar `require()` en el renderer con `nodeIntegration: false` (valor seguro por defecto).

**¿Cómo se solucionó?**
Usar `contextBridge` en el preload script para exponer funciones específicas:

```javascript
// En preload.js
contextBridge.exposeInMainWorld("api", {
  readFile: (path) => ipcRenderer.invoke("read-file", path),
})
// No usar require() en renderer — no está disponible
```

**¿Por qué funciona esta técnica?**
`contextIsolation: true` + `nodeIntegration: false` impiden acceso a Node.js desde el renderer. El preload corre en un contexto privilegiado y expone solo funciones necesarias.

### Caso: La app no se actualiza automáticamente

**¿Qué ocasionó el error?**
`electron-updater` no detecta nuevas versiones porque el feedURL no está configurado o GitHub Releases no está versionado correctamente.

**¿Cómo se solucionó?**
Configurar `electron-updater` con GitHub Releases y versionado semántico:

```yaml
# electron-builder.yml
publish:
  provider: github
  owner: my-org
  repo: my-app
```

```javascript
autoUpdater.setFeedURL({ provider: "github", repo: "my-app", owner: "my-org" })
```

**¿Por qué funciona esta técnica?**
`electron-updater` compara `app.getVersion()` con la latest release de GitHub. Si el tag semver es mayor, descarga el actualizador.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~950 tokens estimados al invocar este skill
- **Trigger de activación:** "electron", "desktop app", "electron-builder", "cross-platform desktop" en la consulta
- **Prioridad de carga:** Media — Electron es el estándar para apps desktop con web tech
- **Dependencias:** `07-01-react-ui-development`, `07-04-typescript-type-system`

### Tool Integration

```json
{
  "tool_name": "electron-desktop-apps",
  "description": "Guía de Electron: main process, preload, IPC, seguridad, auto-update, empaquetado",
  "triggers": ["electron", "desktop", "cross-platform", "electron-builder", "auto-update"],
  "context_hint": "Inyectar sección 2 para ejemplos de main, preload y renderer. FAQ para problemas de seguridad y actualizaciones.",
  "output_format": "markdown",
  "max_tokens": 2700
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre aplicaciones de escritorio con Electron, carga el skill electron-desktop-apps.
Mantén contextIsolation: true, nodeIntegration: false, sandbox: true como valores por defecto.
Usa contextBridge en preload para exponer APIs.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear proyecto con Electron + Vite
npm create @electron-vite@latest my-app

# Desarrollo
npm run dev

# Build
npm run build

# Empaquetar
npx electron-builder --win --mac --linux
npx electron-builder --config electron-builder.yml

# Inspeccionar main process
node --inspect-brk dist/main/index.js

# Ver tamaño del bundle
du -sh dist/*.exe dist/*.dmg dist/*.AppImage
```

### GUI / Web

- **Electron DevTools:** `mainWindow.webContents.openDevTools()` abre Chrome DevTools en el renderer
- **VS Code:** Debugger integrado para main process con breakpoints. Lanzar con "Electron: All" config
- **electron-inspector:** `--inspect-brk` para debuggear main process con Chrome DevTools
- **Figma/Inspector de layout:** Herramientas nativas de cada SO para inspeccionar ventanas Electron

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Abrir DevTools | `--devtools` flag | `F12` / `Cmd+Alt+I` (en dev) |
| Recargar ventana | — | `Cmd+R` / `Ctrl+R` |
| Hard reload | — | `Cmd+Shift+R` / `Ctrl+Shift+R` |
| Abrir menú debug | `--debug` flag | `Alt+D` |

---

## 7. Cheatsheet Rápido

```javascript
// Main
const { app, BrowserWindow } = require("electron")
app.whenReady().then(() => new BrowserWindow({
  webPreferences: { preload: "preload.js", contextIsolation: true, nodeIntegration: false }
}).loadURL("http://localhost:5173"))

// Preload
const { contextBridge, ipcRenderer } = require("electron")
contextBridge.exposeInMainWorld("api", { getData: () => ipcRenderer.invoke("get-data") })

// Renderer
window.api.getData().then(console.log)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-11-tauri-rust-desktop` | Alternativa | No |
| `07-01-react-ui-development` | Complementario | Sí |
| `07-04-typescript-type-system` | Complementario | Sí |
| `07-12-rest-api-integration-client` | Complementario | No |

---

## 9. Metadatos del Skill

```yaml
---
id: electron-desktop-apps
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/electron
tags: [electron, desktop, cross-platform, nodejs, chromiutm, frontend]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
