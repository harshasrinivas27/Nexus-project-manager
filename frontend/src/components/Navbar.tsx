/**
 * Top Navigation Bar & Three-Dashed Slide-Out Drawer.
 * Displays real-time WebSocket connection status, active algorithm summary,
 * quick Start/Pause/Reset engine controls, and categorized workspace navigation.
 */
import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  LayoutDashboard,
  Layers,
  Cpu,
  Activity,
  BarChart3,
  Settings as SettingsIcon,
  Play,
  Pause,
  RotateCcw,
  Globe,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { SchedulerStatus, SystemMetrics } from '../types';
import { NexusLogo } from './NexusLogo';

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
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    {
      id: 'landing',
      label: 'Platform Overview',
      subtitle: 'Architecture, feature gallery & system specs',
      icon: Globe,
      badge: 'Showcase',
      color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    },
    {
      id: 'dashboard',
      label: 'Control Cockpit',
      subtitle: 'Real-time telemetry, active slots & timeline',
      icon: LayoutDashboard,
      badge: scheduler?.status || 'Active',
      color: 'text-accent-primary bg-accent-primary/10 border-accent-primary/20',
    },
    {
      id: 'jobs',
      label: 'Job Dispatcher',
      subtitle: 'Define CPU, memory & secure command tasks',
      icon: Layers,
      badge: `${scheduler?.counts?.total ?? 0} Jobs`,
      color: 'text-accent-secondary bg-accent-secondary/10 border-accent-secondary/20',
    },
    {
      id: 'scheduler',
      label: 'Scheduling Policies',
      subtitle: 'FCFS, SJF/SRTF, Priority & Round Robin controls',
      icon: Cpu,
      badge: scheduler?.algorithm || 'FCFS',
      color: 'text-status-green bg-status-green/10 border-status-green/20',
    },
    {
      id: 'monitor',
      label: 'Kernel Process Monitor',
      subtitle: 'Direct POSIX signals (SIGSTOP, SIGCONT, SIGTERM)',
      icon: Activity,
      badge: `${scheduler?.counts?.running ?? 0} Running`,
      color: 'text-status-amber bg-status-amber/10 border-status-amber/20',
    },
    {
      id: 'analytics',
      label: 'Performance Analytics',
      subtitle: 'Mathematical TAT, WT, RT and Gantt slices',
      icon: BarChart3,
      badge: 'Metrics',
      color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    },
    {
      id: 'settings',
      label: 'Hardware & Affinity',
      subtitle: 'Multi-core execution slots and CPU core masks',
      icon: SettingsIcon,
      badge: `${system?.logical_cores ?? 4} Cores`,
      color: 'text-content-secondary bg-bg-elevated border-line-subtle',
    },
  ];

  const isRunning = scheduler?.status === 'RUNNING';
  const activeItem = navItems.find((item) => item.id === currentTab) || navItems[0];

  const handleSelectTab = (id: string) => {
    onTabChange(id);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="border-b border-line-subtle/80 bg-bg-main/90 backdrop-blur-xl sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Crafted Logo + Current View Badge */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onTabChange('landing')}
                className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary rounded-lg"
              >
                <NexusLogo size={34} subtitle="Enterprise Process Supervisor" />
              </button>

              <span className="hidden sm:inline-block text-line-subtle">/</span>

              {/* Active Section Pill */}
              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-bg-card border border-line-subtle text-xs font-sans text-content-secondary shadow-sm">
                <activeItem.icon className="w-3.5 h-3.5 text-accent-primary" />
                <span className="font-medium text-content-primary">{activeItem.label}</span>
              </div>
            </div>

            {/* Right Controls: Telemetry + Run/Pause + Three-Dashed Menu Button */}
            <div className="flex items-center space-x-3">
              {/* Telemetry Indicator */}
              <div className="hidden md:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-bg-card border border-line-subtle text-xs">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    {connected && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-green opacity-75" />
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-status-green' : 'bg-status-red'}`} />
                  </span>
                  <span className={`text-[11px] font-sans font-medium ${connected ? 'text-content-secondary' : 'text-status-red'}`}>
                    {connected ? 'Live Kernel Telemetry' : 'Offline'}
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

              {/* Quick Scheduler Action Group */}
              <div className="flex items-center space-x-1.5 bg-bg-card p-1 rounded-xl border border-line-subtle">
                {!isRunning ? (
                  <button
                    onClick={onStart}
                    title="Start Scheduler Loop"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold bg-status-green/15 text-status-green hover:bg-status-green/25 border border-status-green/30 transition-all duration-150"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run</span>
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    title="Pause Scheduler Loop"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold bg-status-amber/15 text-status-amber hover:bg-status-amber/25 border border-status-amber/30 transition-all duration-150"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}
                <button
                  onClick={onReset}
                  title="Reset Simulation State"
                  className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-bg-elevated border border-transparent hover:border-line-subtle transition-all duration-150"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* THE THREE-DASHED MENU ICON BUTTON */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`relative flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-sans font-semibold border transition-all duration-200 shadow-sm ${
                  menuOpen
                    ? 'bg-accent-primary text-bg-main border-accent-primary'
                    : 'bg-bg-card hover:bg-bg-elevated text-content-primary border-line-subtle hover:border-line-hover'
                }`}
                aria-label="Toggle navigation menu"
                title="Navigation Menu"
              >
                {menuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  /* Custom crisp three-dashed hamburger glyph */
                  <div className="w-4 h-3.5 flex flex-col justify-between items-center py-[1px]">
                    <span className="w-4 h-[2px] rounded-full bg-current transition-all" />
                    <span className="w-3 h-[2px] rounded-full bg-current self-start transition-all" />
                    <span className="w-4 h-[2px] rounded-full bg-current transition-all" />
                  </div>
                )}
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* FLYOUT SLIDE-OVER NAVIGATION DRAWER */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Blur */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-bg-card/95 border-l border-line-hover shadow-elevated backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-8 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-line-subtle">
                <NexusLogo size={32} subtitle="Platform Navigation" />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-xl text-content-secondary hover:text-content-primary hover:bg-bg-elevated border border-line-subtle transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menu Items List */}
              <nav className="mt-6 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between group ${
                        isActive
                          ? 'bg-bg-elevated border-accent-primary/60 shadow-sm'
                          : 'bg-bg-subtle/60 border-line-subtle hover:bg-bg-elevated hover:border-line-hover'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.color}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-sans font-semibold text-xs text-content-primary group-hover:text-accent-primary transition-colors truncate">
                              {item.label}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] font-sans text-content-muted truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        {item.badge && (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-bg-card border border-line-subtle text-content-secondary">
                            {item.badge}
                          </span>
                        )}
                        <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-accent-primary translate-x-0.5' : 'text-content-muted group-hover:translate-x-1'}`} />
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer System Status Card */}
            <div className="pt-5 border-t border-line-subtle space-y-3">
              <div className="p-3.5 rounded-2xl bg-bg-elevated/80 border border-line-subtle flex items-center justify-between text-xs font-sans">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-accent-primary" />
                  <div>
                    <div className="font-semibold text-content-primary">Production Supervisor</div>
                    <div className="text-[10px] text-content-muted">POSIX Signal Isolation Active</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-green/15 text-status-green border border-status-green/25 font-semibold">
                  ONLINE
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-sans text-content-muted px-1">
                <span>NEXUS Process Management System</span>
                <span className="font-mono">v2.4.0-release</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
