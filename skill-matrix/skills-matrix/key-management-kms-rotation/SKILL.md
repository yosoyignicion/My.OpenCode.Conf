---
name: key-management-kms-rotation
description: "La gestión de claves sigue NIST SP 800-57: generación, almacenamiento, rotación, revocación y destrucción"
---
# key-management-kms-rotation

## Semantic Triggers
```
AWS KMS key rotation and automatic yearly rotation, HashiCorp Vault transit engine for encryption as a service, key hierarchy with envelope encryption, bring your own key BYOK and custom key store, key revocation and emergency rotation procedures, cloud HSM vs software key management tradeoffs
```

---

## 1. Definición Teórica

La gestión de claves sigue NIST SP 800-57: generación, almacenamiento, rotación, revocación y destrucción. El cifrado por sobre (envelope encryption) es el patrón estándar: se genera un DEK (Data Encryption Key) para cifrar datos, y el DEK se envuelve (wrap) con un KEK (Key Encryption Key) maestro. Cloud KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault) maneja claves respaldadas por HSM. On-prem: Vault, Thales CipherTrust. El ciclo de vida incluye rotación automática anual y revocación inmediata en caso de compromiso.

---

## 2. Implementación de Referencia

**AWS KMS** para cloud (HSM-backed) + **HashiCorp Vault** Transit Engine para on-prem multi-cloud. Vault proporciona encryption-as-a-service con rotación automática de claves y audit logging.

### Ejemplo Práctico Avanzado

```python
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os, json

kms = boto3.client("kms", region_name="us-east-1")
KEY_ID = "alias/my-data-key"

# Envelope encryption
def encrypt_data(plaintext: bytes) -> dict:
    # Step 1: Generate DEK wrapped by KMS
    response = kms.generate_data_key(
        KeyId=KEY_ID,
        KeySpec="AES_256",
        EncryptionContext={"purpose": "user-data"}
    )
    ciphertext_dek = response["CiphertextBlob"]  # wrapped DEK (safe to store)
    plaintext_dek = response["Plaintext"]  # used only in memory, discard after

    # Step 2: Encrypt data with DEK locally
    aesgcm = AESGCM(plaintext_dek)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext, b"encryption-context")

    # Zero out DEK from memory
    plaintext_dek = b"\x00" * len(plaintext_dek)

    return {
        "ciphertext_dek": ciphertext_dek.hex(),
        "nonce": nonce.hex(),
        "ciphertext": ciphertext.hex(),
    }

def decrypt_data(payload: dict) -> bytes:
    # Step 1: Unwrap DEK
    response = kms.decrypt(
        CiphertextBlob=bytes.fromhex(payload["ciphertext_dek"]),
        EncryptionContext={"purpose": "user-data"}
    )
    plaintext_dek = response["Plaintext"]

    # Step 2: Decrypt with DEK
    aesgcm = AESGCM(plaintext_dek)
    return aesgcm.decrypt(
        bytes.fromhex(payload["nonce"]),
        bytes.fromhex(payload["ciphertext"]),
        b"encryption-context"
    )
```

**Fuente oficial:** https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html

### Alternativa de Implementación Específica

**HashiCorp Vault Transit Engine**: Ideal para entornos multi-cloud u on-prem. Permite rotación de claves sin downtime. Usa `vault write -f transit/key/rotate/my-key` para rotación manual. Provee encryption-as-a-service sin exponer la clave al cliente.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Sistemas que cifran datos sensibles en reposo, especialmente multi-tenant o regulados (PCI, HIPAA) |
| **Cuándo evitar** | Proyectos sin datos sensibles. Cifrado local con una clave fija es más simple y suficiente |
| **Alternativas** | AWS KMS (cloud-managed, HSM), Vault (on-prem, multi-cloud), SOPS (Mozilla, para archivos) |
| **Coste/Complejidad** | Medio-Alto. Envelope encryption añade complejidad pero es necesaria para rotación segura |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Rotación de clave rompe datos cifrados existentes

**¿Qué ocasionó el error?**
Rotaron la clave maestra KMS y los datos cifrados con la clave anterior no se podían descifrar.

**¿Cómo se solucionó?**
KMS mantiene versiones anteriores de la clave para descifrado. La rotación automática de KMS crea un nuevo backing key pero conserva el anterior. El `KeyId` apunta siempre a la versión primaria para cifrar, pero todas las versiones sirven para descifrar.

**¿Por qué funciona esta técnica?**
KMS versiona las claves internamente. El `CiphertextBlob` incluye metadata de qué versión lo cifró. Esto permite rotación transparente sin re-cifrar datos.

### Caso: Vault Transit key version desactivada por error

**¿Qué ocasionó el error?**
Un administrador desactivó una versión de clave en Vault pensando que ya no se usaba, pero había datos cifrados con ella.

**¿Cómo se solucionó?**
Implementar política en Vault que prohíba desactivar versiones de clave sin un escaneo previo de datos cifrados. Usar `vault read transit/keys/my-key` para ver versiones activas.

**¿Por qué funciona esta técnica?**
La política evita destrucción accidental. El escaneo previo identifica qué datos usan cada versión de clave.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "key management" o "KMS" o "Vault" en la consulta
- **Prioridad de carga:** Alta — gestión de claves es crítica para cualquier sistema que cifre datos
- **Dependencias:** `09-cryptography-symmetric-asymmetric`, `12-securing-cicd-pipelines`

### Tool Integration

```json
{
  "tool_name": "key-management-kms-rotation",
  "description": "Gestión de claves con AWS KMS, Vault Transit, envelope encryption, y rotación automática",
  "triggers": ["KMS", "Vault", "key management", "envelope encryption", "BYOK", "key rotation"],
  "context_hint": "Inyectar junto con 09-cryptography para cobertura completa de cifrado + gestión de claves",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre gestión de claves, carga el skill key-management-kms-rotation y responde
con ejemplos de envelope encryption y rotación automática.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# AWS KMS
aws kms create-key --description "Data protection key"
aws kms create-alias --alias-name alias/my-key --target-key-id $KEY_ID
aws kms encrypt --key-id alias/my-key --plaintext fileb://data.bin --output text --query CiphertextBlob
aws kms decrypt --ciphertext-blob fileb://encrypted.bin

# Vault Transit
vault secrets enable transit
vault write -f transit/keys/my-key type=chacha20-poly1305
vault write transit/encrypt/my-key plaintext=$(base64 <<< "secret data")
vault write -f transit/keys/my-key/rotate

# Key rotation
aws kms enable-key-rotation --key-id $KEY_ID
vault write -f transit/keys/my-key/rotate

# Emergency revocation
aws kms schedule-key-deletion --key-id $KEY_ID --pending-window-in-days 7
```

### GUI / Web

- **AWS KMS Console:** Gestión visual de claves, políticas, aliases, y rotación
- **Vault UI:** Web UI para Vault con Transit Engine, políticas, y audit log
- **Azure Key Vault Portal:** Dashboard de secrets, keys, y certificates con rotación programada

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Rotar clave | `aws kms enable-key-rotation` | KMS → Key → Enable rotation |
| Cifrar con KMS | `aws kms encrypt --key-id alias/key --plaintext fileb://data` | KMS → Encrypt |

---

## 7. Cheatsheet Rápido

```bash
# Envelope encryption flow
# 1. aws kms generate-data-key → returns plaintext DEK + ciphertext DEK
# 2. Encrypt data locally with DEK (AES-256-GCM)
# 3. Store ciphertext (data) + ciphertext DEK together
# 4. Discard plaintext DEK from memory (zero out)
# 5. To decrypt: kms.decrypt(ciphertext_dek) → plaintext DEK → decrypt data

# Rotación KMS automática (AWS)
aws kms enable-key-rotation --key-id $KEY_ID

# Vault Transit rotation
vault write -f transit/keys/my-key/rotate

# Key hierarchy: Master Key (HSM) → KEK → DEK
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `09-cryptography-symmetric-asymmetric` | Complementario — usa algoritmos criptográficos | Sí |
| `12-securing-cicd-pipelines` | Complementario — CI/CD necesita acceso seguro a claves | No |
| `22-auth-jwt-oauth-detailed` | Complementario — JWT signing keys usan KMS | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 10-key-management-kms-rotation
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [key-management, kms, vault, envelope-encryption, hsm, key-rotation, aws-kms]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
