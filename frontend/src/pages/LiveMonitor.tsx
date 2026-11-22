import React, { useState, useEffect } from 'react';
import {
  Activity,
  Pause,
  Play,
  Square,
  Cpu,
  HardDrive
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ProcessLive, SystemMetrics, Job } from '../types';

interface LiveMonitorProps {
  processes: ProcessLive[];
  system: SystemMetrics | null;
  jobs: Job[];
  onPauseProcess: (jobId: string) => Promise<void>;
  onResumeProcess: (jobId: string) => Promise<void>;
  onTerminateProcess: (jobId: string) => Promise<void>;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  processes,
  system,
  onPauseProcess,
  onResumeProcess,
  onTerminateProcess,
}) => {
  const [telemetryHistory, setTelemetryHistory] = useState<Array<{ time: string; cpu: number; memory: number }>>([]);

  useEffect(() => {
    if (system) {
      const now = new Date();
      const timeStr = `${now.getMinutes()}:${now.getSeconds().toString().padStart(2, '0')}`;
      setTelemetryHistory(prev => {
        const next = [...prev, { time: timeStr, cpu: system.cpu_overall_percent, memory: system.memory_used_mb }];
        return next.slice(-25);
      });
    }
  }, [system?.cpu_overall_percent, system?.memory_used_mb]);

  const activeCount = processes.filter(p => p.status === 'RUNNING').length;
  const pausedCount = processes.filter(p => p.status === 'PAUSED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-content-primary flex items-center space-x-2.5">
            <Activity className="w-5 h-5 text-accent-primary" />
            <span>Live Kernel Process Monitor &amp; Signal Controller</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1 font-sans">
            Direct inspection of live Linux processes (PIDs/PGIDs) via POSIX signals (SIGSTOP, SIGCONT, SIGTERM).
          </p>
        </div>

        <div className="flex items-center space-x-2.5 text-xs font-sans">
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-line-subtle text-content-secondary">
            Total Processes: <span className="font-mono text-content-primary font-semibold">{processes.length}</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-line-subtle text-content-secondary">
            Running: <span className="font-mono text-status-green font-semibold">{activeCount}</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-line-subtle text-content-secondary">
            Suspended: <span className="font-mono text-status-amber font-semibold">{pausedCount}</span>
          </span>
        </div>
      </div>

      {/* Real-time Hardware Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Telemetry Stream */}
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-accent-primary" />
              <span>Real Host CPU Utilization (%)</span>
            </h3>
            <span className="text-xs font-mono font-medium text-accent-primary bg-bg-elevated px-2.5 py-1 rounded-lg border border-line-subtle">
              {system?.cpu_overall_percent || 0}% Total
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryHistory}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#6B7488" fontSize={10} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#6B7488" fontSize={10} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#292F40',
                    borderColor: '#2E3446',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
                  }}
                  itemStyle={{ color: '#F1F2F7' }}
                  labelStyle={{ color: '#A0A8BA', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#A78BFA" strokeWidth={2} fillOpacity={1} fill="url(#cpuGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Telemetry Stream */}
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-accent-secondary" />
              <span>Resident RAM Consumption (MB)</span>
            </h3>
            <span className="text-xs font-mono font-medium text-accent-secondary bg-bg-elevated px-2.5 py-1 rounded-lg border border-line-subtle">
              {system?.memory_used_mb || 0} MB ({system?.memory_percent || 0}%)
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryHistory}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B9CF7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B9CF7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#6B7488" fontSize={10} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                <YAxis stroke="#6B7488" fontSize={10} fontFamily="JetBrains Mono, monospace" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#292F40',
                    borderColor: '#2E3446',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
                  }}
                  itemStyle={{ color: '#F1F2F7' }}
                  labelStyle={{ color: '#A0A8BA', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="memory" stroke="#8B9CF7" strokeWidth={2} fillOpacity={1} fill="url(#memGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Linux Process Table */}
      <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold font-sans text-content-primary">
              Active Linux Processes ({processes.length})
            </h2>
            <p className="text-xs text-content-secondary font-sans mt-0.5">
              Live kernel state retrieved via <code>psutil</code>. POSIX signals are delivered directly to process groups.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-line-subtle text-content-muted uppercase text-[10px] font-semibold tracking-wider bg-bg-elevated/40">
                <th className="py-2.5 px-3">PID</th>
                <th className="py-2.5 px-3">PGID</th>
                <th className="py-2.5 px-3">Job Name</th>
                <th className="py-2.5 px-3">Profile</th>
                <th className="py-2.5 px-3">Kernel State</th>
                <th className="py-2.5 px-3">CPU %</th>
                <th className="py-2.5 px-3">RSS (MB)</th>
                <th className="py-2.5 px-3">Slot</th>
                <th className="py-2.5 px-3">Runtime</th>
                <th className="py-2.5 px-3 text-right">POSIX Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle/40">
              {processes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-content-muted font-sans text-xs">
                    No active Linux processes currently managed. Start the scheduler to dispatch tasks.
                  </td>
                </tr>
              ) : (
                processes.map((proc) => {
                  const isAlive = proc.os_status !== 'TERMINATED' && proc.os_status !== 'ZOMBIE';
                  const isPaused = proc.status === 'PAUSED' || proc.os_status === 'PAUSED';

                  return (
                    <tr
                      key={proc.job_id}
                      className="hover:bg-bg-hover/30 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-semibold text-accent-primary">
                        {proc.pid}
                      </td>
                      <td className="py-3 px-3 font-mono text-content-muted text-[11px]">
                        {proc.pgid}
                      </td>
                      <td className="py-3 px-3 font-medium text-content-primary">
                        {proc.name}
                      </td>
                      <td className="py-3 px-3 capitalize text-content-secondary text-[11px]">
                        {proc.workload_type}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-sans px-2.5 py-0.5 rounded-full border font-medium inline-flex items-center space-x-1.5 ${
                          proc.status === 'RUNNING'
                            ? 'bg-status-green/10 text-status-green border-status-green/25'
                            : proc.status === 'PAUSED'
                            ? 'bg-status-amber/10 text-status-amber border-status-amber/25'
                            : 'bg-bg-elevated text-content-secondary border-line-subtle'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            proc.status === 'RUNNING' ? 'bg-status-green animate-pulse' : 'bg-current'
                          }`} />
                          <span>{proc.os_status || proc.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-content-primary">
                        {proc.cpu_percent}%
                      </td>
                      <td className="py-3 px-3 font-mono text-accent-secondary font-medium">
                        {proc.memory_rss_mb} MB
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {proc.slot !== null && proc.slot !== undefined ? (
                          <span className="px-2 py-0.5 rounded-md bg-bg-elevated border border-line-subtle text-content-primary text-xs">
                            Slot {proc.slot}
                          </span>
                        ) : (
                          <span className="text-content-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-content-secondary">
                        {proc.elapsed_time}s
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {isAlive && !isPaused && (
                            <button
                              onClick={() => onPauseProcess(proc.job_id)}
                              title="Send SIGSTOP (Freeze process)"
                              className="px-2.5 py-1 rounded-lg bg-status-amber/15 hover:bg-status-amber/25 text-status-amber border border-status-amber/30 text-[11px] font-sans font-medium flex items-center space-x-1 transition-colors"
                            >
                              <Pause className="w-3 h-3" />
                              <span>SIGSTOP</span>
                            </button>
                          )}

                          {isAlive && isPaused && (
                            <button
                              onClick={() => onResumeProcess(proc.job_id)}
                              title="Send SIGCONT (Unfreeze process)"
                              className="px-2.5 py-1 rounded-lg bg-status-green/15 hover:bg-status-green/25 text-status-green border border-status-green/30 text-[11px] font-sans font-medium flex items-center space-x-1 transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              <span>SIGCONT</span>
                            </button>
                          )}

                          {isAlive && (
                            <button
                              onClick={() => onTerminateProcess(proc.job_id)}
                              title="Send SIGTERM (Terminate process group)"
                              className="px-2.5 py-1 rounded-lg bg-status-red/15 hover:bg-status-red/25 text-status-red border border-status-red/30 text-[11px] font-sans font-medium flex items-center space-x-1 transition-colors"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              <span>SIGTERM</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Technical Signals Guide footer */}
        <div className="mt-6 pt-5 border-t border-line-subtle grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
          <div className="bg-bg-elevated p-4 rounded-xl border border-line-subtle">
            <span className="font-semibold text-status-amber block mb-1">SIGSTOP (Signal 19)</span>
            <p className="text-[11px] text-content-secondary leading-relaxed">
              Suspends process execution instantly. The Linux kernel flags task state as <code>TASK_STOPPED</code>, halting CPU execution while preserving memory pages and execution context.
            </p>
          </div>

          <div className="bg-bg-elevated p-4 rounded-xl border border-line-subtle">
            <span className="font-semibold text-status-green block mb-1">SIGCONT (Signal 18)</span>
            <p className="text-[11px] text-content-secondary leading-relaxed">
              Resumes execution paused by SIGSTOP. The kernel marks the process as <code>TASK_RUNNING</code>, making it eligible for CPU time slices on the next scheduler tick.
            </p>
          </div>

          <div className="bg-bg-elevated p-4 rounded-xl border border-line-subtle">
            <span className="font-semibold text-status-red block mb-1">SIGTERM &amp; SIGKILL (Signals 15/9)</span>
            <p className="text-[11px] text-content-secondary leading-relaxed">
              Dispatches graceful termination to the process group. If the process does not terminate within the grace interval, SIGKILL is issued to reclaim all kernel resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
