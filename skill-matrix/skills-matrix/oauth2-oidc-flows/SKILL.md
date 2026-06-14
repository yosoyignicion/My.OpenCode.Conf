---
name: oauth2-oidc-flows
description: "OAuth2 (RFC 6749) es un framework de autorización que delega el acceso a recursos mediante tokens"
---
# oauth2-oidc-flows

## Semantic Triggers
```
OAuth2 authorization code flow with PKCE, OpenID Connect ID token and userinfo endpoint, JWT access token validation and expiry, refresh token rotation and revocation, client credentials grant for machine-to-machine, OAuth2 scopes and consent granularity
```

---

## 1. Definición Teórica

OAuth2 (RFC 6749) es un framework de autorización que delega el acceso a recursos mediante tokens. OpenID Connect (OIDC) extiende OAuth2 para autenticación, añadiendo el ID token (JWT). El flujo Authorization Code + PKCE es el estándar recomendado para clientes públicos (SPA, móvil). Client Credentials Grant se usa para comunicación machine-to-machine. Los tokens de acceso son cortos (15-30 min) y los refresh tokens permiten renovación segura (7-30 días).

---

## 2. Implementación de Referencia

**OAuth2 + OIDC con FastAPI y Authlib.** Authlib v1.3+ es la librería Python más completa para OAuth2/OIDC, soportando todos los grants y PKCE.

### Ejemplo Práctico Avanzado

```python
from authlib.integrations.flask_client import OAuth
from authlib.jose import jwt
from datetime import datetime, timedelta, timezone

oauth = OAuth()
oauth.register(
    "auth0",
    client_id="your-client-id",
    client_secret="your-client-secret",
    server_metadata_url="https://dev-xxx.us.auth0.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid profile email"},
)

# PKCE flow for SPA
@app.route("/login")
def login():
    return oauth.auth0.authorize_redirect(
        redirect_uri="https://app.example.com/callback",
        code_challenge_method="S256",
    )

# Validate ID token
@app.route("/callback")
def callback():
    token = oauth.auth0.authorize_access_token()
    claims = jwt.decode(
        token["id_token"],
        key=fetch_jwks(),
        claims_options={"iss": {"values": ["https://dev-xxx.us.auth0.com/"]}},
    )
    return {"user": claims["sub"], "email": claims.get("email")}
```

**Fuente oficial:** https://docs.authlib.org

### Alternativa de Implementación Específica

**NextAuth.js (Auth.js) v5**: Para aplicaciones Next.js. Soporta OAuth2/OIDC out-of-the-box con 80+ providers. Maneja automáticamente PKCE, refresh token rotation, y session management. Usa DatabaseAdapter para persistencia de sesiones.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cualquier aplicación que necesite autenticación delegada (login social, SSO empresarial) o API authorization |
| **Cuándo evitar** | Sistemas cerrados con un único frontend y backend — session cookies + CSRF tokens son más simples |
| **Alternativas** | SAML 2.0 (SSO corporativo legacy), API Keys (machine-to-machine simple), Magic Links (passwordless) |
| **Coste/Complejidad** | Medio. PKCE + refresh rotation añaden complejidad pero son necesarios para seguridad |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Refresh token rotation falla en producción

**¿Qué ocasionó el error?**
El refresh token se usaba concurrentemente (múltiples pestañas/tabs), y la rotación invalidaba el token que otra pestaña estaba usando.

**¿Cómo se solucionó?**
Implementar refresh token rotation con "grace period" de 60 segundos, donde el token anterior sigue siendo válido mientras el nuevo se establece.

**¿Por qué funciona esta técnica?**
La ventana de gracia maneja condiciones de carrera inevitables en clientes multi-tab sin sacrificar la seguridad de rotación.

### Caso: ID token expirado causa logout inesperado

**¿Qué ocasionó el error?**
El ID token se usaba para autorización local (no solo autenticación), y su corta vida útil (5 min) causaba rechazos.

**¿Cómo se solucionó?**
Separar roles/permissions del ID token. Usar el access token para autorización o una llamada a userinfo con el access token.

**¿Por qué funciona esta técnica?**
ID tokens son para autenticación, no autorización. Desacoplar ambas permite ciclos de vida independientes.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~700 tokens estimados al invocar este skill
- **Trigger de activación:** "OAuth2" u "OIDC" en la consulta del usuario
- **Prioridad de carga:** Alta — autenticación es transversal a casi todos los proyectos
- **Dependencias:** `22-auth-jwt-oauth-detailed` (cargar juntos), `08-static-application-security-testing-sast`

### Tool Integration

```json
{
  "tool_name": "oauth2-oidc-flows",
  "description": "Implementación de OAuth2 y OpenID Connect con PKCE, refresh rotation, y validación de tokens",
  "triggers": ["OAuth2", "OIDC", "PKCE", "refresh token", "authorization code", "client credentials"],
  "context_hint": "Inyectar junto con 22-auth-jwt-oauth-detailed para cobertura completa de autenticación y autorización",
  "output_format": "markdown",
  "max_tokens": 700
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre OAuth2 u OIDC, carga el skill oauth2-oidc-flows y responde
siguiendo la sección de implementación de referencia. Prioriza PKCE sobre implicit flow.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Test OAuth2 flow with curl
curl -X POST "https://auth.example.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=https://app.example.com/callback&client_id=CLIENT_ID&code_verifier=VERIFIER"

# Decode JWT for validation
jq -R 'split(".") | .[1] | @base64d | fromjson' <<< "eyJhbG..."

# Introspect token
curl -X POST "https://auth.example.com/introspect" -d "token=ACCESS_TOKEN&client_id=CLIENT_ID&client_secret=CLIENT_SECRET"
```

### GUI / Web

- **Auth0 Dashboard:** Configuración visual de OAuth2/OIDC flows, scopes, y reglas
- **Keycloak Admin Console:** Gestión de realms, clients, users, y sesiones
- **OAuth Debugger (oauthdebugger.com):** Testing interactivo de OAuth2 flows

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Decodificar JWT | `jq -R 'split(".") | .[1] | @base64d'` | jwt.io — pegar token |

---

## 7. Cheatsheet Rápido

```python
# Minimal OAuth2 validation with PyJWT
import jwt, requests

jwks = requests.get("https://auth.example.com/.well-known/jwks.json").json()
public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwks["keys"][0])

claims = jwt.decode(
    token,
    public_key,
    algorithms=["RS256"],
    options={"verify_exp": True, "verify_aud": True},
    audience="api://default",
)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `22-auth-jwt-oauth-detailed` | Complementario — cubre JWT validation y rotación de claves | Sí |
| `09-cryptography-symmetric-asymmetric` | Dependiente — firma de tokens usa criptografía asimétrica | No |
| `13-identity-access-management-rbac-abac` | Complementario — RBAC/ABAC decide qué hacer con la autenticación | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: 02-oauth2-oidc-flows
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/auth-security
tags: [oauth2, oidc, pkce, jwt, authlib, keycloak, authentication]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
