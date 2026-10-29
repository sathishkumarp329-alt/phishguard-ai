import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi } from '@/services/api';
import { DashboardStats, Scan } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';
import UrlScanner from '@/components/UrlScanner';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton, SkeletonCard } from '@/components/ui/LoadingSpinner';
import { timeAgo, truncateUrl } from '@/utils/helpers';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Search,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Inbox,
  Shield,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch {
      // In case backend is starting or offline, fallback to empty stats structure rather than crashing
      setStats({
        total_scans: 0,
        safe_count: 0,
        suspicious_count: 0,
        malicious_count: 0,
        recent_scans: [],
        risk_distribution: {
          safe: 0,
          suspicious: 0,
          high_risk: 0,
          malicious: 0,
        },
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleScanCompleted = (newScan: Scan) => {
    // Refresh stats or prepend scan
    setStats((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        total_scans: prev.total_scans + 1,
        recent_scans: [newScan, ...prev.recent_scans.slice(0, 4)],
      };
    });
    fetchStats();
  };

  const chartData = [
    { name: 'Safe', value: stats?.risk_distribution?.safe ?? 0, color: '#10b981' },
    { name: 'Suspicious', value: stats?.risk_distribution?.suspicious ?? 0, color: '#eab308' },
    { name: 'High Risk', value: stats?.risk_distribution?.high_risk ?? 0, color: '#f97316' },
    { name: 'Malicious', value: stats?.risk_distribution?.malicious ?? 0, color: '#ef4444' },
  ];

  const totalEvaluations = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Top Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Welcome, {user?.full_name ? user.full_name.split(' ')[0] : 'Analyst'}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Live threat telemetry and heuristic inspection overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Intelligence Online
            </span>
          </div>
        </div>

        {/* Quick URL Scanner Bar */}
        <Card className="p-4 sm:p-6 bg-gradient-to-r from-[#161b40] to-[#11163b] border-cyan-500/30 glow-cyan">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              Quick Threat Scan
            </h2>
            <span className="text-xs text-gray-400">Zero-Trust Heuristic Engine</span>
          </div>
          <UrlScanner compact onScanComplete={handleScanCompleted} />
        </Card>

        {/* Stats Summary Cards Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} rows={2} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Scans */}
            <Card hover className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-gray-400">Total Scans</span>
                <div className="p-2 rounded-lg bg-[#0d1137] text-cyan-400 border border-[#1e2456]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-3 font-mono">
                {stats?.total_scans ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Evaluated across all vectors</p>
            </Card>

            {/* Safe */}
            <Card hover className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-emerald-400">Safe / Clean</span>
                <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-3 font-mono">
                {stats?.safe_count ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">No active indicators found</p>
            </Card>

            {/* Suspicious */}
            <Card hover className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-yellow-400">Suspicious</span>
                <div className="p-2 rounded-lg bg-yellow-950/40 text-yellow-400 border border-yellow-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-yellow-400 mt-3 font-mono">
                {stats?.suspicious_count ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Moderate risk markers</p>
            </Card>

            {/* Malicious */}
            <Card hover className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-red-400">Malicious</span>
                <div className="p-2 rounded-lg bg-red-950/40 text-red-400 border border-red-500/30">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-3 font-mono">
                {stats?.malicious_count ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Critical threats blocked</p>
            </Card>
          </div>
        )}

        {/* Charts & Recent Scans Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Risk Distribution Chart (5 cols) */}
          <Card className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white tracking-tight">Risk Distribution</h3>
                <span className="text-xs text-gray-400 font-mono">Telemetry</span>
              </div>
              <p className="text-xs text-gray-400">
                Breakdown of categorized verdicts across your inspection history.
              </p>
            </div>

            <div className="h-64 w-full my-4 flex items-center justify-center relative">
              {totalEvaluations === 0 ? (
                <div className="text-center space-y-2 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto stroke-1 text-gray-600" />
                  <p className="text-xs font-mono">No scan data to plot yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161b40',
                        borderColor: '#1e2456',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#00d4ff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e2456] text-xs">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-[#0d1137]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Scans (7 cols) */}
          <Card className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white tracking-tight">Recent Scans</h3>
                <Link
                  to="/history"
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>View All History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : !stats?.recent_scans || stats.recent_scans.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-[#0d1137] border border-[#1e2456] text-gray-500">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">No scans yet</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Start by analyzing a suspicious link with the quick scan bar above.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.recent_scans.slice(0, 5).map((scan) => (
                    <div
                      key={scan.id}
                      onClick={() => navigate(`/scan/${scan.id}`)}
                      className="p-3 sm:p-3.5 rounded-xl bg-[#0d1137] border border-[#1e2456] hover:border-cyan-500/40 hover:bg-[#12173f] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-mono text-white truncate group-hover:text-cyan-300 transition-colors">
                            {truncateUrl(scan.url, 45)}
                          </p>
                          <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                          <span>{timeAgo(scan.created_at)}</span>
                          <span>&bull;</span>
                          <span>Risk: {scan.risk_score}/100</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3">
                        <Badge verdict={scan.verdict} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#1e2456] text-right">
              <Link
                to="/scan"
                className="text-xs text-gray-400 hover:text-cyan-400 inline-flex items-center gap-1 transition-colors"
              >
                <span>Launch Advanced Forensic Scanner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
