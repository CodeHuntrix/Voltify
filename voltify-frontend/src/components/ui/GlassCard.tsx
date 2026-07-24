// src/components/ui/GlassCard.tsx
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'cyan' | 'pink' | 'green' | 'none';
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = false, glow = 'none', onClick }: GlassCardProps) {
  const glowClass = {
    cyan:  'hover:border-volt-cyan/40 hover:bg-slate-900/80',
    pink:  'hover:border-volt-pink/40 hover:bg-slate-900/80',
    green: 'hover:border-volt-green/40 hover:bg-slate-900/80',
    none:  'hover:border-white/12 hover:bg-slate-900/80',
  }[glow];

  const cardClassName = cn(
    'bg-surface-container rounded-2xl p-6 border border-outline shadow-sm transition-all duration-200',
    hover && 'hover:bg-surface-variant hover:border-primary/50',
    onClick && 'cursor-pointer hover:scale-[1.01] transform text-left w-full block focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cardClassName}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={cardClassName}>
      {children}
    </div>
  );
}
export default GlassCard;
