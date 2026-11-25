/**
 * Interactive Execution Timeline (Gantt Chart) Component.
 * Groups real DISPATCH -> PREEMPT/RESUME -> COMPLETE intervals by Execution Slot
 * and renders proportional time bars showing true context-switch slices.
 */
import React from 'react';
import { GanttEvent } from '../types';

interface GanttChartProps {
  events: GanttEvent[];
  slotsCount?: number;
}

const MODERN_JOB_COLORS = [
  'bg-accent-primary/20 border-accent-primary/60 text-accent-primary',
  'bg-accent-secondary/20 border-accent-secondary/60 text-accent-secondary',
  'bg-status-green/20 border-status-green/60 text-status-green',
  'bg-status-amber/20 border-status-amber/60 text-status-amber',
  'bg-indigo-400/20 border-indigo-400/60 text-indigo-300',
  'bg-violet-400/20 border-violet-400/60 text-violet-300',
  'bg-sky-400/20 border-sky-400/60 text-sky-300',
  'bg-teal-400/20 border-teal-400/60 text-teal-300',
];

export const GanttChart: React.FC<GanttChartProps> = ({ events, slotsCount = 2 }) => {
  if (!events || events.length === 0) {
    return (
      <div className="bg-bg-card border border-line-subtle rounded-xl p-8 text-center text-content-muted font-sans text-sm">
        No execution timeline slices recorded yet. Start the scheduler to record real process execution.
      </div>
    );
  }

  const minTime = Math.min(...events.map(e => e.start_time));
  const maxTime = Math.max(...events.map(e => e.end_time));
  const totalDuration = Math.max(1.0, maxTime - minTime);

  const actualSlots = Math.max(slotsCount, ...events.map(e => e.slot + 1));
  const slotRows: GanttEvent[][] = Array.from({ length: actualSlots }, () => []);
  events.forEach(e => {
    if (e.slot >= 0 && e.slot < actualSlots) {
      slotRows[e.slot].push(e);
    }
  });

  const jobColorMap = new Map<string, string>();
  let colorIdx = 0;
  events.forEach(e => {
    if (!jobColorMap.has(e.job_id)) {
      jobColorMap.set(e.job_id, MODERN_JOB_COLORS[colorIdx % MODERN_JOB_COLORS.length]);
      colorIdx++;
    }
  });

  return (
    <div className="bg-bg-card border border-line-subtle rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold font-sans tracking-normal text-content-primary">
            Execution Timeline (Gantt Chart)
          </h3>
          <p className="text-xs text-content-secondary font-sans mt-0.5">
            Recorded Linux process execution intervals across execution slots
          </p>
        </div>
        <div className="text-xs font-sans text-content-muted bg-bg-elevated px-3 py-1 rounded-lg border border-line-subtle">
          Total Makespan: <span className="text-accent-primary font-mono font-semibold">{totalDuration.toFixed(1)}s</span>
        </div>
      </div>

      <div className="space-y-3">
        {slotRows.map((slotEvents, slotIdx) => (
          <div key={slotIdx} className="flex items-center space-x-3">
            <div className="w-16 shrink-0 text-right font-sans text-xs text-content-muted font-medium">
              Slot {slotIdx}
            </div>

            <div className="relative flex-1 h-9 bg-bg-subtle rounded-lg border border-line-subtle overflow-hidden">
              {slotEvents.map((ev, i) => {
                const leftPct = ((ev.start_time - minTime) / totalDuration) * 100;
                const widthPct = Math.max(1.5, (ev.duration / totalDuration) * 100);
                const colorClass = jobColorMap.get(ev.job_id) || MODERN_JOB_COLORS[0];

                return (
                  <div
                    key={i}
                    title={`${ev.job_name} (Job: ${ev.job_id})\nDuration: ${ev.duration.toFixed(2)}s\nSlot: ${ev.slot}`}
                    className={`absolute top-1 bottom-1 rounded-md border px-2 flex items-center justify-between overflow-hidden shadow-sm cursor-pointer transition-transform hover:scale-[1.01] hover:z-10 ${colorClass}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  >
                    <span className="truncate font-sans text-xs font-medium">{ev.job_name}</span>
                    <span className="font-mono text-[10px] opacity-90 shrink-0 ml-1.5 font-medium">
                      {ev.duration.toFixed(1)}s
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Time Axis Marks */}
      <div className="mt-3 pl-20 flex justify-between text-[11px] font-mono text-content-muted border-t border-line-subtle pt-2">
        <span>0.0s</span>
        <span>{(totalDuration * 0.25).toFixed(1)}s</span>
        <span>{(totalDuration * 0.5).toFixed(1)}s</span>
        <span>{(totalDuration * 0.75).toFixed(1)}s</span>
        <span>{totalDuration.toFixed(1)}s</span>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-line-subtle flex flex-wrap gap-2.5">
        {Array.from(jobColorMap.entries()).map(([jid, color]) => {
          const matched = events.find(e => e.job_id === jid);
          return (
            <div key={jid} className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-bg-elevated border border-line-subtle text-xs font-sans text-content-secondary">
              <span className={`w-2.5 h-2.5 rounded-full border ${color}`} />
              <span className="font-medium">{matched?.job_name || jid}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
