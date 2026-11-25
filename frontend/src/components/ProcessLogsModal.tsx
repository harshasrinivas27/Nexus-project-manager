/**
 * Live Linux Process Console Modal.
 * Polls captured stdout/stderr streams from the backend every 600ms and lets the user
 * send POSIX signals (SIGSTOP, SIGCONT, SIGTERM) while watching output freeze/resume live.
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  Terminal,
  X,
  Pause,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { api } from '../api/client';
import { ProcessLogsResponse, ProcessLive } from '../types';

interface ProcessLogsModalProps {
  jobId: string | null;
  liveProcess?: ProcessLive | null;
  onClose: () => void;
  onPauseProcess: (jobId: string) => Promise<void>;
  onResumeProcess: (jobId: string) => Promise<void>;
  onTerminateProcess: (jobId: string) => Promise<void>;
}

export const ProcessLogsModal: React.FC<ProcessLogsModalProps> = ({
  jobId,
  liveProcess,
  onClose,
  onPauseProcess,
  onResumeProcess,
  onTerminateProcess,
}) => {
  const [data, setData] = useState<ProcessLogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!jobId) {
      setData(null);
      return;
    }

    let cancelled = false;
    const fetchLogs = async (initial = false) => {
      try {
        if (initial) setLoading(true);
        const res = await api.getProcessLogs(jobId);
        if (!cancelled) {
          setData(res);
        }
      } catch (err) {
        console.error('Failed to fetch process logs:', err);
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    };

    fetchLogs(true);
    const interval = setInterval(() => fetchLogs(false), 600);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [jobId, onClose]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.logs?.length]);

  if (!jobId) return null;

  const isRunning = data?.job_status === 'RUNNING';
  const isPaused = data?.job_status === 'PAUSED' || data?.is_paused;
  const isAlive = Boolean(data?.is_alive);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-line-subtle rounded-2xl max-w-3xl w-full shadow-elevated overflow-hidden flex flex-col max-h-[85vh] transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="px-5 py-4 bg-bg-elevated/80 border-b border-line-subtle flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent-primary/15 border border-accent-primary/30 text-accent-primary shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold font-sans text-content-primary truncate">
                  {data?.job_name || `Process ${jobId}`}
                </h3>
                {data?.job_status && (
                  <span
                    className={`text-[10px] font-sans px-2 py-0.5 rounded-full border font-medium ${
                      isRunning
                        ? 'bg-status-green/10 text-status-green border-status-green/30'
                        : isPaused
                        ? 'bg-status-amber/10 text-status-amber border-status-amber/30'
                        : data.job_status === 'COMPLETED'
                        ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
                        : 'bg-bg-subtle text-content-secondary border-line-subtle'
                    }`}
                  >
                    {data.job_status}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono text-content-muted mt-0.5">
                <span>PID: <span className="text-accent-primary font-semibold">{data?.pid ?? 'Not spawned'}</span></span>
                <span>PGID: <span className="text-content-secondary">{data?.pgid ?? '-'}</span></span>
                {liveProcess && (
                  <>
                    <span>CPU: <span className="text-status-green font-semibold">{liveProcess.cpu_percent}%</span></span>
                    <span>RSS: <span className="text-accent-secondary font-semibold">{liveProcess.memory_rss_mb} MB</span></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Live POSIX Controls right inside the Console Modal */}
            {isAlive && !isPaused && (
              <button
                onClick={() => onPauseProcess(jobId)}
                className="px-2.5 py-1.5 rounded-xl bg-status-amber/15 hover:bg-status-amber/25 text-status-amber border border-status-amber/30 text-[11px] font-sans font-medium flex items-center space-x-1 transition-all"
                title="Freeze process immediately with SIGSTOP"
              >
                <Pause className="w-3 h-3" />
                <span>SIGSTOP</span>
              </button>
            )}
            {isAlive && isPaused && (
              <button
                onClick={() => onResumeProcess(jobId)}
                className="px-2.5 py-1.5 rounded-xl bg-status-green/15 hover:bg-status-green/25 text-status-green border border-status-green/30 text-[11px] font-sans font-medium flex items-center space-x-1 transition-all"
                title="Resume frozen process with SIGCONT"
              >
                <Play className="w-3 h-3" />
                <span>SIGCONT</span>
              </button>
            )}
            {isAlive && (
              <button
                onClick={() => onTerminateProcess(jobId)}
                className="px-2.5 py-1.5 rounded-xl bg-status-red/15 hover:bg-status-red/25 text-status-red border border-status-red/30 text-[11px] font-sans font-medium flex items-center space-x-1 transition-all"
                title="Terminate process group with SIGTERM"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>SIGTERM</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-content-muted hover:text-content-primary hover:bg-bg-hover transition-colors"
              aria-label="Close console"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Strip */}
        {data?.command && (
          <div className="px-5 py-2 bg-bg-subtle border-b border-line-subtle/70 flex items-center justify-between text-[11px] font-mono text-content-secondary">
            <span className="truncate">
              <span className="text-content-muted select-none">$ </span>
              {data.command}
            </span>
            <span className="text-content-muted ml-3 shrink-0">
              {data.elapsed_time?.toFixed(1) ?? '0.0'}s elapsed
            </span>
          </div>
        )}

        {/* Terminal Log Stream */}
        <div className="flex-1 overflow-y-auto bg-[#0F111A] p-5 font-mono text-xs space-y-1.5 min-h-[260px]">
          {loading && !data ? (
            <div className="flex items-center justify-center h-48 text-content-muted space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-accent-primary" />
              <span>Attaching to Linux stdout/stderr pipe...</span>
            </div>
          ) : !data?.found ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-content-muted space-y-2">
              <Cpu className="w-6 h-6 text-content-muted/60" />
              <p className="font-sans text-xs">
                This workload hasn&apos;t been dispatched by the Linux kernel yet.
              </p>
              <p className="font-sans text-[11px] text-content-muted/70">
                Start the scheduler engine to spawn its process group and stream live output.
              </p>
            </div>
          ) : data.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-content-muted space-y-2">
              <RefreshCw className={`w-5 h-5 ${isAlive ? 'animate-spin text-accent-primary' : 'text-content-muted'}`} />
              <p className="font-sans text-xs">
                {isAlive
                  ? 'Process running — awaiting stdout flush...'
                  : 'Process exited with no output lines captured.'}
              </p>
            </div>
          ) : (
            <>
              {data.logs.map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex items-start space-x-2.5 leading-relaxed ${
                    entry.stream === 'stderr' ? 'text-status-red' : 'text-[#D6DEEB]'
                  }`}
                >
                  <span className="text-content-muted/60 select-none shrink-0 text-[10px] pt-0.5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="break-all whitespace-pre-wrap">{entry.line}</span>
                </div>
              ))}
              {isPaused && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-status-amber/10 border border-status-amber/30 text-status-amber font-sans text-[11px] flex items-center space-x-2">
                  <Pause className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Kernel Signal <strong>SIGSTOP</strong> active — stdout stream frozen in RAM. Click <strong>SIGCONT</strong> above to resume execution right here.
                  </span>
                </div>
              )}
              {!isAlive && data.exit_code !== null && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-bg-elevated/70 border border-line-subtle text-content-secondary font-sans text-[11px] flex items-center space-x-2">
                  {data.exit_code === 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-green shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-status-red shrink-0" />
                  )}
                  <span>
                    Process terminated with Linux exit code <strong className="font-mono text-content-primary">{data.exit_code}</strong>.
                  </span>
                </div>
              )}
              <div ref={logEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
