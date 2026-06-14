---
name: defensive-security-hardening
description: "Defense-in-depth: hardening se aplica en capas (red → host → aplicación → datos)"
---
# defensive-security-hardening

## Semantic Triggers
```
defensive security hardening Linux Windows containers, firewall iptables nftables UFW configuration, log sanitization token leak prevention log4j, binary integrity verification sha256sum GPG cosign, SUID SGID audit and privilege escalation prevention, AIDE Tripwire file integrity monitoring
```

---

## 1. Definición Teórica

Defense-in-depth: hardening se aplica en capas (red → host → aplicación → datos). Sigue CIS Benchmarks como estándar de configuración segura. Incluye saneamiento de logs (prevención de fugas de tokens/credenciales), hardening de firewall (iptables/nftables/UFW), verificación de integridad de binarios (sha256sum, GPG, Cosign), auditoría de SUID/SGID, y monitoreo de integridad de archivos (AIDE, Tripwire, Osquery). Postura proactiva que asume que el ataque ocurrirá y prepara defensas.

---

## 2. Implementación de Referencia

**CIS Benchmarks** + **Lynis** (auditoría de hardening) + **AIDE** (File Integrity Monitoring). Lynis escanea el sistema contra CIS Benchmarks y reporta hallazgos. AIDE monitorea cambios en binarios críticos. Osquery para consultas en tiempo real sobre el estado del sistema.

### Ejemplo Práctico Avanzado

```bash
#!/bin/bash
# hardening-audit.sh — Comprehensive hardening audit
set -euo pipefail

echo "=== SUID/SGID Audit ==="
find / -type f -perm -4000 -exec ls -la {} \; 2>/dev/null | tee suid-audit.txt
find / -type f -perm -2000 -exec ls -la {} \; 2>/dev/null | tee sgid-audit.txt

echo "=== World-Writable Files ==="
find / -type f -perm -0002 ! -type l -exec ls -la {} \; 2>/dev/null | tee world-writable.txt

echo "=== SSH Hardening ==="
grep -E "^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|MaxAuthTries)" /etc/ssh/sshd_config
grep -E "^Port" /etc/ssh/sshd_config

echo "=== Log Sanitization (Log4J filter) ==="
grep -r '\$\{jndi:|\$\{log4j:|\$\{lower:|\$\{upper:|\$\{env:|\$\{sys:' /var/log/ 2>/dev/null || echo "No Log4Shell patterns found"

echo "=== JWT Token Leak Detection ==="
grep -rnE '[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' /var/log/ 2>/dev/null \
  | while read line; do
    echo "WARNING: Possible JWT token leak in $line"
  done

echo "=== PAM Configuration ==="
grep -E "^(auth required|password requisite)" /etc/pam.d/common-password 2>/dev/null || true
```

```ini
# /etc/aide/aide.conf — File Integrity Monitoring
# Binaries
/bin Bin
/sbin Bin
/usr/bin Bin
/usr/sbin Bin

# Configuration
/etc/ssh/sshd_config PERMS
/etc/passwd PERMS
/etc/shadow PERMS
/etc/sudoers PERMS

# Critical data
/var/log/auth.log LOG
/var/log/syslog LOG

# Custom rules
Bin = p+i+n+u+g+s+b+m+c+md5+sha512
Log = p+i+n+u+g+sha512
```

```bash
# Sanitize JWT tokens in log pipeline
# Logstash filter for token redaction
filter {
    grok {
        match => { "message" => "(?<pre>.*)(?<jwt>[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})(?<post>.*)" }
    }
    if [jwt] {
        mutate {
            replace => { "message" => "%{[pre]}[JWT_REDACTED]%{[post]}" }
            add_tag => ["jwt_leak_detected"]
        }
    }
}
```

**Fuente oficial:** https://www.cisecurity.org/cis-benchmarks

### Alternativa de Implementación Específica

**Osquery** (Facebook): SQL-based endpoint visibility. Consultas en tiempo real sobre procesos, conexiones de red, archivos, y kernel. Ideal para threat hunting y detección de desviaciones en hardening.

---

## 3. Trade-offs y Decisiones de Arquitectura

| Aspecto | Recomendación |
|---|---|
| **Cuándo usar** | Servidores expuestos a internet, contenedores en producción, sistemas con datos sensibles |
| **Cuándo evitar** | Entornos de desarrollo aislados, VMs de corta duración (ephemeral hardening via golden images) |
| **Alternativas** | CIS Benchmarks (estándar), STIG (DoD, más estricto), NIST SP 800-123 (server security) |
| **Coste/Complejidad** | Medio. Hardening manual es laborioso. Automatizar con Ansible (linux-hardening role) reduce costos |

---

## 4. Preguntas Frecuentes (FAQ)

### Caso: SUID binary permite privilege escalation

**¿Qué ocasionó el error?**
Un binario SUID no auditado (`/usr/bin/pkexec` — CVE-2021-4034 PwnKit) permitía escalar a root.

**¿Cómo se solucionó?**
Auditar todos los SUID con `find / -perm -4000 -type f -ls` y eliminar SUID innecesarios con `chmod -s`. Mantener `pkexec` actualizado.

**¿Por qué funciona esta técnica?**
Eliminar SUID no necesarios reduce superficie de ataque. La auditoría periódica detecta nuevos SUID introducidos por paquetes.

### Caso: Log4Shell bypassa log sanitization

**¿Qué ocasionó el error?**
Aplicaciones Java con Log4j v2.0-2.14.1 permitían RCE vía JNDI injection (CVE-2021-44228). El filtro de logs no detectaba patrones `jndi:ldap://`.

**¿Cómo se solucionó?**
Migrar a Log4j 2.17+ o deshabilitar mensajes JNDI: `-Dlog4j2.formatMsgNoLookups=true`. Implementar WAF rule en Cloudflare para bloquear patrones JNDI.

**¿Por qué funciona esta técnica?**
Log4j 2.17+ deshabilita JNDI lookup por defecto. WAF bloquea el patrón antes de llegar a la aplicación.

---

## 5. Vector de IA Agéntica

### Optimización de Contexto

- **Tokens a cargar:** ~650 tokens estimados al invocar este skill
- **Trigger de activación:** "hardening" o "defensive security" en la consulta del usuario
- **Prioridad de carga:** Alta — hardening es base de cualquier postura de seguridad
- **Dependencias:** `20-incident-response-forensics-logging`, `04-owasp-top-10-mitigation`

### Tool Integration

```json
{
  "tool_name": "defensive-security-hardening",
  "description": "Hardening de sistemas con CIS Benchmarks, log sanitization, SUID audit, FIM con AIDE",
  "triggers": ["hardening", "CIS", "Lynis", "AIDE", "SUID", "log sanitization", "tripwire", "osquery"],
  "context_hint": "Inyectar junto con 20-incident-response para defensa + respuesta integrada",
  "output_format": "markdown",
  "max_tokens": 650
}
```

### Prompt Snippet (carga rápida)

```
Cuando el usuario pregunte sobre hardening, carga el skill defensive-security-hardening y responde
con ejemplos de CIS Benchmarks, log sanitization, y SUID audit.
```

---

## 6. Uso en Terminal y GUI/Web

### Terminal (CLI)

```bash
# CIS Benchmark audit with Lynis
sudo lynis audit system --quick --report-file /tmp/lynis-report.dat

# File integrity with AIDE
sudo aideinit   # initialize database
sudo aide --check  # check integrity
sudo aide --update  # update database after approved changes

# Check open ports
ss -tulpn | grep LISTEN
netstat -tulpn

# Audit SSH config
ssh-audit localhost
nmap --script ssh2-enum-algos localhost

# OSQuery interactive
osqueryi "SELECT * FROM processes WHERE name = 'sshd';"
osqueryi "SELECT * FROM listening_ports;"
```

### GUI / Web

- **Lynis Enterprise:** Dashboard con puntuación de hardening y recomendaciones priorizadas
- **CIS WorkBench:** Perfiles de configuración por SO, descargables para automatización
- **Wazuh FIM:** Monitoreo de integridad de archivos con alertas en tiempo real

### Hotkeys / Atajos

| Acción | Atajo CLI | Atajo GUI |
|---|---|---|
| Audit sistema | `sudo lynis audit system` | Lynis Enterprise → Run Scan |
| Check integridad | `sudo aide --check` | Wazuh → FIM Dashboard |

---

## 7. Cheatsheet Rápido

```bash
# Hardening essentials
find / -perm -4000 -type f  # SUID audit
find / -perm -2000 -type f  # SGID audit
ss -tulpn | grep LISTEN     # listening ports
grep -E "PermitRootLogin|PasswordAuthentication" /etc/ssh/sshd_config

# Log sanitization
sed -i 's/[A-Za-z0-9_-]\{20,\}\.[A-Za-z0-9_-]\{20,\}\.[A-Za-z0-9_-]\{20,\}/[JWT_REDACTED]/g' /var/log/*

# CIS Level 1 = basic hardening, Level 2 = defense-in-depth
# Firewall: default deny, allow specific
```

---

## 8. Skills Relacionados

| Skill ID | Relación | ¿Cargar junto? |
|---|---|---|
| `20-incident-response-forensics-logging` | Complementario — hardening previene, IR responde | Sí |
| `04-owasp-top-10-mitigation` | Complementario — hardening mitiga OWASP A05 (Security Misconfiguration) | No |
| `11-rate-limiting-abuse-prevention` | Complementario — firewall rate limiting es parte de hardening | No |

---

## 9. Metadatos del Skill

```yaml
---
id: 21-defensive-security-hardening
domain: 06-seguridad-sdlc
version: 1.0.0
created: 2026-06-12
updated: 2026-06-12
author: opencode-agent
status: active
archive_after: 2026-08-11
source: old-skills/ciberseguridad-defensive
tags: [hardening, cis-benchmarks, lynis, aide, suid-audit, log-sanitization, osquery, firewall]
---
```

---

*Template v1.0 — 9 secciones. Última actualización: 2026-06-12*
