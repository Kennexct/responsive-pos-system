import React from 'react';

interface VPosLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function VPosLogo({ size = 32, className = '', showText = false, textClassName = '' }: VPosLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div 
        style={{ width: size, height: size }} 
        className="relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-sm shadow-blue-500/20 bg-gradient-to-b from-[#3B66FF] via-[#2A52F3] to-[#1D40EC]"
      >
        <img 
          src="/logo.png" 
          alt="VPos Logo" 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide img if missing, show SVG fallback
            (e.target as HTMLElement).style.display = 'none';
            const svgFallback = (e.target as HTMLElement).nextElementSibling;
            if (svgFallback) (svgFallback as HTMLElement).style.display = 'block';
          }}
        />
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full p-[16%] hidden pointer-events-none"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Wing */}
          <polygon points="50,88 12,20 34,30 50,72" fill="white" fillOpacity="0.95" />
          <polygon points="50,88 34,30 50,56" fill="white" fillOpacity="0.6" />
          
          {/* Right Wing */}
          <polygon points="50,88 88,20 66,30 50,72" fill="white" fillOpacity="0.88" />
          <polygon points="50,88 66,30 50,56" fill="white" fillOpacity="0.45" />

          {/* Center Facet Diamond */}
          <polygon points="50,88 43,62 50,42 57,62" fill="white" fillOpacity="0.75" />
          <polygon points="50,42 50,88 57,62" fill="white" fillOpacity="0.95" />
        </svg>
      </div>

      {showText && (
        <span className={`font-bold tracking-tight text-slate-900 dark:text-white ${textClassName || 'text-lg'}`}>
          VPos
        </span>
      )}
    </div>
  );
}
