// components/branding/Logo.jsx - Updated to InsightSheet-lite
import React from 'react';

export default function Logo({ className = "", size = "medium" }) {
  const sizes = {
    small: { container: "w-8 h-8", text: "text-sm" },
    medium: { container: "w-12 h-12", text: "text-xl" },
    large: { container: "w-20 h-20", text: "text-3xl" }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Wavy Sphere Logo */}
      <div className={`${currentSize.container} relative flex items-center justify-center`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="#1e3a5f" opacity="0.1" />
          
          {/* Wavy lines forming sphere */}
          <path
            d="M 50 5 Q 75 25 50 50 Q 25 75 50 95"
            stroke="#8B5CF6"
            strokeWidth="3"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M 50 5 Q 60 27 50 50 Q 40 73 50 95"
            stroke="#A78BFA"
            strokeWidth="3"
            fill="none"
            opacity="0.9"
          />
          <path
            d="M 50 5 Q 40 27 50 50 Q 60 73 50 95"
            stroke="#C4B5FD"
            strokeWidth="3"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M 50 5 Q 25 25 50 50 Q 75 75 50 95"
            stroke="#DDD6FE"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          
          {/* Horizontal wavy lines */}
          <path
            d="M 10 30 Q 30 25 50 30 Q 70 35 90 30"
            stroke="#8B5CF6"
            strokeWidth="2"
            fill="none"
            opacity="0.7"
          />
          <path
            d="M 10 50 Q 30 45 50 50 Q 70 55 90 50"
            stroke="#A78BFA"
            strokeWidth="2.5"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M 10 70 Q 30 65 50 70 Q 70 75 90 70"
            stroke="#C4B5FD"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <h1 className={`${currentSize.text} font-bold bg-gradient-to-r from-slate-400 via-slate-400 to-slate-400 bg-clip-text text-transparent leading-tight`}>
          InsightSheet<span className="text-slate-400">-lite</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          DATA MADE SIMPLE
        </p>
      </div>
    </div>
  );
}