import React, { useState } from 'react';
import { Sparkles, ArrowUp, Loader2 } from 'lucide-react';

interface AgentBarProps {
  onCommand: (cmd: string) => Promise<void>;
  isProcessing: boolean;
}

export const AgentBar: React.FC<AgentBarProps> = ({ onCommand, isProcessing }) => {
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    await onCommand(input);
    setInput('');
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40">
      <form 
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-2 shadow-2xl shadow-blue-900/20 ring-1 ring-white/10"
      >
        <div className="pl-3 text-blue-400">
           {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
        </div>
        
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini to organize... (e.g., 'Move all YouTube links to a new Video folder')"
          className="flex-1 bg-transparent border-none text-slate-200 placeholder:text-slate-500 focus:ring-0 focus:outline-none py-2 px-2"
          disabled={isProcessing}
        />

        <button 
          type="submit"
          disabled={!input.trim() || isProcessing}
          className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
        >
          <ArrowUp size={18} />
        </button>
      </form>
    </div>
  );
};