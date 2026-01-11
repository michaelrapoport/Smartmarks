import React from 'react';
import { BookmarkNode } from '../types';
import { X, Calendar, Link as LinkIcon, Tag } from 'lucide-react';

interface MetadataModalProps {
  node: BookmarkNode | null;
  onClose: () => void;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
          <h3 className="font-semibold text-lg text-white">Bookmark Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</label>
            <input 
              readOnly 
              value={node.title} 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {node.url && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <LinkIcon size={12} /> URL
              </label>
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 break-all text-sm text-blue-400 font-mono">
                {node.url}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} /> Added
                </label>
                <div className="text-slate-300 text-sm">
                  {node.addDate ? new Date(parseInt(node.addDate) * 1000).toLocaleDateString() : 'Unknown'}
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <div className={`text-sm font-medium ${node.status === 'dead' ? 'text-red-400' : 'text-emerald-400'}`}>
                   {node.status?.toUpperCase() || 'UNKNOWN'}
                </div>
             </div>
          </div>
          
          {/* Metadata Overlay Info */}
          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
               <Tag size={12} /> AI Metadata
             </label>
             <p className="text-sm text-slate-400 italic">
               {node.metaDescription || "No additional metadata scraped yet."}
             </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};