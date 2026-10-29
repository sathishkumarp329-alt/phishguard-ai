import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Github, Heart, AlertOctagon } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#070a1e] border-t border-[#1e2456] text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                PhishGuard<span className="text-cyan-400">AI</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Intelligent zero-trust phishing analysis and threat intelligence platform.
              Detect suspicious domains, dangerous redirects, credential harvesters, and malicious attachments before harm occurs.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-[#161b40] border border-[#1e2456] text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                aria-label="GitHub Repository"
              >
                <Github className="w-4 h-4" />
              </a>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b40] border border-[#1e2456] text-xs font-mono text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Models v2.4 Active
              </div>
            </div>
          </div>

          {/* Column 2: Product */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 font-mono">
              Product
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/scan" className="hover:text-cyan-400 transition-colors">
                  URL Scanner
                </Link>
              </li>
              <li>
                <Link to="/batch-scan" className="hover:text-cyan-400 transition-colors">
                  Batch Scanner
                </Link>
              </li>
              <li>
                <Link to="/file-scan" className="hover:text-cyan-400 transition-colors">
                  File Document Scan
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-cyan-400 transition-colors">
                  Scan History
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">
                  Threat Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 font-mono">
              Company
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#about" className="hover:text-cyan-400 transition-colors">
                  About PhishGuard
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-cyan-400 transition-colors">
                  Security Model
                </a>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-gray-500 cursor-not-allowed">
                  Terms of Service
                </span>
              </li>
              <li>
                <a href="mailto:security@phishguard.ai" className="hover:text-cyan-400 transition-colors">
                  Contact Threat Team
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Security & Disclaimers */}
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 font-mono flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              Security Notice
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              PhishGuard provides automated risk assessments based on heuristic signals and threat feeds.
              No automated detector catches 100% of zero-day spear-phishing. Always exercise manual caution before entering credentials.
            </p>
            <div className="p-2.5 rounded-lg bg-[#0d1137] border border-[#1e2456] text-[11px] text-gray-400">
              <span className="text-cyan-400 font-semibold">Heuristic Alert:</span> HTTPS certificates do not guarantee site legitimacy.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#1e2456]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} PhishGuard AI Inc. All rights reserved. Zero-Trust Security Architecture.
          </p>
          <div className="flex items-center gap-1 text-gray-500">
            <span>Built with vigilance &</span>
            <Heart className="w-3 h-3 text-red-400 fill-red-400 mx-0.5" />
            <span>for online safety</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
