import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Shield,
  LayoutDashboard,
  Search,
  FileSearch,
  Layers,
  History,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Scan URL', path: '/scan', icon: Search },
    { label: 'File Scan', path: '/file-scan', icon: FileSearch },
    { label: 'Batch Scan', path: '/batch-scan', icon: Layers },
    { label: 'Scan History', path: '/history', icon: History },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
    ...(user?.role === 'admin' ? [{ label: 'Admin Telemetry', path: '/admin', icon: Shield }] : []),
  ];

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-[#0a0e27] text-gray-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d1137] border-b border-[#1e2456] sticky top-0 z-30">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-sm">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">
            PhishGuard<span className="text-cyan-400">AI</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="p-2 rounded-lg bg-[#161b40] border border-[#1e2456] text-gray-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex flex-col bg-[#0a0e27]/90 backdrop-blur-sm">
          <div className="w-3/4 max-w-xs h-full bg-[#0d1137] border-r border-[#1e2456] p-5 flex flex-col justify-between overflow-y-auto animate-slideUp">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-base font-bold text-white">PhishGuard</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User badge */}
              <div className="p-3 rounded-xl bg-[#161b40] border border-[#1e2456]">
                <p className="text-xs text-gray-400">Logged in as</p>
                <p className="text-sm font-semibold text-white truncate">{user?.full_name || user?.email}</p>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 mt-1 inline-block bg-cyan-950 text-cyan-300 rounded border border-cyan-800">
                  {user?.role || 'User'}
                </span>
              </div>

              {/* Navigation links */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={clsx(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-gradient-to-r from-cyan-950/60 to-blue-950/40 text-cyan-400 border border-cyan-500/30 font-semibold'
                          : 'text-gray-400 hover:text-gray-100 hover:bg-[#161b40]'
                      )}
                    >
                      <Icon className={clsx('w-4 h-4', isActive ? 'text-cyan-400' : 'text-gray-400')} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-[#1e2456] space-y-2">
              <Link
                to="/"
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-400 hover:text-cyan-400"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Public Home
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0d1137] border-r border-[#1e2456] min-h-screen sticky top-0 h-screen p-5 justify-between">
        <div className="space-y-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-shadow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                PhishGuard<span className="text-cyan-400 font-extrabold ml-0.5">AI</span>
              </span>
              <span className="text-[9px] tracking-wider text-cyan-400 uppercase font-mono font-medium -mt-0.5">
                Threat Platform
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-[#161b40] text-cyan-300 border-l-4 border-cyan-400 shadow-sm shadow-cyan-950'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-[#161b40]/60'
                  )}
                >
                  <Icon
                    className={clsx(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-300'
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#1e2456] space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[#161b40] border border-[#1e2456]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.full_name || 'Cyber Analyst'}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-red-400 hover:bg-red-950/30 hover:border-red-900 border border-transparent transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
