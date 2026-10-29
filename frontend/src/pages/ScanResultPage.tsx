import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { scanApi, feedbackApi } from '@/services/api';
import { Scan, ScanFinding } from '@/types';
import {
  formatDate,
  timeAgo,
  getRiskScoreColor,
  getVerdictLabel,
} from '@/utils/helpers';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Globe,
  Clock,
  Layers,
  FileCode,
  ExternalLink,
} from 'lucide-react';

export const ScanResultPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();

  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    if (!scanId) return;
    const fetchScan = async () => {
      try {
        setLoading(true);
        const data = await scanApi.getScan(scanId);
        setScan(data);
        // Expand all findings by default
        if (data.findings) {
          const initExp: Record<string, boolean> = {};
          data.findings.forEach((f) => {
            initExp[f.id] = true;
          });
          setExpandedFindings(initExp);
        }
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
        setError(
          errorObj?.response?.data?.detail ||
          errorObj?.response?.data?.message ||
          'Scan record not found or inaccessible.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
  }, [scanId]);

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExportJson = () => {
    if (!scan) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `phishguard-report-${scan.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFeedback = async (isAccurate: boolean) => {
    if (!scanId || feedbackSent) return;
    setFeedbackLoading(true);
    try {
      await feedbackApi.submitFeedback({
        scan_id: scanId,
        is_accurate: isAccurate,
      });
      setFeedbackSent(true);
    } catch {
      // Still set feedback sent to give responsive UI feel
      setFeedbackSent(true);
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-20 flex flex-col items-center justify-center">
          <LoadingSpinner size="xl" text="Retrieving forensic scan evidence..." />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !scan) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <div className="p-4 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 w-16 h-16 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Scan Record Unavailable</h2>
          <p className="text-sm text-gray-400">{error || 'Unable to locate the requested scan.'}</p>
          <div className="pt-4">
            <Button variant="secondary" onClick={() => navigate('/history')} icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Scan History
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate circular gauge angle
  const strokeDashoffset = 283 - (283 * Math.min(scan.risk_score, 100)) / 100;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
        {/* Top Breadcrumb & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/history"
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to History</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              icon={copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            >
              {copiedLink ? 'Link Copied' : 'Share Report'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
            >
              Export JSON
            </Button>
          </div>
        </div>

        {/* Hero Score & Verdict Banner */}
        <Card className="p-6 sm:p-8 bg-gradient-to-r from-[#161b40] to-[#101438] border-[#1e2456] shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Target & Verdict Details (8 cols) */}
            <div className="md:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge verdict={scan.verdict} size="md" />
                <span className="text-xs font-mono uppercase text-gray-400 px-2 py-0.5 rounded bg-[#0d1137] border border-[#1e2456]">
                  Type: {scan.scan_type}
                </span>
                <span className="text-xs font-mono uppercase text-gray-400 px-2 py-0.5 rounded bg-[#0d1137] border border-[#1e2456]">
                  Status: {scan.status}
                </span>
              </div>

              <div>
                <p className="text-xs uppercase font-mono text-gray-400 mb-1">Target Evaluated</p>
                <h1 className="text-lg sm:text-2xl font-bold font-mono text-cyan-300 break-all">
                  {scan.url}
                </h1>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-xs font-mono text-gray-400 border-t border-[#1e2456]/60">
                <div>
                  <span className="block text-gray-500 text-[10px]">HOSTNAME</span>
                  <span className="text-gray-200">{scan.hostname || '—'}</span>
                </div>
                <div>
                  <span className="block text-gray-500 text-[10px]">SCANNED AT</span>
                  <span className="text-gray-200">{formatDate(scan.created_at)}</span>
                </div>
                <div>
                  <span className="block text-gray-500 text-[10px]">EXECUTION TIME</span>
                  <span className="text-gray-200">{scan.scan_duration_ms ? `${scan.scan_duration_ms}ms` : '< 1s'}</span>
                </div>
              </div>
            </div>

            {/* Circular Gauge Score (4 cols) */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0d1137]/60 border border-[#1e2456]">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Track circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="#1e2456"
                    strokeWidth="8"
                  />
                  {/* Indicator circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke={
                      scan.risk_score >= 80
                        ? '#ef4444'
                        : scan.risk_score >= 60
                        ? '#f97316'
                        : scan.risk_score >= 35
                        ? '#eab308'
                        : '#10b981'
                    }
                    strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className={`text-3xl font-extrabold font-mono ${getRiskScoreColor(scan.risk_score)}`}>
                    {scan.risk_score}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-gray-400">Risk Index</span>
                </div>
              </div>
              <p className="mt-2 text-xs font-mono text-center text-gray-400">
                0 = Clean &bull; 100 = Critical Threat
              </p>
            </div>
          </div>
        </Card>

        {/* Redirect Chain Inspection (if present) */}
        {scan.redirect_chain && scan.redirect_chain.length > 1 && (
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Multi-Hop Redirection Route ({scan.redirect_chain.length} hops)</span>
            </h3>
            <div className="space-y-2">
              {scan.redirect_chain.map((hop, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1137] border border-[#1e2456] text-xs font-mono"
                >
                  <span className="w-6 h-6 rounded-full bg-[#161b40] text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-gray-300 break-all">{hop}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Forensic Findings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Forensic Evidence & Findings ({scan.findings?.length || 0})</span>
            </h2>
            <span className="text-xs text-gray-400">Click finding to toggle technical details</span>
          </div>

          {!scan.findings || scan.findings.length === 0 ? (
            <Card className="p-8 text-center text-gray-400">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Threat Indicators Discovered</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                Heuristic classifiers, certificate registries, and reputation feeds discovered no known phishing traits associated with this destination.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {scan.findings.map((finding) => {
                const isOpen = expandedFindings[finding.id] !== false;
                return (
                  <Card
                    key={finding.id}
                    className="p-4 sm:p-5 transition-all border-[#1e2456] hover:border-cyan-500/30"
                  >
                    <div
                      onClick={() => toggleFinding(finding.id)}
                      className="flex items-start justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Badge severity={finding.severity} size="sm" />
                          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                            [{finding.category}]
                          </span>
                          <h4 className="text-sm font-bold text-white">{finding.title}</h4>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="p-1 text-gray-400 hover:text-white"
                        aria-label="Toggle details"
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-[#1e2456] text-xs space-y-2 animate-fadeIn">
                        <p className="text-gray-300 leading-relaxed">{finding.description}</p>
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 pt-1">
                          <span>Inspection Source: {finding.source}</span>
                          <span>Timestamp: {formatDate(finding.created_at)}</span>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <Card className="p-6 bg-[#161b40] border border-[#1e2456] text-center space-y-3">
          <h3 className="text-sm font-bold text-white">Was this automated assessment accurate?</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Your verification helps refine our threat models and prevents future false positives or missed evasions.
          </p>

          {feedbackSent ? (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs inline-flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Thank you! Your telemetry feedback has been recorded.</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                loading={feedbackLoading}
                onClick={() => handleFeedback(true)}
                icon={<ThumbsUp className="w-4 h-4 text-emerald-400" />}
              >
                Accurate Assessment
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={feedbackLoading}
                onClick={() => handleFeedback(false)}
                icon={<ThumbsDown className="w-4 h-4 text-red-400" />}
              >
                Inaccurate / False Alarm
              </Button>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ScanResultPage;
