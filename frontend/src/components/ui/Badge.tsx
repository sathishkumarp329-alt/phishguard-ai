import React from 'react';
import clsx from 'clsx';
import { Verdict, Severity } from '@/types';
import { getVerdictLabel, getVerdictBadgeStyles, getSeverityBadgeStyles } from '@/utils/helpers';
import { ShieldCheck, AlertTriangle, ShieldAlert, HelpCircle } from 'lucide-react';

export interface BadgeProps {
  verdict?: Verdict | string;
  severity?: Severity;
  label?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  verdict,
  severity,
  label,
  size = 'md',
  showIcon = true,
  className,
}) => {
  if (severity) {
    const styles = getSeverityBadgeStyles(severity);
    return (
      <span
        className={clsx(
          'inline-flex items-center uppercase font-mono font-semibold tracking-wider rounded-md border',
          size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
          styles.bg,
          styles.text,
          styles.border,
          className
        )}
      >
        {label || severity}
      </span>
    );
  }

  const v = verdict as Verdict | undefined;
  const styles = getVerdictBadgeStyles(v);
  const displayLabel = label || getVerdictLabel(v);

  const getIcon = () => {
    switch (v) {
      case 'known_malicious':
      case 'high_risk':
        return <ShieldAlert className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      case 'suspicious':
        return <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      case 'no_known_threat':
        return <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
      default:
        return <HelpCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />;
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm',
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-xs md:text-sm px-3 py-1',
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
    >
      {showIcon && getIcon()}
      <span>{displayLabel}</span>
    </span>
  );
};

export default Badge;
