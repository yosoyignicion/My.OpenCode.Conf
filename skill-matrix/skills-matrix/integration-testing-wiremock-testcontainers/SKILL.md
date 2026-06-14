---
name: integration-testing-wiremock-testcontainers
description: "Integration testing valida la interacción entre componentes reales"
---
# integration-testing-wiremock-testcontainers

## Semantic Triggers
```
WireMock HTTP stub server for external API mocking, Testcontainers disposable PostgreSQL Redis Kafka containers, integration testing with realistic dependencies, WireMock request matching and response templating, Testcontainers module for localstack database and queue, integration test vs unit test boundaries
```

---

## 1. Definición Teórica

Integration testing valida la interacción entre componentes reales. WireMock simula endpoints HTTP externos con respuestas deterministas para testing de APIs sin depender de servicios reales. Testcontainers levanta contenedores Docker desechables (PostgreSQL, Redis, Kafka, S3 Mock) para probar contra dependencias reales sin necesidad de infraestructura compartida. Ambos se ejecutan en CI sin configuración manual. La clave es testing realista pero aislado, con costos de setup controlados.

---

## 2. Implementación de Referencia

**Testcontainers** (Java v1.20+) + **WireMock** (Java v3.5+) son el estándar para integration testing en JVM. Testcontainers soporta módulos para PostgreSQL, MySQL, Redis, Kafka, LocalStack, etc. WireMock provee stubs HTTP con request matching avanzado.

### Ejemplo Práctico Avanzado

```java
// OrderServiceIT.java
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    static WireMockServer paymentGateway = new WireMockServer(
            WireMockConfiguration.wireMockConfig()
                    .dynamicPort()
                    .usingFilesUnderClasspath("wiremock/payment-gateway")
    );

    @BeforeAll
    static void setup() {
        paymentGateway.start();

        // Stub payment gateway with response templating
        paymentGateway.stubFor(post(urlPathEqualTo("/payments/charge"))
                .withRequestBody(matchingJsonPath("$.amount"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                    "transactionId": "{{randomValue type='UUID'}}",
                                    "status": "completed",
                                    "amount": "{{jsonPath request.body '$.amount'}}"
                                }
                                """)
                        .withTransformers("response-template")));

        // Stub fraud detection (error scenario)
        paymentGateway.stubFor(post(urlPathEqualTo("/fraud/check"))
                .withRequestBody(matchingJsonPath("$.amount", greaterThan(10000)))
                .willReturn(aResponse().withStatus(403).withBody("{\"flag\": true}")));
    }

    @Test
    void testPaymentFlow() {
        OrderService order = new OrderService(
                postgres.getJdbcUrl(),
                redis.getHost() + ":" + redis.getMappedPort(6379),
                "http://localhost:" + paymentGateway.port()
        );

        Order result = order.createOrder(new OrderRequest(1500, "USD"));

        assertThat(result.getTransactionId()).isNotNull();
        assertThat(result.getStatus()).isEqualTo("completed");

        // Verify WireMock was called
        paymentGateway.verify(1, postRequestedFor(urlPathEqualTo("/payments/charge")));
    }

    @AfterAll
    static void teardown() {
        paymentGateway.stop();
    }
}
```

**Fuente oficial:** https://testcontainers.com/guides/getting-started-with-testcontainers-for-java/

### Alternativa de Implementación Específica

**LocalStack** + **Testcontainers**: Para testing de servicios AWS (S3, SQS, DynamoDB, Lambda) sin conectarse a AWS real. Testcontainers tiene módulo LocalStack nativo con configuración por servicios.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Testing de integración con dependencias externas (APIs, bases de datos, colas) en CI |
| **Cuándo evitar** | Tests unitarios puros (sin I/O). Tests que solo validan lógica sin dependencias |
| **Alternativas** | H2 (in-memory DB, menos realista), MockServer (WireMock alternative), MockWebServer (OkHttp) |
| **Coste/Complejidad** | Medio. Requiere Docker runtime en CI. Testcontainers añade latencia inicial (pull de imágenes). WireMock es ligero |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Testcontainers lento en CI por pull de imágenes

**¿Qué ocasionó el error?**
Cada ejecución de CI descargaba imágenes Docker desde cero, añadiendo 2-3 minutos al pipeline.

**¿Cómo se solucionó?**
Configurar `testcontainers.reuse.enable=true` y cache de imágenes Docker en CI:

```properties
# testcontainers.properties
testcontainers.reuse.enable=true
ryuk.container.privileged=true
```

```yaml
# CI cache
- name: Cache Docker images
  uses: actions/cache@v4
  with:
    path: /var/lib/docker
    key: docker-${{ hashFiles('**/pom.xml') }}
```

**¿Por qué funciona esta técnica?**
El cache de Docker evita descargas repetidas. Testcontainers reuse mantiene contenedores entre ejecuciones locales.

### Caso: WireMock stub no coincide por request body dinámico

**¿Qué ocasionó el error?**
El stub esperaba `{"amount": 100}` exacto, pero el servicio enviaba `{"amount": 100, "currency": "USD"}`.

**¿Cómo se solucionó?**
Usar `matchingJsonPath` con `$` (ignore extra fields) o `equalToJson` con modo `ignoreArrayOrder` y `ignoreExtraElements`.

```java
paymentGateway.stubFor(post(urlPathEqualTo("/payments"))
    .withRequestBody(equalToJson(
        "{\"amount\": 100}",
        true,  // ignoreArrayOrder
        true   // ignoreExtraElements
    ))
    .willReturn(aResponse().withStatus(200)));
```

**¿Por qué funciona esta técnica?**
El matching flexible permite que los stubs toleren cambios en el request body sin romperse.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** "integration testing" o "Testcontainers" en la consulta
- **Prioridad de carga:** Media — importante pero postergable hasta que se definan dependencias externas
- **Dependencias:** `16-mutation-testing-pitest-stryker`, `03-property-based-testing`

### Tool Integration

```json
{
  "tool_name": "integration-testing-wiremock-testcontainers",
  "description": "Integration testing con Testcontainers y WireMock para dependencias realistas en CI",
  "triggers": ["integration testing", "Testcontainers", "WireMock", "mock API", "container testing"],
  "context_hint": "Inyectar cuando se necesiten tests que validen interacción con dependencias externas",
  "output_format": "markdown",
  "max_tokens": 600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre integration testing, carga el skill integration-testing-wiremock-testcontainers y responde
con ejemplos de Testcontainers y WireMock para testing de APIs externas.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Run integration tests (exclude unit)
mvn verify -Pintegration-test
./gradlew integrationTest

# Testcontainers with specific image version
docker pull testcontainers/ryuk:0.9.0

# WireMock standalone server
java -jar wiremock-standalone-3.5.0.jar --port 8089 --verbose

# Record WireMock stubs from real API (proxying)
java -jar wiremock-standalone.jar --proxy-all="https://api.real.com" --record-mappings --verbose

# LocalStack CLI
localstack start -d
localstack status services
```

### GUI / Web

- **Testcontainers Desktop:** UI para gestionar contenedores de test, ver logs, y debug
- **WireMock Admin API:** `/__admin/` para stubs, recordings, y requests recibidos
- **LocalStack Web UI:** Dashboard de servicios AWS mockeados con logs y debugging

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Record stubs | `wiremock --proxy-all="https://api.real.com" --record-mappings` | WireMock Admin → Record |
| Ver requests | `jq . /tmp/wiremock/requests/*` | WireMock Admin → Requests |

---

## 7. Cheatsheet Rápido

```java
// Testcontainers + WireMock essentials
@Container PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine");
static WireMockServer wm = new WireMockServer(8089);

// WireMock stub
wm.stubFor(get("/api/users/1")
    .willReturn(aJsonResponse("{\"id\": 1, \"name\": \"Alice\"}")));

// Verify
wm.verify(1, getRequestedFor(urlPathEqualTo("/api/users/1")));
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `16-mutation-testing-pitest-stryker` | Complementario — mutation testing para unit, integration para integración | No |
| `03-property-based-testing` | Complementario — properties para invariantes, integration para interfaces | No |
| `21-defensive-security-hardening` | Complementario — security integration tests para validar hardening | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 18-integration-testing-wiremock-testcontainers
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [integration-testing, testcontainers, wiremock, localstack, docker-testing, api-mocking]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
