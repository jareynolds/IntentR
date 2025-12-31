import React, { useState, useRef, useEffect } from 'react';
import mermaid from 'mermaid';
import { Button } from '../components/Button';
import { PageLayout } from '../components';
import { useWorkspace, type SystemCapability, type SystemEnabler } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

interface Capability {
  id: string;
  name: string;
  status: string;
  enablers: string[];
  upstreamDependencies: string[];
  downstreamImpacts: string[];
  x: number;
  y: number;
  fields?: Record<string, string>; // For Storyboard Reference and other metadata
  filename?: string; // Original filename for deletion
}

interface Enabler {
  id: string;
  name: string;
  capabilityId: string;
  x: number;
  y: number;
  filename?: string; // Original filename for deletion
}

interface CapabilityDependency {
  from: string;
  to: string;
}

interface EnablerConnection {
  capabilityId: string;
  enablerId: string;
}

interface TestScenario {
  id: string;
  name: string;
  enablerId: string;
  x: number;
  y: number;
}

interface TestScenarioConnection {
  enablerId: string;
  scenarioId: string;
}

interface StoryboardCard {
  id: string;
  title: string;
  positionY: number;
  flowOrder: number;
}

// Helper function to get first N words from a string
const getFirstWords = (text: string, count: number = 3): string => {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= count) return text;
  return words.slice(0, count).join(' ') + '...';
};

type DiagramTab = 'capability-map' | 'state-diagram' | 'sequence-diagram' | 'data-models' | 'class-diagrams';

// Mermaid diagram rendering component
const MermaidDiagram: React.FC<{ content: string; id: string }> = ({ content, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (content && containerRef.current) {
      const renderDiagram = async () => {
        try {
          containerRef.current!.innerHTML = '';
          const { svg } = await mermaid.render(`mermaid-${id}-${Date.now()}`, content);
          containerRef.current!.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          containerRef.current!.innerHTML = `<pre class="mermaid-error">Error rendering diagram:\n${error}\n\nRaw content:\n${content}</pre>`;
        }
      };
      renderDiagram();
    }
  }, [content, id]);

  return <div ref={containerRef} className="mermaid-container" />;
};

export const System: React.FC = () => {
  const { currentWorkspace, updateWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<DiagramTab>('capability-map');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [enablers, setEnablers] = useState<Enabler[]>([]);
  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([]);
  const [capabilityDependencies, setCapabilityDependencies] = useState<CapabilityDependency[]>([]);
  const [enablerConnections, setEnablerConnections] = useState<EnablerConnection[]>([]);
  const [testScenarioConnections, setTestScenarioConnections] = useState<TestScenarioConnection[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draggingCard, setDraggingCard] = useState<{ type: 'capability' | 'enabler' | 'testScenario'; id: string; offsetX: number; offsetY: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCard, setEditingCard] = useState<{ type: 'capability' | 'enabler' | 'testScenario'; id: string } | null>(null);
  const [selectedCard, setSelectedCard] = useState<{ type: 'capability' | 'enabler' | 'testScenario'; id: string } | null>(null);

  // State for each diagram type
  const [stateDiagramLoading, setStateDiagramLoading] = useState(false);
  const [stateDiagramContent, setStateDiagramContent] = useState<string>('');
  const [sequenceDiagramLoading, setSequenceDiagramLoading] = useState(false);
  const [sequenceDiagramContent, setSequenceDiagramContent] = useState<string>('');
  const [dataModelsLoading, setDataModelsLoading] = useState(false);
  const [dataModelsContent, setDataModelsContent] = useState<string>('');
  const [classDiagramsLoading, setClassDiagramsLoading] = useState(false);
  const [classDiagramsContent, setClassDiagramsContent] = useState<string>('');

  // Storyboard cards for ordering
  const [storyboardCards, setStoryboardCards] = useState<StoryboardCard[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [wrapperElement, setWrapperElement] = useState<HTMLDivElement | null>(null);

  // Callback ref to detect when wrapper is mounted
  const setWrapperRef = (element: HTMLDivElement | null) => {
    wrapperRef.current = element;
    if (element) {
      setWrapperElement(element);
    }
  };

  // Load saved diagram on mount and when workspace changes
  useEffect(() => {
    console.log('[System] ==== useEffect TRIGGERED ===='); // VERY VISIBLE LOG
    if (currentWorkspace?.id) {
      console.log('[System] Workspace changed, loading saved diagram for:', currentWorkspace.id);
      console.log('[System] projectFolder:', currentWorkspace.projectFolder);

      // First restore zoom and scroll position from localStorage for immediate UI
      const savedKey = `system_positions_${currentWorkspace.id}`;
      const saved = localStorage.getItem(savedKey);

      if (saved) {
        try {
          const savedData = JSON.parse(saved);
          if (savedData.zoom !== undefined) {
            setZoom(savedData.zoom);
          }
          // Restore scroll position after DOM is ready
          setTimeout(() => {
            if (wrapperRef.current && savedData.scrollLeft !== undefined) {
              wrapperRef.current.scrollLeft = savedData.scrollLeft;
              wrapperRef.current.scrollTop = savedData.scrollTop || 0;
            }
          }, 200);
        } catch (error) {
          console.error('[System] Error parsing saved diagram:', error);
        }
      }

      // Load saved diagrams for each tab from localStorage
      loadSavedDiagrams();

      // ALWAYS load fresh capabilities from definition folder if workspace has projectFolder
      // This ensures we get the Storyboard Reference fields for proper sorting
      // The loadSpecifications function will merge positions from localStorage
      if (currentWorkspace.projectFolder) {
        console.log('[System] Auto-loading specifications to get fresh fields (including Storyboard Reference)');
        // Use a small delay to ensure the component is mounted
        setTimeout(() => {
          loadSpecifications();
        }, 100);
      } else {
        // No project folder - check if we have cached data or systemDiagram
        if (saved) {
          try {
            const savedData = JSON.parse(saved);
            if (savedData && savedData.capabilities && savedData.capabilities.length > 0) {
              console.log('[System] No project folder - using cached capabilities:', savedData.capabilities.length);
              setCapabilities(savedData.capabilities);
              setEnablers(savedData.enablers || []);
              setTestScenarios(savedData.testScenarios || []);
              setCapabilityDependencies(savedData.capabilityDependencies || []);
              setEnablerConnections(savedData.enablerConnections || []);
              setTestScenarioConnections(savedData.testScenarioConnections || []);
            }
          } catch (error) {
            console.error('[System] Error loading cached data:', error);
          }
        } else if (currentWorkspace.systemDiagram) {
          // Fallback to database if localStorage is empty
          console.log('[System] Loading diagram from database');
          const savedData = currentWorkspace.systemDiagram as any;
          if (savedData.capabilities && savedData.capabilities.length > 0) {
            setCapabilities(savedData.capabilities);
            setEnablers(savedData.enablers || []);
            setTestScenarios(savedData.testScenarios || []);
            setCapabilityDependencies(savedData.capabilityDependencies || []);
            setEnablerConnections(savedData.enablerConnections || []);
            setTestScenarioConnections(savedData.testScenarioConnections || []);
            if (savedData.zoom !== undefined) setZoom(savedData.zoom);
          }
        }
        setIsLoading(false);
      }
    }
  }, [currentWorkspace?.id]);

  // Restore scroll position when capability-map tab becomes active
  useEffect(() => {
    if (activeTab === 'capability-map' && currentWorkspace?.id && capabilities.length > 0) {
      // Try to restore scroll position when tab becomes active
      setTimeout(() => {
        const savedKey = `system_positions_${currentWorkspace.id}`;
        const saved = localStorage.getItem(savedKey);
        if (saved && wrapperRef.current) {
          try {
            const savedData = JSON.parse(saved);
            if (savedData.scrollLeft !== undefined) {
              wrapperRef.current.scrollLeft = savedData.scrollLeft;
              wrapperRef.current.scrollTop = savedData.scrollTop || 0;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }, 100);
    }
  }, [activeTab, currentWorkspace?.id]);

  // Load saved diagrams from localStorage
  const loadSavedDiagrams = () => {
    if (!currentWorkspace) return;

    const stateContent = localStorage.getItem(`system_state_diagram_${currentWorkspace.id}`);
    const sequenceContent = localStorage.getItem(`system_sequence_diagram_${currentWorkspace.id}`);
    const dataContent = localStorage.getItem(`system_data_models_${currentWorkspace.id}`);
    const classContent = localStorage.getItem(`system_class_diagrams_${currentWorkspace.id}`);

    if (stateContent) setStateDiagramContent(stateContent);
    if (sequenceContent) setSequenceDiagramContent(sequenceContent);
    if (dataContent) setDataModelsContent(dataContent);
    if (classContent) setClassDiagramsContent(classContent);
  };

  // Fetch storyboard cards for ordering (matches Capabilities page logic EXACTLY)
  const fetchStoryboardCards = async () => {
    if (!currentWorkspace?.projectFolder) return;

    console.log('[System] fetchStoryboardCards called');
    console.log('[System] currentWorkspace.storyboard:', currentWorkspace?.storyboard);
    console.log('[System] currentWorkspace.storyboard?.cards:', currentWorkspace?.storyboard?.cards);

    try {
      // Use /story-files endpoint like Capabilities page does
      const response = await fetch(`${INTEGRATION_URL}/story-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      const data = await response.json();
      console.log('[System] /story-files response:', data);

      if (data.stories) {
        // Get storyboard canvas data for positioning (same approach as Capabilities page)
        const storyboardData = currentWorkspace?.storyboard;

        // Create a position map from the storyboard canvas cards (matching Capabilities page logic)
        const positionMap = new Map<string, number>();
        if (storyboardData?.cards && storyboardData.cards.length > 0) {
          console.log('[System] Creating positionMap from', storyboardData.cards.length, 'storyboard canvas cards');
          storyboardData.cards.forEach((card: { id: string; title: string; y?: number }) => {
            // Match by ID or title (lowercase for case-insensitive matching)
            positionMap.set(card.id, card.y || 0);
            positionMap.set(card.title.toLowerCase(), card.y || 0);
            console.log(`[System] positionMap: "${card.title}" (${card.id}) -> y=${card.y}`);
          });
        } else {
          console.log('[System] WARNING: No storyboard canvas cards found for positionMap!');
        }

        // Create cards with position info
        const cardsWithPosition: StoryboardCard[] = data.stories.map((story: {
          id: string;
          filename: string;
          title: string;
          description: string;
          fields?: Record<string, string>;
        }) => {
          // Get Y position from storyboard canvas (matching by id or title)
          // This matches the Capabilities page approach exactly
          const posY = positionMap.get(story.id) ??
                       positionMap.get(story.title?.toLowerCase()) ??
                       positionMap.get((story.title || story.filename).toLowerCase()) ??
                       Infinity;

          return {
            id: story.id || story.filename,
            title: story.title || story.filename,
            positionY: posY,
            flowOrder: 0, // Will be computed after sorting
          };
        });

        // Sort by Y position from storyboard canvas (top to bottom)
        // This matches the Capabilities page logic exactly
        cardsWithPosition.sort((a, b) => {
          return (a.positionY || 0) - (b.positionY || 0);
        });

        // Assign flow order after sorting
        cardsWithPosition.forEach((card, index) => {
          card.flowOrder = index;
        });

        setStoryboardCards(cardsWithPosition);
        console.log('[System] Loaded', cardsWithPosition.length, 'storyboard cards for ordering from workspace storyboard');
        console.log('[System] Storyboard cards:', cardsWithPosition.map(c => ({ title: c.title, flowOrder: c.flowOrder, posY: c.positionY })));
      }
    } catch (err) {
      console.error('[System] Failed to fetch storyboard cards:', err);
    }
  };

  // Fetch storyboard cards when workspace changes (matches Capabilities page dependencies)
  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      fetchStoryboardCards();
    }
  }, [currentWorkspace?.id, currentWorkspace?.projectFolder]);

  // Helper: Get flow order for a capability based on its storyboard reference
  // This matches the Capabilities page logic EXACTLY
  const getCapabilityFlowOrder = React.useCallback((cap: Capability): number => {
    const storyboardRef = cap.fields?.['Storyboard Reference'] || '';
    if (!storyboardRef) return Number.MAX_SAFE_INTEGER; // No reference = at the end

    // Find matching storyboard card (case-insensitive)
    const matchingCard = storyboardCards.find(
      card => card.title.toLowerCase() === storyboardRef.toLowerCase()
    );

    return matchingCard?.flowOrder ?? Number.MAX_SAFE_INTEGER;
  }, [storyboardCards]);

  // Sort capabilities by storyboard flow order - use useMemo for proper recalculation
  const sortedCapabilities = React.useMemo(() => {
    console.log('[System] COMPUTING sortedCapabilities:', {
      capabilitiesCount: capabilities.length,
      storyboardCardsCount: storyboardCards.length,
      capsWithFields: capabilities.filter(c => c.fields?.['Storyboard Reference']).length
    });

    if (capabilities.length === 0) return [];

    const sorted = [...capabilities].sort((a, b) => {
      const refA = a.fields?.['Storyboard Reference'] || '';
      const refB = b.fields?.['Storyboard Reference'] || '';

      // Find matching storyboard cards
      const cardA = storyboardCards.find(c => c.title.toLowerCase() === refA.toLowerCase());
      const cardB = storyboardCards.find(c => c.title.toLowerCase() === refB.toLowerCase());

      const orderA = cardA?.flowOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = cardB?.flowOrder ?? Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) return orderA - orderB;
      // Secondary sort by name for capabilities with same/no flow order
      return (a.name || '').localeCompare(b.name || '');
    });

    // Log first 5 sorted capabilities
    console.log('[System] SORTED RESULT (first 5):');
    sorted.slice(0, 5).forEach((cap, idx) => {
      const ref = cap.fields?.['Storyboard Reference'] || 'NONE';
      const card = storyboardCards.find(c => c.title.toLowerCase() === ref.toLowerCase());
      console.log(`  ${idx + 1}. "${cap.name}" [ref="${ref}"] flowOrder=${card?.flowOrder ?? 'N/A'}`);
    });

    return sorted;
  }, [capabilities, storyboardCards]);

  // Save positions to localStorage whenever they change
  useEffect(() => {
    if (currentWorkspace && capabilities.length > 0) {
      // Debounce saves to avoid excessive updates
      const timeoutId = setTimeout(() => {
        // Get current scroll position from wrapper
        const scrollLeft = wrapperRef.current?.scrollLeft || 0;
        const scrollTop = wrapperRef.current?.scrollTop || 0;

        const systemData = {
          capabilities: capabilities,
          enablers: enablers,
          testScenarios: testScenarios,
          capabilityDependencies: capabilityDependencies,
          enablerConnections: enablerConnections,
          testScenarioConnections: testScenarioConnections,
          zoom: zoom,
          scrollLeft: scrollLeft,
          scrollTop: scrollTop,
        };

        // Save to localStorage with workspace ID
        localStorage.setItem(`system_positions_${currentWorkspace.id}`, JSON.stringify(systemData));
        console.log('[System] Auto-saved diagram to localStorage:', capabilities.length, 'capabilities,', testScenarios.length, 'test scenarios');
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [capabilities, enablers, testScenarios, capabilityDependencies, enablerConnections, testScenarioConnections, zoom, currentWorkspace]);

  // Save scroll position when user scrolls
  useEffect(() => {
    if (!wrapperRef.current || !currentWorkspace || capabilities.length === 0) return;

    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      // Debounced save on scroll
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollLeft = wrapperRef.current?.scrollLeft || 0;
        const scrollTop = wrapperRef.current?.scrollTop || 0;

        const systemData = {
          capabilities: capabilities,
          enablers: enablers,
          testScenarios: testScenarios,
          capabilityDependencies: capabilityDependencies,
          enablerConnections: enablerConnections,
          testScenarioConnections: testScenarioConnections,
          zoom: zoom,
          scrollLeft: scrollLeft,
          scrollTop: scrollTop,
        };

        localStorage.setItem(`system_positions_${currentWorkspace.id}`, JSON.stringify(systemData));
      }, 500);
    };

    const wrapper = wrapperRef.current;
    wrapper.addEventListener('scroll', handleScroll);

    return () => {
      wrapper.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [wrapperRef.current, currentWorkspace, capabilities, enablers, capabilityDependencies, enablerConnections, zoom]);

  const savePositionsToLocalStorage = () => {
    if (!currentWorkspace) return;

    // Get current scroll position from wrapper
    const scrollLeft = wrapperRef.current?.scrollLeft || 0;
    const scrollTop = wrapperRef.current?.scrollTop || 0;

    const systemData = {
      capabilities: capabilities,
      enablers: enablers,
      testScenarios: testScenarios,
      capabilityDependencies: capabilityDependencies,
      enablerConnections: enablerConnections,
      testScenarioConnections: testScenarioConnections,
      zoom: zoom,
      scrollLeft: scrollLeft,
      scrollTop: scrollTop,
    };

    // Save to localStorage for quick access
    localStorage.setItem(`system_positions_${currentWorkspace.id}`, JSON.stringify(systemData));
  };

  const savePositionsToDatabase = async () => {
    if (!currentWorkspace) return;

    // Get current scroll position from wrapper
    const scrollLeft = wrapperRef.current?.scrollLeft || 0;
    const scrollTop = wrapperRef.current?.scrollTop || 0;

    const systemData = {
      capabilities: capabilities,
      enablers: enablers,
      testScenarios: testScenarios,
      capabilityDependencies: capabilityDependencies,
      enablerConnections: enablerConnections,
      testScenarioConnections: testScenarioConnections,
      zoom: zoom,
      scrollLeft: scrollLeft,
      scrollTop: scrollTop,
    };

    // Save to database for persistence across sessions
    try {
      await updateWorkspace(currentWorkspace.id, {
        systemDiagram: systemData,
      });
      console.log('[System] Saved diagram to database');
    } catch (error) {
      console.error('Failed to save system diagram to database:', error);
    }

    // Generate and save markdown files for each capability and enabler
    if (currentWorkspace.projectFolder && capabilities.length > 0) {
      const files: Array<{ fileName: string; content: string }> = [];

      // Generate capability files
      capabilities.forEach((capability, index) => {
        // Generate filename: CAP-NAME-(n).md
        const safeName = capability.name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const fileName = `CAP-${safeName}-${index + 1}.md`;

        // Find related enablers
        const relatedEnablers = enablers.filter(e => e.capabilityId === capability.id);

        // Find dependencies
        const upstream = capabilityDependencies
          .filter(d => d.to === capability.id)
          .map(d => capabilities.find(c => c.id === d.from)?.name)
          .filter(Boolean);

        const downstream = capabilityDependencies
          .filter(d => d.from === capability.id)
          .map(d => capabilities.find(c => c.id === d.to)?.name)
          .filter(Boolean);

        // Generate markdown content
        let markdown = `# ${capability.name}\n\n`;
        markdown += `## Metadata\n`;
        markdown += `- **ID**: ${capability.id}\n`;
        markdown += `- **Type**: Capability\n`;
        markdown += `- **Status**: ${capability.status || 'Not Set'}\n`;
        markdown += `- **Generated**: ${new Date().toLocaleString()}\n\n`;

        markdown += `## Description\n`;
        markdown += `_Add description for this capability._\n\n`;

        if (relatedEnablers.length > 0) {
          markdown += `## Enablers\n`;
          relatedEnablers.forEach(e => {
            markdown += `- ${e.name}\n`;
          });
          markdown += '\n';
        }

        if (upstream.length > 0) {
          markdown += `## Upstream Dependencies\n`;
          upstream.forEach(name => {
            markdown += `- ${name}\n`;
          });
          markdown += '\n';
        }

        if (downstream.length > 0) {
          markdown += `## Downstream Impacts\n`;
          downstream.forEach(name => {
            markdown += `- ${name}\n`;
          });
          markdown += '\n';
        }

        markdown += `## Implementation Notes\n`;
        markdown += `_Add implementation notes here._\n\n`;

        markdown += `## Acceptance Criteria\n`;
        markdown += `- [ ] TODO: Define acceptance criteria\n`;

        files.push({ fileName, content: markdown });
      });

      // Generate enabler files
      enablers.forEach((enabler, index) => {
        // Generate filename: ENB-NAME-(n).md
        const safeName = enabler.name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const fileName = `ENB-${safeName}-${index + 1}.md`;

        // Find parent capability
        const parentCap = capabilities.find(c => c.id === enabler.capabilityId);

        // Generate markdown content
        let markdown = `# ${enabler.name}\n\n`;
        markdown += `## Metadata\n`;
        markdown += `- **ID**: ${enabler.id}\n`;
        markdown += `- **Type**: Enabler\n`;
        markdown += `- **Parent Capability**: ${parentCap?.name || 'None'}\n`;
        markdown += `- **Generated**: ${new Date().toLocaleString()}\n\n`;

        markdown += `## Description\n`;
        markdown += `_Add description for this enabler._\n\n`;

        markdown += `## Implementation Notes\n`;
        markdown += `_Add implementation notes here._\n\n`;

        markdown += `## Acceptance Criteria\n`;
        markdown += `- [ ] TODO: Define acceptance criteria\n`;

        files.push({ fileName, content: markdown });
      });

      // Save files to definition folder (same folder as Import reads from)
      try {
        const response = await fetch(`${INTEGRATION_URL}/save-specifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            files,
            subfolder: 'definition'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          alert(`✅ Diagram saved!\n\n${data.message}\n\nMarkdown files saved to definition/`);
        } else {
          console.warn('Failed to save definition files');
          alert('✅ Diagram saved to database.\n\n⚠️ Could not save markdown files to definition folder.');
        }
      } catch (error) {
        console.error('Failed to save definition files:', error);
        alert('✅ Diagram saved to database.\n\n⚠️ Could not save markdown files to definition folder.');
      }
    } else if (capabilities.length > 0) {
      alert('✅ Diagram saved to database.\n\nNote: Set a project folder in Workspaces to also export markdown files.');
    }
  };

  // Export diagram to markdown file
  const exportDiagramToMarkdown = async (
    diagramType: string,
    diagramContent: string,
    diagramTitle: string
  ) => {
    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    if (!diagramContent) {
      alert(`No ${diagramTitle} content to export. Please generate the diagram first.`);
      return;
    }

    // Generate filename: TYPE-NAME-(n).md
    const typePrefix = diagramType.toUpperCase();
    const safeName = diagramTitle.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${typePrefix}-${safeName}-1.md`;

    // Generate markdown content
    let markdown = `# ${diagramTitle}\n\n`;
    markdown += `## Metadata\n`;
    markdown += `- **Type**: ${diagramTitle}\n`;
    markdown += `- **Workspace**: ${currentWorkspace.name}\n`;
    markdown += `- **Generated**: ${new Date().toLocaleString()}\n\n`;
    markdown += `## Diagram\n\n`;
    markdown += '```mermaid\n';
    markdown += diagramContent;
    markdown += '\n```\n';

    try {
      const response = await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          subfolder: 'implementation',
          files: [{ fileName, content: markdown }],
        }),
      });

      if (response.ok) {
        alert(`✅ ${diagramTitle} exported!\n\nFile: ${fileName}\n\nSaved to: implementation/`);
      } else {
        throw new Error('Failed to save file');
      }
    } catch (error) {
      console.error('Failed to export diagram:', error);
      alert(`Failed to export ${diagramTitle}`);
    }
  };

  const exportStateDiagram = () => exportDiagramToMarkdown('STATE', stateDiagramContent, 'State Diagram');
  const exportSequenceDiagram = () => exportDiagramToMarkdown('SEQ', sequenceDiagramContent, 'Sequence Diagram');
  const exportDataModelDiagram = () => exportDiagramToMarkdown('DATA', dataModelsContent, 'Data Model');
  const exportClassDiagram = () => exportDiagramToMarkdown('CLASS', classDiagramsContent, 'Class Diagram');

  // Export system diagram to SYSTEM-SYSTEM.md
  const exportSystemDiagram = async () => {
    console.log('[System] exportSystemDiagram called');
    console.log('[System] currentWorkspace:', currentWorkspace);
    console.log('[System] projectFolder:', currentWorkspace?.projectFolder);
    console.log('[System] capabilities count:', capabilities.length);

    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    if (capabilities.length === 0) {
      alert('No system diagram data to export. Please run AI Analyze first.');
      return;
    }

    const fileName = 'SYSTEM-SYSTEM.md';
    console.log('[System] Exporting to:', currentWorkspace.projectFolder, '/implementation/', fileName);

    // Generate markdown content
    let markdown = `# System Diagram\n\n`;
    markdown += `## Metadata\n`;
    markdown += `- **Type**: System Diagram\n`;
    markdown += `- **Workspace**: ${currentWorkspace.name}\n`;
    markdown += `- **Generated**: ${new Date().toISOString()}\n`;
    markdown += `- **Capabilities**: ${capabilities.length}\n`;
    markdown += `- **Enablers**: ${enablers.length}\n`;
    markdown += `- **Test Scenarios**: ${testScenarios.length}\n\n`;

    // Capabilities section
    markdown += `## Capabilities\n\n`;
    markdown += `| ID | Name | Status | X | Y |\n`;
    markdown += `|----|------|--------|---|---|\n`;
    capabilities.forEach((cap) => {
      markdown += `| ${cap.id} | ${cap.name} | ${cap.status} | ${cap.x} | ${cap.y} |\n`;
    });
    markdown += `\n`;

    // Enablers section
    markdown += `## Enablers\n\n`;
    markdown += `| ID | Name | Capability ID | X | Y |\n`;
    markdown += `|----|------|---------------|---|---|\n`;
    enablers.forEach((enb) => {
      markdown += `| ${enb.id} | ${enb.name} | ${enb.capabilityId} | ${enb.x} | ${enb.y} |\n`;
    });
    markdown += `\n`;

    // Test Scenarios section
    markdown += `## Test Scenarios\n\n`;
    markdown += `| ID | Name | Enabler ID | X | Y |\n`;
    markdown += `|----|------|------------|---|---|\n`;
    testScenarios.forEach((ts) => {
      markdown += `| ${ts.id} | ${ts.name} | ${ts.enablerId} | ${ts.x} | ${ts.y} |\n`;
    });
    markdown += `\n`;

    // Connections section
    markdown += `## Connections\n\n`;

    markdown += `### Capability Dependencies\n\n`;
    markdown += `| From | To |\n`;
    markdown += `|------|----|\n`;
    capabilityDependencies.forEach((dep) => {
      markdown += `| ${dep.from} | ${dep.to} |\n`;
    });
    markdown += `\n`;

    markdown += `### Enabler Connections (Capability -> Enabler)\n\n`;
    markdown += `| Capability ID | Enabler ID |\n`;
    markdown += `|---------------|------------|\n`;
    enablerConnections.forEach((conn) => {
      markdown += `| ${conn.capabilityId} | ${conn.enablerId} |\n`;
    });
    markdown += `\n`;

    markdown += `### Test Scenario Connections (Enabler -> Test Scenario)\n\n`;
    markdown += `| Enabler ID | Scenario ID |\n`;
    markdown += `|------------|-------------|\n`;
    testScenarioConnections.forEach((conn) => {
      markdown += `| ${conn.enablerId} | ${conn.scenarioId} |\n`;
    });
    markdown += `\n`;

    // View settings
    const currentScrollLeft = wrapperRef.current?.scrollLeft || 0;
    const currentScrollTop = wrapperRef.current?.scrollTop || 0;
    markdown += `## View Settings\n\n`;
    markdown += `- **Zoom**: ${zoom}\n`;
    markdown += `- **Scroll Left**: ${currentScrollLeft}\n`;
    markdown += `- **Scroll Top**: ${currentScrollTop}\n`;

    try {
      console.log('[System] Calling API:', `${INTEGRATION_URL}/save-specifications`);
      const requestBody = {
        workspacePath: currentWorkspace.projectFolder,
        subfolder: 'implementation',
        files: [{ fileName, content: markdown }],
      };
      console.log('[System] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[System] Response status:', response.status);
      const responseText = await response.text();
      console.log('[System] Response body:', responseText);

      if (response.ok) {
        alert(`✅ System Diagram exported!\n\nFile: ${fileName}\n\nSaved to: ${currentWorkspace.projectFolder}/implementation/`);
      } else {
        throw new Error(`Failed to save file: ${responseText}`);
      }
    } catch (error) {
      console.error('[System] Failed to export system diagram:', error);
      alert(`Failed to export System Diagram: ${error}`);
    }
  };

  // Import state diagram from markdown file
  const importStateDiagram = async () => {
    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    const fileName = 'STATE-STATE-DIAGRAM-1.md';

    try {
      const response = await fetch(`${INTEGRATION_URL}/read-specification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          subfolder: 'implementation',
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('File not found or could not be read');
      }

      const data = await response.json();
      const content = data.content || '';

      // Extract mermaid content from markdown
      const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch && mermaidMatch[1]) {
        setStateDiagramContent(mermaidMatch[1].trim());
        // Save to localStorage for persistence
        localStorage.setItem(`system_state_diagram_${currentWorkspace.id}`, mermaidMatch[1].trim());
        alert(`✅ State Diagram imported from ${fileName}`);
      } else {
        alert('No mermaid diagram found in the file.');
      }
    } catch (error) {
      console.error('Failed to import state diagram:', error);
      alert(`Failed to import State Diagram from ${fileName}.\n\nMake sure the file exists in the implementation folder.`);
    }
  };

  // Import sequence diagram from markdown file
  const importSequenceDiagram = async () => {
    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    const fileName = 'SEQ-SEQUENCE-DIAGRAM-1.md';

    try {
      const response = await fetch(`${INTEGRATION_URL}/read-specification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          subfolder: 'implementation',
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('File not found or could not be read');
      }

      const data = await response.json();
      const content = data.content || '';

      // Extract mermaid content from markdown
      const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch && mermaidMatch[1]) {
        setSequenceDiagramContent(mermaidMatch[1].trim());
        localStorage.setItem(`system_sequence_diagram_${currentWorkspace.id}`, mermaidMatch[1].trim());
        alert(`✅ Sequence Diagram imported from ${fileName}`);
      } else {
        alert('No mermaid diagram found in the file.');
      }
    } catch (error) {
      console.error('Failed to import sequence diagram:', error);
      alert(`Failed to import Sequence Diagram from ${fileName}.\n\nMake sure the file exists in the implementation folder.`);
    }
  };

  // Import data model diagram from markdown file
  const importDataModelDiagram = async () => {
    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    const fileName = 'DATA-DATA-MODEL-1.md';

    try {
      const response = await fetch(`${INTEGRATION_URL}/read-specification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          subfolder: 'implementation',
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('File not found or could not be read');
      }

      const data = await response.json();
      const content = data.content || '';

      // Extract mermaid content from markdown
      const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch && mermaidMatch[1]) {
        setDataModelsContent(mermaidMatch[1].trim());
        localStorage.setItem(`system_data_models_${currentWorkspace.id}`, mermaidMatch[1].trim());
        alert(`✅ Data Model imported from ${fileName}`);
      } else {
        alert('No mermaid diagram found in the file.');
      }
    } catch (error) {
      console.error('Failed to import data model diagram:', error);
      alert(`Failed to import Data Model from ${fileName}.\n\nMake sure the file exists in the implementation folder.`);
    }
  };

  // Import class diagram from markdown file
  const importClassDiagram = async () => {
    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    const fileName = 'CLASS-CLASS-DIAGRAM-1.md';

    try {
      const response = await fetch(`${INTEGRATION_URL}/read-specification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          subfolder: 'implementation',
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('File not found or could not be read');
      }

      const data = await response.json();
      const content = data.content || '';

      // Extract mermaid content from markdown
      const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch && mermaidMatch[1]) {
        setClassDiagramsContent(mermaidMatch[1].trim());
        localStorage.setItem(`system_class_diagrams_${currentWorkspace.id}`, mermaidMatch[1].trim());
        alert(`✅ Class Diagram imported from ${fileName}`);
      } else {
        alert('No mermaid diagram found in the file.');
      }
    } catch (error) {
      console.error('Failed to import class diagram:', error);
      alert(`Failed to import Class Diagram from ${fileName}.\n\nMake sure the file exists in the implementation folder.`);
    }
  };

  // Export all diagrams at once
  const exportAllDiagrams = async () => {
    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    const files: Array<{ fileName: string; content: string }> = [];

    // Export capabilities and enablers
    capabilities.forEach((capability, index) => {
      const safeName = capability.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
      const fileName = `CAP-${safeName}-${index + 1}.md`;

      const relatedEnablers = enablers.filter(e => e.capabilityId === capability.id);
      const upstream = capabilityDependencies
        .filter(d => d.to === capability.id)
        .map(d => capabilities.find(c => c.id === d.from)?.name)
        .filter(Boolean);
      const downstream = capabilityDependencies
        .filter(d => d.from === capability.id)
        .map(d => capabilities.find(c => c.id === d.to)?.name)
        .filter(Boolean);

      let markdown = `# ${capability.name}\n\n`;
      markdown += `## Metadata\n`;
      markdown += `- **ID**: ${capability.id}\n`;
      markdown += `- **Type**: Capability\n`;
      markdown += `- **Status**: ${capability.status || 'Not Set'}\n`;
      markdown += `- **Generated**: ${new Date().toLocaleString()}\n\n`;

      if (relatedEnablers.length > 0) {
        markdown += `## Enablers\n`;
        relatedEnablers.forEach(e => { markdown += `- ${e.name}\n`; });
        markdown += '\n';
      }
      if (upstream.length > 0) {
        markdown += `## Upstream Dependencies\n`;
        upstream.forEach(name => { markdown += `- ${name}\n`; });
        markdown += '\n';
      }
      if (downstream.length > 0) {
        markdown += `## Downstream Impacts\n`;
        downstream.forEach(name => { markdown += `- ${name}\n`; });
        markdown += '\n';
      }

      files.push({ fileName, content: markdown });
    });

    // Export enablers
    enablers.forEach((enabler, index) => {
      const safeName = enabler.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
      const fileName = `ENB-${safeName}-${index + 1}.md`;
      const parentCap = capabilities.find(c => c.id === enabler.capabilityId);

      let markdown = `# ${enabler.name}\n\n`;
      markdown += `## Metadata\n`;
      markdown += `- **ID**: ${enabler.id}\n`;
      markdown += `- **Type**: Enabler\n`;
      markdown += `- **Parent Capability**: ${parentCap?.name || 'None'}\n`;
      markdown += `- **Generated**: ${new Date().toLocaleString()}\n\n`;

      files.push({ fileName, content: markdown });
    });

    // Export diagrams
    const diagramExports = [
      { type: 'STATE', content: stateDiagramContent, title: 'State Diagram' },
      { type: 'SEQ', content: sequenceDiagramContent, title: 'Sequence Diagram' },
      { type: 'DATA', content: dataModelsContent, title: 'Data Model' },
      { type: 'CLASS', content: classDiagramsContent, title: 'Class Diagram' },
    ];

    diagramExports.forEach(({ type, content, title }) => {
      if (content) {
        const safeName = title.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
        const fileName = `${type}-${safeName}-1.md`;

        let markdown = `# ${title}\n\n`;
        markdown += `## Metadata\n`;
        markdown += `- **Type**: ${title}\n`;
        markdown += `- **Workspace**: ${currentWorkspace.name}\n`;
        markdown += `- **Generated**: ${new Date().toLocaleString()}\n\n`;
        markdown += `## Diagram\n\n`;
        markdown += '```mermaid\n';
        markdown += content;
        markdown += '\n```\n';

        files.push({ fileName, content: markdown });
      }
    });

    // Separate files into definition (caps/enablers) and implementation (diagrams)
    const definitionFiles = files.filter(f => f.fileName.startsWith('CAP-') || f.fileName.startsWith('ENB-'));
    const implementationFiles = files.filter(f => !f.fileName.startsWith('CAP-') && !f.fileName.startsWith('ENB-'));

    if (definitionFiles.length === 0 && implementationFiles.length === 0) {
      alert('No content to export. Please analyze or generate diagrams first.');
      return;
    }

    try {
      const results: string[] = [];

      // Save capabilities and enablers to definition folder
      if (definitionFiles.length > 0) {
        const defResponse = await fetch(`${INTEGRATION_URL}/save-specifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            subfolder: 'definition',
            files: definitionFiles,
          }),
        });

        if (defResponse.ok) {
          results.push(`${definitionFiles.length} capability/enabler files → definition/`);
        } else {
          throw new Error('Failed to save definition files');
        }
      }

      // Save diagrams to implementation folder
      if (implementationFiles.length > 0) {
        const implResponse = await fetch(`${INTEGRATION_URL}/save-specifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            subfolder: 'implementation',
            files: implementationFiles,
          }),
        });

        if (implResponse.ok) {
          results.push(`${implementationFiles.length} diagram files → implementation/`);
        } else {
          throw new Error('Failed to save implementation files');
        }
      }

      alert(`✅ Export All Complete!\n\n${results.join('\n')}`);
    } catch (error) {
      console.error('Failed to export all:', error);
      alert('Failed to export diagrams');
    }
  };

  const loadSavedPositions = () => {
    if (!currentWorkspace) return null;

    // First, try to load from localStorage (browser cache)
    const saved = localStorage.getItem(`system_positions_${currentWorkspace.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error loading saved positions from localStorage:', error);
      }
    }

    // If localStorage is empty, load from database (workspace.systemDiagram)
    if (currentWorkspace.systemDiagram) {
      console.log('Loading system diagram from database');
      return currentWorkspace.systemDiagram;
    }

    return null;
  };

  // Load saved diagram from cache or database (fast, no AI analysis)
  const loadSavedDiagram = () => {
    console.log('[System] Loading saved diagram from cache/database...');
    const savedData = loadSavedPositions();

    if (savedData && savedData.capabilities && savedData.capabilities.length > 0) {
      console.log('[System] Found saved diagram with', savedData.capabilities.length, 'capabilities');
      setCapabilities(savedData.capabilities);
      setEnablers(savedData.enablers || []);
      setCapabilityDependencies(savedData.capabilityDependencies || []);
      setEnablerConnections(savedData.enablerConnections || []);

      // Restore zoom level
      if (savedData.zoom !== undefined) {
        setZoom(savedData.zoom);
        console.log('[System] Restored zoom level:', savedData.zoom);
      }

      // Restore scroll position after a brief delay to ensure DOM is ready
      if (savedData.scrollLeft !== undefined || savedData.scrollTop !== undefined) {
        setTimeout(() => {
          if (wrapperRef.current) {
            wrapperRef.current.scrollLeft = savedData.scrollLeft || 0;
            wrapperRef.current.scrollTop = savedData.scrollTop || 0;
            console.log('[System] Restored scroll position:', savedData.scrollLeft, savedData.scrollTop);
          }
        }, 100);
      }

      setIsLoading(false);
    } else {
      console.log('[System] No saved diagram found. User needs to click Import.');
      setIsLoading(false);
    }
  };

  const parseMarkdownToJSON = (markdown: string, filename: string) => {
    const lines = markdown.split('\n');
    const result: any = {
      filename,
      metadata: {},
      enablers: [],
      upstreamDependencies: [],
      downstreamImpacts: [],
    };

    let currentSection = '';
    let inTable = false;
    let tableHeaders: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect sections
      if (line.startsWith('##')) {
        currentSection = line.replace(/^##\s*/, '').toLowerCase();
        inTable = false;
        continue;
      }

      // Parse metadata
      if (currentSection === 'metadata' && line.includes('-') && line.includes(':')) {
        const match = line.match(/\*\*(.+?)\*\*:\s*(.+)/);
        if (match) {
          const [, key, value] = match;
          result.metadata[key.toLowerCase().replace(/\s+/g, '_')] = value;
        }
      }

      // Detect table starts
      if (line.startsWith('|') && !inTable) {
        tableHeaders = line.split('|').map(h => h.trim()).filter(Boolean);
        inTable = true;
        i++; // Skip separator line
        continue;
      }

      // Parse table rows
      if (inTable && line.startsWith('|')) {
        const values = line.split('|').map(v => v.trim()).filter(Boolean);
        if (values.length >= 2) {
          const row: any = {};
          tableHeaders.forEach((header, idx) => {
            row[header.toLowerCase().replace(/\s+/g, '_')] = values[idx] || '';
          });

          if (currentSection === 'enablers') {
            result.enablers.push(row);
          } else if (currentSection.includes('upstream')) {
            result.upstreamDependencies.push(row);
          } else if (currentSection.includes('downstream')) {
            result.downstreamImpacts.push(row);
          }
        }
      } else if (inTable && !line.startsWith('|')) {
        inTable = false;
      }
    }

    return result;
  };

  const loadSpecifications = async () => {
    console.log('[System] loadSpecifications called');
    console.log('[System] currentWorkspace:', currentWorkspace);

    if (!currentWorkspace) {
      console.log('[System] No workspace selected - loading mock data');
      loadMockData();
      return;
    }

    if (!currentWorkspace.projectFolder) {
      console.warn('[System] No workspace folder set for workspace. Please set a workspace folder in the Workspaces page.');
      loadMockData();
      return;
    }

    console.log('[System] Workspace folder:', currentWorkspace.projectFolder);
    setIsLoading(true);

    // Clear the grid to start with a clean slate
    setCapabilities([]);
    setEnablers([]);
    setCapabilityDependencies([]);
    setEnablerConnections([]);
    console.log('[System] Cleared existing diagram data');

    try {
      // Read capabilities and enablers from the definition folder
      console.log('[System] Fetching capabilities, enablers, and test scenarios from definition folder...');

      // Fetch capabilities from definition folder
      const capResponse = await fetch(`${INTEGRATION_URL}/capability-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      // Fetch enablers from definition folder
      const enbResponse = await fetch(`${INTEGRATION_URL}/enabler-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      // Fetch test scenarios from definition folder
      const tsResponse = await fetch(`${INTEGRATION_URL}/test-scenario-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      const capData = await capResponse.json();
      const enbData = await enbResponse.json();
      const tsData = await tsResponse.json();

      console.log('[System] Capabilities found:', capData.capabilities?.length || 0);
      console.log('[System] Enablers found:', enbData.enablers?.length || 0);
      console.log('[System] Test scenarios found:', tsData.testScenarios?.length || 0);

      // Directly use the parsed file data (no AI re-analysis needed)
      const capabilitiesFromFiles = capData.capabilities || [];
      const enablersFromFiles = enbData.enablers || [];
      const testScenariosFromFiles = tsData.testScenarios || [];

      console.log('[System] Total capabilities from files:', capabilitiesFromFiles.length);
      console.log('[System] Total enablers from files:', enablersFromFiles.length);
      console.log('[System] Total test scenarios from files:', testScenariosFromFiles.length);

      if (capabilitiesFromFiles.length === 0 && enablersFromFiles.length === 0) {
        console.log('[System] No capability/enabler files found in definition folder - loading mock data');
        loadMockData();
        return;
      }

      // Helper function to extract ID from filename or content
      // IMPORTANT: Use filename-based ID because enablers reference capabilities by filename pattern
      // e.g., enabler has "**Capability**: Name (CAP-WEATHER-DATA-RETRIEVAL-16)"
      // NOT the numeric content ID like "CAP-016"
      const extractId = (filename: string, content: string, prefix: string): string => {
        // Try to extract from filename FIRST (e.g., CAP-WEATHER-DATA-RETRIEVAL-16.md)
        // This is what enablers use to reference capabilities
        const filenameMatch = filename.match(new RegExp(`(${prefix}-[A-Z0-9-]+)`, 'i'));
        if (filenameMatch) return filenameMatch[1].toUpperCase();

        // Fallback: Try to extract from content (e.g., **ID**: CAP-123456)
        const contentMatch = content.match(new RegExp(`\\*\\*ID\\*\\*:\\s*(${prefix}-[A-Z0-9-]+)`, 'i'));
        if (contentMatch) return contentMatch[1].toUpperCase();

        // Last resort: Generate from filename number
        const numMatch = filename.match(/(\d+)/);
        return numMatch ? `${prefix}-${numMatch[1]}` : `${prefix}-${filename.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase()}`;
      };

      // Helper function to extract Capability ID from enabler content (tries multiple patterns)
      const extractCapabilityId = (content: string, fields: Record<string, string> | undefined): string | null => {
        // Try multiple patterns for capability ID reference
        // Order matters: more specific patterns first
        const patterns = [
          /\*\*Capability ID\*\*:\s*(CAP-[A-Z0-9-]+)/i,
          /\*\*Capability\s*ID\*\*:\s*(CAP-[A-Z0-9-]+)/i,
          /Capability ID:\s*(CAP-[A-Z0-9-]+)/i,
          /capabilityId:\s*(CAP-[A-Z0-9-]+)/i,
          // Match "**Capability**: Name (CAP-NAME-123)" format - extract the ID in parentheses
          /\*\*Capability\*\*:[^(]*\((CAP-[A-Z0-9-]+)\)/i,
          /capability:\s*(CAP-[A-Z0-9-]+)/i,
          /parent:\s*(CAP-[A-Z0-9-]+)/i,
          /(CAP-\d{3,6})/i,  // Match CAP-XXX to CAP-XXXXXX numeric pattern
          /(CAP-[A-Z]+-[A-Z0-9-]+-\d+)/i,  // Match CAP-NAME-WORDS-123 pattern anywhere
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) return match[1].toUpperCase();
        }

        // Try fields object
        if (fields) {
          for (const key of Object.keys(fields)) {
            if (key.toLowerCase().includes('capability') && key.toLowerCase().includes('id')) {
              const value = fields[key];
              if (value && value.toUpperCase().startsWith('CAP-')) {
                return value.toUpperCase();
              }
            }
            // Also check for just "Capability" field that may contain the ID in parentheses
            if (key.toLowerCase() === 'capability') {
              const value = fields[key];
              if (value) {
                // Extract ID from "Name (CAP-XXX)" format
                const idMatch = value.match(/\((CAP-[A-Z0-9-]+)\)/i);
                if (idMatch) return idMatch[1].toUpperCase();
                // Or if it directly starts with CAP-
                if (value.toUpperCase().startsWith('CAP-')) {
                  return value.toUpperCase();
                }
              }
            }
          }
        }

        return null;
      };

      // Convert file-based capabilities to diagram format
      const uniqueCapabilities = capabilitiesFromFiles.map((cap: any) => ({
        id: extractId(cap.filename, cap.content || '', 'CAP'),
        name: cap.name || cap.filename.replace(/\.md$/i, ''),
        status: cap.status || 'Planned',
        enablers: [],
        upstreamDependencies: [],
        downstreamImpacts: [],
        fields: cap.fields || {}, // Include fields for Storyboard Reference
        filename: cap.filename, // Store original filename for deletion
      }));

      console.log('[System] Processed capabilities:', uniqueCapabilities.length);
      console.log('[System] Capability IDs:', uniqueCapabilities.map((c: any) => c.id));
      // Log each capability's storyboard reference individually for visibility
      uniqueCapabilities.forEach((c: any) => {
        const ref = c.fields?.['Storyboard Reference'];
        if (ref) {
          console.log(`[System] Cap "${c.name}" has Storyboard Ref: "${ref}"`);
        }
      });
      const capsWithRefs = uniqueCapabilities.filter((c: any) => c.fields?.['Storyboard Reference']);
      const capsWithoutRefs = uniqueCapabilities.filter((c: any) => !c.fields?.['Storyboard Reference']);
      console.log(`[System] Capabilities WITH Storyboard Reference: ${capsWithRefs.length}`);
      console.log(`[System] Capabilities WITHOUT Storyboard Reference: ${capsWithoutRefs.length}`);

      // Build a map of capability IDs for quick lookup
      const capIdSet = new Set(uniqueCapabilities.map((c: any) => c.id));
      const capIdList = uniqueCapabilities.map((c: any) => c.id);

      // Convert file-based enablers to diagram format
      const safeEnablers = enablersFromFiles.map((enb: any, index: number) => {
        let capabilityId = extractCapabilityId(enb.content || '', enb.fields);

        // If no capability ID found, try to extract from the enabler's path
        // e.g., if enabler is in a folder named after the capability
        if (!capabilityId && enb.path) {
          const pathMatch = enb.path.match(/(CAP-[A-Z0-9-]+)/i);
          if (pathMatch) capabilityId = pathMatch[1].toUpperCase();
        }

        // If still no capability ID, assign to first capability (as fallback to show connections)
        // This ensures enablers are at least displayed with some connection
        if (!capabilityId || !capIdSet.has(capabilityId)) {
          // Assign to capabilities in round-robin fashion so they're distributed
          capabilityId = capIdList[index % capIdList.length] || 'CAP-UNKNOWN';
          console.log(`[System] Enabler ${enb.filename} has no matching capability, assigning to ${capabilityId}`);
        }

        return {
          id: extractId(enb.filename, enb.content || '', 'ENB'),
          name: enb.name || enb.filename.replace(/\.md$/i, ''),
          capabilityId: capabilityId,
          filename: enb.filename, // Store original filename for deletion
        };
      });

      console.log('[System] Processed enablers:', safeEnablers.length);
      console.log('[System] Enabler assignments:', safeEnablers.map((e: any) => `${e.name} -> ${e.capabilityId}`));

      // Log matching info
      const matchedEnablers = safeEnablers.filter((e: any) => capIdSet.has(e.capabilityId));
      console.log('[System] Enablers with valid capability match:', matchedEnablers.length, 'of', safeEnablers.length);

      // Log enabler count per capability for debugging
      const enablersByCapDebug: Record<string, string[]> = {};
      safeEnablers.forEach((e: any) => {
        if (!enablersByCapDebug[e.capabilityId]) enablersByCapDebug[e.capabilityId] = [];
        enablersByCapDebug[e.capabilityId].push(e.name);
      });
      console.log('[System] Enablers grouped by capability:', enablersByCapDebug);

      // Calculate positions for auto-layout with proper spacing
      // Card dimensions and spacing constants
      const CAPABILITY_WIDTH = 250;
      const CAPABILITY_HEIGHT = 150;
      const ENABLER_WIDTH = 200;
      const ENABLER_HEIGHT = 100;
      const CAPABILITY_SPACING = 50;  // Vertical spacing between capability rows
      const CAP_TO_ENABLER_SPACING = 20;  // 20px between capability and its enablers
      const ENABLER_H_SPACING = 15;  // Horizontal spacing between enablers
      const ENABLER_V_SPACING = 15;  // Vertical spacing between enabler rows
      const COLS_PER_ROW = 3;

      // Horizontal spacing between capability columns
      const capHorizontalSpacing = CAPABILITY_WIDTH + 200;

      // First, count enablers per capability to calculate row heights
      const enablerCountByCapability: Record<string, number> = {};
      safeEnablers.forEach((enb: any) => {
        enablerCountByCapability[enb.capabilityId] = (enablerCountByCapability[enb.capabilityId] || 0) + 1;
      });

      // Calculate how many enabler rows each capability needs
      const maxEnablersPerRow = 2; // Put 2 enablers per row below each capability
      const getEnablerRowCount = (capId: string) => {
        const count = enablerCountByCapability[capId] || 0;
        return Math.ceil(count / maxEnablersPerRow);
      };

      // Calculate the height needed for a capability (including its enablers)
      const getCapabilityTotalHeight = (capId: string) => {
        const enablerRows = getEnablerRowCount(capId);
        if (enablerRows === 0) {
          return CAPABILITY_HEIGHT;
        }
        return CAPABILITY_HEIGHT + CAP_TO_ENABLER_SPACING + (enablerRows * (ENABLER_HEIGHT + ENABLER_V_SPACING));
      };

      // Position capabilities with dynamic row heights
      // First, organize capabilities into rows
      const capabilityRows: any[][] = [];
      uniqueCapabilities.forEach((cap: any, idx: number) => {
        const rowIdx = Math.floor(idx / COLS_PER_ROW);
        if (!capabilityRows[rowIdx]) {
          capabilityRows[rowIdx] = [];
        }
        capabilityRows[rowIdx].push({ ...cap, originalIndex: idx });
      });

      // Calculate Y position for each row based on max height in previous rows
      const rowYPositions: number[] = [];
      let currentY = 100;
      capabilityRows.forEach((row, rowIdx) => {
        rowYPositions[rowIdx] = currentY;
        // Find the max height in this row (tallest capability with its enablers)
        const maxHeight = Math.max(...row.map((cap: any) => getCapabilityTotalHeight(cap.id)));
        currentY += maxHeight + CAPABILITY_SPACING;
      });

      // Now position capabilities
      const capsWithPositions = uniqueCapabilities.map((cap: any, idx: number) => {
        const rowIdx = Math.floor(idx / COLS_PER_ROW);
        const colIdx = idx % COLS_PER_ROW;
        return {
          id: cap.id,
          name: cap.name,
          status: cap.status,
          enablers: cap.enablers || [],
          upstreamDependencies: cap.upstreamDependencies || [],
          downstreamImpacts: cap.downstreamImpacts || [],
          fields: cap.fields || {}, // CRITICAL: Include fields for Storyboard Reference sorting
          filename: cap.filename, // Include filename for deletion
          x: 100 + colIdx * capHorizontalSpacing,
          y: rowYPositions[rowIdx],
        };
      });

      // Debug: Log enabler-to-capability matching
      console.log('[System] Matching enablers to capabilities:');
      console.log('[System] - Capability IDs:', capsWithPositions.map((c: Capability) => c.id));
      console.log('[System] - Enabler counts:', enablerCountByCapability);

      // Track how many enablers we've positioned per capability
      const enablerIndexByCapability: Record<string, number> = {};

      const enbsWithPositions = safeEnablers.map((enb: any, idx: number) => {
        // Position enablers below their parent capability
        const parentCap = capsWithPositions.find((c: Capability) => c.id === enb.capabilityId);

        if (parentCap) {
          // Get the index of this enabler within its capability's enablers
          const siblingIndex = enablerIndexByCapability[enb.capabilityId] || 0;
          enablerIndexByCapability[enb.capabilityId] = siblingIndex + 1;

          // Calculate enabler position in a grid below the capability
          const enablerRow = Math.floor(siblingIndex / maxEnablersPerRow);
          const enablerCol = siblingIndex % maxEnablersPerRow;

          return {
            id: enb.id,
            name: enb.name,
            capabilityId: enb.capabilityId,
            x: parentCap.x + enablerCol * (ENABLER_WIDTH + ENABLER_H_SPACING),
            y: parentCap.y + CAPABILITY_HEIGHT + CAP_TO_ENABLER_SPACING + enablerRow * (ENABLER_HEIGHT + ENABLER_V_SPACING),
          };
        }

        // Orphaned enablers (no parent capability) - position at the bottom
        const orphanRow = Math.floor(idx / COLS_PER_ROW);
        const orphanCol = idx % COLS_PER_ROW;
        const maxY = Math.max(...capsWithPositions.map((c: Capability) => c.y + getCapabilityTotalHeight(c.id)));
        return {
          id: enb.id,
          name: enb.name,
          capabilityId: enb.capabilityId,
          x: 100 + orphanCol * (ENABLER_WIDTH + ENABLER_H_SPACING),
          y: maxY + CAPABILITY_SPACING + orphanRow * (ENABLER_HEIGHT + ENABLER_V_SPACING),
        };
      });

      console.log('[System] Layout complete - enablers positioned:', enbsWithPositions.length);

      // Build dependencies from upstream/downstream data
      const dependencies: CapabilityDependency[] = [];
      capsWithPositions.forEach((cap: Capability) => {
        cap.upstreamDependencies?.forEach((upstreamId: string) => {
          dependencies.push({ from: upstreamId, to: cap.id });
        });
      });

      // Build enabler connections
      const connections: EnablerConnection[] = [];
      enbsWithPositions.forEach((enb: Enabler) => {
        connections.push({ capabilityId: enb.capabilityId, enablerId: enb.id });
      });

      // Load saved positions and merge with new data
      const savedData = loadSavedPositions();

      let finalCapabilities = capsWithPositions;
      let finalEnablers = enbsWithPositions;

      if (savedData && savedData.capabilities) {
        // Merge saved positions with new capabilities
        // ONLY merge cards that exist in the current parse (from current workspace)
        // This prevents old cached cards from appearing
        finalCapabilities = capsWithPositions.map((cap: Capability) => {
          const savedCap = savedData.capabilities.find((c: any) => c.id === cap.id);
          // If we have saved position data, use it, but keep the fresh capability data
          return savedCap ? { ...cap, x: savedCap.x, y: savedCap.y } : cap;
        });
      }

      if (savedData && savedData.enablers) {
        // Merge saved positions with new enablers
        // ONLY merge enablers that exist in the current parse
        finalEnablers = enbsWithPositions.map((enb: Enabler) => {
          const savedEnb = savedData.enablers.find((e: any) => e.id === enb.id);
          // If we have saved position data, use it, but keep the fresh enabler data
          return savedEnb ? { ...enb, x: savedEnb.x, y: savedEnb.y } : enb;
        });
      }

      // Process test scenarios - convert from files to diagram format
      const safeTestScenarios: TestScenario[] = testScenariosFromFiles.map((ts: any, idx: number) => {
        const tsId = ts.id || ts.scenarioId || `TS-${idx + 1}`;
        const enbId = ts.enablerId || ts.fields?.['Enabler ID'] || '';
        return {
          id: tsId,
          name: ts.name || ts.title || tsId,
          enablerId: enbId,
          x: 0, // Will be positioned automatically
          y: 0,
        };
      });

      // Build test scenario connections
      const tsConnections: TestScenarioConnection[] = [];
      safeTestScenarios.forEach((ts: TestScenario) => {
        if (ts.enablerId) {
          tsConnections.push({ enablerId: ts.enablerId, scenarioId: ts.id });
        }
      });

      console.log('[System] Setting diagram state:');
      console.log('[System] - Capabilities:', finalCapabilities.length);
      console.log('[System] - Enablers:', finalEnablers.length);
      console.log('[System] - Test Scenarios:', safeTestScenarios.length);
      console.log('[System] - Dependencies:', dependencies.length);
      console.log('[System] - Enabler Connections:', connections.length);
      console.log('[System] - Test Scenario Connections:', tsConnections.length);
      if (connections.length > 0) {
        console.log('[System] - Connection details:', connections.map(c => `${c.capabilityId} -> ${c.enablerId}`));
      }

      setCapabilities(finalCapabilities);
      setEnablers(finalEnablers);
      setTestScenarios(safeTestScenarios);
      setCapabilityDependencies(dependencies);
      setEnablerConnections(connections);
      setTestScenarioConnections(tsConnections);

      console.log('[System] Diagram state updated successfully');

    } catch (error: any) {
      console.error('Error loading capabilities & enablers:', error);

      const errorMessage = error?.message || String(error);
      alert(`⚠️ Failed to load capabilities & enablers\n\nError: ${errorMessage}\n\nPlease ensure the definition folder exists and contains capability/enabler files.\n\nLoading mock data instead.`);

      loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  // AI Analysis - uses Claude to re-analyze the capability and enabler files
  const runAIAnalysis = async () => {
    console.log('[System] runAIAnalysis called');

    if (!currentWorkspace) {
      alert('Please select a workspace first.');
      return;
    }

    if (!currentWorkspace.projectFolder) {
      alert('Please set a workspace folder in the Workspaces page.');
      return;
    }

    // Get Anthropic API key
    const anthropicKey = localStorage.getItem('anthropic_api_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    if (!anthropicKey) {
      alert('Please add your Anthropic API key in the Settings page to enable AI analysis.');
      return;
    }

    setIsLoading(true);
    setCapabilities([]);
    setEnablers([]);
    setTestScenarios([]);
    setCapabilityDependencies([]);
    setEnablerConnections([]);
    setTestScenarioConnections([]);

    try {
      // Fetch capabilities, enablers, and test scenarios from workspace folders
      const [capResponse, enbResponse, tsResponse] = await Promise.all([
        fetch(`${INTEGRATION_URL}/capability-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
        }),
        fetch(`${INTEGRATION_URL}/enabler-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
        }),
        fetch(`${INTEGRATION_URL}/test-scenario-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
        }),
      ]);

      const capData = await capResponse.json();
      const enbData = await enbResponse.json();
      const tsData = await tsResponse.json();

      // Combine files for AI analysis
      const files: Array<{ name: string; content: string }> = [];

      if (capData.capabilities) {
        capData.capabilities.forEach((cap: any) => {
          files.push({ name: cap.filename, content: cap.content });
        });
      }

      if (enbData.enablers) {
        enbData.enablers.forEach((enb: any) => {
          files.push({ name: enb.filename, content: enb.content });
        });
      }

      if (files.length === 0) {
        alert('No capability or enabler files found in the definition folder.');
        setIsLoading(false);
        return;
      }

      console.log('[System] Sending', files.length, 'files to Claude for AI analysis...');

      // Send to AI for analysis
      const analyzeResponse = await fetch(`${INTEGRATION_URL}/specifications/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          anthropic_key: anthropicKey,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        throw new Error(`AI analysis failed: ${analyzeResponse.statusText} - ${errorText}`);
      }

      const analysisResult = await analyzeResponse.json();
      console.log('[System] AI Analysis result:', analysisResult);

      const { capabilities: parsedCapabilities, enablers: parsedEnablers } = analysisResult;

      if (!parsedCapabilities || !Array.isArray(parsedCapabilities) || parsedCapabilities.length === 0) {
        alert('AI analysis did not return any capabilities. Try using Import instead.');
        loadMockData();
        return;
      }

      // Deduplicate capabilities - check both id and capabilityId since backend sends capabilityId
      const seenCapIds = new Set<string>();
      const uniqueCapabilities = parsedCapabilities.filter((cap: any) => {
        const capId = cap.id || cap.capabilityId || cap.filename || '';
        if (!capId || seenCapIds.has(capId)) return false;
        seenCapIds.add(capId);
        return true;
      });

      // Process enablers
      const safeEnablers = parsedEnablers && Array.isArray(parsedEnablers) ? parsedEnablers : [];

      // Process test scenarios from the fetched data
      const safeTestScenarios = tsData.testScenarios && Array.isArray(tsData.testScenarios) ? tsData.testScenarios : [];

      // Calculate positions - smart masonry layout
      const CAPABILITY_WIDTH = 160;
      const CAPABILITY_HEIGHT = 60;
      const ENABLER_WIDTH = 140;
      const ENABLER_HEIGHT = 50;
      const TEST_SCENARIO_WIDTH = 120;
      const TEST_SCENARIO_HEIGHT = 40;
      const ELEMENT_SPACING = 20;
      const GROUP_SPACING = 40; // Space between capability groups
      const NUM_COLUMNS = 4;
      const COLUMN_WIDTH = CAPABILITY_WIDTH + 60;

      // First pass: Build mapping of enablers per capability and test scenarios per enabler
      const capToEnablers: Record<string, any[]> = {};
      const enbToTestScenarios: Record<string, any[]> = {};

      safeEnablers.forEach((enb: any) => {
        const enbId = enb.enablerId || enb.id || enb.fields?.ID || '';
        const capId = enb.capabilityId || enb.fields?.['Capability ID'] || '';
        if (capId) {
          if (!capToEnablers[capId]) capToEnablers[capId] = [];
          capToEnablers[capId].push({ ...enb, enbId });
        }
      });

      safeTestScenarios.forEach((ts: any) => {
        const enbId = ts.enablerId || '';
        if (enbId) {
          if (!enbToTestScenarios[enbId]) enbToTestScenarios[enbId] = [];
          enbToTestScenarios[enbId].push(ts);
        }
      });

      // Calculate total height for each capability group
      const calcGroupHeight = (capId: string) => {
        let height = CAPABILITY_HEIGHT + ELEMENT_SPACING;
        const enablers = capToEnablers[capId] || [];
        enablers.forEach((enb: any) => {
          height += ENABLER_HEIGHT + ELEMENT_SPACING;
          const tests = enbToTestScenarios[enb.enbId] || [];
          height += tests.length * (TEST_SCENARIO_HEIGHT + ELEMENT_SPACING);
        });
        return height + GROUP_SPACING;
      };

      // Track column heights for masonry layout
      const columnHeights = new Array(NUM_COLUMNS).fill(100); // Start at y=100

      // Position capabilities using masonry layout
      const capsWithPositions: Capability[] = [];
      const capPositionMap: Record<string, { x: number; y: number }> = {};

      uniqueCapabilities.forEach((cap: any) => {
        let capId = cap.id || cap.capabilityId || '';
        if (!capId && cap.fields?.Metadata) {
          const idMatch = cap.fields.Metadata.match(/\*\*ID\*\*:\s*(CAP-\d+)/);
          if (idMatch) capId = idMatch[1];
        }
        if (!capId && cap.filename) {
          const numMatch = cap.filename.match(/^(\d+)-capability/);
          if (numMatch) capId = 'CAP-' + numMatch[1];
        }

        // Find column with shortest height
        let shortestCol = 0;
        let shortestHeight = columnHeights[0];
        for (let i = 1; i < NUM_COLUMNS; i++) {
          if (columnHeights[i] < shortestHeight) {
            shortestCol = i;
            shortestHeight = columnHeights[i];
          }
        }

        const x = 100 + shortestCol * COLUMN_WIDTH;
        const y = columnHeights[shortestCol];

        capPositionMap[capId] = { x, y };

        // Update column height
        const groupHeight = calcGroupHeight(capId);
        columnHeights[shortestCol] += groupHeight;

        capsWithPositions.push({
          id: capId,
          name: cap.name,
          status: cap.status || 'Planned',
          enablers: cap.enablers || [],
          upstreamDependencies: cap.upstreamDependencies || [],
          downstreamImpacts: cap.downstreamImpacts || [],
          fields: cap.fields || {}, // Include fields for Storyboard Reference sorting
          x,
          y,
        });
      });

      // Position enablers directly below their capability
      const enbsWithPositions: Enabler[] = [];
      const enbPositionMap: Record<string, { x: number; y: number }> = {};

      Object.entries(capToEnablers).forEach(([capId, enablers]) => {
        const capPos = capPositionMap[capId];
        if (!capPos) return;

        let currentY = capPos.y + CAPABILITY_HEIGHT + ELEMENT_SPACING;

        enablers.forEach((enb: any) => {
          const enbId = enb.enbId;
          enbPositionMap[enbId] = { x: capPos.x, y: currentY };

          enbsWithPositions.push({
            id: enbId,
            name: enb.name,
            capabilityId: capId,
            x: capPos.x,
            y: currentY,
          });

          currentY += ENABLER_HEIGHT + ELEMENT_SPACING;

          // Add space for test scenarios
          const tests = enbToTestScenarios[enbId] || [];
          currentY += tests.length * (TEST_SCENARIO_HEIGHT + ELEMENT_SPACING);
        });
      });

      // Add orphaned enablers at bottom
      let orphanY = Math.max(...columnHeights) + 100;
      safeEnablers.forEach((enb: any, idx: number) => {
        const enbId = enb.enablerId || enb.id || enb.fields?.ID || '';
        if (!enbPositionMap[enbId]) {
          enbPositionMap[enbId] = { x: 100 + (idx % NUM_COLUMNS) * COLUMN_WIDTH, y: orphanY };
          enbsWithPositions.push({
            id: enbId,
            name: enb.name,
            capabilityId: enb.capabilityId || '',
            x: 100 + (idx % NUM_COLUMNS) * COLUMN_WIDTH,
            y: orphanY,
          });
          if ((idx + 1) % NUM_COLUMNS === 0) orphanY += ENABLER_HEIGHT + ELEMENT_SPACING;
        }
      });

      // Build dependencies
      const dependencies: CapabilityDependency[] = [];
      capsWithPositions.forEach((cap: Capability) => {
        cap.upstreamDependencies?.forEach((upstreamId: string) => {
          dependencies.push({ from: upstreamId, to: cap.id });
        });
      });

      // Build enabler connections
      const connections: EnablerConnection[] = [];
      enbsWithPositions.forEach((enb: Enabler) => {
        connections.push({ capabilityId: enb.capabilityId, enablerId: enb.id });
      });

      // Process test scenarios with positions (below their parent enabler, stacked vertically)
      const testScenariosWithPositions = safeTestScenarios.map((ts: any, idx: number) => {
        const parentEnb = enbsWithPositions.find((e: Enabler) => e.id === ts.enablerId);
        if (parentEnb) {
          // Count siblings before this test scenario
          const siblingScenarios = safeTestScenarios.slice(0, idx).filter((s: any) => s.enablerId === ts.enablerId);
          const siblingIndex = siblingScenarios.length;

          // Stack test scenarios vertically under enabler with 20px spacing
          return {
            id: ts.scenarioId || ts.id || `TS-${idx}`,
            name: ts.name || ts.filename,
            enablerId: ts.enablerId,
            x: parentEnb.x + 10, // Slight indent to show hierarchy
            y: parentEnb.y + ENABLER_HEIGHT + ELEMENT_SPACING + siblingIndex * (TEST_SCENARIO_HEIGHT + ELEMENT_SPACING),
          };
        }
        // Orphaned test scenarios - place them at the bottom
        return {
          id: ts.scenarioId || ts.id || `TS-${idx}`,
          name: ts.name || ts.filename,
          enablerId: ts.enablerId || '',
          x: 100 + (idx % NUM_COLUMNS) * (TEST_SCENARIO_WIDTH + ELEMENT_SPACING),
          y: orphanY + 200 + Math.floor(idx / NUM_COLUMNS) * (TEST_SCENARIO_HEIGHT + ELEMENT_SPACING),
        };
      });

      // Build test scenario connections
      const tsConnections: TestScenarioConnection[] = [];
      testScenariosWithPositions.forEach((ts: TestScenario) => {
        if (ts.enablerId) {
          tsConnections.push({ enablerId: ts.enablerId, scenarioId: ts.id });
        }
      });

      console.log('[System] AI Analysis complete:');
      console.log('[System] - Capabilities:', capsWithPositions.length);
      console.log('[System] - Enablers:', enbsWithPositions.length);
      console.log('[System] - Test Scenarios:', testScenariosWithPositions.length);
      console.log('[System] - Enabler Connections:', connections.length);
      console.log('[System] - Test Scenario Connections:', tsConnections.length);

      setCapabilities(capsWithPositions);
      setEnablers(enbsWithPositions);
      setTestScenarios(testScenariosWithPositions);
      setCapabilityDependencies(dependencies);
      setEnablerConnections(connections);
      setTestScenarioConnections(tsConnections);

    } catch (error: any) {
      console.error('AI Analysis error:', error);
      const errorMessage = error?.message || String(error);

      if (errorMessage.includes('credit balance') || errorMessage.includes('API. Please go to Plans')) {
        alert('⚠️ Anthropic API Credit Issue\n\nYour Claude API account has insufficient credits.\n\nPlease add credits at: https://console.anthropic.com/settings/plans');
      } else {
        alert(`⚠️ AI Analysis Failed\n\nError: ${errorMessage}\n\nTry using the Import button instead.`);
      }

      loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockData = () => {
    const mockCapabilities: Capability[] = [
      {
        id: 'CAP-318652',
        name: 'Capability Tracking',
        status: 'Implemented',
        enablers: ['ENB-724938', 'ENB-861452'],
        upstreamDependencies: ['CAP-694827', 'CAP-582341'],
        downstreamImpacts: [],
        x: 500,
        y: 200,
      },
      {
        id: 'CAP-694827',
        name: 'Design Artifact Management',
        status: 'Implemented',
        enablers: [],
        upstreamDependencies: [],
        downstreamImpacts: ['CAP-318652'],
        x: 200,
        y: 200,
      },
      {
        id: 'CAP-582341',
        name: 'Figma Integration Management',
        status: 'Implemented',
        enablers: [],
        upstreamDependencies: [],
        downstreamImpacts: ['CAP-318652'],
        x: 350,
        y: 400,
      },
      {
        id: 'CAP-471395',
        name: 'Container Orchestration',
        status: 'Implemented',
        enablers: ['ENB-147825'],
        upstreamDependencies: [],
        downstreamImpacts: [],
        x: 800,
        y: 200,
      },
    ];

    const mockEnablers: Enabler[] = [
      { id: 'ENB-724938', name: 'Capability Service Endpoint', capabilityId: 'CAP-318652', x: 500, y: 350 },
      { id: 'ENB-861452', name: 'Health Monitoring', capabilityId: 'CAP-318652', x: 600, y: 350 },
      { id: 'ENB-147825', name: 'Health Check System', capabilityId: 'CAP-471395', x: 800, y: 350 },
    ];

    const mockDependencies: CapabilityDependency[] = [
      { from: 'CAP-694827', to: 'CAP-318652' },
      { from: 'CAP-582341', to: 'CAP-318652' },
    ];

    const mockConnections: EnablerConnection[] = [
      { capabilityId: 'CAP-318652', enablerId: 'ENB-724938' },
      { capabilityId: 'CAP-318652', enablerId: 'ENB-861452' },
      { capabilityId: 'CAP-471395', enablerId: 'ENB-147825' },
    ];

    // Load saved data and merge with mock data
    const savedData = loadSavedPositions();

    let finalCapabilities = mockCapabilities;
    let finalEnablers = mockEnablers;

    if (savedData && savedData.capabilities) {
      // Merge saved data with mock capabilities
      finalCapabilities = mockCapabilities.map((cap: Capability) => {
        const savedCap = savedData.capabilities.find((c: any) => c.id === cap.id);
        return savedCap ? { ...cap, ...savedCap } : cap;
      });

      // Also include any saved capabilities that might not be in mock data
      savedData.capabilities.forEach((savedCap: any) => {
        if (!finalCapabilities.find((c: Capability) => c.id === savedCap.id)) {
          finalCapabilities.push(savedCap);
        }
      });
    }

    if (savedData && savedData.enablers) {
      // Merge saved data with mock enablers
      finalEnablers = mockEnablers.map((enb: Enabler) => {
        const savedEnb = savedData.enablers.find((e: any) => e.id === enb.id);
        return savedEnb ? { ...enb, ...savedEnb } : enb;
      });

      // Also include any saved enablers that might not be in mock data
      savedData.enablers.forEach((savedEnb: any) => {
        if (!finalEnablers.find((e: Enabler) => e.id === savedEnb.id)) {
          finalEnablers.push(savedEnb);
        }
      });
    }

    setCapabilities(finalCapabilities);
    setEnablers(finalEnablers);
    setCapabilityDependencies(mockDependencies);
    setEnablerConnections(mockConnections);
  };

  // Generic function to generate diagrams from specifications
  const generateDiagram = async (
    diagramType: 'state' | 'sequence' | 'data-models' | 'class',
    setLoading: (loading: boolean) => void,
    setContent: (content: string) => void
  ) => {
    if (!currentWorkspace) {
      alert('Please select a workspace first.');
      return;
    }

    if (!currentWorkspace.projectFolder) {
      alert('Please set a workspace folder in the Workspaces page.');
      return;
    }

    setLoading(true);

    try {
      // Read capabilities and enablers from the definition folder
      console.log('[System] Generating diagram - fetching from definition folder...');

      // Fetch capabilities from definition folder
      const capResponse = await fetch(`${INTEGRATION_URL}/capability-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      // Fetch enablers from definition folder
      const enbResponse = await fetch(`${INTEGRATION_URL}/enabler-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      const capData = await capResponse.json();
      const enbData = await enbResponse.json();

      // Combine capability and enabler files into a single array for analysis
      const files: Array<{ name: string; content: string }> = [];

      if (capData.capabilities) {
        capData.capabilities.forEach((cap: any) => {
          files.push({ name: cap.filename, content: cap.content });
        });
      }

      if (enbData.enablers) {
        enbData.enablers.forEach((enb: any) => {
          files.push({ name: enb.filename, content: enb.content });
        });
      }

      console.log('[System] Total files for diagram generation:', files.length);

      if (!files || files.length === 0) {
        alert('No capability or enabler files found in the workspace definition folder.');
        setLoading(false);
        return;
      }

      // Get Anthropic API key
      const anthropicKey = localStorage.getItem('anthropic_api_key') || import.meta.env.VITE_ANTHROPIC_API_KEY || '';

      if (!anthropicKey) {
        alert('Please add your Anthropic API key in the Settings page to enable AI-powered generation.');
        setLoading(false);
        return;
      }

      // Define prompts for each diagram type
      const prompts: Record<string, string> = {
        'state': `Analyze these specifications and generate a state diagram in Mermaid format.
                  Identify all states, transitions, and events from the capabilities and enablers.
                  Return ONLY the Mermaid diagram code starting with 'stateDiagram-v2'.`,
        'sequence': `Analyze these specifications and generate a sequence diagram in Mermaid format.
                     Show the interactions between components, capabilities, and enablers over time.
                     Return ONLY the Mermaid diagram code starting with 'sequenceDiagram'.`,
        'data-models': `Analyze these specifications and generate an entity-relationship diagram in Mermaid format.
                        Identify entities, attributes, and relationships from the data described in capabilities.
                        Return ONLY the Mermaid diagram code starting with 'erDiagram'.`,
        'class': `Analyze these specifications and generate a class diagram in Mermaid format.
                  Identify classes, properties, methods, and relationships from capabilities and enablers.

                  CRITICAL: Use ONLY valid Mermaid classDiagram relationship syntax (NOT ER diagram syntax):

                  ✅ CORRECT class diagram syntax:
                  - Inheritance: ClassA <|-- ClassB (or ClassA --|> ClassB)
                  - Composition: ClassA *-- ClassB
                  - Aggregation: ClassA o-- ClassB
                  - Association: ClassA --> ClassB (with label: ClassA --> ClassB : uses)
                  - Dependency: ClassA ..> ClassB
                  - Realization: ClassA ..|> ClassB
                  - Link (solid): ClassA -- ClassB
                  - Bidirectional: ClassA <--> ClassB

                  For cardinality, use quotes:
                  - User "1" -- "*" Workspace : owns
                  - Customer "1" -- "1..*" Order : places

                  ❌ INVALID - DO NOT USE these ER diagram patterns:
                  - ||--|| (one to one)
                  - ||--o{ (one to many)
                  - }o--|| (many to one)
                  - }o--o{ (many to many)
                  - Any syntax with || or {} or |{ or }|

                  Return ONLY the Mermaid diagram code starting with 'classDiagram'.
                  Double-check that ZERO relationships use || or {} characters.`
      };

      // Call backend to generate diagram
      const generateResponse = await fetch(`${INTEGRATION_URL}/specifications/generate-diagram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          anthropic_key: anthropicKey,
          diagram_type: diagramType,
          prompt: prompts[diagramType],
        }),
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        throw new Error(`Failed to generate diagram: ${generateResponse.statusText} - ${errorText}`);
      }

      const result = await generateResponse.json();
      let diagramContent = result.diagram || result.content || '';

      // Post-process class diagrams to fix invalid ER diagram syntax
      if (diagramType === 'class' && diagramContent.includes('classDiagram')) {
        // Replace ER diagram relationship syntax with valid class diagram syntax
        diagramContent = diagramContent
          .replace(/\|\|--o\{/g, '"1" -- "*"')  // One to many
          .replace(/\}\|--\|\|/g, '"*" -- "1"')  // Many to one
          .replace(/\}\|--o\{/g, '"*" -- "*"')   // Many to many
          .replace(/\|\|--\|\|/g, '"1" -- "1"')  // One to one
          .replace(/\}o--o\{/g, '"*" -- "*"')    // Many to many (optional)
          .replace(/\|\|--o/g, '"1" -- "0..1"')  // One to zero or one
          .replace(/o--\|\|/g, '"0..1" -- "1"')  // Zero or one to one
          .replace(/\}o--\|\|/g, '"*" -- "1"');  // Many to one (optional)

        console.log('[System] Cleaned up class diagram syntax');
      }

      setContent(diagramContent);

      // Save to localStorage
      if (currentWorkspace && diagramContent) {
        const storageKeys: Record<string, string> = {
          'state': `system_state_diagram_${currentWorkspace.id}`,
          'sequence': `system_sequence_diagram_${currentWorkspace.id}`,
          'data-models': `system_data_models_${currentWorkspace.id}`,
          'class': `system_class_diagrams_${currentWorkspace.id}`,
        };
        localStorage.setItem(storageKeys[diagramType], diagramContent);
      }

    } catch (error: any) {
      console.error(`Error generating ${diagramType} diagram:`, error);

      // Check if error is related to API credits or specific issues
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('credit balance') || errorMessage.includes('API. Please go to Plans')) {
        alert(`⚠️ Anthropic API Credit Issue\n\nYour Claude API account has insufficient credits. Please add credits to your Anthropic account at:\n\nhttps://console.anthropic.com/settings/plans\n\nThe diagram generation requires API access.`);
      } else if (errorMessage.includes('No specification files found') || errorMessage.includes('No capability')) {
        alert(`⚠️ No Definition Files Found\n\nPlease ensure your workspace has capability and enabler files in:\n${currentWorkspace?.projectFolder}/definition/\n\nYou can create capabilities and enablers using the Capabilities and Enablers pages.`);
      } else if (errorMessage.includes('anthropic_key is required')) {
        alert(`⚠️ API Key Missing\n\nPlease add your Anthropic API key in the Settings page to enable AI-powered diagram generation.`);
      } else {
        alert(`Failed to generate ${diagramType} diagram.\n\nError: ${errorMessage}\n\nPlease check:\n1. API key is configured in Settings\n2. Workspace has capability/enabler files in definition folder\n3. API credits are available`);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateStateDiagram = () => generateDiagram('state', setStateDiagramLoading, setStateDiagramContent);
  const generateSequenceDiagram = () => generateDiagram('sequence', setSequenceDiagramLoading, setSequenceDiagramContent);
  const generateDataModels = () => generateDiagram('data-models', setDataModelsLoading, setDataModelsContent);
  const generateClassDiagrams = () => generateDiagram('class', setClassDiagramsLoading, setClassDiagramsContent);

  // Zoom and pan handlers (similar to Storyboard)
  useEffect(() => {
    if (!wrapperElement) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const isZoomGesture = e.ctrlKey || e.metaKey;

      if (isZoomGesture) {
        e.preventDefault();
        e.stopPropagation();

        const delta = e.deltaY * -0.00125;
        setZoom(prevZoom => Math.min(Math.max(0.1, prevZoom + delta), 3));
      }
    };

    wrapperElement.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => wrapperElement.removeEventListener('wheel', handleNativeWheel);
  }, [wrapperElement, zoom]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const wrapper = canvasRef.current?.parentElement;

    if (isPanning && wrapper) {
      wrapper.scrollLeft = panStart.x - e.clientX;
      wrapper.scrollTop = panStart.y - e.clientY;
    }

    // Handle card dragging
    if (draggingCard) {
      const newX = (e.clientX - draggingCard.offsetX) / zoom;
      const newY = (e.clientY - draggingCard.offsetY) / zoom;

      if (draggingCard.type === 'capability') {
        setCapabilities(capabilities.map(cap =>
          cap.id === draggingCard.id
            ? { ...cap, x: newX, y: newY }
            : cap
        ));
      } else if (draggingCard.type === 'enabler') {
        setEnablers(enablers.map(enb =>
          enb.id === draggingCard.id
            ? { ...enb, x: newX, y: newY }
            : enb
        ));
      } else if (draggingCard.type === 'testScenario') {
        setTestScenarios(testScenarios.map(ts =>
          ts.id === draggingCard.id
            ? { ...ts, x: newX, y: newY }
            : ts
        ));
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingCard(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseDownOnCard = (e: React.MouseEvent, type: 'capability' | 'enabler', id: string, x: number, y: number) => {
    if (e.button === 0) {
      e.stopPropagation();
      setSelectedCard({ type, id });
      setDraggingCard({
        type,
        id,
        offsetX: e.clientX - x * zoom,
        offsetY: e.clientY - y * zoom,
      });
    }
  };

  const handleCardDoubleClick = (e: React.MouseEvent, type: 'capability' | 'enabler', id: string) => {
    e.stopPropagation();
    setEditingCard({ type, id });
  };

  const handleUpdateCapability = (id: string, updates: Partial<Capability>) => {
    setCapabilities(capabilities.map(cap =>
      cap.id === id ? { ...cap, ...updates } : cap
    ));
  };

  const handleUpdateEnabler = (id: string, updates: Partial<Enabler>) => {
    setEnablers(enablers.map(enb =>
      enb.id === id ? { ...enb, ...updates } : enb
    ));
  };

  const handleDeleteCapability = async (id: string) => {
    if (!currentWorkspace) {
      alert('No workspace selected');
      return;
    }

    // Find the capability to get its filename
    const capability = capabilities.find(cap => cap.id === id);
    if (!capability) {
      alert('Capability not found');
      return;
    }

    // Delete the file from the filesystem
    if (capability.filename) {
      try {
        const response = await fetch(`${INTEGRATION_URL}/delete-specification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            fileName: capability.filename,
            subfolder: 'definition',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[System] Failed to delete capability file:', errorText);
          alert(`Failed to delete file: ${errorText}`);
          return;
        }

        console.log(`[System] Deleted capability file: ${capability.filename}`);
      } catch (error) {
        console.error('[System] Error deleting capability file:', error);
        alert(`Error deleting file: ${error}`);
        return;
      }
    }

    // Update in-memory state
    setCapabilities(capabilities.filter(cap => cap.id !== id));
    // Also remove related dependencies
    setCapabilityDependencies(capabilityDependencies.filter(dep => dep.from !== id && dep.to !== id));
    // Remove related enabler connections (enablers become orphaned)
    setEnablerConnections(enablerConnections.filter(conn => conn.capabilityId !== id));
    setSelectedCard(null);

    // Note: Associated enablers will now appear in the "Orphaned Enablers" section
    // since their capabilityId no longer matches any capability
  };

  const handleDeleteEnabler = async (id: string) => {
    if (!currentWorkspace) {
      alert('No workspace selected');
      return;
    }

    // Find the enabler to get its filename
    const enabler = enablers.find(enb => enb.id === id);
    if (!enabler) {
      alert('Enabler not found');
      return;
    }

    // Delete the file from the filesystem
    if (enabler.filename) {
      try {
        const response = await fetch(`${INTEGRATION_URL}/delete-specification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            fileName: enabler.filename,
            subfolder: 'definition',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[System] Failed to delete enabler file:', errorText);
          alert(`Failed to delete file: ${errorText}`);
          return;
        }

        console.log(`[System] Deleted enabler file: ${enabler.filename}`);
      } catch (error) {
        console.error('[System] Error deleting enabler file:', error);
        alert(`Error deleting file: ${error}`);
        return;
      }
    }

    // Update in-memory state
    setEnablers(enablers.filter(enb => enb.id !== id));
    // Remove related connections
    setEnablerConnections(enablerConnections.filter(conn => conn.enablerId !== id));
    setSelectedCard(null);
  };

  const handleAddDependency = (from: string, to: string) => {
    // Check if dependency already exists
    const exists = capabilityDependencies.some(dep => dep.from === from && dep.to === to);
    if (!exists) {
      setCapabilityDependencies([...capabilityDependencies, { from, to }]);
    }
  };

  const handleRemoveDependency = (from: string, to: string) => {
    setCapabilityDependencies(capabilityDependencies.filter(dep => !(dep.from === from && dep.to === to)));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const isBackground = e.target === e.currentTarget ||
      (e.target as HTMLElement).classList.contains('system-canvas-inner');

    if (isBackground) {
      if (e.button === 0 || e.button === 1) {
        e.preventDefault();
        const wrapper = canvasRef.current?.parentElement;
        if (wrapper) {
          setIsPanning(true);
          setPanStart({
            x: e.clientX + wrapper.scrollLeft,
            y: e.clientY + wrapper.scrollTop
          });
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grabbing';
          }
        }
      }
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.1));
  const handleResetView = () => setZoom(1);
  const handleToggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Get connection points for capability dependencies
  const getCapabilityConnectionPoints = (fromId: string, toId: string) => {
    const fromCap = capabilities.find(c => c.id === fromId);
    const toCap = capabilities.find(c => c.id === toId);

    if (!fromCap || !toCap) return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

    const capWidth = 250;
    const capHeight = 150;

    return {
      from: {
        x: (fromCap.x + capWidth / 2) * zoom,
        y: (fromCap.y + capHeight / 2) * zoom
      },
      to: {
        x: (toCap.x + capWidth / 2) * zoom,
        y: (toCap.y + capHeight / 2) * zoom
      }
    };
  };

  // Get connection points for enabler connections (capability to enabler)
  const getEnablerConnectionPoints = (capId: string, enbId: string) => {
    const cap = capabilities.find(c => c.id === capId);
    const enb = enablers.find(e => e.id === enbId);

    if (!cap || !enb) {
      return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };
    }

    // Smaller card sizes
    const capWidth = 140;
    const capHeight = 60;
    const enbWidth = 120;

    return {
      from: {
        x: (cap.x + capWidth / 2) * zoom,
        y: (cap.y + capHeight) * zoom
      },
      to: {
        x: (enb.x + enbWidth / 2) * zoom,
        y: (enb.y) * zoom
      }
    };
  };

  // Get connection points for test scenario connections (enabler to test scenario)
  const getTestScenarioConnectionPoints = (enbId: string, tsId: string) => {
    const enb = enablers.find(e => e.id === enbId);
    const ts = testScenarios.find(t => t.id === tsId);

    if (!enb || !ts) {
      return { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };
    }

    // Smaller card sizes
    const enbWidth = 120;
    const enbHeight = 50;
    const tsWidth = 100;

    return {
      from: {
        x: (enb.x + enbWidth / 2) * zoom,
        y: (enb.y + enbHeight) * zoom
      },
      to: {
        x: (ts.x + tsWidth / 2) * zoom,
        y: (ts.y) * zoom
      }
    };
  };

  return (
    <PageLayout
      title="System Architecture"
      quickDescription="Visualize and manage your system's capabilities, enablers, and relationships."
      detailedDescription="The System Architecture page provides a visual map of your application's capabilities and their enabling components.
Import specifications from your definition folder, use AI analysis to discover capabilities, and export diagrams for documentation.
Navigate between different views: Capability Map, State Diagrams, Sequence Diagrams, Data Models, and Class Diagrams."
      actions={
        activeTab === 'capability-map' ? (
          <div className="header-actions">
            <Button
              variant="outline"
              onClick={loadSpecifications}
              disabled={isLoading}
            >
              {isLoading ? '📥 Importing...' : '📥 Import'}
            </Button>
            <Button
              variant="outline"
              onClick={runAIAnalysis}
              disabled={isLoading || !currentWorkspace?.projectFolder}
              title="Use Claude AI to analyze and generate capabilities/enablers"
            >
              {isLoading ? '🤖 Analyzing...' : '🤖 AI Analysis'}
            </Button>
            <Button
              variant="primary"
              onClick={exportSystemDiagram}
              disabled={!currentWorkspace || capabilities.length === 0}
            >
              📄 Export System
            </Button>
            <Button
              variant="secondary"
              onClick={exportAllDiagrams}
              disabled={!currentWorkspace || (capabilities.length === 0 && !stateDiagramContent && !sequenceDiagramContent && !dataModelsContent && !classDiagramsContent)}
            >
              📦 Export All
            </Button>
            <Button variant="outline" onClick={handleZoomOut}>-</Button>
            <span className="text-body">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" onClick={handleZoomIn}>+</Button>
            <Button variant="outline" onClick={handleResetView}>Reset View</Button>
          </div>
        ) : undefined
      }
      className={`system-page ${isFullscreen ? 'fullscreen' : ''}`}
    >

      {/* Tab Navigation */}
      <div className="system-tabs">
        <button
          className={`system-tab ${activeTab === 'capability-map' ? 'active' : ''}`}
          onClick={() => setActiveTab('capability-map')}
        >
          Capability Map
        </button>
        <button
          className={`system-tab ${activeTab === 'state-diagram' ? 'active' : ''}`}
          onClick={() => setActiveTab('state-diagram')}
        >
          State Diagram
        </button>
        <button
          className={`system-tab ${activeTab === 'sequence-diagram' ? 'active' : ''}`}
          onClick={() => setActiveTab('sequence-diagram')}
        >
          Sequence Diagram
        </button>
        <button
          className={`system-tab ${activeTab === 'data-models' ? 'active' : ''}`}
          onClick={() => setActiveTab('data-models')}
        >
          Data Models
        </button>
        <button
          className={`system-tab ${activeTab === 'class-diagrams' ? 'active' : ''}`}
          onClick={() => setActiveTab('class-diagrams')}
        >
          Class Diagrams
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'capability-map' && (
      <div
        ref={setWrapperRef}
        className="system-cards-wrapper"
      >
        {/* Storyboard-style cards grid */}
        <div className="system-cards-grid">
          {capabilities.length === 0 ? (
            <div className="empty-state">
              <h3>No Capabilities Found</h3>
              <p>Click "Import" or "AI Analysis" to load capabilities from your workspace.</p>
            </div>
          ) : (
            // Use sortedCapabilities which are sorted by storyboard flow order (same as Capabilities page)
            sortedCapabilities.map((cap, index) => {
              const capEnablers = enablers.filter(e => e.capabilityId === cap.id).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
              const capTestScenarios = capEnablers.flatMap(e => testScenarios.filter(ts => ts.enablerId === e.id)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
              const isCapSelected = selectedCard?.type === 'capability' && selectedCard?.id === cap.id;

              return (
                <div
                  key={cap.id}
                  className={`system-story-card ${isCapSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedCard({ type: 'capability', id: cap.id })}
                  onDoubleClick={(e) => handleCardDoubleClick(e, 'capability', cap.id)}
                >
                  {/* Card Header */}
                  <div className="story-card-header">
                    <span className="story-card-id">{cap.id}</span>
                    <span className={`story-card-status status-${cap.status?.toLowerCase().replace(' ', '-') || 'planned'}`}>
                      {cap.status || 'Planned'}
                    </span>
                  </div>
                  <div className="story-card-divider"></div>

                  {/* Capability Name */}
                  <div className="story-card-section">
                    <span className="story-card-label">Capability:</span>
                    <span className="story-card-value">{cap.name}</span>
                  </div>

                  {/* Enablers List */}
                  {capEnablers.length > 0 && (
                    <div className="story-card-section">
                      <span className="story-card-label">Enablers:</span>
                      <ul className="story-card-list">
                        {capEnablers.map(enb => (
                          <li
                            key={enb.id}
                            className={`story-card-list-item ${selectedCard?.type === 'enabler' && selectedCard?.id === enb.id ? 'selected' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedCard({ type: 'enabler', id: enb.id }); }}
                          >
                            {enb.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Test Scenarios List */}
                  {capTestScenarios.length > 0 && (
                    <div className="story-card-section">
                      <span className="story-card-label">Test Scenarios:</span>
                      <ul className="story-card-list test-scenarios">
                        {capTestScenarios.map(ts => (
                          <li
                            key={ts.id}
                            className={`story-card-list-item ${selectedCard?.type === 'testScenario' && selectedCard?.id === ts.id ? 'selected' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedCard({ type: 'testScenario', id: ts.id }); }}
                          >
                            {ts.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Card Actions (shown when selected) */}
                  {isCapSelected && (
                    <div className="story-card-actions">
                      <button onClick={(e) => { e.stopPropagation(); setEditingCard({ type: 'capability', id: cap.id }); }}>Edit</button>
                      <button className="delete" onClick={(e) => { e.stopPropagation(); if(confirm('Delete this capability?')) handleDeleteCapability(cap.id); }}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Orphaned Enablers Card */}
          {enablers.filter(e => !capabilities.find(c => c.id === e.capabilityId)).length > 0 && (
            <div className="system-story-card orphaned">
              <div className="story-card-header">
                <span className="story-card-id">Unassigned</span>
              </div>
              <div className="story-card-divider"></div>
              <div className="story-card-section">
                <span className="story-card-label">Orphaned Enablers:</span>
                <ul className="story-card-list">
                  {enablers.filter(e => !capabilities.find(c => c.id === e.capabilityId)).map(enb => (
                    <li
                      key={enb.id}
                      className={`story-card-list-item ${selectedCard?.type === 'enabler' && selectedCard?.id === enb.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCard({ type: 'enabler', id: enb.id })}
                    >
                      {enb.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'state-diagram' && (
        <div className="diagram-tab-content">
          <div className="diagram-generate-bar">
            <Button
              variant="primary"
              onClick={generateStateDiagram}
              disabled={stateDiagramLoading || !currentWorkspace}
            >
              {stateDiagramLoading ? 'Generating...' : 'Generate'}
            </Button>
            <Button
              variant="secondary"
              onClick={exportStateDiagram}
              disabled={!stateDiagramContent}
            >
              📄 Export
            </Button>
            <Button
              variant="secondary"
              onClick={importStateDiagram}
              disabled={!currentWorkspace}
            >
              📥 Import
            </Button>
            <span className="generate-description">Reads capabilities & enablers from definition folder</span>
          </div>
          <div className="diagram-content-area">
            {stateDiagramContent ? (
              <div className="diagram-output">
                <MermaidDiagram content={stateDiagramContent} id="state" />
              </div>
            ) : (
              <div className="placeholder-content">
                <h2>State Diagram</h2>
                <p>Creates a state diagram based on the logic understood from the capabilities and enablers.</p>
                <p className="placeholder-note">Click "Generate" to analyze capabilities & enablers from the definition folder</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sequence-diagram' && (
        <div className="diagram-tab-content">
          <div className="diagram-generate-bar">
            <Button
              variant="primary"
              onClick={generateSequenceDiagram}
              disabled={sequenceDiagramLoading || !currentWorkspace}
            >
              {sequenceDiagramLoading ? 'Generating...' : 'Generate'}
            </Button>
            <Button
              variant="secondary"
              onClick={exportSequenceDiagram}
              disabled={!sequenceDiagramContent}
            >
              📄 Export
            </Button>
            <Button
              variant="secondary"
              onClick={importSequenceDiagram}
              disabled={!currentWorkspace}
            >
              📥 Import
            </Button>
            <span className="generate-description">Reads capabilities & enablers from definition folder</span>
          </div>
          <div className="diagram-content-area">
            {sequenceDiagramContent ? (
              <div className="diagram-output">
                <MermaidDiagram content={sequenceDiagramContent} id="sequence" />
              </div>
            ) : (
              <div className="placeholder-content">
                <h2>Sequence Diagram</h2>
                <p>Creates a sequence diagram from the capabilities and enabler details.</p>
                <p className="placeholder-note">Click "Generate" to analyze capabilities & enablers from the definition folder</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'data-models' && (
        <div className="diagram-tab-content">
          <div className="diagram-generate-bar">
            <Button
              variant="primary"
              onClick={generateDataModels}
              disabled={dataModelsLoading || !currentWorkspace}
            >
              {dataModelsLoading ? 'Generating...' : 'Generate'}
            </Button>
            <Button
              variant="secondary"
              onClick={exportDataModelDiagram}
              disabled={!dataModelsContent}
            >
              📄 Export
            </Button>
            <Button
              variant="secondary"
              onClick={importDataModelDiagram}
              disabled={!currentWorkspace}
            >
              📥 Import
            </Button>
            <span className="generate-description">Reads capabilities & enablers from definition folder</span>
          </div>
          <div className="diagram-content-area">
            {dataModelsContent ? (
              <div className="diagram-output">
                <MermaidDiagram content={dataModelsContent} id="data-models" />
              </div>
            ) : (
              <div className="placeholder-content">
                <h2>Data Models</h2>
                <p>Creates a data model based on the database schema or XML/JSON data.</p>
                <p className="placeholder-note">Click "Generate" to analyze capabilities & enablers from the definition folder</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'class-diagrams' && (
        <div className="diagram-tab-content">
          <div className="diagram-generate-bar">
            <Button
              variant="primary"
              onClick={generateClassDiagrams}
              disabled={classDiagramsLoading || !currentWorkspace}
            >
              {classDiagramsLoading ? 'Generating...' : 'Generate'}
            </Button>
            <Button
              variant="secondary"
              onClick={exportClassDiagram}
              disabled={!classDiagramsContent}
            >
              📄 Export
            </Button>
            <Button
              variant="secondary"
              onClick={importClassDiagram}
              disabled={!currentWorkspace}
            >
              📥 Import
            </Button>
            <span className="generate-description">Reads capabilities & enablers from definition folder</span>
          </div>
          <div className="diagram-content-area">
            {classDiagramsContent ? (
              <div className="diagram-output">
                <MermaidDiagram content={classDiagramsContent} id="class" />
              </div>
            ) : (
              <div className="placeholder-content">
                <h2>Class Diagrams</h2>
                <p>Creates class diagrams based on information from capabilities, enablers, and code.</p>
                <p className="placeholder-note">Click "Generate" to analyze capabilities & enablers from the definition folder</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .system-page {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--color-systemBackground);
        }

        .system-page.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
        }

        .system-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-6, 24px);
          background: var(--color-systemBackground);
          border-bottom: 1px solid var(--color-systemGray5);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .workspace-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-systemBlue);
          padding: 6px 12px;
          background: var(--color-systemGray6);
          border-radius: 6px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .system-tabs {
          display: flex;
          gap: 4px;
          padding: 0 24px 16px;
          border-bottom: 1px solid var(--color-systemGray5);
          background: var(--color-systemBackground);
          width: 100%;
        }

        .system-tab {
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          background: transparent;
          color: var(--color-secondaryLabel);
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          transition: all 0.15s ease;
          border-bottom: 2px solid transparent;
        }

        .system-tab:hover {
          background: var(--color-systemGray6);
          color: var(--color-label);
        }

        .system-tab.active {
          background: var(--color-systemGray6);
          color: var(--color-systemBlue);
          border-bottom: 2px solid var(--color-systemBlue);
          font-weight: 600;
        }

        .diagram-placeholder {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          background: var(--color-systemBackground);
        }

        .placeholder-content {
          text-align: center;
          max-width: 800px;
          width: 100%;
          padding: 0 24px;
        }

        .placeholder-content h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--color-label);
        }

        .placeholder-content p {
          font-size: 14px;
          color: var(--color-secondaryLabel);
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .placeholder-note {
          font-size: 12px;
          font-style: italic;
          color: var(--color-tertiaryLabel);
          margin-top: 16px;
        }

        .diagram-tab-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--color-systemBackground);
          width: 100%;
          min-width: 0;
        }

        .diagram-generate-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: var(--color-systemGray6);
          border-bottom: 1px solid var(--color-systemGray5);
        }

        .generate-description {
          font-size: 13px;
          color: var(--color-secondaryLabel);
        }

        .diagram-content-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          overflow: auto;
        }

        .diagram-output {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .mermaid-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          padding: 20px;
        }

        .mermaid-container svg {
          max-width: 100%;
          height: auto;
        }

        .mermaid-error {
          background: var(--color-systemRed);
          color: white;
          padding: 16px;
          border-radius: 8px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          font-size: 12px;
          white-space: pre-wrap;
          overflow: auto;
        }

        /* Storyboard-style cards wrapper */
        .system-cards-wrapper {
          flex: 1;
          overflow: auto;
          padding: 24px;
          background: var(--color-systemGray6);
        }

        .system-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 24px;
          background: var(--color-systemBackground);
          border-radius: 12px;
          border: 2px dashed var(--color-systemGray4);
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-label);
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 14px;
          color: var(--color-secondaryLabel);
        }

        /* Storyboard-style card */
        .system-story-card {
          background: var(--color-systemBackground);
          border: 2px solid var(--color-systemGray4);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .system-story-card:hover {
          border-color: var(--color-systemBlue);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .system-story-card.selected {
          border-color: var(--color-systemBlue);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
        }

        .system-story-card.orphaned {
          border-color: var(--color-systemOrange);
          background: rgba(255, 149, 0, 0.05);
        }

        .story-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .story-card-id {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-secondaryLabel);
          font-family: 'SF Mono', Monaco, monospace;
        }

        .story-card-status {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .story-card-status.status-implemented {
          background: var(--color-systemGreen);
          color: white;
        }

        .story-card-status.status-in-progress {
          background: var(--color-systemBlue);
          color: white;
        }

        .story-card-status.status-planned {
          background: var(--color-systemGray);
          color: white;
        }

        .story-card-status.status-deferred {
          background: var(--color-systemOrange);
          color: white;
        }

        .story-card-divider {
          height: 1px;
          background: var(--color-systemGray4);
          margin: 12px 0;
        }

        .story-card-section {
          margin-bottom: 12px;
        }

        .story-card-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-secondaryLabel);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .story-card-value {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-label);
          line-height: 1.3;
        }

        .story-card-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .story-card-list-item {
          display: flex;
          align-items: center;
          padding: 6px 10px;
          margin: 4px 0;
          font-size: 13px;
          color: var(--color-label);
          background: var(--color-systemGray6);
          border-radius: 6px;
          border-left: 3px solid var(--color-systemBlue);
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .story-card-list-item:hover {
          background: var(--color-systemGray5);
        }

        .story-card-list-item.selected {
          background: rgba(0, 122, 255, 0.15);
          border-left-color: var(--color-systemBlue);
        }

        .story-card-list-item::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          background: var(--color-systemBlue);
          border-radius: 50%;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .story-card-list.test-scenarios .story-card-list-item {
          border-left-color: var(--color-systemPurple);
        }

        .story-card-list.test-scenarios .story-card-list-item::before {
          background: var(--color-systemPurple);
        }

        .story-card-list.test-scenarios .story-card-list-item.selected {
          background: rgba(175, 82, 222, 0.15);
        }

        .story-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--color-systemGray5);
        }

        .story-card-actions button {
          flex: 1;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--color-systemGray4);
          border-radius: 6px;
          background: var(--color-systemBackground);
          color: var(--color-systemBlue);
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .story-card-actions button:hover {
          background: var(--color-systemGray6);
        }

        .story-card-actions button.delete {
          color: var(--color-systemRed);
          border-color: var(--color-systemRed);
        }

        .story-card-actions button.delete:hover {
          background: rgba(255, 59, 48, 0.1);
        }

        /* Keep old canvas styles for compatibility */
        .system-canvas-wrapper {
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

        .system-canvas-wrapper.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          z-index: 9999;
          background: var(--color-systemBackground);
        }

        .system-canvas {
          display: block;
          cursor: grab;
          position: relative;
          touch-action: none;
          background: var(--color-systemBackground);
        }

        .system-canvas:active {
          cursor: grabbing;
        }

        .system-canvas-inner {
          width: 100%;
          height: 100%;
          position: relative;
          min-width: 2000px;
          min-height: 1500px;
        }

        .draw-controls-toolbar {
          position: sticky;
          top: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-systemBackground);
          border: 1px solid var(--color-systemGray4);
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 100;
          width: fit-content;
        }

        .draw-controls-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-secondaryLabel);
          margin-right: 4px;
        }

        .draw-control-btn {
          width: 32px;
          height: 32px;
          border: 1px solid var(--color-systemGray4);
          background: var(--color-systemBackground);
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.15s ease;
        }

        .draw-control-btn:hover {
          background: var(--color-systemGray6);
          border-color: var(--color-systemGray3);
        }

        .draw-control-btn:active {
          background: var(--color-systemGray5);
        }

        .capability-card {
          position: absolute;
          width: 250px;
          min-height: 150px;
          background: white;
          border: 3px solid black;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: box-shadow 0.2s ease;
        }

        .capability-card:hover {
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
        }

        .capability-card.selected {
          box-shadow: 0 0 0 3px var(--color-systemBlue);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .card-id {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-systemGray);
          font-family: monospace;
        }

        .card-status {
          font-size: 10px;
          font-weight: 600;
          padding: 4px 8px;
          background: var(--color-systemGreen);
          color: white;
          border-radius: 4px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-label);
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .card-stats {
          font-size: 12px;
          color: var(--color-secondaryLabel);
          margin-top: 8px;
        }

        .enabler-card {
          position: absolute;
          width: 200px;
          min-height: 100px;
          background: white;
          border: 2px solid var(--color-systemBlue);
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: box-shadow 0.2s ease;
        }

        .enabler-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .enabler-card.selected {
          box-shadow: 0 0 0 2px var(--color-systemBlue);
        }

        .enabler-id {
          font-size: 10px;
          font-weight: 600;
          color: var(--color-systemBlue);
          font-family: monospace;
          margin-bottom: 8px;
        }

        .enabler-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-label);
          line-height: 1.3;
        }

        .card-edit-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }

        .card-title-input,
        .enabler-name-input {
          width: 100%;
          padding: 8px;
          font-size: 14px;
          border: 1px solid var(--color-systemGray4);
          border-radius: 4px;
          font-family: inherit;
        }

        .card-status-select {
          width: 100%;
          padding: 8px;
          font-size: 13px;
          border: 1px solid var(--color-systemGray4);
          border-radius: 4px;
          font-family: inherit;
        }

        .card-edit-done {
          padding: 8px 16px;
          background: var(--color-systemBlue);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .card-edit-done:hover {
          background: var(--color-systemBlue);
          opacity: 0.9;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--color-systemGray5);
        }

        .card-action-btn {
          flex: 1;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--color-systemGray4);
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .card-action-btn:hover {
          background: var(--color-systemGray6);
        }

        .card-action-btn.delete {
          color: var(--color-systemRed);
          border-color: var(--color-systemRed);
        }

        .card-action-btn.delete:hover {
          background: var(--color-systemRed);
          color: white;
        }

        /* Small card styles for compact view */
        .capability-card-small {
          width: 140px !important;
          min-height: 60px !important;
          padding: 8px !important;
        }

        .card-header-compact {
          margin-bottom: 4px;
        }

        .card-id-small {
          font-size: 9px;
          font-weight: 600;
          color: var(--color-systemGray);
          font-family: monospace;
        }

        .card-title-small {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-label);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .enabler-card-small {
          width: 120px !important;
          min-height: 50px !important;
          padding: 6px !important;
        }

        .enabler-id-small {
          font-size: 8px;
          font-weight: 600;
          color: var(--color-systemBlue);
          font-family: monospace;
          margin-bottom: 4px;
        }

        .enabler-name-small {
          font-size: 10px;
          font-weight: 600;
          color: var(--color-label);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Test Scenario Card Styles */
        .test-scenario-card {
          position: absolute;
          width: 100px;
          min-height: 40px;
          background: white;
          border: 2px solid var(--color-systemPurple, #AF52DE);
          border-radius: 6px;
          padding: 4px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: box-shadow 0.2s ease;
        }

        .test-scenario-card:hover {
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        .test-scenario-card.selected {
          box-shadow: 0 0 0 2px var(--color-systemPurple, #AF52DE);
        }

        .ts-id-small {
          font-size: 7px;
          font-weight: 600;
          color: var(--color-systemPurple, #AF52DE);
          font-family: monospace;
          margin-bottom: 2px;
        }

        .ts-name-small {
          font-size: 9px;
          font-weight: 600;
          color: var(--color-label);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </PageLayout>
  );
};
