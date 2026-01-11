import React, { useState, useEffect } from 'react';
import { BookmarkNode, BookmarkType } from '../types';
import { Folder, FolderOpen, Check, ChevronRight, ChevronDown, Wand2, ArrowRight, X, ArrowLeftRight } from 'lucide-react';
import { TreeItem } from './TreeItem';

interface StructureWizardProps {
  nodes: BookmarkNode[]; // Proposed
  originalNodes: BookmarkNode[]; // Current
  onConfirm: (selectedFolderIds: Set<string>) => void;
  onCancel: () => void;
}

// Internal recursive tree item for the wizard (Interactive side)
const WizardTreeItem: React.FC<{
  node: BookmarkNode;
  level: number;
  selectedFolderIds: Set<string>;
  onToggleFolder: (id: string) => void;
}> = ({ node, level, selectedFolderIds, onToggleFolder }) => {
  const [isOpen, setIsOpen] = useState(true);
  
  if (node.type !== BookmarkType.FOLDER) return null; // We only really control folders here, links are implicit

  const isChecked = selectedFolderIds.has(node.id);
  const hasChildren = node.children && node.children.some(c => c.type === BookmarkType.FOLDER);
  const linkCount = node.children ? node.children.filter(c => c.type === BookmarkType.LINK).length : 0;
  const folderCount = node.children ? node.children.filter(c => c.type === BookmarkType.FOLDER).length : 0;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-800/50 transition-colors group ${!isChecked ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {/* Expand/Collapse */}
        <button 
          className={`p-1 rounded text-slate-500 hover:text-white hover:bg-slate-700 ${hasChildren ? 'visible' : 'invisible'}`}
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Checkbox (Toggle Folder Existence) */}
        <button
          onClick={() => onToggleFolder(node.id)}
          className={`
            w-5 h-5 rounded border flex items-center justify-center transition-all
            ${isChecked 
              ? 'bg-blue-500 border-blue-500 text-white' 
              : 'bg-transparent border-slate-600 text-transparent hover:border-slate-400'}
          `}
        >
          <Check size={12} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isOpen ? <FolderOpen size={18} className="text-amber-500" /> : <Folder size={18} className="text-amber-500" />}
          <span className={`font-medium truncate ${isChecked ? 'text-slate-200' : 'text-slate-500 decoration-slate-600'}`}>
            {node.title}
          </span>
          <span className="text-xs text-slate-600 ml-2">
            ({linkCount} links{folderCount > 0 ? `, ${folderCount} folders` : ''})
          </span>
        </div>

        {!isChecked && (
          <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            Dissolve
          </span>
        )}
      </div>

      {isOpen && node.children && (
        <div className="border-l border-slate-800/50 ml-4">
          {node.children.map(child => (
            <WizardTreeItem 
              key={child.id} 
              node={child} 
              level={level + 1} 
              selectedFolderIds={selectedFolderIds}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const StructureWizard: React.FC<StructureWizardProps> = ({ nodes, originalNodes, onConfirm, onCancel }) => {
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ folders: 0, links: 0 });

  // Initialize: Select all folders by default
  useEffect(() => {
    const ids = new Set<string>();
    let fCount = 0;
    let lCount = 0;
    
    const traverse = (list: BookmarkNode[]) => {
      list.forEach(node => {
        if (node.type === BookmarkType.FOLDER) {
          ids.add(node.id);
          fCount++;
          if (node.children) traverse(node.children);
        } else {
          lCount++;
        }
      });
    };
    traverse(nodes);
    setSelectedFolderIds(ids);
    setStats({ folders: fCount, links: lCount });
  }, [nodes]);

  const toggleFolder = (id: string) => {
    const newSet = new Set(selectedFolderIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFolderIds(newSet);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-[95vw] h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 pb-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                  <Wand2 size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white">Review Proposal</h2>
              </div>
              <p className="text-slate-400">
                Gemini 3 Flash has re-architected your library. Compare the changes below.
              </p>
            </div>
            <button 
              onClick={onCancel}
              className="p-2 text-slate-500 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Split View Content */}
        <div className="flex-1 flex min-h-0">
          
          {/* Left: Original Structure */}
          <div className="flex-1 border-r border-slate-800 flex flex-col min-w-0 bg-slate-900/50">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                 Current Structure (Read Only)
               </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <div className="space-y-1">
                 {originalNodes.map(node => (
                   <TreeItem key={node.id} node={node} level={0} />
                 ))}
                 {originalNodes.length === 0 && (
                   <div className="text-slate-600 text-center mt-10 italic">Empty</div>
                 )}
              </div>
            </div>
          </div>

          {/* Center Divider/Action Arrow */}
          <div className="w-12 bg-slate-900 border-x border-slate-800 flex items-center justify-center shrink-0">
             <div className="p-2 rounded-full bg-slate-800 text-slate-500">
               <ArrowLeftRight size={16} />
             </div>
          </div>

          {/* Right: Proposed Structure */}
          <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-slate-900 to-blue-950/10">
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm flex justify-between items-center">
               <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                 <Wand2 size={14} /> Proposed Structure (Editable)
               </h3>
               <span className="text-xs text-slate-500">
                 Uncheck folders to flatten
               </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <div className="space-y-1">
                {nodes.map(node => (
                  <WizardTreeItem 
                    key={node.id} 
                    node={node} 
                    level={0} 
                    selectedFolderIds={selectedFolderIds}
                    onToggleFolder={toggleFolder}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
          <button 
            onClick={onCancel} 
            className="text-slate-400 hover:text-white px-6 py-3 font-medium transition-colors"
          >
            Discard & Keep Original
          </button>
          
          <button 
            onClick={() => onConfirm(selectedFolderIds)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all transform hover:-translate-y-0.5"
          >
            <span>Confirm New Structure</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};