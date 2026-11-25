/**
 * Control Cockpit (Dashboard) Page.
 * Displays live KPI counters, per-core host CPU/RAM bars, active Execution Slots
 * (with direct console log access), a guided 3-step demo strip, and live Gantt timeline.
 */
import React from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Cpu,
  Activity,
  Zap,
  Sparkles,
  ArrowRight,
  Shuffle,
  Terminal
} from 'lucide-react';
import { Job, SchedulerStatus, SystemMetrics, ProcessLive, GanttEvent, RandomBatchConfig } from '../types';
import { MetricCard } from '../components/MetricCard';
import { GanttChart } from '../components/GanttChart';

interface DashboardProps {
  jobs: Job[];
  scheduler: SchedulerStatus | null;
  system: SystemMetrics | null;
  processes: ProcessLive[];
  gantt: GanttEvent[];
  onStartScheduler: () => void;
  onPauseScheduler: () => void;
  onResetScheduler: () => void;
  onLoadPresets: () => void;
  onGenerateRandom: (config: RandomBatchConfig) => Promise<void>;
  onInspectLogs: (jobId: string) => void;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  jobs,
  scheduler,
  system,
  processes,
  gantt,
  onStartScheduler,
  onPauseScheduler,
  onResetScheduler,
  onLoadPresets,
  onGenerateRandom,
  onInspectLogs,
  onNavigate,
}) => {
  const counts = scheduler?.counts || {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'PENDING').length,
    ready: jobs.filter(j => j.status === 'READY').length,
    running: jobs.filter(j => j.status === 'RUNNING').length,
    paused: jobs.filter(j => j.status === 'PAUSED').length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length,
    failed: jobs.filter(j => j.status === 'FAILED' || j.status === 'TERMINATED').length,
  };

  const isRunning = scheduler?.status === 'RUNNING';
  const activeSlots = scheduler?.active_slots || {};
  const totalSlots = scheduler?.execution_slots || 2;

  return (
    <div className="space-y-6">
      {/* Top Banner / System Status Hero */}
      <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold font-sans text-content-primary tracking-tight">
              System Control &amp; Telemetry
            </h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-sans font-medium border flex items-center space-x-1.5 ${
              isRunning
                ? 'bg-status-green/10 text-status-green border-status-green/30'
                : scheduler?.status === 'PAUSED'
                ? 'bg-status-amber/10 text-status-amber border-status-amber/30'
                : 'bg-bg-elevated text-content-secondary border-line-subtle'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isRunning ? 'bg-status-green animate-pulse' : scheduler?.status === 'PAUSED' ? 'bg-status-amber' : 'bg-content-muted'
              }`} />
              <span className="capitalize">{scheduler?.status ? scheduler.status.toLowerCase() : 'stopped'}</span>
            </span>
          </div>
          <p className="text-xs text-content-secondary mt-1.5 font-sans flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Algorithm:</span>
            <span className="px-2 py-0.5 rounded-md bg-bg-elevated text-accent-primary font-mono text-[11px] font-semibold border border-line-subtle">
              {scheduler?.algorithm || 'FCFS'}
            </span>
            {scheduler?.algorithm === 'ROUND_ROBIN' && (
              <span className="text-content-muted text-[11px]">
                (Quantum: <span className="font-mono text-content-primary">{scheduler?.quantum}s</span>)
              </span>
            )}
            {scheduler?.is_preemptive && (
              <span className="px-1.5 py-0.5 rounded bg-accent-secondary/15 text-accent-secondary text-[10px] font-medium border border-accent-secondary/30">
                Preemptive
              </span>
            )}
            <span className="text-content-muted">•</span>
            <span>Concurrency:</span>
            <span className="font-mono text-content-primary font-medium">{totalSlots} slots</span>
            <span className="text-content-muted">•</span>
            <span>Virtual Sim Time:</span>
            <span className="font-mono text-accent-primary font-medium">{scheduler?.sim_elapsed_time?.toFixed(1) || '0.0'}s</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onGenerateRandom({ count: 6, scenario: 'random', clear_existing: true })}
            title="Generate 6 randomized Linux processes with staggered arrival & burst times"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-sans font-medium bg-bg-elevated text-accent-secondary border border-accent-secondary/30 hover:bg-bg-hover transition-all duration-150 shadow-sm"
          >
            <Shuffle className="w-3.5 h-3.5 text-accent-secondary" />
            <span>Random Suite (6 Jobs)</span>
          </button>

          {jobs.length === 0 && (
            <button
              onClick={onLoadPresets}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-sans font-medium bg-bg-elevated text-accent-primary border border-accent-primary/30 hover:bg-bg-hover transition-all duration-150 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
              <span>Standard Benchmark</span>
            </button>
          )}

          {!isRunning ? (
            <button
              onClick={onStartScheduler}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-accent-primary text-bg-main hover:bg-accent-hover shadow-sm transition-all duration-150"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Engine</span>
            </button>
          ) : (
            <button
              onClick={onPauseScheduler}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-status-amber text-bg-main hover:brightness-105 shadow-sm transition-all duration-150"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={onResetScheduler}
            title="Reset All Jobs"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-sans font-medium bg-bg-elevated text-content-secondary hover:text-content-primary hover:bg-bg-hover border border-line-subtle transition-all duration-150"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Interactive Guided Demo Progress Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            step: '1',
            title: 'Queue Random Workloads',
            desc: counts.total > 0 ? `${counts.total} Linux tasks ready in queue` : 'Click "Random Suite" above or add custom tasks',
            done: counts.total > 0,
            tab: 'jobs',
          },
          {
            step: '2',
            title: 'Execute & Control Signals',
            desc: isRunning ? `Dispatching via ${scheduler?.algorithm || 'FCFS'} — click any slot to inspect stdout` : 'Click Start Engine or pick a policy in Scheduler',
            done: isRunning || counts.completed > 0 || processes.length > 0,
            tab: 'monitor',
          },
          {
            step: '3',
            title: 'Analyze Gantt & Metrics',
            desc: counts.completed > 0 ? `${counts.completed} jobs measured (TAT, WT, RT)` : 'Compare FCFS, SJF, Priority & Round Robin live',
            done: counts.completed > 0,
            tab: 'analytics',
          },
        ].map((item) => (
          <button
            key={item.step}
            onClick={() => onNavigate(item.tab)}
            className={`text-left p-3.5 rounded-xl border transition-all duration-150 flex items-start space-x-3 ${
              item.done
                ? 'bg-bg-card border-status-green/30 hover:border-status-green/50'
                : 'bg-bg-card/60 border-line-subtle hover:border-line-hover'
            }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
              item.done ? 'bg-status-green/15 text-status-green border border-status-green/30' : 'bg-bg-elevated text-content-muted border border-line-subtle'
            }`}>
              {item.done ? '✓' : item.step}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-sans font-semibold text-content-primary">{item.title}</div>
              <div className="text-[11px] font-sans text-content-muted truncate mt-0.5">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          title="Total Jobs"
          value={counts.total}
          icon={Layers}
          accentColor="purple"
        />
        <MetricCard
          title="Running Slots"
          value={`${counts.running} / ${totalSlots}`}
          subtext="Active PIDs"
          icon={Activity}
          accentColor="cyan"
        />
        <MetricCard
          title="Waiting"
          value={counts.ready + counts.pending}
          subtext={`${counts.ready} ready, ${counts.pending} pending`}
          icon={Clock}
          accentColor="amber"
        />
        <MetricCard
          title="Suspended"
          value={counts.paused}
          subtext="SIGSTOP frozen"
          icon={Pause}
          accentColor="amber"
        />
        <MetricCard
          title="Completed"
          value={counts.completed}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <MetricCard
          title="Terminated / Failed"
          value={counts.failed}
          icon={AlertCircle}
          accentColor="rose"
        />
      </div>

      {/* Hardware Telemetry & Execution Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Hardware Measurements */}
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-accent-primary" />
                <span>Host Hardware Telemetry</span>
              </h3>
              <span className="text-[11px] font-sans text-content-muted bg-bg-elevated px-2.5 py-0.5 rounded-full border border-line-subtle">
                {system?.logical_cores || 1} Cores
              </span>
            </div>

            {/* Overall CPU Bar */}
            <div className="space-y-4 mb-5">
              <div>
                <div className="flex justify-between text-xs font-sans mb-1.5">
                  <span className="text-content-secondary">Total CPU Usage</span>
                  <span className="font-mono text-content-primary font-semibold">{system?.cpu_overall_percent || 0}%</span>
                </div>
                <div className="w-full bg-bg-subtle h-2 rounded-full overflow-hidden border border-line-subtle">
                  <div
                    className="bg-accent-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, system?.cpu_overall_percent || 0)}%` }}
                  />
                </div>
              </div>

              {/* Memory Bar */}
              <div>
                <div className="flex justify-between text-xs font-sans mb-1.5">
                  <span className="text-content-secondary">RAM Consumption</span>
                  <span className="font-mono text-content-primary font-semibold">
                    {system?.memory_used_mb || 0} MB <span className="text-content-muted font-sans font-normal">({system?.memory_percent || 0}%)</span>
                  </span>
                </div>
                <div className="w-full bg-bg-subtle h-2 rounded-full overflow-hidden border border-line-subtle">
                  <div
                    className="bg-accent-secondary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, system?.memory_percent || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Per-Core Distribution */}
            <div>
              <span className="text-xs font-sans font-medium text-content-secondary block mb-2.5">
                Core Distribution
              </span>
              <div className="grid grid-cols-2 gap-2">
                {system?.cpu_per_core_percent?.map((usage, idx) => (
                  <div key={idx} className="bg-bg-elevated border border-line-subtle rounded-xl p-2.5 text-xs font-sans">
                    <div className="flex justify-between text-content-muted text-[11px] mb-1.5">
                      <span>Core {idx}</span>
                      <span className={`font-mono ${usage > 50 ? 'text-accent-primary font-semibold' : 'text-content-secondary'}`}>
                        {usage}%
                      </span>
                    </div>
                    <div className="w-full bg-bg-card h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-accent-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, usage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-line-subtle text-xs font-sans text-content-muted flex justify-between items-center">
            <span>Kernel Threads: <span className="font-mono text-content-secondary">{system?.active_process_count || 0}</span></span>
            <button
              onClick={() => onNavigate('monitor')}
              className="text-accent-primary hover:text-accent-hover font-medium flex items-center space-x-1 transition-colors"
            >
              <span>Process Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Execution Slots Status */}
        <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
                <Zap className="w-4 h-4 text-accent-secondary" />
                <span>Concurrent Execution Slots</span>
              </h3>
              <span className="text-xs font-sans text-content-muted">
                Multi-process Concurrency: <span className="font-mono font-medium text-content-primary">{totalSlots} simultaneous</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Array.from({ length: totalSlots }).map((_, slotIdx) => {
                const assignedJobId = activeSlots[slotIdx];
                const job = assignedJobId ? jobs.find(j => j.id === assignedJobId) : null;
                const proc = assignedJobId ? processes.find(p => p.job_id === assignedJobId) : null;

                return (
                  <div
                    key={slotIdx}
                    className={`rounded-xl p-4 transition-all duration-150 ${
                      job
                        ? 'bg-bg-elevated border border-accent-primary/30 shadow-sm'
                        : 'bg-bg-subtle/50 border border-line-subtle border-dashed text-content-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-bg-card text-content-secondary border border-line-subtle">
                          SLOT {slotIdx}
                        </span>
                        {job && (
                          <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-status-green/15 text-status-green border border-status-green/30 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse" />
                            <span>RUNNING</span>
                          </span>
                        )}
                      </div>
                      {proc && (
                        <span className="text-xs font-mono text-accent-primary font-semibold">
                          PID: {proc.pid}
                        </span>
                      )}
                    </div>

                    {job ? (
                      <div className="space-y-2">
                        <div className="font-sans font-semibold text-content-primary text-sm truncate">
                          {job.name}
                        </div>
                        <div className="flex justify-between text-content-secondary text-xs font-sans">
                          <span className="capitalize">{job.workload_type} Workload</span>
                          <span className="font-mono">
                            <span className="text-accent-primary font-medium">{job.elapsed_time.toFixed(1)}s</span> / {job.estimated_burst_time.toFixed(1)}s
                          </span>
                        </div>
                        {proc && (
                          <div className="flex justify-between items-center text-[11px] pt-2 border-t border-line-subtle text-content-muted">
                            <div className="flex space-x-3">
                              <span>CPU: <span className="font-mono text-content-primary font-medium">{proc.cpu_percent}%</span></span>
                              <span>RSS: <span className="font-mono text-content-primary font-medium">{proc.memory_rss_mb} MB</span></span>
                            </div>
                            <button
                              onClick={() => onInspectLogs(job.id)}
                              className="flex items-center space-x-1 text-accent-secondary hover:text-content-primary font-sans font-medium transition-colors"
                              title="Open live Linux console stream"
                            >
                              <Terminal className="w-3 h-3" />
                              <span>Logs</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center text-xs font-sans text-content-muted">
                        Idle — Waiting for eligible ready job dispatch
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-line-subtle flex items-center justify-between text-xs font-sans text-content-muted">
            <span>Dedicated execution slots isolated via POSIX process groups</span>
            <button
              onClick={() => onNavigate('scheduler')}
              className="text-accent-primary hover:text-accent-hover font-medium flex items-center space-x-1 transition-colors"
            >
              <span>Configure Engine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Execution Timeline / Gantt Chart Widget */}
      <GanttChart events={gantt} slotsCount={totalSlots} />
    </div>
  );
};
