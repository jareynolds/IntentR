import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace, type Connection } from '../context/WorkspaceContext';
import { useCollaboration } from '../context/CollaborationContext';
import RemoteCursors from '../components/RemoteCursors';
import { AssetsPane, WorkspaceHeader, Alert, PageLayout } from '../components';
import { Button } from '../components/Button';
import { SPEC_URL } from '../api/client';

interface CardImage {
  id: string;
  url: string;
  x: number; // Position relative to card
  y: number;
  width: number;
  height: number;
}

interface CardShape {
  id: string;
  type: 'square' | 'circle' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

interface CardTextBox {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
}

interface CardAsset {
  id: string;
  name: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  thumbnail_url?: string;
}

interface TextBlock {
  id: string;
  content: string;
  x: number;
  y: number;
  tags: string[];
  width: number;
  height: number;
  cardName?: string; // Name for linking to story cards
  textAreas?: string[]; // Multiple text areas within the card
  images?: CardImage[]; // Images within the card
  shapes?: CardShape[]; // Shapes within the card
  textBoxes?: CardTextBox[]; // Text boxes within the card
  assets?: CardAsset[]; // Assets within the card
}

interface ImageBlock {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  tags: string[];
  width: number;
  height: number;
  cardName?: string; // Name for the image card
  metadata?: {
    sourceFile?: any;
    fileName?: string;
    fileType?: string;
    originalUrl?: string;
  };
  textContent?: string; // Text annotation for the image
  additionalImages?: string[]; // Additional images in the same card
}

interface ShapeBlock {
  id: string;
  type: 'box' | 'circle' | 'line' | 'square';
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  tags: string[];
  curveControlX?: number; // For line curves - control point X offset from center
  curveControlY?: number; // For line curves - control point Y offset from center
}

interface IdeationData {
  textBlocks: TextBlock[];
  imageBlocks: ImageBlock[];
  shapeBlocks: ShapeBlock[];
  connections: Connection[];
}

type BlockType = 'text' | 'image' | 'shape';

export const Ideation: React.FC = () => {
  const { currentWorkspace, updateWorkspace } = useWorkspace();
  const { joinWorkspace, leaveWorkspace, updateCursor, broadcastGridUpdate, onGridUpdate } = useCollaboration();
  const [searchParams, setSearchParams] = useSearchParams();

  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
  const [imageBlocks, setImageBlocks] = useState<ImageBlock[]>([]);
  const [shapeBlocks, setShapeBlocks] = useState<ShapeBlock[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [draggingItem, setDraggingItem] = useState<{ type: BlockType; id: string } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [resizingItem, setResizingItem] = useState<{ type: BlockType; id: string; handle: string } | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<BlockType | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showAssetsPane, setShowAssetsPane] = useState(false);
  const [showInlineToolbar, setShowInlineToolbar] = useState<string | null>(null);

  // State for card images being moved/resized
  const [selectedCardImage, setSelectedCardImage] = useState<{ cardId: string; imageId: string } | null>(null);
  const [draggingCardImage, setDraggingCardImage] = useState<{ cardId: string; imageId: string; offsetX: number; offsetY: number } | null>(null);
  const [resizingCardImage, setResizingCardImage] = useState<{ cardId: string; imageId: string; handle: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const [selectedCardItem, setSelectedCardItem] = useState<{ cardId: string; itemId: string; itemType: 'shape' | 'textBox' | 'asset' } | null>(null);
  const [draggingCardItem, setDraggingCardItem] = useState<{ cardId: string; itemId: string; itemType: string; offsetX: number; offsetY: number } | null>(null);
  const [resizingCardItem, setResizingCardItem] = useState<{ cardId: string; itemId: string; itemType: string; handle: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const [editingCardTextBox, setEditingCardTextBox] = useState<{ cardId: string; textBoxId: string } | null>(null);
  const [editingCardTextContent, setEditingCardTextContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isRemoteUpdate = useRef(false);
  const lastMousePos = useRef({ x: 500, y: 500 }); // Track mouse position for placing new items
  const [wrapperElement, setWrapperElement] = useState<HTMLDivElement | null>(null);

  // Callback ref to detect when wrapper is mounted
  const setWrapperRef = (element: HTMLDivElement | null) => {
    wrapperRef.current = element;
    if (element) {
      console.log('Wrapper element mounted');
      setWrapperElement(element);
    }
  };

  // Track which workspace we've auto-loaded for
  const loadedForWorkspaceId = useRef<string | null>(null);

  // Track if initial load is complete (to enable auto-save)
  const initialLoadComplete = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get file ID from any block ID
  const getFileIdFromBlockId = (id: string): string => {
    const analyzedImgMatch = id.match(/^analyzed-img-([a-zA-Z0-9]+)-\d+$/);
    const analyzedMatch = id.match(/^analyzed-([a-zA-Z0-9]+)-\d+$/);
    if (analyzedImgMatch) return analyzedImgMatch[1];
    if (analyzedMatch) return analyzedMatch[1];
    return id.replace(/-/g, '');
  };

  // Auto-save function - saves a single card to its markdown file
  const saveCardToFile = async (
    block: TextBlock | ShapeBlock,
    type: 'text' | 'shape',
    allConnections: Connection[],
    allTextBlocks: TextBlock[],
    allImageBlocks: ImageBlock[],
    allShapeBlocks: ShapeBlock[]
  ) => {
    if (!currentWorkspace?.projectFolder) return;

    // Extract the ORIGINAL file ID, stripping any "analyzed-" or "analyzed-img-" prefix
    // This ensures we update the original file instead of creating duplicates
    const fileId = getFileIdFromBlockId(block.id);
    const fileName = `IDEA-${fileId}.md`;

    // Find connections for this block
    const outgoingConnections = allConnections.filter(c => c.from === block.id);
    const incomingConnections = allConnections.filter(c => c.to === block.id);

    let content = '';
    if (type === 'text') {
      const textBlock = block as TextBlock;
      content = `# ${textBlock.cardName || 'Ideation Card'}\n\n`;
      content += `## Metadata\n`;
      content += `- **ID**: IDEA-${fileId}\n`;
      content += `- **Type**: Ideation Card\n`;
      content += `- **Created**: ${new Date().toISOString().split('T')[0]}\n`;
      content += `- **Workspace**: ${currentWorkspace?.name || 'Unknown'}\n`;
      if (textBlock.tags && textBlock.tags.length > 0) {
        content += `- **Tags**: ${textBlock.tags.join(', ')}\n`;
      }
      content += `- **Position**: (${Math.round(textBlock.x)}, ${Math.round(textBlock.y)})\n`;
      content += `- **Size**: ${Math.round(textBlock.width)} × ${Math.round(textBlock.height)}\n`;
      content += `\n## Description\n${textBlock.content || 'No description provided.'}\n`;
    } else {
      const shapeBlock = block as ShapeBlock;
      content = `# Shape: ${shapeBlock.type}\n\n`;
      content += `## Metadata\n`;
      content += `- **ID**: IDEA-${fileId}\n`;
      content += `- **Type**: Shape (${shapeBlock.type})\n`;
      content += `- **Created**: ${new Date().toISOString().split('T')[0]}\n`;
      content += `- **Workspace**: ${currentWorkspace?.name || 'Unknown'}\n`;
      if (shapeBlock.tags && shapeBlock.tags.length > 0) {
        content += `- **Tags**: ${shapeBlock.tags.join(', ')}\n`;
      }
      content += `\n## Properties\n`;
      content += `- **Shape Type**: ${shapeBlock.type}\n`;
      content += `- **Position**: (${Math.round(shapeBlock.x)}, ${Math.round(shapeBlock.y)})\n`;
      content += `- **Size**: ${Math.round(shapeBlock.width)} × ${Math.round(shapeBlock.height)}\n`;
      content += `- **Fill Color**: ${shapeBlock.fillColor}\n`;
      content += `- **Stroke Color**: ${shapeBlock.strokeColor}\n`;
      content += `- **Stroke Width**: ${shapeBlock.strokeWidth}px\n`;
    }

    // Add connections section
    if (outgoingConnections.length > 0 || incomingConnections.length > 0) {
      content += `\n## Connections\n`;

      if (outgoingConnections.length > 0) {
        content += `### Connected To\n`;
        outgoingConnections.forEach(conn => {
          const targetBlock = allTextBlocks.find(b => b.id === conn.to) ||
                              allImageBlocks.find(b => b.id === conn.to) ||
                              allShapeBlocks.find(b => b.id === conn.to);
          const targetName = targetBlock ? (('cardName' in targetBlock && targetBlock.cardName) || conn.to.substring(0, 8)) : conn.to.substring(0, 8);
          const targetId = getFileIdFromBlockId(conn.to);
          content += `- ${targetName} [ID: ${targetId}]\n`;
        });
        content += `\n`;
      }

      if (incomingConnections.length > 0) {
        content += `### Connected From\n`;
        incomingConnections.forEach(conn => {
          const sourceBlock = allTextBlocks.find(b => b.id === conn.from) ||
                              allImageBlocks.find(b => b.id === conn.from) ||
                              allShapeBlocks.find(b => b.id === conn.from);
          const sourceName = sourceBlock ? (('cardName' in sourceBlock && sourceBlock.cardName) || conn.from.substring(0, 8)) : conn.from.substring(0, 8);
          const sourceId = getFileIdFromBlockId(conn.from);
          content += `- ${sourceName} [ID: ${sourceId}]\n`;
        });
        content += `\n`;
      }
    }

    try {
      await fetch(`${SPEC_URL}/api/save-specifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: [{ fileName, content }],
          workspacePath: currentWorkspace.projectFolder,
          subfolder: 'conception'
        }),
      });
      console.log(`[Auto-save] Saved ${fileName}`);
    } catch (err) {
      console.warn(`[Auto-save] Failed to save ${fileName}:`, err);
    }
  };

  // Auto-save all cards when they change (debounced)
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
      console.log('[Auto-save] Saving all cards with connections...');

      // Save all text blocks with their connections
      for (const block of textBlocks) {
        await saveCardToFile(block, 'text', connections, textBlocks, imageBlocks, shapeBlocks);
      }

      // Save all shape blocks with their connections
      for (const block of shapeBlocks) {
        await saveCardToFile(block, 'shape', connections, textBlocks, imageBlocks, shapeBlocks);
      }

      console.log(`[Auto-save] Saved ${textBlocks.length} text cards, ${shapeBlocks.length} shapes, with ${connections.length} connections`);
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [textBlocks, shapeBlocks, connections, imageBlocks, currentWorkspace?.projectFolder]);

  // Load ideation data from workspace
  useEffect(() => {
    if (currentWorkspace?.ideation) {
      setTextBlocks(currentWorkspace.ideation.textBlocks || []);
      setImageBlocks(currentWorkspace.ideation.imageBlocks || []);
      setShapeBlocks(currentWorkspace.ideation.shapeBlocks || []);
      setConnections(currentWorkspace.ideation.connections || []);

      // Restore zoom level
      if (currentWorkspace.ideation.zoom !== undefined) {
        setZoom(currentWorkspace.ideation.zoom);
      }

      // Restore scroll position after a short delay to ensure DOM is ready
      if (currentWorkspace.ideation.scrollLeft !== undefined || currentWorkspace.ideation.scrollTop !== undefined) {
        setTimeout(() => {
          if (wrapperRef.current) {
            wrapperRef.current.scrollLeft = currentWorkspace.ideation?.scrollLeft || 0;
            wrapperRef.current.scrollTop = currentWorkspace.ideation?.scrollTop || 0;
          }
        }, 100);
      }
    } else {
      // Clear data if workspace has no ideation data
      setTextBlocks([]);
      setImageBlocks([]);
      setShapeBlocks([]);
      setConnections([]);
    }
  }, [currentWorkspace?.id]);

  // Auto-load from files when workspace changes (only once per workspace)
  useEffect(() => {
    if (currentWorkspace?.projectFolder && currentWorkspace?.id) {
      // Only auto-load if we haven't already loaded for this workspace
      if (loadedForWorkspaceId.current !== currentWorkspace.id) {
        loadedForWorkspaceId.current = currentWorkspace.id;
        initialLoadComplete.current = false; // Disable auto-save during load

        // Auto-load from markdown files - duplicate prevention is handled in handleAnalyzeIdeation
        setTimeout(async () => {
          console.log('[Ideation] Auto-loading from markdown files...');
          await handleAnalyzeIdeation(true); // Silent mode - don't show alerts

          // Enable auto-save after initial load completes
          setTimeout(() => {
            initialLoadComplete.current = true;
            console.log('[Ideation] Initial load complete, auto-save enabled');
          }, 500);
        }, 500);
      }
    }
  }, [currentWorkspace?.projectFolder, currentWorkspace?.id]);

  // Handle opening a specific item from URL parameter
  useEffect(() => {
    const openItem = searchParams.get('open');
    if (openItem && (textBlocks.length > 0 || imageBlocks.length > 0) && !selectedItemId) {
      // Extract IDEA ID from filename like "IDEA-123456.md"
      const ideaIdMatch = openItem.match(/IDEA-(\w+)/i);
      if (ideaIdMatch) {
        const ideaId = ideaIdMatch[1];
        // Find a text block with matching ID (blocks save with ID derived from block.id)
        const matchingTextBlock = textBlocks.find(block => {
          const blockIdClean = block.id.replace(/-/g, '');
          return blockIdClean.includes(ideaId) || ideaId.includes(blockIdClean.slice(-6));
        });

        if (matchingTextBlock) {
          setSelectedItemId(matchingTextBlock.id);
          setSelectedItemType('text');
          // Scroll to the block
          setTimeout(() => {
            if (wrapperRef.current) {
              wrapperRef.current.scrollLeft = Math.max(0, matchingTextBlock.x - 200);
              wrapperRef.current.scrollTop = Math.max(0, matchingTextBlock.y - 200);
            }
          }, 100);
        } else {
          // Try finding by cardName
          const matchByName = textBlocks.find(block =>
            block.cardName?.toLowerCase().includes(openItem.replace('.md', '').toLowerCase())
          );
          if (matchByName) {
            setSelectedItemId(matchByName.id);
            setSelectedItemType('text');
            setTimeout(() => {
              if (wrapperRef.current) {
                wrapperRef.current.scrollLeft = Math.max(0, matchByName.x - 200);
                wrapperRef.current.scrollTop = Math.max(0, matchByName.y - 200);
              }
            }, 100);
          }
        }
      }
      // Clear the search param after attempting to open
      setSearchParams({}, { replace: true });
    }
  }, [textBlocks, imageBlocks, searchParams, selectedItemId, setSearchParams]);

  // Save ideation data whenever blocks or zoom change
  useEffect(() => {
    if (!currentWorkspace || isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    const scrollLeft = wrapperRef.current?.scrollLeft || 0;
    const scrollTop = wrapperRef.current?.scrollTop || 0;

    const ideationData: IdeationData = {
      textBlocks,
      imageBlocks,
      shapeBlocks,
      connections,
      zoom,
      scrollLeft,
      scrollTop,
    };

    updateWorkspace(currentWorkspace.id, { ideation: ideationData });
    broadcastGridUpdate('ideation', ideationData);
  }, [textBlocks, imageBlocks, shapeBlocks, connections, zoom]);

  // Listen for remote grid updates
  useEffect(() => {
    const handleRemoteUpdate = (page: string, data: any) => {
      if (page === 'ideation' && data && currentWorkspace) {
        isRemoteUpdate.current = true;
        if (data.textBlocks) setTextBlocks(data.textBlocks);
        if (data.imageBlocks) setImageBlocks(data.imageBlocks);
        if (data.shapeBlocks) setShapeBlocks(data.shapeBlocks);
        if (data.connections) setConnections(data.connections);
      }
    };

    const unsubscribe = onGridUpdate(handleRemoteUpdate);
    return unsubscribe;
  }, [currentWorkspace, onGridUpdate]);

  // Join/leave workspace for collaboration
  useEffect(() => {
    if (currentWorkspace) {
      joinWorkspace(currentWorkspace.id, 'ideation');
      return () => leaveWorkspace(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

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

          const ideationData: IdeationData = {
            textBlocks,
            imageBlocks,
            shapeBlocks,
            connections,
            zoom,
            scrollLeft,
            scrollTop,
          };

          updateWorkspace(currentWorkspace.id, { ideation: ideationData });
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    };

    wrapperElement.addEventListener('scroll', handleScroll);

    return () => {
      wrapperElement.removeEventListener('scroll', handleScroll);
    };
  }, [wrapperElement, currentWorkspace, textBlocks, imageBlocks, shapeBlocks, connections, zoom]);

  const getConnectionPoints = (fromId: string, toId: string) => {
    // Find the block in all block types
    let fromBlock: any = textBlocks.find(b => b.id === fromId);
    let toBlock: any = textBlocks.find(b => b.id === toId);
    let fromType: 'text' | 'image' | 'shape' = 'text';
    let toType: 'text' | 'image' | 'shape' = 'text';

    if (!fromBlock) {
      fromBlock = imageBlocks.find(b => b.id === fromId);
      fromType = 'image';
    }
    if (!fromBlock) {
      fromBlock = shapeBlocks.find(b => b.id === fromId);
      fromType = 'shape';
    }

    if (!toBlock) {
      toBlock = imageBlocks.find(b => b.id === toId);
      toType = 'image';
    }
    if (!toBlock) {
      toBlock = shapeBlocks.find(b => b.id === toId);
      toType = 'shape';
    }

    if (!fromBlock || !toBlock) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

    // Get block dimensions based on type
    const fromWidth = fromBlock.width || 300;
    const fromHeight = fromBlock.height || 150;
    const toWidth = toBlock.width || 300;
    const toHeight = toBlock.height || 150;

    // Calculate centers (in unscaled coordinates)
    const fromCenterX = fromBlock.x + fromWidth / 2;
    const fromCenterY = fromBlock.y + fromHeight / 2;
    const toCenterX = toBlock.x + toWidth / 2;
    const toCenterY = toBlock.y + toHeight / 2;

    // Determine relative position
    const deltaX = toCenterX - fromCenterX;
    const deltaY = toCenterY - fromCenterY;

    let fromPoint = { x: 0, y: 0 };
    let toPoint = { x: 0, y: 0 };

    // If the target block is significantly below (vertical flow)
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 50) {
      // From: middle bottom of origin block
      fromPoint = { x: fromCenterX, y: fromBlock.y + fromHeight };
      // To: middle top of destination block
      toPoint = { x: toCenterX, y: toBlock.y };
    }
    // If the target block is significantly above (vertical flow upward)
    else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -50) {
      // From: middle top of origin block
      fromPoint = { x: fromCenterX, y: fromBlock.y };
      // To: middle bottom of destination block
      toPoint = { x: toCenterX, y: toBlock.y + toHeight };
    }
    // If the target block is to the right (horizontal flow)
    else if (deltaX > 0) {
      // From: middle right of origin block
      fromPoint = { x: fromBlock.x + fromWidth, y: fromCenterY };
      // To: middle left of destination block
      toPoint = { x: toBlock.x, y: toCenterY };
    }
    // If the target block is to the left (horizontal flow backward)
    else {
      // From: middle left of origin block
      fromPoint = { x: fromBlock.x, y: fromCenterY };
      // To: middle right of destination block
      toPoint = { x: toBlock.x + toWidth, y: toCenterY };
    }

    // Apply zoom scaling to the connection points
    return {
      from: { x: fromPoint.x * zoom, y: fromPoint.y * zoom },
      to: { x: toPoint.x * zoom, y: toPoint.y * zoom }
    };
  };

  const handleStartConnection = (blockId: string) => {
    setConnecting(blockId);
  };

  const handleDeleteConnection = (from: string, to: string) => {
    if (confirm('Delete this connection?')) {
      setConnections(connections.filter(c => !(c.from === from && c.to === to)));
    }
  };

  // Calculate the center of the visible viewport for placing new items
  const getVisibleCenter = () => {
    if (!wrapperRef.current) {
      return { x: 500, y: 500 }; // Fallback to default position
    }
    const wrapper = wrapperRef.current;
    const scrollLeft = wrapper.scrollLeft;
    const scrollTop = wrapper.scrollTop;
    const viewportWidth = wrapper.clientWidth;
    const viewportHeight = wrapper.clientHeight;

    // Calculate center of visible area in canvas coordinates (accounting for zoom)
    const centerX = (scrollLeft + viewportWidth / 2) / zoom;
    const centerY = (scrollTop + viewportHeight / 2) / zoom;

    return { x: centerX, y: centerY };
  };

  const handleAddTextBlock = () => {
    const center = getVisibleCenter();
    const newBlock: TextBlock = {
      id: 'text-' + Date.now(),
      content: 'Double-click to edit',
      x: center.x - 150, // Center in visible viewport
      y: center.y - 75,
      tags: [],
      width: 300,
      height: 150,
    };
    setTextBlocks([...textBlocks, newBlock]);
  };

  const handleAddHelperCard = (helperText: string) => {
    const center = getVisibleCenter();
    const newBlock: TextBlock = {
      id: 'text-' + Date.now(),
      content: helperText,
      x: center.x - 150, // Center in visible viewport
      y: center.y - 75,
      tags: [],
      width: 300,
      height: 150,
    };
    setTextBlocks([...textBlocks, newBlock]);
  };

  const handleExportToMarkdown = async () => {
    if (textBlocks.length === 0 && imageBlocks.length === 0 && shapeBlocks.length === 0) {
      alert('No cards to export. Add some cards to the ideation canvas first.');
      return;
    }

    try {
      // Generate IDEA-*.md files from text blocks and image files from image blocks
      const files = [];
      const images = [];

      // Process text blocks as markdown
      for (const block of textBlocks) {
        // Use full ID with hyphens replaced to ensure uniqueness
        const cardId = block.id.replace(/-/g, '');
        const fileName = `IDEA-${cardId}.md`;

        // Build markdown content
        let content = `# ${block.cardName || 'Ideation Card'}\n\n`;
        content += `## Metadata\n`;
        content += `- **ID**: IDEA-${cardId}\n`;
        content += `- **Type**: Ideation Card\n`;
        content += `- **Created**: ${new Date().toISOString().split('T')[0]}\n`;
        content += `- **Workspace**: ${currentWorkspace?.name || 'Unknown'}\n`;

        if (block.tags && block.tags.length > 0) {
          content += `- **Tags**: ${block.tags.join(', ')}\n`;
        }

        // Save dimensions and position
        content += `- **Position**: (${Math.round(block.x)}, ${Math.round(block.y)})\n`;
        content += `- **Size**: ${Math.round(block.width)} × ${Math.round(block.height)}\n`;
        content += `\n`;

        // Add main content
        content += `## Description\n`;
        content += `${block.content || 'No description provided.'}\n\n`;

        // Add text areas if present
        if (block.textAreas && block.textAreas.length > 0) {
          content += `## Additional Notes\n`;
          block.textAreas.forEach((text, index) => {
            content += `### Note ${index + 1}\n`;
            content += `${text}\n\n`;
          });
        }

        // Add text boxes if present
        if (block.textBoxes && block.textBoxes.length > 0) {
          content += `## Text Annotations\n`;
          block.textBoxes.forEach((textBox, index) => {
            content += `### Text Box ${index + 1}\n`;
            content += `- **Content**: ${textBox.content}\n`;
            content += `- **Position**: (${Math.round(textBox.x)}, ${Math.round(textBox.y)})\n`;
            content += `- **Size**: ${Math.round(textBox.width)} × ${Math.round(textBox.height)}\n`;
            if (textBox.fontSize) content += `- **Font Size**: ${textBox.fontSize}px\n`;
            content += `\n`;
          });
        }

        // Add shapes inside the card if present
        if (block.shapes && block.shapes.length > 0) {
          content += `## Card Shapes\n`;
          block.shapes.forEach((shape, index) => {
            content += `### Shape ${index + 1}\n`;
            content += `- **Type**: ${shape.type}\n`;
            content += `- **Position**: (${Math.round(shape.x)}, ${Math.round(shape.y)})\n`;
            content += `- **Size**: ${Math.round(shape.width)} × ${Math.round(shape.height)}\n`;
            if (shape.fillColor) content += `- **Fill Color**: ${shape.fillColor}\n`;
            if (shape.strokeColor) content += `- **Stroke Color**: ${shape.strokeColor}\n`;
            if (shape.strokeWidth) content += `- **Stroke Width**: ${shape.strokeWidth}px\n`;
            content += `\n`;
          });
        }

        // Add images if present
        if (block.images && block.images.length > 0) {
          content += `## Card Images\n`;
          block.images.forEach((image, index) => {
            content += `### Image ${index + 1}\n`;
            content += `- **URL**: ${image.url}\n`;
            content += `- **Position**: (${Math.round(image.x)}, ${Math.round(image.y)})\n`;
            content += `- **Size**: ${Math.round(image.width)} × ${Math.round(image.height)}\n`;
            content += `\n`;
          });
        }

        // Add assets if present
        if (block.assets && block.assets.length > 0) {
          content += `## Assets\n`;
          block.assets.forEach((asset) => {
            content += `- ${asset.name}: [View](${asset.url})\n`;
          });
          content += `\n`;
        }

        // Add connections
        const outgoingConnections = connections.filter(c => c.from === block.id);
        const incomingConnections = connections.filter(c => c.to === block.id);

        if (outgoingConnections.length > 0 || incomingConnections.length > 0) {
          content += `## Connections\n`;

          if (outgoingConnections.length > 0) {
            content += `### Connected To\n`;
            outgoingConnections.forEach(conn => {
              const targetBlock = textBlocks.find(b => b.id === conn.to) || imageBlocks.find(b => b.id === conn.to);
              const targetName = targetBlock ? (('cardName' in targetBlock && targetBlock.cardName) || conn.to.substring(0, 8)) : conn.to.substring(0, 8);
              const targetId = conn.to.replace(/-/g, '');
              content += `- ${targetName} [ID: ${targetId}]\n`;
            });
            content += `\n`;
          }

          if (incomingConnections.length > 0) {
            content += `### Connected From\n`;
            incomingConnections.forEach(conn => {
              const sourceBlock = textBlocks.find(b => b.id === conn.from) || imageBlocks.find(b => b.id === conn.from);
              const sourceName = sourceBlock ? (('cardName' in sourceBlock && sourceBlock.cardName) || conn.from.substring(0, 8)) : conn.from.substring(0, 8);
              const sourceId = conn.from.replace(/-/g, '');
              content += `- ${sourceName} [ID: ${sourceId}]\n`;
            });
            content += `\n`;
          }
        }

        files.push({ fileName, content });
      }

      // Process image blocks as actual images
      for (const block of imageBlocks) {
        // Use full ID with hyphens replaced to ensure uniqueness
        const cardId = block.id.replace(/-/g, '');

        // Determine file extension from image data
        let extension = 'png';
        if (block.imageUrl.startsWith('data:image/jpeg')) {
          extension = 'jpg';
        } else if (block.imageUrl.startsWith('data:image/jpg')) {
          extension = 'jpg';
        } else if (block.imageUrl.startsWith('data:image/gif')) {
          extension = 'gif';
        } else if (block.imageUrl.startsWith('data:image/webp')) {
          extension = 'webp';
        } else if (block.imageUrl.startsWith('data:image/svg')) {
          extension = 'svg';
        }

        const fileName = `IDEA-${cardId}.${extension}`;

        // Get connections for this image
        const outgoingConnections = connections.filter(c => c.from === block.id);
        const incomingConnections = connections.filter(c => c.to === block.id);

        const connectedTo = outgoingConnections.map(conn => {
          const targetBlock = textBlocks.find(b => b.id === conn.to) ||
                              imageBlocks.find(b => b.id === conn.to) ||
                              shapeBlocks.find(b => b.id === conn.to);
          return {
            id: conn.to.replace(/-/g, ''),
            name: targetBlock ? (('cardName' in targetBlock && targetBlock.cardName) || conn.to.substring(0, 8)) : conn.to.substring(0, 8)
          };
        });

        const connectedFrom = incomingConnections.map(conn => {
          const sourceBlock = textBlocks.find(b => b.id === conn.from) ||
                              imageBlocks.find(b => b.id === conn.from) ||
                              shapeBlocks.find(b => b.id === conn.from);
          return {
            id: conn.from.replace(/-/g, ''),
            name: sourceBlock ? (('cardName' in sourceBlock && sourceBlock.cardName) || conn.from.substring(0, 8)) : conn.from.substring(0, 8)
          };
        });

        // Add image data for saving
        images.push({
          fileName,
          data: block.imageUrl,
          tags: block.tags,
          textContent: block.textContent,
          cardName: block.cardName,
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
          connectedTo: connectedTo.length > 0 ? connectedTo : undefined,
          connectedFrom: connectedFrom.length > 0 ? connectedFrom : undefined
        });
      }

      // Process shape blocks as markdown documentation
      for (const block of shapeBlocks) {
        // Use full ID with hyphens replaced to ensure uniqueness
        const cardId = block.id.replace(/-/g, '');
        const fileName = `IDEA-${cardId}.md`;

        let content = `# Shape: ${block.type}\n\n`;
        content += `## Metadata\n`;
        content += `- **ID**: IDEA-${cardId}\n`;
        content += `- **Type**: Shape (${block.type})\n`;
        content += `- **Created**: ${new Date().toISOString().split('T')[0]}\n`;
        content += `- **Workspace**: ${currentWorkspace?.name || 'Unknown'}\n`;

        if (block.tags && block.tags.length > 0) {
          content += `- **Tags**: ${block.tags.join(', ')}\n`;
        }
        content += `\n`;

        // Add shape properties
        content += `## Properties\n`;
        content += `- **Shape Type**: ${block.type}\n`;
        content += `- **Position**: (${Math.round(block.x)}, ${Math.round(block.y)})\n`;
        content += `- **Size**: ${Math.round(block.width)} × ${Math.round(block.height)}\n`;
        content += `- **Fill Color**: ${block.fillColor}\n`;
        content += `- **Stroke Color**: ${block.strokeColor}\n`;
        content += `- **Stroke Width**: ${block.strokeWidth}px\n`;
        content += `\n`;

        // Add connections
        const outgoingConnections = connections.filter(c => c.from === block.id);
        const incomingConnections = connections.filter(c => c.to === block.id);

        if (outgoingConnections.length > 0 || incomingConnections.length > 0) {
          content += `## Connections\n`;

          if (outgoingConnections.length > 0) {
            content += `### Connected To\n`;
            outgoingConnections.forEach(conn => {
              const targetBlock = textBlocks.find(b => b.id === conn.to) ||
                                  imageBlocks.find(b => b.id === conn.to) ||
                                  shapeBlocks.find(b => b.id === conn.to);
              const targetName = targetBlock ? (('cardName' in targetBlock && targetBlock.cardName) || conn.to.substring(0, 8)) : conn.to.substring(0, 8);
              const targetId = conn.to.replace(/-/g, '');
              content += `- ${targetName} [ID: ${targetId}]\n`;
            });
            content += `\n`;
          }

          if (incomingConnections.length > 0) {
            content += `### Connected From\n`;
            incomingConnections.forEach(conn => {
              const sourceBlock = textBlocks.find(b => b.id === conn.from) ||
                                  imageBlocks.find(b => b.id === conn.from) ||
                                  shapeBlocks.find(b => b.id === conn.from);
              const sourceName = sourceBlock ? (('cardName' in sourceBlock && sourceBlock.cardName) || conn.from.substring(0, 8)) : conn.from.substring(0, 8);
              const sourceId = conn.from.replace(/-/g, '');
              content += `- ${sourceName} [ID: ${sourceId}]\n`;
            });
            content += `\n`;
          }
        }

        files.push({ fileName, content });
      }

      // Send to backend to save files in workspace conception folder
      const response = await fetch(`${SPEC_URL}/api/save-specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          images,
          workspacePath: currentWorkspace?.projectFolder,
          subfolder: 'conception'
        }),
      });

      const result = await response.json();

      if (result.success) {
        const totalCount = files.length + images.length;
        const shapeCount = shapeBlocks.length;
        const textCount = textBlocks.length;
        const imageCount = images.length;
        const pathInfo = result.path ? `\n\nFiles saved to:\n${result.path}` : '';

        console.log(`[Export] Exported ${files.length} markdown files:`, files.map(f => f.fileName));
        console.log(`[Export] Exported ${images.length} image files:`, images.map(i => i.fileName));

        alert(`Successfully exported ${totalCount} files (${textCount} text cards, ${imageCount} images, ${shapeCount} shapes) to the workspace specifications folder.${pathInfo}`);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAnalyzeIdeation = async (silent: boolean = false) => {
    try {
      // Read IDEA-*.md files from conception folder
      const response = await fetch(`${SPEC_URL}/api/read-specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace?.projectFolder,
          subfolder: 'conception'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        if (!silent) alert(`Failed to read specifications: ${result.error}`);
        console.log('[Ideation] Failed to read specifications:', result.error);
        return;
      }

      if (result.files.length === 0 && result.images.length === 0) {
        if (!silent) alert('No IDEA-* files found in conception folder.');
        console.log('[Ideation] No IDEA-* files found');
        return;
      }

      // Parse markdown files and create blocks
      const newTextBlocks: TextBlock[] = [];
      const newImageBlocks: ImageBlock[] = [];
      const newShapeBlocks: ShapeBlock[] = [];
      const newConnections: Connection[] = [];
      const idMap: Map<string, string> = new Map(); // Maps ID suffix to full block ID

      let xOffset = 50;
      let yOffset = 50;
      let blockCounter = 0; // Counter to ensure unique IDs

      // Helper function to extract ID from filename
      const extractIdFromFilename = (fileName: string) => {
        const match = fileName.match(/IDEA-([a-zA-Z0-9]+)/);
        return match ? match[1] : Date.now().toString(36);
      };

      // Helper function to parse tags from markdown
      const parseTags = (content: string): string[] => {
        const tagsMatch = content.match(/- \*\*Tags\*\*: (.+)/);
        if (tagsMatch) {
          return tagsMatch[1].split(',').map(t => t.trim());
        }
        return [];
      };

      // Parse markdown files
      for (const file of result.files) {
        const { fileName, content } = file;
        const idSuffix = extractIdFromFilename(fileName);
        const fullId = `analyzed-${idSuffix}-${blockCounter++}`;

        // Determine type from content
        const isShape = content.includes('**Type**: Shape');
        const isImageCard = content.includes('**Type**: Image Card');

        if (isShape) {
          // Parse shape properties
          const typeMatch = content.match(/# Shape: (\w+)/);
          const posMatch = content.match(/- \*\*Position\*\*: \((\d+), (\d+)\)/);
          const sizeMatch = content.match(/- \*\*Size\*\*: (\d+) × (\d+)/);
          const fillMatch = content.match(/- \*\*Fill Color\*\*: (.+)/);
          const strokeMatch = content.match(/- \*\*Stroke Color\*\*: (.+)/);
          const strokeWidthMatch = content.match(/- \*\*Stroke Width\*\*: (\d+)px/);

          const shapeType = (typeMatch ? typeMatch[1] : 'box') as 'box' | 'circle' | 'line' | 'square';
          const x = posMatch ? parseInt(posMatch[1]) : xOffset;
          const y = posMatch ? parseInt(posMatch[2]) : yOffset;
          const width = sizeMatch ? parseInt(sizeMatch[1]) : 150;
          const height = sizeMatch ? parseInt(sizeMatch[2]) : 150;

          newShapeBlocks.push({
            id: fullId,
            type: shapeType,
            x,
            y,
            width,
            height,
            fillColor: fillMatch ? fillMatch[1].trim() : '#47A8E5',
            strokeColor: strokeMatch ? strokeMatch[1].trim() : '#133A7C',
            strokeWidth: strokeWidthMatch ? parseInt(strokeWidthMatch[1]) : 2,
            tags: parseTags(content)
          });

          // Map ID suffix to full ID for connection restoration
          console.log(`[Ideation] Mapping idSuffix ${idSuffix} -> ${fullId}`);
          idMap.set(idSuffix, fullId);
        } else if (isImageCard) {
          // This is an image card but it's markdown, skip it if we have the actual image file
          continue;
        } else {
          // Parse text card
          const titleMatch = content.match(/# (.+)/);
          const descMatch = content.match(/## Description\n(.+?)(?=\n##|\n\n##|$)/s);

          // Parse saved position and size from metadata
          const posMatch = content.match(/- \*\*Position\*\*: \((-?\d+), (-?\d+)\)/);
          const sizeMatch = content.match(/- \*\*Size\*\*: (\d+) × (\d+)/);

          // Parse shapes inside the card
          const cardShapes: CardShape[] = [];
          const cardShapesSection = content.match(/## Card Shapes\n([\s\S]*?)(?=\n##|$)/);
          if (cardShapesSection) {
            const shapeBlocks = cardShapesSection[1].split(/### Shape \d+/);
            for (const shapeBlock of shapeBlocks) {
              if (!shapeBlock.trim()) continue;

              const shapeTypeMatch = shapeBlock.match(/- \*\*Type\*\*: (\w+)/);
              const shapePosMatch = shapeBlock.match(/- \*\*Position\*\*: \((\d+), (\d+)\)/);
              const shapeSizeMatch = shapeBlock.match(/- \*\*Size\*\*: (\d+) × (\d+)/);
              const shapeFillMatch = shapeBlock.match(/- \*\*Fill Color\*\*: (.+)/);
              const shapeStrokeMatch = shapeBlock.match(/- \*\*Stroke Color\*\*: (.+)/);
              const shapeStrokeWidthMatch = shapeBlock.match(/- \*\*Stroke Width\*\*: (\d+)px/);

              if (shapeTypeMatch) {
                cardShapes.push({
                  id: `card-shape-${blockCounter++}`,
                  type: shapeTypeMatch[1] as 'square' | 'circle' | 'line',
                  x: shapePosMatch ? parseInt(shapePosMatch[1]) : 50,
                  y: shapePosMatch ? parseInt(shapePosMatch[2]) : 50,
                  width: shapeSizeMatch ? parseInt(shapeSizeMatch[1]) : 100,
                  height: shapeSizeMatch ? parseInt(shapeSizeMatch[2]) : 100,
                  fillColor: shapeFillMatch ? shapeFillMatch[1].trim() : '#47A8E5',
                  strokeColor: shapeStrokeMatch ? shapeStrokeMatch[1].trim() : '#133A7C',
                  strokeWidth: shapeStrokeWidthMatch ? parseInt(shapeStrokeWidthMatch[1]) : 2
                });
              }
            }
          }

          newTextBlocks.push({
            id: fullId,
            content: descMatch ? descMatch[1].trim() : '',
            x: posMatch ? parseInt(posMatch[1]) : xOffset,
            y: posMatch ? parseInt(posMatch[2]) : yOffset,
            tags: parseTags(content),
            width: sizeMatch ? parseInt(sizeMatch[1]) : 300,
            height: sizeMatch ? parseInt(sizeMatch[2]) : 200,
            cardName: titleMatch ? titleMatch[1].trim() : 'Ideation Card',
            shapes: cardShapes.length > 0 ? cardShapes : undefined
          });

          // Map ID suffix to full ID for connection restoration
          console.log(`[Ideation] Mapping idSuffix ${idSuffix} -> ${fullId}`);
          idMap.set(idSuffix, fullId);
        }

        // Increment position for next card
        xOffset += 350;
        if (xOffset > 1400) {
          xOffset = 50;
          yOffset += 250;
        }
      }

      // Parse image files
      for (const imageFile of result.images) {
        const { fileName, data, metadata } = imageFile;
        const idSuffix = extractIdFromFilename(fileName);
        const fullId = `analyzed-img-${idSuffix}-${blockCounter++}`;

        newImageBlocks.push({
          id: fullId,
          imageUrl: data,
          x: metadata?.x || xOffset,
          y: metadata?.y || yOffset,
          tags: metadata?.tags || [],
          width: metadata?.width || 300,
          height: metadata?.height || 200,
          cardName: metadata?.cardName || undefined,
          textContent: metadata?.textContent || undefined
        });

        // Map ID suffix to full ID for connection restoration
        console.log(`[Ideation] Mapping image idSuffix ${idSuffix} -> ${fullId}`);
        idMap.set(idSuffix, fullId);

        // Increment position for next card (only if using default positioning)
        if (!metadata?.x && !metadata?.y) {
          xOffset += 350;
          if (xOffset > 1400) {
            xOffset = 50;
            yOffset += 250;
          }
        }

        // Parse connections from image metadata
        if (metadata?.connectedTo && Array.isArray(metadata.connectedTo)) {
          console.log(`[Ideation] Image ${fileName} has ${metadata.connectedTo.length} outgoing connections`);
          for (const target of metadata.connectedTo) {
            const targetId = idMap.get(target.id);
            console.log(`[Ideation] Image connection: target.id=${target.id}, targetId=${targetId}`);
            if (targetId) {
              newConnections.push({
                id: `conn-${blockCounter++}`,
                from: fullId,
                to: targetId
              });
              console.log(`[Ideation] Added image connection: ${fullId} -> ${targetId}`);
            }
          }
        }
      }

      // Second pass: Parse connections from markdown files
      console.log('[Ideation] ID Map:', Array.from(idMap.entries()));
      for (const file of result.files) {
        const { fileName, content } = file;
        const idSuffix = extractIdFromFilename(fileName);
        const sourceId = idMap.get(idSuffix);

        console.log(`[Ideation] Processing ${fileName}, idSuffix: ${idSuffix}, sourceId: ${sourceId}`);

        if (!sourceId) {
          console.log(`[Ideation] Skipping ${fileName} - no source ID found`);
          continue;
        }

        // Parse "Connected To" section
        const connectedToSection = content.match(/### Connected To\n([\s\S]*?)(?=\n###|\n##|$)/);
        if (connectedToSection) {
          console.log(`[Ideation] Found connections in ${fileName}`);
          const lines = connectedToSection[1].split('\n');
          for (const line of lines) {
            const match = line.match(/- .+ \[ID: ([a-zA-Z0-9]+)\]/);
            if (match) {
              const targetIdSuffix = match[1];
              const targetId = idMap.get(targetIdSuffix);
              console.log(`[Ideation] Connection line: ${line}, targetIdSuffix: ${targetIdSuffix}, targetId: ${targetId}`);
              if (targetId) {
                newConnections.push({
                  id: `conn-${blockCounter++}`,
                  from: sourceId,
                  to: targetId
                });
                console.log(`[Ideation] Added connection: ${sourceId} -> ${targetId}`);
              }
            }
          }
        }
      }

      // Update state with blocks from files
      // File versions have correct positions, so they should replace any existing blocks with the same file ID

      // Helper to extract file ID from block ID
      const getFileId = (id: string): string => {
        const imgMatch = id.match(/^analyzed-img-([a-zA-Z0-9]+)-\d+$/);
        const match = id.match(/^analyzed-([a-zA-Z0-9]+)-\d+$/);
        return imgMatch ? imgMatch[1] : match ? match[1] : id.replace(/-/g, '');
      };

      // Create maps of file ID -> new block from files (these have correct positions)
      const newTextBlockMap = new Map(newTextBlocks.map(b => [getFileId(b.id), b]));
      const newImageBlockMap = new Map(newImageBlocks.map(b => [getFileId(b.id), b]));
      const newShapeBlockMap = new Map(newShapeBlocks.map(b => [getFileId(b.id), b]));

      // Track which file IDs we've seen from existing blocks
      const seenTextFileIds = new Set<string>();
      const seenImageFileIds = new Set<string>();
      const seenShapeFileIds = new Set<string>();

      // Update existing blocks with file versions (to get correct positions), or keep as-is if no file version
      const updatedTextBlocks = textBlocks.map(b => {
        const fileId = getFileId(b.id);
        seenTextFileIds.add(fileId);
        const fileVersion = newTextBlockMap.get(fileId);
        // If file version exists, use it but preserve the original ID
        return fileVersion ? { ...fileVersion, id: b.id } : b;
      });
      const updatedImageBlocks = imageBlocks.map(b => {
        const fileId = getFileId(b.id);
        seenImageFileIds.add(fileId);
        const fileVersion = newImageBlockMap.get(fileId);
        return fileVersion ? { ...fileVersion, id: b.id } : b;
      });
      const updatedShapeBlocks = shapeBlocks.map(b => {
        const fileId = getFileId(b.id);
        seenShapeFileIds.add(fileId);
        const fileVersion = newShapeBlockMap.get(fileId);
        return fileVersion ? { ...fileVersion, id: b.id } : b;
      });

      // Add any new blocks from files that weren't in existing state
      const brandNewTextBlocks = newTextBlocks.filter(b => !seenTextFileIds.has(getFileId(b.id)));
      const brandNewImageBlocks = newImageBlocks.filter(b => !seenImageFileIds.has(getFileId(b.id)));
      const brandNewShapeBlocks = newShapeBlocks.filter(b => !seenShapeFileIds.has(getFileId(b.id)));

      console.log(`[Ideation] Setting state with ${newConnections.length} new connections:`, newConnections);
      console.log(`[Ideation] Updated existing: ${updatedTextBlocks.length} text, ${updatedImageBlocks.length} images, ${updatedShapeBlocks.length} shapes`);
      console.log(`[Ideation] Brand new: ${brandNewTextBlocks.length} text, ${brandNewImageBlocks.length} images, ${brandNewShapeBlocks.length} shapes`);

      setTextBlocks([...updatedTextBlocks, ...brandNewTextBlocks]);
      setImageBlocks([...updatedImageBlocks, ...brandNewImageBlocks]);
      setShapeBlocks([...updatedShapeBlocks, ...brandNewShapeBlocks]);

      // Update connections
      if (brandNewTextBlocks.length > 0 || brandNewImageBlocks.length > 0 || brandNewShapeBlocks.length > 0) {
        setConnections([...connections, ...newConnections]);
      }

      const totalLoaded = brandNewTextBlocks.length + brandNewImageBlocks.length + brandNewShapeBlocks.length;
      if (!silent && totalLoaded > 0) {
        alert(`Loaded ${totalLoaded} new items from specifications folder:\n- ${brandNewTextBlocks.length} text cards\n- ${brandNewImageBlocks.length} images\n- ${brandNewShapeBlocks.length} shapes\n- ${newConnections.length} connections\n\nFrom: ${result.path}`);
      }

    } catch (err) {
      console.error('Analysis error:', err);
      alert(`Failed to load specifications: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSelectAsset = async (file: any) => {
    console.log('[Ideation] Selected asset:', file);

    // For Figma files, we need to use the thumbnail_url (not url which is the Figma file link)
    let imageUrl = '';
    if (file.thumbnail_url) {
      imageUrl = file.thumbnail_url;
      console.log('[Ideation] Using thumbnail_url:', imageUrl);
    } else if (file.url && (file.url.startsWith('data:') || file.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i))) {
      // Use URL only if it's a data URL or has an image extension
      imageUrl = file.url;
      console.log('[Ideation] Using url as image:', imageUrl);
    } else {
      console.warn('[Ideation] No valid image URL found for file:', file);
      imageUrl = file.url || '';
    }

    // Try to fetch the image and convert to data URL to avoid CORS/referrer issues
    let finalImageUrl = imageUrl;
    if (imageUrl && !imageUrl.startsWith('data:')) {
      try {
        console.log('[Ideation] Fetching image to convert to data URL...');
        const response = await fetch(imageUrl, {
          method: 'GET',
          referrerPolicy: 'no-referrer',
          mode: 'cors'
        });

        if (response.ok) {
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          finalImageUrl = dataUrl;
          console.log('[Ideation] Successfully converted image to data URL');
        } else {
          console.warn('[Ideation] Failed to fetch image, using original URL:', response.status);
        }
      } catch (err) {
        console.warn('[Ideation] Failed to convert image to data URL, using original URL:', err);
      }
    }

    const center = getVisibleCenter();
    const newBlock: ImageBlock = {
      id: 'image-' + Date.now(),
      imageUrl: finalImageUrl,
      x: center.x - 150, // Center in visible viewport
      y: center.y - 100,
      tags: [],
      width: 300,
      height: 200,
      metadata: {
        sourceFile: file,
        fileName: file.name,
        fileType: file.type,
        originalUrl: imageUrl
      }
    };

    console.log('[Ideation] Created image block:', newBlock);
    setImageBlocks([...imageBlocks, newBlock]);
    setShowAssetsPane(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const center = getVisibleCenter();
      const newBlock: ImageBlock = {
        id: 'image-' + Date.now(),
        imageUrl: reader.result as string,
        x: center.x - 150, // Center in visible viewport
        y: center.y - 150,
        tags: [],
        width: 300,
        height: 300,
      };
      setImageBlocks([...imageBlocks, newBlock]);
    };
    reader.readAsDataURL(file);
  };

  const handleAddImageToCard = (cardId: string, cardType: 'text' | 'image') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;

        if (cardType === 'text') {
          const newImage: CardImage = {
            id: 'card-img-' + Date.now(),
            url: imageUrl,
            x: 10, // Default position within card
            y: 60,
            width: 120,
            height: 120,
          };

          setTextBlocks(textBlocks.map(block =>
            block.id === cardId
              ? { ...block, images: [...(block.images || []), newImage] }
              : block
          ));
        } else if (cardType === 'image') {
          setImageBlocks(imageBlocks.map(block =>
            block.id === cardId
              ? { ...block, additionalImages: [...(block.additionalImages || []), imageUrl] }
              : block
          ));
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAddShapeToCard = (cardId: string, shapeType: 'square' | 'circle' | 'line') => {
    const newShape: CardShape = {
      id: 'card-shape-' + Date.now(),
      type: shapeType,
      x: 10,
      y: 60,
      width: shapeType === 'line' ? 100 : 80,
      height: shapeType === 'line' ? 2 : 80,
      fillColor: shapeType === 'line' ? 'transparent' : '#E3F2FD',
      strokeColor: '#007AFF',
      strokeWidth: 2,
    };

    setTextBlocks(textBlocks.map(block =>
      block.id === cardId
        ? { ...block, shapes: [...(block.shapes || []), newShape] }
        : block
    ));
  };

  const handleAddTextBoxToCard = (cardId: string) => {
    const newTextBox: CardTextBox = {
      id: 'card-text-' + Date.now(),
      content: 'Double-click to edit',
      x: 10,
      y: 60,
      width: 150,
      height: 60,
      fontSize: 14,
    };

    setTextBlocks(textBlocks.map(block =>
      block.id === cardId
        ? { ...block, textBoxes: [...(block.textBoxes || []), newTextBox] }
        : block
    ));
  };

  const handleAddAssetToCard = (cardId: string) => {
    setShowAssetsPane(true);
    // Store the card ID for when an asset is selected
    (window as any).pendingCardAssetTarget = cardId;
  };

  const handleAddShape = (shapeType: 'box' | 'circle' | 'line' | 'square') => {
    const width = shapeType === 'square' ? 150 : shapeType === 'line' ? 200 : 200;
    const height = shapeType === 'square' ? 150 : shapeType === 'line' ? 3 : 150;
    const center = getVisibleCenter();

    const newShape: ShapeBlock = {
      id: 'shape-' + Date.now(),
      type: shapeType,
      x: center.x - width / 2, // Center in visible viewport
      y: center.y - height / 2,
      width,
      height,
      fillColor: shapeType === 'line' ? 'transparent' : 'rgba(0, 122, 255, 0.1)',
      strokeColor: '#007AFF',
      strokeWidth: 2,
      tags: [],
      curveControlX: shapeType === 'line' ? 0 : undefined,
      curveControlY: shapeType === 'line' ? 0 : undefined,
    };
    setShapeBlocks([...shapeBlocks, newShape]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if clicking on canvas background (not on an object)
    const isBackground = e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('ideation-canvas-inner');

    if (isBackground) {
      // Deselect any selected items when clicking on canvas background
      setSelectedItemId(null);
      setSelectedItemType(null);
      setShowInlineToolbar(null);
      setSelectedCardImage(null);
      setSelectedCardItem(null);
      setEditingCardTextBox(null);

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

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = document.getElementById('ideation-canvas');
    const wrapper = canvasRef.current?.parentElement;

    if (canvas && wrapper) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
      const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;
      updateCursor(mouseX, mouseY, 'ideation');
      // Track mouse position for placing new items
      lastMousePos.current = { x: mouseX, y: mouseY };
    }

    if (isPanning && wrapper) {
      wrapper.scrollLeft = panStart.x - e.clientX;
      wrapper.scrollTop = panStart.y - e.clientY;
    }

    if (draggingItem) {
      if (!canvas || !wrapper) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
      const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;

      if (draggingItem.type === 'text') {
        setTextBlocks(textBlocks.map(block =>
          block.id === draggingItem.id
            ? { ...block, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y }
            : block
        ));
      } else if (draggingItem.type === 'image') {
        setImageBlocks(imageBlocks.map(block =>
          block.id === draggingItem.id
            ? { ...block, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y }
            : block
        ));
      } else if (draggingItem.type === 'shape') {
        setShapeBlocks(shapeBlocks.map(block =>
          block.id === draggingItem.id
            ? { ...block, x: mouseX - dragOffset.x, y: mouseY - dragOffset.y }
            : block
        ));
      }
    }

    // Handle dragging card images
    if (draggingCardImage) {
      const newX = (e.clientX - draggingCardImage.offsetX) / zoom;
      const newY = (e.clientY - draggingCardImage.offsetY) / zoom;

      setTextBlocks(textBlocks.map(block =>
        block.id === draggingCardImage.cardId
          ? {
              ...block,
              images: block.images?.map(img =>
                img.id === draggingCardImage.imageId
                  ? { ...img, x: newX, y: newY }
                  : img
              )
            }
          : block
      ));
    }

    // Handle resizing card images
    if (resizingCardImage) {
      const deltaX = (e.clientX - resizingCardImage.startX) / zoom;
      const deltaY = (e.clientY - resizingCardImage.startY) / zoom;

      setTextBlocks(textBlocks.map(block =>
        block.id === resizingCardImage.cardId
          ? {
              ...block,
              images: block.images?.map(img => {
                if (img.id === resizingCardImage.imageId) {
                  let newWidth = resizingCardImage.startWidth;
                  let newHeight = resizingCardImage.startHeight;

                  switch (resizingCardImage.handle) {
                    case 'se':
                      newWidth = Math.max(30, resizingCardImage.startWidth + deltaX);
                      newHeight = Math.max(30, resizingCardImage.startHeight + deltaY);
                      break;
                    case 'sw':
                      newWidth = Math.max(30, resizingCardImage.startWidth - deltaX);
                      newHeight = Math.max(30, resizingCardImage.startHeight + deltaY);
                      break;
                    case 'ne':
                      newWidth = Math.max(30, resizingCardImage.startWidth + deltaX);
                      newHeight = Math.max(30, resizingCardImage.startHeight - deltaY);
                      break;
                    case 'nw':
                      newWidth = Math.max(30, resizingCardImage.startWidth - deltaX);
                      newHeight = Math.max(30, resizingCardImage.startHeight - deltaY);
                      break;
                  }

                  return { ...img, width: newWidth, height: newHeight };
                }
                return img;
              })
            }
          : block
      ));
    }

    // Handle dragging card items (shapes, textBoxes, assets)
    if (draggingCardItem) {
      const newX = (e.clientX - draggingCardItem.offsetX) / zoom;
      const newY = (e.clientY - draggingCardItem.offsetY) / zoom;

      setTextBlocks(textBlocks.map(block => {
        if (block.id !== draggingCardItem.cardId) return block;

        if (draggingCardItem.itemType === 'shape') {
          return {
            ...block,
            shapes: block.shapes?.map(item =>
              item.id === draggingCardItem.itemId ? { ...item, x: newX, y: newY } : item
            )
          };
        } else if (draggingCardItem.itemType === 'textBox') {
          return {
            ...block,
            textBoxes: block.textBoxes?.map(item =>
              item.id === draggingCardItem.itemId ? { ...item, x: newX, y: newY } : item
            )
          };
        } else if (draggingCardItem.itemType === 'asset') {
          return {
            ...block,
            assets: block.assets?.map(item =>
              item.id === draggingCardItem.itemId ? { ...item, x: newX, y: newY } : item
            )
          };
        }
        return block;
      }));
    }

    // Handle resizing card items
    if (resizingCardItem) {
      const deltaX = (e.clientX - resizingCardItem.startX) / zoom;
      const deltaY = (e.clientY - resizingCardItem.startY) / zoom;

      setTextBlocks(textBlocks.map(block => {
        if (block.id !== resizingCardItem.cardId) return block;

        const updateSize = (item: any) => {
          if (item.id !== resizingCardItem.itemId) return item;

          let newWidth = resizingCardItem.startWidth;
          let newHeight = resizingCardItem.startHeight;

          switch (resizingCardItem.handle) {
            case 'se':
              newWidth = Math.max(30, resizingCardItem.startWidth + deltaX);
              newHeight = Math.max(30, resizingCardItem.startHeight + deltaY);
              break;
            case 'sw':
              newWidth = Math.max(30, resizingCardItem.startWidth - deltaX);
              newHeight = Math.max(30, resizingCardItem.startHeight + deltaY);
              break;
            case 'ne':
              newWidth = Math.max(30, resizingCardItem.startWidth + deltaX);
              newHeight = Math.max(30, resizingCardItem.startHeight - deltaY);
              break;
            case 'nw':
              newWidth = Math.max(30, resizingCardItem.startWidth - deltaX);
              newHeight = Math.max(30, resizingCardItem.startHeight - deltaY);
              break;
          }

          return { ...item, width: newWidth, height: newHeight };
        };

        if (resizingCardItem.itemType === 'shape') {
          return { ...block, shapes: block.shapes?.map(updateSize) };
        } else if (resizingCardItem.itemType === 'textBox') {
          return { ...block, textBoxes: block.textBoxes?.map(updateSize) };
        } else if (resizingCardItem.itemType === 'asset') {
          return { ...block, assets: block.assets?.map(updateSize) };
        }
        return block;
      }));
    }

    if (resizingItem) {
      if (!canvas || !wrapper) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
      const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;

      const deltaX = mouseX - resizeStart.x;
      const deltaY = mouseY - resizeStart.y;

      if (resizingItem.type === 'text') {
        setTextBlocks(textBlocks.map(block => {
          if (block.id !== resizingItem.id) return block;
          return handleResize(block, resizingItem.handle, deltaX, deltaY, resizeStart);
        }));
      } else if (resizingItem.type === 'image') {
        setImageBlocks(imageBlocks.map(block => {
          if (block.id !== resizingItem.id) return block;
          return handleResize(block, resizingItem.handle, deltaX, deltaY, resizeStart);
        }));
      } else if (resizingItem.type === 'shape') {
        setShapeBlocks(shapeBlocks.map(block => {
          if (block.id !== resizingItem.id) return block;
          return handleResize(block, resizingItem.handle, deltaX, deltaY, resizeStart);
        }));
      }
    }
  };

  const handleResize = (block: any, handle: string, deltaX: number, deltaY: number, start: any) => {
    let newWidth = start.width;
    let newHeight = start.height;
    let newX = block.x;
    let newY = block.y;

    switch (handle) {
      case 'se': // bottom-right
        newWidth = Math.max(50, start.width + deltaX);
        newHeight = Math.max(50, start.height + deltaY);
        break;
      case 'sw': // bottom-left
        newWidth = Math.max(50, start.width - deltaX);
        newHeight = Math.max(50, start.height + deltaY);
        newX = start.x - (newWidth - start.width);
        break;
      case 'ne': // top-right
        newWidth = Math.max(50, start.width + deltaX);
        newHeight = Math.max(50, start.height - deltaY);
        newY = start.y - (newHeight - start.height);
        break;
      case 'nw': // top-left
        newWidth = Math.max(50, start.width - deltaX);
        newHeight = Math.max(50, start.height - deltaY);
        newX = start.x - (newWidth - start.width);
        newY = start.y - (newHeight - start.height);
        break;
      case 'e': // right edge
        newWidth = Math.max(50, start.width + deltaX);
        break;
      case 'w': // left edge
        newWidth = Math.max(50, start.width - deltaX);
        newX = start.x - (newWidth - start.width);
        break;
      case 'n': // top edge
        newHeight = Math.max(50, start.height - deltaY);
        newY = start.y - (newHeight - start.height);
        break;
      case 's': // bottom edge
        newHeight = Math.max(50, start.height + deltaY);
        break;
    }

    return { ...block, width: newWidth, height: newHeight, x: newX, y: newY };
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingItem(null);
    setResizingItem(null);
    setDraggingCardImage(null);
    setResizingCardImage(null);
    setDraggingCardItem(null);
    setResizingCardItem(null);
    // Restore cursor back to grab
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  const handleBlockMouseDown = (e: React.MouseEvent, type: BlockType, id: string, block: any) => {
    if (editingTextId === id) return;
    e.stopPropagation();

    // Check if in connecting mode
    if (connecting) {
      // Prevent connecting a block to itself
      if (connecting !== id) {
        // Check for duplicate connections
        const duplicate = connections.find(c => c.from === connecting && c.to === id);
        if (!duplicate) {
          setConnections([...connections, { from: connecting, to: id }]);
        }
      }
      setConnecting(null);
      return;
    }

    const canvas = document.getElementById('ideation-canvas');
    if (!canvas) return;

    const wrapper = canvas.parentElement;
    if (!wrapper) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
    const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;

    setDragOffset({
      x: mouseX - block.x,
      y: mouseY - block.y,
    });
    setDraggingItem({ type, id });
    setSelectedItemId(id);
    setSelectedItemType(type);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, type: BlockType, id: string, handle: string, block: any) => {
    e.stopPropagation();

    const canvas = document.getElementById('ideation-canvas');
    if (!canvas) return;

    const wrapper = canvas.parentElement;
    if (!wrapper) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
    const mouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;

    setResizingItem({ type, id, handle });
    setResizeStart({ x: mouseX, y: mouseY, width: block.width, height: block.height });
  };

  const handleTextBlockDoubleClick = (block: TextBlock) => {
    setShowInlineToolbar(block.id);
    setSelectedItemId(block.id);
    setSelectedItemType('text');
  };

  const handleTextContentDoubleClick = (e: React.MouseEvent, block: TextBlock) => {
    e.stopPropagation();
    setEditingTextId(block.id);
    setEditingContent(block.content);
  };

  const handleImageBlockDoubleClick = (block: ImageBlock) => {
    setShowInlineToolbar(block.id);
    setSelectedItemId(block.id);
    setSelectedItemType('image');
  };

  const handleShapeBlockDoubleClick = (block: ShapeBlock) => {
    setShowInlineToolbar(block.id);
    setSelectedItemId(block.id);
    setSelectedItemType('shape');
  };

  const handleTextEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingContent(e.target.value);
  };

  const handleTextEditBlur = () => {
    if (editingTextId) {
      setTextBlocks(textBlocks.map(block =>
        block.id === editingTextId
          ? { ...block, content: editingContent }
          : block
      ));
      setEditingTextId(null);
    }
  };

  const handleCardTextBoxEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingCardTextContent(e.target.value);
  };

  const handleCardTextBoxBlur = () => {
    if (editingCardTextBox) {
      setTextBlocks(textBlocks.map(block =>
        block.id === editingCardTextBox.cardId
          ? {
              ...block,
              textBoxes: block.textBoxes?.map(textBox =>
                textBox.id === editingCardTextBox.textBoxId
                  ? { ...textBox, content: editingCardTextContent }
                  : textBox
              )
            }
          : block
      ));
      setEditingCardTextBox(null);
    }
  };

  const handleAddTag = (id: string, type: BlockType, tag?: string) => {
    const tagToAdd = tag || tagInput.trim();
    if (!tagToAdd) return;

    if (type === 'text') {
      setTextBlocks(textBlocks.map(block =>
        block.id === id
          ? { ...block, tags: [...block.tags, tagToAdd] }
          : block
      ));
    } else if (type === 'image') {
      setImageBlocks(imageBlocks.map(block =>
        block.id === id
          ? { ...block, tags: [...block.tags, tagToAdd] }
          : block
      ));
    } else if (type === 'shape') {
      setShapeBlocks(shapeBlocks.map(block =>
        block.id === id
          ? { ...block, tags: [...block.tags, tagToAdd] }
          : block
      ));
    }

    if (!tag) setTagInput('');
  };

  const handleRemoveTag = (id: string, type: BlockType, tag: string) => {
    if (type === 'text') {
      setTextBlocks(textBlocks.map(block =>
        block.id === id
          ? { ...block, tags: block.tags.filter(t => t !== tag) }
          : block
      ));
    } else if (type === 'image') {
      setImageBlocks(imageBlocks.map(block =>
        block.id === id
          ? { ...block, tags: block.tags.filter(t => t !== tag) }
          : block
      ));
    } else if (type === 'shape') {
      setShapeBlocks(shapeBlocks.map(block =>
        block.id === id
          ? { ...block, tags: block.tags.filter(t => t !== tag) }
          : block
      ));
    }
  };

  const handleDeleteItem = async (id: string, type: BlockType) => {
    if (confirm('Delete this item?')) {
      // Extract the original file ID from the block ID
      // Imported blocks have format: "analyzed-{originalId}-{counter}" or "analyzed-img-{originalId}-{counter}"
      // Original blocks have format: "uuid-with-hyphens"
      let fileId: string;

      // Check if this is an imported block
      const analyzedImgMatch = id.match(/^analyzed-img-([a-zA-Z0-9]+)-\d+$/);
      const analyzedMatch = id.match(/^analyzed-([a-zA-Z0-9]+)-\d+$/);

      if (analyzedImgMatch) {
        // Imported image block: extract the original ID (already hyphen-free)
        fileId = analyzedImgMatch[1];
      } else if (analyzedMatch) {
        // Imported text/shape block: extract the original ID (already hyphen-free)
        fileId = analyzedMatch[1];
      } else {
        // Original block: remove hyphens from UUID
        fileId = id.replace(/-/g, '');
      }

      let fileName = `IDEA-${fileId}.md`;

      // For image blocks, determine the correct extension
      if (type === 'image') {
        const imageBlock = imageBlocks.find(b => b.id === id);
        if (imageBlock?.imageUrl) {
          let extension = 'png';
          if (imageBlock.imageUrl.startsWith('data:image/jpeg') || imageBlock.imageUrl.startsWith('data:image/jpg')) {
            extension = 'jpg';
          } else if (imageBlock.imageUrl.startsWith('data:image/gif')) {
            extension = 'gif';
          } else if (imageBlock.imageUrl.startsWith('data:image/webp')) {
            extension = 'webp';
          } else if (imageBlock.imageUrl.startsWith('data:image/svg')) {
            extension = 'svg';
          }
          fileName = `IDEA-${fileId}.${extension}`;
        }
      }

      // Try to delete the corresponding markdown file from the conception folder
      if (currentWorkspace?.projectFolder) {
        try {
          const response = await fetch(`${SPEC_URL}/api/delete-specification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName,
              workspacePath: currentWorkspace.projectFolder,
              subfolder: 'conception'
            }),
          });

          const result = await response.json();
          if (result.success) {
            console.log(`[Delete] Deleted file: ${fileName}`);
          } else if (response.status !== 404) {
            // Only log non-404 errors (file not existing is okay)
            console.warn(`[Delete] Could not delete file: ${result.error}`);
          }

          // For image blocks, also try to delete the companion metadata JSON file
          if (type === 'image') {
            const metadataFileName = `IDEA-${fileId}.json`;
            await fetch(`${SPEC_URL}/api/delete-specification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: metadataFileName,
                workspacePath: currentWorkspace.projectFolder,
                subfolder: 'conception'
              }),
            }).catch(() => {}); // Silently ignore if metadata file doesn't exist
          }
        } catch (err) {
          console.warn('[Delete] Could not delete specification file:', err);
          // Continue with UI deletion even if file deletion fails
        }
      }

      // Remove from UI state
      if (type === 'text') {
        setTextBlocks(textBlocks.filter(b => b.id !== id));
      } else if (type === 'image') {
        setImageBlocks(imageBlocks.filter(b => b.id !== id));
      } else if (type === 'shape') {
        setShapeBlocks(shapeBlocks.filter(b => b.id !== id));
      }
      // Delete all connections related to this block
      setConnections(connections.filter(c => c.from !== id && c.to !== id));
      setShowActionMenu(null);
      setSelectedItemId(null);
      setSelectedItemType(null);
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

  const renderResizeHandles = (id: string, type: BlockType, block: any) => {
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    return handles.map(handle => (
      <div
        key={handle}
        className={`resize-handle resize-handle-${handle}`}
        onMouseDown={(e) => handleResizeMouseDown(e, type, id, handle, block)}
      />
    ));
  };

  if (!currentWorkspace) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Ideation Canvas</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>Please select a workspace to start ideating.</p>
      </div>
    );
  }

  return (
    <PageLayout
      title="Ideation Canvas"
      quickDescription="Freeform whiteboard for your ideas"
      detailedDescription="In Intent-Centered Engineering, ideation is the creative exploration phase where raw ideas are captured, organized, and refined before formal specification. This freeform canvas allows you to brainstorm features, sketch user flows, and collaborate on concepts without constraints. The ideas captured here feed directly into your storyboards and capabilities, ensuring that innovation drives your development process from the very beginning."
      fullWidth
    >
      <div className="ideation-container">
        {/* Header */}
        <div className="ideation-header">
          <div style={{ width: '100%' }}>
            <div className="ideation-controls">
            <Button variant="primary" onClick={handleAddTextBlock}>
              ⊞ Add Card
            </Button>
            <Button variant="primary" onClick={handleAddTextBlock}>
              ✎ Add Text
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => handleImageUpload(e as any);
                input.click();
              }}
            >
              ⊕ Add Image
            </Button>
            <Button variant="primary" onClick={() => setShowAssetsPane(!showAssetsPane)}>
              📁 Add UI Assets
            </Button>
            <Button variant="secondary" onClick={handleExportToMarkdown}>
              📤 Export to Markdown
            </Button>
            {connecting && (
              <Button variant="outline" onClick={() => setConnecting(null)}>
                ✕ Cancel Connection
              </Button>
            )}
            </div>
          </div>
        </div>

        {/* Text Helper Toolbar */}
        <div className="helper-toolbar">
          <div className="helper-toolbar-label">Quick Templates:</div>
          <button onClick={() => handleAddHelperCard('What is the idea?')} className="helper-btn">
            💡 What is the idea?
          </button>
          <button onClick={() => handleAddHelperCard('What is the problem/challenge?')} className="helper-btn">
            ⚠️ What is the problem/challenge?
          </button>
          <button onClick={() => handleAddHelperCard('What is the solution?')} className="helper-btn">
            ✨ What is the solution?
          </button>
          <button onClick={() => handleAddHelperCard('What is the value to user?')} className="helper-btn">
            ⭐ What is the value to user?
          </button>
        </div>

        {/* Main Canvas */}
        <div className="ideation-layout">
          <div
            className={`ideation-canvas-wrapper ${isFullscreen ? 'fullscreen' : ''}`}
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
              <button
                className="draw-control-btn"
                onClick={() => handleAddShape('box')}
                title="Add Box"
              >
                ▭
              </button>
              <button
                className="draw-control-btn"
                onClick={() => handleAddShape('square')}
                title="Add Square"
              >
                ◻
              </button>
              <button
                className="draw-control-btn"
                onClick={() => handleAddShape('circle')}
                title="Add Circle"
              >
                ◯
              </button>
              <button
                className="draw-control-btn"
                onClick={() => handleAddShape('line')}
                title="Add Line"
              >
                ─
              </button>
            </div>

            <div
              id="ideation-canvas"
              ref={canvasRef}
              className={`ideation-canvas ${connecting ? 'connecting' : ''}`}
              style={{
                width: `${10000 * zoom}px`,
                height: `${20000 * zoom}px`,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                className="ideation-canvas-inner"
              >
                <RemoteCursors page="ideation" />

                {/* Connections SVG */}
                <svg
                  className="connections-svg"
                  style={{ position: 'absolute', top: 0, left: 0, width: '10000px', height: '10000px', pointerEvents: 'none' }}
                >
                  {connections.map((conn, idx) => {
                    const { from, to } = getConnectionPoints(conn.from, conn.to);

                    // Find the blocks to determine edge directions
                    let fromBlock: any = textBlocks.find(b => b.id === conn.from);
                    let toBlock: any = textBlocks.find(b => b.id === conn.to);

                    if (!fromBlock) fromBlock = imageBlocks.find(b => b.id === conn.from);
                    if (!fromBlock) fromBlock = shapeBlocks.find(b => b.id === conn.from);
                    if (!toBlock) toBlock = imageBlocks.find(b => b.id === conn.to);
                    if (!toBlock) toBlock = shapeBlocks.find(b => b.id === conn.to);

                    if (!fromBlock || !toBlock) return null;

                    // Get block dimensions
                    const fromWidth = fromBlock.width || 300;
                    const fromHeight = fromBlock.height || 150;
                    const toWidth = toBlock.width || 300;
                    const toHeight = toBlock.height || 150;

                    // Determine which edge each connection point is on
                    const fromCenterX = fromBlock.x + fromWidth / 2;
                    const fromCenterY = fromBlock.y + fromHeight / 2;
                    const toCenterX = toBlock.x + toWidth / 2;
                    const toCenterY = toBlock.y + toHeight / 2;

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

                    return (
                      <g key={idx}>
                        <path
                          d={pathData}
                          stroke="var(--color-systemBlue)"
                          strokeWidth="2"
                          fill="none"
                          markerEnd="url(#arrowhead)"
                          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConnection(conn.from, conn.to);
                          }}
                        />
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
                  </defs>
                </svg>

                {/* Text Blocks */}
                {textBlocks.map(block => (
                  <div
                    key={block.id}
                    className={`text-block ${selectedItemId === block.id ? 'selected' : ''}`}
                    style={{
                      left: block.x * zoom,
                      top: block.y * zoom,
                      width: block.width * zoom,
                      height: block.height * zoom,
                    }}
                    onMouseDown={(e) => handleBlockMouseDown(e, 'text', block.id, block)}
                    onDoubleClick={() => handleTextBlockDoubleClick(block)}
                  >
                    {/* Action Menu Button */}
                    <div className="block-actions">
                      <button
                        className="action-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionMenu(showActionMenu === block.id ? null : block.id);
                        }}
                      >
                        ⋯
                      </button>
                      {showActionMenu === block.id && (
                        <div className="action-menu">
                          <button onClick={(e) => {
                            e.stopPropagation();
                            handleStartConnection(block.id);
                            setShowActionMenu(null);
                          }}>
                            {connecting === block.id ? '✕ Cancel' : '🔗 Connect'}
                          </button>
                          <button onClick={() => {
                            const cardName = prompt('Enter card name:', block.cardName || '');
                            if (cardName !== null) {
                              setTextBlocks(textBlocks.map(b =>
                                b.id === block.id ? { ...b, cardName: cardName.trim() || undefined } : b
                              ));
                            }
                            setShowActionMenu(null);
                          }}>📝 Card Name</button>
                          <button onClick={() => handleDeleteItem(block.id, 'text')}>🗑 Delete</button>
                          <button onClick={() => {
                            setShowActionMenu(null);
                            setSelectedItemId(block.id);
                            setSelectedItemType('text');
                          }}>🏷 Tags</button>
                        </div>
                      )}
                    </div>

                    {/* Card Name Display */}
                    {block.cardName && (
                      <div
                        className="card-name-header"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          padding: `${6 * zoom}px ${12 * zoom}px`,
                          backgroundColor: 'var(--color-primary, #1e3a8a)',
                          color: '#FFFFFF',
                          fontSize: `${12 * zoom}px`,
                          fontWeight: 600,
                          borderTopLeftRadius: `${8 * zoom}px`,
                          borderTopRightRadius: `${8 * zoom}px`,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          zIndex: 1,
                        }}
                      >
                        {block.cardName}
                      </div>
                    )}

                    <>
                      {editingTextId === block.id ? (
                        <textarea
                          className="text-block-textarea"
                          value={editingContent}
                          onChange={handleTextEdit}
                          onBlur={handleTextEditBlur}
                          autoFocus
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            outline: 'none',
                            resize: 'none',
                            padding: `${12 * zoom}px`,
                            paddingTop: block.cardName ? `${32 * zoom}px` : `${12 * zoom}px`,
                            fontSize: `${15 * zoom}px`,
                            fontFamily: 'inherit',
                            backgroundColor: 'transparent',
                          }}
                        />
                      ) : (
                        <div
                          className="text-block-content"
                          style={{
                            fontSize: `${15 * zoom}px`,
                            padding: `${12 * zoom}px`,
                            paddingTop: block.cardName ? `${32 * zoom}px` : `${12 * zoom}px`,
                          }}
                          onDoubleClick={(e) => handleTextContentDoubleClick(e, block)}
                        >
                          {block.content}
                        </div>
                      )}

                      {/* Images attached to this card */}
                      {block.images && block.images.length > 0 && (
                        <>
                          {block.images.map((image) => (
                            <div
                              key={image.id}
                              className={`card-image-wrapper ${selectedCardImage?.imageId === image.id ? 'selected' : ''}`}
                              style={{
                                position: 'absolute',
                                left: image.x * zoom,
                                top: image.y * zoom,
                                width: image.width * zoom,
                                height: image.height * zoom,
                                cursor: 'move',
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardImage({ cardId: block.id, imageId: image.id });
                              }}
                              onMouseDown={(e) => {
                                if (e.button === 0 && selectedCardImage?.imageId === image.id) {
                                  e.stopPropagation();
                                  setDraggingCardImage({
                                    cardId: block.id,
                                    imageId: image.id,
                                    offsetX: e.clientX - image.x * zoom,
                                    offsetY: e.clientY - image.y * zoom,
                                  });
                                }
                              }}
                            >
                              <img
                                src={image.url}
                                alt="Card image"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  pointerEvents: 'none',
                                  userSelect: 'none',
                                }}
                              />
                              {selectedCardImage?.imageId === image.id && (
                                <>
                                  {/* Resize handles */}
                                  {['nw', 'ne', 'se', 'sw'].map((handle) => (
                                    <div
                                      key={handle}
                                      className={`card-image-resize-handle card-image-resize-${handle}`}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setResizingCardImage({
                                          cardId: block.id,
                                          imageId: image.id,
                                          handle,
                                          startX: e.clientX,
                                          startY: e.clientY,
                                          startWidth: image.width,
                                          startHeight: image.height,
                                        });
                                      }}
                                    />
                                  ))}
                                </>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {/* Shapes attached to this card */}
                      {block.shapes && block.shapes.length > 0 && (
                        <>
                          {block.shapes.map((shape) => (
                            <div
                              key={shape.id}
                              className={`card-item-wrapper ${selectedCardItem?.itemId === shape.id ? 'selected' : ''}`}
                              style={{
                                position: 'absolute',
                                left: shape.x * zoom,
                                top: shape.y * zoom,
                                width: shape.width * zoom,
                                height: shape.height * zoom,
                                cursor: 'move',
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardItem({ cardId: block.id, itemId: shape.id, itemType: 'shape' });
                              }}
                              onMouseDown={(e) => {
                                if (e.button === 0 && selectedCardItem?.itemId === shape.id) {
                                  e.stopPropagation();
                                  setDraggingCardItem({
                                    cardId: block.id,
                                    itemId: shape.id,
                                    itemType: 'shape',
                                    offsetX: e.clientX - shape.x * zoom,
                                    offsetY: e.clientY - shape.y * zoom,
                                  });
                                }
                              }}
                            >
                              <svg width="100%" height="100%">
                                {shape.type === 'square' && (
                                  <rect
                                    width="100%"
                                    height="100%"
                                    fill={shape.fillColor}
                                    stroke={shape.strokeColor}
                                    strokeWidth={shape.strokeWidth}
                                  />
                                )}
                                {shape.type === 'circle' && (
                                  <ellipse
                                    cx="50%"
                                    cy="50%"
                                    rx="45%"
                                    ry="45%"
                                    fill={shape.fillColor}
                                    stroke={shape.strokeColor}
                                    strokeWidth={shape.strokeWidth}
                                  />
                                )}
                                {shape.type === 'line' && (
                                  <line
                                    x1="0"
                                    y1="50%"
                                    x2="100%"
                                    y2="50%"
                                    stroke={shape.strokeColor}
                                    strokeWidth={shape.strokeWidth}
                                  />
                                )}
                              </svg>
                              {selectedCardItem?.itemId === shape.id && (
                                <>
                                  {['nw', 'ne', 'se', 'sw'].map((handle) => (
                                    <div
                                      key={handle}
                                      className={`card-image-resize-handle card-image-resize-${handle}`}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setResizingCardItem({
                                          cardId: block.id,
                                          itemId: shape.id,
                                          itemType: 'shape',
                                          handle,
                                          startX: e.clientX,
                                          startY: e.clientY,
                                          startWidth: shape.width,
                                          startHeight: shape.height,
                                        });
                                      }}
                                    />
                                  ))}
                                </>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {/* Text boxes attached to this card */}
                      {block.textBoxes && block.textBoxes.length > 0 && (
                        <>
                          {block.textBoxes.map((textBox) => {
                            const isEditing = editingCardTextBox?.cardId === block.id && editingCardTextBox?.textBoxId === textBox.id;
                            const isSelected = selectedCardItem?.itemId === textBox.id;
                            return (
                              <div
                                key={textBox.id}
                                className={`card-item-wrapper ${isSelected ? 'selected' : ''}`}
                                style={{
                                  position: 'absolute',
                                  left: textBox.x * zoom,
                                  top: textBox.y * zoom,
                                  width: textBox.width * zoom,
                                  height: textBox.height * zoom,
                                  padding: '4px',
                                  fontSize: (textBox.fontSize || 14) * zoom,
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  backgroundColor: 'white',
                                  overflow: 'auto',
                                  cursor: isEditing ? 'text' : 'move',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isEditing) {
                                    setEditingCardTextBox({ cardId: block.id, textBoxId: textBox.id });
                                    setEditingCardTextContent(textBox.content);
                                  }
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCardItem({ cardId: block.id, itemId: textBox.id, itemType: 'textBox' });
                                  setEditingCardTextBox(null);
                                }}
                                onMouseDown={(e) => {
                                  if (!isEditing && e.button === 0 && isSelected) {
                                    e.stopPropagation();
                                    setDraggingCardItem({
                                      cardId: block.id,
                                      itemId: textBox.id,
                                      itemType: 'textBox',
                                      offsetX: e.clientX - textBox.x * zoom,
                                      offsetY: e.clientY - textBox.y * zoom,
                                    });
                                  }
                                }}
                              >
                                {isEditing ? (
                                  <textarea
                                    value={editingCardTextContent}
                                    onChange={handleCardTextBoxEdit}
                                    onBlur={handleCardTextBoxBlur}
                                    autoFocus
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      border: 'none',
                                      outline: 'none',
                                      resize: 'none',
                                      fontSize: 'inherit',
                                      fontFamily: 'inherit',
                                      backgroundColor: 'transparent',
                                      padding: 0,
                                    }}
                                  />
                                ) : (
                                  textBox.content
                                )}
                                {selectedCardItem?.itemId === textBox.id && !isEditing && (
                                  <>
                                    {['nw', 'ne', 'se', 'sw'].map((handle) => (
                                      <div
                                        key={handle}
                                        className={`card-image-resize-handle card-image-resize-${handle}`}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          setResizingCardItem({
                                            cardId: block.id,
                                            itemId: textBox.id,
                                            itemType: 'textBox',
                                            handle,
                                            startX: e.clientX,
                                            startY: e.clientY,
                                            startWidth: textBox.width,
                                            startHeight: textBox.height,
                                          });
                                        }}
                                      />
                                    ))}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Assets attached to this card */}
                      {block.assets && block.assets.length > 0 && (
                        <>
                          {block.assets.map((asset) => (
                            <div
                              key={asset.id}
                              className={`card-item-wrapper ${selectedCardItem?.itemId === asset.id ? 'selected' : ''}`}
                              style={{
                                position: 'absolute',
                                left: asset.x * zoom,
                                top: asset.y * zoom,
                                width: asset.width * zoom,
                                height: asset.height * zoom,
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                overflow: 'hidden',
                                cursor: 'move',
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardItem({ cardId: block.id, itemId: asset.id, itemType: 'asset' });
                              }}
                              onMouseDown={(e) => {
                                if (e.button === 0 && selectedCardItem?.itemId === asset.id) {
                                  e.stopPropagation();
                                  setDraggingCardItem({
                                    cardId: block.id,
                                    itemId: asset.id,
                                    itemType: 'asset',
                                    offsetX: e.clientX - asset.x * zoom,
                                    offsetY: e.clientY - asset.y * zoom,
                                  });
                                }
                              }}
                            >
                              {asset.thumbnail_url && (
                                <img
                                  src={asset.thumbnail_url}
                                  alt={asset.name}
                                  style={{
                                    width: '100%',
                                    height: 'calc(100% - 20px)',
                                    objectFit: 'cover',
                                    pointerEvents: 'none',
                                  }}
                                />
                              )}
                              <div style={{
                                fontSize: 10 * zoom,
                                padding: '2px',
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {asset.name}
                              </div>
                              {selectedCardItem?.itemId === asset.id && (
                                <>
                                  {['nw', 'ne', 'se', 'sw'].map((handle) => (
                                    <div
                                      key={handle}
                                      className={`card-image-resize-handle card-image-resize-${handle}`}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setResizingCardItem({
                                          cardId: block.id,
                                          itemId: asset.id,
                                          itemType: 'asset',
                                          handle,
                                          startX: e.clientX,
                                          startY: e.clientY,
                                          startWidth: asset.width,
                                          startHeight: asset.height,
                                        });
                                      }}
                                    />
                                  ))}
                                </>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {block.tags.length > 0 && (
                        <div className="text-block-tags">
                          {block.tags.map(tag => (
                            <span key={tag} className="tag">
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(block.id, 'text', tag)}
                                className="tag-remove"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Inline Toolbar */}
                      {showInlineToolbar === block.id && (
                        <div className="inline-toolbar" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="inline-toolbar-btn"
                            onClick={() => {
                              const tag = prompt('Enter tag:');
                              if (tag) handleAddTag(block.id, 'text', tag);
                            }}
                          >
                            🏷 Tag
                          </button>
                          <button
                            className="inline-toolbar-btn"
                            onClick={() => handleAddImageToCard(block.id, 'text')}
                          >
                            📷 Image
                          </button>
                          <button
                            className="inline-toolbar-btn"
                            onClick={() => handleAddShapeToCard(block.id, 'square')}
                          >
                            ◻ Square
                          </button>
                          <button
                            className="inline-toolbar-btn"
                            onClick={() => handleAddShapeToCard(block.id, 'circle')}
                          >
                            ◯ Circle
                          </button>
                          <button
                            className="inline-toolbar-btn"
                            onClick={() => handleAddShapeToCard(block.id, 'line')}
                          >
                            ─ Line
                          </button>
                          <button
                            className="inline-toolbar-btn"
                            onClick={() => handleAddTextBoxToCard(block.id)}
                          >
                            ✎ Text
                          </button>
                          <button
                            className="inline-toolbar-btn"
                            onClick={() => handleAddAssetToCard(block.id)}
                          >
                            📁 Asset
                          </button>
                          <button
                            className="inline-toolbar-btn inline-toolbar-btn-close"
                            onClick={() => setShowInlineToolbar(null)}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </>

                    {selectedItemId === block.id && !editingTextId && renderResizeHandles(block.id, 'text', block)}
                  </div>
                ))}

                {/* Image Blocks */}
                {imageBlocks.map(block => (
                  <div
                    key={block.id}
                    className={`image-block ${selectedItemId === block.id ? 'selected' : ''}`}
                    style={{
                      left: block.x * zoom,
                      top: block.y * zoom,
                      width: block.width * zoom,
                      height: block.height * zoom,
                    }}
                    onMouseDown={(e) => handleBlockMouseDown(e, 'image', block.id, block)}
                    onDoubleClick={() => handleImageBlockDoubleClick(block)}
                  >
                    {/* Action Menu Button */}
                    <div className="block-actions">
                      <button
                        className="action-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionMenu(showActionMenu === block.id ? null : block.id);
                        }}
                      >
                        ⋯
                      </button>
                      {showActionMenu === block.id && (
                        <div className="action-menu">
                          <button onClick={(e) => {
                            e.stopPropagation();
                            handleStartConnection(block.id);
                            setShowActionMenu(null);
                          }}>
                            {connecting === block.id ? '✕ Cancel' : '🔗 Connect'}
                          </button>
                          <button onClick={() => {
                            const cardName = prompt('Enter card name:', block.cardName || '');
                            if (cardName !== null) {
                              setImageBlocks(imageBlocks.map(b =>
                                b.id === block.id ? { ...b, cardName: cardName.trim() || undefined } : b
                              ));
                            }
                            setShowActionMenu(null);
                          }}>📝 Card Name</button>
                          <button onClick={() => handleDeleteItem(block.id, 'image')}>🗑 Delete</button>
                          <button onClick={() => {
                            setShowActionMenu(null);
                            setSelectedItemId(block.id);
                            setSelectedItemType('image');
                          }}>🏷 Tags</button>
                        </div>
                      )}
                    </div>

                    {/* Card Name Display */}
                    {block.cardName && (
                      <div
                        className="card-name-header"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: `${28 * zoom}px`,
                          backgroundColor: 'rgba(59, 130, 246, 0.9)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: `${13 * zoom}px`,
                          fontWeight: 600,
                          borderTopLeftRadius: `${8 * zoom}px`,
                          borderTopRightRadius: `${8 * zoom}px`,
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}
                      >
                        {block.cardName}
                      </div>
                    )}

                    <img
                      src={block.imageUrl}
                      alt={block.metadata?.fileName || "Idea"}
                      className="image-block-img"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.error('[Ideation] Image failed to load:', {
                          url: block.imageUrl,
                          metadata: block.metadata,
                          blockId: block.id
                        });

                        // Check if this is a Figma thumbnail that might have expired
                        if (block.imageUrl.includes('figma.com')) {
                          console.warn('[Ideation] Figma thumbnail may have expired. URL:', block.imageUrl);
                        }

                        // Replace with placeholder on error - show filename if available
                        const fileName = block.metadata?.fileName || 'Unknown';
                        const placeholderSvg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="200" fill="#f5f5f5"/><text x="50%" y="40%" font-family="sans-serif" font-size="14" fill="#999" text-anchor="middle" dy=".3em">Image not available</text><text x="50%" y="60%" font-family="sans-serif" font-size="10" fill="#aaa" text-anchor="middle" dy=".3em">${fileName}</text></svg>`;
                        e.currentTarget.src = 'data:image/svg+xml;base64,' + btoa(placeholderSvg);
                        e.currentTarget.style.objectFit = 'contain';
                      }}
                      onLoad={() => {
                        console.log('[Ideation] Image loaded successfully:', block.imageUrl);
                      }}
                    />
                    {block.tags.length > 0 && (
                      <div className="image-block-tags">
                        {block.tags.map(tag => (
                          <span key={tag} className="tag">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(block.id, 'image', tag)}
                              className="tag-remove"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Inline Toolbar */}
                    {showInlineToolbar === block.id && (
                      <div className="inline-toolbar" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="inline-toolbar-btn"
                          onClick={() => {
                            const tag = prompt('Enter tag:');
                            if (tag) handleAddTag(block.id, 'image', tag);
                          }}
                        >
                          🏷 Add Tag
                        </button>
                        <button
                          className="inline-toolbar-btn"
                          onClick={() => handleAddImageToCard(block.id, 'image')}
                        >
                          📷 Add Image
                        </button>
                        <button
                          className="inline-toolbar-btn inline-toolbar-btn-close"
                          onClick={() => setShowInlineToolbar(null)}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {selectedItemId === block.id && renderResizeHandles(block.id, 'image', block)}
                  </div>
                ))}

                {/* Shape Blocks */}
                {shapeBlocks.map(block => (
                  <div
                    key={block.id}
                    className={`shape-block ${selectedItemId === block.id ? 'selected' : ''}`}
                    style={{
                      left: block.x * zoom,
                      top: block.y * zoom,
                      width: block.width * zoom,
                      height: block.height * zoom,
                      position: 'absolute',
                    }}
                    onMouseDown={(e) => handleBlockMouseDown(e, 'shape', block.id, block)}
                  >
                    {/* Action Menu Button */}
                    <div className="block-actions">
                      <button
                        className="action-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActionMenu(showActionMenu === block.id ? null : block.id);
                        }}
                      >
                        ⋯
                      </button>
                      {showActionMenu === block.id && (
                        <div className="action-menu">
                          <button onClick={(e) => {
                            e.stopPropagation();
                            handleStartConnection(block.id);
                            setShowActionMenu(null);
                          }}>
                            {connecting === block.id ? '✕ Cancel' : '🔗 Connect'}
                          </button>
                          <button onClick={() => handleDeleteItem(block.id, 'shape')}>🗑 Delete</button>
                          <button onClick={() => {
                            setShowActionMenu(null);
                            setSelectedItemId(block.id);
                            setSelectedItemType('shape');
                          }}>🏷 Tags</button>
                        </div>
                      )}
                    </div>

                    <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                      {block.type === 'box' && (
                        <rect
                          x="0"
                          y="0"
                          width="100%"
                          height="100%"
                          fill={block.fillColor}
                          stroke={block.strokeColor}
                          strokeWidth={block.strokeWidth}
                        />
                      )}
                      {block.type === 'square' && (
                        <rect
                          x="0"
                          y="0"
                          width="100%"
                          height="100%"
                          fill={block.fillColor}
                          stroke={block.strokeColor}
                          strokeWidth={block.strokeWidth}
                        />
                      )}
                      {block.type === 'circle' && (
                        <ellipse
                          cx="50%"
                          cy="50%"
                          rx="50%"
                          ry="50%"
                          fill={block.fillColor}
                          stroke={block.strokeColor}
                          strokeWidth={block.strokeWidth}
                        />
                      )}
                      {block.type === 'line' && (
                        <>
                          <path
                            d={`M 0 ${block.height / 2} Q ${block.width / 2 + (block.curveControlX || 0)} ${block.height / 2 + (block.curveControlY || 0)} ${block.width} ${block.height / 2}`}
                            fill="none"
                            stroke={block.strokeColor}
                            strokeWidth={block.strokeWidth}
                          />
                          {/* Control point handle for curving the line */}
                          {selectedItemId === block.id && (
                            <circle
                              cx={block.width / 2 + (block.curveControlX || 0)}
                              cy={block.height / 2 + (block.curveControlY || 0)}
                              r="6"
                              fill="white"
                              stroke="#007AFF"
                              strokeWidth="2"
                              style={{ cursor: 'move' }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const canvas = document.getElementById('ideation-canvas');
                                if (!canvas) return;
                                const wrapper = canvas.parentElement;
                                if (!wrapper) return;
                                const rect = canvas.getBoundingClientRect();
                                const startMouseX = (e.clientX - rect.left + wrapper.scrollLeft) / zoom;
                                const startMouseY = (e.clientY - rect.top + wrapper.scrollTop) / zoom;
                                const startControlX = block.curveControlX || 0;
                                const startControlY = block.curveControlY || 0;

                                const handleCurveMove = (moveEvent: MouseEvent) => {
                                  const currentMouseX = (moveEvent.clientX - rect.left + wrapper.scrollLeft) / zoom;
                                  const currentMouseY = (moveEvent.clientY - rect.top + wrapper.scrollTop) / zoom;
                                  const deltaX = currentMouseX - startMouseX;
                                  const deltaY = currentMouseY - startMouseY;

                                  setShapeBlocks(shapeBlocks.map(b =>
                                    b.id === block.id
                                      ? { ...b, curveControlX: startControlX + deltaX, curveControlY: startControlY + deltaY }
                                      : b
                                  ));
                                };

                                const handleCurveUp = () => {
                                  document.removeEventListener('mousemove', handleCurveMove);
                                  document.removeEventListener('mouseup', handleCurveUp);
                                };

                                document.addEventListener('mousemove', handleCurveMove);
                                document.addEventListener('mouseup', handleCurveUp);
                              }}
                            />
                          )}
                        </>
                      )}
                    </svg>

                    {block.tags.length > 0 && (
                      <div className="shape-block-tags">
                        {block.tags.map(tag => (
                          <span key={tag} className="tag">
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(block.id, 'shape', tag)}
                              className="tag-remove"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedItemId === block.id && renderResizeHandles(block.id, 'shape', block)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        /* Apple HIG Ideation Canvas */
        .ideation-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--color-systemBackground);
        }

        .ideation-header {
          display: flex;
          flex-direction: column;
          padding: var(--spacing-6, 24px);
          background: var(--color-systemBackground);
          border-bottom: 1px solid var(--color-systemGray5);
        }

        .ideation-controls {
          display: flex;
          gap: var(--spacing-3, 12px);
          flex-wrap: wrap;
        }

        .helper-toolbar {
          display: flex;
          align-items: center;
          gap: var(--spacing-3, 12px);
          padding: var(--spacing-4, 16px) var(--spacing-6, 24px);
          background: var(--color-systemGray6);
          border-bottom: 1px solid var(--color-systemGray5);
          overflow-x: auto;
        }

        .helper-toolbar-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-secondaryLabel);
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .helper-btn {
          padding: var(--spacing-2, 8px) var(--spacing-4, 16px);
          background: var(--color-systemBackground);
          color: var(--color-label);
          border: 1px solid var(--color-systemGray4);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: var(--spacing-2, 8px);
        }

        .helper-btn:hover {
          background: var(--color-systemBlue);
          color: white;
          border-color: var(--color-systemBlue);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
        }

        .helper-btn:active {
          transform: translateY(0);
          box-shadow: 0 1px 4px rgba(0, 122, 255, 0.2);
        }

        .ideation-layout {
          flex: 1;
          display: flex;
          overflow: hidden;
          min-height: 0;
          max-height: 100%;
        }

        .ideation-canvas-wrapper {
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

        .ideation-canvas-wrapper.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          z-index: 9999;
          background: var(--color-systemBackground);
        }


        .ideation-canvas {
          display: block;
          cursor: grab;
          position: relative;
          touch-action: none;
          background: var(--color-systemBackground);
        }

        .ideation-canvas:active {
          cursor: grabbing;
        }

        .ideation-canvas-inner {
          width: 100%;
          height: 100%;
          position: relative;
        }

        /* Blocks */
        .text-block, .image-block, .shape-block {
          position: absolute;
          cursor: move;
          transition: box-shadow 0.15s ease, transform 0.15s ease;
        }

        /* Connecting mode cursor */
        .ideation-canvas.connecting {
          cursor: crosshair !important;
        }

        .ideation-canvas.connecting .text-block,
        .ideation-canvas.connecting .image-block,
        .ideation-canvas.connecting .shape-block {
          cursor: crosshair !important;
        }

        .ideation-canvas.connecting .text-block:hover,
        .ideation-canvas.connecting .image-block:hover,
        .ideation-canvas.connecting .shape-block:hover {
          transform: scale(1.02);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.4);
        }

        .text-block {
          background: var(--color-systemYellow-opacity-10, rgba(255, 214, 10, 0.15));
          border: 2px solid var(--color-systemYellow);
          border-radius: 12px;
          padding: var(--spacing-4, 16px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .text-block:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .text-block.selected {
          border-color: var(--color-systemBlue);
          background: var(--color-systemBlue-opacity-10, rgba(0, 122, 255, 0.1));
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
        }

        .text-block-content {
          font-size: 15px;
          line-height: 1.5;
          color: var(--color-label);
          white-space: pre-wrap;
          word-wrap: break-word;
          min-height: 40px;
        }

        .card-image-wrapper, .card-item-wrapper {
          border: 2px solid transparent;
          transition: border-color 0.2s;
        }

        .card-image-wrapper.selected, .card-item-wrapper.selected {
          border: 2px solid var(--color-systemBlue);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
        }

        .card-image-resize-handle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: white;
          border: 2px solid var(--color-systemBlue);
          border-radius: 50%;
          z-index: 10;
        }

        .card-image-resize-nw {
          top: -5px;
          left: -5px;
          cursor: nw-resize;
        }

        .card-image-resize-ne {
          top: -5px;
          right: -5px;
          cursor: ne-resize;
        }

        .card-image-resize-se {
          bottom: -5px;
          right: -5px;
          cursor: se-resize;
        }

        .card-image-resize-sw {
          bottom: -5px;
          left: -5px;
          cursor: sw-resize;
        }

        .text-block-editor {
          width: 100%;
          min-height: 100px;
          border: none;
          background: transparent;
          font-size: 15px;
          line-height: 1.5;
          color: var(--color-label);
          resize: none;
          outline: none;
          font-family: inherit;
        }

        .image-block {
          background: var(--color-systemBackground);
          border: 2px solid var(--color-systemGray4);
          border-radius: 12px;
          padding: var(--spacing-2, 8px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .image-block:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .image-block.selected {
          border-color: var(--color-systemBlue);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
        }

        .image-block-img {
          width: 100%;
          height: calc(100% - 40px);
          object-fit: cover;
          border-radius: 8px;
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }

        .shape-block {
          border: 2px solid transparent;
        }

        .shape-block.selected {
          border-color: var(--color-systemBlue);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
        }

        /* Block Actions */
        .block-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10;
        }

        .action-menu-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: var(--color-systemBackground);
          color: var(--color-label);
          font-size: 18px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .action-menu-btn:hover {
          background: var(--color-systemGray5);
          transform: scale(1.1);
        }

        .action-menu {
          position: absolute;
          top: 32px;
          right: 0;
          background: var(--color-systemBackground);
          border: 1px solid var(--color-systemGray5);
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          min-width: 120px;
        }

        .action-menu button {
          display: block;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: transparent;
          text-align: left;
          font-size: 14px;
          color: var(--color-label);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .action-menu button:hover {
          background: var(--color-systemGray6);
        }

        /* Resize Handles */
        .resize-handle {
          position: absolute;
          background: var(--color-systemBlue);
          border: 2px solid white;
          border-radius: 50%;
          width: 12px;
          height: 12px;
          z-index: 20;
        }

        .resize-handle-nw {
          top: -6px;
          left: -6px;
          cursor: nw-resize;
        }

        .resize-handle-n {
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          cursor: n-resize;
        }

        .resize-handle-ne {
          top: -6px;
          right: -6px;
          cursor: ne-resize;
        }

        .resize-handle-e {
          top: 50%;
          right: -6px;
          transform: translateY(-50%);
          cursor: e-resize;
        }

        .resize-handle-se {
          bottom: -6px;
          right: -6px;
          cursor: se-resize;
        }

        .resize-handle-s {
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          cursor: s-resize;
        }

        .resize-handle-sw {
          bottom: -6px;
          left: -6px;
          cursor: sw-resize;
        }

        .resize-handle-w {
          top: 50%;
          left: -6px;
          transform: translateY(-50%);
          cursor: w-resize;
        }

        /* Tags */
        .text-block-tags,
        .image-block-tags,
        .shape-block-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-2, 8px);
          margin-top: var(--spacing-3, 12px);
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-1, 4px);
          padding: 4px var(--spacing-2, 8px);
          background: var(--color-systemBlue);
          color: white;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .tag-remove {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          font-size: 12px;
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

        .ideation-canvas-wrapper.fullscreen .draw-controls-toolbar {
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

        .inline-toolbar {
          position: absolute;
          bottom: -50px;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid var(--color-separator);
          border-radius: 8px;
          padding: var(--spacing-2, 8px);
          display: flex;
          gap: var(--spacing-2, 8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
        }

        .inline-toolbar-btn {
          padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
          background: var(--color-systemGray6);
          border: 1px solid var(--color-separator);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .inline-toolbar-btn:hover {
          background: var(--color-systemBlue);
          border-color: var(--color-systemBlue);
          color: white;
        }

        .inline-toolbar-btn-close {
          background: var(--color-systemRed);
          color: white;
          border-color: var(--color-systemRed);
          margin-left: auto;
        }

        .inline-toolbar-btn-close:hover {
          opacity: 0.85;
        }

        @media (prefers-color-scheme: dark) {
          .text-block {
            background: rgba(255, 214, 10, 0.2);
          }

          .text-block.selected {
            background: rgba(10, 132, 255, 0.15);
          }
        }
      `}</style>

      {/* Assets Pane */}
      {showAssetsPane && currentWorkspace && (
        <AssetsPane
          workspaceId={currentWorkspace.id}
          onClose={() => setShowAssetsPane(false)}
          onSelectFile={handleSelectAsset}
        />
      )}
    </PageLayout>
  );
};
