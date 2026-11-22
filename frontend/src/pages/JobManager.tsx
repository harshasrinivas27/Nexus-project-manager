import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Cpu,
  HardDrive,
  Clock,
  Terminal,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { Job } from '../types';

interface JobManagerProps {
  jobs: Job[];
  onCreateJob: (jobData: Partial<Job>) => Promise<void>;
  onUpdateJob: (id: string, jobData: Partial<Job>) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  onLoadPresets: () => Promise<void>;
}

export const JobManager: React.FC<JobManagerProps> = ({
  jobs,
  onCreateJob,
  onUpdateJob,
  onDeleteJob,
  onLoadPresets,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [workloadType, setWorkloadType] = useState<'cpu' | 'memory' | 'io' | 'custom'>('cpu');
  const [customCommand, setCustomCommand] = useState('python3 -c "import time; time.sleep(3); print(\'Custom task done\')"');
  const [priority, setPriority] = useState<number>(5);
  const [arrivalTime, setArrivalTime] = useState<number>(0.0);
  const [burstTime, setBurstTime] = useState<number>(5.0);
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please specify a valid Job Name');
      return;
    }

    if (workloadType === 'custom' && !customCommand.trim()) {
      setErrorMsg('Custom command is required for custom workload');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateJob({
        name: name.trim(),
        workload_type: workloadType,
        command: workloadType === 'custom' ? customCommand.trim() : undefined,
        priority: Number(priority),
        arrival_time: Number(arrivalTime),
        estimated_burst_time: Number(burstTime),
        description: description.trim(),
      });

      setSuccessMsg(`Job "${name}" created and enqueued to PENDING queue.`);
      setName('');
      setDescription('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    try {
      await onUpdateJob(editingJob.id, {
        name: editingJob.name,
        priority: Number(editingJob.priority),
        arrival_time: Number(editingJob.arrival_time),
        estimated_burst_time: Number(editingJob.estimated_burst_time),
        description: editingJob.description,
      });
      setEditingJob(null);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-content-primary flex items-center space-x-2.5">
            <Layers className="w-5 h-5 text-accent-primary" />
            <span>Job Creation &amp; Queue Management</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1 font-sans">
            Configure synthetic CPU, memory, and I/O workloads or secure tokenized Linux commands for process dispatch.
          </p>
        </div>

        <button
          onClick={onLoadPresets}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-sans font-medium bg-bg-card hover:bg-bg-elevated text-accent-primary border border-accent-primary/30 transition-all duration-150 shadow-sm self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <span>Load Standard Benchmark Suite</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Job Creation Form */}
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card">
          <h2 className="text-sm font-semibold font-sans text-content-primary mb-4 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-accent-primary" />
            <span>New Workload Definition</span>
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-status-red/10 border border-status-red/25 text-status-red text-xs font-sans">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-status-green/10 border border-status-green/25 text-status-green text-xs font-sans flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Job Name */}
            <div>
              <label className="block text-xs font-sans font-medium text-content-secondary mb-1.5">
                Job Name <span className="text-accent-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Matrix Multiplier or Cache Sweep"
                className="w-full bg-bg-subtle border border-line-subtle rounded-xl px-3.5 py-2 text-xs font-sans text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all"
              />
            </div>

            {/* Workload Type Selector */}
            <div>
              <label className="block text-xs font-sans font-medium text-content-secondary mb-2">
                Workload Profile <span className="text-accent-primary">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cpu', label: 'CPU-Bound', desc: 'Primes & Matrix', icon: Cpu },
                  { id: 'memory', label: 'Memory-Bound', desc: '80MB RAM Sweep', icon: HardDrive },
                  { id: 'io', label: 'I/O-Bound', desc: 'Disk Sync & Wait', icon: Clock },
                  { id: 'custom', label: 'Custom Command', desc: 'POSIX Executable', icon: Terminal },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = workloadType === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setWorkloadType(item.id as any)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 ${
                        selected
                          ? 'bg-bg-elevated border-accent-primary/60 text-content-primary shadow-sm'
                          : 'bg-bg-subtle border-line-subtle text-content-secondary hover:border-line-hover hover:text-content-primary'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className={`w-3.5 h-3.5 ${selected ? 'text-accent-primary' : 'text-content-muted'}`} />
                        <span className="text-xs font-sans font-medium">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-sans text-content-muted">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Command Field */}
            {workloadType === 'custom' && (
              <div className="bg-bg-subtle border border-line-subtle rounded-xl p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-sans font-medium text-accent-secondary">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sandbox Security Verification</span>
                </div>
                <p className="text-[11px] font-sans text-content-muted leading-relaxed">
                  Commands are parsed using <code>shlex</code> and executed via direct process invocation without an intermediate shell. Dangerous tokens (sudo, rm, dd, etc.) are rejected.
                </p>
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="e.g. python3 -c 'import time; time.sleep(3)'"
                  className="w-full bg-bg-card border border-line-subtle rounded-lg px-3 py-1.5 text-xs font-mono text-accent-secondary focus:outline-none focus:border-accent-primary transition-all"
                />
              </div>
            )}

            {/* Arrival Time & Burst Time Estimates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-sans font-medium text-content-secondary mb-1.5">
                  Arrival Time (s)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(parseFloat(e.target.value) || 0)}
                  className="w-full bg-bg-subtle border border-line-subtle rounded-xl px-3.5 py-2 text-xs font-mono text-content-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-sans font-medium text-content-secondary mb-1.5">
                  Estimated Burst (s)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="120"
                  step="0.5"
                  value={burstTime}
                  onChange={(e) => setBurstTime(parseFloat(e.target.value) || 1)}
                  className="w-full bg-bg-subtle border border-line-subtle rounded-xl px-3.5 py-2 text-xs font-mono text-content-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Priority Slider */}
            <div>
              <div className="flex justify-between text-xs font-sans text-content-secondary mb-1.5">
                <span>Task Priority: <span className="font-mono text-accent-primary font-semibold">{priority}</span></span>
                <span className="text-[11px] text-content-muted">1 (Highest) &rarr; 10 (Lowest)</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full accent-accent-primary bg-bg-subtle cursor-pointer"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-sans font-medium text-content-secondary mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Workload objective or benchmark parameters..."
                className="w-full bg-bg-subtle border border-line-subtle rounded-xl px-3.5 py-2 text-xs font-sans text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-accent-primary hover:bg-accent-hover text-bg-main font-sans font-semibold text-xs shadow-sm transition-all duration-150 disabled:opacity-50"
            >
              {isSubmitting ? 'Enqueuing...' : 'Enqueue Workload'}
            </button>
          </form>
        </div>

        {/* Right Column: Existing Jobs Queue Table */}
        <div className="lg:col-span-2 bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold font-sans text-content-primary">
                  Scheduling Queue ({jobs.length} jobs)
                </h2>
                <p className="text-xs text-content-secondary font-sans mt-0.5">
                  Tasks advance from PENDING to READY once simulated arrival time is reached.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-line-subtle text-content-muted uppercase text-[10px] font-semibold tracking-wider bg-bg-elevated/40">
                    <th className="py-2.5 px-3">Job ID</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Profile</th>
                    <th className="py-2.5 px-3">Arrival</th>
                    <th className="py-2.5 px-3">Est. Burst</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">PID</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle/40">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-content-muted font-sans text-xs">
                        No workloads currently enqueued. Create a workload or load the standard benchmark suite.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => {
                      const statusColor = {
                        PENDING: 'bg-bg-elevated text-content-secondary border-line-subtle',
                        READY: 'bg-status-amber/10 text-status-amber border-status-amber/25',
                        RUNNING: 'bg-status-green/10 text-status-green border-status-green/25',
                        PAUSED: 'bg-status-amber/15 text-status-amber border-status-amber/30',
                        COMPLETED: 'bg-accent-primary/10 text-accent-primary border-accent-primary/25',
                        FAILED: 'bg-status-red/10 text-status-red border-status-red/25',
                        TERMINATED: 'bg-status-red/10 text-status-red border-status-red/25',
                      }[job.status] || 'bg-bg-elevated text-content-secondary';

                      const canEdit = job.status === 'PENDING' || job.status === 'READY';

                      return (
                        <tr key={job.id} className="hover:bg-bg-hover/30 transition-colors">
                          <td className="py-3 px-3 text-content-muted font-mono text-[11px]">
                            {job.id}
                          </td>
                          <td className="py-3 px-3 font-medium text-content-primary">
                            {job.name}
                          </td>
                          <td className="py-3 px-3 capitalize text-content-secondary text-[11px]">
                            {job.workload_type}
                          </td>
                          <td className="py-3 px-3 font-mono text-content-secondary">
                            {job.arrival_time.toFixed(1)}s
                          </td>
                          <td className="py-3 px-3 font-mono text-content-primary font-medium">
                            {job.estimated_burst_time.toFixed(1)}s
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-bg-elevated border border-line-subtle text-content-primary font-medium">
                              {job.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-sans px-2.5 py-0.5 rounded-full border font-medium inline-flex items-center space-x-1 ${statusColor}`}>
                              <span className={`w-1 h-1 rounded-full ${
                                job.status === 'RUNNING' ? 'bg-status-green animate-pulse' : 'bg-current'
                              }`} />
                              <span>{job.status}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-accent-primary font-semibold">
                            {job.pid ? job.pid : '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {canEdit && (
                                <button
                                  onClick={() => setEditingJob(job)}
                                  title="Edit parameters"
                                  className="p-1.5 text-content-muted hover:text-content-primary hover:bg-bg-elevated rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => onDeleteJob(job.id)}
                                title="Remove job"
                                className="p-1.5 text-content-muted hover:text-status-red hover:bg-status-red/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-line-subtle text-xs font-sans text-content-muted flex items-center justify-between">
            <span>Configured burst represents user estimation for scheduling ranking. Measured CPU time is captured independently.</span>
            <span className="font-mono">{jobs.length} total entries</span>
          </div>
        </div>
      </div>

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-elevated border border-line-subtle rounded-2xl max-w-md w-full p-6 space-y-4 shadow-elevated">
            <h3 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-accent-primary" />
              <span>Modify Job Parameters ({editingJob.id})</span>
            </h3>

            <form onSubmit={handleUpdate} className="space-y-3.5 font-sans text-xs">
              <div>
                <label className="block text-content-secondary mb-1">Workload Name</label>
                <input
                  type="text"
                  value={editingJob.name}
                  onChange={(e) => setEditingJob({ ...editingJob, name: e.target.value })}
                  className="w-full bg-bg-card border border-line-subtle rounded-xl px-3.5 py-2 text-content-primary focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-content-secondary mb-1">Arrival Time (s)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingJob.arrival_time}
                    onChange={(e) => setEditingJob({ ...editingJob, arrival_time: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-bg-card border border-line-subtle rounded-xl px-3.5 py-2 text-content-primary font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-content-secondary mb-1">Estimated Burst (s)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingJob.estimated_burst_time}
                    onChange={(e) => setEditingJob({ ...editingJob, estimated_burst_time: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-bg-card border border-line-subtle rounded-xl px-3.5 py-2 text-content-primary font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-content-secondary mb-1">Priority (1 to 10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingJob.priority}
                  onChange={(e) => setEditingJob({ ...editingJob, priority: parseInt(e.target.value) || 5 })}
                  className="w-full bg-bg-card border border-line-subtle rounded-xl px-3.5 py-2 text-content-primary font-mono focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div>
                <label className="block text-content-secondary mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingJob.description || ''}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                  className="w-full bg-bg-card border border-line-subtle rounded-xl px-3.5 py-2 text-content-primary focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 rounded-xl bg-bg-card text-content-secondary hover:text-content-primary border border-line-subtle transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-accent-primary text-bg-main font-semibold hover:bg-accent-hover transition-colors"
                >
                  Save Parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
