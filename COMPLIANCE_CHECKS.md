# Fleet Compliance — Security Checks Reference

This document lists every compliance check currently defined in the application, grouped by category. The UI automatically renders these on the **Checks** page, the **Overview** top-failing list, and the **Alerts** feed.

---

## Malware Protection

| ID | Check | Severity | Failing Devices | Why It Matters |
|----|-------|----------|-----------------|----------------|
| chk-001 | Windows Defender Real-time Protection | critical | 3 | Verifies that Windows Defender Antivirus real-time protection is enabled and actively scanning files on access. |
| chk-002 | Antivirus Definition Age ≤ 3 days | warning | 7 | Checks that malware signature definitions were updated within the last 3 days to ensure detection coverage against recent threats. |
| chk-008 | Tamper Protection Enabled | critical | 4 | Confirms Microsoft Defender Tamper Protection is active, preventing unauthorized modification of security settings by malware or unprivileged processes. |

---

## Active Directory

| ID | Check | Severity | Failing Devices | Why It Matters |
|----|-------|----------|-----------------|----------------|
| chk-005 | Domain Admin Group Membership Audit | critical | 2 | Detects unauthorized or unexpected accounts in the Domain Admins group. Privileged group membership should match the approved list. |
| chk-006 | Stale Computer Accounts (90d) | warning | 4 | Identifies Active Directory computer accounts that have not authenticated in 90 or more days. Stale accounts represent potential re-activation risk. |
| chk-009 | Password Never Expires Flag | warning | 9 | Identifies user accounts with the "Password Never Expires" attribute set. This configuration violates password rotation policy and persists compromised credentials. |

---

## OS Updates / Patch Compliance

| ID | Check | Severity | Failing Devices | Why It Matters |
|----|-------|----------|-----------------|----------------|
| chk-003 | Critical Patches Applied (30d) | critical | 8 | Ensures all critical-severity Windows/Linux patches released in the last 30 days are installed. Unpatched critical vulnerabilities are primary attack vectors. |
| chk-004 | Pending Reboot After Patching | warning | 6 | Flags devices awaiting a restart to complete patch installation. Patches are not fully applied until the pending reboot occurs. |
| chk-010 | OS End-of-Life Detection | critical | 2 | Flags devices running operating systems that have reached end-of-life and no longer receive security updates from the vendor. EOL OS devices cannot be patched against new CVEs. |

---

## Endpoint Security Configuration

| ID | Check | Severity | Failing Devices | Why It Matters |
|----|-------|----------|-----------------|----------------|
| chk-007 | Local Administrator Account Disabled | warning | 5 | Verifies the built-in local Administrator account is disabled on endpoints. Enabled local admin accounts bypass domain audit logging and are commonly targeted. |
| chk-011 | Bitlocker / FileVault Encryption | critical | 6 | Verifies full disk encryption is enabled on all endpoints (BitLocker on Windows, FileVault on macOS). Unencrypted devices expose sensitive data on physical theft. |
| chk-012 | Windows Firewall Enabled | warning | 3 | Checks that Windows Defender Firewall is enabled on all profiles (Domain, Private, Public). Disabled firewall allows unrestricted inbound connection attempts. |
| chk-013 | USB / Removable Media Control | critical | 4 | Ensures USB storage and other removable media are restricted via Group Policy or endpoint protection. Uncontrolled USB access enables data exfiltration and malware infection. |
| chk-014 | RDP Exposure | critical | 2 | Detects endpoints with Remote Desktop Protocol exposed to untrusted networks or the internet. RDP is a top attack vector for brute-force and ransomware campaigns. |
| chk-015 | SMBv1 Enabled | critical | 1 | Checks for the legacy SMBv1 protocol, which lacks modern security controls and was exploited by WannaCry, NotPetya, and other worms. |
| chk-016 | Guest Account Status | warning | 3 | Verifies the built-in Guest account is disabled. Guest accounts bypass normal authentication and auditing, and are frequently abused for lateral movement. |
| chk-017 | Secure Boot / TPM | warning | 5 | Confirms Secure Boot is enabled and a TPM is present and active. Without these, devices are vulnerable to bootkits, firmware attacks, and unauthorized OS modifications. |
| chk-018 | Application Whitelisting (AppLocker/WDAC) | warning | 6 | Checks whether AppLocker or Windows Defender Application Control is configured to block unauthorized executables. Whitelisting prevents unknown malware and unapproved software from executing. |
| chk-019 | Screen Lock / Inactivity Lock | warning | 4 | Ensures endpoints lock automatically after a short period of inactivity. Unlocked devices allow physical access attacks, data theft, and unauthorized session access. |
| chk-020 | User Account Control (UAC) | critical | 3 | Verifies UAC is enabled and set to at least the default level. Disabled or lowered UAC allows processes to run with elevated privileges without user consent. |
| chk-021 | AutoRun / AutoPlay Disabled | warning | 7 | Confirms AutoRun and AutoPlay are disabled for removable media and network drives. Auto-execution from USB drives is a common malware infection vector. |
| chk-022 | Audit Policy Enabled | warning | 2 | Checks that Windows Audit Policy is enabled for logon events, object access, and policy changes. Without auditing, security incidents cannot be detected, investigated, or forensically analyzed. |
| chk-023 | Scheduled Tasks | warning | 4 | Reviews scheduled tasks for unauthorized or suspicious entries. Attackers commonly use scheduled tasks for persistence, privilege escalation, and lateral movement. |
| chk-024 | Unnecessary Services | warning | 5 | Identifies non-essential Windows services running on endpoints. Every running service expands the attack surface and increases the number of potential vulnerabilities. |
| chk-025 | Network Shares | warning | 3 | Detects open or overly permissive network shares that may expose sensitive data. Unrestricted shares are a common source of data breaches and lateral movement. |
| chk-026 | Remote Access Tools | warning | 2 | Flags unauthorized remote access tools such as TeamViewer, AnyDesk, or unapproved RDP alternatives. These tools bypass firewall controls and can be used for data exfiltration. |
| chk-027 | Backup Status | critical | 2 | Verifies that endpoints have recent, successful backups. Without reliable backups, ransomware and data loss incidents become catastrophic. |
| chk-028 | Browser Security | warning | 6 | Assesses browser security settings including phishing protection, certificate validation, and extension hygiene. Insecure browsers are a primary vector for phishing and web-based attacks. |

---

## Summary

| Category | Total Checks | Critical | Warning |
|----------|-------------|----------|---------|
| Malware Protection | 3 | 2 | 1 |
| Active Directory | 3 | 1 | 2 |
| OS Updates / Patch Compliance | 3 | 2 | 1 |
| Endpoint Security Configuration | 16 | 6 | 10 |
| **Total** | **28** | **11** | **17** |

---

## Notes

- **Failing Device Count** is mock data for demo purposes. In a production deployment, this would be replaced by real agent-reported telemetry.
- Checks are filterable by **category** and **severity** on the Checks page.
- Clicking any check opens a detail drawer with full description and remediation steps.
- The Overview page highlights the top 5 failing checks by device count.
