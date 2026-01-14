import { BookmarkNode, BookmarkType } from '../types';

export const parseBookmarks = (htmlContent: string): { nodes: BookmarkNode[], isSmartMarkFile: boolean } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const rootDl = doc.querySelector('dl');
  
  // Check for SmartMark metadata
  const isSmartMarkFile = !!doc.querySelector('meta[name="smartmark-analyzed"]');

  if (!rootDl) {
    throw new Error('Invalid Netscape Bookmark File: No root DL found.');
  }

  const traverse = (element: Element, path: string[] = []): BookmarkNode[] => {
    const nodes: BookmarkNode[] = [];
    
    Array.from(element.children).forEach((child) => {
      if (child.tagName === 'DT') {
        const h3 = child.querySelector('h3');
        const a = child.querySelector('a');
        const dl = child.querySelector('dl');

        if (h3) {
          const title = h3.textContent || 'Untitled Folder';
          const isToolbar = h3.getAttribute('personal_toolbar_folder') === 'true';
          
          const folderNode: BookmarkNode = {
            id: crypto.randomUUID(),
            type: BookmarkType.FOLDER,
            title,
            addDate: h3.getAttribute('add_date') || undefined,
            lastModified: h3.getAttribute('last_modified') || undefined,
            children: dl ? traverse(dl, [...path, title]) : [],
            originalPath: path,
            status: 'active',
            isToolbar
          };
          nodes.push(folderNode);
        } else if (a) {
          const title = a.textContent || 'Untitled Link';
          const url = a.getAttribute('href') || '';
          const linkNode: BookmarkNode = {
            id: crypto.randomUUID(),
            type: BookmarkType.LINK,
            title,
            url,
            addDate: a.getAttribute('add_date') || undefined,
            icon: a.getAttribute('icon') || undefined,
            originalPath: path,
            status: 'unchecked',
            metaDescription: '',
            tags: []
          };
          nodes.push(linkNode);
        }
      }
    });

    return nodes;
  };

  return { nodes: traverse(rootDl), isSmartMarkFile };
};

export const mergeSpecificFolders = (nodes: BookmarkNode[]): BookmarkNode[] => {
  // Folders to dissolve/flatten into their parent
  const TARGET_NAMES = new Set(['other bookmarks', 'imported favorites', 'imported bookmarks', 'from internet explorer']);
  
  const traverse = (list: BookmarkNode[]): BookmarkNode[] => {
    let newList: BookmarkNode[] = [];
    
    for (const node of list) {
       // Recursively process children first (bottom-up approach ensures nested imports are handled)
       if (node.children && node.children.length > 0) {
         node.children = traverse(node.children);
       }

       if (node.type === BookmarkType.FOLDER && TARGET_NAMES.has(node.title.toLowerCase().trim())) {
         // Dissolve this node: Spread its children into the current level
         if (node.children) {
           newList.push(...node.children);
         }
       } else {
         newList.push(node);
       }
    }
    return newList;
  };
  
  return traverse(nodes);
};

export const deduplicateNodes = (nodes: BookmarkNode[]): { uniqueNodes: BookmarkNode[], duplicatesRemoved: number } => {
  // 1. Map normalized URLs to their nodes and "priority"
  // Priority: Toolbar Folder > Standard Folder
  const urlMap = new Map<string, { node: BookmarkNode; isToolbarDescendant: boolean }>();
  let removedCount = 0;

  // Helper to identify if a node is inside a toolbar
  const flattenAndMark = (items: BookmarkNode[], insideToolbar: boolean): { node: BookmarkNode, isToolbarDescendant: boolean }[] => {
    let result: { node: BookmarkNode, isToolbarDescendant: boolean }[] = [];
    items.forEach(node => {
      const isToolbar = insideToolbar || !!node.isToolbar;
      if (node.type === BookmarkType.LINK && node.url) {
        result.push({ node, isToolbarDescendant: isToolbar });
      }
      if (node.children) {
        result.push(...flattenAndMark(node.children, isToolbar));
      }
    });
    return result;
  };

  // 2. Build the map of "winners"
  const flatNodes = flattenAndMark(nodes, false);
  
  flatNodes.forEach(({ node, isToolbarDescendant }) => {
    const url = cleanUrl(node.url || '').replace(/\/$/, '');
    if (!url) return;

    if (urlMap.has(url)) {
      const existing = urlMap.get(url)!;
      // If the new one is toolbar and existing isn't, replace it
      if (isToolbarDescendant && !existing.isToolbarDescendant) {
        urlMap.set(url, { node, isToolbarDescendant });
      }
      // Else, keep existing (first one found usually higher in tree or same priority)
    } else {
      urlMap.set(url, { node, isToolbarDescendant });
    }
  });

  // Set of IDs to keep
  const keepIds = new Set(Array.from(urlMap.values()).map(v => v.node.id));

  // 3. Recursive Filter
  const filterRecursive = (items: BookmarkNode[]): BookmarkNode[] => {
    return items.filter(item => {
      if (item.type === BookmarkType.LINK) {
        if (keepIds.has(item.id)) return true;
        removedCount++;
        return false;
      }
      if (item.type === BookmarkType.FOLDER && item.children) {
        item.children = filterRecursive(item.children);
        return true;
      }
      return true;
    });
  };

  const unique = filterRecursive(nodes);
  return { uniqueNodes: unique, duplicatesRemoved: removedCount };
};

export const serializeBookmarks = (nodes: BookmarkNode[]): string => {
  const indent = (level: number) => '    '.repeat(level);

  const traverse = (items: BookmarkNode[], level: number): string => {
    let html = '';
    items.forEach(node => {
      html += `\n${indent(level)}<DT>`;
      if (node.type === BookmarkType.FOLDER) {
        const toolbarAttr = node.isToolbar ? ' PERSONAL_TOOLBAR_FOLDER="true"' : '';
        html += `<H3 ADD_DATE="${node.addDate || Date.now()}" LAST_MODIFIED="${node.lastModified || Date.now()}"${toolbarAttr}>${escapeHtml(node.title)}</H3>`;
        html += `\n${indent(level)}<DL><p>`;
        if (node.children) {
          html += traverse(node.children, level + 1);
        }
        html += `\n${indent(level)}</DL><p>`;
      } else {
        html += `<A HREF="${node.url}" ADD_DATE="${node.addDate || Date.now()}" ICON="${node.icon || ''}">${escapeHtml(node.title)}</A>`;
      }
    });
    return html;
  };

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It has been read and overwritten.
     Do not edit. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<META NAME="smartmark-analyzed" CONTENT="true">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${traverse(nodes, 1)}
</DL><p>`;
};

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const flattenNodes = (nodes: BookmarkNode[]): BookmarkNode[] => {
  let flat: BookmarkNode[] = [];
  nodes.forEach(node => {
    flat.push(node);
    if (node.children) {
      flat = flat.concat(flattenNodes(node.children));
    }
  });
  return flat;
};

export const cleanUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const paramsToDelete = [];
    for (const key of urlObj.searchParams.keys()) {
      if (key.startsWith('utm_') || key === 'gclid' || key === 'fbclid' || key === 'ref') {
        paramsToDelete.push(key);
      }
    }
    paramsToDelete.forEach(p => urlObj.searchParams.delete(p));
    return urlObj.toString();
  } catch (e) {
    return url;
  }
};