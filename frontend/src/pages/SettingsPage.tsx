import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { scanApi, authApi } from '@/services/api';
import {
  Settings,
  Shield,
  Eye,
  Sliders,
  Trash2,
  Moon,
  Laptop,
  CheckCircle,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [telemetryOptIn, setTelemetryOptIn] = useState(true);
  const [anonymizeUrls, setAnonymizeUrls] = useState(false);
  const [autoTraceRedirects, setAutoTraceRedirects] = useState(true);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [clearHistoryModalOpen, setClearHistoryModalOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const handleSavePreferences = () => {
    // Save to localStorage or backend preferences
    localStorage.setItem(
      'phishguard_preferences',
      JSON.stringify({ telemetryOptIn, anonymizeUrls, autoTraceRedirects })
    );
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleClearHistory = async () => {
    setClearLoading(true);
    try {
      await scanApi.clearHistory();
      setClearHistoryModalOpen(false);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 4000);
    } catch {
      // Handle error
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b40] border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-1">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Operational Configuration</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Security & Settings</h1>
          <p className="text-sm text-gray-400">
            Control privacy boundaries, telemetry sharing, theme preferences, and active authentication sessions.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Preferences saved successfully.</span>
          </div>
        )}

        {clearSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>All historical scan records have been purged.</span>
          </div>
        )}

        {/* Threat Intelligence & Privacy Preferences */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-[#1e2456] pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Inspection & Privacy Preferences</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Configure how our heuristic scanning engine treats target endpoints and telemetry data.
            </p>
          </div>

          <div className="space-y-4">
            {/* Toggle 1: Auto trace redirects */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-[#0d1137] border border-[#1e2456]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Auto-Follow Redirection Chains</p>
                <p className="text-xs text-gray-400">
                  Automatically trace multi-hop URL forwardings up to 10 redirects to unveil concealed landing destinations.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={autoTraceRedirects}
                  onChange={(e) => setAutoTraceRedirects(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#161b40] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
              </label>
            </div>

            {/* Toggle 2: Anonymize target URLs */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-[#0d1137] border border-[#1e2456]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Anonymize Target URLs in Shared Reports</p>
                <p className="text-xs text-gray-400">
                  Mask sensitive user query tokens (e.g. email parameters, token hashes) when generating shareable links.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={anonymizeUrls}
                  onChange={(e) => setAnonymizeUrls(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#161b40] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
              </label>
            </div>

            {/* Toggle 3: Telemetry sharing */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-[#0d1137] border border-[#1e2456]">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Contribute Anonymous Threat Telemetry</p>
                <p className="text-xs text-gray-400">
                  Share anonymized domain fingerprints to help community zero-trust feeds defend against fresh phishing kits.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={telemetryOptIn}
                  onChange={(e) => setTelemetryOptIn(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#161b40] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </div>
        </Card>

        {/* Display & Theme Preferences */}
        <Card className="p-6 space-y-4">
          <div className="border-b border-[#1e2456] pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Moon className="w-4 h-4 text-cyan-400" />
              <span>Theme & Interface</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              PhishGuard AI is hardwired with high-contrast, eye-protective dark cybersecurity styling.
            </p>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0d1137] border border-[#1e2456]">
            <div>
              <p className="text-sm font-semibold text-white">Cybersecurity Dark Mode</p>
              <p className="text-xs text-gray-400">Deep navy backdrop (#0a0e27) with cyan & violet luminescence</p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#161b40] border border-cyan-500/30 text-cyan-300">
              Active Default
            </span>
          </div>
        </Card>

        {/* Data & History Management */}
        <Card className="p-6 space-y-4">
          <div className="border-b border-[#1e2456] pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-cyan-400" />
              <span>Data Retention</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Purge your telemetry history and cached forensic records.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl bg-[#0d1137] border border-[#1e2456]">
            <div>
              <p className="text-sm font-semibold text-white">Purge All Scan Records</p>
              <p className="text-xs text-gray-400">
                Immediately clear all single URL and batch scan history from database storage.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearHistoryModalOpen(true)}
              className="text-red-400 hover:text-red-300 border-red-900/40 hover:border-red-600"
            >
              Clear All Scans
            </Button>
          </div>
        </Card>

        {/* Active Session Management */}
        <Card className="p-6 space-y-4">
          <div className="border-b border-[#1e2456] pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span>Session Management</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Manage your current authenticated session and security cookie status.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0d1137] border border-[#1e2456] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-white">Current Browser Session</p>
                <p className="text-[11px] text-gray-400 font-mono">
                  httpOnly Cookie &bull; SameSite=Lax &bull; Secure Encrypted
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400">Active Now</span>
          </div>
        </Card>

        {/* Clear History Confirmation Modal */}
        <Modal
          isOpen={clearHistoryModalOpen}
          onClose={() => setClearHistoryModalOpen(false)}
          title="Confirm History Purge"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-300">
              Are you sure you want to permanently delete all scan records? This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setClearHistoryModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={clearLoading}
                onClick={handleClearHistory}
              >
                Purge History
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
