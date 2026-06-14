---
name: cryptography-symmetric-asymmetric
description: "La criptografía simétrica (AES-256-GCM, ChaCha20-Poly1305) cifra datos en bulk usando la misma clave para cifrar y descifrar"
---
# cryptography-symmetric-asymmetric

## Semantic Triggers
```
AES-256-GCM authenticated encryption, RSA and ECDSA public key signatures, ChaCha20-Poly1305 for mobile/low-power, key exchange with ECDH and X25519, AEAD encryption modes and nonce management, hash-based key derivation with HKDF and Argon2
```

---

## 1. Definición Teórica

La criptografía simétrica (AES-256-GCM, ChaCha20-Poly1305) cifra datos en bulk usando la misma clave para cifrar y descifrar. La asimétrica (RSA-3072, ECDSA, Ed25519) usa par de claves para intercambio y firmas. Los modos AEAD (Authenticated Encryption with Associated Data) proveen confidencialidad + integridad. El nonce no debe repetirse nunca por clave. La regla de oro es usar librerías de alto nivel (libsodium, Tink, NaCl) sobre primitivas raw.

---

## 2. Implementación de Referencia

**libsodium** (v1.0.20+) es la implementación de referencia multiplataforma. Proporciona criptografía moderna con APIs seguras por defecto: `crypto_aead_xchacha20poly1305_ietf_encrypt` para AEAD, `crypto_sign_ed25519` para firmas, `crypto_kx` para intercambio de claves.

### Ejemplo Práctico Avanzado

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
import os

# Key derivation from password
master_key = HKDF(
    algorithm=hashes.SHA256(),
    length=32,
    salt=os.urandom(16),
    info=b"app-encryption",
).derive(b"user-password")

# Encrypt with AES-256-GCM
aesgcm = AESGCM(master_key)
nonce = os.urandom(12)  # 96-bit nonce — NEVER reuse per key
ciphertext = aesgcm.encrypt(nonce, b"secret data", b"associated_data")

# Decrypt
plaintext = aesgcm.decrypt(nonce, ciphertext, b"associated_data")
assert plaintext == b"secret data"

# Sign with Ed25519
from cryptography.hazmat.primitives.asymmetric import ed25519
private_key = ed25519.Ed25519PrivateKey.generate()
public_key = private_key.public_key()

signature = private_key.sign(b"message to sign")
try:
    public_key.verify(signature, b"message to sign")
    print("Signature valid")
except:
    print("Signature invalid")
```

**Fuente oficial:** https://doc.libsodium.org

### Alternativa de Implementación Específica

**Google Tink**: Librería de alto nivel que elimina decisiones criptográficas del desarrollador. Usa keysets (JSON serializados) con rotación automática. Soporta AES-GCM, XChaCha20-Poly1305, ECDSA, y HPKE (hybrid public key encryption).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Cifrado de datos sensibles, firmas, intercambio seguro de claves, autenticación de mensajes |
| **Cuándo evitar** | TLS ya provee cifrado en tránsito. No implementar criptografía propia |
| **Alternativas** | AES-256-GCM (hardware-accelerado), ChaCha20-Poly1305 (software-only, móvil), X25519 (key agreement moderno) |
| **Coste/Complejidad** | Alto. Gestión de claves es el desafío, no el algoritmo. Usar KMS/AWS KMS para simplificar |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Reutilización de nonce compromete toda la seguridad

**¿Qué ocasionó el error?**
Implementación que usaba un contador con reinicio en cada reinicio del servidor. Dos mensajes cifrados con mismo (key, nonce) permiten recuperar ambos plaintexts (CVE-2023-0464).

**¿Cómo se solucionó?**
Usar nonce aleatorio de 96 bits (12 bytes) con `os.urandom(12)`. Probabilidad de colisión: negligible (~2^-48 para 2^32 mensajes).

**¿Por qué funciona esta técnica?**
Nonce aleatorio distribuye uniformemente. La probabilidad de colisión es suficientemente baja incluso para grandes volúmenes.

### Caso: Padding oracle attack en modo CBC

**¿Qué ocasionó el error?**
Uso de AES-CBC con PKCS7 padding, sin HMAC. Atacante podía descifrar datos modificando el ciphertext y observando errores de padding (CVE-2022-21449 — Padding Oracle en aplicaciones Java).

**¿Cómo se solucionó?**
Migrar de AES-CBC a AES-256-GCM (AEAD). GCM no usa padding y provee autenticación integrada.

**¿Por qué funciona esta técnica?**
AEAD combina cifrado + MAC en un solo paso, eliminando vectores de padding oracle.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "cryptography" o "encryption" en la consulta del usuario
- **Prioridad de carga:** Alta — criptografía es fundamental para la mayoría de los sistemas
- **Dependencias:** `10-key-management-kms-rotation`, `02-oauth2-oidc-flows`

### Tool Integration

```json
{
  "tool_name": "cryptography-symmetric-asymmetric",
  "description": "Criptografía con AES-GCM, ChaCha20-Poly1305, Ed25519, X25519, y librerías recomendadas",
  "triggers": ["AES", "GCM", "ChaCha20", "Ed25519", "X25519", "AEAD", "encryption", "signing"],
  "context_hint": "Inyectar junto con 10-key-management para cobertura completa de ciclo de vida de claves",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre criptografía, carga el skill cryptography-symmetric-asymmetric y responde
con ejemplos usando AES-256-GCM y libsodium. Prioriza AEAD sobre modos sin autenticación.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Generate Ed25519 key pair
openssl genpkey -algorithm Ed25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem

# Sign and verify
openssl pkeyutl -sign -in message.txt -inkey private.pem -out signature.bin
openssl pkeyutl -verify -in message.txt -pubin -inkey public.pem -sigfile signature.bin

# AES-256-GCM encrypt with OpenSSL
openssl enc -aes-256-gcm -pbkdf2 -iter 100000 -in plain.txt -out encrypted.bin

# Check TLS ciphers
nmap --script ssl-enum-ciphers -p 443 example.com
testssl.sh --cipher-per-proto https://example.com
```

### GUI / Web

- **Cryptii:** Convertidor/editor visual de formatos criptográficos
- **CyberChef (GCHQ):** Herramienta web para operaciones criptográficas con recetas
- **Key Vault (Azure/AWS/GCP):** Gestión gráfica de claves, rotación y políticas

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Generar clave | `openssl genpkey -algorithm Ed25519` | CyberChef → Generate Key |
| Verificar firma | `openssl pkeyutl -verify -in msg -pubin -inkey pub.pem -sigfile sig.bin` | Cryptii → Verify |

---

## 7. Cheatsheet Rápido

```python
# Python cryptography essentials
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

# Encrypt
key = AESGCM.generate_key(bit_length=256)
aesgcm = AESGCM(key)
nonce = os.urandom(12)
ct = aesgcm.encrypt(nonce, b"data", b"aad")

# Decrypt
pt = aesgcm.decrypt(nonce, ct, b"aad")

# Rules
# AES-256-GCM for bulk (HW accelerated)
# X25519 for key exchange
# Ed25519 for signatures
# Argon2id for passwords
# Nonce: 12 bytes random, NEVER reuse with same key
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `10-key-management-kms-rotation` | Complementario — gestión de claves es extensión necesaria | Sí |
| `02-oauth2-oidc-flows` | Dependiente — OAuth2/OIDC usa firma de tokens | No |
| `22-auth-jwt-oauth-detailed` | Dependiente — JWT usa criptografía para firmas | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 09-cryptography-symmetric-asymmetric
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [cryptography, aes-gcm, chacha20-poly1305, ed25519, x25519, libsodium, aead, signing]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
