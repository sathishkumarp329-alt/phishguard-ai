/**
 * PhishGuard AI - Extension Options Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  const apiBaseUrlInput = document.getElementById("apiBaseUrl");
  const newDomainInput = document.getElementById("newDomainInput");
  const btnAddDomain = document.getElementById("btnAddDomain");
  const allowlistContainer = document.getElementById("allowlistContainer");
  const btnClearCache = document.getElementById("btnClearCache");
  const cacheClearedNotice = document.getElementById("cacheClearedNotice");
  const btnSaveSettings = document.getElementById("btnSaveSettings");
  const saveNotice = document.getElementById("saveNotice");

  let currentAllowlist = [];

  // Load current settings
  chrome.storage.local.get("config", (data) => {
    const config = data.config || {};
    apiBaseUrlInput.value = config.apiBaseUrl || "http://localhost:8000/api/v1";
    currentAllowlist = config.allowlist || ["google.com", "microsoft.com", "github.com", "apple.com", "amazon.com"];

    // Set radio sensitivity
    const threshold = config.riskThreshold || 70;
    const radios = document.getElementsByName("sensitivity");
    for (const r of radios) {
      if (parseInt(r.value, 10) === threshold) {
        r.checked = true;
      }
    }

    renderAllowlist();
  });

  function renderAllowlist() {
    allowlistContainer.innerHTML = currentAllowlist.map(domain => `
      <div class="allowlist-pill">
        <span>${domain}</span>
        <button class="remove-btn" data-domain="${domain}" title="Remove domain">✕</button>
      </div>
    `).join("");

    // Attach remove listeners
    document.querySelectorAll(".remove-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const domToRemove = e.target.getAttribute("data-domain");
        currentAllowlist = currentAllowlist.filter(d => d !== domToRemove);
        renderAllowlist();
      });
    });
  }

  // Add domain
  btnAddDomain.addEventListener("click", () => {
    let domain = newDomainInput.value.trim().toLowerCase();
    if (!domain) return;
    try {
      if (domain.startsWith("http://") || domain.startsWith("https://")) {
        domain = new URL(domain).hostname;
      }
    } catch {}

    if (!currentAllowlist.includes(domain)) {
      currentAllowlist.push(domain);
      renderAllowlist();
      newDomainInput.value = "";
    }
  });

  // Clear cache
  btnClearCache.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => {
      cacheClearedNotice.classList.remove("hidden");
      setTimeout(() => cacheClearedNotice.classList.add("hidden"), 3000);
    });
  });

  // Save Settings
  btnSaveSettings.addEventListener("click", () => {
    let selectedThreshold = 70;
    const radios = document.getElementsByName("sensitivity");
    for (const r of radios) {
      if (r.checked) {
        selectedThreshold = parseInt(r.value, 10);
        break;
      }
    }

    chrome.storage.local.get("config", (data) => {
      const config = data.config || {};
      config.apiBaseUrl = apiBaseUrlInput.value.trim() || "http://localhost:8000/api/v1";
      config.riskThreshold = selectedThreshold;
      config.allowlist = currentAllowlist;

      chrome.storage.local.set({ config }, () => {
        saveNotice.classList.remove("hidden");
        setTimeout(() => saveNotice.classList.add("hidden"), 3000);
      });
    });
  });
});
