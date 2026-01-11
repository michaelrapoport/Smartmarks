import React from 'react';

export const Radar: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Core */}
      <div className="absolute w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"></div>
      
      {/* Rings */}
      <div className="absolute w-full h-full border border-blue-500/30 rounded-full animate-ping [animation-duration:3s]"></div>
      <div className="absolute w-3/4 h-3/4 border border-blue-400/40 rounded-full animate-ping [animation-duration:3s] [animation-delay:0.5s]"></div>
      <div className="absolute w-1/2 h-1/2 border border-blue-300/50 rounded-full animate-ping [animation-duration:3s] [animation-delay:1s]"></div>
      
      {/* Scanning Line */}
      <div className="absolute w-full h-full rounded-full overflow-hidden animate-spin [animation-duration:4s] opacity-50">
         <div className="w-1/2 h-1/2 bg-gradient-to-tl from-blue-500/80 to-transparent origin-bottom-right absolute top-0 left-0"></div>
      </div>
    </div>
  );
};