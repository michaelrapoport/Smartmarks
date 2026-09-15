import React, { useEffect, useState } from 'react';
import { Database, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface ModelSummary {
  modelId: string;
  modelName: string;
  providerName: string;
}

interface BedrockModalProps {
  onSelectModel: (modelId: string) => void;
}

export const BedrockModal: React.FC<BedrockModalProps> = ({ onSelectModel }) => {
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/bedrock-models');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch models');
        }

        setModels(data.models || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-slate-300">Detecting AWS Credentials and fetching Bedrock models...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-slate-800 border border-red-900/50 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <AlertCircle size={28} />
            <h2 className="text-xl font-semibold">Authentication Error</h2>
          </div>
          <p className="text-slate-300 mb-6">{error}</p>
          <div className="bg-slate-900/50 p-4 rounded-lg text-sm text-slate-400 mb-6 font-mono">
            $ aws sso login<br />
            or<br />
            $ aws configure
          </div>
          <Button variant="primary" className="w-full" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-700 flex items-center gap-3 bg-slate-900/50 shrink-0">
          <Database className="text-blue-400" size={24} />
          <div>
            <h2 className="text-lg font-semibold text-white">Select AI Model</h2>
            <p className="text-sm text-slate-400">AWS Bedrock Credentials Detected</p>
          </div>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {models.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No active text models found in your AWS account.</p>
          ) : (
            <div className="space-y-2">
              {models.map(m => (
                <button
                  key={m.modelId}
                  onClick={() => setSelected(m.modelId)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected === m.modelId
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium text-white">{m.modelName}</div>
                  <div className="text-xs text-slate-400 mt-1 flex justify-between">
                    <span>{m.providerName}</span>
                    <span className="font-mono text-slate-500">{m.modelId}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/30 flex justify-end shrink-0">
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => selected && onSelectModel(selected)}
          >
            Continue with Selected Model
          </Button>
        </div>
      </div>
    </div>
  );
};
