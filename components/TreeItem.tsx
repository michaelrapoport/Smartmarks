import React, { useState } from 'react';
import { BookmarkNode, BookmarkType } from '../types';
import { Folder, FolderOpen, Link2, ExternalLink } from 'lucide-react';

interface TreeItemProps {
  node: BookmarkNode;
  level?: number;
}

export const TreeItem: React.FC<TreeItemProps> = ({ node, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(level < 1); // Open root level by default

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === BookmarkType.FOLDER) {
      setIsOpen(!isOpen);
    }
  };

  const isFolder = node.type === BookmarkType.FOLDER;
  const paddingLeft = `${level * 20}px`;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1 px-2 hover:bg-slate-700/50 rounded cursor-pointer transition-colors group ${level === 0 ? 'font-semibold text-slate-200' : 'text-slate-400'}`}
        style={{ paddingLeft }}
        onClick={handleToggle}
      >
        <span className="mr-2 text-slate-500">
          {isFolder ? (
            isOpen ? <FolderOpen size={16} className="text-blue-400" /> : <Folder size={16} className="text-blue-400" />
          ) : (
            <Link2 size={16} className="text-emerald-400" />
          )}
        </span>
        
        <span className={`truncate flex-1 ${!isFolder && 'hover:text-emerald-300 transition-colors'}`}>
          {node.title}
        </span>

        {!isFolder && (
          <a 
            href={node.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {isFolder && isOpen && node.children && (
        <div>
          {node.children.map(child => (
            <TreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};