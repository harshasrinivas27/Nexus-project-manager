/**
 * Custom Geometric SVG Brand Emblem for NEXUS.
 */
import React from 'react';

interface NexusLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
}

export const NexusLogo: React.FC<NexusLogoProps> = ({
  className = '',
  size = 36,
  showText = true,
  subtitle = 'Kernel Process Supervisor',
}) => {
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Crafted Geometric Nexus Hex Emblem */}
      <div
        className="relative flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_12px_rgba(167,139,250,0.35)]"
        >
          <defs>
            <linearGradient id="nexus-grad-1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A78BFA" />
              <stop offset="0.5" stopColor="#818CF8" />
              <stop offset="1" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="nexus-grad-core" x1="18" y1="18" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#C084FC" />
            </linearGradient>
            <radialGradient id="nexus-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient Glow */}
          <circle cx="24" cy="24" r="22" fill="url(#nexus-glow)" />

          {/* Outer Interlocking Hexagon Facet */}
          <path
            d="M24 5L40.5 14.5V33.5L24 43L7.5 33.5V14.5L24 5Z"
            stroke="url(#nexus-grad-1)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />

          {/* Inner Orbital Concurrency Triad */}
          <path
            d="M24 13L33.5 18.5V29.5L24 35L14.5 29.5V18.5L24 13Z"
            stroke="#6366F1"
            strokeWidth="1.5"
            strokeDasharray="2 3"
            strokeLinecap="round"
          />

          {/* Node Connectors / Synapses */}
          <line x1="24" y1="5" x2="24" y2="13" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
          <line x1="40.5" y1="33.5" x2="33.5" y2="29.5" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <line x1="7.5" y1="33.5" x2="14.5" y2="29.5" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />

          {/* Central Execution Nucleus */}
          <circle cx="24" cy="24" r="5" fill="url(#nexus-grad-core)" />
          <circle cx="24" cy="24" r="2" fill="#13151F" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className="font-sans font-extrabold tracking-tight text-lg leading-none bg-gradient-to-r from-white via-[#E2E8F0] to-[#A78BFA] bg-clip-text text-transparent">
              NEXUS
            </span>
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
              PRO
            </span>
          </div>
          {subtitle && (
            <span className="text-[11px] font-sans text-content-muted tracking-normal font-medium mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
