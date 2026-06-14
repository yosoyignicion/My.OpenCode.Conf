---
name: playwright-e2e-testing
description: "Playwright es un framework de automatización de navegadores creado por Microsoft que soporta Chromium, Firefox y WebKit con una sola API unificada"
---
# Playwright E2E Testing

## Semantic Triggers
```
Playwright E2E testing page objects fixtures, getByRole getByTestId getByText selectors, trace viewer screenshot visual regression, API mocking route intercept, authentication state storageState, CI configuration sharding retries
```

---

## 1. Definición Teórica

Playwright es un framework de automatización de navegadores creado por Microsoft que soporta Chromium, Firefox y WebKit con una sola API unificada. A diferencia de Cypress (que corre en el mismo bucle del navegador), Playwright opera en modo remoto mediante el protocolo CDP (Chrome DevTools Protocol) y WebDriver BiDi, lo que permite simular dispositivos reales, interceptar red a nivel de sistema, y ejecutar tests en contextos aislados. El patrón Page Object encapsula la lógica de interacción con cada página, y las fixtures de `test.extend()` proporcionan setup compartido (auth, base de datos, estado). Los traces en primera repetición (`trace: "on-first-retry"`) son la herramienta principal para depurar fallos intermitentes.

---

## 2. Implementación de Referencia

Playwright con TypeScript. Configuración en `playwright.config.ts` con `baseURL`, `trace: "on-first-retry"`, y `projects` para múltiples navegadores. Page Object pattern para tests mantenibles.

### Ejemplo Práctico Avanzado

```typescript
import { test, expect, Page } from "./fixtures"

// Page object pattern
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login")
  }

  async login(email: string, password: string) {
    await this.page.getByTestId("email").fill(email)
    await this.page.getByTestId("password").fill(password)
    await this.page.getByTestId("submit").click()
  }

  get errorMessage() {
    return this.page.getByTestId("error")
  }

  get emailInput() {
    return this.page.getByLabel("Email")
  }
}

// Test suite
test.describe("Authentication", () => {
  test("successful login redirects to dashboard", async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login("user@example.com", "password123")
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText("Welcome, user!")).toBeVisible()
  })

  test("shows error on invalid credentials", async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login("bad@email.com", "wrong")
    await expect(login.errorMessage).toBeVisible()
    await expect(login.errorMessage).toHaveText("Invalid credentials")
  })

  test("validates email format", async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login("invalid-email", "password123")
    await expect(login.errorMessage).toContainText("valid email")
  })
})
```

```typescript
// Fixtures — test.extend()
import { test as base, expect, Page } from "@playwright/test"

type MyFixtures = {
  authenticatedPage: Page
  db: { getUser: (id: string) => Promise<User> }
}

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "auth.json" })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },

  db: async ({}, use) => {
    const db = new Database()
    await db.connect()
    await use(db)
    await db.disconnect()
  },
})

// Usage
test("user can edit profile", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/profile")
  await authenticatedPage.getByTestId("edit").click()
  await expect(authenticatedPage).toHaveURL(/\/profile\/edit/)
})
```

```typescript
// API mocking
test("shows empty state when no posts", async ({ page }) => {
  await page.route("**/api/posts**", async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.goto("/posts")
  await expect(page.getByText("No posts yet")).toBeVisible()
})

// Visual regression
test("homepage matches snapshot", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveScreenshot("homepage.png", {
    maxDiffPixelRatio: 0.01,
    fullPage: true,
  })
})
```

**Fuente oficial:** https://playwright.dev/docs/intro

### Alternativa de Implementación Específica

**Cypress** para equipos que prefieren un enfoque todo-en-uno con dashboard integrado y time-travel debugging. Cypress corre en el mismo bucle de eventos que la app, lo que permite interceptar y hacer stub de funciones JavaScript directamente. Ideal para proyectos pequeños/medianos.

```typescript
describe("Login", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/login", { fixture: "login.json" })
    cy.visit("/login")
  })

  it("shows error on invalid credentials", () => {
    cy.get('[data-testid="email"]').type("bad@email.com")
    cy.get('[data-testid="password"]').type("wrong")
    cy.get('[data-testid="submit"]').click()
    cy.get('[data-testid="error"]').should("be.visible")
      .and("contain", "Invalid credentials")
  })
})
```

**Fuente oficial:** https://docs.cypress.io/guides/end-to-end-testing/writing-your-first-end-to-end-test

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | E2E testing crítico para el negocio; formularios multi-paso; flujos de autenticación; regresión visual |
| **Cuándo evitar** | Tests unitarios o de integración (usa Vitest/Jest); componentes aislados (usa Testing Library); páginas puramente estáticas (cobertura de Lighthouse es suficiente) |
| **Alternativas** | Cypress (mejor DX, peor cross-browser); Selenium (legacy, lento); Playwright es el estándar moderno |
| **Coste/Complejidad** | Medio — la configuración inicial es simple, pero los tests E2E son frágiles por naturaleza. Las traces y retries ayudan a mitigar. El mantenimiento crece linealmente con el número de flujos |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Test falla intermitentemente por "element not found"

**¿Qué ocasionó el error?**
Un selector que espera que el elemento exista inmediatamente, pero el elemento se renderiza después de una petición asíncrona o animación.

**¿Cómo se solucionó?**
Usar `getByRole` / `getByText` con auto-espera o añadir `waitFor` explícito:

```typescript
// ✅ Playwright auto-espera hasta que el elemento es visible
await page.getByRole("button", { name: "Submit" }).click()

// ✅ Si el elemento aparece después de una animación
await page.getByText("Loading complete").waitFor({ state: "visible" })

// ❌ No usar selectores CSS sin auto-espera
// await page.locator(".submit-btn").click() // frágil
```

**¿Por qué funciona esta técnica?**
Playwright espera automáticamente hasta que el elemento sea `actionable` (visible, enabled, stable) antes de interactuar. Los selectores por rol y texto son más robustos que CSS porque no dependen de clases o estructura DOM.

### Caso: Screenshot visual diff falla por antialiasing en diferentes SO

**¿Qué ocasionó el error?**
El renderizado de fuentes y antialiasing varía entre macOS, Linux y Windows, causando diferencias de 1-2 píxeles.

**¿Cómo se solucionó?**
Aumentar `maxDiffPixelRatio` y usar Docker para entornos consistentes:

```typescript
test("homepage matches", async ({ page }) => {
  await expect(page).toHaveScreenshot({
    maxDiffPixels: 100,
    maxDiffPixelRatio: 0.02,
    threshold: 0.2, // sensibilidad de comparación de píxeles
  })
})

// playwrigh.config.ts
// workers: process.env.CI ? 2 : undefined
// use: { viewport: { width: 1280, height: 720 } }
```

**¿Por qué funciona esta técnica?**
Ejecutar visual regression en CI con Docker usando la imagen `mcr.microsoft.com/playwright:v1.52.0` elimina las diferencias de SO. `maxDiffPixelRatio` tolera pequeñas variaciones inevitables.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~850 tokens estimados al invocar este skill
- **Trigger de activación:** "playwright", "e2e", "test", "automation", "browser test" en la consulta
- **Prioridad de carga:** Alta — testing E2E es crítico para calidad
- **Dependencias:** `07-04-typescript-type-system`, `07-06-a11y-accessibility-wcag` (para testing de accesibilidad)

### Tool Integration

```json
{
  "tool_name": "playwright-e2e-testing",
  "description": "Guía de Playwright E2E: page objects, fixtures, selectores, API mocking, visual regression, CI/CD",
  "triggers": ["playwright", "e2e", "test", "browser automation", "visual regression"],
  "context_hint": "Inyectar sección 2 (Implementación) para ejemplos de page objects y fixtures. FAQ para tests flaky.",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre testing E2E, carga el skill playwright-e2e-testing.
Usa page object pattern por defecto. Recomienda trace: "on-first-retry"
y selectores getByRole/getByTestId.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Instalar
npm init playwright@latest

# Ejecutar tests
npx playwright test

# Modo UI interactivo
npx playwright test --ui

# Ver reporte HTML
npx playwright show-report

# Ver trace
npx playwright show-trace trace.zip

# Sharding CI
npx playwright test --shard=1/3
npx playwright test --shard=2/3
npx playwright test --shard=3/3

# Debug
npx playwright test --debug
PWDEBUG=1 npx playwright test
```

### GUI / Web

- **Playwright UI Mode:** `npx playwright test --ui` abre un panel interactivo con timeline, snapshot explorer, y action log
- **Trace Viewer:** `npx playwright show-trace` — explora cada acción: DOM antes/después, network, console, y tiempo
- **Playwright Codegen:** `npx playwright codegen` — graba interacciones y genera código de test automáticamente
- **VS Code extension:** Test explorer integrado, run/debug tests, ver traces y snapshots dentro del editor

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Run all tests | `npx playwright test` | VS Code Test Explorer → Run |
| Run single test | `npx playwright test -g "test name"` | Click ▶ junto al test |
| Debug mode | `PWDEBUG=1 npx playwright test` | UI Mode → Step through |
| Abrir trace | `npx playwright show-trace <file>` | UI Mode → Trace tab |

---

## 7. Cheatsheet Rápido

```typescript
// Selectors (por orden de preferencia)
page.getByRole("button", { name: "Submit" })
page.getByLabel("Email")
page.getByPlaceholder("Enter name")
page.getByTestId("submit-button")
page.getByText("Welcome")
page.locator("[data-testid='x']") // último recurso

// Assertions
await expect(page).toHaveURL("/dashboard")
await expect(locator).toBeVisible()
await expect(locator).toHaveText("Hello")
await expect(locator).toHaveValue("test@email.com")
await expect(page).toHaveScreenshot()

// Fixtures
const test = base.extend({ fixture: async ({}, use) => { await use(value) } })
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `07-06-a11y-accessibility-wcag` | Complementario | Sí |
| `07-01-react-ui-development` | Complementario | No |
| `07-04-typescript-type-system` | Complementario | Sí |
| `07-05-state-management-frontend` | Independiente | No |

---

## 9. Metadatos del Skill

```yaml
---
id: playwright-e2e-testing
domain: 07-frontend-web-fullstack
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/opencode-bak-skills/playwright
tags: [playwright, e2e, testing, browser-automation, frontend]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
