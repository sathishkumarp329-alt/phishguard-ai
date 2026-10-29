# PhishGuard AI — Security Policy & System Limitations

## 1. Responsible Disclosure
Security is the foundational principle of PhishGuard AI. If you discover a vulnerability or security flaw, please responsibly report it via email to `security@phishguard.ai` or submit a confidential GitHub Security Advisory. We commit to acknowledging receipt within 48 hours and providing transparent patches.

---

## 2. Server-Side Request Forgery (SSRF) Defenses
Because PhishGuard AI accepts user-supplied destination URLs for analysis, robust SSRF mitigation is enforced:
1. **Network Layer Isolation**: Webpage retrieval and document processing are carried out with restricted network capabilities.
2. **Pre-Flight DNS Resolution Validation**: All target hostnames are resolved before connection. Resolved IP addresses are checked against:
   - Loopback ranges (`127.0.0.0/8`, `::1`)
   - RFC 1918 Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
   - Carrier-Grade NAT (`100.64.0.0/10`)
   - Link-local and cloud metadata addresses (`169.254.169.254`, Azure IMDS `169.254.169.253`, Google internal metadata)
   - IPv6 Unique Local Addresses (`fc00::/7`)
3. **Redirect Hop Verification**: Every hop in an HTTP 301/302 redirect chain is individually re-evaluated against the SSRF filter before being fetched.
4. **Execution Boundaries**: Downloaded HTML/JavaScript is **never** executed inside an active JavaScript runtime on the server.

---

## 3. Important Detection Limitations
> [!WARNING]
> No phishing detection system can provide a 100% guarantee that a website is harmless.

- **HTTPS Does Not Prove Safety**: Attackers routinely obtain free, valid SSL/TLS certificates (e.g. Let's Encrypt). A valid green padlock indicates encrypted transit, not legitimacy.
- **Zero-Day Phishing Kits**: Freshly created phishing sites hosted on legitimate compromised domains may not yet appear in external threat intelligence databases.
- **Verdict Meaning**:
  - `known_malicious`: Confirmed threat intelligence match or decisive brand-impersonation heuristics.
  - `high_risk`: Strong indicator combinations (suspicious TLD + credential form + IP host).
  - `suspicious`: Anomaly detected; user caution advised.
  - `no_known_threat`: No malicious indicators were observed in current tests; **this is not an absolute warranty of safety**.
  - `unable_to_verify`: External services or domain queries timed out or failed.
