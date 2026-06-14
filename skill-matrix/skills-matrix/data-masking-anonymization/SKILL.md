---
name: data-masking-anonymization
description: "Data masking reemplaza datos sensibles con valores realistas pero ficticios"
---
# data-masking-anonymization

## Semantic Triggers
```
data masking PII redaction for non-production environments, k-anonymity and l-diversity anonymization techniques, dynamic data masking in PostgreSQL and application layer, tokenization and format-preserving encryption FPE, GDPR pseudonymization requirements for personal data, data masking pipeline with Apache Atlas and Delphix
```

---

## 1. Definición Teórica

Data masking reemplaza datos sensibles con valores realistas pero ficticios. Estático (enmascara datos en reposo para no-producción) vs dinámico (enmascara en resultados de query según rol). Anonimización (irreversible) vs pseudonimización (reversible con clave). Técnicas: substitución, shuffling, blurring, tokenización, FPE (Format-Preserving Encryption), k-anonymity (cada registro indistinguible de k-1 otros). GDPR exige pseudonimización para datos personales.

---

## 2. Implementación de Referencia

**PostgreSQL Dynamic Data Masking** (pg_ddMask v1.0+) + **Python Faker** para datos sintéticos. PostgreSQL provee column-level security y views con máscaras. Faker genera datos realistas para reemplazar PII.

### Ejemplo Práctico Avanzado

```sql
-- PostgreSQL Dynamic Data Masking
-- Step 1: Create masking functions
CREATE OR REPLACE FUNCTION mask_email(email text)
RETURNS text AS $$
  SELECT regexp_replace(email, '(.)(.*)(@.*)', '\1***\3');
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION mask_ssn(ssn text)
RETURNS text AS $$
  SELECT regexp_replace(ssn, '\d{3}-\d{2}-(\d{4})', '***-**-\1');
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION mask_phone(phone text)
RETURNS text AS $$
  SELECT regexp_replace(phone, '(\d{3})\d{4}(\d{3})', '\1****\2');
$$ LANGUAGE SQL IMMUTABLE;

-- Step 2: Create masked views per role
CREATE VIEW users_support AS
SELECT
    id,
    mask_email(email) AS email,
    mask_ssn(ssn) AS ssn,
    mask_phone(phone) AS phone,
    created_at
FROM users
WHERE current_user = 'support_role';

CREATE VIEW users_analytics AS
SELECT
    id,
    'user_' || id AS username,  -- full anonymization
    EXTRACT(YEAR FROM birth_date) || '-01-01' AS birth_year,
    CASE
        WHEN salary < 30000 THEN 'low'
        WHEN salary < 70000 THEN 'medium'
        ELSE 'high'
    END AS salary_bracket
FROM users
WHERE current_user = 'analytics_role';

-- Step 3: Grant access to masked views
GRANT SELECT ON users_support TO support_role;
GRANT SELECT ON users_analytics TO analytics_role;
```

```python
# Python: Synthetic data generation with Faker + GDPR requirements
from faker import Faker
import hashlib, os

fake = Faker()
SALT = os.urandom(16)

def pseudonymize(value: str) -> str:
    """SHA-256 with salt for GDPR pseudonymization"""
    return hashlib.pbkdf2_hmac("sha256", value.encode(), SALT, 100000).hex()[:32]

def generate_synthetic_user(original_email: str) -> dict:
    return {
        "email": fake.email(),
        "name": fake.name(),
        "ssn": fake.ssn(),
        "phone": fake.phone_number(),
        "address": fake.address(),
        "credit_card": fake.credit_card_number(card_type="visa16"),
        "pseudonymized_email": pseudonymize(original_email),
        "pseudonymized_ssn": pseudonymize(fake.ssn()),
    }

# Export masked dataset for analytics
import csv
with open("users_masked.csv", "w") as f:
    writer = csv.DictWriter(f, fieldnames=generate_synthetic_user("test@test.com").keys())
    writer.writeheader()
    for _ in range(1000):
        writer.writerow(generate_synthetic_user(fake.email()))
```

**Fuente oficial:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

### Alternativa de Implementación Específica

**Apache Atlas + Ranger**: Gestión de políticas de masking centralizada para Hadoop/Spark. Soporta dynamic masking basado en roles de usuario, tags de datos, y clasificación automática de PII.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Entornos no-producción con datos reales. Análisis de datos sin exponer PII. Cumplimiento GDPR/CCPA |
| **Cuándo evitar** | Producción (usar row-level security + encryption en su lugar). Datos no sensibles |
| **Alternativas** | Dynamic masking (PG view-based), Static masking (Dell Delphix), Tokenization (Vault), Synthetic data (Gretel) |
| **Coste/Complejidad** | Medio. Dynamic masking es simple en SQL. Static masking requiere pipeline ETL. FPE añade complejidad criptográfica |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Re-identificación por joins entre tablas

**¿Qué ocasionó el error?**
Tablas separadas con diferentes niveles de masking permitían re-identificar pacientes mediante join en atributos no sensibles combinados.

**¿Cómo se solucionó?**
Aplicar k-anonymity (k=10) a toda la base de datos. Usar ARX Data Anonymization Tool para verificar que ningún registro sea único.

**¿Por qué funciona esta técnica?**
K-anonymity garantiza que cada registro es indistinguible de k-1 otros, previniendo re-identificación por linkage.

### Caso: FPE reversible comprometida

**¿Qué ocasionó el error?**
Clave FPE almacenada en el mismo entorno que los datos tokenizados (entorno no-producción), permitiendo reversión.

**¿Cómo se solucionó?**
Separar Tokenization Vault (Vault Enterprise) de los datos tokenizados. Las aplicaciones solo ven tokens, nunca la clave.

**¿Por qué funciona esta técnica?**
La separación física de clave y datos evita la reversión no autorizada, incluso si el entorno no-producción es comprometido.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~600 tokens estimados al invocar este skill
- **Trigger de activación:** "data masking" o "PII" o "GDPR" en la consulta del usuario
- **Prioridad de carga:** Alta — privacidad de datos es requisito legal
- **Dependencias:** `09-cryptography-symmetric-asymmetric`, `14-compliance-frameworks-soc2-iso27001`

### Tool Integration

```json
{
  "tool_name": "data-masking-anonymization",
  "description": "Data masking, pseudonimización, k-anonymity, FPE, y synthetic data para cumplimiento GDPR/CCPA",
  "triggers": ["data masking", "PII", "GDPR", "anonymization", "pseudonymization", "k-anonymity", "CCPA"],
  "context_hint": "Inyectar junto con 09-cryptography para FPE y 14-compliance para cumplimiento normativo",
  "output_format": "markdown",
  "max_tokens": 600
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre data masking o PII, carga el skill data-masking-anonymization y responde
con ejemplos de PostgreSQL dynamic masking y synthetic data generation.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# PostgreSQL column-level security
psql -c "GRANT SELECT (id, mask_email(email)) ON users TO support;"
psql -c "SELECT * FROM users_masked LIMIT 10;"

# Data masking with gretel CLI
gretel models create --config synthetic --in users.csv --out users_synthetic.csv

# ARX anonymization CLI
java -jar arx-3.9.0.jar -i dataset.csv -c config.xml -o anonymized.csv

# Vault tokenization
vault write transit/encrypt/pii-keys plaintext=$(base64 <<< "4111111111111111")

# Check for PII in files
trufflehog filesystem --directory . --only-verified
```

### GUI / Web

- **ARX Data Anonymization Tool:** GUI para análisis de riesgo de re-identificación y k-anonymity
- **Gretel Console:** Web UI para generación de datos sintéticos con modelos pre-entrenados
- **Apache Atlas:** Clasificación y tagging de PII con lineage de datos y políticas de masking

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Enmascarar email | `SELECT mask_email(email) FROM users;` | ARX → Configure → Mask |
| Generar sintéticos | `gretel models create --config synthetic --in data.csv` | Gretel Console → Generate |

---

## 7. Cheatsheet Rápido

```sql
-- PostgreSQL quick masking functions
CREATE OR REPLACE FUNCTION mask_email(email text)
RETURNS text AS $$
  SELECT regexp_replace(email, '(.)(.*)(@.*)', '\1***\3');
$$ LANGUAGE SQL IMMUTABLE;

-- k-anonymity: each record indistinguishable from k-1 others
-- GDPR: pseudonymization (reversible) vs anonymization (irreversible)
-- FPE: FF1/FF3 for format-preserving encryption

-- Synthetic data: Faker (Python), Gretel (AI), Mostly AI (enterprise)
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `09-cryptography-symmetric-asymmetric` | Dependiente — FPE usa criptografía | Sí |
| `14-compliance-frameworks-soc2-iso27001` | Complementario — data masking es evidencia de control de privacidad | Sí |
| `22-auth-jwt-oauth-detailed` | Complementario — JWT claims pueden contener PII | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 19-data-masking-anonymization
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [data-masking, pii, gdpr, k-anonymity, pseudonymization, tokenization, fpe, synthetic-data]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
