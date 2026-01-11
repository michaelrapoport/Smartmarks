import React, { useState } from 'react';
import { BookmarkNode, BookmarkType } from '../types';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Star } from 'lucide-react';

interface SidebarProps {
  nodes: BookmarkNode[];
  activeFolderId: string;
  onFolderSelect: (id: string) => void;
  onMoveNode?: (nodeId: string, targetFolderId: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: BookmarkNode) => void;
}

const SidebarItem: React.FC<{ 
  node: BookmarkNode; 
  activeId: string; 
  onSelect: (id: string) => void; 
  depth: number;
  onMoveNode?: (nodeId: string, targetFolderId: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: BookmarkNode) => void;
}> = ({ node, activeId, onSelect, depth, onMoveNode, onContextMenu }) => {
  const [expanded, setExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Only render folders in sidebar
  if (node.type !== BookmarkType.FOLDER) return null;

  const isActive = node.id === activeId;
  const hasChildren = node.children && node.children.some(c => c.type === BookmarkType.FOLDER);
  const Icon = node.isToolbar ? Star : (expanded ? FolderOpen : Folder);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const nodeId = e.dataTransfer.getData('text/plain');
    if (nodeId && onMoveNode) {
      onMoveNode(nodeId, node.id);
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors border-l-2 
          ${isDragOver ? 'bg-blue-500/30 border-blue-400' : 'border-transparent'}
          ${isActive && !isDragOver ? 'bg-blue-600/20 text-blue-400 border-l-blue-500' : ''}
          ${!isActive && !isDragOver ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : ''}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node.id)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={(e) => onContextMenu && onContextMenu(e, node)}
      >
        <button 
          className={`p-0.5 rounded hover:bg-slate-700 ${hasChildren ? 'visible' : 'invisible'}`}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        
        <Icon size={16} className={node.isToolbar ? 'text-yellow-400' : (isActive ? 'text-blue-400' : 'text-slate-500')} />
        <span className="truncate text-sm font-medium">{node.title}</span>
      </div>
      
      {expanded && node.children && (
        <div>
          {node.children.map(child => (
            <SidebarItem 
              key={child.id} 
              node={child} 
              activeId={activeId} 
              onSelect={onSelect} 
              depth={depth + 1}
              onMoveNode={onMoveNode} 
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ nodes, activeFolderId, onFolderSelect, onMoveNode, onContextMenu }) => {
  return (
    <div className="w-64 flex flex-col bg-slate-900 border-r border-slate-700 h-full">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Folders</h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {nodes.map(node => (
          <SidebarItem 
            key={node.id} 
            node={node} 
            activeId={activeFolderId} 
            onSelect={onFolderSelect} 
            depth={0} 
            onMoveNode={onMoveNode}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );
};