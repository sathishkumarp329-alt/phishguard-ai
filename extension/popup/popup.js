/**
 * PhishGuard AI - Extension Popup Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  const shieldToggle = document.getElementById("shieldToggle");
  const statusDot = document.getElementById("statusDot");
  const statusTitle = document.getElementById("statusTitle");
  const statusSubtitle = document.getElementById("statusSubtitle");
  const statChecked = document.getElementById("statChecked");
  const statBlocked = document.getElementById("statBlocked");
  const recentList = document.getElementById("recentList");
  const quickScanInput = document.getElementById("quickScanInput");
  const btnQuickScan = document.getElementById("btnQuickScan");
  const quickScanResult = document.getElementById("quickScanResult");
  const quickVerdict = document.getElementById("quickVerdict");
  const quickScore = document.getElementById("quickScore");
  const quickReason = document.getElementById("quickReason");
  const btnOpenOptions = document.getElementById("btnOpenOptions");
  const btnOpenDashboard = document.getElementById("btnOpenDashboard");

  // Load state from background / storage
  chrome.storage.local.get(["config", "stats", "recentWarnings"], (data) => {
    const config = data.config || { enabled: true };
    const stats = data.stats || { scannedCount: 0, blockedCount: 0 };
    const recentWarnings = data.recentWarnings || [];

    // Set toggle state
    shieldToggle.checked = config.enabled;
    updateStatusUI(config.enabled);

    // Set stats
    statChecked.textContent = stats.scannedCount || 0;
    statBlocked.textContent = stats.blockedCount || 0;

    // Render recent alerts
    renderRecentWarnings(recentWarnings);
  });

  // Handle Shield Toggle
  shieldToggle.addEventListener("change", (e) => {
    const isEnabled = e.target.checked;
    updateStatusUI(isEnabled);

    chrome.runtime.sendMessage({
      type: "TOGGLE_PROTECTION",
      enabled: isEnabled
    });
  });

  function updateStatusUI(enabled) {
    if (enabled) {
      statusDot.className = "status-indicator active";
      statusTitle.textContent = "Real-Time Shield: ACTIVE";
      statusSubtitle.textContent = "Intercepting threats before navigation";
    } else {
      statusDot.className = "status-indicator";
      statusTitle.textContent = "Real-Time Shield: PAUSED";
      statusSubtitle.textContent = "Protection is currently disabled";
    }
  }

  function renderRecentWarnings(warnings) {
    if (!warnings || warnings.length === 0) {
      recentList.innerHTML = '<div class="empty-state">No malicious destinations intercepted recently. Safe browsing!</div>';
      return;
    }

    recentList.innerHTML = warnings.slice(0, 5).map(item => `
      <div class="recent-item">
        <span class="recent-host" title="${item.url}">${item.hostname || item.url}</span>
        <span class="result-badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">
          ${item.verdict === 'known_malicious' ? 'Malicious' : 'High Risk'}
        </span>
      </div>
    `).join("");
  }

  // Quick Scan
  btnQuickScan.addEventListener("click", async () => {
    const url = quickScanInput.value.trim();
    if (!url) return;

    btnQuickScan.textContent = "...";
    btnQuickScan.disabled = true;

    try {
      const data = await chrome.storage.local.get("config");
      const apiBase = data.config?.apiBaseUrl || "http://localhost:8000/api/v1";

      const res = await fetch(`${apiBase}/scans/realtime-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        throw new Error("Scan request failed");
      }

      const result = await res.json();
      quickScanResult.classList.remove("hidden");
      quickVerdict.textContent = result.verdict.toUpperCase().replace(/_/g, " ");
      quickScore.textContent = `Risk: ${result.risk_score}/100`;
      quickReason.textContent = result.summary || "Forensic analysis completed.";

      if (result.risk_score >= 70) {
        quickVerdict.style.background = "rgba(239, 68, 68, 0.2)";
        quickVerdict.style.color = "#ef4444";
      } else if (result.risk_score >= 40) {
        quickVerdict.style.background = "rgba(234, 179, 8, 0.2)";
        quickVerdict.style.color = "#eab308";
      } else {
        quickVerdict.style.background = "rgba(16, 185, 129, 0.2)";
        quickVerdict.style.color = "#10b981";
      }
    } catch (err) {
      quickScanResult.classList.remove("hidden");
      quickVerdict.textContent = "CHECK FAILED";
      quickScore.textContent = "-";
      quickReason.textContent = "Unable to reach PhishGuard AI detection engine. Ensure backend is running.";
      quickVerdict.style.background = "rgba(100, 116, 139, 0.2)";
      quickVerdict.style.color = "#94a3b8";
    } finally {
      btnQuickScan.textContent = "Scan";
      btnQuickScan.disabled = false;
    }
  });

  // Settings / Options
  btnOpenOptions.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Open Dashboard
  btnOpenDashboard.addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:5173/dashboard" });
  });
});
