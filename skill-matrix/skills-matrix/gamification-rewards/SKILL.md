---
name: gamification-rewards
description: "Use when the user asks about gamification, reward systems, achievement design, badge systems, Octalysis, Yu-kai Chou core drives, FOMO, scarcity mechanics, dopamine scheduling, tier hierarchies, status signaling, level progression, or user retention loops. Triggers: gamificación, recompensa, logro, achievement, badge, Octalysis, motivación, progresión, tiers, rareza, FOMO, dopamina, Skinner, refuerzo variable."
allowed-tools:
  - read
  - write
  - bash
metadata:
  domain: "design"
  phase: "gamificacion-recompensas"
  source: "Skills-o-extra/master-skills/gamification-rewards"
  ported: "2026-06-14"
---

## Octalysis: Los 8 Core Drives de Yu-kai Chou

### 1. Significado Épico y Llamado
El usuario es parte de algo más grande. Las insignias no son niveles — son un viaje. Cada era tiene nombre mitológico. Tooltip con lore.

**Técnicas:** Narrativa envolvente, nombres épicos, mapa del viaje, N20 como "La Trascendencia".

### 2. Desarrollo y Logro
Progresión visible, cada nivel diferente al anterior. Hitos en N5, N10, N15, N20. Feedback constante con animación de celebración.

**Técnicas:** Barra de progreso visual, partículas que se acumulan, sonido de logro.

### 3. Empowerment de Creatividad
Insignias que reaccionan al hover (N13+). Customización del perfil. Feedback táctil al click.

### 4. Propiedad y Posesión
Exclusividad permanente. Colección visible (grid de 20 slots). Rareza. Inversión emocional.

**Técnicas:** Efecto "nuevo" al obtener, álbum de colección, trading entre usuarios.

### 5. Influencia Social
Estatus visible en perfil. Comparación social. Competencia. Pertenencia.

**Técnicas:** Perfil con insignias, badge showcase en chat, notificaciones sociales, challenges comunitarios.

### 6. Escasez e Impaciencia
Tiempo limitado, dificultad creciente, cantidad limitada.

**Técnicas:** Eventos con cuenta regresiva, temporadas, rare tiers (Común 60%, Raro 25%, Épico 10%, Legendario 5%).

### 7. Imprevisibilidad y Curiosidad
Sorpresa, descubrimiento, misterio.

**Técnicas:** Badge oculto N20, easter eggs, rotación de insignias no anunciadas.

### 8. Evitación y Pérdida
FOMO, compromiso, pérdida de estatus.

**Técnicas:** Eventos limitados, rachas diarias, leaderboard, badges de veterano.

### Matriz de Peso para Sistema de Insignias

| Core Drive | Peso | Cómo se Activa |
|------------|------|----------------|
| Significado | 15% | Narrativa phonk, lore |
| Logro | 25% | Progresión visible, hitos |
| Empowerment | 10% | Interactividad |
| Propiedad | 15% | Colección, rareza |
| Social | 15% | Perfil visible |
| Escasez | 10% | Eventos limitados |
| Curiosidad | 5% | Badges ocultos |
| Evitación | 5% | FOMO, rachas |

## Sistemas de Insignias: Achievement Design

### Curva de Progresión (20 niveles)

```
N1: 0h    N5: 10h (hito: glow)    N10: 50h (hito: animación)
N15: 150h (hito: explosión color)  N20: 400h (hito: legendaria)
```

### Distribución de Usuarios Esperada

| Rango | % | Niveles |
|-------|---|---------|
| Nuevos | 40% | N1-N4 |
| Casuales | 30% | N5-N9 |
| Dedicados | 18% | N10-N14 |
| Veteranos | 10% | N15-N18 |
| Élite | 2% | N19-N20 |

### Reward Scheduling

- 70% Fixed Ratio (progresión principal predecible)
- 15% Variable Ratio (logros laterales)
- 10% Fixed Interval (rachas)
- 5% Variable Interval (eventos sorpresa)

## Psicología del Logro

### Dopamina: El Neurotransmisor de la Anticipación

La dopamina se libera al ANTICIPAR la recompensa, no al obtenerla. El momento más importante es cuando el usuario SABE que está cerca.

**Técnicas:** Barra de progreso, foreshadowing (silueta del próximo badge), notificaciones de "casi", micro-hitos cada 20%.

### Status Signaling

| Tipo | Mensaje |
|------|---------|
| Costly Signaling | "Invertí 400+ horas" |
| Skill Signaling | "Completé un desafío" |
| Identity Signaling | "Soy fan del phonk" |

### Rareza Percibida

| Tier | % Población | Efecto Visual |
|------|-------------|---------------|
| Común | 60% | Forma simple |
| Raro | 25% | Borde + glow básico |
| Épico | 10% | Glow + animación |
| Legendario | 4% | Todos los efectos |
| Secreto | 1% | Efecto único |

80% rareza natural (difícil) + 20% artificial (edición limitada).

### Psicología de Coleccionar

- Orden: completar un set da control
- Identidad: la colección es extensión del yo
- Endowment effect: el usuario valora más lo que posee
- Colección incompleta (17/20) genera más engagement que completa

## Jerarquías y Tiers

### 5 Ejes de Diferenciación

1. **Complejidad de forma:** 1-2 elementos (N1) → 5-8 elementos (N20)
2. **Color/saturación:** Monocromo (Era 1) → Policromo (Era 5)
3. **Brillo/glow:** Sin glow (N1-4) → 25px+ externo (N19-20)
4. **Animación:** Estático (N1-9) → Todas combinadas (N20)
5. **Textura:** Plano (N1-4) → Especular/vidrio/metal (N19-20)

### Técnicas Exclusivas para N20

1. Romper el marco (elementos que trascienden el recorte 100×100)
2. Firma de autor (elemento único que solo aparece en N20)
3. Efecto especular exclusivo
4. Estado dual (reposo + al click se transforma en celebración)
5. Nomenclatura diferente (latín: "Aeternum Noctis")

### Test de Distinción Jerárquica

- Test ciego: ¿sabe cuál es de mayor nivel?
- Test 3 segundos: ¿puede asignar nivel ±2?
- Test de silueta: ¿distinguibles sin color?
- Test de grid: ¿puede ordenar visualmente?

## Casos de Éxito Analizados

| Plataforma | Lección clave |
|-----------|---------------|
| Twitch | Sub badges personalizados por streamer, meses de lealtad |
| Discord | Perfil como escaparate, HypeSquad por personalidad |
| PlayStation | Jerarquía Bronce→Platino, Platino como santo grial |
| Xbox | Gamerscore numérico, rare achievements |
| Reddit | Rachas de login funcionan, falta visibilidad mata el sistema |

### Factores Clave de Éxito

1. Visibilidad (si no se ve, no existe)
2. Jerarquía clara (nivel obvio a simple vista)
3. Rareza natural (logros difíciles = estatus real)
4. Experiencia multisensorial (sonido + animación + notificación)
5. Sostenibilidad (el sistema debe evolucionar)
6. Narrativa (las insignias cuentan una historia)
7. Exclusividad del nivel máximo

---

## Cheatsheet Rápido

```yaml
Octalysis (Yu-kai Chou) - 8 Core Drives:
  1. Significado épico   15%  "Algo más grande"
  2. Logro               25%  "Progresión visible"  ← PESO MÁXIMO
  3. Creatividad         10%  "Personalización"
  4. Posesión            15%  "Colección, rareza"
  5. Social              15%  "Estatus, competencia"
  6. Escasez             10%  "Tiempo/edición limitada"
  7. Curiosidad           5%  "Easter eggs, misterio"
  8. Evitación/FOMO       5%  "Pérdida de estatus"

Rareza típica:  Común 60% | Raro 25% | Épico 10% | Legendario 4% | Secreto 1%

Skinner: 70% Fixed Ratio + 15% Variable + 10% Fixed Interval + 5% Variable

Dopamina: se libera ANTES (anticipación), no al recibir
  → Barras de progreso + foreshadowing son más efectivos que la entrega

Distribución usuarios 20 niveles:
  40% nuevos (N1-4) | 30% casuales (N5-9) | 18% dedicados (N10-14)
  10% veteranos (N15-18) | 2% élite (N19-20)
```

---

## Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `design-skills/emotional-design` | Complementario | Sí (Norman + dopamina) |
| `design-skills/icon-symbolism` | Complementario | Sí (semiología de status) |
| `design-skills/visual-narrative` | Complementario | Sí (arco de progresión) |
| `design-skills/motion-ui` | Complementario | Sí (celebración, hitos) |
| `design-skills/typography-phonk` | Complementario | Condicional (rareza visual) |
| `design-skills/trends-forecasting` | Complementario | Condicional (estética gaming 2025) |
| `frontend-visual-architecture` | Complementario | Sí (jerarquía, tokens) |

---

*Ported from `Skills-o-extra/master-skills/gamification-rewards` (2026-06-14).*
