import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'auto';
}

export default function Logo({ className = '', variant = 'full', size = 'md' }: LogoProps) {
  // Dimensions
  const sizes = {
    sm: 'h-8',
    md: 'h-11',
    lg: 'h-16',
    auto: 'w-full h-full'
  };

  const heightClass = sizes[size] || sizes.md;

  if (variant === 'icon') {
    return (
      <svg
        className={`${heightClass} ${className}`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized 'S' Node Graph */}
        {/* Connections */}
        <line x1="80" y1="25" x2="55" y2="20" stroke="#1a3a6e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="55" y1="20" x2="30" y2="35" stroke="#1a3a6e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="30" y1="35" x2="25" y2="52" stroke="#1a3a6e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="25" y1="52" x2="45" y2="44" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="45" y1="44" x2="75" y2="44" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="75" y1="44" x2="65" y2="65" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="65" y1="65" x2="40" y2="65" stroke="#1a3a6e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="65" x2="22" y2="82" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="22" y1="82" x2="45" y2="88" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="45" y1="88" x2="75" y2="85" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Additional cross-connections to look like a network */}
        <line x1="30" y1="35" x2="45" y2="44" stroke="#1a3a6e" strokeWidth="1.5" strokeDasharray="2 2" />
        <line x1="25" y1="52" x2="40" y2="65" stroke="#0f9b8e" strokeWidth="1.5" strokeDasharray="2 2" />
        <line x1="65" y1="65" x2="45" y2="88" stroke="#1a3a6e" strokeWidth="1.5" strokeDasharray="2 2" />

        {/* Nodes */}
        <circle cx="80" cy="25" r="5" fill="#0f9b8e" />
        <circle cx="80" cy="25" r="2.5" fill="#ffffff" />
        <circle cx="55" cy="20" r="5" fill="#1a3a6e" />
        <circle cx="30" cy="35" r="5" fill="#1a3a6e" />
        <circle cx="25" cy="52" r="5" fill="#1a3a6e" />
        <circle cx="45" cy="44" r="5.5" fill="#0f9b8e" />
        <circle cx="75" cy="44" r="5" fill="#0f9b8e" />
        <circle cx="65" cy="65" r="5.5" fill="#0f9b8e" />
        <circle cx="40" cy="65" r="5" fill="#1a3a6e" />
        <circle cx="22" cy="82" r="5" fill="#0f9b8e" />
        <circle cx="45" cy="88" r="5" fill="#0f9b8e" />
        <circle cx="75" cy="85" r="5" fill="#0f9b8e" />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon */}
      <div className="shrink-0 flex items-center">
        <svg
          className={heightClass}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: 'auto' }}
        >
          {/* Stylized 'S' Node Graph */}
          {/* Connections */}
          <line x1="80" y1="25" x2="55" y2="20" stroke="#1a3a6e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="55" y1="20" x2="30" y2="35" stroke="#1a3a6e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="30" y1="35" x2="25" y2="52" stroke="#1a3a6e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="25" y1="52" x2="45" y2="44" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="45" y1="44" x2="75" y2="44" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="75" y1="44" x2="65" y2="65" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="65" y1="65" x2="40" y2="65" stroke="#1a3a6e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="65" x2="22" y2="82" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="22" y1="82" x2="45" y2="88" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="45" y1="88" x2="75" y2="85" stroke="#0f9b8e" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Additional cross-connections to look like a network */}
          <line x1="30" y1="35" x2="45" y2="44" stroke="#1a3a6e" strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="25" y1="52" x2="40" y2="65" stroke="#0f9b8e" strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="65" y1="65" x2="45" y2="88" stroke="#1a3a6e" strokeWidth="1.5" strokeDasharray="2 2" />

          {/* Nodes */}
          <circle cx="80" cy="25" r="5" fill="#0f9b8e" />
          <circle cx="80" cy="25" r="2.5" fill="#ffffff" />
          <circle cx="55" cy="20" r="5" fill="#1a3a6e" />
          <circle cx="30" cy="35" r="5" fill="#1a3a6e" />
          <circle cx="25" cy="52" r="5" fill="#1a3a6e" />
          <circle cx="45" cy="44" r="5.5" fill="#0f9b8e" />
          <circle cx="75" cy="44" r="5" fill="#0f9b8e" />
          <circle cx="65" cy="65" r="5.5" fill="#0f9b8e" />
          <circle cx="40" cy="65" r="5" fill="#1a3a6e" />
          <circle cx="22" cy="82" r="5" fill="#0f9b8e" />
          <circle cx="45" cy="88" r="5" fill="#0f9b8e" />
          <circle cx="75" cy="85" r="5" fill="#0f9b8e" />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col justify-center select-none">
        <div className="flex items-baseline font-sans font-bold tracking-tight">
          <span className="text-[#1a3a6e] text-base md:text-lg font-black">Sync</span>
          <span className="text-[#0f9b8e] text-base md:text-lg font-black flex items-center">
            AI
            <span className="inline-block w-1.5 h-1.5 bg-[#0f9b8e] rounded-full ml-0.5 animate-pulse" />
          </span>
        </div>
        <span className="text-[8px] md:text-[9px] text-gray-500 font-mono font-bold tracking-wider uppercase leading-none">
          Consultancy Pvt. Ltd.
        </span>
      </div>
    </div>
  );
}
