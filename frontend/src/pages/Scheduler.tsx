import React, { useState } from 'react';
import {
  Cpu,
  Play,
  Pause,
  Square,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Clock,
  Zap,
  Info
} from 'lucide-react';
import { Job, SchedulerStatus } from '../types';

interface SchedulerProps {
  jobs: Job[];
  scheduler: SchedulerStatus | null;
  onUpdateConfig: (config: {
    algorithm: string;
    quantum: number;
    execution_slots: number;
    is_preemptive: boolean;
  }) => Promise<void>;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onStop: () => Promise<void>;
  onReset: () => Promise<void>;
}

export const Scheduler: React.FC<SchedulerProps> = ({
  jobs,
  scheduler,
  onUpdateConfig,
  onStart,
  onPause,
  onStop,
  onReset,
}) => {
  const currentAlgo = scheduler?.algorithm || 'FCFS';
  const currentQuantum = scheduler?.quantum || 2.0;
  const currentSlots = scheduler?.execution_slots || 2;
  const currentPreemptive = scheduler?.is_preemptive || false;

  const [selectedAlgo, setSelectedAlgo] = useState(currentAlgo);
  const [quantum, setQuantum] = useState(currentQuantum);
  const [slots, setSlots] = useState(currentSlots);
  const [isPreemptive, setIsPreemptive] = useState(currentPreemptive);
  const [configSaving, setConfigSaving] = useState(false);

  React.useEffect(() => {
    if (scheduler) {
      setSelectedAlgo(scheduler.algorithm);
      setQuantum(scheduler.quantum);
      setSlots(scheduler.execution_slots);
      setIsPreemptive(scheduler.is_preemptive);
    }
  }, [scheduler?.algorithm, scheduler?.quantum, scheduler?.execution_slots, scheduler?.is_preemptive]);

  const handleApplyConfig = async () => {
    try {
      setConfigSaving(true);
      await onUpdateConfig({
        algorithm: selectedAlgo,
        quantum: Number(quantum),
        execution_slots: Number(slots),
        is_preemptive: Boolean(isPreemptive),
      });
    } catch (err: any) {
      alert(`Failed to update scheduler configuration: ${err.message}`);
    } finally {
      setConfigSaving(false);
    }
  };

  const isRunning = scheduler?.status === 'RUNNING';

  const readyJobs = jobs.filter(j => j.status === 'READY');
  const runningJobs = jobs.filter(j => j.status === 'RUNNING');
  const pendingJobs = jobs.filter(j => j.status === 'PENDING');

  const ALGO_DESCRIPTIONS: Record<string, { title: string; subtitle: string; desc: string; preemptiveSupport: boolean; quantumSupport: boolean }> = {
    FCFS: {
      title: 'First-Come, First-Served',
      subtitle: 'Strict non-preemptive FIFO queue',
      desc: 'Dispatches jobs in pure chronological arrival order. Predictable and straightforward, but vulnerable to the convoy effect if long CPU-bound tasks precede short interactive tasks.',
      preemptiveSupport: false,
      quantumSupport: false,
    },
    SJF: {
      title: 'Shortest Job First (SJF / SRTF)',
      subtitle: 'Minimizes average waiting time',
      desc: 'Schedules tasks based on the lowest estimated burst time. Provably optimal for reducing average waiting times. Preemptive mode activates Shortest Remaining Time First (SRTF).',
      preemptiveSupport: true,
      quantumSupport: false,
    },
    PRIORITY: {
      title: 'Priority Scheduling',
      subtitle: 'Ranked priority execution (1 = Highest)',
      desc: 'Selects the task with the highest numerical priority. Can execute non-preemptively or preemptively, where an arriving high-priority job immediately suspends running tasks via SIGSTOP.',
      preemptiveSupport: true,
      quantumSupport: false,
    },
    ROUND_ROBIN: {
      title: 'Round Robin (RR)',
      subtitle: 'Time-sliced interactive scheduling',
      desc: 'Allocates a uniform CPU time quantum per task. Upon quantum expiration, the process is suspended with SIGSTOP, returned to the ready queue tail, and the next eligible task is resumed via SIGCONT.',
      preemptiveSupport: true,
      quantumSupport: true,
    },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-content-primary flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-accent-primary" />
            <span>Scheduling Policy &amp; Engine Controls</span>
          </h1>
          <p className="text-xs text-content-secondary mt-1 font-sans">
            Configure algorithm policies, time slices, and multi-core execution slot limits.
          </p>
        </div>

        {/* Global Scheduler Actions */}
        <div className="flex items-center space-x-2">
          {!isRunning ? (
            <button
              onClick={onStart}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-accent-primary text-bg-main hover:bg-accent-hover shadow-sm transition-all duration-150"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Engine</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-status-amber text-bg-main hover:brightness-105 shadow-sm transition-all duration-150"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={onStop}
            title="Terminate all executing process groups"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-sans font-medium bg-status-red/10 text-status-red border border-status-red/25 hover:bg-status-red/20 transition-all duration-150"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>

          <button
            onClick={onReset}
            title="Reset simulation and job states"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-sans font-medium bg-bg-card text-content-secondary hover:text-content-primary hover:bg-bg-elevated border border-line-subtle transition-all duration-150"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Configuration & Algorithm Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Algorithm & Parameters Selector */}
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-accent-primary" />
              <span>Algorithm Selection</span>
            </h2>
          </div>

          {/* Algorithm Cards */}
          <div className="space-y-2.5">
            {(['FCFS', 'SJF', 'PRIORITY', 'ROUND_ROBIN'] as const).map((algoKey) => {
              const active = selectedAlgo === algoKey;
              const meta = ALGO_DESCRIPTIONS[algoKey];
              return (
                <div
                  key={algoKey}
                  onClick={() => setSelectedAlgo(algoKey)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                    active
                      ? 'bg-bg-elevated border-accent-primary/60 text-content-primary shadow-sm'
                      : 'bg-bg-subtle border-line-subtle text-content-secondary hover:border-line-hover hover:text-content-primary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-sans font-semibold text-content-primary">
                        {meta.title}
                      </div>
                      <div className="text-[11px] font-sans text-content-muted mt-0.5">
                        {meta.subtitle}
                      </div>
                    </div>
                    {active && <CheckCircle2 className="w-4 h-4 text-accent-primary shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contextual Options */}
          <div className="space-y-4 pt-3 border-t border-line-subtle">
            {/* Preemptive Toggle for SJF & Priority */}
            {ALGO_DESCRIPTIONS[selectedAlgo]?.preemptiveSupport && selectedAlgo !== 'ROUND_ROBIN' && (
              <div className="flex items-center justify-between bg-bg-subtle p-3.5 rounded-xl border border-line-subtle">
                <div>
                  <span className="text-xs font-sans text-content-primary font-medium block">
                    Preemptive Mode
                  </span>
                  <span className="text-[11px] font-sans text-content-muted">
                    {selectedAlgo === 'SJF' ? 'Shortest Remaining Time First (SRTF)' : 'Preempt running tasks on higher priority arrival'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isPreemptive}
                  onChange={(e) => setIsPreemptive(e.target.checked)}
                  className="w-4 h-4 accent-accent-primary rounded cursor-pointer"
                />
              </div>
            )}

            {/* Quantum Slider for Round Robin */}
            {selectedAlgo === 'ROUND_ROBIN' && (
              <div className="bg-bg-subtle p-3.5 rounded-xl border border-line-subtle space-y-2">
                <div className="flex justify-between text-xs font-sans text-content-secondary">
                  <span>Round Robin Quantum:</span>
                  <span className="font-mono text-accent-primary font-semibold">{quantum.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={quantum}
                  onChange={(e) => setQuantum(parseFloat(e.target.value))}
                  className="w-full accent-accent-primary bg-bg-card cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-sans text-content-muted">
                  <span>0.5s (Interactive)</span>
                  <span>10.0s (Batch)</span>
                </div>
              </div>
            )}

            {/* Execution Slots Slider */}
            <div className="bg-bg-subtle p-3.5 rounded-xl border border-line-subtle space-y-2">
              <div className="flex justify-between text-xs font-sans text-content-secondary">
                <span>Concurrent Execution Slots:</span>
                <span className="font-mono text-accent-primary font-semibold">{slots} processes</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={slots}
                onChange={(e) => setSlots(parseInt(e.target.value))}
                className="w-full accent-accent-primary bg-bg-card cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-sans text-content-muted">
                <span>1 (Serial)</span>
                <span>8 (Parallel Multi-core)</span>
              </div>
            </div>

            <button
              onClick={handleApplyConfig}
              disabled={configSaving}
              className="w-full py-2.5 rounded-xl bg-accent-primary hover:bg-accent-hover text-bg-main font-sans font-semibold text-xs shadow-sm transition-all duration-150 disabled:opacity-50"
            >
              {configSaving ? 'Applying...' : 'Apply Scheduling Parameters'}
            </button>
          </div>
        </div>

        {/* Right: Real-Time Ready Queue & Active Slot Dispatching */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Algorithm Explanation Card */}
          <div className="bg-bg-card border border-line-subtle rounded-2xl p-5 shadow-card">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold font-sans text-content-primary">
                  {ALGO_DESCRIPTIONS[selectedAlgo]?.title}
                </h3>
                <p className="text-xs text-content-secondary font-sans mt-1 leading-relaxed">
                  {ALGO_DESCRIPTIONS[selectedAlgo]?.desc}
                </p>
              </div>
            </div>
          </div>

          {/* Ready Queue Visualizer */}
          <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
                <Clock className="w-4 h-4 text-status-amber" />
                <span>Ready Queue — [{readyJobs.length} eligible]</span>
              </h3>
              <span className="text-xs font-sans text-content-muted">
                Ordered by {selectedAlgo} Policy
              </span>
            </div>

            {readyJobs.length === 0 ? (
              <div className="p-8 bg-bg-subtle border border-line-subtle rounded-xl text-center text-xs font-sans text-content-muted">
                Ready queue is empty. {pendingJobs.length > 0 ? `${pendingJobs.length} jobs are awaiting arrival time.` : 'Create jobs in Job Manager to enqueue.'}
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {readyJobs.map((job, idx) => (
                  <div
                    key={job.id}
                    className="min-w-[210px] bg-bg-elevated border border-line-subtle rounded-xl p-3.5 text-xs font-sans shadow-sm flex flex-col justify-between hover:border-line-hover transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-bg-card text-content-muted border border-line-subtle">
                          #{idx + 1}
                        </span>
                        <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-status-amber/15 text-status-amber border border-status-amber/25 font-medium">
                          READY
                        </span>
                      </div>
                      <div className="font-semibold text-content-primary truncate mb-1">
                        {job.name}
                      </div>
                      <div className="text-[11px] text-content-muted space-y-1">
                        <div>Burst: <span className="font-mono text-content-primary font-medium">{job.estimated_burst_time}s</span> (Rem: <span className="font-mono">{job.remaining_burst_time.toFixed(1)}s</span>)</div>
                        <div>Priority: <span className="font-mono text-accent-primary font-medium">{job.priority}</span> | Arr: <span className="font-mono">{job.arrival_time}s</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Running Slots */}
          <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card">
            <h3 className="text-sm font-semibold font-sans text-content-primary mb-4 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-status-green" />
              <span>Concurrent Process Slots [{runningJobs.length} / {slots} Active]</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {Array.from({ length: slots }).map((_, slotIdx) => {
                const assignedJobId = scheduler?.active_slots?.[slotIdx];
                const job = assignedJobId ? jobs.find(j => j.id === assignedJobId) : null;

                return (
                  <div
                    key={slotIdx}
                    className={`p-4 rounded-xl border text-xs font-sans transition-all duration-150 ${
                      job
                        ? 'bg-bg-elevated border-accent-primary/40 shadow-sm'
                        : 'bg-bg-subtle/50 border-line-subtle text-content-muted'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono font-medium text-content-secondary">SLOT #{slotIdx}</span>
                      {job ? (
                        <span className="text-status-green font-medium flex items-center space-x-1 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse mr-1" />
                          <span>RUNNING (PID {job.pid || '...'})</span>
                        </span>
                      ) : (
                        <span className="text-content-muted font-sans">IDLE</span>
                      )}
                    </div>

                    {job ? (
                      <div className="space-y-1.5">
                        <div className="text-content-primary font-semibold text-sm truncate">{job.name}</div>
                        <div className="text-content-muted text-[11px] flex justify-between font-sans">
                          <span>Elapsed: <span className="font-mono text-content-primary">{job.elapsed_time.toFixed(1)}s</span></span>
                          <span>Est Burst: <span className="font-mono">{job.estimated_burst_time}s</span></span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-content-muted py-2 text-center text-[11px]">
                        Slot available for next ready job
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
