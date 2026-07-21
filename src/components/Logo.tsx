import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'auto';
}

export default function Logo({ className = '', variant = 'full', size = 'md' }: LogoProps) {
  // Show just the plain company name text in a clean, bold, simple font
  return (
    <span 
      id="brand-company-name"
      className={`font-sans font-bold tracking-tight text-white select-none ${
        size === 'sm' ? 'text-sm' : 'text-base md:text-lg'
      } ${className}`}
    >
      SyncAI Consultancy Pvt. Ltd.
    </span>
  );
}
