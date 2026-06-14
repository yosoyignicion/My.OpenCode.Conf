---
name: incident-response-forensics-logging
description: "NIST SP 800-61 define el ciclo de vida de respuesta a incidentes: Preparation → Detection & Analysis → Containment → Eradication → Recovery → Post-Incident"
---
# incident-response-forensics-logging

## Semantic Triggers
```
incident response lifecycle NIST 800-61 preparation detection containment eradication recovery, forensic acquisition of memory disk and network artifacts, log aggregation and SIEM correlation rules, playbook-driven response with SOAR automation, chain of custody and evidence preservation, post-incident review and lessons learned
```

---

## 1. Definición Teórica

NIST SP 800-61 define el ciclo de vida de respuesta a incidentes: Preparation → Detection & Analysis → Containment → Eradication → Recovery → Post-Incident. Forensic readiness requiere logging a prueba de manipulación, capacidad de adquisición de memoria (LiME, winpmem), y herramientas de imagen de disco (dd, guymager, FTK Imager). La cadena de custodia documenta quién, qué, cuándo, dónde y por qué para cada evidencia. SOAR automatiza la respuesta basada en playbooks.

---

## 2. Implementación de Referencia

**ELK Stack** (Elasticsearch + Logstash + Kibana) para SIEM + **TheHive** para SOAR + **Velociraptor** para forensics. Logstash ingiere logs con pipelines de parsing. Kibana visualiza correlaciones. TheHive gestiona casos con playbooks. Velociraptor recolecta forensics (memoria, disco, procesos) de endpoints de forma remota.

### Ejemplo Práctico Avanzado

```yaml
# Logstash pipeline: security event correlation
input {
  beats {
    port => 5044
  }
  syslog {
    port => 5514
  }
}

filter {
  # Parse authentication logs
  if [type] == "auth" {
    grok {
      match => { "message" => "%{SYSLOGTIMESTAMP:timestamp} %{HOSTNAME:host} sshd\[%{NUMBER:pid}\]: %{GREEDYDATA:auth_message}" }
    }
    # Detect brute force
    if [auth_message] =~ /Failed password/ {
      metrics {
        meter => ["ip:%{[source][ip]}"]
        add_tag => ["brute_force_attempt"]
      }
    }
  }

  # Detect token leaks
  if [message] =~ /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ {
    mutate {
      add_tag => ["potential_token_leak"]
      replace => { "message" => "[REDACTED by security filter]" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["https://elasticsearch:9200"]
    index => "security-logs-%{+YYYY.MM.dd}"
    ssl => true
    cacert => "/etc/logstash/certs/ca.crt"
  }
}
```

```python
# Automated incident response with TheHive API
import requests
from datetime import datetime, timedelta

THEHIVE_URL = "https://thehive.internal:9000"
API_KEY = os.environ["THEHIVE_API_KEY"]

def create_incident(title: str, description: str, severity: int = 2, tags: list = None):
    """Create case in TheHive from alert"""
    incident = {
        "title": title,
        "description": description,
        "severity": severity,
        "tags": tags or [],
        "date": int(datetime.now().timestamp() * 1000),
        "tlp": 2,  # AMBER
        "pap": 2,  # AMBER
    }
    resp = requests.post(
        f"{THEHIVE_URL}/api/v1/case",
        json=incident,
        headers={"Authorization": f"Bearer {API_KEY}"},
    )
    return resp.json()

# Auto-create incident from SIEM alert
def handle_brute_force_alert(source_ip: str, count: int):
    if count > 100:  # threshold
        case = create_incident(
            title=f"Brute force attack from {source_ip}",
            description=f"{count} failed SSH attempts from {source_ip} in last 5 min",
            severity=3,
            tags=["brute-force", "ssh", "automated"],
        )
        # Automatically block IP in firewall
        block_ip(source_ip)
        return case
```

**Fuente oficial:** https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final

### Alternativa de Implementación Específica

**Wazuh** (OSS SIEM + XDR): Alternativa open-source todo-en-uno (SIEM + EDR + SOAR). Basado en OSSEC. Provee FIM (File Integrity Monitoring), vulnerability detection, y regulatory compliance mapping (PCI, GDPR, HIPAA).

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Organizaciones con superficie de ataque significativa, compliance regulatorio, o trust & safety |
| **Cuándo evitar** | Proyectos pequeños sin datos sensibles (logging simple + manual response es suficiente) |
| **Alternativas** | ELK + TheHive (DIY, flexible), Splunk + Phantom (enterprise, caro), Wazuh (todo-en-uno OSS) |
| **Coste/Complejidad** | Alto. SIEM requiere almacenamiento (ELK ~1TB/día para 100 endpoints). Forensics requiere personal entrenado |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: Logs insuficientes para determinar causa raíz

**¿Qué ocasionó el error?**
Un incidente de encriptación de datos (ransomware) no podía rastrearse porque los logs de procesos no se capturaban.

**¿Cómo se solucionó?**
Implementar Sysmon for Linux (sysinternals) y Windows Event Logging con priorización (Windows Event Logging 4688, 4689 para procesos, 4656 para handle creation).

**¿Por qué funciona esta técnica?**
Sysmon captura creación de procesos, conexiones de red, y cambios de archivos. Los logs de proceso permiten reconstruir la timeline del ataque.

### Caso: Evidencia no admisible por cadena de custodia rota

**¿Qué ocasionó el error?**
La imagen forense se transfirió por USB no sellado, rompiendo la cadena de custodia y haciendo la evidencia inadmisible.

**¿Cómo se solucionó?**
Implementar Forensic Toolkit (FTK) Imager con hash verification y logging de acceso. Documentar cada transferencia en un sistema de tickets.

**¿Por qué funciona esta técnica?**
FTK genera hash al momento de la imagen. El log de accesos y transferencias documenta cada paso, satisfaciendo requisitos legales.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "incident response" o "forensics" en la consulta
- **Prioridad de carga:** Alta — respuesta a incidentes es crítica post-compromiso
- **Dependencias:** `21-defensive-security-hardening`, `23-compliance-auditing-frameworks`

### Tool Integration

```json
{
  "tool_name": "incident-response-forensics-logging",
  "description": "IR lifecycle, forensics acquisition, SIEM correlation, SOAR automation, chain of custody",
  "triggers": ["incident response", "forensics", "SIEM", "SOAR", "chain of custody", "log analysis", "NIST 800-61"],
  "context_hint": "Inyectar junto con 21-defensive-security-hardening para defensa + respuesta",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre incident response, carga el skill incident-response-forensics-logging y responde
con ejemplos del ciclo NIST 800-61 y configuración SIEM.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# Forensic acquisition
sudo dd if=/dev/sda of=/evidence/image.dd bs=4M conv=noerror,sync status=progress
sudo dcfldd if=/dev/sda of=/evidence/image.dd hash=sha256 hashlog=/evidence/hash.log

# Memory acquisition
sudo insmod lime.ko "path=/evidence/memory.lime format=lime"

# Timeline analysis with plaso
log2timeline.py --storage-file case.plaso /evidence/image.dd
psort.py -o dynamic -w timeline.csv case.plaso

# SIEM queries
curl -X GET "https://elasticsearch:9200/security-logs-*/_search?q=tags:brute_force"

# TheHive CLI
thehive-cli case create --title "Incident" --description "Alert"

# Velociraptor collection
velociraptor_v0.72 collect Windows.KapeFiles.Targets
```

### GUI / Web

- **Kibana Security:** SIEM dashboard con timelines, correlaciones, y alertas
- **TheHive UI:** Gestión de casos con playbooks, tareas, y observables
- **Velociraptor GUI:** Recolección forense remota con queries VQL y visualización de resultados
- **Timesketch:** Timeline forense colaborativa de Google (integración con plaso)

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Adquirir imagen | `dcfldd if=/dev/sda of=image.dd hash=sha256` | FTK Imager → Create Image |
| Crear timeline | `log2timeline.py --storage-file case.plaso image.dd` | Timesketch → Import |

---

## 7. Cheatsheet Rápido

```bash
# Incident Response: NIST SP 800-61
# 1. Preparation  2. Detection  3. Containment  4. Eradication  5. Recovery  6. Post-Incident

# Forensic essentials
dcfldd if=/dev/sda of=evidence.dd hash=sha256  # disk image with hash
sudo insmod lime.ko "path=memory.lime format=lime"  # memory
log2timeline.py --storage-file case.plaso evidence.dd  # timeline

# SIEM: ELK + TheHive + Velociraptor
# SOAR: auto-block IP on >100 failed SSH in 5 min
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `21-defensive-security-hardening` | Complementario — hardening reduce incidentes, IR responde | Sí |
| `23-compliance-auditing-frameworks` | Complementario — logs de IR son evidencia de compliance | Sí |
| `15-vulnerability-scanning-dependency-check` | Complementario — scanning identifica vulnerabilidades explotadas en IR | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 20-incident-response-forensics-logging
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: oficial
tags: [incident-response, forensics, siem, soar, chain-of-custody, nist-800-61, elk, thehive]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
