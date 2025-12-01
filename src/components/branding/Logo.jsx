// components/branding/Logo.jsx - Meldra Brand Identity
import React from 'react';

export default function Logo({ className = "", size = "medium", showTagline = true, variant = "default" }) {
  const sizes = {
    small: { container: "w-8 h-8", text: "text-lg", tagline: "text-[10px]" },
    medium: { container: "w-10 h-10", text: "text-xl", tagline: "text-xs" },
    large: { container: "w-14 h-14", text: "text-2xl", tagline: "text-sm" },
    xl: { container: "w-20 h-20", text: "text-4xl", tagline: "text-base" }
  };

  const currentSize = sizes[size];

  // Variant styles
  const variants = {
    default: {
      gradient: "from-purple-600 via-pink-500 to-purple-600",
      text: "from-purple-600 via-pink-500 to-purple-600",
      tagline: "text-purple-500 dark:text-purple-400"
    },
    light: {
      gradient: "from-purple-500 via-pink-400 to-purple-500",
      text: "from-purple-500 via-pink-400 to-purple-500",
      tagline: "text-purple-400"
    },
    dark: {
      gradient: "from-purple-400 via-pink-400 to-purple-400",
      text: "from-purple-400 via-pink-400 to-purple-400",
      tagline: "text-purple-300"
    }
  };

  const style = variants[variant];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Meldra Orb - Unique Animated Logo Mark */}
      <div className={`${currentSize.container} relative flex items-center justify-center`}>
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-md animate-pulse" />

        {/* Main orb container */}
        <div className={`relative w-full h-full rounded-xl bg-gradient-to-br ${style.gradient} p-[2px] shadow-lg shadow-purple-500/30`}>
          <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
            {/* Animated inner design */}
            <svg viewBox="0 0 40 40" className="w-3/4 h-3/4">
              {/* Data flow lines - representing insights */}
              <defs>
                <linearGradient id="meldraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="50%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient id="meldraGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#F472B6" />
                </linearGradient>
              </defs>

              {/* M letter stylized as data streams */}
              <path
                d="M 8 30 L 8 12 L 20 24 L 32 12 L 32 30"
                stroke="url(#meldraGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Accent dots representing data points */}
              <circle cx="8" cy="10" r="2" fill="url(#meldraGradient2)" />
              <circle cx="20" cy="26" r="2" fill="url(#meldraGradient)" />
              <circle cx="32" cy="10" r="2" fill="url(#meldraGradient2)" />

              {/* Subtle connecting lines */}
              <path
                d="M 8 10 Q 14 18 20 10"
                stroke="url(#meldraGradient2)"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
              <path
                d="M 20 10 Q 26 18 32 10"
                stroke="url(#meldraGradient2)"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <h1 className={`${currentSize.text} font-bold bg-gradient-to-r ${style.text} bg-clip-text text-transparent leading-tight tracking-tight`}>
          Meldra
        </h1>
        {showTagline && (
          <p className={`${currentSize.tagline} ${style.tagline} font-semibold tracking-widest uppercase`}>
            Data Intelligence
          </p>
        )}
      </div>
    </div>
  );
}

// Standalone Orb for use as favicon or loader
export function MeldraOrb({ className = "", size = "medium", animated = true }) {
  const sizes = {
    small: "w-6 h-6",
    medium: "w-10 h-10",
    large: "w-16 h-16",
    xl: "w-24 h-24"
  };

  return (
    <div className={`${sizes[size]} relative ${className}`}>
      {/* Outer glow */}
      {animated && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/40 to-pink-500/40 blur-lg meldra-pulse" />
      )}

      {/* Orb */}
      <div className={`relative w-full h-full rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-purple-600 p-[2px] shadow-lg shadow-purple-500/40 ${animated ? 'meldra-glow' : ''}`}>
        <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-3/4 h-3/4">
            <defs>
              <linearGradient id="meldraOrbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            <path
              d="M 8 30 L 8 12 L 20 24 L 32 12 L 32 30"
              stroke="url(#meldraOrbGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="8" cy="10" r="2" fill="#A78BFA" />
            <circle cx="20" cy="26" r="2" fill="#8B5CF6" />
            <circle cx="32" cy="10" r="2" fill="#A78BFA" />
          </svg>
        </div>
      </div>
    </div>
  );
}
