import React from 'react';
import clsx from 'clsx';
import { Check, X } from 'lucide-react';

export interface PasswordStrengthProps {
  password?: string;
  showCriteria?: boolean;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({
  password = '',
  showCriteria = false,
}) => {
  const criteria = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least 12 characters (recommended)', met: password.length >= 12 },
    { label: 'Contains uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'Contains number (0-9)', met: /[0-9]/.test(password) },
    { label: 'Contains special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) {
    score = 0;
  }

  const getStrengthData = () => {
    if (score === 0) return { label: 'Empty', color: 'bg-gray-600', text: 'text-gray-400', percent: 0 };
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-400', percent: 25 };
    if (score <= 3) return { label: 'Fair', color: 'bg-orange-500', text: 'text-orange-400', percent: 50 };
    if (score === 4) return { label: 'Good', color: 'bg-yellow-500', text: 'text-yellow-400', percent: 70 };
    if (score === 5) return { label: 'Strong', color: 'bg-green-500', text: 'text-green-400', percent: 85 };
    return { label: 'Very Strong', color: 'bg-emerald-400', text: 'text-emerald-400', percent: 100 };
  };

  const strength = getStrengthData();

  if (!password) return null;

  return (
    <div className="w-full mt-2 space-y-2 animate-fadeIn">
      {/* Progress Bars */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Password Strength:</span>
        <span className={clsx('font-semibold', strength.text)}>{strength.label}</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled =
            (i === 0 && score >= 1) ||
            (i === 1 && score >= 3) ||
            (i === 2 && score >= 4) ||
            (i === 3 && score >= 5) ||
            (i === 4 && score >= 6);

          return (
            <div
              key={i}
              className={clsx(
                'h-full rounded-full transition-all duration-300',
                filled ? strength.color : 'bg-[#1e2456]'
              )}
            />
          );
        })}
      </div>

      {showCriteria && (
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-400">
          {criteria.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              {item.met ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              )}
              <span className={item.met ? 'text-gray-300' : 'text-gray-500'}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrength;
