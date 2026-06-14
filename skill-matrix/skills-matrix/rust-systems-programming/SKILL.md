---
name: rust-systems-programming
description: "Rust resuelve la seguridad de memoria sin garbage collector mediante un sistema de ownership/borrowing verificado en tiempo de compilación, permitiendo programación de sistemas con la productividad..."
---
# Rust Systems Programming

## Semantic Triggers
```
Rust cargo Tokio async runtime, axum web server Tower middleware, serde serialization derive macros, clap CLI argument parser derive, thiserror anyhow error handling, sqlx compile-time checked queries
```

---

## 1. Definición Teórica

Rust resuelve la seguridad de memoria sin garbage collector mediante un sistema de ownership/borrowing verificado en tiempo de compilación, permitiendo programación de sistemas con la productividad de lenguajes modernos y el control del hardware de C/C++. El principio fundamental es que el borrow checker garantiza que toda referencia es válida (no hay null pointer dereference, use-after-free, o data races) mediante reglas de ownership (único propietario) y borrowing (múltiples referencias inmutables XOR una mutable). Arquitectónicamente, el ecosistema Rust proporciona Tokio (async runtime), Axum (framework web con Tower middleware), serde (serialización), clap (CLI), y sqlx (queries comprobadas en compile-time), permitiendo construir desde drivers de kernel hasta servicios web con el mismo lenguaje.

---

## 2. Implementación de Referencia

Rust edition 2024. Toolchain: cargo, clippy, rustfmt. Runtimes: Tokio (async), Axum (HTTP). Idiomas: Rust (nativo), FFI con C/C++.

### Ejemplo Práctico Avanzado

```rust
use axum::{
    Router, extract::{Path, State}, response::Json,
    routing::get, middleware,
};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use sqlx::PgPool;
use tower_http::trace::TraceLayer;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
struct User {
    id: i64,
    name: String,
    email: String,
}

#[derive(Serialize)]
struct AppError {
    message: String,
}

// App state compartido
struct AppState {
    db: PgPool,
}

// Handler con extracción de path y estado
async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, name, email FROM users WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError {
        message: format!("User not found: {}", e),
    })?;

    Ok(Json(user))
}

// Middleware de logging
async fn log_middleware<B>(
    req: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> axum::response::Response {
    tracing::info!("Request: {} {}", req.method(), req.uri());
    let response = next.run(req).await;
    tracing::info!("Response: {}", response.status());
    response
}

#[tokio::main]
async fn main() {
    // Inicializar tracing
    tracing_subscriber::fmt::init();

    // Pool de conexiones (compile-time checked queries)
    let pool = PgPool::connect("postgres://localhost/mydb").await.unwrap();

    let state = Arc::new(AppState { db: pool });

    let app = Router::new()
        .route("/users/:id", get(get_user))
        .layer(middleware::from_fn(log_middleware))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = "[::]:3000";
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

**Fuente oficial:** https://tokio.rs/ — https://docs.rs/axum/

### Alternativa de Implementación Específica

**thiserror + anyhow para manejo de errores idiomático:**

```rust
use thiserror::Error;
use anyhow::{Context, Result};

#[derive(Error, Debug)]
pub enum DbError {
    #[error("User {0} not found")]
    NotFound(i64),
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}

fn process_user(id: i64) -> Result<User> {
    let user = fetch_user(id)
        .context(format!("Failed to fetch user {}", id))?;
    Ok(user)
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Infraestructura de red, microservicios críticos, herramientas CLI, procesamiento de datos, sistemas donde la seguridad de memoria es prioritaria (blockchain, wallets, networking) |
| **Cuándo evitar** | Prototipado extremadamente rápido (curva de borrow checker), sistemas con dependencias legacy C++ difíciles de envolver, equipos sin experiencia en Rust (curva de aprendizaje de 2-4 meses) |
| **Alternativas** | Go (GC, compilación rápida, menos control de memoria), C++20 (RAII + smart pointers, madurez de ecosistema), Zig (simplicidad, compilación cruzada nativa), OCaml (funcional con tipado fuerte, GC) |
| **Coste/Complejidad** | Medio: el borrow checker tiene curva de aprendizaje pero las reglas son consistentes. El ecosistema (cargo, clippy) reduce la fricción. La compilación es lenta (~2-5x C++). Async Rust requiere entender `Future` y `Pin` |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: "cannot borrow `x` as mutable more than once"

**¿Qué ocasionó el error?**
Se intentó pasar la misma variable mutable a dos funciones que la modifican. El borrow checker rechaza porque viola la regla XOR (exclusive OR) de referencias mutables.

**¿Cómo se solucionó?**
Reestructurar para pasar referencias en secuencia o usar `RefCell` para borrow checking en runtime:

```rust
// ❌ Error: dos borrows mutables
let mut data = vec![1, 2, 3];
let r1 = &mut data;
let r2 = &mut data;  // error!

// ✅ Secuencial: el primer borrow termina antes del segundo
let r1 = &mut data;
r1.push(4);
// r1 se deja de usar aquí
let r2 = &mut data;
r2.push(5);

// ✅ O usar split borrow
let (left, right) = data.split_at_mut(2);
process(left);
process(right);  // OK: son slices disjuntos
```

**¿Por qué funciona esta técnica?**
El borrow checker usa NLL (Non-Lexical Lifetimes): el primer borrow mutable termina cuando se deja de usar `r1`, no al final del ámbito léxico. `split_at_mut` demuestra al compilador que los dos borrows mutables son disjuntos en memoria.

### Caso: async fn con lifetime no trivial

**¿Qué ocasionó el error?**
Una función async tomaba una referencia con lifetime no `'static` pero se pasaba a un `tokio::spawn`, que requiere `'static`.

**¿Cómo se solucionó?**
Usar `tokio::task::LocalSet` o clonar el dato:

```rust
// ❌ Error: lifetime puede no ser 'static
async fn process(data: &Vec<u8>) {
    tokio::spawn(async move {
        println!("{:?}", data);  // error!
    }).await;
}

// ✅ Solución: clonar para el spawn
async fn process(data: &Vec<u8>) {
    let data = data.clone();
    tokio::spawn(async move {
        println!("{:?}", data);
    }).await;
}

// ✅ O usar Arc
let shared = Arc::new(data);
tokio::spawn({
    let shared = shared.clone();
    async move { println!("{:?}", shared); }
});
```

**¿Por qué funciona esta técnica?**
`tokio::spawn` requiere que el futuro sea `'static` porque puede ejecutarse después de que la función que lo creó termine. Clonar o usar `Arc` garantiza que los datos vivan independientemente del ámbito original.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~200 tokens estimados al invocar este skill
- **Trigger de activación:** `Rust cargo Tokio async runtime`
- **Prioridad de carga:** Alta — Rust es fundamental para sistemas modernos
- **Dependencias:** `03-memory-raii-borrowing` (borrow checker), `09-ast-manipulation` (rust-analyzer)

### Tool Integration

```json
{
  "tool_name": "rust-systems-programming",
  "description": "Desarrollo de sistemas con Rust: Tokio, Axum, serde, clap, sqlx y borrow checker",
  "triggers": ["Rust", "Tokio", "Axum", "Cargo", "async", "borrow checker", "serde", "sqlx"],
  "context_hint": "Inyectar ejemplo de Axum web server con sqlx y Tower middleware",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre Rust o programación de sistemas con Rust, carga el skill
rust-systems-programming. Proporciona ejemplos de Axum con Tokio, error handling idiomático
(thiserror/anyhow), y cómo resolver problemas comunes del borrow checker.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Crear nuevo proyecto
cargo new myapp
cd myapp

# Compilar y ejecutar
cargo run         # debug
cargo run --release  # release optimizado

# Linting
cargo clippy -- -D warnings

# Tests
cargo test
cargo test -- --nocapture

# Benchmarks
cargo bench

# Profiling
cargo flamegraph
```

### GUI / Web

- **Rust Analyzer** (VSCode): IDE con completado, diagnósticos, refactoring
- **cargo-edit**: gestión de dependencias desde CLI (`cargo add serde`)
- **docs.rs**: documentación online de crates
- **crates.io**: registro de paquetes

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Compilar | `cargo build` | `Ctrl+Shift+B (VSCode)` |
| Test | `cargo test` | `Ctrl+Shift+P → Rust Analyzer: Test` |
| Clippy | `cargo clippy -- -D warnings` | `Rust Analyzer → diagnostics inline` |

---

## 7. Cheatsheet Rápido

```rust
// Rust essentials — 12 líneas
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let resp = client.get("https://api.example.com").send().await?;
    let body = resp.text().await?;
    println!("{}", body);
    Ok(())
}
// cargo add reqwest tokio --features tokio/full
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `03-memory-raii-borrowing` | dependiente — borrow checker y ownership | Sí |
| `22-webassembly-runtimes-sandboxing` | dependiente — Rust como target Wasm | Sí |
| `29-cpp-memory-safety` | alternativo — C++ vs Rust memory safety | No |
| `30-go-systems-production` | alternativo — Rust vs Go para microservicios | No |

---

## 9. Metadatos del Skill

```yaml
---
id: rust-systems-programming
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/27-rust-systems-programming
tags: [Rust, Tokio, Axum, serde, clap, cargo, async, borrow-checker, sqlx]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
