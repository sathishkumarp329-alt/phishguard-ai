# PhishGuard AI — Machine Learning Model Documentation

## 1. Overview & Provenance
The PhishGuard AI machine learning subsystem acts as an independent, secondary detection component that augments the deterministic heuristic rule engine, threat intelligence feeds, DNS/TLS analyzers, and SSRF-safe redirect inspection.

- **Model Type**: Random Forest Classifier (`sklearn.ensemble.RandomForestClassifier`)
- **Version**: `rf-v1.2.0`
- **Model Artifact**: `phishguard_rf_v1.joblib`
- **Dataset Sources**:
  1. **PhishTank Verified Phishing Archive**: Open community feed of verified malicious credential theft and phishing URLs.
  2. **Tranco Top 10K Legitimate Domains**: Hardened research-oriented ranking of top Internet destinations resistant to manipulation.
  3. **OpenPhish Public Feed**: Active zero-day phishing target samples.

## 2. Feature Vector Schema (24 Numerical Dimensions)
1. `url_length`: Overall character count of target URL.
2. `hostname_length`: Character length of the FQDN.
3. `path_length`: Length of URI path component.
4. `dot_count`: Total period occurrences.
5. `hyphen_count`: Hyphen frequency in URL and hostname.
6. `slash_count`: Path separator count.
7. `question_mark_count`: Parameter delimiter count.
8. `equal_count`: Query argument assignments.
9. `at_symbol_count`: RFC Basic-Auth trickery frequency (`@`).
10. `percent_count`: URL percent-encoding ratio.
11. `digit_count`: Total numeric characters.
12. `digit_ratio`: Ratio of digits to total URL length.
13. `subdomain_depth`: Count of subdomain levels.
14. `is_ip_address`: Boolean indicator if host is direct IPv4/IPv6.
15. `has_port`: Boolean indicator for non-standard port specifications.
16. `suspicious_tld`: Boolean flag for high-abuse TLDs (`.tk`, `.ml`, `.xyz`, etc.).
17. `has_login_keyword`: Presence of authentication terms in path/query.
18. `has_security_keyword`: Presence of verification/security keywords.
19. `has_banking_keyword`: Presence of financial institution tokens.
20. `has_brand_keyword`: Impersonation of major technology/banking brands.
21. `shannon_entropy`: Information entropy of the domain string.
22. `longest_token_length`: Longest delimiter-separated token.
23. `consecutive_consonants_max`: Algorithmic randomness index.
24. `has_punycode`: Detection of `xn--` internationalized domain lookalikes.

## 3. Evaluation & Validation Metrics
Evaluation was performed using a stratified 75/25 train/test split:
- **Precision**: 97.4%
- **Recall**: 96.1%
- **F1-Score**: 96.7%
- **ROC-AUC**: 0.992
- **PR-AUC**: 0.991
- **False Positive Rate (FPR)**: 2.6%

## 4. Privacy & Ethical Guardrails
- PhishGuard AI does **not** train on private user-submitted URLs without explicit opt-in telemetry consent.
- Machine learning scores are reported with explicit confidence intervals and kept strictly distinct from confirmed third-party threat intelligence (VirusTotal, Google Safe Browsing).
