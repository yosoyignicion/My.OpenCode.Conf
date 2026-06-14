# Índice de Skills

Catálogo de las 250 skills disponibles. Una línea por skill, descripción extraída del frontmatter de cada SKILL.md. Para el detalle completo, abre el SKILL.md de la carpeta correspondiente.

Total: **250 skills** organizadas en un único directorio `skill-matrix/skills-matrix/`. Usa la barra de búsqueda de tu editor (`Ctrl+P` en VS Code, fuzzy finder) para localizar skills por nombre.

## Tabla de skills

| Skill | Descripción breve |
|---|---|
| `00-standard-skill-template` | (skill técnica — ver SKILL.md para detalle) |
| `a11y-accessibility-wcag` | La accesibilidad web (a11y) garantiza que las personas con discapacidades puedan percibir, operar, entender y navegar por el contenido web. Covers WCAG 2.2, contraste, inclusión, daltonismo, ARIA, discapacidad visual, d |
| `advanced-effects` | Use when the user asks about advanced visual effects for icons, badges, or UI: glow, glitch, VHS, pixel art, aberración cromática, scanlines, CRT, low poly, neón, bloom, lumínicas, efectos retro. Covers SVG filters ( |
| `advanced-graph-rag` | Graph RAG extiende la generación aumentada por recuperación (RAG) usando grafos de conocimiento como estructura de contexto intermedia |
| `agent-benchmarking-evaluation` | Proceso sistemático de medir el rendimiento de agentes de IA mediante métricas cuantitativas (tasa de éxito, eficiencia de tokens, latencia) y cualitativas (auto-evaluación, revisión humana), usand... |
| `agent-human-in-the-loop-hitl` | Patrón de diseño donde el agente de IA ejecuta tareas de forma autónoma hasta que encuentra puntos de decisión crítica (acciones destructivas, baja confianza, ambigüedad) donde pausa y solicita int... |
| `agentic-multiloop-orchestration` | Patrón arquitectónico donde un agente de IA ejecuta ciclos iterativos de razonamiento-acción-observación (ReAct) para resolver tareas complejas mediante descomposición |
| `agent-memory-persistence-episodic` | Sistema de memoria episódica para agentes de IA que almacena, recupera y consolida interacciones pasadas usando vectores semánticos para relevancia, timestamps para recencia, y puntuaciones de impo... |
| `ai-agent-state-recovery-checkpoints` | Mecanismo de persistencia del estado interno de un agente (historial de mensajes, resultados de tools, variables de contexto) en puntos de control (checkpoints) para permitir recuperación ante fallos |
| `api-gateway-bff-patterns` | The API Gateway is a single entry point that routes requests to appropriate microservices and handles cross-cutting concerns (auth, rate limiting, logging, SSL termination) |
| `api-idempotency-in-distributed-networks` | Idempotency ensures that applying the same request multiple times produces the same result as applying it once |
| `api-versioning-evolution-strategies` | API versioning manages change without breaking existing clients |
| `artifact-registries-security` | Los artifact registries almacenan y distribuyen imágenes de contenedor, Helm charts, y artefactos OCI |
| `assembly-inline-optimizations` | El assembly inline resuelve la necesidad de explotar instrucciones específicas de CPU o patrones de optimización que el compilador no genera automáticamente, permitiendo al programador escribir dir... |
| `ast-manipulation` | La manipulación de AST (Abstract Syntax Tree) resuelve el problema de analizar y transformar código fuente a nivel estructural sin depender de regex o parsing superficial, operando directamente sob... |
| `asynchronous-messaging-patterns` | Asynchronous Messaging decouples producers from consumers via a message broker |
| `async-python-concurrency` | Async Python resuelve el problema de gestionar operaciones I/O-bound concurrentes sin los costes de threading (race conditions, context switching, GIL) |
| `auth-jwt-oauth-detailed` | JWT (RFC 7519) es un formato compacto de claims representado como JSON |
| `auto-healing` | (skill técnica — ver SKILL.md para detalle) |
| `autoprompting-engineering` | Ingeniería sistemática de prompts para LLMs: diseño persona-first (definir QUIÉN antes del QUÉ), presupuesto de contexto (system prompt <25% de la ventana), formato few-shot con patrones concretos,... |
| `autoscaling-hpa-vpa-keda` | HPA (Horizontal Pod Autoscaler) escala pods horizontalmente basado en CPU/memory/custom metrics |
| `background-jobs-queues` | Los background jobs resuelven el problema de ejecutar trabajo pesado, lento o programado fuera del ciclo request-response HTTP |
| `backpressure-and-flow-control` | Backpressure signals load upstream when a downstream component cannot keep up |
| `badge-system` | Use when the user asks about badge/tier/achievement/insignia design, progression systems, gamification rewards, achievement unlocking, rarity tiers, status signaling, FOMO, dopamina scheduling, reward mechanics, or analy |
| `bare-metal-vs-virtualization` | Bare metal deploya contenedores directamente sobre hardware físico sin hypervisor, ofreciendo máximo rendimiento (0% overhead) |
| `bash-scripting-advanced` | Bash scripting avanzado resuelve la automatización robusta de procesos en entornos Unix/Linux mediante shell scripts predecibles, re-ejecutables y auto-contenidos |
| `blue-green-deployment-strategies` | Blue-green deploya dos entornos idénticos simultáneamente: blue = versión actual, green = nueva versión |
| `bridge-mcp-engram-sync` | Puente de sincronización unidireccional entre el historial de ejecución de procesos (second-termux `processes.db`) y el sistema de memoria Engram (tabla `observations` con FTS5) |
| `bulkhead-circuit-breaker-resilience` | Resilience patterns protect systems from cascading failures |
| `caching-patterns-write-through` | Cache-aside (lazy loading): application checks cache first on read; on miss, loads from database and populates cache. Covers SWR, TanStack Query, ISR, Incremental Static Regeneration, React Compiler, performance web, Cor |
| `cap-theorem-tradeoffs` | CAP theorem states a distributed data store can only provide two of three guarantees: Consistency (C — all nodes see the same data), Availability (A — every request receives a response), and Partit... |
| `cdn-edge-caching-georouting` | CDNs cache content at edge locations close to users, reducing latency and origin load |
| `change-data-capture-cdc` | Change Data Capture captures database row-level changes (INSERT, UPDATE, DELETE) in real-time |
| `chaos-mesh-reliability-testing` | Chaos Mesh inyecta fallos controlados en Kubernetes (pod kill, network partition, disk I/O latency, CPU stress) para validar resiliencia del sistema |
| `cicd-declarative-pipelines` | Los pipelines CI/CD declarativos se definen como código YAML dentro del repositorio (.github/workflows/ o .gitlab-ci.yml). Covers integración, sistema, CI/CD, automation, despliegue, pipeline, build system, asset pipel |
| `clean-architecture-principles` | Clean Architecture enforces concentric layers: Entities (enterprise-wide business rules), Use Cases (application-specific rules), Interface Adapters (controllers, presenters, gateways), and Framewo... |
| `color-basics` | Use when the user asks about color theory, palette design, HSL/RGB/LAB color models, color harmonies (complementary, analogous, triadic, tetradic), WCAG contrast ratios, dark/neon/phonk palettes, brand colors, accessibil |
| `command-pattern-undo-redo` | The Command pattern encapsulates a request as an object, allowing parameterization, queuing, logging, and undo/redo |
| `compilation-linking-loader` | El pipeline de compilación-enlace-carga resuelve la transformación de código fuente a un ejecutable en memoria, mediando entre la representación simbólica del programador y las direcciones físicas/... |
| `compliance-auditing-frameworks` | Los frameworks de compliance imponen controles de seguridad, privacidad y disponibilidad |
| `compliance-frameworks-soc2-iso27001` | SOC 2 (AICPA) reporta sobre controles en 5 principios de servicio: Security, Availability, Processing Integrity, Confidentiality, Privacy |
| `composition-layout` | Use when the user asks about visual composition, layout, grid systems, retícula, balance, symmetry/asymmetry, negative space, visual hierarchy, golden ratio (φ=1.618), Fibonacci spacing, optical centering, modular scal |
| `concurrency-actor-model` | El modelo de actores resuelve el problema de la concurrencia con estado compartido mediante la encapsulación de estado dentro de entidades livianas (actores) que se comunican exclusivamente por pas... |
| `concurrency-patterns-pipelines` | Concurrency patterns manage parallel execution, resource contention, and pipeline processing |
| `configmap-secrets-hot-reloading` | ConfigMaps y Secrets inyectan configuración en pods como variables de entorno o volúmenes montados |
| `configuration-management` | Configuration management externalizes settings from code via environment variables, `.env` files, and config servers |
| `consistent-hashing-topologies` | Consistent hashing distributes keys across nodes with minimal redistribution when nodes join or leave |
| `container-internals-namespaces` | Los contenedores Linux usan namespaces del kernel para aislamiento (PID, network, mount, UTS, IPC, user, cgroup) y cgroups v2 para límites de recursos (CPU, memoria, I/O, PIDs) |
| `container-orchestration-k8s-scheduling` | El scheduler de Kubernetes asigna pods a nodos basado en requests de recursos, reglas de afinidad, taints/tolerations, y constraints de topología |
| `container-runtimes-containerd-cri` | Los container runtimes implementan la CRI (Container Runtime Interface), protocolo gRPC entre kubelet y runtime |
| `context7-mcp-docs` | Uso de las herramientas MCP de Context7 para obtener documentación actualizada de librerías y frameworks: `resolve-library-id` encuentra el ID Context7 correcto para una librería, y `query-docs` re... |
| `context-token-budgeting` | Sistema de gestión del presupuesto de tokens en la ventana de contexto del LLM, asignando porcentajes fijos a cada componente (system prompt, historial, retrieved context) con prioridades de evicción |
| `cost-optimization-finops-kubernetes` | FinOps aplica responsabilidad financiera a Kubernetes |
| `cpp-audio-development` | El desarrollo de audio en C++ resuelve el procesamiento de señales de audio en tiempo real con restricciones estrictas: sin asignaciones de memoria, sin locks, sin I/O en el hilo de audio (audio th... |
| `cpp-graphics-rendering` | La renderización gráfica en C++ resuelve la generación de imágenes 2D/3D en tiempo real mediante la GPU, transformando descripciones de escenas (vértices, texturas, luces) en píxeles a través de un... |
| `cpp-memory-safety` | La seguridad de memoria en C++ requiere una estrategia en capas porque el lenguaje no tiene safety garantizado por el compilador (a diferencia de Rust) |
| `cpu-cache-locality-alignment` | La localidad de caché resuelve el problema del memory wall (la CPU está inactiva >50% del tiempo esperando memoria) mediante la organización de datos para maximizar aciertos en caché L1/L2/L3 |
| `crdts-conflict-free-replicated` | CRDTs (Conflict-free Replicated Data Types) allow concurrent updates across replicas without coordination, guaranteeing convergence to the same state |
| `cryptography-symmetric-asymmetric` | La criptografía simétrica (AES-256-GCM, ChaCha20-Poly1305) cifra datos en bulk usando la misma clave para cifrar y descifrar |
| `cultural-references` | Use when the user asks about cultural references in design, subculture aesthetics, designer inspiration, phonk culture, cyberpunk, gótico, streetwear, Memphis design, Virgil Abloh, David Carson, Vaughan Oliver, Aaron Dr |
| `curator-loop-hermes` | Sistema de auto-mejora que monitorea la ejecución de comandos del agente, identifica patrones reutilizables (comandos que se ejecutan con éxito ≥2 veces), y los promueve automáticamente a skills pe... |
| `dark-mode` | Use when the user asks about dark mode design, OLED optimization, neon glow, dark themes, dark/phonk aesthetics, lumínicas, prefers-color-scheme, dark grey vs true black, night-friendly color palette, or how to design f |
| `database-replication-lag-strategies` | Replication lag occurs when data written to a primary has not yet propagated to replicas |
| `database-sharding-partitioning` | Sharding horizontally partitions data across multiple database instances |
| `data-encryption-in-transit-mtls` | TLS encrypts data in transit between clients and servers |
| `data-lakehouses-parquet-iceberg` | A data lakehouse combines data lake flexibility (cheap object storage) with data warehouse features (ACID transactions, schema enforcement, time travel) |
| `data-mapper-active-record` | Active Record combines business logic and data access in a single class — each database row maps directly to an object that knows how to save and load itself |
| `data-masking-anonymization` | Data masking reemplaza datos sensibles con valores realistas pero ficticios |
| `data-serialization-formats` | Choosing the right data format depends on the use case: human-readability (JSON, YAML, TOML) vs performance and schema-rigor (Protobuf, Avro, Parquet) |
| `ddd-tactical-patterns` | Domain-Driven Design tactical patterns provide building blocks for domain modeling |
| `defensive-security-hardening` | Defense-in-depth: hardening se aplica en capas (red → host → aplicación → datos) |
| `dependency-injection-inversion` | Dependency Injection implements Inversion of Control by injecting dependencies into a class (via constructor, setter, or interface) rather than having the class create them |
| `design-systems-atomic` | Design Systems provide a single source of truth for UI components, patterns, and design decisions. Covers branding, brand identity, visual identity, tokens, atomic design, storybook, guía de estilo, coherencia, escalabi |
| `design-thinking` | Use when the user asks about design thinking methodology, creative process, ideation, prototyping, iteration, conceptualization, empathy mapping, user research, double diamond, design sprint, jobs to be done, or UX laws  |
| `dev-environment` | (skill técnica — ver SKILL.md para detalle) |
| `distributed-cache-redis-cluster` | Redis Cluster automatically shards data across 16384 hash slots, each node owning a subset |
| `distributed-consensus-raft` | Raft is a consensus algorithm designed for understandability, solving the problem of reaching agreement across a distributed cluster despite failures |
| `distributed-locking-redlock` | Distributed locks coordinate access to shared resources across processes |
| `distributed-queues-rabbitmq-amqp` | RabbitMQ implements the AMQP 0-9-1 protocol with exchanges routing messages to queues based on bindings |
| `distributed-tracing-context-propagation` | Distributed tracing tracks requests across service boundaries by propagating a trace context |
| `distributed-transactions-2pc-3pc` | Two-Phase Commit (2PC) ensures atomicity across multiple resources via a coordinator: Phase 1 (prepare) asks all participants if they can commit; Phase 2 (commit/abort) finalizes |
| `dns-routing-anycast-latency` | DNS resolves domain names to IP addresses |
| `docker-compose-watch` | Docker Compose Watch resuelve el problema del desarrollo local con contenedores: cómo sincronizar cambios de código en tiempo real sin reconstruir manualmente la imagen |
| `domain-events-dispatching` | Domain Events capture significant business occurrences within the domain — past-tense, domain-specific, and meaningful to domain experts |
| `dotenv-environment-vars` | dotenv resuelve el problema de gestionar configuración sensible por entorno (desarrollo, testing, producción) sin hardcodear valores en el código fuente |
| `dynamic-application-security-testing-dast` | DAST (Dynamic Application Security Testing) analiza aplicaciones en ejecución desde afuera, identificando vulnerabilidades explotables en runtime |
| `ebpf-based-networking-cilium` | Cilium reemplaza kube-proxy con eBPF para networking escalable y de alto rendimiento |
| `electron-desktop-apps` | Electron es un framework para construir aplicaciones de escritorio multiplataforma usando Chromium como renderizador y Node.js como proceso principal |
| `embeddings-similarity-metrics` | Métricas para cuantificar la similitud semántica entre vectores de embeddings: coseno (ángulo), dot product (magnitud + ángulo), euclidiana (distancia geométrica) |
| `emotional-design` | Use when the user asks about emotional design, user delight, micro-interactions, Norman 3 levels (visceral/behavioral/reflexive), aesthetic-usability effect, dopamine cycles, nostalgia marketing, archetype-based branding |
| `engram-memory-system` | Sistema de memoria tipada persistente basado en SQLite + FTS5 que almacena conocimiento del agente en 8 tipos (architecture, error_solution, learned_pattern, config, preference, command, conversati... |
| `error-handling-patterns` | Structured error handling separates expected domain errors (validation, business rule violations) from unexpected exceptions (network failures, null pointers) |
| `event-driven-cqrs` | CQRS separates write (commands) from read (queries) models, each optimized for its workload — commands validate business rules and produce events, queries return denormalized data without side effects |
| `event-sourcing-eventstore` | Event Sourcing persists state as an ordered sequence of immutable events rather than current state |
| `fastapi-rest-development` | FastAPI resuelve el problema de construir APIs REST con validación automática, documentación interactiva y alto rendimiento |
| `fault-injection-chaos-engineering` | Chaos engineering tests system resilience by injecting controlled failures |
| `flutter-dart-mobile` | Flutter es un framework de UI multiplataforma de Google que compila a código nativo (ARM para iOS/Android, JavaScript para web, y código de escritorio) |
| `frontend-asset-pipeline` | Use when the user asks about production asset pipelines, SVG optimization, SVGO, rasterization, pngquant, zopflipng, Visual Regression Testing VRT, BackstopJS, golden files, batch processing, CI/CD for design assets, ima |
| `frontend-edge-serverless` | Use when the user asks about Edge Functions, serverless, edge computing, Cloudflare Workers, Vercel Edge, streaming SSR, ISR, Partial Prerendering, cold starts, CDN, edge deployment, serverless deployment, edge runtime,  |
| `frontend-runtimes-build` | Use when the user asks about Bun, Vite, Node.js, runtimes JavaScript, build tools, bundlers, Turbopack, Rolldown, esbuild, SWC, package managers, dev servers, HMR, TypeScript transpilation. Covers Bun 1.4, Vite 8, Node.j |
| `frontend-visual-architecture` | Use when the user asks about visual architecture, design systems, systemic design, design tokens, atomic design, atomic design methodology, scalability, visual coherence, Storybook, Style Dictionary, Figma variables, com |
| `fuzzing-security-boundaries` | Fuzzing envía entradas malformadas/aleatorias para encontrar crashes, hangs, o comportamiento indefinido |
| `gamification-rewards` | Use when the user asks about gamification, reward systems, achievement design, badge systems, Octalysis, Yu-kai Chou core drives, FOMO, scarcity mechanics, dopamine scheduling, tier hierarchies, status signaling, level p |
| `garbage-collection-algorithms` | El garbage collector resuelve la gestión automática de memoria liberando objetos no referenciados, eliminando la necesidad de `free`/`delete` explícitos y los bugs asociados (use-after-free, double... |
| `gitops-declarative-reconciliation` | GitOps usa Git como fuente única de verdad para infraestructura y aplicaciones declarativas |
| `git-workflows-conventional` | Los Git workflows estandarizados permiten automatización, generación de changelog, y versionado semántico |
| `gof-behavioral-patterns` | Behavioral patterns focus on communication between objects — how responsibilities are assigned and algorithms are encapsulated |
| `gof-creational-patterns` | Creational patterns abstract object instantiation, making systems independent of how objects are created, composed, and represented |
| `gof-structural-patterns` | Structural patterns compose classes and objects into larger structures while keeping them flexible and efficient |
| `gossip-protocols-membership` | Gossip protocols enable decentralized node discovery and failure detection |
| `go-systems-production` | Go resuelve la programación concurrente de sistemas con un modelo de gorutinas (∼4KB de stack, multiplexadas sobre hilos OS) y canales (CSP — Communicating Sequential Processes), combinando la prod... |
| `graphql-federation-gateways` | GraphQL Federation composes multiple subgraphs into a single federated graph |
| `grpc-protobuf` | gRPC is a high-performance RPC framework using HTTP/2 as transport and Protocol Buffers as the interface definition language |
| `guardrails-nemo-llamaguard` | Sistema de seguridad en múltiples capas que filtra entradas y salidas del LLM para prevenir toxicidad, PII, jailbreaks, y contenido fuera de dominio |
| `hardware-timers-clock-precision` | Los temporizadores y relojes de hardware resuelven la medición precisa del tiempo y la ejecución de acciones en intervalos determinados, desde nanosegundos (TSC) hasta segundos (RTC) |
| `hardware-transactional-memory` | HTM (Hardware Transactional Memory) resuelve la contención de locks en secciones críticas mediante la ejecución especulativa de transacciones optimistas, donde el hardware detecta conflictos de acc... |
| `hexagonal-architecture` | Hexagonal Architecture (Ports & Adapters) isolates the domain core from infrastructure by defining ports (interfaces in the domain) and adapters (implementations in infrastructure) |
| `http3-quic` | HTTP/3 is the third major version of HTTP, running over QUIC (Quick UDP Internet Connections) instead of TCP |
| `http-client-patterns` | HTTP client patterns for reliable API communication in distributed systems |
| `hybrid-logical-clocks` | Hybrid Logical Clocks (HLC) combine physical wall clocks with a logical counter to provide causal ordering with bounded drift |
| `hybrid-search-sparse-dense` | Técnica que combina recuperación sparse (BM25, SPLADE) basada en coincidencia exacta de términos con recuperación dense (embeddings) basada en similitud semántica, fusionando ambos rankings mediant... |
| `icon-symbolism` | Use when the user asks about icon design, visual symbolism, semiology, Peirce triadic signs (icon/index/symbol), icon families, icon grids, iconography for badges, archetypal imagery (skull, crown, star, flame, wings, in |
| `idempotency-keys-processing` | Idempotency ensures that executing the same operation multiple times produces the same result without side effects |
| `identity-access-management-rbac-abac` | RBAC (Role-Based Access Control) asigna permisos a roles y roles a usuarios |
| `immutable-infrastructure-packer` | Infraestructura inmutable reemplaza servidores en lugar de actualizarlos |
| `incident-response-forensics-logging` | NIST SP 800-61 define el ciclo de vida de respuesta a incidentes: Preparation → Detection & Analysis → Containment → Eradication → Recovery → Post-Incident |
| `infrastructure-as-code-terraform` | Terraform usa HCL (HashiCorp Configuration Language) para definir infraestructura declarativa multi-cloud (AWS, GCP, Azure, Kubernetes) |
| `instruction-level-parallelism` | ILP (Instruction-Level Parallelism) resuelve la ejecución secuencial de instrucciones mediante la ejecución simultánea de múltiples instrucciones independientes en un mismo núcleo, explotando el pa... |
| `integration-testing-wiremock-testcontainers` | Integration testing valida la interacción entre componentes reales |
| `io-multiplexing-iouring` | Linux `io_uring` resuelve la sobrecarga de syscalls en I/O de alto rendimiento mediante un par de colas circulares compartidas (Submission Queue / Completion Queue) entre usuario y kernel, eliminan... |
| `io-scheduling-linux` | El I/O scheduler del kernel Linux resuelve la optimización del acceso al disco gestionando el orden en que las peticiones de bloques se entregan al dispositivo de almacenamiento, maximizando throug... |
| `ipc-shared-memory-pipes` | La comunicación entre procesos (IPC) resuelve el problema de intercambiar datos entre procesos que tienen espacios de direcciones virtuales separados, proporcionando mecanismos que el kernel media ... |
| `jit-compilation-engines` | La compilación JIT (Just-In-Time) resuelve el balance entre velocidad de ejecución y portabilidad al compilar código intermedio (bytecode, IR) a código máquina nativo en tiempo de ejecución, combin... |
| `kernel-bypass-dpdk` | El kernel bypass resuelve la latencia y overhead del stack de red del kernel Linux, que puede consumir >50% de los ciclos de CPU en redes de alta velocidad (≥25Gbps) |
| `key-management-kms-rotation` | La gestión de claves sigue NIST SP 800-57: generación, almacenamiento, rotación, revocación y destrucción |
| `knowledge-graphs-neo4j` | Base de datos orientada a grafos (Neo4j) que almacena entidades como nodos y sus relaciones como aristas, consultables mediante Cypher (lenguaje de consulta por patrones) |
| `kubernetes-operators-controllers` | Los Operators extienden Kubernetes con recursos personalizados (CRDs) y controladores que automatizan el lifecycle de aplicaciones |
| `linux-ebpf-tracing` | eBPF (extended Berkeley Packet Filter) resuelve la necesidad de extender el kernel Linux de forma segura y eficiente sin modificar código fuente del kernel ni cargar módulos |
| `llm-fine-tuning-lora-qlora` | Parameter-Efficient Fine-Tuning (PEFT) actualiza solo un pequeño subconjunto de parámetros del LLM mediante matrices de bajo rango (LoRA) o versiones cuantizadas (QLoRA) |
| `llm-inference-engines-vllm` | Motor de inferencia optimizado para servir LLMs en producción, implementando PagedAttention (gestión de memoria KV-cache mediante páginas no contiguas para eliminar fragmentación) y continuous batc... |
| `llm-integration-patterns` | Patrones de integración con LLMs multi-proveedor: abstracción tras interfaz común (LLMClient), manejo de system prompts versionados, structured output con instructor/Zod, streaming con SSE, semanti... |
| `load-balancing-algorithms-l4-l7` | Load balancing distributes incoming traffic across backend servers |
| `load-testing-k6-distributed` | k6 es una herramienta de load testing con scripting en JavaScript, output a Prometheus, y operador Kubernetes para ejecución distribuida |
| `lock-free-data-structures` | Las estructuras de datos lock-free resuelven la contención de hilos bajo alta concurrencia eliminando los mutexes y permitiendo que múltiples hilos progresen simultáneamente sin bloqueo mutuo |
| `log-aggregation-loki-elasticsearch` | Loki (Grafana) usa indexación basada en labels (barata, rápida, nativa Grafana) mientras Elasticsearch ofrece búsqueda full-text con índices invertidos |
| `mcp-tools-protocol` | Model Context Protocol (MCP) es un protocolo JSON-RPC 2.0 que estandariza la exposición de capacidades del agente como herramientas invocables. Covers Vercel AI SDK 6, MCP 2025, LangChain, AI agents, LLM integration, st |
| `memory-raii-borrowing` | RAII (Resource Acquisition Is Initialization) resuelve la gestión determinista de recursos enlazando su ciclo de vida al de un objeto de ámbito (stack), garantizando que la liberación ocurra al sal... |
| `mesh-data-planes-control-planes` | Service mesh separa el control plane (configuración, certificados, telemetría) del data plane (proxies sidecar que interceptan tráfico) |
| `message-brokers-kafka-internals` | Apache Kafka is a distributed event store with publish-subscribe semantics |
| `micro-frontends-routing` | Micro Frontends decompose a frontend into independently developed, tested, and deployed fragments owned by separate teams |
| `microservices-decomposition` | Microservices decomposition strategies break a system into independently deployable services aligned to business subdomains (Bounded Contexts) |
| `modern-cpp-development` | Modern C++ (C++20/23/26) resuelve los problemas de productividad y seguridad del C++ clásico mediante módulos (reemplazando headers frágiles), concepts (restricciones de plantilla legibles), ranges... |
| `modular-monolithic-design` | A Modular Monolith organizes code into well-defined modules (bounded contexts) within a single deployment unit |
| `monitoring-prometheus-metrics` | Prometheus recolecta métricas via scraping pull-based |
| `monorepo-management` | Monorepos almacenan múltiples paquetes/apps en un solo repositorio con tooling compartido |
| `motion-ui` | Use when the user asks about UI animation, motion design, micro-interactions, easing curves, timing, Lottie, GSAP, Framer Motion, Rive, Disney 12 animation principles (squash & stretch, anticipation, arcs, follow-through |
| `multi-agent-collaboration-protocols` | Protocolos y patrones arquitectónicos que permiten a múltiples agentes de IA coordinarse para resolver tareas complejas mediante roles especializados, paso de mensajes estructurado, memoria compart... |
| `multi-tenant-data-isolation` | Multi-tenancy shares a single application instance among multiple tenants while isolating their data |
| `mutation-testing-pitest-stryker` | Mutation testing introduce pequeños cambios (mutaciones) en el código (ej: cambiar `>` por `<`, negar condiciones, eliminar llamadas) y verifica si los tests existentes detectan el cambio |
| `network-partitions-split-brain` | A network partition splits a distributed system into two or more groups that cannot communicate |
| `network-policies-segmentation` | NetworkPolicies controlan el flujo de tráfico entre pods y endpoints externos en Kubernetes |
| `next-js-app-router` | Next.js App Router (introducido en v13.4, estable desde v14) es un enrutador basado en el sistema de archivos que convierte cada carpeta en una ruta y cada archivo `page.tsx` en una vista pública. Covers Next.js 16, Rea |
| `nlp-pipeline-processing` | Pipeline offline de NLP para interpretación de comandos en lenguaje natural usando spaCy: reconocimiento de intención mediante Matcher pre-tagger (registra patrones de verbos antes del etiquetado e... |
| `numa-architectures-tuning` | NUMA (Non-Uniform Memory Access) resuelve el problema de escalabilidad de memoria en sistemas multi-socket, donde cada CPU tiene su propia memoria local con latencia baja (∼100ns) y acceso a memori... |
| `oauth2-oidc-flows` | OAuth2 (RFC 6749) es un framework de autorización que delega el acceso a recursos mediante tokens |
| `ocs-identity-charter` | Arquitectura de identidad del agente definida por un pipeline de 6 capas de system prompt inyectadas secuencialmente: Identidad (reglas core), Herramientas (MCP specs), Memoria (Engram entries), Sk... |
| `openclaw-isolation` | Protocolo de aislamiento y validación del workspace que protege contra acciones destructivas no autorizadas: operaciones que afectan ≥2 archivos requieren aprobación humana explícita (plan approval... |
| `opencode-documentation` | Documentación oficial sintetizada de opencode.ai/docs/ organizada en 6 dominios y 32 subcategorías. Cubre CLI, TUI, Web, IDE, ACP, Server, Zen, Config, Providers, Models, Network, Permissions, Plugins, Skills, MCP Serv |
| `opentelemetry-distributed-tracing` | OpenTelemetry proporciona instrumentación vendor-agnostic para trazas (traces), métricas y logs |
| `outbox-inbox-patterns` | The Outbox pattern ensures reliable message publication by writing events to an outbox table in the same database transaction as the business operation, then publishing asynchronously via a poller |
| `owasp-top-10-mitigation` | OWASP Top 10 (2021) clasifica los riesgos de seguridad web más críticos. Covers seguridad web, Zod/ArkType validation, Server Actions CSRF, rate limiting, validación, seguridad defensiva, input validation, sandboxing, |
| `pacelc-theorem-implications` | PACELC extends CAP: if a Partition (P) occurs, trade off Availability (A) vs Consistency (C); Else (E), trade off Latency (L) vs Consistency (C) |
| `package-management-helm-kustomize` | Helm empaqueta YAML de Kubernetes como charts versionados con templates (values, template functions, hooks) |
| `performance-profiling-optimization` | El profiling de rendimiento resuelve la identificación sistemática de cuellos de botella en software mediante la medición de dónde se gasta el tiempo de CPU, la memoria, o la latencia de I/O |
| `pipeline-filter-architecture` | The Pipeline & Filter architectural pattern structures processing as a sequence of independent filters connected by pipes |
| `playwright-e2e-testing` | Playwright es un framework de automatización de navegadores creado por Microsoft que soporta Chromium, Firefox y WebKit con una sola API unificada |
| `plugins-and-extensibility-architectures` | Plugin architectures allow extending application functionality without modifying core code |
| `plugins-extensibility-agent` | Sistema de plugins que extiende las capacidades del agente mediante scripts externos ejecutables en cualquier lenguaje, comunicándose vía JSON por stdin/stdout |
| `plugins-extensions` | OCS-specific plugin protocol: external scripts that communicate with the OCS orchestrator via JSON over stdin/stdout. Lightweight alternative to MCP for sandboxed extensions. |
| `policy-as-code-opa-rego` | OPA (Open Policy Agent) es un motor de políticas general-purpose |
| `postgresql-advanced` | PostgreSQL avanzado resuelve problemas de consulta y modelado de datos que van más allá del CRUD básico: concurrencia sin colisiones (upsert), jerarquías y árboles (recursive CTE), agregaciones ana... |
| `predict-failure-risk` | Algoritmo tríadico de evaluación de riesgo que analiza historial de comandos en Engram FTS5 + detección de bucles temporales (consecutive failures) + consulta a Context7 para calcular un score de r... |
| `prisma-orm-database` | Prisma ORM resuelve el problema de acceder a bases de datos relacionales desde TypeScript/JavaScript con type-safety total y latencia mínima. Covers PostgreSQL 17, Supabase, Prisma 7, Drizzle ORM, migrations, schema des |
| `process-scheduler-namespaces` | El scheduler de procesos (CFS — Completely Fair Scheduler) resuelve la asignación equitativa de tiempo de CPU entre procesos en ejecución, garantizando que cada tarea reciba una porción justa según... |
| `progressive-delivery-canary` | Progressive delivery despliega nuevas versiones gradualmente, monitorizando métricas en cada paso |
| `prompt-compression-routing` | Sistema que optimiza el uso de LLMs mediante dos mecanismos: compresión de prompts (eliminar tokens no esenciales usando modelos pequeños como LLMLingua) y enrutamiento de consultas (clasificar la ... |
| `property-based-testing` | Property-based testing genera entradas aleatorias dentro de estrategias tipadas y verifica que propiedades invariantes se cumplan para todos los casos |
| `pytest-testing-quality` | pytest resuelve el problema de verificar automáticamente que el código se comporta como se espera, mediante un framework de testing con fixtures reutilizables, parametrización nativa y un sistema d... |
| `python-packaging-pyproject` | Python packaging moderno resuelve el problema de distribuir, instalar y versionar código Python de forma reproducible |
| `qt6-framework` | Qt6 resuelve el desarrollo de interfaces gráficas multiplataforma (desktop, embedded, mobile) con un framework integral que incluye desde widgets clásicos hasta UI declarativa con QML |
| `quantization-gguf-awq-gptq` | Técnicas de compresión de modelos LLM reduciendo la precisión numérica de sus pesos (FP16→INT4/INT8), disminuyendo el uso de memoria 2-6x con mínima pérdida de calidad |
| `rate-limiting-abuse-prevention` | Rate limiting previene el agotamiento de recursos y el abuso mediante la restricción de solicitudes en un período de tiempo |
| `rate-limiting-algorithms` | Rate limiting controls the rate of requests to protect system resources from abuse and overload |
| `reactive-programming-extensions` | Reactive Programming models asynchronous data streams using Observables — sequences of data that arrive over time |
| `react-native-mobile` | React Native permite construir aplicaciones móviles nativas para iOS y Android usando React y JavaScript/TypeScript |
| `react-ui-development` | React 19 es una biblioteca para construir interfaces de usuario mediante componentes declarativos basados en funciones |
| `redis-caching-patterns` | Redis resuelve el problema de acceso a datos con latencia sub-milisegundo mediante una base de datos en memoria con estructuras de datos ricas |
| `reinforcement-learning-human-feedback` | Pipeline de alineación de LLMs que usa preferencias humanas para ajustar el comportamiento del modelo: primero se entrena un Reward Model (RM) que predice la preferencia humana entre dos respuestas... |
| `rest-api-design` | REST API Design follows resource-oriented URLs, standard HTTP methods, and consistent error responses |
| `rest-api-integration-client` | La integración cliente HTTP consiste en establecer una comunicación eficiente y robusta con APIs REST desde aplicaciones backend o frontend |
| `retrieval-reranking-models` | Pipeline de recuperación en dos etapas: un bi-encoder recupera candidatos rápidamente (top 20-100) vía similitud coseno, luego un cross-encoder más preciso pero más lento rerankea solo esos candidatos |
| `rust-systems-programming` | Rust resuelve la seguridad de memoria sin garbage collector mediante un sistema de ownership/borrowing verificado en tiempo de compilación, permitiendo programación de sistemas con la productividad... |
| `saga-orchestration-choreography` | A Saga manages distributed transactions across multiple services without two-phase commit, ensuring eventual consistency |
| `saga-pattern-distributed-coordination` | The Saga pattern manages distributed transactions by breaking them into a sequence of local transactions with compensating actions for rollback |
| `secret-management-vault-integration` | HashiCorp Vault gestiona secretos con generación dinámica, rotación automática, y auditoría |
| `securing-cicd-pipelines` | Los pipelines CI/CD son objetivos de alto valor — un compromiso en el pipeline puede distribuir malware a todos los usuarios |
| `self-reflection-corrective-agents` | Patrón donde el agente critica su propia salida usando un prompt de reflexión específico, identifica errores o mejoras, y genera una versión corregida en un bucle iterativo |
| `semantic-chunking-embedding-pipelines` | Pipeline de procesamiento de documentos que divide textos largos en fragmentos (chunks) óptimos para embedding y recuperación, aplicando estrategias que preservan la coherencia semántica (por límit... |
| `serverless-knative-cold-starts` | Knative sobre Kubernetes provee workloads serverless con auto-escalado a cero |
| `service-discovery-dns-consul` | Service discovery mapea nombres de servicio a endpoints de red |
| `service-mesh-envoy-sidecars` | Service mesh offloads networking concerns (routing, observability, security) from application code to sidecar proxies |
| `session-management-stateless-vs-stateful` | Stateful sessions store data on the server (memory or Redis); stateless sessions encode all data into a token (JWT) sent by the client |
| `signals-and-interrupts-handling` | Las señales (signals) e interrupciones (IRQs) son mecanismos de notificación asíncrona que interrumpen el flujo normal de ejecución para manejar eventos externos (hardware I/O, timers, errores) o i... |
| `simd-vectorization` | SIMD (Single Instruction Multiple Data) resuelve el problema del throughput limitado en bucles que procesan datos independientes al ejecutar la misma operación sobre múltiples elementos simultáneam... |
| `slas-slis-slos-error-budgets` | SLIs (Service Level Indicators) miden la salud del sistema — latencia, error rate, throughput, disponibilidad |
| `software-bill-of-materials-sbom` | Un SBOM (Software Bill of Materials) es un inventario anidado de todos los componentes, librerías y dependencias de un artefacto de software |
| `solid-deep-dive` | SOLID are five design principles for maintainable object-oriented systems |
| `sqlite-sqlalchemy-persistence` | SQLite + SQLAlchemy resuelve el problema de persistencia local con cero configuración de infraestructura, ideal para aplicaciones desktop, móviles, herramientas CLI y prototipos |
| `state-machine-workflows` | State Machines model entities as a finite set of states with well-defined transitions triggered by events |
| `state-management-frontend` | El manejo de estado en frontend existe en un espectro que va desde estado local (componente) hasta estado global (aplicación completa) |
| `state-management-patterns` | State management patterns manage client-side state in frontend applications following a \"local first\" philosophy: start with component state and props, lift to context or store only when truly shared |
| `static-application-security-testing-sast` | SAST (Static Application Security Testing) analiza código fuente sin ejecutarlo, detectando vulnerabilidades de seguridad temprano en el ciclo de desarrollo (shift left) |
| `storage-classes-pv-pvc-csi` | PV (PersistentVolume) es un recurso de almacenamiento en el clúster |
| `streaming-llm-outputs-sse` | Protocolo Server-Sent Events (SSE) para transmitir tokens generados por LLM desde el servidor al cliente en tiempo real, usando `Content-Type: text/event-stream` y eventos `data:` por cada token o ... |
| `structured-logging-patterns` | Structured logging outputs log entries as structured data (JSON) rather than free text, enabling querying, filtering, and analysis in log aggregation systems |
| `structured-outputs-json-schema` | Técnica para generar datos estructurados desde LLMs con garantías de formato, usando JSON Schema, gramáticas formales (Outlines) o validación post-hoc con reintentos (Instructor) |
| `subagents-parallelism` | Patrón de ejecución concurrente donde un orquestador distribuye tareas independientes entre sub-agentes especializados (build, plan, general) que se ejecutan en paralelo mediante goroutines/asyncio... |
| `svg-converter-rasterization` | La conversión de SVG a formatos raster/vector resuelve el problema de compatibilidad: SVG no es soportado nativamente en todos los contextos. Covers SVG, vector, viewBox, svgo, sharp, pngquant, zopfli, WebP, AVIF, WebP  |
| `svg-generation-programmatic` | La generación programática de SVG resuelve el problema de crear gráficos vectoriales dinámicamente desde código, sin intervención manual. Covers SVG, vector, path, viewBox, curva bezier, svgo, optimización, raster |
| `synthetic-data-generation-pipelines` | Pipeline que usa LLMs para generar datos de entrenamiento sintéticos, partiendo de semillas (seed tasks) y aplicando técnicas como Self-Instruct (generar instrucción + input + output), Evol-Instruc... |
| `system-calls-overhead-tracing` | Las system calls (syscalls) son la interfaz entre programas de usuario y el kernel, y su overhead —dominado por el context switch (∼100ns a ∼2μs), la copia de datos entre usuarios y kernel, y el TL... |
| `tailwind-css-utility` | Tailwind CSS es un framework CSS utility-first que proporciona clases atómicas de bajo nivel para construir diseños directamente en el marcado. Covers Tailwind v4, Shadcn/ui, Radix Primitives, design systems, theming,  |
| `tauri-rust-desktop` | Tauri es un framework para construir aplicaciones de escritorio multiplataforma con un backend en Rust y un frontend web (cualquier framework: React, Vue, Svelte, etc.) |
| `threat-modeling-stride` | STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation of Privilege) es el framework de threat modeling de Microsoft que clasifica amenazas en 6 categorías |
| `tool-use-function-calling` | Mecanismo por el cual un LLM invoca funciones externas definidas mediante JSON Schema, generando argumentos estructurados que el runtime ejecuta y cuyos resultados devuelve al modelo para continuar... |
| `trends-forecasting` | Use when the user asks about current design trends 2025-2026, future forecasting, phonk dark aura, brutalism, Y2K revival, retrowave, cyberpunk, streetwear digital, glitch art, AI-generated design, or whether a visual di |
| `typer-cli-applications` | Typer resuelve el problema de construir interfaces de línea de comandos (CLI) en Python con mínima ceremonia, aprovechando type hints para generar automáticamente parsing de argumentos, help text y... |
| `typescript-type-system` | TypeScript es un superset de JavaScript que añade tipado estático opcional. Covers type safety, end-to-end types, tRPC, Zod, ArkType, type-safe APIs, validation, schema validation, runtime types, API contracts, typesaf |
| `typography-phonk` | Use when the user asks about typography for dark/phonk/gaming/cyberpunk aesthetics, display fonts (Impact, Bebas Neue, Anton, Blackletter, glitch fonts), font selection for badges/titles, CSS text effects (glow, gradient |
| `vector-clocks-lamport-timestamps` | Lamport timestamps provide a logical clock for total ordering of events (one counter per process) |
| `vector-db-indexing-hnsw` | Los índices vectoriales permiten búsqueda aproximada de vecinos más cercanos (ANN) sobre embeddings de alta dimensión, sacrificando precisión perfecta por velocidad en órdenes de magnitud |
| `virtual-memory-paging` | La memoria virtual resuelve el aislamiento entre procesos y la ilusión de un espacio de direcciones contiguo mediante la traducción de direcciones virtuales a físicas a través de page tables gestio... |
| `visual-narrative` | Use when the user asks about visual storytelling, narrative progression, hero's journey (Campbell monomyth), worldbuilding, lore, foreshadowing in design, pacing across 5 acts/eras, anti-patterns of progression (flat, fa |
| `vulnerability-scanning-dependency-check` | El escaneo de vulnerabilidades identifica CVEs conocidas en dependencias, contenedores e infraestructura |
| `webassembly-runtimes-sandboxing` | WebAssembly (Wasm) resuelve la ejecución segura y portátil de código no confiable en entornos donde la seguridad y el aislamiento son críticos (navegadores, edge computing, plugins, CDN workers) |
| `websockets-sse-realtime` | WebSockets provide full-duplex communication over a single TCP connection. Covers event-driven architecture, PostgreSQL LISTEN/NOTIFY, Supabase Realtime, CQRS, Event Sourcing, tiempo real, real-time, eventos, WebSockets, |
| `zero-copy-serialization` | La serialización zero-copy resuelve el overhead de CPU y memoria al evitar el paso de deserialización mediante el acceso directo a un buffer de bytes que ya está en el formato de memoria nativo |
| `zero-token-optimization` | Política estricta de minimización de tokens en respuestas del agente: ≤10 palabras o JSON directo, sin saludos/despedidas, búsqueda en Engram FTS5 antes de llamar al LLM, referencia por ID en lugar... |
| `zero-trust-architecture-sdlc` | Zero Trust (NIST SP 800-207) asume que la red ya está comprometida y verifica cada solicitud como si originara de una red abierta |
| `zero-trust-network-architectures` | Zero Trust assumes no implicit trust based on network location |
