import React from 'react';
import { BookmarkNode, BookmarkType } from '../types';
import { ExternalLink, Globe, AlertCircle, CheckCircle, Clock, FolderOpen, Trash2 } from 'lucide-react';

interface FileGridProps {
  items: BookmarkNode[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, multi: boolean, range: boolean) => void;
  onOpen: (node: BookmarkNode) => void;
  onDeleteItem: (id: string) => void;
  viewMode: 'grid' | 'list';
  onContextMenu?: (e: React.MouseEvent, node: BookmarkNode) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({ 
  items, 
  selectedIds, 
  onToggleSelect, 
  onOpen, 
  onDeleteItem, 
  viewMode,
  onContextMenu 
}) => {
  
  const handleDragStart = (e: React.DragEvent, node: BookmarkNode) => {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    // Visual tweak
    const el = e.target as HTMLElement;
    el.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.target as HTMLElement;
    el.style.opacity = '1';
  };

  const handleClick = (e: React.MouseEvent, item: BookmarkNode) => {
    // Prevent default to avoid unwanted text selection during shift-click
    if (e.shiftKey) {
       const selection = window.getSelection();
       if (selection) selection.removeAllRanges();
    }
    onToggleSelect(item.id, e.metaKey || e.ctrlKey, e.shiftKey);
  };

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500">
        <FolderOpen size={48} className="mb-4 opacity-20" />
        <p>This folder is empty</p>
      </div>
    );
  }

  const StatusIcon = ({ status }: { status?: string }) => {
    if (status === 'active') return <CheckCircle size={14} className="text-emerald-500" />;
    if (status === 'dead') return <AlertCircle size={14} className="text-red-500" />;
    if (status === 'checking') return <Clock size={14} className="text-slate-500 animate-pulse" />;
    return null;
  };

  if (viewMode === 'list') {
    return (
      <div className="p-4 flex flex-col gap-1 overflow-y-auto h-full content-start pb-24">
        {items.map(item => {
          const isSelected = selectedIds.has(item.id);
          const isFolder = item.type === BookmarkType.FOLDER;
          
          return (
             <div
               key={item.id}
               draggable
               onDragStart={(e) => handleDragStart(e, item)}
               onDragEnd={handleDragEnd}
               onClick={(e) => handleClick(e, item)}
               onDoubleClick={() => onOpen(item)}
               onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
               className={`
                 group flex items-center gap-4 p-2 rounded-lg border transition-all cursor-pointer select-none relative
                 ${isSelected 
                   ? 'bg-blue-600/20 border-blue-500/50 ring-1 ring-blue-500/20' 
                   : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700/50'}
               `}
             >
               <div className={`p-1.5 rounded-md ${isFolder ? 'text-amber-500 bg-amber-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
                 {isFolder ? <FolderOpen size={18} /> : <Globe size={18} />}
               </div>
               
               <div className="flex-1 min-w-0">
                 <h3 className="font-medium text-slate-200 truncate text-sm">{item.title}</h3>
               </div>

               {!isFolder && item.url && (
                 <div className="hidden sm:block w-1/3 text-xs text-slate-500 truncate font-mono">
                   {item.url}
                 </div>
               )}

               <div className="hidden md:block w-24 text-xs text-slate-500 text-right">
                 {item.addDate ? new Date(parseInt(item.addDate) * 1000).toLocaleDateString() : '-'}
               </div>

               {!isFolder && (
                 <div className="w-8 flex justify-center">
                    <StatusIcon status={item.status} />
                 </div>
               )}

               <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded transition-all absolute right-2"
                  title="Delete"
                >
                  <Trash2 size={14} />
               </button>
             </div>
          );
        })}
      </div>
    );
  }

  // Grid View
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto h-full content-start pb-24">
      {items.map(item => {
        const isSelected = selectedIds.has(item.id);
        const isFolder = item.type === BookmarkType.FOLDER;

        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={handleDragEnd}
            onClick={(e) => handleClick(e, item)}
            onDoubleClick={() => onOpen(item)}
            onContextMenu={(e) => onContextMenu && onContextMenu(e, item)}
            className={`
              relative group rounded-xl p-4 border transition-all cursor-pointer select-none
              flex flex-col gap-2 h-32
              ${isSelected 
                ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/50 shadow-lg shadow-blue-500/10' 
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${isFolder ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {isFolder ? <FolderOpen size={20} /> : <Globe size={20} />}
              </div>
              
              <div className="flex gap-1">
                 {!isFolder && <StatusIcon status={item.status} />}
                 
                 {!isFolder && (
                   <a 
                     href={item.url} 
                     target="_blank" 
                     rel="noreferrer"
                     className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-700 transition-colors"
                     onClick={(e) => e.stopPropagation()}
                   >
                     <ExternalLink size={14} />
                   </a>
                 )}
              </div>
            </div>

            <div className="flex-1 min-h-0">
               <h3 className="font-medium text-slate-200 truncate leading-snug" title={item.title}>
                 {item.title}
               </h3>
               {!isFolder && (
                 <p className="text-xs text-slate-500 truncate mt-1 font-mono opacity-80">
                   {item.url}
                 </p>
               )}
            </div>

            {/* Trash Button */}
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 onDeleteItem(item.id);
               }}
               className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
               title="Delete"
            >
               <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};