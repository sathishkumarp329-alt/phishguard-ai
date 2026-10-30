import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiClient } from '@/services/api';
import { ShieldCheck, Activity, Users, Database, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/helpers';

interface SystemHealth {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  database: string;
  threat_intel_configured: {
    virustotal: boolean;
    google_safebrowsing: boolean;
  };
}

interface AdminStats {
  total_users: number;
  active_users: number;
  total_scans: number;
  verdict_distribution: Record<string, number>;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

export const AdminPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, statsRes, logsRes] = await Promise.all([
        apiClient.get('/admin/health'),
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/audit-logs?page=1&page_size=15'),
      ]);
      setHealth(healthRes.data);
      setStats(statsRes.data);
      setLogs(logsRes.data.logs || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Access restricted: Administrative privileges required to view telemetry.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
              Administrative Governance & Telemetry
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Infrastructure monitoring, threat intelligence adapter status, and audit trails.
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#161b40] border border-[#1e2456] text-sm font-medium text-cyan-400 hover:bg-[#1b2252] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Gathering system telemetry..." />
          </div>
        ) : health && stats ? (
          <>
            {/* Health & Engine Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-[#161b40] border border-[#1e2456]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-mono">CORE STATUS</span>
                    <div className="text-lg font-bold text-white uppercase">{health.status}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-[#161b40] border border-[#1e2456]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-mono">DATABASE</span>
                    <div className="text-lg font-bold text-white capitalize">{health.database}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-[#161b40] border border-[#1e2456]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-mono">ACTIVE / TOTAL USERS</span>
                    <div className="text-lg font-bold text-white">
                      {stats.active_users} / {stats.total_users}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-[#161b40] border border-[#1e2456]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-mono">TOTAL SCANS EXECUTED</span>
                    <div className="text-lg font-bold text-white">{stats.total_scans}</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Threat Intel Adapters Grid */}
            <Card className="p-6 bg-[#161b40] border border-[#1e2456]">
              <h3 className="text-base font-semibold text-white mb-4">Threat Intelligence Provider Adapters</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0d1137] border border-[#1e2456] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">VirusTotal v3 Adapter</div>
                    <div className="text-xs text-gray-400">Global multi-antivirus engine hash & URL lookup</div>
                  </div>
                  {health.threat_intel_configured.virustotal ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                      Configured
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      Not Configured
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#0d1137] border border-[#1e2456] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Google Safe Browsing v4</div>
                    <div className="text-xs text-gray-400">Google web threat & deceptive content feed</div>
                  </div>
                  {health.threat_intel_configured.google_safebrowsing ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                      Configured
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      Not Configured
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Audit Logs Table */}
            <Card className="p-6 bg-[#161b40] border border-[#1e2456]">
              <h3 className="text-base font-semibold text-white mb-4">Platform Audit Logs</h3>
              {logs.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-6">No audit records logged yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#0d1137] text-gray-400 uppercase font-mono border-b border-[#1e2456]">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">IP Address</th>
                        <th className="px-4 py-3">User ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2456]">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#11163d]">
                          <td className="px-4 py-3 font-mono text-gray-400">{formatDate(log.created_at)}</td>
                          <td className="px-4 py-3 font-semibold text-white">{log.action}</td>
                          <td className="px-4 py-3 font-mono text-cyan-400">{log.ip_address || '-'}</td>
                          <td className="px-4 py-3 font-mono text-gray-400">{log.user_id ? log.user_id.slice(0, 8) + '...' : 'System'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default AdminPage;
