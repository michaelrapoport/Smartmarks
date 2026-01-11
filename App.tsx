import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, BookmarkNode, BookmarkType, SortOption, QuizQuestion, QuizAnswer } from './types';
import { parseBookmarks, serializeBookmarks, cleanUrl, deduplicateNodes, mergeSpecificFolders, flattenNodes } from './services/bookmarkParser';
import { organizeBookmarksWithGemini, suggestFolderName, optimizeTitles, enrichBookmarks, generateUserPreferencesQuiz, generatePeriodicQuestion, parseAgentCommand } from './services/geminiService';
import { Button } from './components/Button';
import { Radar } from './components/Radar';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { FileGrid } from './components/FileGrid';
import { MetadataModal } from './components/MetadataModal';
import { StructureWizard } from './components/StructureWizard';
import { SettingsModal } from './components/SettingsModal';
import { MoveModal } from './components/MoveModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { QuizModal } from './components/QuizModal';
import { LogWindow } from './components/LogWindow';
import { ContextMenu } from './components/ContextMenu';
import { AgentBar } from './components/AgentBar';
import { UploadCloud, CheckCircle, Activity, LayoutGrid, AlertCircle, Settings } from 'lucide-react';

const COOKIE_NAME = 'smartmark_quiz_answers';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UPLOAD);
  
  // Data State
  const [rootNodes, setRootNodes] = useState<BookmarkNode[]>([]);
  // Staging area for AI results before confirmation
  const [proposedNodes, setProposedNodes] = useState<BookmarkNode[]>([]);
  const [backupNodes, setBackupNodes] = useState<BookmarkNode[]>([]);
  
  const [activeFolderId, setActiveFolderId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  
  // Logging State
  const [logs, setLogs] = useState<string[]>([]);
  
  // Logic Refs
  const enrichmentCompleteRef = useRef(false);
  const quizQuestionsRef = useRef<QuizQuestion[]>([]); // Ref to track questions for logic outside render

  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('type');
  const [modalNode, setModalNode] = useState<BookmarkNode | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [suppressDeleteWarning, setSuppressDeleteWarning] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string>('');
  const [progress, setProgress] = useState(0);

  // Configuration State
  const [concurrency, setConcurrency] = useState(10);
  const [aiBatchSize, setAiBatchSize] = useState(2000); // Increased batch size
  const [treeDepth, setTreeDepth] = useState<string>('Balanced');

  // New: Agent & Context Menu
  const [isAgentProcessing, setIsAgentProcessing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: BookmarkNode } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // Persistence Helpers (Cookie)
  // --------------------------------------------------------------------------
  
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
  };

  const setCookie = (name: string, value: string, days: number) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
  };

  useEffect(() => {
    // Load quiz answers on mount
    const saved = getCookie(COOKIE_NAME);
    if (saved) {
      try {
        const parsed = JSON.parse(decodeURIComponent(saved));
        setQuizAnswers(parsed);
        console.log("Loaded persisted quiz answers:", parsed);
      } catch (e) {
        console.error("Failed to load cookie");
      }
    }
  }, []);

  const saveQuizAnswers = (answers: QuizAnswer[]) => {
    setQuizAnswers(answers);
    // Simple compression/encoding
    setCookie(COOKIE_NAME, encodeURIComponent(JSON.stringify(answers)), 30);
  };

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  const addLog = (msg: string) => {
    setLogs(prev => {
      const newLogs = [...prev, msg];
      if (newLogs.length > 50) return newLogs.slice(newLogs.length - 50); // Keep last 50
      return newLogs;
    });
  };

  const findNode = (id: string, nodes: BookmarkNode[]): BookmarkNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(id, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const getActiveFolderChildren = () => {
    if (!activeFolderId) return [];
    const folder = findNode(activeFolderId, rootNodes);
    return folder?.children || [];
  };

  const removeNodeRecursive = (id: string, nodes: BookmarkNode[]): BookmarkNode[] => {
    return nodes.filter(node => {
      if (node.id === id) return false;
      if (node.children) {
        node.children = removeNodeRecursive(id, node.children);
      }
      return true;
    });
  };

  const updateNodeRecursive = (nodes: BookmarkNode[], updateFn: (node: BookmarkNode) => BookmarkNode): BookmarkNode[] => {
    return nodes.map(node => {
      let updatedNode = updateFn(node);
      if (updatedNode.children) {
        updatedNode = {
          ...updatedNode,
          children: updateNodeRecursive(updatedNode.children, updateFn)
        };
      }
      return updatedNode;
    });
  };

  // Sorting Logic
  const sortedItems = useMemo(() => {
    const items = [...getActiveFolderChildren()];
    return items.sort((a, b) => {
      // Always put folders first if sorting by type, or as a secondary sort
      if (sortOption === 'type') {
        if (a.type !== b.type) {
           return a.type === BookmarkType.FOLDER ? -1 : 1;
        }
        return a.title.localeCompare(b.title);
      } else if (sortOption === 'name') {
        return a.title.localeCompare(b.title);
      } else if (sortOption === 'date') {
        const dateA = parseInt(a.addDate || '0');
        const dateB = parseInt(b.addDate || '0');
        return dateB - dateA; // Newest first
      }
      return 0;
    });
  }, [rootNodes, activeFolderId, sortOption]);

  const hasSelectedFolders = useMemo(() => {
    const children = getActiveFolderChildren();
    return children.some(c => c.type === BookmarkType.FOLDER && selectedIds.has(c.id));
  }, [selectedIds, activeFolderId, rootNodes]);

  // --------------------------------------------------------------------------
  // New Logic: Drag and Drop
  // --------------------------------------------------------------------------
  
  const handleMoveNode = (nodeId: string, targetFolderId: string) => {
     if (nodeId === targetFolderId) return;

     // Cycle prevention
     const sourceNode = findNode(nodeId, rootNodes);
     const targetNode = findNode(targetFolderId, rootNodes);

     if (!sourceNode || !targetNode) return;
     
     // Recursively check if target is a child of source
     const isDescendant = (parent: BookmarkNode, targetId: string): boolean => {
        if (parent.children) {
          return parent.children.some(c => c.id === targetId || isDescendant(c, targetId));
        }
        return false;
     };

     if (sourceNode.type === BookmarkType.FOLDER && isDescendant(sourceNode, targetFolderId)) {
       addLog("Error: Cannot move a folder into its own child.");
       return;
     }

     // Remove from old
     let newRoot = removeNodeRecursive(nodeId, rootNodes);
     
     // Add to new
     const newTarget = findNode(targetFolderId, newRoot);
     if (newTarget && newTarget.children) {
       newTarget.children.push(sourceNode);
       setRootNodes([...newRoot]);
       addLog(`Moved "${sourceNode.title}" to "${newTarget.title}"`);
     }
  };

  // --------------------------------------------------------------------------
  // New Logic: Agent
  // --------------------------------------------------------------------------

  const handleAgentCommand = async (command: string) => {
    setIsAgentProcessing(true);
    addLog(`Agent: Processing command: "${command}"`);
    
    try {
      const plan = await parseAgentCommand(command);
      
      if (plan.action === 'UNKNOWN') {
        addLog(`Agent Error: ${plan.reason || "I didn't understand that."}`);
        setIsAgentProcessing(false);
        return;
      }

      // Execute Plan
      let modifiedNodes = [...rootNodes];
      let affectedCount = 0;

      // Helper to match filter
      const matchesFilter = (node: BookmarkNode) => {
        if (!plan.filter?.keyword) return false;
        const kw = plan.filter.keyword.toLowerCase();
        const textMatch = node.title.toLowerCase().includes(kw) || (node.url && node.url.toLowerCase().includes(kw));
        
        if (!textMatch) return false;
        
        if (plan.filter.type === 'link' && node.type !== BookmarkType.LINK) return false;
        if (plan.filter.type === 'folder' && node.type !== BookmarkType.FOLDER) return false;
        
        return true;
      };

      if (plan.action === 'CREATE_FOLDER') {
        // Create in root or active folder
        const parentId = activeFolderId || rootNodes[0]?.id; // Default to first root if no active
        const parent = findNode(parentId, modifiedNodes);
        if (parent && parent.children) {
           parent.children.unshift({
             id: crypto.randomUUID(),
             type: BookmarkType.FOLDER,
             title: plan.targetName || "New Folder",
             children: [],
             status: 'active'
           });
           addLog(`Agent: Created folder "${plan.targetName}"`);
        }
      } 
      else if (plan.action === 'DELETE') {
         // Gather IDs to delete
         const idsToDelete: string[] = [];
         const traverse = (list: BookmarkNode[]) => {
           list.forEach(n => {
             if (matchesFilter(n)) idsToDelete.push(n.id);
             if (n.children) traverse(n.children);
           });
         };
         traverse(modifiedNodes);
         
         idsToDelete.forEach(id => {
           modifiedNodes = removeNodeRecursive(id, modifiedNodes);
         });
         affectedCount = idsToDelete.length;
         addLog(`Agent: Deleted ${affectedCount} items matching "${plan.filter?.keyword}"`);
      }
      else if (plan.action === 'MOVE') {
         if (!plan.targetName) return;
         
         // 1. Find or Create Target Folder
         let targetId = '';
         
         // Search existing
         const findTarget = (list: BookmarkNode[]) => {
            for(const n of list) {
              if (n.type === BookmarkType.FOLDER && n.title.toLowerCase() === plan.targetName?.toLowerCase()) {
                targetId = n.id;
                return;
              }
              if (n.children) findTarget(n.children);
            }
         };
         findTarget(modifiedNodes);

         if (!targetId) {
            // Create it at root level for simplicity if not found
            const newFolder = {
               id: crypto.randomUUID(),
               type: BookmarkType.FOLDER,
               title: plan.targetName,
               children: [],
               status: 'active' as const
            };
            modifiedNodes.unshift(newFolder);
            targetId = newFolder.id;
            addLog(`Agent: Created target folder "${plan.targetName}"`);
         }

         // 2. Find Items to Move
         const nodesToMove: BookmarkNode[] = [];
         const collectMoves = (list: BookmarkNode[]) => {
            list.forEach(n => {
               if (n.id !== targetId && matchesFilter(n)) {
                 nodesToMove.push({ ...n });
               }
               if (n.children) collectMoves(n.children);
            });
         };
         collectMoves(modifiedNodes);
         
         if (nodesToMove.length > 0) {
           // 3. Remove old
           nodesToMove.forEach(n => {
             modifiedNodes = removeNodeRecursive(n.id, modifiedNodes);
           });
           
           // 4. Add to target
           const targetNode = findNode(targetId, modifiedNodes);
           if (targetNode && targetNode.children) {
             targetNode.children.push(...nodesToMove);
           }
           addLog(`Agent: Moved ${nodesToMove.length} items to "${plan.targetName}"`);
         } else {
           addLog(`Agent: No items found matching "${plan.filter?.keyword}"`);
         }
      }

      setRootNodes(modifiedNodes);

    } catch (e) {
      addLog("Agent: An error occurred while executing the plan.");
    } finally {
      setIsAgentProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // New Logic: Context Menu
  // --------------------------------------------------------------------------

  const handleContextMenu = (e: React.MouseEvent, node: BookmarkNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        setLogs([]);
        addLog("Initiating file parser sequence...");
        // 1. Parse
        const rawNodes = parseBookmarks(content);
        addLog(`Parsed ${rawNodes.length} root elements.`);
        
        // 2. Initial Deduplicate (Fast)
        const { uniqueNodes, duplicatesRemoved } = deduplicateNodes(rawNodes);
        console.log(`Deep cleaning: Removed ${duplicatesRemoved} duplicates recursively.`);
        addLog(`Initial clean: Pruned ${duplicatesRemoved} obvious duplicates.`);

        // 3. Move to Liveness Check
        setRootNodes(uniqueNodes);
        setState(AppState.LIVENESS_CHECK);
        performLivenessCheck(uniqueNodes);

      } catch (err) {
        alert("Failed to parse bookmark file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const performLivenessCheck = async (nodes: BookmarkNode[]) => {
    setLoadingMsg(`Deep scanning for dead links (Concurrency: ${concurrency})...`);
    addLog(`Starting Liveness Protocol. Concurrency Level: ${concurrency}`);
    
    // Flatten to find all links recursively
    const flat: BookmarkNode[] = [];
    const collect = (list: BookmarkNode[]) => {
      list.forEach(n => {
        if (n.type === BookmarkType.LINK) flat.push(n);
        if (n.children) collect(n.children);
      });
    };
    collect(nodes);

    const total = flat.length;
    let completed = 0;

    const checkBatch = async (batch: BookmarkNode[]) => {
       await Promise.all(batch.map(async (node) => {
         if (!node.url) return;
         node.status = 'checking';
         try {
           // We can't easily get status codes with no-cors, but failure usually means network error or blocked
           await fetch(node.url, { mode: 'no-cors', signal: AbortSignal.timeout(2000) });
           node.status = 'active'; 
         } catch (e) {
           node.status = 'dead'; 
           addLog(`Dead Link Detected: ${node.title} (${node.url?.substring(0, 20)}...)`);
         }
       }));
    };

    // Process in chunks determined by concurrency setting
    const chunkSize = Math.max(1, concurrency);
    for (let i = 0; i < flat.length; i += chunkSize) {
      await checkBatch(flat.slice(i, i + chunkSize));
      completed += Math.min(chunkSize, flat.length - i);
      setProgress(Math.min((completed / total) * 100, 100));
      // Force re-render 
      await new Promise(r => setTimeout(r, 20)); 
    }
    
    addLog("Liveness Protocol concluded.");
    
    // --- POST LIVENESS CLEANUP ---
    
    // 1. Merge "Imported" Folders
    addLog("Topology: Scanning for 'Imported/Other' bookmark containers to dissolve...");
    const mergedNodes = mergeSpecificFolders(nodes);
    addLog("Topology: 'Imported' containers merged into main structure.");
    
    // 2. Second Pass Deduplication (Catch duplicates revealed by merge)
    addLog("Sanitization: Re-scanning for duplicate links post-merge...");
    const { uniqueNodes: finalNodes, duplicatesRemoved } = deduplicateNodes(mergedNodes);
    if (duplicatesRemoved > 0) {
      addLog(`Sanitization: Identified and removed ${duplicatesRemoved} additional duplicates.`);
    } else {
      addLog("Sanitization: No additional duplicates found.");
    }
    
    setRootNodes(finalNodes); // Update state with clean nodes
    
    // Proceed to AI
    startAiOrganization(finalNodes);
  };

  const startAiOrganization = async (nodes: BookmarkNode[]) => {
    setBackupNodes(JSON.parse(JSON.stringify(nodes))); // Deep copy for backup
    
    // Phase 1: Enrichment (Normalization)
    setState(AppState.AI_ENRICHMENT);
    setLoadingMsg("Initializing Swarm Agents...");
    addLog("Initializing Swarm Intelligence for content enrichment...");
    setProgress(0);
    setQuizCompleted(false);
    // Don't reset quiz answers if we have them from cookie, only questions
    setQuizQuestions([]);
    quizQuestionsRef.current = [];
    enrichmentCompleteRef.current = false;

    // ----------------------------------------------------
    // ASYNC TASK 1: Initial Quiz Agent (Non-Blocking)
    // ----------------------------------------------------
    (async () => {
      try {
        addLog("Preference Agent: Analyzing current topology for profiling...");
        const questions = await generateUserPreferencesQuiz(nodes);
        if (!enrichmentCompleteRef.current && questions.length > 0) {
          addLog("Preference Agent: Generated initial profile questionnaire.");
          setQuizQuestions(q => [...q, ...questions]);
          quizQuestionsRef.current = [...quizQuestionsRef.current, ...questions];
          setIsQuizOpen(true);
        }
      } catch (e) {
        console.error("Quiz failed", e);
      }
    })();

    // ----------------------------------------------------
    // ASYNC TASK 2: Swarm Enrichment Loop (Main Thread)
    // ----------------------------------------------------
    
    // Recursively collect all links
    const allLinks: BookmarkNode[] = [];
    const collectLinks = (list: BookmarkNode[]) => {
      list.forEach(n => {
        if (n.type === BookmarkType.LINK) allLinks.push(n);
        if (n.children) collectLinks(n.children);
      });
    };
    collectLinks(nodes);

    // Swarm Configuration
    const swarmSize = 4; // 4 Concurrent agents
    const batchSize = 25; // Smaller batch size per agent for responsiveness
    let processedCount = 0;
    
    // Insight tracking
    let itemsSinceLastInsight = 0;
    const INSIGHT_THRESHOLD = 60; // Check for insight every ~60 items

    // Worker Function
    const processBatch = async (batch: BookmarkNode[], workerId: number) => {
      // Call Gemini Flash
      // addLog(`Swarm Agent ${workerId}: Fetching metadata for ${batch.length} nodes...`);
      const enrichedMap = await enrichBookmarks(batch);
      
      // Update nodes in-place
      let enrichedCount = 0;
      batch.forEach(node => {
        const info = enrichedMap.get(node.id);
        if (info) {
          node.title = info.title;
          node.metaDescription = info.description;
          enrichedCount++;
        }
      });
      
      addLog(`Swarm Agent ${workerId}: Enriched ${enrichedCount} nodes. Sample: "${batch[0]?.title}"`);

      processedCount += batch.length;
      itemsSinceLastInsight += batch.length;

      // Check if we should generate a periodic question
      if (itemsSinceLastInsight >= INSIGHT_THRESHOLD) {
        itemsSinceLastInsight = 0;
        addLog("Insight Agent: Detecting organizational ambiguity in recent batch...");
        // Fire and forget insight generation - non blocking for the worker
        generatePeriodicQuestion(batch, quizQuestionsRef.current.map(q => q.question))
          .then(newQuestion => {
            if (newQuestion && !enrichmentCompleteRef.current) {
              addLog("Insight Agent: Ambiguity detected. Dynamic question generated.");
              setQuizQuestions(prev => {
                const next = [...prev, newQuestion];
                quizQuestionsRef.current = next;
                return next;
              });
              setIsQuizOpen(true);
            } else {
               // addLog("Insight Agent: No new ambiguities found.");
            }
          });
      }

      // Update UI Progress
      const p = Math.min((processedCount / allLinks.length) * 100, 100);
      setProgress(p);
      setLoadingMsg(`Swarm Active: ${Math.min(processedCount, allLinks.length)} / ${allLinks.length} links enriched...`);
    };

    // Queue Management
    const batches = [];
    for (let i = 0; i < allLinks.length; i += batchSize) {
      batches.push(allLinks.slice(i, i + batchSize));
    }

    addLog(`Swarm Controller: Dispatching ${batches.length} batches to ${swarmSize} concurrent agents.`);

    // Process batches with limited concurrency
    const runSwarm = async () => {
       const executing: Promise<void>[] = [];
       for (const batch of batches) {
          // Assign a faux worker ID based on current slot
          const workerId = executing.length + 1;
          const p = processBatch(batch, workerId);
          executing.push(p);
          if (executing.length >= swarmSize) {
             await Promise.race(executing);
          }
           p.then(() => {
              const idx = executing.indexOf(p);
              if (idx > -1) executing.splice(idx, 1);
           });
       }
       await Promise.all(executing);
    };

    await runSwarm();
    addLog("Enrichment Phase Complete. All nodes contain metadata.");

    // ----------------------------------------------------
    // SYNCHRONIZATION: Force close Quiz if it's still open
    // ----------------------------------------------------
    enrichmentCompleteRef.current = true;
    if (isQuizOpen) {
      // Quiz was still open, close it and proceed with whatever partial answers we have
      setIsQuizOpen(false);
    }

    // Phase 2: Organization (Structure)
    setState(AppState.AI_ANALYSIS);
    setLoadingMsg(`Gemini 3 Flash is analyzing metadata to architect tree...`);
    addLog("Handing off context to Gemini 3 Flash Architect...");
    setProgress(0);

    // Use current quizAnswers state (which is updated incrementally)
    addLog(`Architect: Compiling user preferences and topological constraints. Depth Mode: ${treeDepth}`);
    
    try {
      // NOTE: Using aiBatchSize to potentially limit items sent, but usually we try to send as many as possible
      const structure = await organizeBookmarksWithGemini(nodes, aiBatchSize, quizAnswers, treeDepth);
      addLog("Architect: Structural blueprint generated.");
      
      const flatten = (list: BookmarkNode[]) => {
        let map = new Map<string, BookmarkNode>();
        const traverse = (items: BookmarkNode[]) => {
          items.forEach(i => {
            map.set(i.id, i);
            if (i.children) traverse(i.children);
          });
        }
        traverse(list);
        return map;
      };
      
      const nodeMap = flatten(nodes);
      const usedIds = new Set<string>();

      addLog("System: Materializing new folder hierarchy...");
      
      // Recursive builder that also tracks which IDs were used
      const processLevel = (obj: any): BookmarkNode[] => {
        const levelNodes: BookmarkNode[] = [];
        Object.entries(obj).forEach(([key, val]) => {
           if (Array.isArray(val)) {
             const items = val.map((id: any) => {
               const n = nodeMap.get(id as string);
               if (n) usedIds.add(n.id);
               return n;
             }).filter(Boolean) as BookmarkNode[];
             
             if (items.length > 0) {
               levelNodes.push({
                 id: crypto.randomUUID(),
                 type: BookmarkType.FOLDER,
                 title: key,
                 children: items,
                 status: 'active'
               });
             }
           } else if (typeof val === 'object') {
             const subChildren = processLevel(val);
             levelNodes.push({
               id: crypto.randomUUID(),
               type: BookmarkType.FOLDER,
               title: key,
               children: subChildren,
               status: 'active'
             });
           }
        });
        return levelNodes;
      };

      const structuredNodes = processLevel(structure);
      
      // --- SAFEGUARD: RECONCILE MISSING LINKS ---
      addLog("System: Verifying data integrity...");
      const missingNodes: BookmarkNode[] = [];
      allLinks.forEach(link => {
        if (!usedIds.has(link.id)) {
          missingNodes.push(link);
        }
      });

      if (missingNodes.length > 0) {
        addLog(`System: Detected ${missingNodes.length} orphan links excluded by Architect. Recovering...`);
        structuredNodes.push({
          id: crypto.randomUUID(),
          type: BookmarkType.FOLDER,
          title: "Unsorted & Recovered",
          children: missingNodes,
          status: 'active'
        });
      } else {
        addLog("System: Integrity Check Passed. 100% data preservation.");
      }

      setProposedNodes(structuredNodes);
      addLog("Transitioning to Review Phase.");
      setState(AppState.WIZARD_REVIEW);

    } catch (e) {
      console.error("Critical AI Failure", e);
      addLog("Error: Architect failure. Reverting to safe backup.");
      setProposedNodes(nodes);
      setState(AppState.WIZARD_REVIEW);
    }
  };

  const handleQuizUpdate = (answers: QuizAnswer[]) => {
    saveQuizAnswers(answers);
  };

  const handleQuizComplete = (answers: QuizAnswer[]) => {
    saveQuizAnswers(answers);
    setIsQuizOpen(false);
    setQuizCompleted(true);
  };

  const handleQuizSkip = () => {
    setIsQuizOpen(false);
    setQuizCompleted(true);
  };

  const handleWizardConfirm = (selectedFolderIds: Set<string>) => {
    // Flatten logic: If a folder is NOT in selectedFolderIds, we lift its children up
    const processNodes = (nodes: BookmarkNode[]): BookmarkNode[] => {
      let result: BookmarkNode[] = [];
      
      nodes.forEach(node => {
        if (node.type === BookmarkType.FOLDER) {
          if (selectedFolderIds.has(node.id)) {
            // Keep this folder, process its children
            const newChildren = processNodes(node.children || []);
            // Only keep folder if it has children after processing? Or keep empty? Let's keep empty if user selected it.
            result.push({ ...node, children: newChildren });
          } else {
            // Dissolve this folder, lift children
            if (node.children) {
              const lifted = processNodes(node.children);
              result = result.concat(lifted);
            }
          }
        } else {
          // Links are always kept
          result.push(node);
        }
      });
      
      return result;
    };

    const finalNodes = processNodes(proposedNodes);
    setRootNodes(finalNodes);
    if(finalNodes.length > 0) setActiveFolderId(finalNodes[0].id);
    setState(AppState.MANAGER);
    // Log window stays open as requested
    addLog("Structure finalized. Manager Active.");
  };

  const handleWizardCancel = () => {
    // Restore backup
    setRootNodes(backupNodes);
    if(backupNodes.length > 0) setActiveFolderId(backupNodes[0].id);
    setState(AppState.MANAGER);
    addLog("Changes discarded. Restored original topology.");
  };


  // --------------------------------------------------------------------------
  // Dashboard Handlers
  // --------------------------------------------------------------------------

  const handleToggleSelect = (id: string, multi: boolean) => {
    const newSet = new Set(multi ? selectedIds : []);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleOpenNode = (node: BookmarkNode) => {
    if (node.type === BookmarkType.FOLDER) {
      setActiveFolderId(node.id);
      setSelectedIds(new Set()); // Clear selection on navigate
    } else {
      setModalNode(node);
    }
  };

  const handleAutoGroup = async () => {
    if (selectedIds.size < 2) return;
    
    // Find actual nodes
    const children = getActiveFolderChildren();
    const selectedNodes = children.filter(c => selectedIds.has(c.id));
    
    setLoadingMsg("Gemini 3 Pro is brainstorming a group name...");
    const name = await suggestFolderName(selectedNodes);
    
    const parent = findNode(activeFolderId, rootNodes);
    if (parent && parent.children) {
      const newFolder: BookmarkNode = {
        id: crypto.randomUUID(),
        type: BookmarkType.FOLDER,
        title: name,
        children: selectedNodes,
        status: 'active'
      };
      
      parent.children = parent.children.filter(c => !selectedIds.has(c.id));
      parent.children.unshift(newFolder);
      
      setRootNodes([...rootNodes]); 
      setSelectedIds(new Set());
    }
    setLoadingMsg("");
  };

  const handleSmartRename = async () => {
    const children = getActiveFolderChildren();
    const selectedNodes = children.filter(c => selectedIds.has(c.id) && c.type === BookmarkType.LINK);
    if (selectedNodes.length === 0) return;

    addLog(`Optimization: Sending ${selectedNodes.length} titles to Gemini 2.5 Flash...`);
    setLoadingMsg(`Optimizing ${selectedNodes.length} titles...`);
    const newTitlesMap = await optimizeTitles(selectedNodes);
    
    let changedCount = 0;
    selectedNodes.forEach(node => {
      if (newTitlesMap.has(node.id)) {
        const newTitle = newTitlesMap.get(node.id)!;
        if (newTitle !== node.title) {
          node.title = newTitle;
          node.metaDescription = "Title optimized by Gemini 2.5 Flash";
          changedCount++;
        }
      }
    });
    
    setRootNodes([...rootNodes]);
    setLoadingMsg("");
    addLog(`Optimization: Updated ${changedCount} titles.`);
  };

  // Bulk Actions
  const handleBulkTag = () => {
    const tag = window.prompt("Enter tag name:");
    if (!tag) return;

    const newNodes = updateNodeRecursive(rootNodes, (node) => {
      if (selectedIds.has(node.id)) {
        const tags = node.tags || [];
        if (!tags.includes(tag)) {
          return { ...node, tags: [...tags, tag] };
        }
      }
      return node;
    });

    setRootNodes(newNodes);
    setSelectedIds(new Set());
  };

  const handleBulkMarkDead = () => {
    if (!window.confirm(`Mark ${selectedIds.size} items as Dead?`)) return;

    const newNodes = updateNodeRecursive(rootNodes, (node) => {
      if (selectedIds.has(node.id) && node.type === BookmarkType.LINK) {
        return { ...node, status: 'dead' };
      }
      return node;
    });

    setRootNodes(newNodes);
    setSelectedIds(new Set());
  };

  const handleBulkMoveConfirm = (targetFolderId: string) => {
    if (!targetFolderId) return;

    // 1. Collect nodes to move (make deep copies)
    const nodesToMove: BookmarkNode[] = [];
    const collectNodes = (list: BookmarkNode[]) => {
      list.forEach(node => {
        if (selectedIds.has(node.id)) {
           nodesToMove.push({ ...node }); // Shallow copy sufficient for logic, children handled if folder
        }
        if (node.children) collectNodes(node.children);
      });
    };
    collectNodes(rootNodes);

    // 2. Remove from old locations
    let newRoot = rootNodes;
    selectedIds.forEach(id => {
      newRoot = removeNodeRecursive(id, newRoot);
    });

    // 3. Add to new target
    const targetFolder = findNode(targetFolderId, newRoot);
    if (targetFolder && targetFolder.children) {
      targetFolder.children.push(...nodesToMove);
      setRootNodes([...newRoot]); // Force update
      setSelectedIds(new Set());
      setIsMoveModalOpen(false);
    } else {
      alert("Target folder not found.");
    }
  };

  const handleDeleteSelected = () => {
    const parent = findNode(activeFolderId, rootNodes);
    if (parent && parent.children) {
      parent.children = parent.children.filter(c => !selectedIds.has(c.id));
      setRootNodes([...rootNodes]);
      setSelectedIds(new Set());
    }
  };

  // New: Folder Deletion with Confirmation Logic
  const handleDeleteFolderButton = () => {
    // Check if any selected items are non-empty folders
    const children = getActiveFolderChildren();
    const nonEmptyFolders = children.filter(c => 
      selectedIds.has(c.id) && 
      c.type === BookmarkType.FOLDER && 
      c.children && 
      c.children.length > 0
    );

    if (nonEmptyFolders.length > 0 && !suppressDeleteWarning) {
      setIsDeleteModalOpen(true);
    } else {
      // Safe to delete immediately
      performDelete();
    }
  };

  const performDelete = () => {
    let newRoot = rootNodes;
    selectedIds.forEach(id => {
       newRoot = removeNodeRecursive(id, newRoot);
    });
    setRootNodes([...newRoot]);
    setSelectedIds(new Set());
    setIsDeleteModalOpen(false);
  };

  const handleDeleteConfirm = (suppress: boolean) => {
    if (suppress) setSuppressDeleteWarning(true);
    performDelete();
  };

  const handleDeleteItem = (id: string) => {
     // Recursive delete from root (safest)
     const newRoot = removeNodeRecursive(id, rootNodes);
     setRootNodes([...newRoot]);
     if (selectedIds.has(id)) {
       const newSel = new Set(selectedIds);
       newSel.delete(id);
       setSelectedIds(newSel);
     }
  };
  
  const handleAddFolder = () => {
    const parent = findNode(activeFolderId, rootNodes);
    if (parent && parent.children) {
      parent.children.unshift({
        id: crypto.randomUUID(),
        type: BookmarkType.FOLDER,
        title: "New Folder",
        children: [],
        status: 'active'
      });
      setRootNodes([...rootNodes]);
    }
  };

  const handleAddBookmark = () => {
    const parent = findNode(activeFolderId, rootNodes);
    if (parent && parent.children) {
      parent.children.unshift({
        id: crypto.randomUUID(),
        type: BookmarkType.LINK,
        title: "New Bookmark",
        url: "https://example.com",
        status: 'unchecked',
        addDate: Date.now().toString()
      });
      setRootNodes([...rootNodes]);
    }
  };

  const handleDeduplicate = () => {
    setLoadingMsg("Removing duplicates...");
    setTimeout(() => {
      const { uniqueNodes, duplicatesRemoved } = deduplicateNodes(rootNodes);
      setRootNodes(uniqueNodes);
      setLoadingMsg("");
      alert(`Deduplication complete. Removed ${duplicatesRemoved} duplicate links.`);
    }, 100);
  };

  const handleExport = () => {
    const html = serializeBookmarks(rootNodes);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartmark_v2_organized.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  // Shared hidden input
  const FileInput = () => (
    <input type="file" ref={fileInputRef} className="hidden" accept=".html" onChange={handleFileUpload} />
  );

  return (
    <div className="h-screen bg-slate-900 flex flex-col text-slate-200 overflow-hidden relative">
      <FileInput />
      
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu 
          position={contextMenu} 
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onRename={(node) => {
             const newName = prompt("Rename to:", node.title);
             if (newName) {
               node.title = newName;
               setRootNodes([...rootNodes]);
             }
          }}
          onDelete={(id) => handleDeleteItem(id)}
          onInfo={(node) => setModalNode(node)}
          onMove={(node) => {
            setSelectedIds(new Set([node.id]));
            setIsMoveModalOpen(true);
          }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          concurrency={concurrency}
          setConcurrency={setConcurrency}
          batchSize={aiBatchSize}
          setBatchSize={setAiBatchSize}
          treeDepth={treeDepth}
          setTreeDepth={setTreeDepth}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Move Modal */}
      {isMoveModalOpen && (
        <MoveModal 
          rootNodes={rootNodes}
          selectedIds={selectedIds}
          onClose={() => setIsMoveModalOpen(false)}
          onConfirm={handleBulkMoveConfirm}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
         <DeleteConfirmModal 
           count={selectedIds.size}
           onCancel={() => setIsDeleteModalOpen(false)}
           onConfirm={handleDeleteConfirm}
         />
      )}
      
      {/* Quiz Modal */}
      {isQuizOpen && (
        <QuizModal 
          questions={quizQuestions} 
          onComplete={handleQuizComplete}
          onUpdate={handleQuizUpdate}
          onSkip={handleQuizSkip}
        />
      )}

      {/* Log Window - visible during all states except UPLOAD */}
      {state !== AppState.UPLOAD && (
        <LogWindow logs={logs} />
      )}

      {/* Agent Bar - Visible in Manager */}
      {state === AppState.MANAGER && (
        <AgentBar onCommand={handleAgentCommand} isProcessing={isAgentProcessing} />
      )}

      {/* Upload Screen */}
      {state === AppState.UPLOAD && (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 w-full absolute inset-0 z-50">
           <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700"
              >
                <Settings size={18} />
                <span>Config</span>
              </button>
           </div>

           <div className="text-center mb-12 max-w-2xl animate-in slide-in-from-bottom-10 fade-in duration-700">
             <div className="flex justify-center mb-6">
               <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                 <Activity className="text-white" size={32} />
               </div>
             </div>
             <h1 className="text-5xl font-bold mb-6 text-white tracking-tight">
               SmartMark <span className="text-blue-400">AI</span>
             </h1>
             <p className="text-lg text-slate-400">
               The intelligent bookmark manager. Upload your chaotic <code className="bg-slate-800 px-2 py-1 rounded text-slate-300">bookmarks.html</code> file 
               and let <strong>Gemini 3 Pro</strong> restructure your digital life.
             </p>
           </div>

           <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xl p-16 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-800/30 hover:bg-slate-800/50 hover:border-blue-500/50 transition-all cursor-pointer group text-center animate-in zoom-in-95 duration-500 delay-200"
            >
              <UploadCloud size={48} className="mx-auto mb-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
              <h3 className="text-2xl font-semibold text-white mb-2">Drag & Drop or Click</h3>
              <p className="text-slate-500">Supports Netscape Bookmark HTML format</p>
            </div>
        </div>
      )}

      {/* Processing States */}
      {(state === AppState.LIVENESS_CHECK || state === AppState.AI_ANALYSIS || state === AppState.AI_ENRICHMENT) && (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center absolute inset-0 z-50">
          <Radar />
          <h2 className="text-2xl font-bold text-white mt-8 mb-2 animate-pulse">
            {state === AppState.LIVENESS_CHECK && "Checking Vital Signs..."}
            {state === AppState.AI_ENRICHMENT && "Sanitizing Index..."}
            {state === AppState.AI_ANALYSIS && "Architecting Structure..."}
          </h2>
          <p className="text-slate-400 mb-8 max-w-md text-center h-6">{loadingMsg}</p>
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {/* Wizard Overlay */}
      {state === AppState.WIZARD_REVIEW && (
        <StructureWizard 
          nodes={proposedNodes}
          originalNodes={rootNodes}
          onConfirm={handleWizardConfirm}
          onCancel={handleWizardCancel}
        />
      )}

      {/* Top Bar */}
      <Toolbar 
        selectedCount={selectedIds.size}
        hasSelectedFolders={hasSelectedFolders}
        onImport={() => fileInputRef.current?.click()}
        onAddFolder={handleAddFolder}
        onAddBookmark={handleAddBookmark}
        onDeleteSelected={handleDeleteSelected}
        onDeleteFolder={handleDeleteFolderButton}
        onDeduplicate={handleDeduplicate}
        onAnalyze={() => startAiOrganization(rootNodes)}
        onAutoGroupName={handleAutoGroup}
        onSmartRename={handleSmartRename}
        onExport={handleExport}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTagSelected={handleBulkTag}
        onMoveSelected={() => setIsMoveModalOpen(true)}
        onMarkDead={handleBulkMarkDead}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortOption={sortOption}
        onSortChange={setSortOption}
      />

      {/* Workspace */}
      <div className="flex-1 flex min-h-0">
        <Sidebar 
          nodes={rootNodes} 
          activeFolderId={activeFolderId} 
          onFolderSelect={setActiveFolderId} 
          onMoveNode={handleMoveNode}
          onContextMenu={handleContextMenu}
        />
        
        <main className="flex-1 bg-slate-900/50 flex flex-col relative">
           {loadingMsg && state === AppState.MANAGER && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-20 text-sm font-medium animate-in slide-in-from-top-4 fade-in">
               {loadingMsg}
             </div>
           )}
           
           <FileGrid 
             items={sortedItems} 
             selectedIds={selectedIds}
             onToggleSelect={handleToggleSelect}
             onOpen={handleOpenNode}
             onDeleteItem={handleDeleteItem}
             viewMode={viewMode}
             onContextMenu={handleContextMenu}
           />
        </main>
      </div>

      <MetadataModal node={modalNode} onClose={() => setModalNode(null)} />
    </div>
  );
};

export default App;