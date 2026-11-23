import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { JobManager } from './pages/JobManager';
import { Scheduler } from './pages/Scheduler';
import { LiveMonitor } from './pages/LiveMonitor';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { useWebSocketTelemetry } from './api/useWebSocketTelemetry';
import { api } from './api/client';
import { Job, AnalyticsSummary } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
      await refreshData();
    } catch (err: any) {
      alert(`Start failed: ${err.message}`);
    }
  };

  const handlePauseScheduler = async () => {
    try {
      await api.pauseScheduler();
      await refreshData();
    } catch (err: any) {
      alert(`Pause failed: ${err.message}`);
    }
  };

  const handleStopScheduler = async () => {
    try {
      await api.stopScheduler();
      await refreshData();
    } catch (err: any) {
      alert(`Stop failed: ${err.message}`);
    }
  };

  const handleResetScheduler = async () => {
    try {
      await api.resetScheduler();
      await refreshData();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  // Job Operations
  const handleCreateJob = async (jobData: Partial<Job>) => {
    await api.createJob(jobData);
    await refreshData();
  };

  const handleUpdateJob = async (id: string, jobData: Partial<Job>) => {
    await api.updateJob(id, jobData);
    await refreshData();
  };

  const handleDeleteJob = async (id: string) => {
    await api.deleteJob(id);
    await refreshData();
  };

  const handleLoadPresets = async () => {
    try {
      await api.createBatchPreset();
      await refreshData();
    } catch (err: any) {
      alert(`Failed to load preset suite: ${err.message}`);
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
    await refreshData();
  };

  // Process Signals
  const handlePauseProcess = async (jobId: string) => {
    try {
      await api.pauseProcess(jobId);
      await refreshData();
    } catch (err: any) {
      alert(`Pause failed: ${err.message}`);
    }
  };

  const handleResumeProcess = async (jobId: string) => {
    try {
      await api.resumeProcess(jobId);
      await refreshData();
    } catch (err: any) {
      alert(`Resume failed: ${err.message}`);
    }
  };

  const handleTerminateProcess = async (jobId: string) => {
    try {
      await api.terminateProcess(jobId);
      await refreshData();
    } catch (err: any) {
      alert(`Terminate failed: ${err.message}`);
    }
  };

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
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'jobs' && (
          <JobManager
            jobs={jobs}
            onCreateJob={handleCreateJob}
            onUpdateJob={handleUpdateJob}
            onDeleteJob={handleDeleteJob}
            onLoadPresets={handleLoadPresets}
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
