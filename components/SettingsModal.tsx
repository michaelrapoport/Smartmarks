import React from 'react';
import { X, Settings, Zap, Database, Layers } from 'lucide-react';

interface SettingsModalProps {
  concurrency: number;
  setConcurrency: (val: number) => void;
  batchSize: number;
  setBatchSize: (val: number) => void;
  treeDepth: string;
  setTreeDepth: (val: string) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  concurrency,
  setConcurrency,
  batchSize,
  setBatchSize,
  treeDepth,
  setTreeDepth,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-slate-400" />
            <h3 className="font-semibold text-lg text-white">Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Concurrency Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                Liveness Concurrency
              </label>
              <span className="text-2xl font-mono text-blue-400 font-bold">{concurrency}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              step="1"
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-xs text-slate-500">
              Maximum number of simultaneous network requests when checking for dead links. Higher is faster but may cause timeouts.
            </p>
          </div>

          {/* Batch Size Slider */}
          <div className="space-y-4">
             <div className="flex justify-between items-end">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Database size={16} className="text-purple-400" />
                AI Batch Size
              </label>
              <span className="text-2xl font-mono text-purple-400 font-bold">{batchSize}</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="500" 
              step="50"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-xs text-slate-500">
              Number of bookmarks sent to Gemini 3 Pro in a single context window. 
              Limited to 500 to prevent response truncation.
            </p>
          </div>

          {/* Tree Depth Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Layers size={16} className="text-emerald-400" />
                Structure Depth
              </label>
              <span className="text-sm font-mono text-emerald-400 font-bold">{treeDepth}</span>
            </div>
            <div className="flex gap-2 p-1 bg-slate-700/50 rounded-lg">
                {['Shallow', 'Balanced', 'Deep'].map((option) => (
                    <button
                        key={option}
                        onClick={() => setTreeDepth(option)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                            treeDepth === option 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            <p className="text-xs text-slate-500">
                Controls the granularity of the AI organization. 'Shallow' creates broad categories, while 'Deep' creates highly specific sub-folders.
            </p>
          </div>

        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};