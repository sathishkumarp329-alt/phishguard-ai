import { Verdict, Severity } from '@/types';

/**
 * Format ISO date string into readable format (e.g., "Oct 19, 2026, 8:45 PM")
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Return relative time string (e.g. "5m ago", "2h ago", "3d ago", "just now")
 */
export function timeAgo(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 45) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

/**
 * Truncate a URL gracefully for UI display
 */
export function truncateUrl(url: string, maxLength: number = 40): string {
  if (!url) return '';
  if (url.length <= maxLength) return url;
  
  try {
    const parsed = new URL(url);
    const display = parsed.hostname + (parsed.pathname === '/' ? '' : parsed.pathname);
    if (display.length <= maxLength) return display;
    return display.slice(0, maxLength - 3) + '...';
  } catch {
    return url.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Get human-readable label for a verdict
 */
export function getVerdictLabel(verdict: Verdict | string | undefined): string {
  switch (verdict) {
    case 'known_malicious':
      return 'Known Malicious';
    case 'high_risk':
      return 'High Risk';
    case 'suspicious':
      return 'Suspicious';
    case 'no_known_threat':
      return 'Safe / No Threat';
    case 'unable_to_verify':
      return 'Unable to Verify';
    default:
      return 'Unknown';
  }
}

/**
 * Get CSS badge colors for a verdict
 */
export function getVerdictBadgeStyles(verdict: Verdict | string | undefined): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (verdict) {
    case 'known_malicious':
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-400',
        border: 'border-red-500/30',
        dot: 'bg-red-400',
      };
    case 'high_risk':
      return {
        bg: 'bg-orange-500/15',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        dot: 'bg-orange-400',
      };
    case 'suspicious':
      return {
        bg: 'bg-yellow-500/15',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        dot: 'bg-yellow-400',
      };
    case 'no_known_threat':
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    case 'unable_to_verify':
    default:
      return {
        bg: 'bg-gray-500/15',
        text: 'text-gray-400',
        border: 'border-gray-500/30',
        dot: 'bg-gray-400',
      };
  }
}

/**
 * Get CSS color class for risk score (0-100)
 */
export function getRiskScoreColor(score: number): string {
  if (score >= 80) return 'text-red-400';
  if (score >= 60) return 'text-orange-400';
  if (score >= 35) return 'text-yellow-400';
  return 'text-emerald-400';
}

/**
 * Get border / background highlight by score
 */
export function getRiskScoreBg(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 35) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

/**
 * Severity styles for findings
 */
export function getSeverityBadgeStyles(severity: Severity): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity) {
    case 'critical':
      return { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-600/40' };
    case 'high':
      return { bg: 'bg-orange-950/60', text: 'text-orange-400', border: 'border-orange-600/40' };
    case 'medium':
      return { bg: 'bg-yellow-950/60', text: 'text-yellow-400', border: 'border-yellow-600/40' };
    case 'low':
      return { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-600/40' };
    case 'info':
    default:
      return { bg: 'bg-gray-800/60', text: 'text-gray-300', border: 'border-gray-600/40' };
  }
}

/**
 * Validates whether string is a properly formed URL
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  try {
    const url = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
    return url.hostname.includes('.') && url.hostname.length >= 3;
  } catch {
    return false;
  }
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
