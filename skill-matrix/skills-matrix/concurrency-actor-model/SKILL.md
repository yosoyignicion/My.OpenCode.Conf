---
name: concurrency-actor-model
description: "El modelo de actores resuelve el problema de la concurrencia con estado compartido mediante la encapsulación de estado dentro de entidades livianas (actores) que se comunican exclusivamente por pas..."
---
# Concurrency & Actor Model

## Semantic Triggers
```
actor model message passing concurrency, Erlang/OTP supervision trees, Akka typed actor lifecycle, Orleans virtual actors grain persistence, CASPaxos distributed actor state, rendezvous channels CSP model
```

---

## 1. Definición Teórica

El modelo de actores resuelve el problema de la concurrencia con estado compartido mediante la encapsulación de estado dentro de entidades livianas (actores) que se comunican exclusivamente por paso de mensajes asíncronos, eliminando locks y data races. El principio fundamental es que cada actor procesa mensajes secuencialmente en su buzón, y la mutación de estado solo ocurre en respuesta a mensajes, garantizando consistencia sin mecanismos de exclusión mutua. Arquitectónicamente, los actores forman jerarquías de supervisión donde los padres gestionan fallos de sus hijos (Erlang/OTP "let it crash"), permitiendo sistemas auto-reparables. Existe como patrón diferenciado porque la transparencia de ubicación (local o remoto) y el aislamiento por diseño resuelven la coordinación en sistemas distribuidos que el threading clásico no aborda.

---

## 2. Implementación de Referencia

Erlang/OTP 27 (BEAM VM) — implementación canónica del actor model. Idiomas: Erlang, Elixir (sobre BEAM), Akka (JVM), Orleans (.NET), CAF (C++).

### Ejemplo Práctico Avanzado

```erlang
%% Módulo gen_server que implementa un contador distribuido con failover
-module(counter_server).
-behaviour(gen_server).

%% API
-export([start_link/1, increment/1, get/1, reset/1]).
%% gen_server callbacks
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-record(state, {name :: atom(), value :: non_neg_integer(), timer :: reference()}).

start_link(Name) ->
    gen_server:start_link({local, Name}, ?MODULE, [Name], []).

increment(Name) ->
    gen_server:cast(Name, increment).

get(Name) ->
    gen_server:call(Name, get, 5000).

reset(Name) ->
    gen_server:cast(Name, reset).

init([Name]) ->
    process_flag(trap_exit, true),
    Timer = erlang:send_interval(60000, self(), persist),
    {ok, #state{name=Name, value=0, timer=Timer}}.

handle_call(get, _From, State) ->
    {reply, {ok, State#state.value}, State};

handle_cast(increment, State) ->
    NewValue = State#state.value + 1,
    NewState = State#state{value = NewValue},
    {noreply, NewState};

handle_cast(reset, State) ->
    {noreply, State#state{value = 0}};

handle_info(persist, State) ->
    io:format("[~p] Persisting value ~p~n", [State#state.name, State#state.value]),
    {noreply, State};

terminate(_Reason, State) ->
    erlang:cancel_timer(State#state.timer),
    ok.
```

**Fuente oficial:** https://www.erlang.org/doc/design_principles/gen_server_concepts.html

### Alternativa de Implementación Específica

**Akka Typed** (JVM) para sistemas que requieren integración con ecosistema Java/Spring:

```java
import akka.actor.typed.*;
import akka.actor.typed.javadsl.*;

public class CounterActor extends AbstractBehavior<CounterActor.Command> {
    public interface Command {}
    public record Increment(long by) implements Command {}
    public record Get(ActorRef<Long> replyTo) implements Command {}

    private long count = 0;

    public static Behavior<Command> create() {
        return Behaviors.setup(CounterActor::new);
    }

    @Override
    public Receive<Command> createReceive() {
        return newReceiveBuilder()
            .onMessage(Increment.class, this::onIncrement)
            .onMessage(Get.class, this::onGet)
            .build();
    }

    private Behavior<Command> onIncrement(Increment cmd) {
        count += cmd.by();
        return this;
    }

    private Behavior<Command> onGet(Get cmd) {
        cmd.replyTo().tell(count);
        return this;
    }
}
```

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas distribuidos con estado mutable, telecomunicaciones, IoT, juegos multiplayer, sistemas que requieren alta disponibilidad con auto-recuperación |
| **Cuándo evitar** | Cómputo numérico intensivo (mejor SIMD/GPU), operaciones batch simples (mejor map/reduce), sistemas con estado compartido de baja latencia (mejor CAS/lock-free) |
| **Alternativas** | CSP channels (Go/Clojure core.async — canales como primitiva), STM (Clojure/Haskell — memoria transaccional), LMAX Disruptor (cola lock-free single-writer) |
| **Coste/Complejidad** | Medio-alto: el modelo mental de mensajes asíncronos y supervisión requiere adaptación. La depuración de sistemas de actores distribuidos es compleja sin herramientas de tracing |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Mensajes perdidos en red en actor remoto

**¿Qué ocasionó el error?**
El modelo de actores clásico (Erlang, Akka) asume entrega "al menos una vez" (at-least-once) para mensajes dentro del mismo nodo (referencias locales), pero entre nodos la entrega es "a lo sumo una vez" (at-most-once) por defecto. Un nodo que cayó antes de procesar el mensaje causó pérdida de datos.

**¿Cómo se solucionó?**
Implementar un protocolo de confirmación usando mensajes de acknowledge (ACK):

```erlang
%% Cliente
send_with_ack(Pid, Msg, Timeout) ->
    Ref = monitor(process, Pid),
    Pid ! {self(), Ref, Msg},
    receive
        {Ref, ack} -> {ok, Ref};
        {'DOWN', Ref, process, _, Reason} -> {error, Reason}
    after Timeout -> {error, timeout}
    end.
```

**¿Por qué funciona esta técnica?**
El monitor garantiza que si el proceso destino muere, el emisor recibe un DOWN. Combinado con ACK explícito, se logra exactly-once delivery semántico. Es el mismo patrón que usa Erlang para `gen_server:call/3`.

### Caso: Buzón de mensajes saturado (overload)

**¿Qué ocasionó el error?**
Un actor productor enviaba mensajes 10x más rápido de lo que el consumidor podía procesar. El buzón creció hasta agotar la memoria del nodo BEAM (por defecto, el buzón no tiene límite).

**¿Cómo se solucionó?**
Implementar backpressure con monitoreo de longitud de buzón y un esquema de credit-based flow control:

```erlang
%% En el productor, antes de enviar
case process_info(ConsumerPid, message_queue_len) of
    {message_queue_len, N} when N > 1000 ->
        timer:sleep(100);  %% backpressure simple
    _ ->
        ConsumerPid ! Msg
end.
```

**¿Por qué funciona esta técnica?**
`process_info/2` es O(1) y no requiere bloqueo. El productor consulta la cola antes de enviar. En producción se usan variantes más sofisticadas como `erlang:monitor/2` + credit tokens.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~200 tokens estimados al invocar este skill
- **Trigger de activación:** `actor model message passing concurrency`
- **Prioridad de carga:** Alta — patrón fundamental para sistemas distribuidos
- **Dependencias:** `03-sistemas-distribuidos/03-distributed-consensus-raft` (para actores distribuidos), `01-sistemas-bajo-nivel/13-garbage-collection-algorithms` (comprensión de pausas GC en actores)

### Tool Integration

```json
{
  "tool_name": "concurrency-actor-model",
  "description": "Implementación de concurrencia con actor model, supervisión tolerante a fallos, y paso de mensajes",
  "triggers": ["actor model", "erlang OTP", "akka", "supervision", "message passing", "gen_server"],
  "context_hint": "Inyectar ejemplo práctico de gen_server o Akka typed según el lenguaje que use el usuario",
  "output_format": "markdown",
  "max_tokens": 2800
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre concurrencia con actores, carga el skill concurrency-actor-model.
Proporciona un ejemplo con gen_server (Erlang/Elixir) o Akka Typed (JVM) según corresponda.
Explica el árbol de supervisión como mecanismo de tolerancia a fallos.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Erlang shell interactiva
erl
1> Self = self().
2> Self ! hello.
3> flush().  # ver mensajes en el buzón

# Observar actores en el nodo BEAM
observer_cli:start().

# Akka: monitoreo con akka-cluster
sbt "akka-cluster --port 2551 seed-node"

# Ver procesos Erlang en producción
etop  # similar a top para procesos BEAM
```

### GUI / Web

- **`observer`** (Erlang/OTP): GUI de monitoreo de actores con árbol de supervisión, memory, message queues
- **`Akka Management`**: endpoint HTTP `/cluster/members/` para ver el cluster actor
- **`Orleans Dashboard`**: visualización de grains, activaciones, y distribución por silo

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Iniciar observer en Erlang | `observer:start()` | `Tools → Observer` |
| Ver mailbox de proceso | `process_info(Pid, message_queue_len)` | `Observer → Processes → Queue Len` |
| Dump de estado de cluster Akka | `curl /cluster/members` | `Akka Management Console` |

---

## 7. Cheatsheet Rápido

```erlang
% gen_server mínimo — 14 líneas
-module(my_server).
-behaviour(gen_server).
-export([start_link/0, call/1]).
-export([init/1, handle_call/3, handle_cast/2]).

start_link() -> gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).
call(Msg) -> gen_server:call(?MODULE, Msg, 5000).
init([]) -> {ok, #{}}.
handle_call(Msg, _From, State) -> {reply, {ok, Msg}, State}.
handle_cast(Msg, State) -> {noreply, [Msg | State]}.
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `12-ipc-shared-memory-pipes` | complementario — IPC entre procesos vs mensajes entre actores | No |
| `07-lock-free-data-structures` | alternativo — concurrencia sin locks vs sin estado compartido | No |
| `09-system-calls-overhead-tracing` | dependiente — latencia de paso de mensajes | No |
| `03-sistemas-distribuidos/03-distributed-consensus-raft` | complementario — consenso en cluster de actores | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: concurrency-actor-model
domain: 01-sistemas-bajo-nivel
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: nueva-creacion
tags: [actor-model, erlang, akka, concurrency, message-passing, OTP, supervision]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
