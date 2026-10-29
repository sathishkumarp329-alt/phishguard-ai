# PhishGuard AI — Android Protection Architecture & Roadmap

## 1. Executive Summary
Phishing threats on mobile environments (Android phones and tablets) primarily arrive through SMS (smishing), messaging apps (WhatsApp, Telegram), social media, and QR codes.

PhishGuard AI provides a tiered, privacy-preserving mobile defense strategy:
1. **Tier 1 (Implemented)**: High-performance Progressive Web App (PWA) with responsive mobile layouts (375px+ touch targets, dark theme, and mobile navigation).
2. **Tier 2 (Integrated Workflow)**: Android Share-to-Scan Native Intent integration.
3. **Tier 3 (Advanced Real-Time Protection)**: Local Loopback VPN / Encrypted DNS (DoH/DoT) Filtering Service.

---

## 2. Platform Realities & Security Constraints
> [!IMPORTANT]
> A standard website or PWA **cannot** intercept system-wide network packets or inspect URLs opened inside third-party apps without specialized OS platform integration and explicit user permissions.

### Constraints & Mitigations:
- **No HTTPS Man-In-The-Middle**: PhishGuard AI rejects installing root CA certificates to decrypt user TLS traffic. Intercepting encrypted user traffic introduces severe privacy risks, breaks certificate pinning, and violates user trust.
- **Battery & Performance Efficiency**: Deep packet inspection on-device consumes significant CPU and battery. Our design relies on lightweight DNS query filtering and intent-based asynchronous scanning.
- **No Background Surveillance**: Browsing history is never silently gathered or uploaded to central servers.

---

## 3. Tier 1: Progressive Web App (PWA) Implementation
The PhishGuard AI frontend is engineered mobile-first:
- Viewport scaling: `width=device-width, initial-scale=1.0`
- Touch targets strictly exceed 44px minimum for accessibility.
- Zero horizontal overflow across all resolution breakpoints (375px, 768px, 1024px, 1440px).
- Bottom sheet drawer and floating action buttons for one-handed thumb navigation.

---

## 4. Tier 2: Android Share-to-Scan Integration (Kotlin / Jetpack Compose)

### Architecture
The Android client registers an `ACTION_SEND` intent filter for `text/plain` and image MIME types. When a user highlights or shares any suspicious link from Gmail, WhatsApp, or Chrome:

```xml
<activity android:name=".ui.ScanIntentActivity"
    android:exported="true"
    android:theme="@style/Theme.PhishGuard.Transparent">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="image/*" />
    </intent-filter>
</activity>
```

### User Workflow
1. User taps "Share" on any link or QR code image.
2. Selects **PhishGuard AI** from Android share sheet.
3. A lightweight floating overlay pops up displaying instant verdict (<500ms):
   - **Safe**: Tap to proceed to browser.
   - **High Risk / Malicious**: Warning modal blocks navigation and displays detected threat vectors.

---

## 5. Tier 3: System-Wide Real-Time Interception (VpnService)

For users demanding automatic protection across all Android applications:

### Approach: Local Android `VpnService` with DNS Filtering
- Uses Android's official `android.net.VpnService` API.
- Runs an on-device local TUN interface that only inspects outgoing **DNS UDP/DoH queries**.
- Checks queried domains against:
  1. On-device local bloom filter of high-risk phishing domains.
  2. PhishGuard AI fast real-time lookup endpoint (`POST /api/v1/scans/realtime-check`).
- If domain is flagged: returns NXDOMAIN or redirects to local warning loopback page (`127.0.0.1:8080/warning`).
- **Zero TLS Interception**: All HTTPS payloads pass through untouched.

---

## 6. Development & Deployment Roadmap

| Phase | Milestone | Tech Stack | Status |
|---|---|---|---|
| **Phase 1** | Responsive Mobile Web App & PWA | React 18, Tailwind, Vite | **Done** |
| **Phase 2** | Android Share-to-Scan Native App | Kotlin, Jetpack Compose, Retrofit | Planned |
| **Phase 3** | Android Firefox Extension Integration | Manifest V3 WebExtensions | Ready for deployment |
| **Phase 4** | System-Wide DNS Protection VPN | Android VpnService, Rust TUN engine | Architectural Review |
