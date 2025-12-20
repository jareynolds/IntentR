import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { useWorkspace, type StoryCard, type Connection } from '../context/WorkspaceContext';
import { useCollaboration } from '../context/CollaborationContext';
import RemoteCursors from '../components/RemoteCursors';
import { AssetsPane } from '../components/AssetsPane';
import { AIPresetIndicator, ConfirmDialog } from '../components';
import { INTEGRATION_URL, SPEC_URL } from '../api/client';

export const Storyboard: React.FC = () => {
  const { currentWorkspace, updateStoryboard } = useWorkspace();
  const { joinWorkspace, leaveWorkspace, updateCursor, broadcastGridUpdate, onGridUpdate } = useCollaboration();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get all available ideation tags from workspace
  const getAllIdeationTags = (): string[] => {
    if (!currentWorkspace?.ideation) return [];

    const allTags = new Set<string>();
    currentWorkspace.ideation.textBlocks.forEach(block => {
      block.tags.forEach(tag => allTags.add(tag));
    });
    currentWorkspace.ideation.imageBlocks.forEach(block => {
      block.tags.forEach(tag => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  };

  // Get all ideation cards that have a card name
  const getAllIdeationCards = (): Array<{ id: string; name: string }> => {
    if (!currentWorkspace?.ideation) return [];

    return currentWorkspace.ideation.textBlocks
      .filter(block => block.cardName && block.cardName.trim() !== '')
      .map(block => ({ id: block.id, name: block.cardName! }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get ideation card name by ID
  const getIdeationCardName = (cardId: string | undefined): string | null => {
    if (!cardId || !currentWorkspace?.ideation) return null;

    const block = currentWorkspace.ideation.textBlocks.find(b => b.id === cardId);
    return block?.cardName || null;
  };
  const [cards, setCards] = useState<StoryCard[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardFormData, setCardFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    status: 'pending' as StoryCard['status'],
    ideationTags: [] as string[],
    ideationCardId: '' as string | undefined,
  });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<{ connectionId: string; endpoint: 'from' | 'to' } | null>(null);
  const [endpointDragPos, setEndpointDragPos] = useState<{ x: number; y: number } | null>(null); // For animated line preview
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRemoteUpdate = useRef(false);
  const [showAssetsPane, setShowAssetsPane] = useState(false);
  const [wrapperElement, setWrapperElement] = useState<HTMLDivElement | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [showAutoLoadingIndicator, setShowAutoLoadingIndicator] = useState(false);
  // Removed hasAutoLoaded ref - now using loadedForWorkspaceId instead (defined near auto-load effect)

  // Track loaded file hashes to detect changes
  const [loadedFileHashes, setLoadedFileHashes] = useState<Record<string, string>>({});

  // Auto-save refs
  const initialLoadComplete = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Delay showing the auto-loading indicator to prevent brief flashes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isAutoLoading) {
      // Only show loading indicator if loading takes more than 300ms
      timeoutId = setTimeout(() => {
        setShowAutoLoadingIndicator(true);
      }, 300);
    } else {
      setShowAutoLoadingIndicator(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAutoLoading]);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeConfirmDialog = () => {
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Helper function to get status label
  const getStatusLabel = (status: StoryCard['status']): string => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'pending': return 'Pending';
      default: return 'Pending';
    }
  };

  // Auto-save function - saves all cards and connections to ideation folder
  const autoSaveToIdeation = async (cardsToSave: StoryCard[], connectionsToSave: Connection[]) => {
    if (!currentWorkspace?.projectFolder) return;
    if (cardsToSave.length === 0) return;

    const workspaceName = currentWorkspace?.name || 'Untitled Workspace';

    // Helper function to generate safe file names
    const generateFileName = (cardTitle: string) => {
      const titleSlug = cardTitle.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `STORY-${titleSlug}.md`;
    };

    // Create array to hold all file objects
    const files: Array<{ fileName: string; content: string }> = [];

    // Generate individual markdown files for each card
    cardsToSave.forEach((card, index) => {
      const fileName = generateFileName(card.title);

      let markdown = `# ${card.title}\n\n`;

      // Metadata section - includes grid position for restoration
      markdown += `## Metadata\n`;
      markdown += `- **Type**: Story Card\n`;
      markdown += `- **Storyboard**: ${workspaceName}\n`;
      markdown += `- **Card ID**: ${card.id}\n`;
      markdown += `- **Status**: ${getStatusLabel(card.status)}\n`;
      markdown += `- **Grid Position X**: ${Math.round(card.x)}\n`;
      markdown += `- **Grid Position Y**: ${Math.round(card.y)}\n`;
      markdown += `- **Generated**: ${new Date().toLocaleString()}\n`;
      markdown += `- **File**: ${fileName}\n\n`;

      // Description
      markdown += `## Description\n`;
      if (card.description) {
        markdown += `${card.description}\n\n`;
      } else {
        markdown += `_No description provided._\n\n`;
      }

      // Visual Reference
      if (card.imageUrl) {
        markdown += `## Visual Reference\n`;
        markdown += `This story card includes a visual reference (80x80px image).\n\n`;
      }

      // Find dependencies (outgoing connections - what this card flows to)
      const outgoingConnections = connectionsToSave.filter(c => c.from === card.id);
      const incomingConnections = connectionsToSave.filter(c => c.to === card.id);

      // Dependencies section
      markdown += `## Dependencies\n\n`;

      // Upstream dependencies (incoming connections)
      if (incomingConnections.length > 0) {
        markdown += `### Upstream Dependencies\n`;
        markdown += `This story card depends on the following cards being completed first:\n\n`;
        markdown += `| Card Title | Card ID | Connection ID | File Reference |\n`;
        markdown += `|------------|---------|---------------|----------------|\n`;
        incomingConnections.forEach(conn => {
          const sourceCard = cardsToSave.find(c => c.id === conn.from);
          if (sourceCard) {
            const sourceFileName = generateFileName(sourceCard.title);
            markdown += `| ${sourceCard.title} | ${sourceCard.id} | ${conn.id} | [${sourceFileName}](./${sourceFileName}) |\n`;
          }
        });
        markdown += '\n';
      } else {
        markdown += `### Upstream Dependencies\n`;
        markdown += `_No upstream dependencies - this is a starting point in the flow._\n\n`;
      }

      // Downstream dependencies (outgoing connections)
      if (outgoingConnections.length > 0) {
        markdown += `### Downstream Impact\n`;
        markdown += `Completing this story card enables the following cards:\n\n`;
        markdown += `| Card Title | Card ID | Connection ID | File Reference |\n`;
        markdown += `|------------|---------|---------------|----------------|\n`;
        outgoingConnections.forEach(conn => {
          const targetCard = cardsToSave.find(c => c.id === conn.to);
          if (targetCard) {
            const targetFileName = generateFileName(targetCard.title);
            markdown += `| ${targetCard.title} | ${targetCard.id} | ${conn.id} | [${targetFileName}](./${targetFileName}) |\n`;
          }
        });
        markdown += '\n';
      } else {
        markdown += `### Downstream Impact\n`;
        markdown += `_No downstream dependencies - this is an end point in the flow._\n\n`;
      }

      files.push({ fileName, content: markdown });
    });

    // Also create an index file that lists all cards
    const indexFileName = `STORYBOARD-INDEX.md`;
    let indexMarkdown = `# Storyboard Index: ${workspaceName}\n\n`;
    indexMarkdown += `## Metadata\n`;
    indexMarkdown += `- **Workspace**: ${workspaceName}\n`;
    indexMarkdown += `- **Generated**: ${new Date().toLocaleString()}\n`;
    indexMarkdown += `- **Total Cards**: ${cardsToSave.length}\n`;
    indexMarkdown += `- **Total Connections**: ${connectionsToSave.length}\n\n`;

    // Complete flow diagram
    indexMarkdown += `## Complete Flow Diagram\n\n`;
    indexMarkdown += '```mermaid\n';
    indexMarkdown += 'flowchart TD\n';
    cardsToSave.forEach(card => {
      const nodeId = card.id.replace(/-/g, '');
      const statusEmoji = card.status === 'completed' ? '✓' : card.status === 'in-progress' ? '⟳' : '○';
      indexMarkdown += `    ${nodeId}["${statusEmoji} ${card.title}"]\n`;
    });
    connectionsToSave.forEach(conn => {
      const fromId = conn.from.replace(/-/g, '');
      const toId = conn.to.replace(/-/g, '');
      indexMarkdown += `    ${fromId} --> ${toId}\n`;
    });
    indexMarkdown += '```\n\n';

    // Card index with positions
    indexMarkdown += `## Story Cards\n\n`;
    indexMarkdown += `| # | Title | Status | X | Y | File | Dependencies |\n`;
    indexMarkdown += `|---|-------|--------|---|---|------|-------------|\n`;
    cardsToSave.forEach((card, index) => {
      const fileName = generateFileName(card.title);
      const depCount = connectionsToSave.filter(c => c.from === card.id || c.to === card.id).length;
      indexMarkdown += `| ${index + 1} | [${card.title}](./${fileName}) | ${getStatusLabel(card.status)} | ${Math.round(card.x)} | ${Math.round(card.y)} | ${fileName} | ${depCount} |\n`;
    });
    indexMarkdown += '\n';

    // Connections data (machine-readable for restoration)
    indexMarkdown += `## Connections Data\n\n`;
    indexMarkdown += `| Connection ID | From Card ID | To Card ID |\n`;
    indexMarkdown += `|---------------|--------------|------------|\n`;
    connectionsToSave.forEach(conn => {
      indexMarkdown += `| ${conn.id} | ${conn.from} | ${conn.to} |\n`;
    });
    indexMarkdown += '\n';

    // Card positions data (machine-readable for restoration)
    indexMarkdown += `## Card Positions Data\n\n`;
    indexMarkdown += `| Card ID | Title | X | Y | Status |\n`;
    indexMarkdown += `|---------|-------|---|---|--------|\n`;
    cardsToSave.forEach(card => {
      indexMarkdown += `| ${card.id} | ${card.title} | ${Math.round(card.x)} | ${Math.round(card.y)} | ${card.status} |\n`;
    });

    files.push({ fileName: indexFileName, content: indexMarkdown });

    // Save all files to ideation folder
    try {
      await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          files,
          subfolder: 'conception'
        }),
      });
      console.log(`[Auto-save] Saved ${files.length} files to conception folder`);
    } catch (error) {
      console.warn('[Auto-save] Failed to save storyboard:', error);
    }
  };

  // Auto-save storyboard when cards or connections change (debounced)
  useEffect(() => {
    // Don't auto-save during initial load
    if (!initialLoadComplete.current) return;
    if (!currentWorkspace?.projectFolder) return;

    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce auto-save by 1 second
    autoSaveTimeoutRef.current = setTimeout(async () => {
      console.log('[Auto-save] Saving storyboard to conception folder...');
      await autoSaveToIdeation(cards, connections);
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [cards, connections, currentWorkspace?.projectFolder]);

  // Callback ref to detect when wrapper is mounted
  const setWrapperRef = (element: HTMLDivElement | null) => {
    wrapperRef.current = element;
    if (element) {
      console.log('Wrapper element mounted');
      setWrapperElement(element);
    }
  };

  // Load storyboard data from current workspace
  useEffect(() => {
    if (currentWorkspace?.storyboard) {
      setCards(currentWorkspace.storyboard.cards);

      // Deduplicate connections when loading
      const loadedConnections = currentWorkspace.storyboard.connections || [];
      const uniqueConnections: Connection[] = [];
      const seenKeys = new Set<string>();

      for (const conn of loadedConnections) {
        const key = `${conn.from}-${conn.to}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueConnections.push(conn);
        }
      }

      setConnections(uniqueConnections);

      // Restore zoom level
      if (currentWorkspace.storyboard.zoom !== undefined) {
        setZoom(currentWorkspace.storyboard.zoom);
      }

      // Restore scroll position after a short delay to ensure DOM is ready
      if (currentWorkspace.storyboard.scrollLeft !== undefined || currentWorkspace.storyboard.scrollTop !== undefined) {
        setTimeout(() => {
          if (wrapperRef.current) {
            wrapperRef.current.scrollLeft = currentWorkspace.storyboard?.scrollLeft || 0;
            wrapperRef.current.scrollTop = currentWorkspace.storyboard?.scrollTop || 0;
          }
        }, 100);
      }
      // Enable auto-save after initial load completes
      setTimeout(() => {
        initialLoadComplete.current = true;
        console.log('[Storyboard] Initial load complete, auto-save enabled');
      }, 500);
    } else {
      // Start with blank storyboard for new workspaces
      setCards([]);
      setConnections([]);
      // Enable auto-save for new workspaces too
      setTimeout(() => {
        initialLoadComplete.current = true;
        console.log('[Storyboard] New workspace, auto-save enabled');
      }, 500);
    }
  }, [currentWorkspace?.id]);

  // Handle opening a specific item from URL parameter
  useEffect(() => {
    const openItem = searchParams.get('open');
    if (openItem && cards.length > 0 && !selectedCard) {
      // Try to find a card with matching sourceFileName or title
      const matchingCard = cards.find(card => {
        // Match by sourceFileName (e.g., "STORY-001.md")
        if (card.sourceFileName && card.sourceFileName === openItem) return true;
        // Match by title containing the filename stem
        const filenameStem = openItem.replace('.md', '');
        if (card.title.toLowerCase().includes(filenameStem.toLowerCase())) return true;
        return false;
      });

      if (matchingCard) {
        setSelectedCard(matchingCard.id);
        // Scroll to the card
        setTimeout(() => {
          if (wrapperRef.current) {
            wrapperRef.current.scrollLeft = Math.max(0, matchingCard.x - 200);
            wrapperRef.current.scrollTop = Math.max(0, matchingCard.y - 200);
          }
        }, 100);
      }
      // Clear the search param after attempting to open
      setSearchParams({}, { replace: true });
    }
  }, [cards, searchParams, selectedCard, setSearchParams]);

  // Helper to create a content hash for change detection
  const createCardContentHash = (title: string, description: string): string => {
    return `${title.trim().toLowerCase()}::${description.trim().toLowerCase()}`;
  };

  // Helper to create a file content hash
  const createFileHash = (content: string): string => {
    // Simple hash function for change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  };

  // Auto-load storyboard from saved files on page load
  const loadStoryboardFromFiles = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setIsAutoLoading(true);

    try {
      // Fetch STORY-*.md files from conception folder
      const response = await fetch(`${INTEGRATION_URL}/read-storyboard-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      if (!response.ok) {
        console.log('No storyboard files found or endpoint not available');
        return;
      }

      const data = await response.json();

      if (!data.files || data.files.length === 0) {
        console.log('No STORY-*.md files found');
        return;
      }

      // Load saved hashes from localStorage
      const savedHashesKey = `storyboard_file_hashes_${currentWorkspace.id}`;
      const savedHashesStr = localStorage.getItem(savedHashesKey);
      const savedHashes: Record<string, string> = savedHashesStr ? JSON.parse(savedHashesStr) : {};

      // Create a set of existing card content hashes
      const existingCardHashes = new Set(
        cards.map(card => createCardContentHash(card.title, card.description))
      );

      // Track new hashes
      const newHashes: Record<string, string> = { ...savedHashes };
      const newCardsToAdd: StoryCard[] = [];

      // Process each file
      for (const file of data.files) {
        const fileName = file.fileName;
        const content = file.content;
        const currentHash = createFileHash(content);

        // Check if file has changed since last load
        if (savedHashes[fileName] === currentHash) {
          // File hasn't changed, skip it
          continue;
        }

        // Parse the markdown file to extract card data
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const descriptionMatch = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
        const statusMatch = content.match(/\*\*Status\*\*:\s*(\w+(?:\s+\w+)?)/i);
        const cardIdMatch = content.match(/\*\*Card ID\*\*:\s*(.+)/);
        const posXMatch = content.match(/\*\*Grid Position X\*\*:\s*(\d+)/);
        const posYMatch = content.match(/\*\*Grid Position Y\*\*:\s*(\d+)/);

        const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');
        const description = descriptionMatch ? descriptionMatch[1].trim().replace(/^_|_$/g, '') : '';
        const savedCardId = cardIdMatch ? cardIdMatch[1].trim() : null;
        const savedX = posXMatch ? parseInt(posXMatch[1], 10) : null;
        const savedY = posYMatch ? parseInt(posYMatch[1], 10) : null;

        // Determine status
        let status: StoryCard['status'] = 'pending';
        if (statusMatch) {
          const statusText = statusMatch[1].toLowerCase();
          if (statusText.includes('completed') || statusText.includes('complete')) {
            status = 'completed';
          } else if (statusText.includes('progress')) {
            status = 'in-progress';
          }
        }

        // Check if card content already exists on grid
        const cardHash = createCardContentHash(title, description);
        if (existingCardHashes.has(cardHash)) {
          // Card already exists with same content, just update the hash
          newHashes[fileName] = currentHash;
          continue;
        }

        // Create new card - use saved coordinates if available
        const newCard: StoryCard = {
          id: savedCardId || `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          description: description || 'No description provided.',
          imageUrl: '',
          x: savedX !== null ? savedX : (100 + newCardsToAdd.length * 380),
          y: savedY !== null ? savedY : (100 + Math.floor(newCardsToAdd.length / 3) * 500),
          status,
          ideationTags: [],
          sourceFileName: fileName,
        };

        newCardsToAdd.push(newCard);
        newHashes[fileName] = currentHash;
        existingCardHashes.add(cardHash); // Add to set to prevent duplicates within same load
      }

      // Save updated hashes to localStorage
      localStorage.setItem(savedHashesKey, JSON.stringify(newHashes));
      setLoadedFileHashes(newHashes);

      // Also try to load connections from the index file
      const indexFile = data.files.find((f: any) => f.fileName === 'SBSUP-INDEX-1.md');
      let loadedConnections: Connection[] = [];

      if (indexFile) {
        const indexContent = indexFile.content;

        // Parse connections from the Connections Data section
        const connectionsMatch = indexContent.match(/## Connections Data[\s\S]*?\| Connection ID \| From Card ID \| To Card ID \|\n\|[-|]+\|\n([\s\S]*?)(?=\n##|\n\n##|$)/);

        if (connectionsMatch && connectionsMatch[1]) {
          const connectionRows = connectionsMatch[1].trim().split('\n');
          connectionRows.forEach((row: string) => {
            const cells = row.split('|').map((c: string) => c.trim()).filter((c: string) => c);
            if (cells.length >= 3) {
              const connId = cells[0];
              const fromId = cells[1];
              const toId = cells[2];

              // Only add connection if it doesn't already exist
              const existingConn = connections.find(c =>
                (c.from === fromId && c.to === toId) || c.id === connId
              );

              if (!existingConn && connId && fromId && toId) {
                loadedConnections.push({
                  id: connId,
                  from: fromId,
                  to: toId,
                });
              }
            }
          });
        }
      }

      // Add new cards if any
      if (newCardsToAdd.length > 0) {
        // If cards have saved positions, use them directly (don't offset)
        const hasSavedPositions = newCardsToAdd.some(card => card.x !== 100 || card.y !== 100);

        let cardsWithPositions: StoryCard[];

        if (hasSavedPositions) {
          // Use saved positions directly
          cardsWithPositions = newCardsToAdd;
        } else {
          // Calculate offset to avoid overlap with existing cards
          let offsetX = 0;
          if (cards.length > 0) {
            const maxX = Math.max(...cards.map(c => c.x));
            offsetX = maxX + 400;
          }

          cardsWithPositions = newCardsToAdd.map((card, index) => ({
            ...card,
            x: offsetX > 0 ? offsetX + (index % 3) * 380 : card.x,
            y: offsetX > 0 ? 100 + Math.floor(index / 3) * 500 : card.y,
          }));
        }

        setCards(prevCards => [...prevCards, ...cardsWithPositions]);
        console.log(`Added ${newCardsToAdd.length} new/changed cards from files`);
      }

      // Add loaded connections if any (with proper deduplication)
      if (loadedConnections.length > 0) {
        setConnections(prevConns => {
          // Filter out connections that already exist in prevConns
          const newConns = loadedConnections.filter(newConn => {
            const exists = prevConns.some(existingConn =>
              existingConn.id === newConn.id ||
              (existingConn.from === newConn.from && existingConn.to === newConn.to)
            );
            return !exists;
          });

          if (newConns.length > 0) {
            console.log(`Added ${newConns.length} new connections from index file`);
            return [...prevConns, ...newConns];
          }
          return prevConns;
        });
      }

      if (newCardsToAdd.length === 0 && loadedConnections.length === 0) {
        console.log('No new or changed storyboard files to load');
      }

    } catch (err) {
      console.error('Failed to auto-load storyboard files:', err);
    } finally {
      setIsAutoLoading(false);
    }
  };

  // Auto-load from files when workspace changes (only once per workspace)
  // Use a ref to track which workspace ID we've loaded for
  const loadedForWorkspaceId = useRef<string | null>(null);

  useEffect(() => {
    if (currentWorkspace?.projectFolder && currentWorkspace?.id) {
      // Only load if we haven't already loaded for this specific workspace
      if (loadedForWorkspaceId.current !== currentWorkspace.id) {
        loadedForWorkspaceId.current = currentWorkspace.id;
        // Small delay to ensure workspace storyboard state is loaded first
        setTimeout(() => {
          loadStoryboardFromFiles();
        }, 500);
      }
    }
  }, [currentWorkspace?.projectFolder, currentWorkspace?.id]);

  // Analyze storyboard with AI - adds cards directly to grid, skipping unchanged ones
  const handleAnalyzeStoryboard = async () => {
    if (!currentWorkspace?.projectFolder) {
      setAnalyzeError('No workspace project folder configured');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      // First try to load from existing storyboards-full.md
      let response = await fetch(`${INTEGRATION_URL}/analyze-storyboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          forceRegenerate: false,
        }),
      });

      let data = await response.json();

      // If no existing file or error, generate from specification files
      if (data.error || !data.cards || data.cards.length === 0) {
        const apiKey = localStorage.getItem('anthropic_api_key');
        if (!apiKey) {
          setAnalyzeError('No existing storyboard found. Please set your Anthropic API key in Settings to generate one from specifications.');
          setIsAnalyzing(false);
          return;
        }

        // Generate new analysis from STORY*.md, dependencies.md, site-architecture.md
        response = await fetch(`${INTEGRATION_URL}/analyze-storyboard`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            apiKey: apiKey,
            forceRegenerate: true,
          }),
        });

        data = await response.json();

        if (data.error) {
          setAnalyzeError(data.error);
          setIsAnalyzing(false);
          return;
        }
      }

      // Create a set of existing card content hashes for change detection
      const existingCardHashes = new Set(
        cards.map(card => createCardContentHash(card.title, card.description))
      );

      // Filter to only new or changed cards
      const analyzedCards: StoryCard[] = data.cards.map((card: any) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        imageUrl: '',
        x: card.x,
        y: card.y,
        status: card.status,
        ideationTags: [],
        sourceFileName: card.sourceFileName || undefined,
      }));

      // Find cards that don't exist on the grid yet (by content hash)
      const newCardsToAdd = analyzedCards.filter(card => {
        const hash = createCardContentHash(card.title, card.description);
        return !existingCardHashes.has(hash);
      });

      if (newCardsToAdd.length === 0) {
        setAnalyzeError('No new or changed cards found. All markdown files are already on the grid.');
        setIsAnalyzing(false);
        return;
      }

      // Calculate offset position for new cards to avoid overlap with existing cards
      let offsetX = 0;
      let offsetY = 0;
      if (cards.length > 0) {
        const maxX = Math.max(...cards.map(c => c.x));
        offsetX = maxX + 400;
      }

      // Add new cards with adjusted positions
      const cardsWithPositions = newCardsToAdd.map((card, index) => ({
        ...card,
        id: `card-${Date.now()}-${index}`,
        x: card.x + offsetX,
        y: card.y + offsetY,
      }));

      // Add new cards to existing cards
      setCards([...cards, ...cardsWithPositions]);

      // If this is the first set of cards, also add connections
      if (cards.length === 0 && data.connections) {
        const newConnections: Connection[] = data.connections.map((conn: any) => ({
          id: conn.id,
          from: conn.from,
          to: conn.to,
        }));
        setConnections(newConnections);
      }

    } catch (err) {
      setAnalyzeError(`Failed to analyze: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save storyboard data whenever cards, connections, or zoom change
  useEffect(() => {
    if (currentWorkspace && (cards.length > 0 || connections.length > 0)) {
      const scrollLeft = wrapperRef.current?.scrollLeft || 0;
      const scrollTop = wrapperRef.current?.scrollTop || 0;

      const storyboardData = {
        cards,
        connections,
        zoom,
        scrollLeft,
        scrollTop,
      };

      updateStoryboard(storyboardData);

      // Broadcast grid update to other users (only if not from remote update)
      if (!isRemoteUpdate.current) {
        broadcastGridUpdate('storyboard', 'full-update', storyboardData);
      }
    }
  }, [cards, connections, zoom]);

  // Join workspace for collaboration
  useEffect(() => {
    if (currentWorkspace?.id) {
      joinWorkspace(currentWorkspace.id);

      return () => {
        leaveWorkspace();
      };
    }
  }, [currentWorkspace?.id]);

  // Listen for remote grid updates
  useEffect(() => {
    const unsubscribe = onGridUpdate((update) => {
      if (update.page === 'storyboard') {
        console.log('Received storyboard update:', update);

        // Mark as remote update to prevent re-broadcasting
        isRemoteUpdate.current = true;

        if (update.updateType === 'full-update' && update.data) {
          if (update.data.cards) {
            setCards(update.data.cards);
          }
          if (update.data.connections) {
            // Deduplicate connections from remote update
            const remoteConnections = update.data.connections;
            const uniqueConnections: Connection[] = [];
            const seenKeys = new Set<string>();

            for (const conn of remoteConnections) {
              const key = `${conn.from}-${conn.to}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueConnections.push(conn);
              }
            }

            setConnections(uniqueConnections);
          }
        }

        // Reset flag after state update
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 100);
      }
    });

    return unsubscribe;
  }, [onGridUpdate]);

  // Handle keyboard events for deleting selected connections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnection) {
        e.preventDefault();
        setConnections(connections.filter(conn => conn.id !== selectedConnection));
        setSelectedConnection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnection, connections]);

  // Attach native wheel event listener to handle zoom while allowing scroll
  useEffect(() => {
    if (!wrapperElement) {
      console.log('Zoom useEffect: wrapperElement is null, skipping');
      return;
    }

    console.log('Zoom useEffect: Attaching wheel event listener, current zoom:', zoom);

    const handleNativeWheel = (e: WheelEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Detect zoom gesture: Ctrl/Cmd key OR pinch gesture (ctrlKey is true on trackpad pinch)
      const isZoomGesture = e.ctrlKey || e.metaKey;

      if (isZoomGesture) {
        console.log('Zoom gesture detected, current zoom:', zoom, 'deltaY:', e.deltaY);

        // ZOOM: Prevent page zoom and zoom only the grid
        e.preventDefault();
        e.stopPropagation();

        const rect = canvas.getBoundingClientRect();

        // Get mouse position relative to canvas
        const mouseX = e.clientX - rect.left + wrapperElement.scrollLeft;
        const mouseY = e.clientY - rect.top + wrapperElement.scrollTop;

        // Calculate zoom delta (slowed down by 4x from original)
        const delta = e.deltaY * -0.0025;
        const newZoom = Math.min(Math.max(0.1, zoom + delta), 3);

        console.log('Calculated newZoom:', newZoom);

        // Calculate the point in canvas coordinates before zoom
        const pointBeforeZoomX = mouseX / zoom;
        const pointBeforeZoomY = mouseY / zoom;

        // Calculate new scroll position to keep point under cursor
        const newScrollLeft = pointBeforeZoomX * newZoom - (e.clientX - rect.left);
        const newScrollTop = pointBeforeZoomY * newZoom - (e.clientY - rect.top);

        setZoom(newZoom);

        // Set scroll position after zoom
        requestAnimationFrame(() => {
          wrapperElement.scrollLeft = newScrollLeft;
          wrapperElement.scrollTop = newScrollTop;
        });
      }
      // For non-zoom wheel events, let the browser handle scrolling naturally
    };

    // Add listener with passive: false to allow preventDefault for zoom
    wrapperElement.addEventListener('wheel', handleNativeWheel, { passive: false });
    console.log('Zoom useEffect: Wheel event listener attached');

    return () => {
      wrapperElement.removeEventListener('wheel', handleNativeWheel);
      console.log('Zoom useEffect: Wheel event listener removed');
    };
  }, [wrapperElement, zoom]);

  // Save scroll position when user scrolls
  useEffect(() => {
    if (!wrapperElement || !currentWorkspace) return;

    const handleScroll = () => {
      // Debounce the save to avoid excessive updates
      const timeoutId = setTimeout(() => {
        if (wrapperRef.current) {
          const scrollLeft = wrapperRef.current.scrollLeft;
          const scrollTop = wrapperRef.current.scrollTop;

          const storyboardData = {
            cards,
            connections,
            zoom,
            scrollLeft,
            scrollTop,
          };

          updateStoryboard(storyboardData);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    };

    wrapperElement.addEventListener('scroll', handleScroll);

    return () => {
      wrapperElement.removeEventListener('scroll', handleScroll);
    };
  }, [wrapperElement, currentWorkspace, cards, connections, zoom]);

  const getConnectionPoints = (fromId: string, toId: string) => {
    const fromCard = cards.find(c => c.id === fromId);
    const toCard = cards.find(c => c.id === toId);
    if (!fromCard || !toCard) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

    // Get actual card element dimensions dynamically
    const fromElement = document.querySelector(`[data-card-id="${fromId}"]`) as HTMLElement;
    const toElement = document.querySelector(`[data-card-id="${toId}"]`) as HTMLElement;

    const cardWidth = 330;
    const fromHeight = fromElement?.offsetHeight || 450;
    const toHeight = toElement?.offsetHeight || 450;

    // Calculate centers (in unscaled coordinates)
    const fromCenterX = fromCard.x + cardWidth / 2;
    const fromCenterY = fromCard.y + fromHeight / 2;
    const toCenterX = toCard.x + cardWidth / 2;
    const toCenterY = toCard.y + toHeight / 2;

    // Determine relative position
    const deltaX = toCenterX - fromCenterX;
    const deltaY = toCenterY - fromCenterY;

    let fromPoint = { x: 0, y: 0 };
    let toPoint = { x: 0, y: 0 };

    // If the target card is significantly below (vertical flow)
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 50) {
      // From: middle bottom of origin card
      fromPoint = { x: fromCenterX, y: fromCard.y + fromHeight };
      // To: middle top of destination card
      toPoint = { x: toCenterX, y: toCard.y };
    }
    // If the target card is significantly above (vertical flow upward)
    else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -50) {
      // From: middle top of origin card
      fromPoint = { x: fromCenterX, y: fromCard.y };
      // To: middle bottom of destination card
      toPoint = { x: toCenterX, y: toCard.y + toHeight };
    }
    // If the target card is to the right (horizontal flow)
    else if (deltaX > 0) {
      // From: middle right of origin card
      fromPoint = { x: fromCard.x + cardWidth, y: fromCenterY };
      // To: middle left of destination card
      toPoint = { x: toCard.x, y: toCenterY };
    }
    // If the target card is to the left (horizontal flow backward)
    else {
      // From: middle left of origin card
      fromPoint = { x: fromCard.x, y: fromCenterY };
      // To: middle right of destination card
      toPoint = { x: toCard.x + cardWidth, y: toCenterY };
    }

    // Apply zoom scaling to the connection points
    return {
      from: { x: fromPoint.x * zoom, y: fromPoint.y * zoom },
      to: { x: toPoint.x * zoom, y: toPoint.y * zoom }
    };
  };

  const handleMouseDownOnCard = (e: React.MouseEvent, cardId: string) => {
    // Ignore if clicking on action buttons
    if ((e.target as HTMLElement).closest('.card-action-btn')) {
      return;
    }

    if (connecting) {
      // Creating a connection
      if (connecting !== cardId && !connections.find(c => c.from === connecting && c.to === cardId)) {
        const newConnection = {
          id: `conn-${connecting}-${cardId}-${Date.now()}`,
          from: connecting,
          to: cardId
        };
        setConnections([...connections, newConnection]);
      }
      setConnecting(null);
      return;
    }

    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setDraggingCard(cardId);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wrapper = canvas.parentElement;
    if (!wrapper) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
    const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;

    setDragOffset({
      x: mouseX - card.x,
      y: mouseY - card.y,
    });
    setSelectedCard(cardId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;

    if (canvas && wrapper) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
      const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;
      updateCursor(mouseX, mouseY, 'storyboard');
    }

    if (isPanning && wrapper) {
      wrapper.scrollLeft = panStart.x - e.clientX;
      wrapper.scrollTop = panStart.y - e.clientY;
    }

    if (draggingCard) {
      if (!canvas || !wrapper) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
      const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;

      setCards(cards.map(card =>
        card.id === draggingCard
          ? { ...card, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y }
          : card
      ));
    }

    // Handle endpoint dragging - track mouse position for animated line preview
    if (draggingEndpoint && canvas && wrapper) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
      const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;

      // Update the drag position for animated line preview (scaled to SVG coordinates)
      setEndpointDragPos({ x: mouseX * zoom, y: mouseY * zoom });

      // Find which card the mouse is over
      const cardWidth = 330;
      const cardHeight = 450;
      const hoveredCard = cards.find(card =>
        mouseX >= card.x &&
        mouseX <= card.x + cardWidth &&
        mouseY >= card.y &&
        mouseY <= card.y + cardHeight
      );

      // Visual feedback could be added here (e.g., highlight hovered card)
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Handle endpoint reconnection
    if (draggingEndpoint) {
      const canvas = canvasRef.current;
      const wrapper = canvas?.parentElement;

      if (canvas && wrapper) {
        // Get the final mouse position
        const cardWidth = 330;
        const cardHeight = 450;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
        const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;

        const targetCard = cards.find(card =>
          mouseX >= card.x &&
          mouseX <= card.x + cardWidth &&
          mouseY >= card.y &&
          mouseY <= card.y + cardHeight
        );

        if (targetCard) {
          // Update the connection
          setConnections(connections.map(conn => {
            if (conn.id === draggingEndpoint.connectionId) {
              if (draggingEndpoint.endpoint === 'from') {
                return { ...conn, from: targetCard.id };
              } else {
                return { ...conn, to: targetCard.id };
              }
            }
            return conn;
          }));
        }
      }

      setDraggingEndpoint(null);
      setEndpointDragPos(null);
    }

    setDraggingCard(null);
    setIsPanning(false);
    // Restore cursor back to grab
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Check if clicking on canvas background (not on a card)
    const isBackground = e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('storyboard-canvas-inner');

    if (isBackground) {
      // Deselect any selected items when clicking on canvas background
      setSelectedCard(null);
      setSelectedConnection(null);
      setConnecting(null);

      // Start panning with left click on background (or middle mouse, or shift+click)
      if (e.button === 0 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
        e.preventDefault();
        const wrapper = canvasRef.current?.parentElement;
        if (wrapper) {
          setIsPanning(true);
          setPanStart({
            x: e.clientX + wrapper.scrollLeft,
            y: e.clientY + wrapper.scrollTop
          });
          // Change cursor to grabbing
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing';
          }
        }
      }
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.1));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleAddCard = () => {
    setEditingCardId(null);
    setCardFormData({ title: '', description: '', imageUrl: '', status: 'pending', ideationTags: [], ideationCardId: '' });
    setShowCardDialog(true);
  };

  const handleEditCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setEditingCardId(cardId);
    setCardFormData({
      title: card.title,
      description: card.description,
      imageUrl: card.imageUrl,
      status: card.status,
      ideationTags: card.ideationTags || [],
      ideationCardId: card.ideationCardId || '',
    });
    setShowCardDialog(true);
  };

  const handleCreateCard = () => {
    if (!cardFormData.title.trim()) return;

    // Calculate the center of the visible viewport
    let centerX = 100;
    let centerY = 100;

    if (wrapperRef.current) {
      const wrapper = wrapperRef.current;
      const scrollLeft = wrapper.scrollLeft;
      const scrollTop = wrapper.scrollTop;
      const viewportWidth = wrapper.clientWidth;
      const viewportHeight = wrapper.clientHeight;

      // Calculate center point in canvas coordinates (accounting for zoom)
      // The visible area starts at scroll position and extends by viewport size
      // We need to convert viewport coordinates to canvas coordinates by dividing by zoom
      centerX = (scrollLeft + viewportWidth / 2) / zoom;
      centerY = (scrollTop + viewportHeight / 2) / zoom;

      // Offset slightly so the card is centered (card is roughly 350x400)
      centerX = Math.max(100, centerX - 175);
      centerY = Math.max(100, centerY - 200);
    }

    const newCard: StoryCard = {
      id: 'card-' + Date.now(),
      title: cardFormData.title,
      description: cardFormData.description,
      imageUrl: cardFormData.imageUrl,
      x: Math.round(centerX),
      y: Math.round(centerY),
      status: cardFormData.status,
      ideationTags: cardFormData.ideationTags,
      ideationCardId: cardFormData.ideationCardId || undefined,
    };

    setCards([...cards, newCard]);
    setShowCardDialog(false);
    setEditingCardId(null);
    setCardFormData({ title: '', description: '', imageUrl: '', status: 'pending', ideationTags: [], ideationCardId: '' });
  };

  const handleUpdateCard = () => {
    if (!editingCardId || !cardFormData.title.trim()) return;

    setCards(cards.map(card =>
      card.id === editingCardId
        ? { ...card, ...cardFormData, ideationCardId: cardFormData.ideationCardId || undefined }
        : card
    ));
    setShowCardDialog(false);
    setEditingCardId(null);
    setCardFormData({ title: '', description: '', imageUrl: '', status: 'pending', ideationTags: [], ideationCardId: '' });
  };

  const handleSaveCard = () => {
    if (editingCardId) {
      handleUpdateCard();
    } else {
      handleCreateCard();
    }
  };

  const handleSelectAsset = (file: any) => {
    // Create a new card from the selected asset
    const newCard: StoryCard = {
      id: 'card-' + Date.now(),
      title: file.name,
      description: `Asset from integration: ${file.url}`,
      imageUrl: file.thumbnail_url || file.url, // Use thumbnail_url for the image, fallback to url
      x: 100 + cards.length * 60,
      y: 150 + cards.length * 40,
      status: 'pending',
      ideationTags: [],
    };

    setCards([...cards, newCard]);
    setShowAssetsPane(false);
  };

  const handleDeleteCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    const hasSourceFile = card?.sourceFileName;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Card',
      message: hasSourceFile
        ? `Are you sure you want to delete "${card?.title || 'this card'}"? This will also delete the file ${card.sourceFileName}.`
        : `Are you sure you want to delete "${card?.title || 'this card'}"?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));

        // If the card was loaded from a file, delete the file first
        if (hasSourceFile && card?.sourceFileName) {
          try {
            const response = await fetch(`${SPEC_URL}/api/delete-specification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileName: card.sourceFileName,
                workspacePath: currentWorkspace?.projectFolder,
              }),
            });

            const data = await response.json();
            if (!data.success) {
              console.error('Failed to delete story file:', data.error);
            }
          } catch (err) {
            console.error('Failed to delete story file:', err);
          }
        }

        // Remove from canvas
        setCards(cards.filter(c => c.id !== cardId));
        setConnections(connections.filter(c => c.from !== cardId && c.to !== cardId));
        if (selectedCard === cardId) setSelectedCard(null);
      },
    });
  };

  const handleStartConnection = (cardId: string) => {
    setConnecting(cardId);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCardFormData({ ...cardFormData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status: StoryCard['status']) => {
    switch (status) {
      case 'completed': return 'var(--color-systemGreen)';
      case 'in-progress': return 'var(--color-systemBlue)';
      case 'pending': return 'var(--color-systemGray)';
      default: return 'var(--color-systemGray)';
    }
  };

  return (
    <div className="storyboard-page" style={{ padding: '16px' }}>
      <AIPresetIndicator />
      {/* Workspace Header */}
      {currentWorkspace && (
        <div style={{
          backgroundColor: 'var(--color-primary)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h4 className="text-title3" style={{ margin: 0, color: 'white' }}>
            Workspace: {currentWorkspace.name}
          </h4>
        </div>
      )}
      {/* Header - Apple HIG */}
      <div className="storyboard-header">
        <div>
          <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Storyboard Canvas</h1>
          <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
            Drag cards to arrange, click connect to link
          </p>
        </div>
        <div className="header-actions">
          {/* Hide "Analyze & Generate" for "Create New Application" workspace type */}
          {currentWorkspace?.workspaceType !== 'new' && (
            <Button
              variant="primary"
              onClick={handleAnalyzeStoryboard}
              disabled={isAnalyzing || !currentWorkspace?.projectFolder}
            >
              {isAnalyzing ? '🔄 Analyzing...' : '🤖 Analyze & Generate'}
            </Button>
          )}
          <Button variant="primary" onClick={handleAddCard}>
            + Add Card
          </Button>
          <Button variant="secondary" onClick={() => setShowAssetsPane(!showAssetsPane)}>
            📁 UI Assets
          </Button>
          {connecting && (
            <Button variant="outline" onClick={() => setConnecting(null)}>
              Cancel Connection
            </Button>
          )}
        </div>
      </div>

      {/* Auto-loading indicator - only shown after 300ms delay to prevent flash */}
      {showAutoLoadingIndicator && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: 'var(--color-systemBlue)',
          color: 'white',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
          Loading storyboard from saved files...
        </div>
      )}

      {/* Analyze Error */}
      {analyzeError && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: 'var(--color-systemRed)',
          color: 'white',
          borderRadius: '8px',
        }}>
          {analyzeError}
          <button
            onClick={() => setAnalyzeError(null)}
            style={{
              marginLeft: '12px',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Canvas Wrapper */}
      <div
        className={`storyboard-canvas-wrapper ${isFullscreen ? 'fullscreen' : ''}`}
        ref={setWrapperRef}
      >
        {/* Draw Controls Toolbar */}
        <div className="draw-controls-toolbar">
          <div className="draw-controls-label">Draw</div>
          <button
            className="draw-control-btn"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? '⊡' : '⛶'}
          </button>
        </div>

        <div
          ref={canvasRef}
          className="storyboard-canvas"
          style={{
            width: `${10000 * zoom}px`,
            height: `${20000 * zoom}px`,
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="storyboard-canvas-inner">
            {/* Remote Cursors */}
            <RemoteCursors page="storyboard" />

        {/* Connections SVG */}
        <svg
          ref={svgRef}
          className="connections-svg"
          style={{ position: 'absolute', top: 0, left: 0, width: '10000px', height: '10000px', pointerEvents: 'auto' }}
        >
          {/* Transparent background to allow canvas clicks to work */}
          <rect
            x="0"
            y="0"
            width="10000"
            height="10000"
            fill="transparent"
            style={{ pointerEvents: 'none' }}
          />
          {connections.map((conn, idx) => {
            const { from, to } = getConnectionPoints(conn.from, conn.to);

            // Get the card positions to determine edge directions
            const fromCard = cards.find(c => c.id === conn.from);
            const toCard = cards.find(c => c.id === conn.to);

            if (!fromCard || !toCard) return null;

            const cardWidth = 330;
            const cardHeight = 450;

            // Determine which edge each connection point is on
            const fromCenterX = fromCard.x + cardWidth / 2;
            const fromCenterY = fromCard.y + cardHeight / 2;
            const toCenterX = toCard.x + cardWidth / 2;
            const toCenterY = toCard.y + cardHeight / 2;

            const deltaX = toCenterX - fromCenterX;
            const deltaY = toCenterY - fromCenterY;

            // Determine the exit and entry edges
            let fromEdge = '';
            let toEdge = '';

            if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 50) {
              fromEdge = 'bottom';
              toEdge = 'top';
            } else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -50) {
              fromEdge = 'top';
              toEdge = 'bottom';
            } else if (deltaX > 0) {
              fromEdge = 'right';
              toEdge = 'left';
            } else {
              fromEdge = 'left';
              toEdge = 'right';
            }

            // Create control points that ensure 90-degree entry/exit
            const curveDistance = 100 * zoom; // Distance to extend perpendicular before curving

            let controlPoint1, controlPoint2;

            // Exit control point - extends perpendicular to the exit edge
            if (fromEdge === 'right') {
              controlPoint1 = { x: from.x + curveDistance, y: from.y };
            } else if (fromEdge === 'left') {
              controlPoint1 = { x: from.x - curveDistance, y: from.y };
            } else if (fromEdge === 'bottom') {
              controlPoint1 = { x: from.x, y: from.y + curveDistance };
            } else { // top
              controlPoint1 = { x: from.x, y: from.y - curveDistance };
            }

            // Entry control point - extends perpendicular to the entry edge
            if (toEdge === 'right') {
              controlPoint2 = { x: to.x + curveDistance, y: to.y };
            } else if (toEdge === 'left') {
              controlPoint2 = { x: to.x - curveDistance, y: to.y };
            } else if (toEdge === 'bottom') {
              controlPoint2 = { x: to.x, y: to.y + curveDistance };
            } else { // top
              controlPoint2 = { x: to.x, y: to.y - curveDistance };
            }

            // Create SVG path with cubic Bezier curve
            const pathData = `M ${from.x} ${from.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${to.x} ${to.y}`;

            const connectionId = conn.id || `${conn.from}-${conn.to}`;
            const isSelected = selectedConnection === connectionId;

            return (
              <g key={connectionId}>
                {/* Invisible wider path for easier clicking */}
                <path
                  d={pathData}
                  stroke="transparent"
                  strokeWidth="20"
                  fill="none"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Always set this connection as the only selected one
                    setSelectedConnection(connectionId);
                    setSelectedCard(null);
                  }}
                />
                {/* Visible path */}
                <path
                  d={pathData}
                  stroke={isSelected ? "var(--color-systemOrange)" : "var(--color-systemBlue)"}
                  strokeWidth={isSelected ? "3" : "2"}
                  fill="none"
                  markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Endpoint handles when selected */}
                {isSelected && (
                  <>
                    {/* From endpoint - larger invisible hit area + visible circle */}
                    <circle
                      cx={from.x}
                      cy={from.y}
                      r={20 * zoom}
                      fill="transparent"
                      style={{
                        pointerEvents: 'all',
                        cursor: draggingEndpoint?.connectionId === connectionId && draggingEndpoint?.endpoint === 'from' ? 'grabbing' : 'grab'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggingEndpoint({ connectionId: connectionId, endpoint: 'from' });
                      }}
                    />
                    <circle
                      cx={from.x}
                      cy={from.y}
                      r={12 * zoom}
                      fill="white"
                      stroke="var(--color-systemOrange)"
                      strokeWidth={3}
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* To endpoint - larger invisible hit area + visible circle */}
                    <circle
                      cx={to.x}
                      cy={to.y}
                      r={20 * zoom}
                      fill="transparent"
                      style={{
                        pointerEvents: 'all',
                        cursor: draggingEndpoint?.connectionId === connectionId && draggingEndpoint?.endpoint === 'to' ? 'grabbing' : 'grab'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggingEndpoint({ connectionId: connectionId, endpoint: 'to' });
                      }}
                    />
                    <circle
                      cx={to.x}
                      cy={to.y}
                      r={12 * zoom}
                      fill="white"
                      stroke="var(--color-systemOrange)"
                      strokeWidth={3}
                      style={{ pointerEvents: 'none' }}
                    />
                    {/* Delete button in the middle of the line */}
                    <g
                      transform={`translate(${(from.x + to.x) / 2}, ${(from.y + to.y) / 2})`}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnections(connections.filter(c => {
                          const cId = c.id || `${c.from}-${c.to}`;
                          return cId !== connectionId;
                        }));
                        setSelectedConnection(null);
                      }}
                    >
                      {/* Background circle */}
                      <circle
                        r={12 * zoom}
                        fill="var(--color-systemRed)"
                        stroke="white"
                        strokeWidth={2}
                      />
                      {/* X icon */}
                      <line
                        x1={-4 * zoom}
                        y1={-4 * zoom}
                        x2={4 * zoom}
                        y2={4 * zoom}
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                      <line
                        x1={4 * zoom}
                        y1={-4 * zoom}
                        x2={-4 * zoom}
                        y2={4 * zoom}
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </g>
                  </>
                )}
              </g>
            );
          })}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="var(--color-systemBlue)" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="var(--color-systemOrange)" />
            </marker>
            <marker
              id="arrowhead-drag-preview"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="var(--color-systemOrange)" />
            </marker>
          </defs>
          {/* Animated line preview when dragging endpoint */}
          {draggingEndpoint && endpointDragPos && (() => {
            const conn = connections.find(c => {
              const connId = c.id || `${c.from}-${c.to}`;
              return connId === draggingEndpoint.connectionId;
            });
            if (!conn) return null;

            const { from, to } = getConnectionPoints(conn.from, conn.to);
            // If dragging 'from', line goes from cursor to 'to' endpoint
            // If dragging 'to', line goes from 'from' endpoint to cursor
            const startPoint = draggingEndpoint.endpoint === 'from' ? endpointDragPos : from;
            const endPoint = draggingEndpoint.endpoint === 'to' ? endpointDragPos : to;

            return (
              <line
                x1={startPoint.x}
                y1={startPoint.y}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke="var(--color-systemOrange)"
                strokeWidth={3}
                strokeDasharray="8,4"
                style={{ pointerEvents: 'none' }}
                markerEnd="url(#arrowhead-drag-preview)"
              />
            );
          })()}
        </svg>

            {/* Story Cards */}
            {cards.map((card) => (
              <div
                key={card.id}
                data-card-id={card.id}
                className={`story-card ${selectedCard === card.id ? 'selected' : ''} ${draggingCard === card.id ? 'dragging' : ''}`}
                style={{
                  left: card.x * zoom,
                  top: card.y * zoom,
                  borderColor: getStatusColor(card.status),
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0',
                }}
                onMouseDown={(e) => handleMouseDownOnCard(e, card.id)}
              >
            {/* Card Content */}
            <div className="card-content">
              <div className="card-header">
                <h4 className="text-headline">{card.title}</h4>
                <span className="card-status-badge" style={{ backgroundColor: getStatusColor(card.status) }}>
                  {getStatusLabel(card.status)}
                </span>
              </div>
              <p className="text-footnote text-secondary card-description">{card.description}</p>

              {/* Linked Ideation Card */}
              {card.ideationCardId && getIdeationCardName(card.ideationCardId) && (
                <div className="linked-ideation-card">
                  <span className="linked-card-label">📋 Linked Card:</span>
                  <span className="linked-card-name">{getIdeationCardName(card.ideationCardId)}</span>
                </div>
              )}

              {/* Ideation Tags */}
              {card.ideationTags && card.ideationTags.length > 0 && (
                <div className="card-tags">
                  {card.ideationTags.map(tag => (
                    <span key={tag} className="card-tag">{tag}</span>
                  ))}
                </div>
              )}

              {/* Card Actions */}
              <div className="card-actions">
                <button
                  className="card-action-btn btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCard(card.id);
                  }}
                  title="Edit card"
                >
                  ✏️ Edit
                </button>
                <button
                  className="card-action-btn btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartConnection(card.id);
                  }}
                  title="Create connection"
                >
                  🔗 Connect
                </button>
                <button
                  className="card-action-btn btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCard(card.id);
                  }}
                  title="Delete card"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            {/* Image/Drawing Area - 320x320px below text */}
            {card.imageUrl && (
              <div className="card-image-area">
                <img src={card.imageUrl} alt={card.title} className="card-image" />
              </div>
            )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Card Dialog - Apple HIG */}
      {showCardDialog && (
        <div className="modal-overlay" onClick={() => setShowCardDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-title1" style={{ marginBottom: '24px' }}>
              {editingCardId ? 'Edit Story Card' : 'Add Story Card'}
            </h3>

            <div className="form-group">
              <label htmlFor="card-title" className="label">Title *</label>
              <input
                id="card-title"
                type="text"
                value={cardFormData.title}
                onChange={(e) => setCardFormData({ ...cardFormData, title: e.target.value })}
                placeholder="e.g., User Registration"
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="card-description" className="label">Description</label>
              <textarea
                id="card-description"
                value={cardFormData.description}
                onChange={(e) => setCardFormData({ ...cardFormData, description: e.target.value })}
                placeholder="Brief description of this story"
                className="input"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="card-image" className="label">Image/Drawing (320x320px)</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {cardFormData.imageUrl && (
                  <img
                    src={cardFormData.imageUrl}
                    alt="Preview"
                    style={{ width: '160px', height: '160px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--color-systemGray4)' }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {cardFormData.imageUrl ? 'Change Image' : 'Upload Image'}
                  </Button>
                  {cardFormData.imageUrl && (
                    <Button
                      variant="ghost"
                      onClick={() => setCardFormData({ ...cardFormData, imageUrl: '' })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="card-status" className="label">Status</label>
              <select
                id="card-status"
                value={cardFormData.status}
                onChange={(e) => setCardFormData({ ...cardFormData, status: e.target.value as StoryCard['status'] })}
                className="input"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Ideation Tags</label>
              {getAllIdeationTags().length === 0 ? (
                <p className="text-footnote text-secondary" style={{ margin: 0 }}>
                  No tags available. Create tags in the Ideation page first.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '12px',
                    background: 'var(--color-systemGray6)',
                    borderRadius: '8px',
                    minHeight: '44px',
                  }}>
                    {getAllIdeationTags().map(tag => {
                      const isSelected = cardFormData.ideationTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setCardFormData({
                                ...cardFormData,
                                ideationTags: cardFormData.ideationTags.filter(t => t !== tag)
                              });
                            } else {
                              setCardFormData({
                                ...cardFormData,
                                ideationTags: [...cardFormData.ideationTags, tag]
                              });
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: isSelected ? 'var(--color-systemBlue)' : 'var(--color-systemBackground)',
                            color: isSelected ? 'white' : 'var(--color-label)',
                            border: isSelected ? 'none' : '1px solid var(--color-systemGray4)',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSelected && '✓ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-footnote text-secondary" style={{ margin: 0 }}>
                    Selected: {cardFormData.ideationTags.length} tag{cardFormData.ideationTags.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="label">Linked Ideation Card</label>
              <select
                value={cardFormData.ideationCardId || ''}
                onChange={(e) => setCardFormData({ ...cardFormData, ideationCardId: e.target.value || '' })}
                className="input"
              >
                <option value="">None</option>
                {getAllIdeationCards().map(card => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
              {getAllIdeationCards().length === 0 && (
                <p className="text-footnote text-secondary" style={{ margin: '4px 0 0 0' }}>
                  No named cards available. Add a "Card Name" to ideation cards first.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <Button variant="outline" onClick={() => {
                setShowCardDialog(false);
                setEditingCardId(null);
              }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveCard} disabled={!cardFormData.title.trim()}>
                {editingCardId ? 'Save Changes' : 'Add Card'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .storyboard-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--color-systemBackground);
        }

        .storyboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-6, 24px);
          background: var(--color-systemBackground);
          border-bottom: 1px solid var(--color-systemGray5);
        }

        .header-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .storyboard-canvas-wrapper {
          flex: 1;
          position: relative;
          overflow: scroll;
          touch-action: none;
          overscroll-behavior: contain;
          isolation: isolate;
          -webkit-overflow-scrolling: touch;
          min-height: 0;
          max-height: calc(100vh - 200px);
          transition: all 0.3s ease;
        }

        .storyboard-canvas-wrapper.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          z-index: 9999;
          background: var(--color-systemBackground);
        }

        .storyboard-canvas {
          display: block;
          cursor: grab;
          position: relative;
          touch-action: none;
          background: var(--color-systemBackground);
        }

        .storyboard-canvas:active {
          cursor: grabbing;
        }

        .storyboard-canvas-inner {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .draw-controls-toolbar {
          position: sticky;
          left: 4px;
          top: 4px;
          width: 60px;
          background: var(--color-systemGray6);
          border: 1px solid var(--color-separator);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--spacing-3, 12px) var(--spacing-2, 8px);
          gap: var(--spacing-2, 8px);
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          float: left;
          margin-right: var(--spacing-3, 12px);
          margin-bottom: var(--spacing-3, 12px);
        }

        .storyboard-canvas-wrapper.fullscreen .draw-controls-toolbar {
          position: fixed;
          top: 24px;
          left: 24px;
        }

        .draw-controls-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-secondaryLabel);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: var(--spacing-1, 4px);
          text-align: center;
        }

        .draw-control-btn {
          width: 44px;
          height: 44px;
          background: var(--color-systemBackground);
          border: 1px solid var(--color-separator);
          border-radius: 8px;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .draw-control-btn:hover {
          background: var(--color-systemBlue);
          border-color: var(--color-systemBlue);
          color: white;
          transform: scale(1.05);
        }

        .draw-control-btn:active {
          transform: scale(0.95);
        }

        /* Story Card - Apple HIG */
        .story-card {
          position: absolute;
          width: 330px;
          background: var(--color-systemBackground);
          border: 3px solid;
          border-radius: 10px;
          padding: 0;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          user-select: none;
          display: flex;
          flex-direction: column;
        }

        .story-card:active {
          cursor: grabbing;
        }

        .story-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.12);
        }

        .story-card.selected {
          box-shadow: 0 6px 20px rgba(0, 122, 255, 0.3);
          transform: scale(1.02);
        }

        .story-card.dragging {
          opacity: 0.85;
          z-index: 1000;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        /* Image Area - 320x320px */
        .card-image-area {
          width: 320px;
          height: 320px;
          flex-shrink: 0;
          margin: 0;
          border-radius: 0 0 7px 7px;
          overflow: hidden;
          background: var(--color-systemBackground-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Card Content */
        .card-content {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .card-header h4 {
          margin: 0;
          flex: 1;
        }

        .card-status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
        }

        .card-description {
          margin: 0;
          flex: 1;
          line-height: 1.4;
        }

        .linked-ideation-card {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 8px 0;
          padding: 8px 12px;
          background: var(--color-systemGray6);
          border-radius: 8px;
          border-left: 3px solid var(--color-systemPurple);
        }

        .linked-card-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-systemPurple);
        }

        .linked-card-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--color-label);
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 4px 0;
        }

        .card-tag {
          display: inline-block;
          padding: 4px 8px;
          background: var(--color-systemBlue);
          color: white;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .card-action-btn {
          background: transparent;
          border: none;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 13px;
          border-radius: 6px;
          color: var(--color-systemBlue);
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .card-action-btn:hover {
          background: var(--color-systemFill-quaternary);
        }

        .card-action-btn:active {
          background: var(--color-systemFill-tertiary);
        }

        /* Modal Styles - Apple HIG */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--color-systemBackground);
          border-radius: 10px;
          padding: 32px;
          max-width: 540px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          .storyboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .story-card {
            width: 280px;
          }

          .card-image-area {
            width: 70px;
            height: 70px;
          }
        }
      `}</style>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />

      {/* Assets Pane */}
      {showAssetsPane && currentWorkspace && (
        <AssetsPane
          workspaceId={currentWorkspace.id}
          onClose={() => setShowAssetsPane(false)}
          onSelectFile={handleSelectAsset}
        />
      )}
    </div>
  );
};
