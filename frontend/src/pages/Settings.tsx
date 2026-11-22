import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Layers,
  CheckCircle2,
  Server
} from 'lucide-react';
import { SystemSettings, SystemMetrics } from '../types';
import { api } from '../api/client';

interface SettingsProps {
  system: SystemMetrics | null;
  onRefreshSettings: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ system, onRefreshSettings }) => {
  const [settings, setSettings] = useState<SystemSettings>({
    execution_slots: 2,
    available_cores: [0, 1, 2, 3],
    cpu_affinity: [],
    algorithm: 'FCFS',
    quantum: 2.0,
    is_preemptive: false,
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getSystemSettings();
        setSettings(data);
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    }
    load();
  }, []);

  const handleToggleCore = (coreIndex: number) => {
    setSettings(prev => {
      const current = prev.cpu_affinity || [];
      const exists = current.includes(coreIndex);
      const next = exists ? current.filter(c => c !== coreIndex) : [...current, coreIndex].sort();
      return { ...prev, cpu_affinity: next };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSavedSuccess(false);
      await api.updateSystemSettings(settings);
      setSavedSuccess(true);
      await onRefreshSettings();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const logicalCores = system?.logical_cores || settings.available_cores?.length || 4;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold font-sans text-content-primary flex items-center space-x-2.5">
          <SettingsIcon className="w-5 h-5 text-accent-primary" />
          <span>Hardware &amp; Execution Environment Settings</span>
        </h1>
        <p className="text-xs text-content-secondary mt-1 font-sans">
          Configure multi-core execution slot limits, POSIX CPU affinity masks (<code>sched_setaffinity</code>), and scheduler parameters.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-status-green/10 border border-status-green/25 text-status-green text-xs font-sans flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>System settings successfully applied to Linux process controller.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Concurrency Slots */}
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
                <Layers className="w-4 h-4 text-accent-primary" />
                <span>Simultaneous Execution Slots</span>
              </h2>
              <p className="text-xs text-content-secondary font-sans mt-0.5">
                Defines the maximum number of actual Linux processes allowed to execute concurrently in parallel.
              </p>
            </div>
            <span className="text-sm font-mono font-semibold text-accent-primary bg-bg-elevated px-3 py-1 rounded-xl border border-line-subtle">
              {settings.execution_slots} Slots
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={settings.execution_slots}
              onChange={(e) => setSettings({ ...settings, execution_slots: parseInt(e.target.value) || 1 })}
              className="w-full accent-accent-primary bg-bg-subtle cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-sans text-content-muted">
              <span>1 (Serial execution)</span>
              <span>4 (Quad concurrency)</span>
              <span>8 (Maximum slots)</span>
            </div>
          </div>
        </div>

        {/* CPU Affinity Mask */}
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card space-y-4">
          <div>
            <h2 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-accent-secondary" />
              <span>POSIX CPU Affinity Configuration</span>
            </h2>
            <p className="text-xs text-content-secondary font-sans mt-0.5">
              Pin managed workload child processes to specific logical CPU cores using <code>sched_setaffinity()</code>. If no cores are selected, Linux will dynamically balance tasks across all available cores.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: logicalCores }).map((_, coreIdx) => {
              const isChecked = settings.cpu_affinity.includes(coreIdx);
              return (
                <div
                  key={coreIdx}
                  onClick={() => handleToggleCore(coreIdx)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between font-sans text-xs ${
                    isChecked
                      ? 'bg-bg-elevated border-accent-primary/60 text-content-primary shadow-sm'
                      : 'bg-bg-subtle border-line-subtle text-content-secondary hover:border-line-hover hover:text-content-primary'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="accent-accent-primary rounded cursor-pointer"
                    />
                    <span className="font-medium">Core {coreIdx}</span>
                  </div>
                  <span className="font-mono text-[11px] text-content-muted">
                    {system?.cpu_per_core_percent?.[coreIdx] !== undefined ? `${system.cpu_per_core_percent[coreIdx]}%` : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-xs font-sans text-content-muted">
            Current Affinity Selection: {settings.cpu_affinity.length === 0 ? 'Automatic (Linux kernel load balancer manages all cores)' : `Pinned strictly to Cores [${settings.cpu_affinity.join(', ')}]`}
          </div>
        </div>

        {/* System & Architecture Info Card */}
        <div className="bg-bg-card border border-line-subtle rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="text-sm font-semibold font-sans text-content-primary flex items-center space-x-2">
            <Server className="w-4 h-4 text-content-muted" />
            <span>Architecture &amp; Execution Environment</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="bg-bg-elevated p-4 rounded-xl border border-line-subtle space-y-1">
              <span className="text-content-muted text-[11px] font-medium block">Host Platform</span>
              <div className="text-content-primary font-medium">Ubuntu on WSL 2 (x86_64 Linux 6.x)</div>
              <div className="text-content-muted text-[11px]">Direct access to POSIX process groups &amp; signals</div>
            </div>

            <div className="bg-bg-elevated p-4 rounded-xl border border-line-subtle space-y-1">
              <span className="text-content-muted text-[11px] font-medium block">Process Management Layer</span>
              <div className="text-content-primary font-medium font-mono text-[11px]">subprocess.Popen + os.setsid</div>
              <div className="text-content-muted text-[11px]">Real Linux PIDs tracked with zero mock simulation</div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-hover text-bg-main font-sans font-semibold text-xs shadow-sm transition-all duration-150 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Apply Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
