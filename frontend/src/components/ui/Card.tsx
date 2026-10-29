import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  interactive = false,
  className,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-[#161b40] border border-[#1e2456] rounded-xl p-5 md:p-6 text-gray-200 shadow-md',
        hover &&
          'hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300',
        interactive &&
          'cursor-pointer hover:border-cyan-400/50 hover:bg-[#1a204d] hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
