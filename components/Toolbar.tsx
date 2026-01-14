import React from 'react';
import { 
  FolderPlus, FilePlus, Trash2, Wand2, Sparkles, Save, LayoutGrid, List, ArrowUpDown, 
  Upload, BrainCircuit, CopyMinus, FolderInput, Settings, Tag, FolderSymlink, Skull, FolderMinus,
  Activity
} from 'lucide-react';
import { SortOption } from '../types';

interface ToolbarProps {
  onImport: () => void;
  onAddFolder: () => void;
  onAddBookmark: () => void;
  onDeleteSelected: () => void;
  onDeleteFolder: () => void;
  onDeduplicate: () => void;
  onAnalyze: () => void;
  onAutoGroupName: () => void;
  onSmartRename: () => void;
  onExport: () => void;
  onOpenSettings: () => void;
  onTagSelected: () => void;
  onMoveSelected: () => void;
  onMarkDead: () => void;
  selectedCount: number;
  hasSelectedFolders: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortOption: SortOption;
  onSortChange: (opt: SortOption) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onImport,
  onAddFolder,
  onAddBookmark,
  onDeleteSelected,
  onDeleteFolder,
  onDeduplicate,
  onAnalyze,
  onAutoGroupName,
  onSmartRename,
  onExport,
  onOpenSettings,
  onTagSelected,
  onMoveSelected,
  onMarkDead,
  selectedCount,
  hasSelectedFolders,
  viewMode,
  onViewModeChange,
  sortOption,
  onSortChange
}) => {
  const isBatchActive = selectedCount > 0;
  
  // Style class helper for batch buttons
  const getBatchButtonStyle = (isActive: boolean) => 
    `p-2 rounded-lg transition-all duration-300 ${isActive 
      ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-white shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
      : 'hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'}`;

  return (
    <div className="h-16 border-b border-slate-700 bg-slate-800/90 backdrop-blur-md flex items-center px-4 justify-between select-none gap-4 relative z-30 shadow-sm">
      
      {/* Logo Section */}
      <div className="flex items-center gap-3 mr-4 pl-1">
        <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Activity className="text-white" size={20} />
        </div>
        <div className="hidden lg:block">
          <h1 className="font-bold text-lg text-white leading-none tracking-tight">SmartMark <span className="text-blue-400">AI</span></h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Intelligent Manager</p>
        </div>
      </div>

      <div className="w-px h-8 bg-slate-700/50 min-w-[1px]" />

      {/* File Operations */}
      <div className="flex items-center gap-1 min-w-max">
        <button onClick={onImport} className="flex flex-col items-center justify-center w-10 h-10 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors group" title="Import">
          <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
        </button>
        <button onClick={onExport} className="flex flex-col items-center justify-center w-10 h-10 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors group" title="Export">
          <Save size={18} className="group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      <div className="w-px h-8 bg-slate-700/50 min-w-[1px]" />

      {/* Edit Operations */}
      <div className="flex items-center gap-1 min-w-max">
         <button onClick={onAddFolder} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="New Folder">
          <FolderPlus size={18} />
        </button>
        <button 
          onClick={onDeleteFolder} 
          disabled={!hasSelectedFolders}
          className="p-2 hover:bg-red-900/30 rounded-lg text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors" 
          title="Delete Folder"
        >
          <FolderMinus size={18} />
        </button>
        <button onClick={onAddBookmark} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="New Bookmark">
          <FilePlus size={18} />
        </button>
        <button onClick={onDeduplicate} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Deduplicate">
          <CopyMinus size={18} />
        </button>
        <button 
          onClick={onDeleteSelected} 
          disabled={selectedCount === 0}
          className={`p-2 rounded-lg transition-colors ${selectedCount > 0 ? 'hover:bg-red-900/50 text-red-400 hover:text-red-300 bg-red-900/20' : 'text-slate-300 disabled:opacity-30'}`}
          title="Delete Selected"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="w-px h-8 bg-slate-700/50 min-w-[1px]" />

      {/* Bulk Actions (Contextual) */}
      <div className="flex items-center gap-1 min-w-max">
        <button 
          onClick={onTagSelected}
          disabled={selectedCount === 0}
          className={getBatchButtonStyle(selectedCount > 0)}
          title="Tag Selected"
        >
          <Tag size={18} />
        </button>
        <button 
          onClick={onMoveSelected}
          disabled={selectedCount === 0}
          className={getBatchButtonStyle(selectedCount > 0)}
          title="Move Selected"
        >
          <FolderSymlink size={18} />
        </button>
         <button 
          onClick={onMarkDead}
          disabled={selectedCount === 0}
          className={getBatchButtonStyle(selectedCount > 0)}
          title="Mark as Dead"
        >
          <Skull size={18} />
        </button>
      </div>

      <div className="w-px h-8 bg-slate-700/50 min-w-[1px]" />

      {/* AI Tools */}
      <div className="flex items-center gap-2 bg-slate-900/30 p-1 rounded-xl border border-slate-700/30 min-w-max">
        <button 
           onClick={onAnalyze}
           className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors"
           title="Re-run AI Analysis"
         >
           <BrainCircuit size={16} />
           <span className="hidden xl:inline">Analyze</span>
         </button>
         
         <div className="w-px h-4 bg-slate-700/50" />

         <button 
            onClick={onSmartRename}
            disabled={selectedCount === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30
              ${selectedCount > 0 ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' : 'hover:bg-emerald-600/10 text-emerald-400'}
            `}
            title="Smart Naming"
          >
            <Sparkles size={16} />
            <span className="hidden xl:inline">Naming</span>
          </button>

          <button 
            onClick={onAutoGroupName}
            disabled={selectedCount < 2}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30
               ${selectedCount >= 2 ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30' : 'hover:bg-blue-600/10 text-blue-400'}
            `}
            title="Smart Folder Extrapolation"
          >
            <FolderInput size={16} />
            <span className="hidden xl:inline">Group</span>
          </button>
      </div>

      <div className="flex-1" />

      {/* Settings & View */}
      <div className="flex items-center gap-3 min-w-max">
         <button onClick={onOpenSettings} className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors" title="Settings">
           <Settings size={20} />
         </button>

         <div className="w-px h-8 bg-slate-700/50 min-w-[1px]" />

        <div className="relative group z-50">
            <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white text-xs font-medium transition-colors">
               <ArrowUpDown size={14} />
               <span className="capitalize">{sortOption}</span>
            </button>
            
            {/* Dropdown Menu - Fixed Z-Index Context */}
            <div className="absolute right-0 top-full mt-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
               <button onClick={() => onSortChange('type')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">Type</button>
               <button onClick={() => onSortChange('name')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">Name</button>
               <button onClick={() => onSortChange('date')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-700 text-slate-300 hover:text-white transition-colors">Date</button>
            </div>
          </div>

          <div className="flex items-center bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
             <button 
               onClick={() => onViewModeChange('grid')} 
               className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
               <LayoutGrid size={16} />
             </button>
             <button 
               onClick={() => onViewModeChange('list')} 
               className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
             >
               <List size={16} />
             </button>
          </div>
      </div>
    </div>
  );
};