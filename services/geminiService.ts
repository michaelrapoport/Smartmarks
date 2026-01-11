import { GoogleGenAI, Type } from "@google/genai";
import { BookmarkNode, BookmarkType, QuizQuestion, QuizAnswer } from '../types';

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// ... (Existing helper functions: getAllLinks) ...
// Helper to recursively get all links from the tree
const getAllLinks = (nodes: BookmarkNode[]): BookmarkNode[] => {
  const links: BookmarkNode[] = [];
  const traverse = (list: BookmarkNode[]) => {
    list.forEach(node => {
      if (node.type === BookmarkType.LINK) {
        links.push(node);
      } else if (node.children) {
        traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return links;
};

// ... (Existing functions: enrichBookmarks, generateUserPreferencesQuiz, generatePeriodicQuestion, organizeBookmarksWithGemini, suggestFolderName, optimizeTitles) ...

export const enrichBookmarks = async (
  bookmarks: BookmarkNode[]
): Promise<Map<string, { title: string; description: string }>> => {
  const ai = getAiClient();
  const payload = bookmarks.map(b => ({
    id: b.id,
    url: b.url,
    originalTitle: b.title
  }));

  const prompt = `
    You are a web crawler agent.
    For each URL provided in the JSON list:
    1. Identify the likely content of the page based on the URL and original title.
    2. Generate a clean, human-readable Title (remove "Index of", "Home", tracking info).
    3. Generate a concise (1 sentence) description of what this page is.
    
    If you don't recognize the URL, make a best guess based on the domain name.
    
    Input JSON: [{id, url, originalTitle}]
    Output JSON Schema: 
    { "results": [{ "id": "string", "title": "string", "description": "string" }] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: JSON.stringify(payload) + "\n\n" + prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    const map = new Map<string, { title: string; description: string }>();
    
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((r: any) => {
        map.set(r.id, { title: r.title, description: r.description });
      });
    }
    return map;
  } catch (error) {
    // console.error("Gemini Enrichment Error:", error);
    // Silent fail is okay here, we just don't enrich
    return new Map();
  }
};

export const generateUserPreferencesQuiz = async (nodes: BookmarkNode[]): Promise<QuizQuestion[]> => {
  const ai = getAiClient();
  
  // Create a summary of the current state (Top level folders + 20 random links)
  const topFolders = nodes.filter(n => n.type === BookmarkType.FOLDER).map(n => n.title).join(", ");
  const allLinks = getAllLinks(nodes);
  const sampleLinks = allLinks.sort(() => 0.5 - Math.random()).slice(0, 20).map(l => l.url).join("\n");
  
  const prompt = `
    You are a professional Digital Archivist. 
    Analyze the user's current bookmark "mess" summary below.
    Generate 3 separate multiple-choice questions to help you understand how they want their new structure organized.
    
    Goals:
    1. Determine if they prefer broad categories vs specific niches.
    2. Determine how to handle "Time-sensitive" items (e.g., News, Read Later).
    3. Determine technical depth (e.g., separate languages or group by project).
    
    REQUIREMENTS:
    - Exactly 4 distinct options per question.
    
    Current Top Folders: ${topFolders}
    Sample Links:
    ${sampleLinks}
    
    Output JSON Schema:
    { "questions": [ { "id": "q1", "question": "...", "options": ["Option A", "Option B", "Option C", "Option D"] } ] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const data = JSON.parse(response.text || "{}");
    return data.questions || [];
  } catch (e) {
    console.error("Quiz Gen Error", e);
    // Fallback default questions
    return [
      { id: '1', question: 'How do you prefer to group technology links?', options: ['By Language (JS, Python)', 'By Domain (Frontend, Backend)', 'By Project', 'Flat List (All in Tech)'], source: 'initial' },
      { id: '2', question: 'What should happen to old/uncategorized links?', options: ['Archive folder', 'Delete them', 'Try to categorize everything', 'Leave in Unsorted'], source: 'initial' },
      { id: '3', question: 'Do you prefer broad or deep structures?', options: ['Broad (Few folders, many items)', 'Deep (Many nested subfolders)', 'Balanced', 'Minimalist (Max 5 folders)'], source: 'initial' }
    ] as QuizQuestion[];
  }
};

export const generatePeriodicQuestion = async (
  newItems: BookmarkNode[], 
  existingQuestions: string[]
): Promise<QuizQuestion | null> => {
  const ai = getAiClient();
  
  const summary = newItems.map(i => `${i.title} (${i.url}) - ${i.metaDescription}`).join('\n');
  const existingQs = existingQuestions.join("\n- ");

  const prompt = `
    You are an intelligent organization assistant watching a bookmark scanning process.
    We just enriched a batch of bookmarks with the following content:
    ${summary}

    We have already asked the user:
    - ${existingQs}

    Task:
    Identify ONE specific ambiguity or organizational preference dilemma raised by this specific batch of content that hasn't been addressed.
    Generate 1 multiple choice question (with 4 options) to resolve it.
    
    If the content is generic or covered by previous questions, return NULL (empty JSON).
    
    Output JSON Schema:
    { "question": { "id": "uuid", "question": "...", "options": ["A", "B", "C", "D"] } }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    
    if (data.question && data.question.question && data.question.options?.length === 4) {
      return { ...data.question, id: crypto.randomUUID(), source: 'dynamic' };
    }
    return null;
  } catch (e) {
    // It's fine to fail or return nothing here
    return null;
  }
};

export const organizeBookmarksWithGemini = async (
  bookmarks: BookmarkNode[],
  limit: number = 2000, 
  userPreferences: QuizAnswer[] = [],
  treeDepth: string = 'Balanced'
): Promise<any> => {
  const ai = getAiClient();
  const links = getAllLinks(bookmarks);
  
  const payload = links.slice(0, limit).map(b => ({
    id: b.id,
    title: b.title,
    url: b.url,
    description: b.metaDescription || "No description",
    original: b.originalPath?.join('/')
  }));

  const prefString = userPreferences.map(p => `Q: ${p.questionText}\nUser Preference: ${p.selectedOption}`).join('\n\n');

  const depthInstructions: Record<string, string> = {
    'Shallow': 'Strictly broad categories. Avoid nesting deeper than 2 levels. Consolidate small folders.',
    'Balanced': 'Create a standard logical hierarchy. Group related items. Nesting up to 3-4 levels is acceptable.',
    'Deep': 'Highly granular structure. Create specific sub-folders for every niche. Nesting up to 5-6 levels is encouraged.'
  };

  const selectedInstruction = depthInstructions[treeDepth] || depthInstructions['Balanced'];

  const prompt = `
    Analyze the provided "Datatable" of bookmarks.
    Organize these into a logical, recursive, nested folder tree structure.
    
    USER PREFERENCES (STRICTLY FOLLOW THESE):
    ${prefString}
    
    STRUCTURAL MANDATE (Depth: ${treeDepth}):
    ${selectedInstruction}
    
    GENERAL RULES:
    1. Use the "Description" field to understand context.
    2. Return a JSON object where keys are folder names and values are EITHER arrays of IDs (leaf nodes) OR sub-objects (subfolders).
    3. You MUST include as many IDs from the input as possible.
    
    Output JSON only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: JSON.stringify(payload) + "\n\n" + prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 28000, 
        thinkingConfig: { 
          thinkingBudget: 24000 
        }
      }
    });

    let text = response.text || "";
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
    }
    
    return text ? JSON.parse(text) : { "Unsorted": payload.map(p => p.id) };

  } catch (error) {
    console.error("Gemini Organization Error:", error);
    return { "Restored": payload.map(p => p.id) };
  }
};

export const suggestFolderName = async (items: BookmarkNode[]): Promise<string> => {
  const ai = getAiClient();
  const summary = items.map(i => `${i.title} (${i.url})`).join('\n');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a short, concise folder name (max 3 words) that best describes this group of bookmarks:\n\n${summary}`,
      config: {
        maxOutputTokens: 20
      }
    });
    return response.text?.trim().replace(/^"|"$/g, '') || "New Folder";
  } catch (e) {
    return "New Group";
  }
};

export const optimizeTitles = async (items: BookmarkNode[]): Promise<Map<string, string>> => {
  const ai = getAiClient();
  const payload = items.map(i => ({ id: i.id, url: i.url, currentTitle: i.title }));
  
  const prompt = `
    You are a bookmark title optimizer.
    For each bookmark provided, analyze the URL and current title.
    Goal: Replace cryptic, generic, or messy titles (e.g. "Index of /", "Home", "Welcome", filenames) with clear, descriptive, human-readable titles.
    If the current title is already good, keep it similar but cleaned up.
    
    Input JSON: [{id, url, currentTitle}]
    Output JSON Schema: { "results": [ { "id": "string", "newTitle": "string" } ] }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: JSON.stringify(payload) + "\n\n" + prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse(response.text || "{}");
    const map = new Map<string, string>();
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach((r: any) => map.set(r.id, r.newTitle));
    }
    return map;
  } catch (e) {
    console.error("Title Optimization Error", e);
    return new Map();
  }
};

// NEW: Agent Command Parser
export interface AgentCommand {
  action: 'MOVE' | 'DELETE' | 'CREATE_FOLDER' | 'RENAME' | 'UNKNOWN';
  targetName?: string;
  filter?: {
    keyword?: string;
    type?: 'folder' | 'link' | 'all';
  };
  reason?: string;
}

export const parseAgentCommand = async (command: string): Promise<AgentCommand> => {
  const ai = getAiClient();
  
  const prompt = `
    You are a command parser for a bookmark manager.
    User Command: "${command}"
    
    Supported Actions:
    1. MOVE: Move items matching a keyword to a specific folder.
    2. DELETE: Delete items matching a keyword.
    3. CREATE_FOLDER: Create a new folder.
    4. RENAME: Rename an item (uncommon via bulk, but supported).
    
    Output JSON Schema:
    {
      "action": "MOVE" | "DELETE" | "CREATE_FOLDER" | "UNKNOWN",
      "targetName": "string (Folder name to move to or create)",
      "filter": {
        "keyword": "string (What to search for to select items)",
        "type": "link" | "folder" | "all"
      },
      "reason": "Short explanation of your plan"
    }
    
    Example: "Move all youtube videos to Video folder"
    Result: { "action": "MOVE", "targetName": "Video", "filter": { "keyword": "youtube", "type": "link" } }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as AgentCommand;
  } catch (e) {
    console.error("Agent Parsing Error", e);
    return { action: 'UNKNOWN', reason: "Failed to parse command." };
  }
};