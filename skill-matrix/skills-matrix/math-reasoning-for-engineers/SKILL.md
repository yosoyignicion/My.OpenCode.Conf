---
name: math-reasoning-for-engineers
description: "Métodos de razonamiento cuantitativo para decisiones de ingeniería: estimación de costo (COCOMO/analógica), análisis de trade-offs multi-criterio (Pareto, scoring ponderado), verificación de claims numéricos, unit economics para proyectos open-source/side-project, y aritmética de incertidumbre (rangos vs puntos). Cubre back-of-envelope calculations, regla de Fermi, breakdown por descomposición aditiva, y distinción entre 'medible' y 'estimable'."
---

# math-reasoning-for-engineers

## Semantic Triggers
```
math reasoning engineering, fermi estimation back of envelope, COCOMO cost model, trade-off analysis pareto weighted scoring, unit economics open source, uncertainty ranges vs point estimates, decision under uncertainty, break-even analysis, sensitivity analysis, time-to-value calculation
```

---

## 1. Definición Teórica

El razonamiento matemático para ingeniería no es "resolver ecuaciones" — es **tomar decisiones con números inciertos sin paralizarte por la imprecisión**. La trampa #1 del ingeniero con matemáticas es confundir precisión con exactitud: puedes tener un número exacto (3.14159) sobre una medición imprecisa (el diámetro real de un círculo que no has medido). El objetivo es **acotar la incertidumbre**, no eliminarla.

Tres principios fundamentales:

1. **Descomposición aditiva** — un problema complejo se descompone en sub-problemas que se suman. `tiempo_total = tiempo_A + tiempo_B + ...`. Esto convierte una estimación opaca en una suma de estimaciones más pequeñas (cada una con menor incertidumbre).
2. **Rangos, no puntos** — `2-4h`, no `3h`. Un rango comunica la incertidumbre honestamente y permite razonar sobre escenarios. La falsa precisión (`3.0h`) miente sobre lo que sabemos.
3. **Verificación de orden de magnitud** — antes de tomar una decisión basada en un número, comprueba que el orden de magnitud sea plausible. Si estimas 50 líneas de código y terminas escribiendo 5000, hay un error de modelo, no de medición.

El contexto donde aplica: **side-projects, decisiones de arquitectura, priorización de features, evaluación de ROI, sizing de基础设施**. NO aplica a: problemas donde los datos son exactos (álgebra computacional, criptografía), ni a problemas donde la matemática es el objetivo (machine learning research, criptoanálisis).

---

## 2. Implementación de Referencia

Framework recomendado: **cálculo mental + spreadsheet ligero** (no Python, no Wolfram). Para decisiones de ingeniería, el coste de escribir código de análisis supera el valor del análisis mismo. Una tabla de 5 filas en markdown es 100× más rápida y suficientemente buena.

### Ejemplo Práctico Avanzado: Estimación de tiempo para un feature

**Problema**: ¿cuánto tardaré en añadir un sistema de compactación automática al plugin engram (mi proyecto)?

**Descomposición (bottom-up)**:

| Tarea | Estimación (rango) | Notas |
|---|---|---|
| Leer `decay.ts` + `commands.ts` para entender el código actual | 30-45 min | Conocimiento existente: 0 |
| Diseñar la API de `engram_compact` (args, output) | 15-30 min | 3 tools ya existen, patrón claro |
| Implementar la lógica de merge (≤50 líneas) | 60-90 min | Bloque pequeño, 1 commit |
| Escribir 3-5 tests edge-case | 30-45 min | Fixture ya existe |
| Verificar (typecheck + test + smoke) | 5-10 min | Red de seguridad verde |
| Commit + push + verificar remoto | 5 min | Mecánico |
| **TOTAL** | **145-225 min** | **~2.5-3.5h** |

**Verificación de orden de magnitud**: 3.5h ≈ media sesión de trabajo profundo. Comparable a commits previos (todos <2h). Plausible.

**Sanity check con analogía**: el commit `bfe8141` (refactor better-sqlite3 → bun:sqlite) tomó ~1.5h. El commit `58fbc15` (test coverage) tomó ~30 min. Una feature nueva + tests debería estar en el rango 2-4h. ✓ consistente.

**Fuente oficial**: Steve McConnell, *Rapid Development* (1996), capítulo 5 "Lies, Damned Lies, and Estimates" — la base de la estimación por descomposición.

### Alternativa de Implementación Específica: COCOMO II

Para proyectos más grandes (≥10 personas-mes), COCOMO II es el estándar. No aplica a side-projects porque el overhead de configurarlo excede el valor.

**Fórmula simplificada** (no la uses en side-projects, pero entiéndela):
```
Esfuerzo (persona-mes) = A × (KLOC)^B × EAF
A = 2.94 (modo orgánico)
B = 1.12 (exponente)
EAF = product de 17 multiplicadores de esfuerzo (entre 0.7 y 1.5 cada uno)
```

KLOC = miles de líneas de código. EAF = Effort Adjustment Factor. Para un proyecto de 5000 LOC con EAF=1.0: ~7 persona-mes. No relevante aquí, pero saber que existe te protege de inventar tu propio modelo.

**Fuente oficial**: Barry Boehm et al., *Software Cost Estimation with COCOMO II* (2000), Prentice Hall.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Estimación de tiempo/costo para features nuevas; priorización de backlog; análisis de impacto de dependencias; sizing de infraestructura; ROI de side-projects |
| **Cuándo evitar** | Problemas con datos exactos (usa math real); modelos predictivos (usa ML); decisiones puramente cualitativas (usa frameworks como DACI/RACIp); cuando el costo de análisis > costo de implementar |
| **Alternativas** | Planning poker (ágil,多人); Monte Carlo simulation (rangos probabilísticos); Delphi method (consenso de expertos); T-shirt sizing (rápido, sin números) |
| **Coste/Complejidad** | Bajo si se hace mentalmente + tabla. Moderado si se introduce una herramienta (spreadsheet, Python notebook). Alto si se sobre-procesa con COCOMO/Monte Carlo para un side-project. |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: ¿Cómo estimo si NO tengo datos históricos?

**Respuesta**: Usa **analogía** (commit previo similar) + **descomposición** (rompe en sub-tareas de <2h cada una). Si no tienes analogía, **estima el triple** y reduce con cada iteración. La primera estimación de algo nuevo es siempre 3-5× la real.

**Anti-patrón**: "No sé cuánto tarda, así que pongo 1 día y veo". Esto sesga hacia abajo sistemáticamente.

### Caso: Mi estimación fue 3h, llevo 6h y no acabo. ¿Qué hago?

**Respuesta**: **Stop, replanifica, no sigas arrastrando**. El coste de continuar sin replanificar > coste de parar. Pasos:
1. ¿El problema es de modelo (entendí mal la complejidad) o de ejecución (impedimentos externos)?
2. Si es de modelo: re-descomponer, estimar el resto con el modelo corregido.
3. Si es de ejecución: documentar el impediment, considerar 削 reshore o simplificar scope.
4. **Nunca** termines el trabajo sin actualizar la estimación — eso envenena la calibración futura.

### Caso: ¿Rango "2-4h" o "punto + incertidumbre" ("3h ± 50%")?

**Respuesta**: **Rango asimétrico** es lo más honesto. "2-4h" dice "el caso optimista es la mitad del pesimista" — eso es lo que la experiencia muestra (la cola derecha es más larga que la izquierda). "3h ± 50%" dice "puedo ser tan optimista como pesimista" — eso es raro en software.

**Regla práctica**: el límite inferior es tu estimación mental de "si todo va perfecto". El superior es "si encuentro 1-2 impedimentos típicos". Si la distancia es <2×, probablemente subestimas. Si es >5×, falta información para decidir.

### Caso: ¿Cómo sé si un claim numérico es creíble?

**Respuesta**: Aplica el **test de plausibilidad**:
1. ¿El número tiene unidades correctas? (velocidad en m/s, no m/s²)
2. ¿El orden de magnitud es plausible? (latencia de API: 10-500ms, no 10s o 0.1ms)
3. ¿Es verificable independientemente? (benchmark oficial, no opinión)
4. ¿La fuente cita cómo lo midió? (medición, no estimación)

Si falla 1+ checks, **no confíes en el claim** hasta verificar.

### Caso: ¿Cuándo vale la pena un análisis más riguroso (Monte Carlo, simulación)?

**Respuesta**: Cuando **la decisión es irreversible y costosa**. Tres señales:
- Decisión >$10k o >2 semanas de implementación
- No se puede revertir fácilmente (arquitectura, contrato, hiring)
- Hay 3+ variables inciertas interactuando

Para side-projects y features <1 semana: **estimación de rango basta**. Monte Carlo es overkill.

---

## 5. Conceptos Clave (Glosario)

- **Estimación bottom-up**: descomponer un trabajo en sub-tareas pequeñas y sumar. Más precisa que top-down pero más costosa de hacer.
- **Estimación top-down**: usar analogía o referencia histórica para estimar el total. Rápida pero menos precisa.
- **Rango asimétrico**: el límite superior está más lejos del central que el inferior. Común en software (la cola de problemas es larga).
- **Descomposición aditiva**: `total = parte_A + parte_B + ...`. Asume que las partes son independientes (a menudo FALSO, pero es la simplificación útil).
- **Punto de ruptura (break-even)**: el valor de X donde 2 alternativas tienen el mismo costo/beneficio. Útil para "comprar vs construir", "DIY vs SaaS", "open-source vs proprietary".
- **Análisis de sensibilidad**: cómo cambia el resultado si una variable cambia. Identifica las variables que más importan.
- **Costo de oportunidad**: lo que dejas de ganar al elegir A en vez de B. NO es el costo de A, es el costo de NO-B.
- **Valor esperado**: `Σ probabilidad_i × outcome_i`. Útil para decisiones bajo incertidumbre con probabilidades conocidas.
- **Orden de magnitud**: factor de 10. 100 vs 1000 es 1 orden de magnitud. La primera sanity check de cualquier estimación.
- **Regla de Fermi**: descompón un problema en partes, estima cada parte con orden de magnitud, multiplica. Aunque cada parte esté mal por 2×, el total está en el orden correcto.

---

## 6. Anti-Patrones (Errores Comunes a Evitar)

- **Falsa precisión**: `3.2h` cuando la incertidumbre real es ±50%. Miente sobre lo que sabes. Usa rangos.
- **Planning fallacy**: estimar el "caso más probable" ignorando distribuciones de riesgo. Sistemáticamente subestimas. Solución: multiplica por 1.5-2× para tener el "caso probable real".
- **Sunk cost en la estimación**: "ya invertí 1h, así que la estimación de 2h todavía aplica". Falso — el tiempo ya gastado es sunk, no afecta el trabajo restante. Re-estima desde cero.
- **Optimización prematura de la estimación**: pasar 2h afinando una estimación que afecta una decisión de 30 min. Mal trade-off. Estima, decide, ajusta después.
- **Estimación sin descomposición**: "esto tardará 2 semanas" sin breakdown. Opaco, no verificable, no se puede re-estimar incrementalmente.
- **Comparar peras con manzanas**: estimar el coste de "implementar feature X" igual que "investigar feature X". Son actividades diferentes.
- **Ignorar variabilidad del equipo**: el mismo feature lo hace un junior en 8h y un senior en 2h. La estimación debe considerar QUIÉN lo hace, no solo QUÉ.
- **Anclar a la primera estimación**: "dije 2h" → "llevo 1.5h, ya casi" → en realidad quedan 2h más. Las estimaciones iniciales se anclan. Re-estima cuando los datos lo justifiquen.
- **Sumar rangos incorrectamente**: si A es 1-2h y B es 2-4h, el total NO es 3-6h (suma de puntos centrales). Es 3-6h pero también 1-6h según correlación. Si A y B son independientes, suma los rangos. Si están correlacionados (mismo riesgo), usa el rango más ancho.

---

## 7. Lista de Verificación Pre-Decisión

Antes de tomar una decisión basada en números, verifica:

- [ ] **Unidades**: ¿el número tiene las unidades correctas? (bytes vs bits, ms vs s, MB vs MiB)
- [ ] **Orden de magnitud**: ¿está dentro del rango plausible? (latencia API: 10-500ms)
- [ ] **Fuente**: ¿de dónde viene? (medición, estimación, opinión)
- [ ] **Rango vs punto**: ¿estás tratando un punto como si fuera exacto?
- [ ] **Independencia**: si sumas rangos, ¿las partes son independientes?
- [ ] **Reversibilidad**: ¿cuánto cuesta revertir esta decisión?
- [ ] **Sesgo de optimismo**: ¿has multiplicado por 1.5-2× para el "caso probable real"?
- [ ] **Sensibilidad**: ¿qué variable, si cambia 2×, cambia la decisión?
- [ ] **Alternativa cero**: ¿has considerado NO hacer nada? (a veces la mejor decisión es no-decisión)
- [ ] **Documentación**: ¿has escrito la estimación + razonamiento? (para calibrar futuras estimaciones)

---

## 8. Ejemplo Completo de Decisión Bajo Incertidumbre

**Contexto**: Quiero decidir si dedicar 1 sesión a implementar GitHub Pages para exportar memories de engram.

**Variables**:
- Tiempo de implementación: 1-2h (descomposición: workflow YAML 30min, README update 15min, verificar 15min)
- Beneficio: ? (look pro, recruiting visibility, motivación personal)
- Coste de oportunidad: ? (qué dejo de hacer)
- Reversibilidad: alta (puedo borrar el workflow)

**Análisis**:
- Tiempo ≤2h, dentro del "presupuesto de sesión corta"
- Beneficio: cualitativo pero alto para el objetivo declarado ("look pro")
- Coste de oportunidad: bajo (no es un día laboral)
- Reversibilidad: alta

**Punto de sensibilidad**: si el beneficio fuera 0, ¿haría la sesión? No. Luego el beneficio es la variable clave, no el tiempo.

**Decisión**: PROCEDER. Beneficio cualitativo pero declarado como prioritario, coste bajo, reversible.

**Registro**: engram_save tipo=architecture, importance=0.7, scope=project con el racional.

**Re-evaluación**: tras implementar, ¿el tiempo real estuvo en el rango? Si no, recalibrar.

---

## 9. Referencias y Fuentes

**Libros**:
- Steve McConnell, *Rapid Development* (1996) — cap. 5 sobre estimaciones
- Barry Boehm et al., *Software Cost Estimation with COCOMO II* (2000)
- Douglas Hofstadter, *Metamagical Themas* (1985) — ensayo sobre估算 de Fermi
- Daniel Kahneman, *Thinking, Fast and Slow* (2011) — planning fallacy, sesgos

**Papers / Artículos**:
- Standish Group, *CHAOS Report* (1994-2016) — datos sobre por qué las estimaciones de software fallan
- Frederick P. Brooks Jr., *The Mythical Man-Month* (1975) — esencial para dimensionar proyectos

**Herramientas** (de menor a mayor coste):
- Tabla en markdown (5 min para 5 filas)
- Spreadsheet (Google Sheets) con formulas (15 min)
- Python notebook (overkill para side-projects)
- COCOMO II plugin (enterprise, ignorarlo para proyectos <1 año)
- Monte Carlo simulation (solo decisiones >$10k)

**Aplicabilidad al repo**: usar este skill para estimar tiempos de features en `engram+zerotoken`, `second-termux-v2`, y la adición de skills nuevas. Rango típico observado: 30 min (test simple) a 4h (feature con commit atómico).
