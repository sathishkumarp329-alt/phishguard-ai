# PhishGuard AI — Privacy Policy & Data Minimization

## 1. Core Privacy Commitments
PhishGuard AI is built on the tenet that cybersecurity tools must defend user privacy rather than compromise it.

1. **Zero Credential Collection**: We **never** store, inspect, or intercept passwords, credentials, or session cookies entered by users into destination websites.
2. **Minimal Browsing Telemetry**: The Browser Extension does **not** send every visited URL to central servers. It evaluates safe domains locally using an in-memory cache and heuristic rules.
3. **No Third-Party Tracking**: We do not sell, license, or monetize scan data or user activity with advertising networks.

---

## 2. Information Collected
- **Account Data**: Full Name, Email Address, and securely hashed password (Argon2id). Plaintext passwords are never logged or stored.
- **Scan History**: Scans explicitly initiated by authenticated users are linked to their account to provide historical reports and analytics.
- **User Ownership**: Users may permanently delete individual scan records or purge their entire history at any time from the `/history` and `/settings` pages.
- **Account Deletion**: Deleting an account executes a cascade purge that removes all associated scans, findings, and feedback.

---

## 3. Third-Party Threat Intelligence Integration
- When configured by an administrator, external threat intelligence providers (VirusTotal, Google Safe Browsing) receive destination URLs for hash/lookup checks.
- Sensitive internal query parameters or intranet links can be excluded by adding corporate domains to the extension allowlist.
