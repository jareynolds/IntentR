import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Alert, Button } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

// Types for story map visualization
interface StoryCard {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface CapabilityCard {
  id: string;
  name: string;
  status: string;
  storyboardReference: string;
  capabilityId: string;
  path: string;
  purpose?: string;
}

interface EnablerCard {
  id: string;
  name: string;
  status: string;
  capabilityId: string;
  enablerId: string;
}

interface MapNode {
  id: string;
  type: 'storyboard' | 'capability' | 'enabler';
  name: string;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string;
}

interface Connection {
  from: string;
  to: string;
  type: 'storyboard-storyboard' | 'storyboard-capability' | 'capability-enabler';
}

export const StoryMap: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get storyboard data from current workspace
  const storyboardData = currentWorkspace?.storyboard;

  // State
  const [storyCards, setStoryCards] = useState<StoryCard[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityCard[]>([]);
  const [enablers, setEnablers] = useState<EnablerCard[]>([]);
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [zoom, setZoom] = useState(1);

  // Get all node IDs that are connected to the selected node (including the selected node itself)
  const getConnectedNodeIds = (nodeId: string): Set<string> => {
    const connectedIds = new Set<string>();
    connectedIds.add(nodeId);

    // Find all connections involving this node
    connections.forEach(conn => {
      if (conn.from === nodeId) {
        connectedIds.add(conn.to);
      }
      if (conn.to === nodeId) {
        connectedIds.add(conn.from);
      }
    });

    return connectedIds;
  };

  // Check if a connection is related to the selected node
  const isConnectionHighlighted = (conn: Connection): boolean => {
    if (!selectedNode) return true; // All connections visible when nothing selected
    return conn.from === selectedNode.id || conn.to === selectedNode.id;
  };

  // Check if a node should be highlighted (selected or connected to selected)
  const isNodeHighlighted = (nodeId: string): boolean => {
    if (!selectedNode) return true; // All nodes visible when nothing selected
    const connectedIds = getConnectedNodeIds(selectedNode.id);
    return connectedIds.has(nodeId);
  };

  // Card dimensions
  const CARD_WIDTH = 180;
  const CARD_HEIGHT = 80;
  const HORIZONTAL_GAP = 100;
  const VERTICAL_GAP = 40;
  const COLUMN_WIDTH = CARD_WIDTH + HORIZONTAL_GAP;

  // Load storyboard cards from STORY-*.md files in the conception folder
  // Sort them by Y position from the storyboard canvas to maintain visual order
  const loadStoryCards = useCallback(async () => {
    if (!currentWorkspace?.projectFolder) return;

    try {
      const response = await fetch(`${INTEGRATION_URL}/story-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.stories && data.stories.length > 0) {
          let cards: StoryCard[] = data.stories.map((story: { id: string; filename: string; title: string; description: string; status?: string }) => ({
            id: story.id || story.filename,
            title: story.title || story.filename,
            description: story.description || '',
            status: story.status || 'pending',
          }));

          // If storyboard context has cards with Y positions, use them to sort
          if (storyboardData?.cards && storyboardData.cards.length > 0) {
            // Create a map of card positions from the storyboard canvas
            const positionMap = new Map<string, number>();
            storyboardData.cards.forEach(card => {
              // Match by ID or title
              positionMap.set(card.id, card.y || 0);
              positionMap.set(card.title.toLowerCase(), card.y || 0);
            });

            // Sort cards by their Y position from the storyboard canvas
            cards = cards.sort((a, b) => {
              const yA = positionMap.get(a.id) ?? positionMap.get(a.title.toLowerCase()) ?? Infinity;
              const yB = positionMap.get(b.id) ?? positionMap.get(b.title.toLowerCase()) ?? Infinity;
              return yA - yB;
            });
          }

          setStoryCards(cards);
        }
      }
    } catch (err) {
      console.error('Failed to load story cards:', err);
    }
  }, [currentWorkspace?.projectFolder, storyboardData]);

  // Also load from workspace context if no file-based cards are found
  // Sort cards by Y position to match the top-to-bottom order from the Storyboard page
  useEffect(() => {
    // Only use workspace context cards if storyCards is still empty after loading from files
    if (storyCards.length === 0 && storyboardData?.cards && storyboardData.cards.length > 0) {
      // Sort cards by Y position (top to bottom order as shown on Storyboard page)
      const sortedCards = [...storyboardData.cards].sort((a, b) => (a.y || 0) - (b.y || 0));
      const cards: StoryCard[] = sortedCards.map(card => ({
        id: card.id,
        title: card.title,
        description: card.description || '',
        status: card.status || 'pending',
      }));
      setStoryCards(cards);
    }
  }, [storyboardData, storyCards.length]);

  // Load capabilities from backend
  const loadCapabilities = useCallback(async () => {
    if (!currentWorkspace?.projectFolder) return;

    try {
      const response = await fetch(`${INTEGRATION_URL}/capability-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      if (response.ok) {
        const data = await response.json();
        const caps: CapabilityCard[] = (data.capabilities || []).map((cap: Record<string, unknown>) => ({
          id: cap.filename as string || '',
          name: cap.name as string || 'Unnamed Capability',
          status: cap.status as string || 'draft',
          storyboardReference: (cap.storyboardReference as string) || (cap.fields as Record<string, string>)?.['Storyboard Reference'] || '',
          capabilityId: cap.capabilityId as string || '',
          path: cap.path as string || '',
          purpose: cap.purpose as string || '',
        }));
        setCapabilities(caps);
      }
    } catch (err) {
      console.error('Failed to load capabilities:', err);
    }
  }, [currentWorkspace?.projectFolder]);

  // Load enablers from backend
  const loadEnablers = useCallback(async () => {
    if (!currentWorkspace?.projectFolder) return;

    try {
      const response = await fetch(`${INTEGRATION_URL}/enabler-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      if (response.ok) {
        const data = await response.json();
        const enbs: EnablerCard[] = (data.enablers || []).map((enb: Record<string, unknown>) => ({
          id: enb.filename as string || '',
          name: enb.name as string || 'Unnamed Enabler',
          status: enb.status as string || 'draft',
          capabilityId: enb.capabilityId as string || '',
          enablerId: enb.enablerId as string || '',
        }));
        setEnablers(enbs);
      }
    } catch (err) {
      console.error('Failed to load enablers:', err);
    }
  }, [currentWorkspace?.projectFolder]);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([loadStoryCards(), loadCapabilities(), loadEnablers()]);
      } catch (err) {
        setError('Failed to load story map data');
      } finally {
        setIsLoading(false);
      }
    };

    if (currentWorkspace?.projectFolder) {
      loadData();
    }
  }, [currentWorkspace?.projectFolder, loadStoryCards, loadCapabilities, loadEnablers]);

  // Analyze relationships between storyboards and capabilities using AI
  const handleAnalyzeRelationships = async () => {
    if (!currentWorkspace?.projectFolder) {
      setError('No workspace selected');
      return;
    }

    if (storyCards.length === 0) {
      setError('No storyboard cards to analyze. Please add storyboard cards first.');
      return;
    }

    if (capabilities.length === 0) {
      setError('No capabilities to analyze. Please add capabilities first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get API key from localStorage
      const apiKey = localStorage.getItem('anthropic_api_key') || '';
      if (!apiKey) {
        setError('Anthropic API key not configured. Please set it in settings.');
        setIsAnalyzing(false);
        return;
      }

      // Build the prompt for AI analysis
      const storyCardsInfo = storyCards.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
      }));

      const capabilitiesInfo = capabilities.map(c => ({
        id: c.id,
        name: c.name,
        purpose: c.purpose || '',
        capabilityId: c.capabilityId,
        path: c.path,
        currentStoryboardReference: c.storyboardReference,
      }));

      const prompt = `You are a business analyst expert in mapping user stories to technical capabilities.

Analyze the following storyboard cards and capabilities to determine which storyboard each capability relates to.

STORYBOARD CARDS:
${JSON.stringify(storyCardsInfo, null, 2)}

CAPABILITIES:
${JSON.stringify(capabilitiesInfo, null, 2)}

For each capability, determine which storyboard card it most closely relates to based on:
1. Semantic similarity between the storyboard title/description and the capability name/purpose
2. Business function alignment
3. User journey relevance

IMPORTANT: Return your response in the following JSON format ONLY (no markdown, no explanation):
{
  "mappings": [
    {
      "capabilityId": "the capability id field",
      "capabilityPath": "the path field from capability",
      "storyboardTitle": "the exact title of the matching storyboard card",
      "confidence": "high" | "medium" | "low",
      "reasoning": "brief explanation of why this mapping was chosen"
    }
  ]
}

Only include capabilities that have a clear relationship to a storyboard. If a capability doesn't relate to any storyboard, do not include it in the mappings.`;

      // Call AI endpoint
      const aiResponse = await fetch(`${INTEGRATION_URL}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          workspacePath: currentWorkspace.projectFolder,
          apiKey: apiKey,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`AI request failed: ${errorText}`);
      }

      const aiData = await aiResponse.json();
      const aiMessage = aiData.response || aiData.message || '';

      // Parse AI response
      let mappings: Array<{
        capabilityId: string;
        capabilityPath: string;
        storyboardTitle: string;
        confidence: string;
        reasoning: string;
      }> = [];

      try {
        const jsonMatch = aiMessage.match(/\{[\s\S]*"mappings"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.mappings && Array.isArray(parsed.mappings)) {
            mappings = parsed.mappings;
          }
        }
      } catch (parseErr) {
        console.error('Failed to parse AI response:', parseErr);
        throw new Error('Failed to parse AI-generated mappings. Please try again.');
      }

      if (mappings.length === 0) {
        setSuccessMessage('AI analysis complete. No clear relationships found between storyboards and capabilities.');
        setTimeout(() => setSuccessMessage(null), 5000);
        setIsAnalyzing(false);
        return;
      }

      // Update capability files with storyboard references
      let updatedCount = 0;
      for (const mapping of mappings) {
        // Find the capability by ID or path
        const capability = capabilities.find(c =>
          c.capabilityId === mapping.capabilityId ||
          c.path === mapping.capabilityPath ||
          c.id === mapping.capabilityId
        );

        if (capability && capability.path) {
          try {
            const response = await fetch(`${INTEGRATION_URL}/update-capability-storyboard`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                path: capability.path,
                storyboardReference: mapping.storyboardTitle,
              }),
            });

            if (response.ok) {
              updatedCount++;
            } else {
              console.error(`Failed to update capability ${capability.name}:`, await response.text());
            }
          } catch (err) {
            console.error(`Error updating capability ${capability.name}:`, err);
          }
        }
      }

      // Reload capabilities to reflect changes
      await loadCapabilities();

      setSuccessMessage(`Successfully analyzed and updated ${updatedCount} capability-storyboard relationships`);
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze relationships');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Layer heights for canonical layering (top to bottom: Storyboards, Capabilities, Enablers)
  const LAYER_GAP = 120; // Vertical gap between layers
  const LAYER_PADDING = 60; // Padding at start of each layer

  // Build the node graph and calculate positions for canonical layering
  useEffect(() => {
    const buildGraph = () => {
      const newNodes: MapNode[] = [];
      const newConnections: Connection[] = [];

      // ===== LAYER 1 (TOP): Storyboard Cards =====
      // Arranged horizontally, left to right, in order
      const LAYER1_Y = LAYER_PADDING;
      let storyX = LAYER_PADDING;
      const storyNodeMap = new Map<string, MapNode>();
      let previousStoryNode: MapNode | null = null;

      storyCards.forEach((story) => {
        const node: MapNode = {
          id: `story-${story.id}`,
          type: 'storyboard',
          name: story.title,
          status: story.status,
          x: storyX,
          y: LAYER1_Y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        };
        newNodes.push(node);
        storyNodeMap.set(story.title.toLowerCase(), node);
        storyNodeMap.set(story.id, node);

        // Add connection from previous storyboard card to this one (horizontal flow)
        if (previousStoryNode) {
          newConnections.push({
            from: previousStoryNode.id,
            to: node.id,
            type: 'storyboard-storyboard',
          });
        }
        previousStoryNode = node;

        storyX += CARD_WIDTH + HORIZONTAL_GAP;
      });

      // ===== LAYER 2 (MIDDLE): Capabilities =====
      // Position capabilities BELOW their connected storyboard card for better visual alignment
      const LAYER2_Y = LAYER1_Y + CARD_HEIGHT + LAYER_GAP;
      const capNodeMap = new Map<string, MapNode>();

      // First, group capabilities by their connected storyboard
      const capsByStoryId = new Map<string, CapabilityCard[]>();
      const orphanCaps: CapabilityCard[] = [];

      capabilities.forEach(cap => {
        const ref = cap.storyboardReference?.toLowerCase() || '';
        let matchedStoryId: string | null = null;

        // Find the matching storyboard
        storyNodeMap.forEach((storyNode, storyKey) => {
          if (!matchedStoryId && ref && (ref.includes(storyKey) || storyKey.includes(ref) ||
              cap.name.toLowerCase().includes(storyKey) ||
              storyKey.includes(cap.name.toLowerCase()))) {
            matchedStoryId = storyNode.id;
          }
        });

        if (matchedStoryId) {
          if (!capsByStoryId.has(matchedStoryId)) {
            capsByStoryId.set(matchedStoryId, []);
          }
          capsByStoryId.get(matchedStoryId)!.push(cap);
        } else {
          orphanCaps.push(cap);
        }
      });

      // Position capabilities under their connected storyboard
      // For each storyboard, center its capabilities below it
      let maxCapX = LAYER_PADDING; // Track rightmost capability position for orphans

      storyCards.forEach((story) => {
        const storyNode = storyNodeMap.get(story.id) || storyNodeMap.get(story.title.toLowerCase());
        if (!storyNode) return;

        const connectedCaps = capsByStoryId.get(storyNode.id) || [];
        if (connectedCaps.length === 0) return;

        // Calculate total width of this group of capabilities
        const groupWidth = connectedCaps.length * CARD_WIDTH + (connectedCaps.length - 1) * (HORIZONTAL_GAP / 2);
        // Center the group under the storyboard card
        let startX = storyNode.x + (CARD_WIDTH / 2) - (groupWidth / 2);
        // Ensure we don't overlap with previous capabilities
        startX = Math.max(startX, maxCapX);

        connectedCaps.forEach((cap, index) => {
          const capX = startX + index * (CARD_WIDTH + HORIZONTAL_GAP / 2);
          const node: MapNode = {
            id: `cap-${cap.id}`,
            type: 'capability',
            name: cap.name,
            status: cap.status,
            x: capX,
            y: LAYER2_Y,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            parentId: storyNode.id,
          };
          newNodes.push(node);
          capNodeMap.set(cap.capabilityId || cap.name, node);
          capNodeMap.set(cap.id, node);

          // Add upward connection to storyboard
          newConnections.push({
            from: node.id,
            to: storyNode.id,
            type: 'storyboard-capability',
          });

          maxCapX = Math.max(maxCapX, capX + CARD_WIDTH + HORIZONTAL_GAP);
        });
      });

      // Position orphan capabilities at the end
      orphanCaps.forEach(cap => {
        const node: MapNode = {
          id: `cap-${cap.id}`,
          type: 'capability',
          name: cap.name,
          status: cap.status,
          x: maxCapX,
          y: LAYER2_Y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        };
        newNodes.push(node);
        capNodeMap.set(cap.capabilityId || cap.name, node);
        capNodeMap.set(cap.id, node);

        maxCapX += CARD_WIDTH + HORIZONTAL_GAP;
      });

      // ===== LAYER 3 (BOTTOM): Enablers =====
      // Position enablers BELOW their connected capability card for better visual alignment
      const LAYER3_Y = LAYER2_Y + CARD_HEIGHT + LAYER_GAP;

      // Group enablers by their connected capability
      const enbsByCapId = new Map<string, EnablerCard[]>();
      const orphanEnablers: EnablerCard[] = [];

      enablers.forEach(enb => {
        const capId = enb.capabilityId || '';
        let matchedCapNode: MapNode | null = null;

        // Find matching capability node
        capNodeMap.forEach((capNode, capKey) => {
          if (!matchedCapNode && capId && (
              capKey.toUpperCase() === capId.toUpperCase() ||
              capKey.toLowerCase().includes(capId.toLowerCase()) ||
              capId.toLowerCase().includes(capKey.toLowerCase()))) {
            matchedCapNode = capNode;
          }
        });

        if (matchedCapNode) {
          if (!enbsByCapId.has(matchedCapNode.id)) {
            enbsByCapId.set(matchedCapNode.id, []);
          }
          enbsByCapId.get(matchedCapNode.id)!.push(enb);
        } else {
          orphanEnablers.push(enb);
        }
      });

      // Position enablers under their connected capability
      let maxEnbX = LAYER_PADDING; // Track rightmost enabler position for orphans

      // Get all capability nodes and process them in order of their X position
      const capNodes = newNodes.filter(n => n.type === 'capability').sort((a, b) => a.x - b.x);

      capNodes.forEach(capNode => {
        const connectedEnablers = enbsByCapId.get(capNode.id) || [];
        if (connectedEnablers.length === 0) return;

        // Calculate total width of this group of enablers
        const groupWidth = connectedEnablers.length * CARD_WIDTH + (connectedEnablers.length - 1) * (HORIZONTAL_GAP / 2);
        // Center the group under the capability card
        let startX = capNode.x + (CARD_WIDTH / 2) - (groupWidth / 2);
        // Ensure we don't overlap with previous enablers
        startX = Math.max(startX, maxEnbX);

        connectedEnablers.forEach((enb, index) => {
          const enbX = startX + index * (CARD_WIDTH + HORIZONTAL_GAP / 2);
          const node: MapNode = {
            id: `enb-${enb.id}`,
            type: 'enabler',
            name: enb.name,
            status: enb.status,
            x: enbX,
            y: LAYER3_Y,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            parentId: capNode.id,
          };
          newNodes.push(node);

          // Add upward connection to capability
          newConnections.push({
            from: node.id,
            to: capNode.id,
            type: 'capability-enabler',
          });

          maxEnbX = Math.max(maxEnbX, enbX + CARD_WIDTH + HORIZONTAL_GAP);
        });
      });

      // Position orphan enablers at the end
      orphanEnablers.forEach(enb => {
        const node: MapNode = {
          id: `enb-${enb.id}`,
          type: 'enabler',
          name: enb.name,
          status: enb.status,
          x: maxEnbX,
          y: LAYER3_Y,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        };
        newNodes.push(node);

        maxEnbX += CARD_WIDTH + HORIZONTAL_GAP;
      });

      setNodes(newNodes);
      setConnections(newConnections);
    };

    buildGraph();
  }, [storyCards, capabilities, enablers, CARD_HEIGHT, CARD_WIDTH, HORIZONTAL_GAP, LAYER_GAP, LAYER_PADDING]);

  // Draw connections on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const maxX = Math.max(...nodes.map(n => n.x + n.width), 800);
    const maxY = Math.max(...nodes.map(n => n.y + n.height), 600);
    canvas.width = maxX + 100;
    canvas.height = maxY + 100;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);

      if (!fromNode || !toNode) return;

      // Check if this connection should be highlighted
      const isHighlighted = isConnectionHighlighted(conn);
      const grayColor = '#d1d5db'; // Gray color for non-highlighted connections

      let fromX: number, fromY: number, toX: number, toY: number;

      // For storyboard-to-storyboard connections (horizontal flow in top layer)
      if (conn.type === 'storyboard-storyboard') {
        // Draw horizontal connection (left to right flow)
        fromX = fromNode.x + fromNode.width;
        fromY = fromNode.y + fromNode.height / 2;
        toX = toNode.x;
        toY = toNode.y + toNode.height / 2;

        ctx.strokeStyle = isHighlighted ? '#764ba2' : grayColor; // Purple or gray
        ctx.setLineDash([]);
        ctx.lineWidth = isHighlighted ? 3 : 1;

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Draw arrow at end (pointing right)
        const arrowSize = isHighlighted ? 10 : 6;
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - arrowSize, toY - arrowSize / 2);
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - arrowSize, toY + arrowSize / 2);
        ctx.stroke();
      } else {
        // Vertical upward connections (capability→storyboard, enabler→capability)
        // From is the lower node, To is the upper node
        fromX = fromNode.x + fromNode.width / 2;
        fromY = fromNode.y; // Top of the lower node
        toX = toNode.x + toNode.width / 2;
        toY = toNode.y + toNode.height; // Bottom of the upper node

        // Set line style based on connection type
        if (conn.type === 'storyboard-capability') {
          ctx.strokeStyle = isHighlighted ? '#3b82f6' : grayColor; // Blue or gray
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = isHighlighted ? '#22c55e' : grayColor; // Green or gray
          ctx.setLineDash(isHighlighted ? [5, 3] : [3, 2]);
        }
        ctx.lineWidth = isHighlighted ? 2 : 1;

        // Draw bezier curve going upward
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        const controlY = (fromY + toY) / 2;
        ctx.bezierCurveTo(fromX, controlY, toX, controlY, toX, toY);
        ctx.stroke();

        // Draw arrow at end (pointing up)
        const arrowSize = isHighlighted ? 8 : 5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - arrowSize / 2, toY + arrowSize);
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX + arrowSize / 2, toY + arrowSize);
        ctx.stroke();
      }
    });
  }, [nodes, connections, selectedNode, isConnectionHighlighted]);

  // Get card style based on type
  const getCardStyle = (type: 'storyboard' | 'capability' | 'enabler') => {
    const baseStyle = {
      position: 'absolute' as const,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: '8px',
      padding: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    };

    switch (type) {
      case 'storyboard':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '2px solid #5a67d8',
          color: 'white',
        };
      case 'capability':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          border: '2px solid #10b981',
          color: 'white',
        };
      case 'enabler':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          border: '2px solid #ec4899',
          color: 'white',
        };
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'implemented':
        return '#22c55e';
      case 'in-progress':
      case 'in progress':
      case 'in_progress':
        return '#3b82f6';
      case 'pending':
      case 'draft':
        return '#f59e0b';
      case 'blocked':
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  // Get type icon
  const getTypeIcon = (type: 'storyboard' | 'capability' | 'enabler') => {
    switch (type) {
      case 'storyboard':
        return '📖';
      case 'capability':
        return '⚡';
      case 'enabler':
        return '🔧';
    }
  };

  return (
    <div className="story-map-page">
      <style>{`
        .story-map-page {
          padding: 0;
          height: calc(100vh - 140px);
          display: flex;
          flex-direction: column;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--color-grey-600);
          margin-top: 4px;
        }

        .controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 4px 12px;
          border-radius: 6px;
          border: 1px solid var(--color-grey-200);
        }

        .zoom-label {
          font-size: 12px;
          color: var(--color-grey-600);
        }

        .legend {
          display: flex;
          gap: 16px;
          padding: 12px 16px;
          background: white;
          border-radius: 8px;
          border: 1px solid var(--color-grey-200);
          margin-bottom: 16px;
          flex-shrink: 0;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--color-grey-700);
        }

        .legend-color {
          width: 24px;
          height: 16px;
          border-radius: 4px;
        }

        .legend-color.storyboard {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .legend-color.capability {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }

        .legend-color.enabler {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .legend-line {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .legend-line-sample {
          width: 24px;
          height: 2px;
        }

        .legend-line-sample.story-flow {
          background: #764ba2;
          height: 3px;
        }

        .legend-line-sample.solid {
          background: #3b82f6;
        }

        .legend-line-sample.dashed {
          background: repeating-linear-gradient(
            to right,
            #22c55e,
            #22c55e 5px,
            transparent 5px,
            transparent 8px
          );
        }

        .map-container {
          flex: 1;
          background: var(--color-grey-100);
          border-radius: 12px;
          border: 1px solid var(--color-grey-200);
          overflow: auto;
          position: relative;
        }

        .map-canvas-container {
          position: relative;
          min-width: 100%;
          min-height: 100%;
          transform-origin: top left;
        }

        .map-canvas {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
        }

        .map-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .map-card:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
          z-index: 10;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          opacity: 0.9;
        }

        .card-type-icon {
          font-size: 12px;
        }

        .card-type-label {
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .card-name {
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .card-status {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          background: rgba(255,255,255,0.2);
          align-self: flex-start;
        }

        .layer-labels {
          position: absolute;
          left: 0;
          top: 0;
          width: 150px;
          height: 100%;
          z-index: 15;
        }

        .layer-label {
          position: absolute;
          left: 10px;
          width: 140px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95));
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border: 1px solid var(--color-grey-200);
          text-align: center;
        }

        .layer-label-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .layer-label-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-grey-800);
          margin-bottom: 2px;
        }

        .layer-label-subtitle {
          font-size: 10px;
          color: var(--color-grey-500);
          font-style: italic;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: var(--color-grey-500);
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .selected-info {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 1px solid var(--color-grey-200);
          max-width: 300px;
          z-index: 100;
        }

        .selected-info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .selected-info-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .selected-info-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: var(--color-grey-500);
        }

        .selected-info-type {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--color-grey-600);
          margin-bottom: 4px;
        }

        .selected-info-status {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          color: white;
        }
      `}</style>

      <div className="page-header">
        <div>
          <h1 className="page-title">Narrative</h1>
          <p className="page-subtitle">
            Hierarchical view: User Intent → Business Capabilities → Technical Enablers
          </p>
        </div>
        <div className="controls">
          <div className="zoom-controls">
            <span className="zoom-label">Zoom:</span>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            >
              -
            </Button>
            <span>{Math.round(zoom * 100)}%</span>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            >
              +
            </Button>
          </div>
          <Button
            variant="primary"
            onClick={handleAnalyzeRelationships}
            disabled={isAnalyzing || storyCards.length === 0 || capabilities.length === 0}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              loadCapabilities();
              loadEnablers();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <div className="legend">
        <div className="legend-item">
          <div className="legend-color storyboard"></div>
          <span>Storyboard (User Intent)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color capability"></div>
          <span>Capability (What)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color enabler"></div>
          <span>Enabler (How)</span>
        </div>
        <div className="legend-line">
          <div className="legend-line-sample story-flow"></div>
          <span style={{ fontSize: '12px', color: 'var(--color-grey-600)' }}>Story Flow →</span>
        </div>
        <div className="legend-line">
          <div className="legend-line-sample solid"></div>
          <span style={{ fontSize: '12px', color: 'var(--color-grey-600)' }}>Cap ↑ Story</span>
        </div>
        <div className="legend-line">
          <div className="legend-line-sample dashed"></div>
          <span style={{ fontSize: '12px', color: 'var(--color-grey-600)' }}>Enabler ↑ Cap</span>
        </div>
      </div>

      <div className="map-container" ref={containerRef}>
        {isLoading ? (
          <div className="empty-state">
            <div className="empty-state-icon">...</div>
            <p>Loading story map...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗺️</div>
            <p>No data to display</p>
            <p style={{ marginTop: 8, fontSize: 14 }}>
              Add storyboard cards, capabilities, and enablers to see the map
            </p>
          </div>
        ) : (
          <>
            {/* Layer labels on the left side */}
            <div className="layer-labels">
              <div className="layer-label" style={{ top: LAYER_PADDING + CARD_HEIGHT / 2 - 30 }}>
                <div className="layer-label-icon">📖</div>
                <div className="layer-label-title">Storyboards</div>
                <div className="layer-label-subtitle">User narrative / intent</div>
              </div>
              <div className="layer-label" style={{ top: LAYER_PADDING + CARD_HEIGHT + LAYER_GAP + CARD_HEIGHT / 2 - 30 }}>
                <div className="layer-label-icon">⚡</div>
                <div className="layer-label-title">Capabilities</div>
                <div className="layer-label-subtitle">What must exist</div>
              </div>
              <div className="layer-label" style={{ top: LAYER_PADDING + (CARD_HEIGHT + LAYER_GAP) * 2 + CARD_HEIGHT / 2 - 30 }}>
                <div className="layer-label-icon">🔧</div>
                <div className="layer-label-title">Enablers</div>
                <div className="layer-label-subtitle">How it is implemented</div>
              </div>
            </div>
            <div
              className="map-canvas-container"
              style={{
                transform: `scale(${zoom})`,
                width: Math.max(...nodes.map(n => n.x + n.width), 800) + 100,
                height: Math.max(...nodes.map(n => n.y + n.height), 600) + 100,
                marginLeft: 160, // Space for layer labels
              }}
            >
              <canvas ref={canvasRef} className="map-canvas" />

              {nodes.map(node => {
                const highlighted = isNodeHighlighted(node.id);
                const isSelected = selectedNode?.id === node.id;
                return (
                <div
                  key={node.id}
                  className={`map-card ${isSelected ? 'selected' : ''} ${!highlighted ? 'dimmed' : ''}`}
                  style={{
                    ...getCardStyle(node.type),
                    left: node.x,
                    top: node.y,
                    opacity: highlighted ? 1 : 0.3,
                    filter: highlighted ? 'none' : 'grayscale(70%)',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    zIndex: isSelected ? 10 : highlighted ? 5 : 1,
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                  onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                >
                  <div className="card-header">
                    <span className="card-type-icon">{getTypeIcon(node.type)}</span>
                    <span className="card-type-label">{node.type}</span>
                  </div>
                  <div className="card-name">{node.name}</div>
                  <span
                    className="card-status"
                    style={{ backgroundColor: getStatusColor(node.status) }}
                  >
                    {node.status}
                  </span>
                </div>
              );
              })}
            </div>
          </>
        )}
      </div>

      {selectedNode && (
        <div className="selected-info">
          <div className="selected-info-header">
            <span className="selected-info-title">
              {getTypeIcon(selectedNode.type)} {selectedNode.name}
            </span>
            <button
              className="selected-info-close"
              onClick={() => setSelectedNode(null)}
            >
              ×
            </button>
          </div>
          <div className="selected-info-type">{selectedNode.type}</div>
          <span
            className="selected-info-status"
            style={{ backgroundColor: getStatusColor(selectedNode.status) }}
          >
            {selectedNode.status}
          </span>
          {selectedNode.parentId && (
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--color-grey-600)' }}>
              Connected to: {nodes.find(n => n.id === selectedNode.parentId)?.name || 'Unknown'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryMap;
