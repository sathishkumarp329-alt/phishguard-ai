import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { scanApi } from '@/services/api';
import { Scan, ScanFinding } from '@/types';
import { isValidUrl, getRiskScoreColor, getRiskScoreBg } from '@/utils/helpers';
import {
  Search,
  Globe,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Loader2,
  ExternalLink,
  Layers,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';

export const ScanUrlPage: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<Scan | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();

    if (!trimmed) {
      setError('Please provide a URL to inspect');
      return;
    }

    if (!isValidUrl(trimmed)) {
      setError('Please enter a valid URL with hostname (e.g. https://target-domain.com/path)');
      return;
    }

    const formattedUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    setLoading(true);
    setScanResult(null);

    try {
      const data = await scanApi.scanUrl(formattedUrl);
      setScanResult(data);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        errorObj?.response?.data?.detail ||
        errorObj?.response?.data?.message ||
        'Scan failed. The target host could not be evaluated or network timed out.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (scanResult?.url) {
      navigator.clipboard.writeText(scanResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Group findings by category
  const groupedFindings: Record<string, ScanFinding[]> = {};
  if (scanResult?.findings) {
    scanResult.findings.forEach((f) => {
      const cat = f.category || 'General Telemetry';
      if (!groupedFindings[cat]) {
        groupedFindings[cat] = [];
      }
      groupedFindings[cat].push(f);
    });
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        {/* Page Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b40] border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-1">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dedicated Target Scanner</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Inspect Suspicious URL</h1>
          <p className="text-sm text-gray-400">
            Deconstruct hostname structure, detect typo-squatting, and cross-reference threat databases.
          </p>
        </div>

        {/* Input Card */}
        <Card className="p-6 bg-[#161b40] border border-[#1e2456] shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="url-input" className="block text-sm font-semibold text-gray-200">
                Target URL or Domain
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-cyan-400 pointer-events-none">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  id="url-input"
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="https://paypal-account-verification-notice.com/update"
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#0d1137] border-2 border-[#1e2456] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 text-white placeholder-gray-500 font-mono text-sm sm:text-base outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-gray-500" />
                Never loads un-sandboxed executable scripts or cookies from remote domains.
              </span>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon={<Search className="w-5 h-5" />}
                className="w-full sm:w-auto font-semibold px-8"
              >
                {loading ? 'Evaluating Heuristics...' : 'Execute Full Scan'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Loading State Banner */}
        {loading && (
          <div className="p-8 rounded-2xl bg-[#161b40] border border-cyan-500/30 flex flex-col items-center justify-center text-center space-y-4 animate-pulse-slow">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Inspecting Threat Vectors</h3>
              <p className="text-xs text-gray-400 font-mono">
                Running DNS checks &bull; Querying reputation feeds &bull; Parsing lexical patterns
              </p>
            </div>
          </div>
        )}

        {/* Scan Results Display */}
        {scanResult && !loading && (
          <div className="space-y-6 animate-slideUp">
            {/* Verdict Header Banner */}
            <div className="p-6 rounded-2xl bg-[#161b40] border border-[#1e2456] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono text-gray-400">Target Inspected:</span>
                  <button
                    onClick={handleCopyUrl}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-base sm:text-lg font-mono text-cyan-300 break-all font-semibold">
                  {scanResult.url}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                  <span>Host: {scanResult.hostname || 'Analyzed Host'}</span>
                  <span>&bull;</span>
                  <span>Latency: {scanResult.scan_duration_ms || '< 1s'} ms</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge verdict={scanResult.verdict} size="md" />
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xs text-gray-400">Risk Score:</span>
                  <span className={`text-2xl font-black ${getRiskScoreColor(scanResult.risk_score)}`}>
                    {scanResult.risk_score}
                  </span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
              </div>
            </div>

            {/* Findings Grouped by Category */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <span>Forensic Signals Flagged ({scanResult.findings?.length || 0})</span>
              </h2>

              {Object.keys(groupedFindings).length === 0 ? (
                <Card className="p-8 text-center text-gray-400">
                  <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">No Threat Indicators Triggered</p>
                  <p className="text-xs mt-1">
                    No suspicious patterns, known blacklists, or deceptive homoglyphs matched this domain.
                  </p>
                </Card>
              ) : (
                Object.entries(groupedFindings).map(([category, findings]) => (
                  <Card key={category} className="p-5 space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 border-b border-[#1e2456] pb-2">
                      Category: {category} ({findings.length})
                    </h3>
                    <div className="space-y-2.5">
                      {findings.map((f) => (
                        <div
                          key={f.id}
                          className="p-3 rounded-xl bg-[#0d1137] border border-[#1e2456] flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge severity={f.severity} size="sm" />
                              <span className="text-sm font-semibold text-white">{f.title}</span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">{f.description}</p>
                          </div>
                          <span className="text-[10px] font-mono text-gray-500 uppercase shrink-0">
                            Source: {f.source}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#1e2456]">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setUrl('');
                  setScanResult(null);
                }}
              >
                Scan Another URL
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(`/scan/${scanResult.id}`)}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Open Full Forensic Report & Evidence
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ScanUrlPage;
