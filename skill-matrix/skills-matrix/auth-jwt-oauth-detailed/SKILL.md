---
name: auth-jwt-oauth-detailed
description: "JWT (RFC 7519) es un formato compacto de claims representado como JSON"
---
# auth-jwt-oauth-detailed

## Semantic Triggers
```
JWT access token refresh token rotation, OAuth2 authorization code PKCE S256, OIDC id_token authentication userinfo, JWT validation signature kty alg key rotation, bcrypt argon2id password hashing, RBAC scopes claims-based authorization
```

---

## 1. Definición Teórica

JWT (RFC 7519) es un formato compacto de claims representado como JSON. OAuth2 (RFC 6749) es el framework de autorización delegada. OIDC (OpenID Connect) es la capa de autenticación sobre OAuth2. Principios de seguridad: access tokens de corta duración (15-30 min), refresh token rotation (usar refresh, invalidar anterior), PKCE S256 para clientes públicos, RS256/ES256 con JWKS endpoint. El JWT header contiene `kid` (key ID) para rotación de claves. Validación: signature, exp, iss, aud.

---

## 2. Implementación de Referencia

**FastAPI OAuth2** con **python-jose** + **passlib** + **JWKS rotation**. FastAPI provee `OAuth2PasswordBearer` para autenticación. python-jose maneja JWT con soporte JWKS. passlib para bcrypt/argon2. AWS KMS o Vault para almacenamiento de claves de firma.

### Ejemplo Práctico Avanzado

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from jose.constants import Algorithms
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import requests, json

app = FastAPI()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# JWKS rotation — fetch keys from endpoint
JWKS_URL = "https://auth.example.com/.well-known/jwks.json"

def get_jwks() -> dict:
    resp = requests.get(JWKS_URL, timeout=5)
    return resp.json()

def get_public_key(kid: str) -> str:
    jwks = get_jwks()
    for key in jwks["keys"]:
        if key["kid"] == kid:
            from jose.constants import Algorithms
            return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
    raise HTTPException(401, "Invalid key ID")

def create_tokens(user_id: int, roles: list[str], scopes: list[str]) -> dict:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "iss": "https://api.example.com",
        "aud": "https://api.example.com",
    }

    access_token = jwt.encode(
        {**payload, "exp": now + timedelta(minutes=30), "type": "access", "scopes": scopes, "roles": roles},
        key="HS256_KEY",  # Use RS256 with JWKS in production
        algorithm=Algorithms.HS256,
    )

    refresh_token = jwt.encode(
        {**payload, "exp": now + timedelta(days=7), "type": "refresh", "token_version": 1},
        key="HS256_KEY",
        algorithm=Algorithms.HS256,
    )

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

def verify_token(token: str, expected_type: str = "access") -> dict:
    try:
        # Decode without verification first to get kid
        unverified = jwt.get_unverified_header(token)
        key = get_public_key(unverified["kid"]) if unverified.get("kid") else "HS256_KEY"

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256", "HS256"],
            options={"verify_exp": True, "verify_aud": True, "verify_iss": True},
            audience="https://api.example.com",
            issuer="https://api.example.com",
        )

        if payload.get("type") != expected_type:
            raise HTTPException(401, "Invalid token type")

        return payload
    except JWTError as e:
        raise HTTPException(401, f"Token validation failed: {str(e)}")

@app.post("/auth/login")
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form.username, form.password)
    if not user:
        raise HTTPException(401, "Invalid credentials")
    return create_tokens(user.id, user.roles, user.scopes)

@app.post("/auth/refresh")
async def refresh(refresh_token: str):
    payload = verify_token(refresh_token, "refresh")
    # Revoke old refresh token (invalidate in DB)
    revoke_refresh_token(refresh_token)
    # Issue new token pair
    return create_tokens(int(payload["sub"]), payload.get("roles", []), payload.get("scopes", []))

@app.get("/users/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token, "access")
    return {"user_id": payload["sub"], "roles": payload.get("roles"), "scopes": payload.get("scopes")}
```

**Fuente oficial:** https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/

### Alternativa de Implementación Específica

**Auth.js v5 (NextAuth)**: Para Next.js/React. Maneja automáticamente OAuth2/OIDC, PKCE, refresh rotation, session JWT o database, y 80+ providers. Enfoque "zero-config" con callbacks personalizados.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | APIs públicas, autenticación stateless, sistemas distribuidos, SPA/mobile auth |
| **Cuándo evitar** | SSR tradicional (session cookies + CSRF son más simples), APIs internas en red confiable |
| **Alternativas** | Session cookies (stateful), PASETO (más seguro que JWT), Magic Links (passwordless), WebAuthn (passkeys) |
| **Coste/Complejidad** | Medio. PKCE + refresh rotation añaden complejidad. JWKS rotation requiere infraestructura |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: JWT "alg": "none" attack

**¿Qué ocasionó el error?**
La librería JWT aceptaba tokens con `"alg": "none"`, permitiendo a atacantes forjar tokens sin firma (CVE-2022-23529).

**¿Cómo se solucionó?**
Usar `jose` con `options={"verify_signature": True}` y nunca permitir `Algorithms.NONE`. Validar que `alg` esté en lista blanca (`RS256`, `ES256`).

**¿Por qué funciona esta técnica?**
La verificación estricta del algoritmo evita que la librería acepte tokens sin firma.

### Caso: Refresh token rotation con carreras

**¿Qué ocasionó el error?**
Múltiples peticiones concurrentes con el mismo refresh token causaban que la segunda fallara (el token ya estaba rotado por la primera).

**¿Cómo se solucionó?**
Implementar refresh token rotation con grace period: el token anterior sigue siendo válido por 60s mientras el nuevo se propaga.

```python
def verify_refresh_with_grace(refresh_token: str, grace_seconds: int = 60) -> bool:
    """Allow old refresh token within grace period"""
    payload = verify_token(refresh_token, "refresh")
    if is_token_revoked(refresh_token):
        # Check if within grace period
        revoked_at = get_revoked_at(refresh_token)
        if revoked_at and (datetime.now(timezone.utc) - revoked_at).seconds < grace_seconds:
            return True  # Accept old token within grace
        raise HTTPException(401, "Token revoked")
    return True
```

**¿Por qué funciona esta técnica?**
El grace period maneja condiciones de carrera sin sacrificar la seguridad de rotación.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~700 tokens estimados al invocar este skill
- **Trigger de activación:** "JWT" o "access token" o "refresh token" en la consulta
- **Prioridad de carga:** Alta — autenticación/autorización es transversal a toda aplicación
- **Dependencias:** `02-oauth2-oidc-flows`, `09-cryptography-symmetric-asymmetric`

### Tool Integration

```json
{
  "tool_name": "auth-jwt-oauth-detailed",
  "description": "JWT creation, validation, refresh rotation, JWKS, bcrypt, OAuth2 PKCE, OIDC detailed implementation",
  "triggers": ["JWT", "access token", "refresh token", "JWKS", "PKCE", "OIDC", "bcrypt", "bearer token"],
  "context_hint": "Inyectar junto con 02-oauth2-oidc-flows para cobertura completa de autenticación",
  "output_format": "markdown",
  "max_tokens": 700
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre JWT o tokens, carga el skill auth-jwt-oauth-detailed y responde
con ejemplos de creación, validación, y refresh rotation.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Decode JWT without verification
jq -R 'split(".") | .[1] | @base64d | fromjson' <<< "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"

# Verify JWT with JWKS
curl -s https://auth.example.com/.well-known/jwks.json | jq '.keys[] | .kid'

# Test OAuth2 Authorization Code flow
curl -X POST "https://auth.example.com/oauth/token" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=callback&client_id=ID&code_verifier=VERIFIER"

# Hash password with bcrypt
python -c "import bcrypt; print(bcrypt.hashpw(b'password', bcrypt.gensalt()))"

# Test token validation
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/users/me
```

### GUI / Web

- **jwt.io:** Debugger visual de JWT con decodificación y verificación de firma
- **OAuth Debugger (oauthdebugger.com):** Testing interactivo de OAuth2 flows
- **Auth0 Dashboard:** Gestión de aplicaciones, reglas, y logs de autenticación
- **Keycloak Admin Console:** Realms, clients, users, sesiones, y eventos

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Decodificar JWT | `jq -R 'split(".") | .[1] | @base64d'` | jwt.io — paste token |
| Verificar exp | `jq -R 'split(".") | .[1] | @base64d | fromjson | .exp'` | jwt.io → EXP check |

---

## 7. Cheatsheet Rápido

```python
# Minimal JWT with python-jose
from jose import jwt
from datetime import datetime, timedelta, timezone

# Create
payload = {"sub": "user123", "exp": datetime.now(timezone.utc) + timedelta(minutes=30)}
token = jwt.encode(payload, "secret", algorithm="HS256")

# Verify
claims = jwt.decode(token, "secret", algorithms=["HS256"], options={"verify_exp": True})
assert claims["sub"] == "user123"

# Rules
# RS256/ES256 > HS256 (symmetric)
# PKCE S256 for SPA/mobile
# Refresh rotation + grace period
# JWKS endpoint for key rotation
# bcrypt/argon2id for passwords (never plaintext)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `02-oauth2-oidc-flows` | Complementario — OAuth2 flows usan JWT como token format | Sí |
| `09-cryptography-symmetric-asymmetric` | Dependiente — JWT signing usa criptografía asimétrica | Sí |
| `13-identity-access-management-rbac-abac` | Complementario — JWT claims alimentan decisiones RBAC/ABAC | Sí |

---

## 9. Metadatos del Skill

```yaml
---
id: 22-auth-jwt-oauth-detailed
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/auth-security
tags: [jwt, oauth2, oidc, pkce, jwks, refresh-token, bcrypt, authentication, authorization]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
