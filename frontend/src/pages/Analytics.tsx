/**
 * Scheduling Analytics & Performance Evaluation Page.
 * Displays measured averages (TAT, WT, RT, Utilization, Throughput), interactive Gantt chart,
 * per-job breakdown, real SQLite run history comparisons, and 1-click CSV export.
 */
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  Cpu,
  GitCompare,
  Download,
  History
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { AnalyticsSummary, GanttEvent, Job, SchedulingRunHistory } from '../types';
import { GanttChart } from '../components/GanttChart';
import { MetricCard } from '../components/MetricCard';
import { api } from '../api/client';

interface AnalyticsProps {
  analytics: AnalyticsSummary | null;
  gantt: GanttEvent[];
  jobs: Job[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ analytics, gantt, jobs }) => {
  const [historyRuns, setHistoryRuns] = useState<SchedulingRunHistory[]>([]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await api.getHistory();
        setHistoryRuns(data);
      } catch (err) {
        console.error("Failed to load history", err);
      }
    }
    loadHistory();
  }, [analytics?.completed_jobs, analytics?.algorithm]);

  const completedHistory = historyRuns.filter((r) => r.status === 'COMPLETED' && r.completed_jobs > 0);

  const getLatestMeasuredForAlgo = (algoKey: string) => {
    if (analytics?.algorithm === algoKey && analytics.completed_jobs > 0) {
      return {
        avgWT: analytics.avg_waiting_time,
        avgTAT: analytics.avg_turnaround_time,
        avgRT: analytics.avg_response_time,
        measured: true,
      };
    }
    const found = completedHistory.find((r) => r.algorithm === algoKey);
    if (found) {
      return {
        avgWT: found.avg_waiting_time,
        avgTAT: found.avg_turnaround_time,
        avgRT: found.avg_response_time,
        measured: true,
      };
    }
    return { avgWT: 0, avgTAT: 0, avgRT: 0, measured: false };
  };

  const algoMeta = [
    { key: 'FCFS', label: 'FCFS' },
    { key: 'SJF', label: 'SJF / SRTF' },
    { key: 'PRIORITY', label: 'Priority' },
    { key: 'ROUND_ROBIN', label: 'Round Robin' },
  ];

  const comparisonData = algoMeta.map((a) => {
    const m = getLatestMeasuredForAlgo(a.key);
    return {
      name: m.measured ? a.label : `${a.label} (Not Run)`,
      avgWT: m.avgWT,
      avgTAT: m.avgTAT,
      avgRT: m.avgRT,
    };
  });

  const measuredCount = algoMeta.filter((a) => getLatestMeasuredForAlgo(a.key).measured).length;

  const jobsList = analytics?.jobs || jobs;

  const handleExportCSV = () => {
    const headerSummary = [
      'NEXUS Process Supervisor - Scheduling Analytics Report',
      `Evaluated Policy,${analytics?.algorithm || 'FCFS'}`,
      `Completed Jobs,${analytics?.completed_jobs ?? 0}`,
      `Avg Turnaround Time (s),${analytics?.avg_turnaround_time ?? 0}`,
      `Avg Waiting Time (s),${analytics?.avg_waiting_time ?? 0}`,
      `Avg Response Time (s),${analytics?.avg_response_time ?? 0}`,
      `CPU Utilization (%),${analytics?.cpu_utilization ?? 0}`,
      `Throughput (jobs/s),${analytics?.throughput ?? 0}`,
      '',
      'Job ID,Name,Workload Type,Priority,Arrival Time (s),Est Burst (s),Measured Runtime (s),Status,Waiting Time (s),Turnaround Time (s),Response Time (s)',
    ];

    const rows = jobsList.map((j) =>
      [
        j.id,
        `"${(j.name || '').replace(/"/g, '""')}"`,
        j.workload_type,
        j.priority,
        j.arrival_time.toFixed(2),
        j.estimated_burst_time.toFixed(2),
        j.elapsed_time.toFixed(2),
        j.status,
        j.waiting_time !== null && j.waiting_time !== undefined ? j.waiting_time.toFixed(2) : '',
        j.turnaround_time !== null && j.turnaround_time !== undefined ? j.turnaround_time.toFixed(2) : '',
        j.response_time !== null && j.response_time !== undefined ? j.response_time.toFixed(2) : '',
      ].join(',')
    );

    const csvContent = [...headerSummary, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-analytics-${(analytics?.algorithm || 'fcfs').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-content-primary flex items-center space-x-2.5">
            <BarChart3 className="w-5 h-5 text-accent-primary" />
            <span>Scheduling Analytics &amp; Performance Evaluation</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1 font-sans">
            Mathematical evaluation of CPU scheduling policies, waiting times, turnaround times, and timeline slices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-sans">
          <span className="px-3 py-1.5 rounded-xl bg-bg-card border border-line-subtle text-content-secondary">
            Evaluated Policy: <span className="font-mono text-accent-primary font-semibold">{analytics?.algorithm || 'FCFS'}</span>
          </span>
          <button
            onClick={handleExportCSV}
            disabled={jobsList.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-accent-primary hover:bg-accent-hover text-bg-main font-semibold transition-all shadow-sm disabled:opacity-40"
            title="Download measured scheduling metrics as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Mathematical Averages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <MetricCard
          title="Avg Turnaround Time"
          value={`${analytics?.avg_turnaround_time || 0.0}s`}
          subtext="TAT = Completion - Arrival"
          icon={Clock}
          accentColor="purple"
        />
        <MetricCard
          title="Avg Waiting Time"
          value={`${analytics?.avg_waiting_time || 0.0}s`}
          subtext="WT = TAT - Actual Runtime"
          icon={Clock}
          accentColor="amber"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${analytics?.avg_response_time || 0.0}s`}
          subtext="RT = First Start - Arrival"
          icon={Zap}
          accentColor="emerald"
        />
        <MetricCard
          title="CPU Slot Utilization"
          value={`${analytics?.cpu_utilization || 0.0}%`}
          subtext="Slot Time Occupancy"
          icon={Cpu}
          accentColor="cyan"
        />
        <MetricCard
          title="Throughput"
          value={`${analytics?.throughput || 0.0}`}
          subtext="Completed Tasks / Sec"
          icon={TrendingUp}
          accentColor="slate"
        />
      </div>

      {/* Interactive Gantt Chart */}
      <GanttChart events={gantt} />

      {/* Detailed Mathematical Per-Job Performance Table */}
      <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold font-sans text-content-primary">
              Per-Job Performance Verification
            </h2>
            <p className="text-xs text-content-secondary font-sans mt-0.5">
              Operating Systems Formulations: TAT = C_i - A_i &bull; WT = TAT_i - ActualRuntime &bull; RT = S_i - A_i.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-line-subtle text-content-muted uppercase text-[10px] font-semibold tracking-wider bg-bg-elevated/40">
                <th className="py-2.5 px-3">Job ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Arrival (A_i)</th>
                <th className="py-2.5 px-3">Est. Burst</th>
                <th className="py-2.5 px-3">Measured Runtime</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Waiting (WT)</th>
                <th className="py-2.5 px-3">Turnaround (TAT)</th>
                <th className="py-2.5 px-3">Response (RT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle/40">
              {jobsList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-content-muted font-sans text-xs">
                    No jobs present. Run jobs to compute analytical metrics.
                  </td>
                </tr>
              ) : (
                jobsList.map((job) => (
                  <tr key={job.id} className="hover:bg-bg-hover/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-content-muted text-[11px]">
                      {job.id}
                    </td>
                    <td className="py-3 px-3 font-medium text-content-primary">
                      {job.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-content-secondary">
                      {job.arrival_time.toFixed(1)}s
                    </td>
                    <td className="py-3 px-3 font-mono text-content-secondary">
                      {job.estimated_burst_time.toFixed(1)}s
                    </td>
                    <td className="py-3 px-3 font-mono text-content-primary font-medium">
                      {job.elapsed_time.toFixed(1)}s
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-sans px-2.5 py-0.5 rounded-full bg-bg-elevated border border-line-subtle text-content-secondary font-medium">
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-status-amber font-semibold">
                      {job.waiting_time !== null && job.waiting_time !== undefined ? `${job.waiting_time.toFixed(2)}s` : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-accent-primary font-semibold">
                      {job.turnaround_time !== null && job.turnaround_time !== undefined ? `${job.turnaround_time.toFixed(2)}s` : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-status-green font-semibold">
                      {job.response_time !== null && job.response_time !== undefined ? `${job.response_time.toFixed(2)}s` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Algorithm Benchmark Comparison */}
      <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
              <GitCompare className="w-4 h-4 text-accent-primary" />
              <span>Measured Algorithm Comparison</span>
            </h2>
            <p className="text-xs text-content-secondary font-sans mt-0.5">
              Live comparison populated from genuine completed runs in SQLite. Run the same batch across multiple policies (Reset &rarr; Switch Policy &rarr; Start) to compare side by side.
            </p>
          </div>
          <span className="text-[11px] font-mono px-3 py-1 rounded-xl bg-bg-elevated border border-line-subtle text-accent-secondary shrink-0 self-start">
            {measuredCount} / 4 policies measured
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData}>
              <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#6B7488" fontSize={11} fontFamily="Inter, sans-serif" tickLine={false} />
              <YAxis stroke="#6B7488" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: '#6B7488', fontSize: 10, fontFamily: 'Inter' }} />
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
                labelStyle={{ color: '#A0A8BA', marginBottom: '4px', fontFamily: 'Inter, sans-serif' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', paddingTop: '8px' }} />
              <Bar dataKey="avgWT" name="Avg Waiting Time (s)" fill="#FBBF24" radius={[6, 6, 0, 0]} />
              <Bar dataKey="avgTAT" name="Avg Turnaround Time (s)" fill="#A78BFA" radius={[6, 6, 0, 0]} />
              <Bar dataKey="avgRT" name="Avg Response Time (s)" fill="#34D399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {completedHistory.length > 0 && (
          <div className="mt-5 pt-4 border-t border-line-subtle">
            <h3 className="text-xs font-semibold font-sans text-content-primary flex items-center space-x-1.5 mb-2.5">
              <History className="w-3.5 h-3.5 text-accent-primary" />
              <span>Recorded Run Log (Last {Math.min(5, completedHistory.length)} Completed Runs)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {completedHistory.slice(0, 5).map((run) => (
                <div key={run.id} className="bg-bg-elevated/70 border border-line-subtle rounded-xl p-3 text-[11px] font-sans flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-semibold text-accent-primary">
                      {run.algorithm}{run.is_preemptive ? ' (Preemptive)' : ''}
                    </span>
                    <span className="text-content-muted font-mono">{run.completed_jobs}/{run.total_jobs} jobs</span>
                  </div>
                  <div className="flex justify-between font-mono text-content-secondary">
                    <span>WT: <strong className="text-status-amber">{run.avg_waiting_time}s</strong></span>
                    <span>TAT: <strong className="text-accent-primary">{run.avg_turnaround_time}s</strong></span>
                    <span>RT: <strong className="text-status-green">{run.avg_response_time}s</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-line-subtle text-xs font-sans text-content-secondary grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-elevated p-4 rounded-xl border border-line-subtle">
            <span className="text-accent-primary font-semibold block mb-1">Theoretical Observation</span>
            <p className="text-[11px] leading-relaxed text-content-muted">
              Shortest Job First systematically minimizes Average Waiting Time, whereas Round Robin delivers superior interactive Response Times (RT) for queued tasks by distributing time slices evenly.
            </p>
          </div>
          <div className="bg-bg-elevated p-4 rounded-xl border border-line-subtle">
            <span className="text-accent-secondary font-semibold block mb-1">System Architecture Note</span>
            <p className="text-[11px] leading-relaxed text-content-muted">
              NEXUS schedules user-space jobs into available execution slots. Linux kernel context switches occur transparently across hardware CPU cores at microsecond granularity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
