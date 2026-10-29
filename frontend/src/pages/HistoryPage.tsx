import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { LoadingSpinner, Skeleton } from '@/components/ui/LoadingSpinner';
import { scanApi } from '@/services/api';
import { Scan, Verdict } from '@/types';
import { formatDate, timeAgo, truncateUrl, getRiskScoreColor } from '@/utils/helpers';
import {
  History,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertTriangle,
  Calendar,
  X,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [scans, setScans] = useState<Scan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scanToDelete, setScanToDelete] = useState<Scan | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await scanApi.getHistory({
        page,
        limit,
        search: search.trim() || undefined,
        verdict: verdictFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });

      setScans(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || Math.ceil((res.total || 0) / limit) || 1);
    } catch {
      setScans([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, verdictFilter, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteScan = async () => {
    if (!scanToDelete) return;
    setActionLoading(true);
    try {
      await scanApi.deleteScan(scanToDelete.id);
      setDeleteModalOpen(false);
      setScanToDelete(null);
      fetchHistory();
    } catch {
      // Handle delete error
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAllHistory = async () => {
    setActionLoading(true);
    try {
      await scanApi.clearHistory();
      setClearAllModalOpen(false);
      setScans([]);
      setTotal(0);
      setTotalPages(1);
    } catch {
      // Handle error
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setVerdictFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || verdictFilter || startDate || endDate);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b40] border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-1">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Log & Threat Index</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Scan History</h1>
            <p className="text-sm text-gray-400">
              Audit all previously inspected destinations, verdicts, and forensic score progressions.
            </p>
          </div>

          {scans.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearAllModalOpen(true)}
              icon={<Trash2 className="w-4 h-4 text-red-400" />}
            >
              Clear Entire History
            </Button>
          )}
        </div>

        {/* Filter Toolbar Card */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search URL or host..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0d1137] border border-[#1e2456] text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-400"
              />
            </div>

            {/* Verdict Filter */}
            <select
              value={verdictFilter}
              onChange={(e) => {
                setVerdictFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#0d1137] border border-[#1e2456] text-xs text-gray-300 outline-none focus:border-cyan-400"
            >
              <option value="">All Verdicts</option>
              <option value="known_malicious">Known Malicious</option>
              <option value="high_risk">High Risk</option>
              <option value="suspicious">Suspicious</option>
              <option value="no_known_threat">Safe / Clean</option>
              <option value="unable_to_verify">Unverified</option>
            </select>

            {/* Start Date */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                title="Start date"
                className="w-full px-3 py-2 rounded-xl bg-[#0d1137] border border-[#1e2456] text-xs text-gray-300 outline-none focus:border-cyan-400"
              />
            </div>

            {/* End Date */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                title="End date"
                className="w-full px-3 py-2 rounded-xl bg-[#0d1137] border border-[#1e2456] text-xs text-gray-300 outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-[#1e2456] text-xs">
              <span className="text-gray-400">Filters applied</span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            </div>
          )}
        </Card>

        {/* Scan List / Table */}
        <div className="rounded-xl border border-[#1e2456] bg-[#161b40] overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-8 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : scans.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="p-4 rounded-full bg-[#0d1137] border border-[#1e2456] text-gray-500 w-16 h-16 mx-auto flex items-center justify-center">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">No Scan Records Located</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No records match your active search or date filters. Try resetting the filters.'
                  : 'Your scan history is empty. Scanned links will appear here automatically.'}
              </p>
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#0d1137] text-gray-400 uppercase font-mono text-[11px] border-b border-[#1e2456]">
                  <tr>
                    <th className="px-4 py-3.5">Target Destination</th>
                    <th className="px-4 py-3.5">Verdict</th>
                    <th className="px-4 py-3.5">Risk Score</th>
                    <th className="px-4 py-3.5">Date / Time</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2456]">
                  {scans.map((scan) => (
                    <tr
                      key={scan.id}
                      className="hover:bg-[#12173f] transition-colors group cursor-pointer"
                      onClick={() => navigate(`/scan/${scan.id}`)}
                    >
                      <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                        <div className="font-mono text-cyan-200 truncate font-medium" title={scan.url}>
                          {scan.url}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {scan.hostname || 'Host Evaluated'} &bull; Type: {scan.scan_type}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge verdict={scan.verdict} size="sm" />
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold">
                        <span className={getRiskScoreColor(scan.risk_score)}>
                          {scan.risk_score} / 100
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-gray-400 font-mono text-xs">
                        <span title={formatDate(scan.created_at)}>{timeAgo(scan.created_at)}</span>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/scan/${scan.id}`)}
                          className="p-1.5 rounded-lg bg-[#0d1137] border border-[#1e2456] text-gray-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
                          title="Open Report"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScanToDelete(scan);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#0d1137] border border-[#1e2456] text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-[#0d1137] border-t border-[#1e2456] flex items-center justify-between text-xs text-gray-400">
              <span>
                Showing page <strong className="text-white">{page}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong> ({total} total scans)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  icon={<ChevronRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Single Scan Modal */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Scan Record"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-300">
              Are you sure you want to permanently remove this forensic scan from your history?
            </p>
            {scanToDelete && (
              <p className="p-2.5 rounded-lg bg-[#0d1137] border border-[#1e2456] font-mono text-xs text-cyan-200 truncate">
                {scanToDelete.url}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={actionLoading}
                onClick={handleDeleteScan}
              >
                Delete Record
              </Button>
            </div>
          </div>
        </Modal>

        {/* Clear All Modal */}
        <Modal
          isOpen={clearAllModalOpen}
          onClose={() => setClearAllModalOpen(false)}
          title="Clear Entire Scan History"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>
                This will irreversibly delete all your logged URL assessments, finding traces, and batch scans.
              </span>
            </div>
            <p className="text-xs text-gray-400">
              This action cannot be undone. Are you sure you wish to purge your entire telemetry log?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setClearAllModalOpen(false)}>
                Keep History
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={actionLoading}
                onClick={handleClearAllHistory}
              >
                Purge All Records
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default HistoryPage;
