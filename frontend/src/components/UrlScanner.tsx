import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanApi } from '@/services/api';
import { Scan } from '@/types';
import { isValidUrl, getRiskScoreColor, getRiskScoreBg } from '@/utils/helpers';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Search, AlertCircle, ArrowRight, ShieldCheck, ShieldAlert, ExternalLink, Globe } from 'lucide-react';

export interface UrlScannerProps {
  compact?: boolean;
  onScanComplete?: (scan: Scan) => void;
  className?: string;
  placeholder?: string;
}

export const UrlScanner: React.FC<UrlScannerProps> = ({
  compact = false,
  onScanComplete,
  className = '',
  placeholder = 'Paste suspicious URL to analyze (e.g. https://secure-login.update-banking.com)...',
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Scan | null>(null);
  const navigate = useNavigate();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();

    if (!trimmed) {
      setError('Please enter a website URL to scan');
      return;
    }

    if (!isValidUrl(trimmed)) {
      setError('Please enter a valid URL with domain (e.g. https://example.com/path)');
      return;
    }

    // Ensure scheme is present for analysis
    const formattedUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    setLoading(true);
    setResult(null);

    try {
      const scanData = await scanApi.scanUrl(formattedUrl);
      setResult(scanData);
      if (onScanComplete) {
        onScanComplete(scanData);
      }
    } catch (err: unknown) {
      // If unauthenticated (e.g. landing page preview), fallback to realtimeCheck
      try {
        const preview = await scanApi.realtimeCheck(formattedUrl);
        const previewScan: Scan = {
          id: 'preview',
          user_id: '',
          url: formattedUrl,
          normalized_url: formattedUrl,
          hostname: preview.hostname || trimmed,
          status: 'completed',
          verdict: preview.verdict,
          risk_score: preview.risk_score,
          scan_type: 'url',
          scan_duration_ms: 85,
          created_at: new Date().toISOString(),
          findings: (preview.findings || []).map((f: any, idx: number) => ({
            id: `f-${idx}`,
            category: f.category || 'url_structure',
            title: f.title,
            description: f.description,
            severity: f.severity || 'medium',
            source: 'phishguard_heuristics',
            created_at: new Date().toISOString(),
          })),
        };
        setResult(previewScan);
        if (onScanComplete) {
          onScanComplete(previewScan);
        }
      } catch (fallbackErr: unknown) {
        const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
        const message =
          errorObj?.response?.data?.detail ||
          errorObj?.response?.data?.message ||
          'Unable to complete analysis. Please verify the URL and try again.';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUrl('');
    setResult(null);
    setError(null);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Scan Input Form */}
      <form onSubmit={handleScan} className="relative w-full">
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-2xl bg-[#0d1137] border-2 border-[#1e2456] focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 shadow-xl transition-all p-1.5 sm:p-2 gap-2">
          <div className="flex items-center flex-1 px-3 py-1">
            <Globe className="w-5 h-5 text-cyan-400 shrink-0 mr-3" />
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder={placeholder}
              disabled={loading}
              className="w-full bg-transparent text-white placeholder-gray-500 text-sm sm:text-base outline-none font-mono"
              aria-label="URL to scan"
            />
            {url && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 font-mono transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size={compact ? 'sm' : 'md'}
            loading={loading}
            icon={<Search className="w-4 h-4" />}
            className="sm:w-auto w-full font-semibold"
          >
            {loading ? 'Inspecting Threat...' : 'Analyze URL'}
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Result Display Box */}
      {result && (
        <div className="mt-4 p-5 rounded-2xl bg-[#161b40] border border-[#1e2456] shadow-xl animate-slideUp space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e2456]">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-mono text-gray-400">
                Target Evaluated
              </span>
              <p className="font-mono text-sm text-cyan-200 break-all">{result.url}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge verdict={result.verdict} size="md" />
            </div>
          </div>

          {/* Risk Score & Quick Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#0d1137] border border-[#1e2456] flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-navy-800 text-cyan-400">
                {result.risk_score >= 60 ? (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase font-mono">Risk Index</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-extrabold ${getRiskScoreColor(result.risk_score)}`}>
                    {result.risk_score}
                  </span>
                  <span className="text-xs text-gray-400">/ 100</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0d1137] border border-[#1e2456]">
              <p className="text-[11px] text-gray-400 uppercase font-mono">Detection Findings</p>
              <p className="text-xl font-bold text-white mt-1">
                {result.findings?.length || 0}{' '}
                <span className="text-xs font-normal text-gray-400">signals flagged</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0d1137] border border-[#1e2456]">
              <p className="text-[11px] text-gray-400 uppercase font-mono">Scan Latency</p>
              <p className="text-xl font-bold text-white mt-1">
                {result.scan_duration_ms ? `${result.scan_duration_ms} ms` : '< 1s'}
              </p>
            </div>
          </div>

          {/* Key Findings List Preview */}
          {result.findings && result.findings.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
                Key Security Indicators:
              </p>
              <div className="space-y-2">
                {result.findings.slice(0, 3).map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-lg bg-[#0d1137] border border-[#1e2456] flex items-start gap-2.5 text-xs text-gray-300"
                  >
                    <Badge severity={f.severity} size="sm" showIcon={false} />
                    <div className="flex-1">
                      <span className="font-semibold text-white">{f.title}: </span>
                      <span>{f.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action to view deep report */}
          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              onClick={() => {
                if (result.id === 'preview') {
                  navigate(`/login?redirect=${encodeURIComponent('/scan')}`);
                } else {
                  navigate(`/scan/${result.id}`);
                }
              }}
            >
              Full Detailed Forensic Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlScanner;
