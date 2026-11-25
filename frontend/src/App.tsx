/**
 * Root Application Shell for NEXUS.
 * Coordinates global WebSocket telemetry, periodic job/analytics syncing,
 * smooth toast notifications, live Process Console inspection modal, and page routing.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ProcessLogsModal } from './components/ProcessLogsModal';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { JobManager } from './pages/JobManager';
import { Scheduler } from './pages/Scheduler';
import { LiveMonitor } from './pages/LiveMonitor';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { useWebSocketTelemetry } from './api/useWebSocketTelemetry';
import { api } from './api/client';
import { Job, AnalyticsSummary, RandomBatchConfig } from './types';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inspectingJobId, setInspectingJobId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  // Live WebSocket telemetry
  const telemetry = useWebSocketTelemetry();

  // Load jobs and analytics from backend
  const refreshData = useCallback(async () => {
    try {
      const [fetchedJobs, fetchedAnalytics] = await Promise.all([
        api.getJobs(),
        api.getAnalytics(),
      ]);
      setJobs(fetchedJobs);
      setAnalytics(fetchedAnalytics);
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Scheduler Controls
  const handleStartScheduler = async () => {
    try {
      await api.startScheduler();
      pushToast('success', 'Scheduler engine started — dispatching Linux processes');
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Start failed: ${err.message}`);
    }
  };

  const handlePauseScheduler = async () => {
    try {
      await api.pauseScheduler();
      pushToast('info', 'Scheduler paused — active slots frozen with SIGSTOP');
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Pause failed: ${err.message}`);
    }
  };

  const handleStopScheduler = async () => {
    try {
      await api.stopScheduler();
      pushToast('info', 'Scheduler stopped and process groups terminated');
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Stop failed: ${err.message}`);
    }
  };

  const handleResetScheduler = async () => {
    try {
      await api.resetScheduler();
      pushToast('info', 'Simulation reset — jobs returned to PENDING queue');
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Reset failed: ${err.message}`);
    }
  };

  // Job Operations
  const handleCreateJob = async (jobData: Partial<Job>) => {
    await api.createJob(jobData);
    pushToast('success', `Workload "${jobData.name}" added to queue`);
    await refreshData();
  };

  const handleUpdateJob = async (id: string, jobData: Partial<Job>) => {
    await api.updateJob(id, jobData);
    pushToast('success', `Updated parameters for ${id}`);
    await refreshData();
  };

  const handleDeleteJob = async (id: string) => {
    await api.deleteJob(id);
    pushToast('info', `Removed job ${id}`);
    await refreshData();
  };

  const handleClearAllJobs = async () => {
    try {
      await api.clearAllJobs();
      pushToast('info', 'Cleared all queued and completed jobs');
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Failed to clear jobs: ${err.message}`);
    }
  };

  const handleLoadPresets = async () => {
    try {
      const res = await api.createBatchPreset();
      pushToast('success', `Loaded ${res.created_count} benchmark workloads`);
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Failed to load preset suite: ${err.message}`);
    }
  };

  const handleGenerateRandomJobs = async (config: RandomBatchConfig) => {
    try {
      const res = await api.generateRandomJobs(config);
      const label =
        config.scenario === 'convoy'
          ? 'Convoy Effect Demo'
          : config.scenario === 'priority_burst'
          ? 'Priority Preemption Demo'
          : 'Randomized Test Suite';
      pushToast('success', `Generated ${res.created_count} jobs (${label})`);
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Generation failed: ${err.message}`);
    }
  };

  // Scheduler Config Update
  const handleUpdateConfig = async (config: {
    algorithm: string;
    quantum: number;
    execution_slots: number;
    is_preemptive: boolean;
  }) => {
    await api.updateSchedulerConfig(config);
    pushToast('success', `Policy set to ${config.algorithm} (${config.execution_slots} slots)`);
    await refreshData();
  };

  // Process Signals
  const handlePauseProcess = async (jobId: string) => {
    try {
      await api.pauseProcess(jobId);
      pushToast('info', `SIGSTOP delivered to ${jobId} — CPU execution frozen`);
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Pause failed: ${err.message}`);
    }
  };

  const handleResumeProcess = async (jobId: string) => {
    try {
      await api.resumeProcess(jobId);
      pushToast('success', `Job ${jobId} requeued for SIGCONT resumption`);
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Resume failed: ${err.message}`);
    }
  };

  const handleTerminateProcess = async (jobId: string) => {
    try {
      await api.terminateProcess(jobId);
      pushToast('info', `SIGTERM/SIGKILL delivered to ${jobId}`);
      await refreshData();
    } catch (err: any) {
      pushToast('error', `Terminate failed: ${err.message}`);
    }
  };

  const inspectedLiveProc = inspectingJobId
    ? telemetry.processes.find((p) => p.job_id === inspectingJobId) || null
    : null;

  return (
    <div className="min-h-screen bg-bg-main text-content-primary flex flex-col font-sans selection:bg-accent-primary/25 selection:text-content-primary">
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        scheduler={telemetry.scheduler}
        system={telemetry.system}
        connected={telemetry.connected}
        onStart={handleStartScheduler}
        onPause={handlePauseScheduler}
        onReset={handleResetScheduler}
      />

      {/* Cold-Start / Reconnect Status Strip */}
      {(loading || !telemetry.connected) && (
        <div className="bg-bg-elevated/80 border-b border-accent-primary/25 px-4 py-2 text-center text-xs font-sans text-content-secondary flex items-center justify-center space-x-2 backdrop-blur-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-primary" />
          <span>
            {loading
              ? 'Waking Linux Supervisor & establishing live kernel telemetry...'
              : 'Reconnecting to /ws/live WebSocket stream...'}
          </span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'landing' && (
          <Landing
            onNavigate={setCurrentTab}
            scheduler={telemetry.scheduler}
            system={telemetry.system}
            onLoadPresets={handleLoadPresets}
          />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard
            jobs={jobs}
            scheduler={telemetry.scheduler}
            system={telemetry.system}
            processes={telemetry.processes}
            gantt={telemetry.gantt}
            onStartScheduler={handleStartScheduler}
            onPauseScheduler={handlePauseScheduler}
            onResetScheduler={handleResetScheduler}
            onLoadPresets={handleLoadPresets}
            onGenerateRandom={handleGenerateRandomJobs}
            onInspectLogs={setInspectingJobId}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'jobs' && (
          <JobManager
            jobs={jobs}
            onCreateJob={handleCreateJob}
            onUpdateJob={handleUpdateJob}
            onDeleteJob={handleDeleteJob}
            onClearAllJobs={handleClearAllJobs}
            onLoadPresets={handleLoadPresets}
            onGenerateRandom={handleGenerateRandomJobs}
            onInspectLogs={setInspectingJobId}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'scheduler' && (
          <Scheduler
            jobs={jobs}
            scheduler={telemetry.scheduler}
            onUpdateConfig={handleUpdateConfig}
            onStart={handleStartScheduler}
            onPause={handlePauseScheduler}
            onStop={handleStopScheduler}
            onReset={handleResetScheduler}
          />
        )}

        {currentTab === 'monitor' && (
          <LiveMonitor
            processes={telemetry.processes}
            system={telemetry.system}
            jobs={jobs}
            onPauseProcess={handlePauseProcess}
            onResumeProcess={handleResumeProcess}
            onTerminateProcess={handleTerminateProcess}
            onInspectLogs={setInspectingJobId}
          />
        )}

        {currentTab === 'analytics' && (
          <Analytics
            analytics={analytics}
            gantt={telemetry.gantt}
            jobs={jobs}
          />
        )}

        {currentTab === 'settings' && (
          <Settings
            system={telemetry.system}
            onRefreshSettings={refreshData}
          />
        )}
      </main>

      {/* Process Console Output Modal */}
      <ProcessLogsModal
        jobId={inspectingJobId}
        liveProcess={inspectedLiveProc}
        onClose={() => setInspectingJobId(null)}
        onPauseProcess={handlePauseProcess}
        onResumeProcess={handleResumeProcess}
        onTerminateProcess={handleTerminateProcess}
      />

      {/* Smooth Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between space-x-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-elevated text-xs font-sans transition-all duration-200 ${
                toast.type === 'success'
                  ? 'bg-bg-elevated/95 border-status-green/35 text-content-primary'
                  : toast.type === 'error'
                  ? 'bg-bg-elevated/95 border-status-red/40 text-status-red'
                  : 'bg-bg-elevated/95 border-accent-primary/35 text-content-primary'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-status-green shrink-0" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-status-red shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-accent-primary shrink-0" />}
                <span className="truncate font-medium">{toast.text}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-content-muted hover:text-content-primary shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <footer className="border-t border-line-subtle/80 bg-bg-card/40 py-5 px-6 text-center text-xs font-sans text-content-muted backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-content-primary">NEXUS</span>
            <span className="text-line-hover">•</span>
            <span>Enterprise Process Supervisor &amp; Multi-Core Scheduler</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-bg-elevated border border-line-subtle text-content-secondary font-mono">
              Kernel 6.x POSIX
            </span>
            <span className="text-status-green font-medium">Production Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
