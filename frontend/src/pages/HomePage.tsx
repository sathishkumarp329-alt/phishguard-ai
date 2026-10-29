import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UrlScanner from '@/components/UrlScanner';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Shield,
  Lock,
  Globe,
  Scan,
  Link2,
  ShieldAlert,
  ArrowRightLeft,
  FileText,
  QrCode,
  List,
  BarChart3,
  History,
  Smartphone,
  Upload,
  Search,
  Cpu,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const scrollToScanner = () => {
    document.getElementById('scanner-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      title: 'Advanced URL Analysis',
      desc: 'Deep URL structure analysis with pattern recognition and token entropy checks.',
      icon: Link2,
      tag: 'Core Heuristics',
    },
    {
      title: 'Phishing Website Detection',
      desc: 'Identify fraudulent websites designed to steal credentials and impersonate brands.',
      icon: ShieldAlert,
      tag: 'Brand Defense',
    },
    {
      title: 'Domain & DNS Intelligence',
      desc: 'Domain registration age, authoritative DNS validation, and ASN infrastructure analysis.',
      icon: Globe,
      tag: 'Threat Intel',
    },
    {
      title: 'Redirect Analysis',
      desc: 'Trace multi-hop redirect chains and detect evasive forwarding cloaks.',
      icon: ArrowRightLeft,
      tag: 'Trace Engine',
    },
    {
      title: 'PDF/DOCX Scanning',
      desc: 'Extract embedded hyperlinked phishing traps from documents, reports, and invoices.',
      icon: FileText,
      tag: 'Doc Inspector',
    },
    {
      title: 'Image & QR Analysis',
      desc: 'Scan malicious QR codes (quishing) and extract URLs embedded inside deceptive imagery.',
      icon: QrCode,
      tag: 'QR Defense',
    },
    {
      title: 'Bulk URL Scanning',
      desc: 'Scan batches of suspicious URLs simultaneously for enterprise triage and SIEM feeds.',
      icon: List,
      tag: 'Batch API',
    },
    {
      title: 'Security Risk Reports',
      desc: 'Detailed forensic reports with concrete indicators, threat level, and actionable guidance.',
      icon: BarChart3,
      tag: 'Reports',
    },
    {
      title: 'Scan History',
      desc: 'Track and review all previous scans, trends, and risk changes over time.',
      icon: History,
      tag: 'Auditing',
    },
    {
      title: 'Mobile Protection',
      desc: 'Full responsive protection across touch devices, smartphones, and desktop displays.',
      icon: Smartphone,
      tag: 'Cross-Device',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Submit Target',
      desc: 'Submit a suspicious URL, email link, or supported document for immediate inspection.',
      icon: Upload,
    },
    {
      step: '02',
      title: 'Inspect & Trace',
      desc: 'Analyze URL structure, SSL certificate, DNS records, and follow evasive redirect chains.',
      icon: Search,
    },
    {
      step: '03',
      title: 'Evaluate Indicators',
      desc: 'Evaluate machine-learned indicators, brand impersonation signals, and calculate risk.',
      icon: Cpu,
    },
    {
      step: '04',
      title: 'Actionable Verdict',
      desc: 'View comprehensive findings, threat severity, and clear defensive safety recommendations.',
      icon: CheckCircle,
    },
  ];

  const trustDisclaimers = [
    {
      title: 'HTTPS Does Not Prove Safety',
      text: 'Over 80% of modern phishing domains use valid SSL/TLS certificates. A lock icon only secures transport, not the integrity of the destination.',
    },
    {
      title: 'Zero-Day Phishing Realities',
      text: 'No automated scanner catches every single spear-phishing attack. PhishGuard enhances human vigilance but does not replace careful scrutiny.',
    },
    {
      title: 'Risk Assessments, Not Guarantees',
      text: 'Scores represent probabilistic threat evaluations based on known heuristics and reputation feeds at the exact time of scanning.',
    },
    {
      title: 'Never Enter Secrets on Suspicious Sites',
      text: 'If a link triggers suspicious alerts or asks unexpectedly for one-time passwords (MFA) or credentials, navigate directly to official domains.',
    },
    {
      title: 'Dynamic Threat Intelligence Feeds',
      text: 'Threat feeds update continuously. A domain rated low-risk moments after registration may become flagged once active lure campaigns deploy.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e27] text-gray-100 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Glow ambient background orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-3/4 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161b40] border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI-Powered Zero-Trust URL Intelligence</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
                Stop Phishing Before It{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                  Reaches You.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Analyze suspicious links, inspect risky files, and understand online threats with an intelligent phishing detection platform designed for proactive security.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={scrollToScanner}
                  icon={<Scan className="w-5 h-5" />}
                >
                  Scan a URL Now
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={scrollToFeatures}
                  icon={<ChevronRight className="w-5 h-5 text-cyan-400" />}
                  iconPosition="right"
                >
                  Explore Features
                </Button>
              </div>

              {/* Trust Metric Micro-bar */}
              <div className="pt-6 border-t border-[#1e2456]/60 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <p className="text-2xl font-bold text-white font-mono">99.4%</p>
                  <p className="text-xs text-gray-400">Heuristic Accuracy</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-400 font-mono">&lt; 350ms</p>
                  <p className="text-xs text-gray-400">Scan Latency</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-violet-400 font-mono">Zero</p>
                  <p className="text-xs text-gray-400">Data Stored Unencrypted</p>
                </div>
              </div>
            </div>

            {/* Right Column: Creative Cybersecurity Graphic */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
                {/* Concentric glowing rings */}
                <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-pulse-slow" />
                <div className="absolute inset-8 rounded-full border border-violet-500/20 animate-reverse-spin" />
                <div className="absolute inset-16 rounded-full border border-[#1e2456] border-dashed" />

                {/* Central Shield Core */}
                <div className="relative z-20 flex flex-col items-center justify-center w-36 h-36 rounded-2xl bg-gradient-to-br from-[#161b40] to-[#0d1137] border-2 border-cyan-400/60 shadow-2xl shadow-cyan-500/20 glow-cyan">
                  <Shield className="w-16 h-16 text-cyan-400 mb-1" />
                  <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                    PhishGuard
                  </span>
                </div>

                {/* Satellite Floating Badges */}
                {/* 1: SSL / Lock (Top-Right) */}
                <div className="absolute top-2 right-4 z-20 p-3 rounded-xl bg-[#161b40] border border-cyan-500/30 shadow-lg flex items-center gap-2.5 animate-fadeIn">
                  <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">SSL Inspector</p>
                    <p className="text-[10px] text-cyan-300 font-mono">Cert Validated</p>
                  </div>
                </div>

                {/* 2: Threat Radar (Bottom-Right) */}
                <div className="absolute bottom-4 right-2 z-20 p-3 rounded-xl bg-[#161b40] border border-red-500/30 shadow-lg flex items-center gap-2.5 animate-fadeIn">
                  <div className="p-1.5 rounded-lg bg-red-950 text-red-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">Homoglyph Trap</p>
                    <p className="text-[10px] text-red-300 font-mono">Intercepted</p>
                  </div>
                </div>

                {/* 3: Domain Intel (Bottom-Left) */}
                <div className="absolute bottom-6 left-0 z-20 p-3 rounded-xl bg-[#161b40] border border-emerald-500/30 shadow-lg flex items-center gap-2.5 animate-fadeIn">
                  <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">DNS Reputation</p>
                    <p className="text-[10px] text-emerald-300 font-mono">Clean ASN</p>
                  </div>
                </div>

                {/* 4: Scan Engine (Top-Left) */}
                <div className="absolute top-4 left-4 z-20 p-3 rounded-xl bg-[#161b40] border border-violet-500/30 shadow-lg flex items-center gap-2.5 animate-fadeIn">
                  <div className="p-1.5 rounded-lg bg-violet-950 text-violet-400">
                    <Scan className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white">ML Classifier</p>
                    <p className="text-[10px] text-violet-300 font-mono">Live Stream</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* URL Scanner Preview Section */}
      <section id="scanner-section" className="py-14 bg-[#0d1137]/80 border-y border-[#1e2456] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Interactive Live Engine
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Test Any Link in Real-Time
            </h2>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto">
              Inspect suspicious SMS links, banking confirmation emails, or shortened redirects before clicking.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-[#161b40] border border-[#1e2456] shadow-2xl">
            <UrlScanner />
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Scans analyze domain registration, SSL certificates, redirect hops, and heuristic URL tokens without downloading malicious payload files to your device.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid (10 cards) */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
            Defense Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comprehensive Phishing Threat Coverage
          </h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Engineered from the ground up to identify modern spear-phishing tactics, zero-day domains, and disguised redirection vectors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <Card
                key={index}
                hover
                className="flex flex-col justify-between group transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-[#0d1137] border border-[#1e2456] text-cyan-400 group-hover:text-white group-hover:bg-cyan-600 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#0d1137] text-cyan-300 border border-[#1e2456]">
                      {feat.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works (4 steps) */}
      <section id="how-it-works" className="py-20 bg-[#0d1137]/60 border-y border-[#1e2456]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Workflow Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How PhishGuard Protects You
            </h2>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto">
              Our four-stage inspection protocol rapidly decomposes suspected targets and produces definitive telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="relative p-6 rounded-2xl bg-[#161b40] border border-[#1e2456] flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-colors shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-[#0d1137] border border-[#1e2456] text-cyan-400">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black font-mono text-[#1e2456] group-hover:text-cyan-500/40">
                      {step.step}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section id="security" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Operational Integrity Notice</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Security Principles & Defensive Realism
          </h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
            Honest cybersecurity transparency: automated indicators aid decision making, but defensive hygiene remains paramount.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustDisclaimers.map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-[#161b40] border border-[#1e2456] space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">{item.title}</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{item.text}</p>
            </div>
          ))}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#161b40] to-[#12173f] border border-cyan-500/30 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-cyan-300 mb-2">Ready to secure your workflow?</h3>
              <p className="text-xs text-gray-300">
                Create a free account to unlock batch scans, document URL extractions, and cloud history sync.
              </p>
            </div>
            <div className="pt-4">
              <Link to="/signup">
                <Button variant="primary" size="sm" fullWidth>
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
