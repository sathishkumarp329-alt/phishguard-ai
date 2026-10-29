/**
 * PhishGuard AI - Browser Extension Background Service Worker (Manifest V3)
 * Automatic Real-Time Phishing Protection for Chrome & Microsoft Edge
 */

const DEFAULT_CONFIG = {
  enabled: true,
  apiBaseUrl: "http://localhost:8000/api/v1",
  riskThreshold: 70, // 0-100 score threshold to block
  sensitivity: "balanced", // strict (50), balanced (70), relaxed (85)
  allowlist: ["google.com", "microsoft.com", "github.com", "apple.com", "amazon.com"],
  stats: {
    scannedCount: 0,
    blockedCount: 0,
    lastDetected: null
  }
};

// In-memory cache for recent checks to prevent redundant API queries
// Key: normalized hostname, Value: { verdict, score, reason, timestamp }
const urlCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Initialize storage settings if not present
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["config", "recentWarnings", "stats"]);
  if (!existing.config) {
    await chrome.storage.local.set({
      config: DEFAULT_CONFIG,
      recentWarnings: [],
      stats: DEFAULT_CONFIG.stats
    });
  }
  console.log("[PhishGuard AI] Extension initialized successfully.");
});

// Fast local heuristics for zero-latency initial screening
function runLocalHeuristicCheck(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    // 1. Check IP address hostnames (common in phishing kits)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(host)) {
      return {
        isSuspicious: true,
        riskScore: 85,
        verdict: "high_risk",
        reason: "Direct IP address host used instead of legitimate domain name."
      };
    }

    // 2. Suspicious high-abuse free TLDs combined with credential paths
    const suspiciousTlds = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".loan"];
    const hasSuspiciousTld = suspiciousTlds.some(tld => host.endsWith(tld));
    const isSensitivePath = /\/(login|signin|verify|update|secure|bank|account|wallet|auth)/i.test(parsed.pathname);

    if (hasSuspiciousTld && isSensitivePath) {
      return {
        isSuspicious: true,
        riskScore: 92,
        verdict: "known_malicious",
        reason: "High-abuse top-level domain hosting sensitive credential authentication path."
      };
    }

    // 3. Known lookalike patterns (e.g., paypa1, micros0ft, goog1e)
    const brandSpoofs = [/paypa[l1]/i, /micros[o0]ft/i, /g[o0]{2}g[l1]e/i, /netfl[i1]x/i, /app[l1]e-id/i];
    for (const pattern of brandSpoofs) {
      if (pattern.test(host) && !host.endsWith("paypal.com") && !host.endsWith("microsoft.com") && !host.endsWith("google.com") && !host.endsWith("netflix.com") && !host.endsWith("apple.com")) {
        return {
          isSuspicious: true,
          riskScore: 95,
          verdict: "known_malicious",
          reason: `Detected brand impersonation pattern matching spoofed organization domain: ${host}`
        };
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Query the backend detection API
async function queryBackendRealtime(targetUrl, apiBaseUrl) {
  const endpoint = `${apiBaseUrl}/scans/realtime-check`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s maximum timeout

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: targetUrl }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      verdict: data.verdict,
      riskScore: data.risk_score,
      reason: data.summary || "Suspicious phishing heuristics identified by PhishGuard AI engine.",
      findings: data.findings || []
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[PhishGuard AI] Backend realtime check failed or timed out:", err.message);
    return null;
  }
}

// Listen to webNavigation before navigation completes
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only monitor top-level frame navigation
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url || typeof url !== "string") return;

  // Ignore internal and local browser schemes
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:") ||
    url.startsWith("file://")
  ) {
    return;
  }

  // Load configuration
  const { config, stats } = await chrome.storage.local.get(["config", "stats"]);
  if (!config || !config.enabled) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return;
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Check allowlist
  if (config.allowlist && config.allowlist.some(item => hostname === item || hostname.endsWith("." + item))) {
    return;
  }

  // Check in-memory cache
  const cached = urlCache.get(hostname);
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    if (cached.blocked) {
      redirectToWarning(details.tabId, url, cached.verdict, cached.riskScore, cached.reason);
    }
    return;
  }

  // Increment scanned count
  if (stats) {
    stats.scannedCount = (stats.scannedCount || 0) + 1;
    await chrome.storage.local.set({ stats });
  }

  // 1. Run local zero-latency heuristic check
  const localResult = runLocalHeuristicCheck(url);
  if (localResult && localResult.isSuspicious) {
    handleMaliciousVerdict(details.tabId, url, hostname, localResult.verdict, localResult.riskScore, localResult.reason);
    return;
  }

  // 2. Query FastAPI Backend Real-Time Endpoint
  const backendResult = await queryBackendRealtime(url, config.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl);
  if (backendResult) {
    const isDangerous =
      backendResult.verdict === "known_malicious" ||
      backendResult.verdict === "high_risk" ||
      backendResult.riskScore >= (config.riskThreshold || 70);

    if (isDangerous) {
      handleMaliciousVerdict(details.tabId, url, hostname, backendResult.verdict, backendResult.riskScore, backendResult.reason);
      return;
    } else {
      // Cache safe verdict
      urlCache.set(hostname, { blocked: false, timestamp: now });
    }
  }
});

// Helper to handle malicious verdict: cache, record warning, and redirect
async function handleMaliciousVerdict(tabId, targetUrl, hostname, verdict, riskScore, reason) {
  urlCache.set(hostname, {
    blocked: true,
    verdict,
    riskScore,
    reason,
    timestamp: Date.now()
  });

  // Record warning event
  const { recentWarnings, stats } = await chrome.storage.local.get(["recentWarnings", "stats"]);
  const warningsList = recentWarnings || [];
  const newWarning = {
    id: Date.now().toString(),
    url: targetUrl,
    hostname,
    verdict,
    riskScore,
    reason,
    timestamp: new Date().toISOString()
  };

  // Keep last 30 warnings
  warningsList.unshift(newWarning);
  if (warningsList.length > 30) warningsList.pop();

  const updatedStats = stats || {};
  updatedStats.blockedCount = (updatedStats.blockedCount || 0) + 1;
  updatedStats.lastDetected = newWarning;

  await chrome.storage.local.set({
    recentWarnings: warningsList,
    stats: updatedStats
  });

  redirectToWarning(tabId, targetUrl, verdict, riskScore, reason);
}

// Redirect tab to full-page warning
function redirectToWarning(tabId, targetUrl, verdict, riskScore, reason) {
  const warningUrl = chrome.runtime.getURL(
    `warning/warning.html?url=${encodeURIComponent(targetUrl)}&verdict=${encodeURIComponent(verdict)}&score=${encodeURIComponent(riskScore)}&reason=${encodeURIComponent(reason)}`
  );
  chrome.tabs.update(tabId, { url: warningUrl });
}

// Handle messages from popup / options / warning pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    chrome.storage.local.get(["config", "stats", "recentWarnings"], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === "TOGGLE_PROTECTION") {
    chrome.storage.local.get("config", (data) => {
      const config = data.config || DEFAULT_CONFIG;
      config.enabled = message.enabled;
      chrome.storage.local.set({ config }, () => {
        sendResponse({ success: true, enabled: config.enabled });
      });
    });
    return true;
  }

  if (message.type === "ADD_TO_ALLOWLIST") {
    chrome.storage.local.get("config", (data) => {
      const config = data.config || DEFAULT_CONFIG;
      if (!config.allowlist.includes(message.domain)) {
        config.allowlist.push(message.domain);
        chrome.storage.local.set({ config }, () => {
          // Clear cached blocked status for this domain
          urlCache.delete(message.domain);
          sendResponse({ success: true, allowlist: config.allowlist });
        });
      } else {
        sendResponse({ success: true, allowlist: config.allowlist });
      }
    });
    return true;
  }

  if (message.type === "CLEAR_CACHE") {
    urlCache.clear();
    sendResponse({ success: true });
    return true;
  }
});
