import { Job, SchedulerStatus, ProcessLive, SystemMetrics, SystemSettings, AnalyticsSummary, GanttEvent } from '../types';

const API_BASE = 'http://localhost:8000/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errMessage = 'Request failed';
    try {
      const err = await res.json();
      errMessage = err.detail || err.message || errMessage;
    } catch {
      errMessage = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errMessage);
  }

  return res.json();
}

export const api = {
  // Jobs
  getJobs: () => request<Job[]>('/jobs'),
  createJob: (data: Partial<Job>) => request<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  updateJob: (id: string, data: Partial<Job>) => request<Job>(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteJob: (id: string) => request<{ success: boolean }>(`/jobs/${id}`, { method: 'DELETE' }),
  createBatchPreset: () => request<{ success: boolean; created_count: number; jobs: Job[] }>('/jobs/batch-preset', { method: 'POST' }),

  // Scheduler
  getSchedulerStatus: () => request<SchedulerStatus>('/scheduler/status'),
  updateSchedulerConfig: (config: { algorithm: string; quantum: number; execution_slots: number; is_preemptive: boolean }) =>
    request<{ success: boolean }>('/scheduler/config', { method: 'POST', body: JSON.stringify(config) }),
  startScheduler: () => request<{ success: boolean }>('/scheduler/start', { method: 'POST' }),
  pauseScheduler: () => request<{ success: boolean }>('/scheduler/pause', { method: 'POST' }),
  stopScheduler: () => request<{ success: boolean }>('/scheduler/stop', { method: 'POST' }),
  resetScheduler: () => request<{ success: boolean }>('/scheduler/reset', { method: 'POST' }),

  // Processes
  getProcesses: () => request<ProcessLive[]>('/processes'),
  pauseProcess: (jobId: string) => request<{ success: boolean; message: string }>(`/processes/${jobId}/pause`, { method: 'POST' }),
  resumeProcess: (jobId: string) => request<{ success: boolean; message: string }>(`/processes/${jobId}/resume`, { method: 'POST' }),
  terminateProcess: (jobId: string) => request<{ success: boolean; message: string }>(`/processes/${jobId}/terminate`, { method: 'POST' }),

  // System & Settings
  getSystemMetrics: () => request<SystemMetrics>('/system/metrics'),
  getSystemSettings: () => request<SystemSettings>('/system/settings'),
  updateSystemSettings: (settings: SystemSettings) =>
    request<{ success: boolean }>('/system/settings', { method: 'POST', body: JSON.stringify(settings) }),

  // Analytics
  getAnalytics: () => request<AnalyticsSummary>('/analytics/summary'),
  getGantt: (runId?: string) => request<GanttEvent[]>(runId ? `/analytics/gantt?run_id=${runId}` : '/analytics/gantt'),
  getHistory: () => request<any[]>('/analytics/history'),
};
