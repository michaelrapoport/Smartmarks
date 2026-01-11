
export enum BookmarkType {
  FOLDER = 'FOLDER',
  LINK = 'LINK',
}

export type SortOption = 'name' | 'date' | 'type';

export interface BookmarkNode {
  id: string;
  type: BookmarkType;
  title: string;
  url?: string;
  addDate?: string;
  lastModified?: string;
  icon?: string;
  children?: BookmarkNode[];
  parentId?: string;
  // Metadata fields
  metaDescription?: string;
  tags?: string[];
  status?: 'active' | 'dead' | 'unchecked' | 'checking';
  originalPath?: string[];
  // Special Flags
  isToolbar?: boolean;
  // UI State
  isSelected?: boolean;
}

export interface ProcessingStats {
  totalLinks: number;
  duplicateCount: number;
  cleanedCount: number;
  foldersReduced: number;
  startTime: number;
  endTime?: number;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  LIVENESS_CHECK = 'LIVENESS_CHECK', // New phase
  AI_ENRICHMENT = 'AI_ENRICHMENT', // New phase: Gemini 3 Flash generating descriptions
  AI_ANALYSIS = 'AI_ANALYSIS', // Gemini 3 Pro analyzing structure
  WIZARD_REVIEW = 'WIZARD_REVIEW', // User approves structure
  MANAGER = 'MANAGER', // The Dashboard
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  source?: 'initial' | 'dynamic';
}

export interface QuizAnswer {
  questionId: string;
  questionText: string;
  selectedOption: string;
}
