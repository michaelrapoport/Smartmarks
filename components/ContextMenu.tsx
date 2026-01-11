import React, { useEffect, useRef } from 'react';
import { Edit2, Trash2, FolderInput, Info, ExternalLink } from 'lucide-react';
import { BookmarkNode, BookmarkType } from '../types';

interface ContextMenuProps {
  position: { x: number; y: number };
  node: BookmarkNode;
  onClose: () => void;
  onRename: (node: BookmarkNode) => void;
  onDelete: (id: string) => void;
  onInfo: (node: BookmarkNode) => void;
  onMove: (node: BookmarkNode) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  position, 
  node, 
  onClose, 
  onRename, 
  onDelete, 
  onInfo,
  onMove
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const style: React.CSSProperties = {
    top: position.y,
    left: position.x,
  };

  return (
    <div 
      ref={menuRef}
      style={style} 
      className="fixed z-[9999] bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[160px] py-1 animate-in fade-in zoom-in-95 duration-100"
    >
      {node.type === BookmarkType.LINK && node.url && (
         <a 
           href={node.url} 
           target="_blank" 
           rel="noopener noreferrer"
           className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
           onClick={onClose}
         >
           <ExternalLink size={14} />
           <span>Open</span>
         </a>
      )}
      
      <button 
        onClick={() => { onRename(node); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
      >
        <Edit2 size={14} />
        <span>Rename</span>
      </button>

      <button 
        onClick={() => { onMove(node); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
      >
        <FolderInput size={14} />
        <span>Move to...</span>
      </button>

      <button 
        onClick={() => { onInfo(node); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
      >
        <Info size={14} />
        <span>Get Info</span>
      </button>

      <div className="h-px bg-slate-700 my-1" />

      <button 
        onClick={() => { onDelete(node.id); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors text-left"
      >
        <Trash2 size={14} />
        <span>Delete</span>
      </button>
    </div>
  );
};