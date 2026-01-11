import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  count: number;
  onConfirm: (suppressFuture: boolean) => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ count, onConfirm, onCancel }) => {
  const [suppress, setSuppress] = useState(false);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Delete Folders?</h3>
          <p className="text-slate-400 mb-6">
            You are about to delete <strong>{count}</strong> folder{count > 1 ? 's' : ''}. One or more of these folders contains bookmarks that will be permanently removed.
          </p>

          <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => setSuppress(!suppress)}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${suppress ? 'bg-blue-600 border-blue-600' : 'border-slate-500'}`}>
              {suppress && <X size={14} className="text-white" />}
            </div>
            <span className="text-sm text-slate-300 select-none">Don't ask me again</span>
          </div>

          <div className="flex gap-3 w-full">
            <button 
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-lg font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => onConfirm(suppress)}
              className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
