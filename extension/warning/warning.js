/**
 * PhishGuard AI - Warning Page Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Extract query params
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get("url") || "Unknown Target URL";
  const verdict = params.get("verdict") || "high_risk";
  const score = params.get("score") || "85";
  const reason = params.get("reason") || "Suspicious phishing heuristics identified by PhishGuard AI.";

  let hostname = "";
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    hostname = targetUrl;
  }

  // 2. Populate UI values
  const websiteUrlEl = document.getElementById("websiteUrl");
  const detectionReasonEl = document.getElementById("detectionReason");
  const riskBadgeEl = document.getElementById("riskBadge");
  const detailScoreEl = document.getElementById("detailScore");
  const detailVerdictEl = document.getElementById("detailVerdict");
  const detailHostEl = document.getElementById("detailHost");
  const reportUrlEl = document.getElementById("reportUrl");

  if (websiteUrlEl) websiteUrlEl.textContent = targetUrl;
  if (detectionReasonEl) detectionReasonEl.textContent = reason;
  if (detailScoreEl) detailScoreEl.textContent = `${score} / 100`;
  if (detailHostEl) detailHostEl.textContent = hostname;
  if (reportUrlEl) reportUrlEl.textContent = hostname;

  // Format verdict display
  const verdictMap = {
    known_malicious: "Phishing (Known Malicious)",
    high_risk: "Phishing (High Risk)",
    suspicious: "Suspicious Risk Detected",
    unable_to_verify: "Potential Unverified Risk"
  };
  const verdictText = verdictMap[verdict] || "Phishing (High Risk)";
  if (riskBadgeEl) riskBadgeEl.textContent = verdictText;
  if (detailVerdictEl) detailVerdictEl.textContent = verdictText;

  // 3. Button: Return to Safety
  const btnReturnSafety = document.getElementById("btnReturnSafety");
  if (btnReturnSafety) {
    btnReturnSafety.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "https://www.google.com";
      }
    });
  }

  // 4. Button: View Detection Details
  const btnViewDetails = document.getElementById("btnViewDetails");
  const detailsPanel = document.getElementById("detailsPanel");
  if (btnViewDetails && detailsPanel) {
    btnViewDetails.addEventListener("click", () => {
      const isHidden = detailsPanel.classList.contains("hidden");
      if (isHidden) {
        detailsPanel.classList.remove("hidden");
        btnViewDetails.innerHTML = '<span class="btn-icon">▲</span> Hide Details';
      } else {
        detailsPanel.classList.add("hidden");
        btnViewDetails.innerHTML = '<span class="btn-icon">📋</span> View Detection Details';
      }
    });
  }

  // 5. Button: Report a Mistake Modal
  const btnReportMistake = document.getElementById("btnReportMistake");
  const mistakeModal = document.getElementById("mistakeModal");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const btnSubmitReport = document.getElementById("btnSubmitReport");

  if (btnReportMistake && mistakeModal) {
    btnReportMistake.addEventListener("click", () => {
      mistakeModal.classList.remove("hidden");
    });
  }

  if (btnCloseModal && mistakeModal) {
    btnCloseModal.addEventListener("click", () => {
      mistakeModal.classList.add("hidden");
    });
  }

  if (btnSubmitReport) {
    btnSubmitReport.addEventListener("click", async () => {
      const comment = document.getElementById("feedbackComment")?.value || "";
      btnSubmitReport.textContent = "Submitting...";
      btnSubmitReport.disabled = true;

      try {
        // Forward to background or backend feedback API
        chrome.runtime.sendMessage({
          type: "REPORT_FEEDBACK",
          url: targetUrl,
          comment
        });
      } catch (e) {
        console.warn("Feedback broadcast note:", e);
      }

      alert("Thank you! Your feedback has been forwarded to PhishGuard threat analysis.");
      mistakeModal.classList.add("hidden");
      btnSubmitReport.textContent = "Submit Feedback";
      btnSubmitReport.disabled = false;
    });
  }

  // 6. Action: Proceed Anyway (Bypass Block)
  const btnBypass = document.getElementById("btnBypass");
  if (btnBypass) {
    btnBypass.addEventListener("click", () => {
      const confirmed = confirm("WARNING: This website has confirmed malicious phishing indicators. Are you sure you wish to bypass PhishGuard AI protection?");
      if (confirmed) {
        window.location.replace(targetUrl);
      }
    });
  }

  // 7. Action: Always Allow this Domain
  const btnAllowlistDomain = document.getElementById("btnAllowlistDomain");
  if (btnAllowlistDomain) {
    btnAllowlistDomain.addEventListener("click", () => {
      if (!hostname) return;
      chrome.runtime.sendMessage(
        { type: "ADD_TO_ALLOWLIST", domain: hostname },
        (res) => {
          alert(`Added "${hostname}" to your PhishGuard AI trusted allowlist.`);
          window.location.replace(targetUrl);
        }
      );
    });
  }
});
