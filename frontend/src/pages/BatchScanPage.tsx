import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { scanApi } from '@/services/api';
import { Scan, Verdict } from '@/types';
import { truncateUrl, getRiskScoreColor, isValidUrl } from '@/utils/helpers';
import {
  Layers,
  Upload,
  Play,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';

export const BatchScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Scan[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Table filtering and search
  const [filterVerdict, setFilterVerdict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // Extract URLs from file lines
        const lines = text
          .split(/[\r\n,]+/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && (l.startsWith('http') || l.includes('.')));
        setUrlInput((prev) => (prev ? `${prev}\n${lines.join('\n')}` : lines.join('\n')));
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleStartBatch = async () => {
    setError(null);
    const rawUrls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (rawUrls.length === 0) {
      setError('Please provide at least one URL to scan.');
      return;
    }

    // Limit to max 50 for safety
    if (rawUrls.length > 50) {
      setError('Batch limit is 50 URLs per request.');
      return;
    }

    setLoading(true);
    setProgress(10);
    setResults([]);

    try {
      // Simulate stepped progress indicator
      const progressTimer = setInterval(() => {
        setProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 500);

      const response = await scanApi.batchScan(rawUrls);
      clearInterval(progressTimer);
      setProgress(100);
      setResults(response.results || []);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        errorObj?.response?.data?.detail ||
        errorObj?.response?.data?.message ||
        'Batch scan failed. Please check your URLs and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const headers = ['URL', 'Hostname', 'Verdict', 'Risk Score', 'Findings Count', 'Scanned At'];
    const rows = results.map((r) => [
      `"${r.url.replace(/"/g, '""')}"`,
      `"${r.hostname || ''}"`,
      `"${r.verdict}"`,
      r.risk_score,
      r.findings?.length || 0,
      `"${r.created_at}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `phishguard-batch-results-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredResults = results.filter((item) => {
    const matchesVerdict = filterVerdict === 'all' || item.verdict === filterVerdict;
    const matchesSearch =
      searchQuery === '' ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.hostname && item.hostname.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesVerdict && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b40] border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>High-Throughput Batch Triage</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Bulk URL Inspection</h1>
          <p className="text-sm text-gray-400">
            Submit multiple URLs simultaneously to rapidly discover malicious campaigns across domains.
          </p>
        </div>

        {/* Input & Upload Configuration */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label htmlFor="batch-urls" className="text-sm font-semibold text-gray-200">
              Input Target URLs (One per line, up to 50 URLs)
            </label>

            {/* CSV/TXT file upload trigger */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1137] border border-[#1e2456] hover:border-cyan-500/40 text-xs font-medium text-cyan-300 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload CSV / TXT</span>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  className="p-1.5 text-gray-400 hover:text-red-400 text-xs"
                  title="Clear input"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <textarea
            id="batch-urls"
            rows={6}
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={`https://suspicious-target-one.com/login\nhttps://verify-account-update.xyz/auth\nhttps://legitimate-domain.org`}
            disabled={loading}
            className="w-full p-3.5 rounded-xl bg-[#0d1137] border-2 border-[#1e2456] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 text-white placeholder-gray-500 font-mono text-xs sm:text-sm outline-none transition-all resize-y"
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-xs text-gray-400 font-mono">
              Targets entered: {urlInput.split('\n').filter((u) => u.trim().length > 0).length} / 50 max
            </span>

            <Button
              variant="primary"
              size="md"
              loading={loading}
              onClick={handleStartBatch}
              icon={<Play className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              {loading ? 'Evaluating Batch Queue...' : 'Start Batch Scan'}
            </Button>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="space-y-1.5 pt-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                <span>Inspecting threat intelligence endpoints...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0d1137] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-4 animate-slideUp">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Batch Results ({results.length})</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search results..."
                    className="pl-8 pr-3 py-1.5 rounded-lg bg-[#0d1137] border border-[#1e2456] text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400 w-40 sm:w-48"
                  />
                </div>

                {/* Verdict Filter */}
                <select
                  value={filterVerdict}
                  onChange={(e) => setFilterVerdict(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#0d1137] border border-[#1e2456] text-xs text-gray-300 outline-none focus:border-cyan-400"
                >
                  <option value="all">All Verdicts</option>
                  <option value="known_malicious">Known Malicious</option>
                  <option value="high_risk">High Risk</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="no_known_threat">Safe</option>
                  <option value="unable_to_verify">Unverified</option>
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportCsv}
                  icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Results Table */}
            <div className="rounded-xl border border-[#1e2456] bg-[#161b40] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#0d1137] text-gray-400 uppercase font-mono text-[11px] border-b border-[#1e2456]">
                    <tr>
                      <th className="px-4 py-3">Target URL</th>
                      <th className="px-4 py-3">Verdict</th>
                      <th className="px-4 py-3">Risk Score</th>
                      <th className="px-4 py-3">Signals Flagged</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2456]">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No matching results found.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((item) => (
                        <tr key={item.id} className="hover:bg-[#12173f] transition-colors">
                          <td className="px-4 py-3 font-mono text-cyan-200">
                            <span title={item.url}>{truncateUrl(item.url, 45)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge verdict={item.verdict} size="sm" />
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            <span className={getRiskScoreColor(item.risk_score)}>
                              {item.risk_score} / 100
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {item.findings?.length || 0} findings
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => navigate(`/scan/${item.id}`)}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold text-xs inline-flex items-center gap-1"
                            >
                              <span>Report</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BatchScanPage;
