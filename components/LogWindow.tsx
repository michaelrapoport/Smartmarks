import React, { useEffect, useRef } from 'react';

interface LogWindowProps {
  logs: string[];
}

export const LogWindow: React.FC<LogWindowProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed bottom-6 right-6 w-96 h-64 overflow-y-auto font-mono text-xs z-[60] pointer-events-none select-none mask-image-b">
      <div className="flex flex-col justify-end min-h-full">
        {logs.map((log, i) => (
          <div key={i} className="text-cyan-400/60 mb-1.5 leading-relaxed drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-2 fade-in duration-300">
            <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString([], { hour12: false, second: "2-digit", minute: "2-digit" })}]</span>
            {log}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      
      {/* CSS to hide scrollbar but keep functionality if pointer events were enabled (they are none here for pass-through) */}
      <style>{`
        .mask-image-b {
          mask-image: linear-gradient(to bottom, transparent, black 10%);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%);
        }
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `}</style>
    </div>
  );
};
