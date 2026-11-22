import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Cpu,
  Activity,
  BarChart3,
  Settings as SettingsIcon,
  Play,
  Pause,
  RotateCcw,
  Radio,
  TerminalSquare
} from 'lucide-react';
import { SchedulerStatus, SystemMetrics } from '../types';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  scheduler: SchedulerStatus | null;
  system: SystemMetrics | null;
  connected: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  scheduler,
  system,
  connected,
  onStart,
  onPause,
  onReset,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Manager', icon: Layers },
    { id: 'scheduler', label: 'Scheduler', icon: Cpu },
    { id: 'monitor', label: 'Live Monitor', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const isRunning = scheduler?.status === 'RUNNING';

  return (
    <header className="border-b border-line-subtle bg-bg-main/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-primary/25 to-accent-secondary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary shadow-sm shadow-accent-primary/10">
              <TerminalSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-sans font-bold tracking-tight text-base text-content-primary">
                  NEXUS
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-bg-elevated text-accent-primary border border-line-subtle">
                  Ubuntu WSL 2
                </span>
              </div>
              <p className="text-[11px] text-content-muted font-sans tracking-normal">
                Process Scheduler &amp; Resource Manager
              </p>
            </div>
          </div>

          {/* Linear-Style Segmented Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-bg-card/70 p-1 rounded-xl border border-line-subtle shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium font-sans transition-all duration-150 ${
                    active
                      ? 'bg-bg-elevated text-content-primary shadow-sm border border-line-hover text-accent-primary'
                      : 'text-content-secondary hover:text-content-primary hover:bg-bg-hover/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-accent-primary' : 'text-content-muted'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Telemetry Status & Scheduler Quick Actions */}
          <div className="flex items-center space-x-3">
            {/* Live Telemetry Pill */}
            <div className="hidden lg:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-bg-card border border-line-subtle text-xs">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  {connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-green opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-status-green' : 'bg-status-red'}`} />
                </span>
                <span className={`text-[11px] font-sans font-medium ${connected ? 'text-content-secondary' : 'text-status-red'}`}>
                  {connected ? 'Live Telemetry' : 'Disconnected'}
                </span>
              </div>
              {system && (
                <>
                  <span className="text-line-subtle">|</span>
                  <span className="text-[11px] font-sans text-content-muted">
                    CPU <span className="font-mono text-content-primary font-medium">{system.cpu_overall_percent}%</span>
                  </span>
                  <span className="text-line-subtle">|</span>
                  <span className="text-[11px] font-sans text-content-muted">
                    RAM <span className="font-mono text-content-primary font-medium">{system.memory_percent}%</span>
                  </span>
                </>
              )}
            </div>

            {/* Scheduler Action Button Group */}
            <div className="flex items-center space-x-1.5 bg-bg-card p-1 rounded-xl border border-line-subtle">
              {!isRunning ? (
                <button
                  onClick={onStart}
                  title="Start Scheduler Engine"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold bg-status-green/15 text-status-green hover:bg-status-green/25 border border-status-green/30 transition-all duration-150"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run</span>
                </button>
              ) : (
                <button
                  onClick={onPause}
                  title="Pause Scheduler Engine"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold bg-status-amber/15 text-status-amber hover:bg-status-amber/25 border border-status-amber/30 transition-all duration-150"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}
              <button
                onClick={onReset}
                title="Reset simulation and job states"
                className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-bg-elevated border border-transparent hover:border-line-subtle transition-all duration-150"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
