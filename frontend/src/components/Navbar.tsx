import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Menu, X, LayoutDashboard, LogOut, User, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      setTimeout(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Features', action: () => scrollToSection('features') },
    { name: 'How It Works', action: () => scrollToSection('how-it-works') },
    { name: 'Security', action: () => scrollToSection('security') },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-[#0a0e27]/90 backdrop-blur-md border-b border-[#1e2456] shadow-lg'
          : 'bg-[#0a0e27]/70 backdrop-blur-sm border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20 group-hover:shadow-cyan-400/40 transition-shadow">
              <Shield className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                PhishGuard<span className="text-cyan-400 font-extrabold ml-1">AI</span>
              </span>
              <span className="text-[10px] tracking-widest text-cyan-400 uppercase font-mono font-medium -mt-1">
                Zero-Trust Defense
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              link.action ? (
                <button
                  key={link.name}
                  onClick={link.action}
                  className="text-sm font-medium text-gray-300 hover:text-cyan-300 transition-colors focus:outline-none"
                >
                  {link.name}
                </button>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === link.href ? 'text-cyan-400 font-semibold' : 'text-gray-300 hover:text-cyan-300'
                  }`}
                >
                  {link.name}
                </Link>
              )
            )}
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="relative">
                <div className="flex items-center gap-3">
                  <Link to="/dashboard">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<LayoutDashboard className="w-4 h-4 text-cyan-400" />}
                    >
                      Dashboard
                    </Button>
                  </Link>

                  {/* User Profile Dropdown Button */}
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl bg-[#161b40] border border-[#1e2456] hover:border-cyan-500/40 transition-colors text-sm text-gray-200"
                    aria-label="User menu"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-white text-xs">
                      {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-medium max-w-[100px] truncate">
                      {user?.full_name || user?.email}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#161b40] border border-[#1e2456] shadow-xl py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-[#1e2456]">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-cyan-400 hover:bg-[#1e2456] transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-cyan-400 hover:bg-[#1e2456] transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-[#1e2456] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-[#161b40] border border-[#1e2456] text-gray-300 hover:text-white focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0d1137] border-b border-[#1e2456] px-4 pt-4 pb-6 space-y-4 animate-slideUp">
          <div className="space-y-2">
            {navLinks.map((link) =>
              link.action ? (
                <button
                  key={link.name}
                  onClick={link.action}
                  className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-cyan-400 hover:bg-[#161b40]"
                >
                  {link.name}
                </button>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-gray-300 hover:text-cyan-400 hover:bg-[#161b40]"
                >
                  {link.name}
                </Link>
              )
            )}
          </div>

          <div className="pt-4 border-t border-[#1e2456] space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 mb-2 bg-[#161b40] rounded-xl border border-[#1e2456]">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                </div>
                <Link to="/dashboard" className="block">
                  <Button variant="secondary" fullWidth icon={<LayoutDashboard className="w-4 h-4 text-cyan-400" />}>
                    Open Dashboard
                  </Button>
                </Link>
                <Button variant="danger" fullWidth onClick={handleLogout} icon={<LogOut className="w-4 h-4" />}>
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" className="w-full">
                  <Button variant="outline" fullWidth>
                    Log In
                  </Button>
                </Link>
                <Link to="/signup" className="w-full">
                  <Button variant="primary" fullWidth>
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
