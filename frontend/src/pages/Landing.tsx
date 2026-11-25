/**
 * Platform Overview & Landing Page.
 * Showcases NEXUS architecture, interactive media carousel, and live kernel telemetry ribbon.
 */
import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Cpu,
  Layers,
  Activity,
  BarChart3,
  Sliders,
  CheckCircle2,
  Sparkles,
  Zap,
  Clock,
  Terminal
} from 'lucide-react';
import { SchedulerStatus, SystemMetrics } from '../types';

interface LandingProps {
  onNavigate: (tab: string) => void;
  scheduler: SchedulerStatus | null;
  system: SystemMetrics | null;
  onLoadPresets: () => void;
}

const SLIDES = [
  {
    id: 1,
    tag: 'Enterprise Infrastructure',
    title: 'Hyperscale Process Concurrency',
    subtitle: 'True multi-threaded execution slots orchestrating genuine OS process groups.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80',
    stat: '1–8 Slots',
    statLabel: 'Concurrent Execution',
  },
  {
    id: 2,
    tag: 'Hardware Architecture',
    title: 'Kernel-Level Core Affinity',
    subtitle: 'Strict logical core pinning and hardware scheduling with direct POSIX signals.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
    stat: '250ms',
    statLabel: 'High-Precision Tick Loop',
  },
  {
    id: 3,
    tag: 'Sub-Millisecond Telemetry',
    title: 'Zero-Mock Kernel Telemetry',
    subtitle: 'Live process inspection capturing actual memory RSS, CPU cycles, and exit codes.',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1600&q=80',
    stat: '100% Real',
    statLabel: 'Genuine System Metrics',
  },
  {
    id: 4,
    tag: 'Analytics & Replay',
    title: 'Continuous Timeline Reconstruction',
    subtitle: 'Accurate Gantt chart generation with mathematical TAT, WT, and RT computation.',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
    stat: '4 Policies',
    statLabel: 'Classical Algorithms',
  },
];

export const Landing: React.FC<LandingProps> = ({
  onNavigate,
  scheduler,
  system,
  onLoadPresets,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto slide rotation
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);

  return (
    <div className="space-y-16 pb-12">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-10 flex flex-col items-center text-center">
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[340px] bg-accent-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* Status Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-bg-elevated/80 border border-line-subtle shadow-sm mb-6 backdrop-blur-md transition-all hover:border-accent-primary/40">
          <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />
          <span className="text-xs font-sans font-medium text-content-secondary">
            Production Ready Supervisor
          </span>
          <span className="text-line-hover font-mono">|</span>
          <span className="text-xs font-mono text-accent-primary font-semibold">
            v2.4 Kernel Daemon
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-extrabold text-content-primary tracking-tight max-w-4xl leading-[1.12]">
          Engineered for Precision.{' '}
          <span className="bg-gradient-to-r from-accent-primary via-accent-hover to-accent-secondary bg-clip-text text-transparent">
            Grounded in Real Kernel Telemetry.
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-content-secondary font-sans max-w-2xl leading-relaxed">
          NEXUS bridges theoretical operating systems scheduling models with true POSIX process supervisors. 
          Manage real child processes, control kernel signals, and evaluate performance with mathematical fidelity.
        </p>

        {/* Action Callouts */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-2.5 px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-hover text-bg-main font-sans font-semibold text-sm shadow-elevated transition-all duration-200 hover:shadow-glow-purple hover:-translate-y-0.5"
          >
            <span>Launch Workstation Cockpit</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('jobs')}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-bg-card hover:bg-bg-elevated text-content-primary font-sans font-medium text-sm border border-line-subtle hover:border-line-hover transition-all duration-200"
          >
            <Layers className="w-4 h-4 text-accent-secondary" />
            <span>Job Dispatcher</span>
          </button>

          <button
            onClick={() => onNavigate('monitor')}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-bg-card hover:bg-bg-elevated text-content-primary font-sans font-medium text-sm border border-line-subtle hover:border-line-hover transition-all duration-200"
          >
            <Activity className="w-4 h-4 text-status-green" />
            <span>Process Monitor</span>
          </button>
        </div>

        {/* Quick System Telemetry Ribbon */}
        {system && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 py-3 px-6 rounded-2xl bg-bg-card/50 border border-line-subtle backdrop-blur-sm text-xs font-sans text-content-secondary">
            <div className="flex items-center space-x-2">
              <span className="text-content-muted">System State:</span>
              <span className="font-semibold text-status-green capitalize">{scheduler?.status || 'Active'}</span>
            </div>
            <span className="text-line-subtle">•</span>
            <div className="flex items-center space-x-2">
              <span className="text-content-muted">Host Cores:</span>
              <span className="font-mono text-content-primary font-semibold">{system.logical_cores} Logical</span>
            </div>
            <span className="text-line-subtle">•</span>
            <div className="flex items-center space-x-2">
              <span className="text-content-muted">Active Algorithm:</span>
              <span className="font-mono text-accent-primary font-semibold">{scheduler?.algorithm || 'FCFS'}</span>
            </div>
            <span className="text-line-subtle">•</span>
            <div className="flex items-center space-x-2">
              <span className="text-content-muted">Kernel Threads:</span>
              <span className="font-mono text-content-primary font-semibold">{system.active_process_count}</span>
            </div>
          </div>
        )}
      </section>

      {/* 2. INTERACTIVE SLIDESHOW SHOWCASE (Real Web Images + Transitions) */}
      <section
        className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden border border-line-subtle shadow-elevated group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative h-[380px] sm:h-[460px] w-full bg-bg-subtle overflow-hidden">
          {SLIDES.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* Background Image with Dark Gradient Wash */}
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover object-center filter brightness-[0.4] transition-transform duration-1000 ease-out group-hover:scale-105"
                  loading="lazy"
                />

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-bg-main/80 via-transparent to-bg-main/30" />

                {/* Content Overlay */}
                <div className="absolute bottom-8 left-8 right-8 sm:bottom-12 sm:left-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                  <div className="max-w-xl space-y-2">
                    <span className="inline-block px-3 py-1 rounded-lg bg-accent-primary/20 text-accent-primary text-xs font-sans font-semibold border border-accent-primary/30 uppercase tracking-wider">
                      {slide.tag}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-sans font-bold text-content-primary tracking-tight">
                      {slide.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-content-secondary font-sans leading-relaxed">
                      {slide.subtitle}
                    </p>
                  </div>

                  {/* Stat Card */}
                  <div className="shrink-0 p-4 rounded-2xl bg-bg-card/75 backdrop-blur-md border border-line-hover/50 text-right shadow-card">
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-accent-primary">
                      {slide.stat}
                    </div>
                    <div className="text-[11px] font-sans text-content-muted mt-0.5">
                      {slide.statLabel}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Carousel Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-bg-main/60 hover:bg-bg-elevated text-content-primary border border-line-subtle backdrop-blur-md transition-all duration-150 hover:scale-110"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-bg-main/60 hover:bg-bg-elevated text-content-primary border border-line-subtle backdrop-blur-md transition-all duration-150 hover:scale-110"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-8 bg-accent-primary' : 'w-2 bg-content-muted/40 hover:bg-content-muted'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3. FOUR CORE CAPABILITY PILLARS */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-sans font-bold text-content-primary tracking-tight">
            Comprehensive Systems Architecture
          </h2>
          <p className="text-xs text-content-secondary font-sans">
            Engineered from low-level Linux primitives up to a modern, reactive visual control plane.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Scheduling Engine */}
          <div
            onClick={() => onNavigate('scheduler')}
            className="group p-6 rounded-2xl bg-bg-card border border-line-subtle hover:border-accent-primary/40 transition-all duration-300 cursor-pointer shadow-card hover:-translate-y-1 hover:shadow-elevated flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/25 flex items-center justify-center text-accent-primary group-hover:scale-110 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-sans font-bold text-content-primary group-hover:text-accent-primary transition-colors">
                Multi-Policy Dispatcher
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Execute FCFS, Shortest Job First (with preemptive SRTF), Priority scheduling, and Round Robin with microsecond accuracy.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-line-subtle flex items-center justify-between text-xs font-sans text-accent-primary font-medium">
              <span>Configure Engine</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Signal Supervisor */}
          <div
            onClick={() => onNavigate('monitor')}
            className="group p-6 rounded-2xl bg-bg-card border border-line-subtle hover:border-accent-secondary/40 transition-all duration-300 cursor-pointer shadow-card hover:-translate-y-1 hover:shadow-elevated flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent-secondary/10 border border-accent-secondary/25 flex items-center justify-center text-accent-secondary group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-sans font-bold text-content-primary group-hover:text-accent-secondary transition-colors">
                POSIX Signal Supervisor
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Deliver true kernel-level signals (SIGSTOP, SIGCONT, SIGTERM) to dedicated process groups without killing address spaces.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-line-subtle flex items-center justify-between text-xs font-sans text-accent-secondary font-medium">
              <span>Inspect Live PIDs</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Analytics Engine */}
          <div
            onClick={() => onNavigate('analytics')}
            className="group p-6 rounded-2xl bg-bg-card border border-line-subtle hover:border-status-green/40 transition-all duration-300 cursor-pointer shadow-card hover:-translate-y-1 hover:shadow-elevated flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-status-green/10 border border-status-green/25 flex items-center justify-center text-status-green group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-sans font-bold text-content-primary group-hover:text-status-green transition-colors">
                Mathematical Analytics
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Continuous Gantt chart slice tracking with exact operating systems formulations for Turnaround, Waiting, and Response Times.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-line-subtle flex items-center justify-between text-xs font-sans text-status-green font-medium">
              <span>View Gantt Timeline</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Hardware Settings */}
          <div
            onClick={() => onNavigate('settings')}
            className="group p-6 rounded-2xl bg-bg-card border border-line-subtle hover:border-status-amber/40 transition-all duration-300 cursor-pointer shadow-card hover:-translate-y-1 hover:shadow-elevated flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-status-amber/10 border border-status-amber/25 flex items-center justify-center text-status-amber group-hover:scale-110 transition-transform">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-sans font-bold text-content-primary group-hover:text-status-amber transition-colors">
                Core Affinity &amp; Slots
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Pin executing processes to specific logical CPU cores using sched_setaffinity() and regulate multi-core execution slot limits.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-line-subtle flex items-center justify-between text-xs font-sans text-status-amber font-medium">
              <span>Adjust Hardware Limits</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. FAST BENCHMARK CTA BANNER */}
      <section className="bg-gradient-to-r from-bg-elevated via-bg-card to-bg-elevated border border-line-hover rounded-3xl p-8 sm:p-10 shadow-elevated flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-xl text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent-primary/10 text-accent-primary text-xs font-sans font-medium border border-accent-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>One-Click Verification Suite</span>
          </div>
          <h3 className="text-2xl font-sans font-bold text-content-primary tracking-tight">
            Run the Standard Operating Systems Benchmark
          </h3>
          <p className="text-xs text-content-secondary leading-relaxed">
            Instantly enqueue an authentic suite of CPU matrix computations, 80 MB memory sweeps, and safe disk I/O synchronization tasks.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            onClick={() => {
              onLoadPresets();
              onNavigate('dashboard');
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-hover text-bg-main font-sans font-bold text-xs shadow-sm transition-all duration-150 flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Load Workload Suite &amp; Open Cockpit</span>
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-bg-card hover:bg-bg-elevated text-content-secondary hover:text-content-primary border border-line-subtle text-xs font-sans font-medium transition-colors"
          >
            <span>Skip to Dashboard</span>
          </button>
        </div>
      </section>
    </div>
  );
};
