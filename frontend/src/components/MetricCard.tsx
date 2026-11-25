/**
 * Reusable KPI Stat Card for Dashboard and Analytics metric grids.
 */
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  badge?: string;
  accentColor?: 'purple' | 'cyan' | 'teal' | 'amber' | 'emerald' | 'rose' | 'slate';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  accentColor = 'purple',
}) => {
  const iconColor = {
    purple: 'text-accent-primary bg-accent-primary/10 border-accent-primary/20',
    cyan: 'text-accent-secondary bg-accent-secondary/10 border-accent-secondary/20',
    teal: 'text-status-green bg-status-green/10 border-status-green/20',
    amber: 'text-status-amber bg-status-amber/10 border-status-amber/20',
    emerald: 'text-status-green bg-status-green/10 border-status-green/20',
    rose: 'text-status-red bg-status-red/10 border-status-red/20',
    slate: 'text-content-secondary bg-bg-elevated border-line-subtle',
  }[accentColor];

  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl p-4 shadow-card hover:border-line-hover transition-all duration-150 flex flex-col justify-between group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-sans font-medium text-content-secondary">
          {title}
        </span>
        <div className="flex items-center space-x-1.5">
          {badge && (
            <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-bg-elevated text-content-secondary border border-line-subtle">
              {badge}
            </span>
          )}
          {Icon && (
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${iconColor}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-mono font-bold text-content-primary tracking-tight">
          {value}
        </div>
        {subtext && (
          <span className="text-[11px] font-sans text-content-muted">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
