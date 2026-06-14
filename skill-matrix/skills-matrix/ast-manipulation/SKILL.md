---
name: ast-manipulation
description: "La manipulación de AST (Abstract Syntax Tree) resuelve el problema de analizar y transformar código fuente a nivel estructural sin depender de regex o parsing superficial, operando directamente sob..."
---
# AST Manipulation

## Semantic Triggers
```
abstract syntax tree traversal, clang LibTooling AST matchers, tree-sitter query pattern matching, AST transformation refactoring, source-to-source compilation, syntactic analysis parsing
```

---

## 1. Definición Teórica

La manipulación de AST (Abstract Syntax Tree) resuelve el problema de analizar y transformar código fuente a nivel estructural sin depender de regex o parsing superficial, operando directamente sobre la representación sintáctica que el compilador/parser produce. El principio fundamental es que el AST preserva la jerarquía gramatical del código, permitiendo queries y transformaciones que respetan la semántica del lenguaje. Arquitectónicamente, las herramientas de manipulación de AST se ubican entre el parser y el generador de código: reciben el árbol sintáctico, aplican patrones de matching/rewriting, y producen código transformado. Existen como capa diferenciada porque las herramientas de texto plano (sed, regex) no pueden distinguir contextos anidados, tipos de nodos, o relaciones sintácticas.

---

## 2. Implementación de Referencia

Clang LibTooling ≥18 con AST Matchers para C/C++. Tree-sitter ≥0.24 con queries S-expression para múltiples lenguajes. Idiomas: C++ (LibTooling), Rust/C/JavaScript/... (Tree-sitter).

### Ejemplo Práctico Avanzado

```cpp
// AST Matcher para encontrar todas las llamadas a malloc y reemplazarlas
#include "clang/Tooling/CommonOptionsParser.h"
#include "clang/Tooling/Tooling.h"
#include "clang/ASTMatchers/ASTMatchers.h"
#include "clang/ASTMatchers/ASTMatchFinder.h"
#include "clang/AST/ASTContext.h"
#include "clang/Rewrite/Core/Rewriter.h"

using namespace clang;
using namespace clang::ast_matchers;
using namespace clang::tooling;

class MallocCallback : public MatchFinder::MatchCallback {
    Rewriter &TheRewriter;
public:
    MallocCallback(Rewriter &R) : TheRewriter(R) {}

    void run(const MatchFinder::MatchResult &Result) override {
        const auto *Call = Result.Nodes.getNodeAs<CallExpr>("mallocCall");
        if (!Call) return;

        // Obtener el argumento (size)
        const Expr *Arg = Call->getArg(0);
        SourceRange Range(Call->getBeginLoc(), Call->getEndLoc());

        if (Result.SourceManager->isInMainFile(Call->getBeginLoc())) {
            std::string Replacement = "new unsigned char[" +
                TheRewriter.getRewrittenText(Arg->getSourceRange()) + "]";
            TheRewriter.ReplaceText(Range, Replacement);
        }
    }
};

int main(int argc, const char **argv) {
    auto ExpectedParser = CommonOptionsParser::create(argc, argv, llvm::cl::GeneralCategory);
    ClangTool Tool(ExpectedParser->getCompilations(),
                   ExpectedParser->getSourcePathList());
    Rewriter TheRewriter;
    MallocCallback Callback(TheRewriter);
    MatchFinder Finder;

    // Matcher: llamadas a malloc con 1 argumento
    Finder.addMatcher(
        callExpr(callee(functionDecl(hasName("malloc"))),
                 argumentCountIs(1)).bind("mallocCall"),
        &Callback);

    Tool.run(newFrontendActionFactory(&Finder).get());
    TheRewriter.getEditBuffer(TheRewriter.getSourceMgr().getMainFileID())
        .write(llvm::outs());
    return 0;
}
```

**Fuente oficial:** https://clang.llvm.org/docs/LibTooling.html — AST Matchers Reference

### Alternativa de Implementación Específica

**Tree-sitter** para lenguajes modernos con queries S-expression:

```javascript
// tree-sitter query pattern para encontrar funciones en JavaScript
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

const parser = new Parser();
parser.setLanguage(JavaScript);

const sourceCode = `
function greet(name) {
  return "Hello, " + name;
}
`;

const tree = parser.parse(sourceCode);
const query = new Query(
    JavaScript,
    `
    (function_declaration
      name: (identifier) @func_name
      parameters: (formal_parameters
        (identifier) @param)
      body: (statement_block) @body) @function
    `
);

const matches = query.matches(tree.rootNode);
for (const match of matches) {
    console.log('Function:', match.captures[0].node.text);
    console.log('Param:', match.captures[1].node.text);
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Refactoring automático de código, migración de APIs, linting avanzado, code generation, análisis de seguridad, tooling de compilador |
| **Cuándo evitar** | Búsqueda simple de texto (regex basta), conteo de líneas, operaciones de formateo (clang-format/prettier), análisis que requiera semántica de ejecución (necesita análisis de flujo de datos) |
| **Alternativas** | regex (rápido, inexacto para estructuras anidadas), libclang Python bindings (API de alto nivel), `coccinelle` (semantic patch language), `rust-analyzer` (AST de Rust con HIR) |
| **Coste/Complejidad** | Alto: requiere entender la gramática del lenguaje objetivo. Clang LibTooling tiene dependencia pesada (LLVM entero). Tree-sitter es más ligero pero tiene menos poder expresivo |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: MatchFinder no encuentra ningún match con matcher simple

**¿Qué ocasionó el error?**
El matcher buscaba `callExpr(callee(functionDecl(hasName("printf"))))` pero el archivo fuente no incluía `<stdio.h>` o la función se llamaba mediante puntero (`fp = printf; fp("hello")`), no directamente.

**¿Cómo se solucionó?**
Agregar un matcher que también capture llamadas indirectas y call expressions en macro-instantiated code:

```cpp
Finder.addMatcher(
    callExpr(
        anyOf(
            callee(functionDecl(hasName("printf"))),
            callee(declRefExpr(to(functionDecl(hasName("printf")))))
        )
    ).bind("printCall"),
    &Callback
);
```

**¿Por qué funciona esta técnica?**
`callee()` en el AST matcher solo coincide con llamadas directas. Para funciones llamadas por puntero, el callee es un `DeclRefExpr` que referencia la función, y el AST lo trata como un `ImplicitCastExpr` (function-to-pointer decay). `anyOf()` permite capturar ambos casos.

### Caso: Tree-sitter query no coincide con expresiones multilínea

**¿Qué ocasionó el error?**
La query `(binary_expression ...)` no encontraba operaciones aritméticas que cruzaban múltiples líneas porque el query S-expression esperaba que los operandos estuvieran en la misma línea si se usaban field names como `operator:` sin node types explícitos.

**¿Cómo se solucionó?**
Usar anonymous nodes para capturar el operador y field names correctos:

```javascript
const query = new Query(JavaScript, `
    (binary_expression
        left: (_) @left
        right: (_) @right
        operator: _ @op)  // anonymous node para el operador
`);
```

**¿Por qué funciona esta técnica?**
Tree-sitter trata operadores como anonymous nodes (no tienen nombre de nodo en el AST). Usar `(_)` para anonymous nodes captura cualquier tipo de operador. Los field names `left:` y `right:` son posicionales y funcionan independientemente de saltos de línea.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~180 tokens estimados al invocar este skill
- **Trigger de activación:** `abstract syntax tree traversal`
- **Prioridad de carga:** Media — herramienta especializada para refactoring automático
- **Dependencias:** `26-modern-cpp-development` (para LibTooling), `14-compilation-linking-loader` (comprensión del pipeline de compilación)

### Tool Integration

```json
{
  "tool_name": "ast-manipulation",
  "description": "Análisis y transformación de código fuente mediante AST con Clang LibTooling y Tree-sitter",
  "triggers": ["AST", "LibTooling", "Tree-sitter", "refactoring", "source transformation", "clang-query"],
  "context_hint": "Inyectar ejemplo de AST matcher o tree-sitter query según el lenguaje del usuario",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre manipulación de AST o refactoring automático, carga el skill
ast-manipulation. Usa Clang LibTooling para C++ y Tree-sitter para otros lenguajes.
Proporciona un ejemplo de matcher + rewriter.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Clang-query: consola interactiva de AST Matchers
clang-query test.cpp --
clang-query> match callExpr(callee(functionDecl(hasName("malloc"))))

# Tree-sitter CLI
tree-sitter generate  # generar parser para gramática
tree-sitter test      # ejecutar tests
tree-sitter parse myfile.js  # imprimir AST

# clang-check: análisis AST rápido sin tooling completo
clang-check -ast-dump test.cpp --
```

### GUI / Web

- **AST Explorer** (https://astexplorer.net/): visualización interactiva de AST para múltiples lenguajes
- **Clang Power Tools** (VSCode): integración de LibTooling con UI
- **Tree-sitter Playground** (https://tree-sitter.github.io/tree-sitter/playground): testear queries S-expression

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Dump AST de archivo | `clang-check -ast-dump file.cpp --` | `Ctrl+Shift+P → Show AST (Clang)` |
| Query AST interactivo | `clang-query file.cpp --` | `AST Explorer → Query panel` |
| Debug tree-sitter | `tree-sitter parse file.js` | `Tree-sitter Playground` |

---

## 7. Cheatsheet Rápido

```cpp
// AST Matcher básico — 10 líneas
Finder.addMatcher(
    callExpr(
        callee(functionDecl(hasName("foo"))),
        argumentCountIs(2)
    ).bind("fooCall"),
    &Callback
);

// Tree-sitter query — 5 líneas
// (function_definition
//   name: (identifier) @name
//   body: (compound_statement) @body)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `14-compilation-linking-loader` | complementario — pipeline de compilación donde opera el AST | No |
| `26-modern-cpp-development` | dependiente — toolchain CMake para proyectos LibTooling | Sí |
| `15-assembly-inline-optimizations` | complementario — AST → IR → asm | No |
| `08-ingenieria-herramientas/01-bash-scripting-advanced` | dependiente — scripting para pipelines de transformación batch | No |

---

## 9. Metadatos del Skill

```yaml
---
id: ast-manipulation
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [AST, clang, LibTooling, tree-sitter, refactoring, source-analysis, compilation]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
