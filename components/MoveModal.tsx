import React, { useState, useMemo } from 'react';
import { BookmarkNode, BookmarkType } from '../types';
import { Folder, X, Check } from 'lucide-react';

interface MoveModalProps {
  rootNodes: BookmarkNode[];
  onConfirm: (targetFolderId: string) => void;
  onClose: () => void;
  selectedIds: Set<string>; // To prevent moving a folder into itself
}

interface FlattenedFolder {
  id: string;
  title: string;
  depth: number;
  disabled: boolean;
}

export const MoveModal: React.FC<MoveModalProps> = ({ rootNodes, onConfirm, onClose, selectedIds }) => {
  const [targetId, setTargetId] = useState<string>('');

  // Flatten folder structure for the list
  const folders = useMemo(() => {
    const result: FlattenedFolder[] = [];
    
    const traverse = (nodes: BookmarkNode[], depth: number) => {
      nodes.forEach(node => {
        if (node.type === BookmarkType.FOLDER) {
          // Disable if the folder itself is being moved
          const disabled = selectedIds.has(node.id);
          
          result.push({
            id: node.id,
            title: node.title,
            depth,
            disabled
          });
          
          if (node.children) {
            traverse(node.children, depth + 1);
          }
        }
      });
    };

    traverse(rootNodes, 0);
    return result;
  }, [rootNodes, selectedIds]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50 shrink-0">
          <h3 className="font-semibold text-lg text-white">Move to Folder</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 scrollbar-thin">
          <div className="space-y-1">
             {folders.map(folder => (
               <button
                 key={folder.id}
                 disabled={folder.disabled}
                 onClick={() => setTargetId(folder.id)}
                 className={`
                   w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors
                   ${targetId === folder.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-300'}
                   ${folder.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                 `}
                 style={{ paddingLeft: `${folder.depth * 16 + 12}px` }}
               >
                 <Folder size={16} className={targetId === folder.id ? 'text-white' : 'text-amber-500'} />
                 <span className="truncate">{folder.title}</span>
                 {targetId === folder.id && <Check size={16} className="ml-auto" />}
               </button>
             ))}
             {folders.length === 0 && (
               <p className="text-slate-500 text-center py-4">No folders available.</p>
             )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white font-medium">
            Cancel
          </button>
          <button 
            disabled={!targetId}
            onClick={() => onConfirm(targetId)} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};