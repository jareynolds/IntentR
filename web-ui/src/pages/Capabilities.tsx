import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Alert, Button, CapabilityForm, AcceptanceCriteriaSection, ConfirmDialog, PageLayout } from '../components';
import { ApprovalSection } from '../components/ApprovalSection';
import { StageBadge, ApprovalStatusBadge } from '../components/ApprovalStatusBadge';
import { useWorkspace } from '../context/WorkspaceContext';
import { useApproval } from '../context/ApprovalContext';
import { useEntityState } from '../context/EntityStateContext';
import { INTEGRATION_URL } from '../api/client';
import type {
  Capability,
  CapabilityWithDetails,
} from '../api/services';
import { capabilityService } from '../api/services';
import type { WorkflowStage as ApprovalWorkflowStage } from '../api/approvalService';
import type { LifecycleState, WorkflowStage, StageStatus, ApprovalStatus } from '../api/enablerService';

interface FileCapability {
  filename: string;
  path: string;
  name: string;
  description: string;
  status: string;
  content: string;
  fields: Record<string, string>;
}

interface FileEnabler {
  filename: string;
  path: string;
  name: string;
  purpose: string;
  status: string;
  owner: string;
  priority: string;
  capabilityId: string;
  enablerId: string;
  fields: Record<string, string>;
}

// Interface for storyboard cards from conception folder
interface StoryboardCard {
  id: string;
  filename: string;
  title: string;
  description: string;
  positionX: number;
  positionY: number;
  flowOrder: number; // Computed order based on position
}

export const Capabilities: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { pendingCount } = useApproval();
  const { capabilities: dbCapabilities, syncCapability, updateCapability, fetchCapabilityState } = useEntityState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<CapabilityWithDetails | undefined>();
  const [detailsView, setDetailsView] = useState<CapabilityWithDetails | null>(null);
  const [fileCapabilities, setFileCapabilities] = useState<FileCapability[]>([]);
  const [fileEnablers, setFileEnablers] = useState<FileEnabler[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFileCapability, setSelectedFileCapability] = useState<FileCapability | null>(null);
  const [expandedCapabilities, setExpandedCapabilities] = useState<Set<string>>(new Set());
  const [isEditingFileCapability, setIsEditingFileCapability] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    content: '',
    storyboardReference: '',
    // INTENT State Model - 4 dimensions
    // New capabilities: active lifecycle, specification stage, in_progress status
    lifecycle_state: 'active',
    workflow_stage: 'specification',
    stage_status: 'in_progress',
    approval_status: 'pending',
  });
  const [savingCapability, setSavingCapability] = useState(false);
  const [deletingCapability, setDeletingCapability] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    name: string;
    description: string;
    type: 'capability' | 'feature' | 'enabler';
    rationale: string;
    successMetrics?: string[];
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [analysisInfo, setAnalysisInfo] = useState<{
    totalConceptionDocuments?: number;
    keyThemes?: string[];
    coverageNotes?: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [storyboardCards, setStoryboardCards] = useState<StoryboardCard[]>([]);

  // AI-suggested storyboard state
  const [suggestedStoryboard, setSuggestedStoryboard] = useState<string | null>(null);
  const [isStoryboardSuggesting, setIsStoryboardSuggesting] = useState(false);
  const [storyboardNeedsConfirmation, setStoryboardNeedsConfirmation] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // Start blank for new workspaces - capabilities will be created by the user
  useEffect(() => {
    // Reset to blank when workspace changes
    setCapabilities([]);
    setFileCapabilities([]);
    setFileEnablers([]);
    setStoryboardCards([]);
    setExpandedCapabilities(new Set());
    setError(null);
    setLoading(false);
    // Load file-based capabilities, enablers, and storyboard cards when workspace changes
    if (currentWorkspace?.projectFolder) {
      fetchFileCapabilities();
      fetchFileEnablers();
      fetchStoryboardCards();
    }
  }, [currentWorkspace?.id, currentWorkspace?.projectFolder]);

  // Handle opening a specific item from URL parameter
  useEffect(() => {
    const openItem = searchParams.get('open');
    if (openItem && fileCapabilities.length > 0 && !selectedFileCapability) {
      // Find a capability with matching filename
      const matchingCapability = fileCapabilities.find(cap => cap.filename === openItem);
      if (matchingCapability) {
        setSelectedFileCapability(matchingCapability);
        // Scroll to the capability section
        setTimeout(() => {
          const element = document.getElementById(`capability-${matchingCapability.filename}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      // Clear the search param after attempting to open
      setSearchParams({}, { replace: true });
    }
  }, [fileCapabilities, searchParams, selectedFileCapability, setSearchParams]);

  const fetchFileCapabilities = async (): Promise<FileCapability[]> => {
    if (!currentWorkspace?.projectFolder) return [];

    setLoadingFiles(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/capability-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      const data = await response.json();
      if (data.capabilities) {
        setFileCapabilities(data.capabilities);
        return data.capabilities;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch capability files:', err);
      return [];
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchFileEnablers = async () => {
    if (!currentWorkspace?.projectFolder) return;

    try {
      const response = await fetch(`${INTEGRATION_URL}/enabler-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      const data = await response.json();
      if (data.enablers) {
        setFileEnablers(data.enablers);
      }
    } catch (err) {
      console.error('Failed to fetch enabler files:', err);
    }
  };

  // Fetch storyboard cards from the conception folder
  // Uses the same logic as the Narrative/StoryMap page for sorting
  const fetchStoryboardCards = async () => {
    if (!currentWorkspace?.projectFolder) return;

    try {
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
      if (data.stories) {
        // Get storyboard canvas data for positioning (same approach as Narrative/StoryMap page)
        const storyboardData = currentWorkspace?.storyboard;

        // Create a position map from the storyboard canvas cards (matching StoryMap logic)
        const positionMap = new Map<string, number>();
        if (storyboardData?.cards && storyboardData.cards.length > 0) {
          storyboardData.cards.forEach((card: { id: string; title: string; y?: number }) => {
            // Match by ID or title (lowercase for case-insensitive matching)
            positionMap.set(card.id, card.y || 0);
            positionMap.set(card.title.toLowerCase(), card.y || 0);
          });
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
          // This matches the Narrative/StoryMap page approach
          const posY = positionMap.get(story.id) ??
                       positionMap.get(story.title?.toLowerCase()) ??
                       positionMap.get((story.title || story.filename).toLowerCase()) ??
                       Infinity;

          return {
            id: story.id || story.filename,
            filename: story.filename,
            title: story.title || story.filename,
            description: story.description || '',
            positionX: 0, // Not used for sorting
            positionY: posY,
            flowOrder: 0, // Will be computed after sorting
          };
        });

        // Sort by Y position from storyboard canvas (top to bottom)
        // This matches the Narrative/StoryMap page logic exactly
        cardsWithPosition.sort((a, b) => {
          return (a.positionY || 0) - (b.positionY || 0);
        });

        // Assign flow order after sorting
        cardsWithPosition.forEach((card, index) => {
          card.flowOrder = index;
        });

        setStoryboardCards(cardsWithPosition);
      }
    } catch (err) {
      console.error('Failed to fetch storyboard cards:', err);
    }
  };

  // AI-powered storyboard matching
  const suggestBestStoryboard = async (capabilityName: string, capabilityDescription: string) => {
    if (storyboardCards.length === 0 || !currentWorkspace?.projectFolder) return;

    setIsStoryboardSuggesting(true);
    setStoryboardNeedsConfirmation(false);

    try {
      // Build a prompt for Claude to match the capability to the best storyboard card
      const storyboardList = storyboardCards.map(card =>
        `- "${card.title}"${card.description ? `: ${card.description}` : ''}`
      ).join('\n');

      const prompt = `Given a capability with the following details:
Name: ${capabilityName}
Description: ${capabilityDescription || 'Not specified'}

And the following available storyboard cards:
${storyboardList}

Which storyboard card title is the BEST match for this capability?
Respond with ONLY the exact storyboard card title (e.g., "User Login Flow") and nothing else. If no good match exists, respond with "NONE".`;

      const response = await fetch(`${INTEGRATION_URL}/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          workspacePath: currentWorkspace.projectFolder,
          apiKey: localStorage.getItem('anthropic_api_key') || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Check for error in response
        if (data.error) {
          console.error('AI chat error:', data.error);
          return;
        }

        const suggestedTitle = data.response?.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present

        // Validate the suggested title exists in our storyboard cards
        if (suggestedTitle && suggestedTitle !== 'NONE') {
          const matchingCard = storyboardCards.find(c =>
            c.title.toLowerCase() === suggestedTitle.toLowerCase()
          );

          if (matchingCard) {
            setSuggestedStoryboard(matchingCard.title);
            setEditFormData(prev => ({ ...prev, storyboardReference: matchingCard.title }));
            setStoryboardNeedsConfirmation(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to get AI storyboard suggestion:', err);
    } finally {
      setIsStoryboardSuggesting(false);
    }
  };

  // Confirm the AI-suggested storyboard and save it
  const confirmStoryboardSuggestion = async () => {
    setStoryboardNeedsConfirmation(false);

    // Save the storyboard reference to the file immediately
    if (selectedFileCapability && suggestedStoryboard) {
      try {
        await fetch(`${INTEGRATION_URL}/update-capability-storyboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: selectedFileCapability.path,
            storyboardReference: suggestedStoryboard,
          }),
        });
        // Refresh the capabilities list to get updated data
        const refreshedCapabilities = await fetchFileCapabilities();

        // Update selectedFileCapability with the refreshed data
        const refreshedCap = refreshedCapabilities.find(
          (c) => c.path === selectedFileCapability.path
        );
        if (refreshedCap) {
          setSelectedFileCapability(refreshedCap);
          // Also update the edit form data with the new storyboard reference
          setEditFormData(prev => ({
            ...prev,
            storyboardReference: refreshedCap.fields?.['Storyboard Reference'] || suggestedStoryboard,
          }));
        }
      } catch (err) {
        console.error('Failed to save storyboard reference:', err);
      }
    }
  };

  // Get enablers for a specific capability by matching capabilityId or filename patterns
  const getEnablersForCapability = (capability: FileCapability): FileEnabler[] => {
    // Extract capability ID from fields or filename (e.g., CAP-123456)
    const capId = capability.fields?.['ID'] || '';
    const capIdMatch = capId.match(/CAP-\d+/)?.[0] || '';

    // Also try to extract from filename
    const filenameMatch = capability.filename.match(/(\d+)/)?.[1] || '';

    return fileEnablers.filter(enabler => {
      // Match by capability ID field
      if (capIdMatch && enabler.capabilityId?.includes(capIdMatch)) {
        return true;
      }
      // Match by numeric ID in filename
      if (filenameMatch && enabler.capabilityId?.includes(filenameMatch)) {
        return true;
      }
      // Match by capability name reference
      if (enabler.capabilityId?.toLowerCase().includes(capability.name?.toLowerCase())) {
        return true;
      }
      return false;
    });
  };

  // Toggle capability expansion
  const toggleCapabilityExpansion = (capabilityPath: string) => {
    setExpandedCapabilities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(capabilityPath)) {
        newSet.delete(capabilityPath);
      } else {
        newSet.add(capabilityPath);
      }
      return newSet;
    });
  };

  const handleEditFileCapability = async (cap: FileCapability) => {
    // Get storyboard reference from fields
    const storyboardRef = cap.fields?.['Storyboard Reference'] || '';

    // Reset AI suggestion state
    setSuggestedStoryboard(null);
    setStoryboardNeedsConfirmation(false);
    setIsStoryboardSuggesting(false);

    // Get INTENT State Model dimensions from DATABASE (single source of truth)
    const capabilityId = cap.capabilityId || cap.fields?.['ID'] || '';
    let lifecycleState = 'draft';
    let workflowStage = 'intent';
    let stageStatus = 'in_progress';
    let approvalStatus = 'pending';

    if (capabilityId) {
      // Try to get state from cached dbCapabilities first
      let dbState = dbCapabilities.get(capabilityId);

      // If not in cache, fetch from database
      if (!dbState) {
        dbState = await fetchCapabilityState(capabilityId) || undefined;
      }

      if (dbState) {
        lifecycleState = dbState.lifecycle_state || 'draft';
        workflowStage = dbState.workflow_stage || 'intent';
        stageStatus = dbState.stage_status || 'in_progress';
        approvalStatus = dbState.approval_status || 'pending';
      }
    }

    setEditFormData({
      name: cap.name,
      description: cap.description,
      content: cap.content,
      storyboardReference: storyboardRef,
      // INTENT State Model - 4 dimensions from DATABASE
      lifecycle_state: lifecycleState,
      workflow_stage: workflowStage,
      stage_status: stageStatus,
      approval_status: approvalStatus,
    });
    setIsEditingFileCapability(true);

    // Trigger AI storyboard suggestion if no storyboard reference exists
    if (!storyboardRef && storyboardCards.length > 0) {
      suggestBestStoryboard(cap.name, cap.description || '');
    }
  };

  // Open capability directly in edit mode
  const handleOpenCapabilityInEditMode = (cap: FileCapability) => {
    setSelectedFileCapability(cap);
    handleEditFileCapability(cap);
  };

  const handleSaveFileCapability = async () => {
    if (!selectedFileCapability) return;

    setSavingCapability(true);
    try {
      // Save content to markdown file (NO state fields - state is stored in database only)
      const response = await fetch(`${INTEGRATION_URL}/save-capability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: selectedFileCapability.path,
          name: editFormData.name,
          description: editFormData.description,
          content: editFormData.content,
          storyboardReference: editFormData.storyboardReference,
          // NOTE: State fields are NOT sent to markdown - database is single source of truth
        }),
      });

      if (response.ok) {
        // Save state to DATABASE via EntityStateContext (single source of truth for state)
        const capabilityId = selectedFileCapability.capabilityId || selectedFileCapability.fields?.['ID'] || '';
        if (capabilityId && currentWorkspace?.id) {
          try {
            await syncCapability({
              capability_id: capabilityId,
              name: editFormData.name,
              description: editFormData.description,
              purpose: selectedFileCapability.fields?.['Purpose'] || '',
              storyboard_reference: editFormData.storyboardReference,
              workspace_id: currentWorkspace.id,
              file_path: selectedFileCapability.path,
              // INTENT State Model - saved to DATABASE only
              lifecycle_state: editFormData.lifecycle_state as 'draft' | 'active' | 'implemented' | 'maintained' | 'retired',
              workflow_stage: editFormData.workflow_stage as 'intent' | 'specification' | 'ui_design' | 'implementation' | 'control_loop',
              stage_status: editFormData.stage_status as 'in_progress' | 'ready_for_approval' | 'approved' | 'blocked',
              approval_status: editFormData.approval_status as 'pending' | 'approved' | 'rejected',
            });
          } catch (syncErr) {
            console.warn('Failed to sync capability state to database:', syncErr);
            setError('Failed to save state to database. Please try again.');
            return; // Don't proceed if state save fails
          }
        }

        // Refresh the list
        await fetchFileCapabilities();
        setIsEditingFileCapability(false);
        setSelectedFileCapability(null);
      } else {
        const errorData = await response.text();
        setError(`Failed to save: ${errorData}`);
      }
    } catch (err) {
      setError(`Failed to save capability: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingCapability(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingFileCapability(false);
    // Reset AI suggestion state
    setSuggestedStoryboard(null);
    setStoryboardNeedsConfirmation(false);
    setIsStoryboardSuggesting(false);

    if (selectedFileCapability) {
      const storyboardRef = selectedFileCapability.fields?.['Storyboard Reference'] || '';

      // Get INTENT State Model dimensions from DATABASE (single source of truth)
      const capabilityId = selectedFileCapability.capabilityId || selectedFileCapability.fields?.['ID'] || '';
      const dbState = capabilityId ? dbCapabilities.get(capabilityId) : undefined;

      const lifecycleState = dbState?.lifecycle_state || 'draft';
      const workflowStage = dbState?.workflow_stage || 'intent';
      const stageStatus = dbState?.stage_status || 'in_progress';
      const approvalStatus = dbState?.approval_status || 'pending';

      setEditFormData({
        name: selectedFileCapability.name,
        description: selectedFileCapability.description,
        content: selectedFileCapability.content,
        storyboardReference: storyboardRef,
        // INTENT State Model - 4 dimensions from DATABASE
        lifecycle_state: lifecycleState,
        workflow_stage: workflowStage,
        stage_status: stageStatus,
        approval_status: approvalStatus,
      });
    }
  };

  const handleDeleteFileCapability = async (cap: FileCapability) => {
    if (!confirm(`Are you sure you want to delete "${cap.name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingCapability(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/delete-capability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: cap.path,
        }),
      });

      if (response.ok) {
        // Refresh the list
        await fetchFileCapabilities();
        // Close modal if deleting the selected capability
        if (selectedFileCapability?.path === cap.path) {
          setSelectedFileCapability(null);
          setIsEditingFileCapability(false);
        }
      } else {
        const errorData = await response.text();
        setError(`Failed to delete: ${errorData}`);
      }
    } catch (err) {
      setError(`Failed to delete capability: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingCapability(false);
    }
  };

  const handleDeleteFileEnabler = async (enabler: FileEnabler) => {
    if (!confirm(`Are you sure you want to delete enabler "${enabler.name || enabler.filename}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${INTEGRATION_URL}/delete-enabler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: enabler.path,
        }),
      });

      if (response.ok) {
        // Refresh the enablers list
        await fetchFileEnablers();
      } else {
        const errorData = await response.text();
        setError(`Failed to delete enabler: ${errorData}`);
      }
    } catch (err) {
      setError(`Failed to delete enabler: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAnalyzeSpecifications = async () => {
    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    setIsAnalyzing(true);
    setSuggestions([]);
    setAnalysisInfo(null);

    try {
      // Get API key
      const anthropicKey = localStorage.getItem('anthropic_api_key') || '';
      if (!anthropicKey) {
        alert('Please add your Anthropic API key in the Settings page.');
        setIsAnalyzing(false);
        return;
      }

      // Analyze conception folder files using Capability-Driven Architecture Map
      const response = await fetch(`${INTEGRATION_URL}/analyze-conception`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          anthropic_key: anthropicKey,
          existingCapabilities: fileCapabilities.map(c => c.name),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to analyze conception files');
      }

      const result = await response.json();

      // Check for message (no files found)
      if (result.message && (!result.suggestions || result.suggestions.length === 0)) {
        alert(result.message);
        setIsAnalyzing(false);
        return;
      }

      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
        setShowSuggestions(true);

        // Store analysis info if available
        if (result.analysis) {
          setAnalysisInfo(result.analysis);
        }
      } else {
        alert('Analysis complete. No new capabilities suggested - your conception documents may already be well covered by existing capabilities.');
      }
    } catch (err) {
      console.error('Failed to analyze conception files:', err);
      alert(`Failed to analyze: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion: typeof suggestions[0]) => {
    if (!currentWorkspace?.projectFolder) return;

    // Generate filename based on type: CAP-NAME-(n).md or ENB-NAME-(n).md
    const safeName = suggestion.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Determine prefix based on type
    const prefix = suggestion.type === 'enabler' ? 'ENB' : 'CAP';
    const sequenceNum = fileCapabilities.length + suggestions.indexOf(suggestion) + 1;
    const fileName = `${prefix}-${safeName}-${sequenceNum}.md`;

    // Generate markdown content following INTENT Capability template
    let markdown = `# ${suggestion.name}\n\n`;
    markdown += `## Metadata\n`;
    markdown += `- **Name**: ${suggestion.name}\n`;
    markdown += `- **Type**: Capability\n`;
    markdown += `- **Status**: Ready for Analysis\n`;
    markdown += `- **Approval**: Pending\n`;
    markdown += `- **Priority**: Medium\n`;
    markdown += `- **Analysis Review**: Required\n`;
    markdown += `- **Generated**: ${new Date().toLocaleString()}\n`;
    markdown += `- **Source**: Capability-Driven Architecture Map Analysis\n\n`;
    markdown += `## Business Context\n\n`;
    markdown += `### Problem Statement\n`;
    markdown += `${suggestion.description}\n\n`;
    markdown += `### Value Proposition\n`;
    markdown += `${suggestion.rationale}\n\n`;
    markdown += `### Success Metrics\n`;
    if (suggestion.successMetrics && suggestion.successMetrics.length > 0) {
      suggestion.successMetrics.forEach(metric => {
        markdown += `- ${metric}\n`;
      });
    } else {
      markdown += `- TODO: Define success metrics\n`;
    }
    markdown += `\n`;
    markdown += `## User Perspective\n\n`;
    markdown += `### Primary Persona\n`;
    markdown += `_Define the primary user who benefits from this capability._\n\n`;
    markdown += `### User Scenarios\n`;
    markdown += `1. _Add user scenario 1_\n`;
    markdown += `2. _Add user scenario 2_\n\n`;
    markdown += `## Boundaries\n\n`;
    markdown += `### In Scope\n`;
    markdown += `- _Define what IS included_\n\n`;
    markdown += `### Out of Scope\n`;
    markdown += `- _Define what is NOT included_\n\n`;
    markdown += `## Enablers\n`;
    markdown += `| ID | Name | Purpose | State |\n`;
    markdown += `|----|------|---------|-------|\n`;
    markdown += `| | _To be defined_ | | |\n\n`;
    markdown += `## Acceptance Criteria\n`;
    markdown += `- [ ] TODO: Define acceptance criteria\n`;

    try {
      const response = await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          files: [{ fileName, content: markdown }],
          subfolder: 'definition'
        }),
      });

      if (response.ok) {
        // Remove from suggestions
        setSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
        // Refresh file capabilities
        await fetchFileCapabilities();
        alert(`✅ Created definition/${fileName}`);
      } else {
        throw new Error('Failed to save capability file');
      }
    } catch (err) {
      alert(`Failed to create capability: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAcceptAllSuggestions = async () => {
    for (const suggestion of suggestions) {
      await handleAcceptSuggestion(suggestion);
    }
    setShowSuggestions(false);
  };

  const loadCapabilities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await capabilityService.getCapabilities();
      setCapabilities(response.capabilities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capabilities');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCapability(undefined);
    setDetailsView(null);
    setShowForm(true);
  };

  const handleEdit = async (capability: Capability) => {
    try {
      const details = await capabilityService.getCapability(capability.id!);
      setSelectedCapability(details);
      setDetailsView(null);
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capability details');
    }
  };

  const handleViewDetails = async (capability: Capability) => {
    try {
      const details = await capabilityService.getCapability(capability.id!);
      setDetailsView(details);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capability details');
    }
  };

  const handleDelete = (id: number) => {
    const capability = capabilities.find(c => c.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Capability',
      message: `Are you sure you want to delete "${capability?.name || 'this capability'}"?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        closeConfirmDialog();
        try {
          await capabilityService.deleteCapability(id);
          await loadCapabilities();
          setDetailsView(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete capability');
        }
      },
    });
  };

  const handleFormSave = async () => {
    setShowForm(false);
    setSelectedCapability(undefined);
    // Refresh file-based capabilities from the active workspace's definition folder
    await fetchFileCapabilities();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedCapability(undefined);
  };

  // Get color based on INTENT State Model stage_status
  const getStageStatusColor = (stageStatus: string) => {
    switch (stageStatus.toLowerCase()) {
      case 'in_progress':
        return { bg: 'rgba(0, 122, 255, 0.1)', color: 'var(--color-systemBlue)', icon: '✏️' };
      case 'ready_for_approval':
        return { bg: 'rgba(255, 149, 0, 0.1)', color: 'var(--color-systemOrange)', icon: '👀' };
      case 'approved':
        return { bg: 'rgba(76, 217, 100, 0.1)', color: 'var(--color-systemGreen)', icon: '✅' };
      case 'blocked':
        return { bg: 'rgba(255, 59, 48, 0.1)', color: 'var(--color-systemRed)', icon: '🚫' };
      default:
        return { bg: 'rgba(0, 122, 255, 0.1)', color: 'var(--color-systemBlue)', icon: '✏️' };
    }
  };

  // Legacy function for backward compatibility - maps old status to new stage_status colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'implemented':
        return { bg: 'rgba(76, 217, 100, 0.1)', color: 'var(--color-systemGreen)' };
      case 'in_progress':
      case 'in progress':
        return { bg: 'rgba(0, 122, 255, 0.1)', color: 'var(--color-systemBlue)' };
      case 'planned':
        return { bg: 'rgba(0, 122, 255, 0.1)', color: 'var(--color-systemBlue)' };
      case 'deprecated':
        return { bg: 'rgba(142, 142, 147, 0.1)', color: 'var(--color-systemGray)' };
      case 'not specified':
        return { bg: 'rgba(142, 142, 147, 0.05)', color: 'var(--color-tertiaryLabel)' };
      default:
        return { bg: 'rgba(142, 142, 147, 0.1)', color: 'var(--color-systemGray)' };
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter and search logic
  // Helper to get stage_status for a capability from the database
  const getCapabilityStageStatusForFilter = (cap: FileCapability): string => {
    const capId = cap.fields?.['ID'] || cap.filename?.replace(/\.md$/, '') || '';
    const dbCap = dbCapabilities.get(capId);
    return dbCap?.stage_status || 'in_progress'; // Default to in_progress if not in DB
  };

  const filterCapabilities = (caps: FileCapability[]) => {
    return caps.filter(cap => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        cap.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cap.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cap.filename?.toLowerCase().includes(searchQuery.toLowerCase());

      // Stage status filter (from database - single source of truth)
      const capStageStatus = getCapabilityStageStatusForFilter(cap);
      const matchesStatus = statusFilter === 'all' || capStageStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  // Get the flow order for a capability based on its storyboard reference
  const getCapabilityFlowOrder = (cap: FileCapability): number => {
    const storyboardRef = cap.fields?.['Storyboard Reference'] || '';
    if (!storyboardRef) return Number.MAX_SAFE_INTEGER; // No reference = at the end

    // Find matching storyboard card (case-insensitive)
    const matchingCard = storyboardCards.find(
      card => card.title.toLowerCase() === storyboardRef.toLowerCase()
    );

    return matchingCard?.flowOrder ?? Number.MAX_SAFE_INTEGER;
  };

  // Sort capabilities by storyboard flow order
  const sortByFlowOrder = (caps: FileCapability[]): FileCapability[] => {
    return [...caps].sort((a, b) => {
      const orderA = getCapabilityFlowOrder(a);
      const orderB = getCapabilityFlowOrder(b);
      if (orderA !== orderB) return orderA - orderB;
      // Secondary sort by name for capabilities with same/no flow order
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  // Group capabilities by status, sorted by storyboard flow order within each group
  // Group capabilities by INTENT State Model stage_status (from database)
  const groupByStageStatus = (caps: FileCapability[]) => {
    const groups: Record<string, FileCapability[]> = {
      'In Progress': [],
      'Ready for Approval': [],
      'Approved': [],
      'Blocked': [],
    };

    // Map stage_status values to display names
    const stageStatusToDisplay: Record<string, string> = {
      'in_progress': 'In Progress',
      'ready_for_approval': 'Ready for Approval',
      'approved': 'Approved',
      'blocked': 'Blocked',
    };

    caps.forEach(cap => {
      const stageStatus = getCapabilityStageStatusForFilter(cap);
      const displayStatus = stageStatusToDisplay[stageStatus] || 'In Progress';
      groups[displayStatus].push(cap);
    });

    // Sort each group by storyboard flow order
    Object.keys(groups).forEach(status => {
      groups[status] = sortByFlowOrder(groups[status]);
    });

    return groups;
  };

  // Get filtered capabilities
  const filteredCapabilities = filterCapabilities(fileCapabilities);
  const groupedCapabilities = groupByStageStatus(filteredCapabilities);

  // Calculate summary counts based on INTENT State Model stage_status from database
  // Helper to get stage_status for a capability from the database
  const getCapabilityStageStatus = (cap: FileCapability): string => {
    const capId = cap.fields?.['ID'] || cap.filename?.replace(/\.md$/, '') || '';
    const dbCap = dbCapabilities.get(capId);
    return dbCap?.stage_status || 'in_progress'; // Default to in_progress if not in DB
  };

  const summaryCounts = {
    inProgress: fileCapabilities.filter(c => getCapabilityStageStatus(c) === 'in_progress').length,
    readyForApproval: fileCapabilities.filter(c => getCapabilityStageStatus(c) === 'ready_for_approval').length,
    approved: fileCapabilities.filter(c => getCapabilityStageStatus(c) === 'approved').length,
    blocked: fileCapabilities.filter(c => getCapabilityStageStatus(c) === 'blocked').length,
    total: fileCapabilities.length,
  };

  const toggleSection = (status: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  if (showForm) {
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="text-large-title" style={{ marginBottom: '8px' }}>
            {selectedCapability ? 'Edit Capability' : 'Create Capability'}
          </h1>
        </div>
        <Card>
          <CapabilityForm
            capability={selectedCapability}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
            allCapabilities={capabilities}
          />
        </Card>
      </div>
    );
  }

  if (detailsView) {
    const statusColors = getStatusColor(detailsView.status);
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 className="text-large-title">{detailsView.name}</h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setDetailsView(null)}>
                Back to List
              </Button>
              <Button variant="primary" onClick={() => handleEdit(detailsView)}>
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDelete(detailsView.id!)}
                style={{ color: 'var(--color-systemRed)' }}
              >
                Delete
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Basic Info Card */}
            <Card>
              <h3 className="text-title2" style={{ marginBottom: '16px' }}>Basic Information</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <p className="text-subheadline" style={{ marginBottom: '4px' }}>Capability ID</p>
                  <p className="text-body">{detailsView.capability_id}</p>
                </div>
                <div>
                  <p className="text-subheadline" style={{ marginBottom: '4px' }}>Status</p>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '20px',
                    backgroundColor: statusColors.bg,
                    color: statusColors.color,
                  }}>
                    {formatStatus(detailsView.status)}
                  </span>
                </div>
                {detailsView.description && (
                  <div>
                    <p className="text-subheadline" style={{ marginBottom: '4px' }}>Description</p>
                    <p className="text-body">{detailsView.description}</p>
                  </div>
                )}
                {detailsView.storyboard_reference && (
                  <div>
                    <p className="text-subheadline" style={{ marginBottom: '4px' }}>Storyboard Reference</p>
                    <p className="text-body">{detailsView.storyboard_reference}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Purpose Card */}
            {detailsView.purpose && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>Purpose</h3>
                <p className="text-body" style={{ whiteSpace: 'pre-wrap' }}>
                  {detailsView.purpose}
                </p>
              </Card>
            )}

            {/* Dependencies Card */}
            {(detailsView.upstream_dependencies.length > 0 || detailsView.downstream_dependencies.length > 0) && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>Dependencies</h3>

                {detailsView.upstream_dependencies.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p className="text-subheadline" style={{ marginBottom: '12px' }}>
                      Upstream Dependencies (this depends on)
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {detailsView.upstream_dependencies.map(dep => (
                        <div
                          key={dep.id}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-separator)',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleViewDetails(dep)}
                        >
                          <p className="text-subheadline">{dep.capability_id} - {dep.name}</p>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '12px',
                            backgroundColor: getStatusColor(dep.status).bg,
                            color: getStatusColor(dep.status).color,
                            marginTop: '4px',
                          }}>
                            {formatStatus(dep.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailsView.downstream_dependencies.length > 0 && (
                  <div>
                    <p className="text-subheadline" style={{ marginBottom: '12px' }}>
                      Downstream Dependencies (depends on this)
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {detailsView.downstream_dependencies.map(dep => (
                        <div
                          key={dep.id}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-separator)',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleViewDetails(dep)}
                        >
                          <p className="text-subheadline">{dep.capability_id} - {dep.name}</p>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '12px',
                            backgroundColor: getStatusColor(dep.status).bg,
                            color: getStatusColor(dep.status).color,
                            marginTop: '4px',
                          }}>
                            {formatStatus(dep.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* UI Assets Card */}
            {detailsView.assets && detailsView.assets.length > 0 && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>UI Assets</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {detailsView.assets.map(asset => (
                    <div
                      key={asset.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-separator)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <p className="text-subheadline">{asset.asset_name}</p>
                        <span style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '12px',
                          backgroundColor: 'rgba(0, 122, 255, 0.1)',
                          color: 'var(--color-systemBlue)',
                        }}>
                          {asset.asset_type.toUpperCase()}
                        </span>
                      </div>
                      {asset.asset_url && (
                        <p className="text-footnote" style={{ marginBottom: '8px' }}>
                          <a
                            href={asset.asset_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-systemBlue)' }}
                          >
                            {asset.asset_url}
                          </a>
                        </p>
                      )}
                      {asset.description && (
                        <p className="text-body text-secondary" style={{ marginTop: '8px' }}>
                          {asset.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Approval Workflow Section */}
            {detailsView.id && (
              <Card>
                <ApprovalSection
                  capabilityId={detailsView.id}
                  currentStage={detailsView.workflow_stage || 'specification'}
                  currentStatus={detailsView.approval_status || 'draft'}
                  onApprovalChange={() => handleViewDetails(detailsView)}
                />
              </Card>
            )}

            {/* Acceptance Criteria Section */}
            {detailsView.id && (
              <Card>
                <AcceptanceCriteriaSection
                  entityType="capability"
                  entityId={detailsView.id}
                  entityName={detailsView.name}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      title="Capability Management"
      quickDescription="Track and manage INTENT capabilities - high-level business outcomes across your organization."
      detailedDescription="In Intent-Centered and Engineering-Driven, Narration for Transformation (INTENT), capabilities represent high-level business outcomes that contain multiple enablers. They integrate with design artifacts and AI-assisted development tools to accelerate delivery. Each capability should focus on delivering measurable business value and can be broken down into technical enablers that implement specific functionality."
      actions={
        <Button variant="primary" onClick={handleCreate}>
          + Create Capability
        </Button>
      }
    >

        {error && (
          <Alert type="error" style={{ marginBottom: '24px' }}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {/* File-based Capabilities Section */}
        {currentWorkspace?.projectFolder && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="text-title2">Capabilities from Specifications</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" onClick={handleAnalyzeSpecifications} disabled={isAnalyzing || loadingFiles}>
                  {isAnalyzing ? '🤖 Analyzing...' : '🤖 Analyze'}
                </Button>
                <Button variant="secondary" onClick={fetchFileCapabilities} disabled={loadingFiles}>
                  {loadingFiles ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {loadingFiles ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p className="text-body text-secondary">Loading capability files...</p>
              </div>
            ) : fileCapabilities.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p className="text-body text-secondary">
                    No capability files found in definition folder.
                    <br />
                    <span className="text-footnote">Looking for files matching: capability*, CAP* in {currentWorkspace?.projectFolder}/definition/</span>
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {/* Summary Dashboard - INTENT State Model: Stage Status */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <Card style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setStatusFilter('all')}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-label)' }}>
                      {summaryCounts.total}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      📊 Total
                    </div>
                  </Card>
                  <Card style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setStatusFilter('in_progress')}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemBlue)' }}>
                      {summaryCounts.inProgress}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      ✏️ In Progress
                    </div>
                  </Card>
                  <Card style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setStatusFilter('ready_for_approval')}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemOrange)' }}>
                      {summaryCounts.readyForApproval}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      👀 Ready for Approval
                    </div>
                  </Card>
                  <Card style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setStatusFilter('approved')}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemGreen)' }}>
                      {summaryCounts.approved}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      ✅ Approved
                    </div>
                  </Card>
                  <Card style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setStatusFilter('blocked')}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemRed)' }}>
                      {summaryCounts.blocked}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      🚫 Blocked
                    </div>
                  </Card>
                </div>

                {/* Search and Filter Controls */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search capabilities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input"
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-separator)',
                    }}
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input"
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-separator)',
                      minWidth: '180px',
                    }}
                  >
                    <option value="all">All Stage Statuses</option>
                    <option value="in_progress">✏️ In Progress</option>
                    <option value="ready_for_approval">👀 Ready for Approval</option>
                    <option value="approved">✅ Approved</option>
                    <option value="blocked">🚫 Blocked</option>
                  </select>
                  {(searchQuery || statusFilter !== 'all') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Grouped Capabilities by Status */}
                {filteredCapabilities.length === 0 ? (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p className="text-body text-secondary">
                        No capabilities match your search criteria.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.entries(groupedCapabilities).map(([displayStatus, caps]) => {
                      if (caps.length === 0) return null;

                      // Map display status to stage_status for colors
                      const displayToStageStatus: Record<string, string> = {
                        'In Progress': 'in_progress',
                        'Ready for Approval': 'ready_for_approval',
                        'Approved': 'approved',
                        'Blocked': 'blocked',
                      };
                      const stageStatus = displayToStageStatus[displayStatus] || 'in_progress';
                      const stageStatusColors = getStageStatusColor(stageStatus);
                      const isCollapsed = collapsedSections[displayStatus];

                      return (
                        <div key={displayStatus}>
                          {/* Stage Status Section Header */}
                          <div
                            onClick={() => toggleSection(displayStatus)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              backgroundColor: stageStatusColors.bg,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              marginBottom: isCollapsed ? '0' : '12px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '18px' }}>
                                {isCollapsed ? '▶' : '▼'}
                              </span>
                              <span style={{ fontSize: '16px' }}>{stageStatusColors.icon}</span>
                              <h4 className="text-headline" style={{ margin: 0, color: stageStatusColors.color }}>
                                {displayStatus}
                              </h4>
                              <span style={{
                                padding: '2px 8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                color: stageStatusColors.color,
                              }}>
                                {caps.length}
                              </span>
                            </div>
                          </div>

                          {/* Capability Cards with Accordion Enablers */}
                          {!isCollapsed && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {caps.map((fileCap) => {
                                const capStatusColors = getStatusColor(fileCap.status || 'planned');
                                const enablersForCap = getEnablersForCapability(fileCap);
                                const isExpanded = expandedCapabilities.has(fileCap.path);
                                const hasEnablers = enablersForCap.length > 0;

                                return (
                                  <Card
                                    key={fileCap.path || fileCap.filename}
                                    style={{
                                      border: isExpanded ? '2px solid var(--color-systemBlue)' : undefined,
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    {/* Capability Header Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                      <div style={{ flex: 1 }}>
                                        {/* Title row */}
                                        <h3
                                          className="text-headline"
                                          style={{
                                            margin: 0,
                                            marginBottom: '8px',
                                            cursor: 'pointer',
                                            color: 'var(--color-systemBlue)',
                                          }}
                                          onClick={() => handleOpenCapabilityInEditMode(fileCap)}
                                        >
                                          {fileCap.name || fileCap.filename}
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          {fileCap.status && (
                                            <span style={{
                                              display: 'inline-block',
                                              padding: '4px 12px',
                                              fontSize: '12px',
                                              fontWeight: 600,
                                              borderRadius: '20px',
                                              backgroundColor: capStatusColors.bg,
                                              color: capStatusColors.color,
                                              width: 'fit-content'
                                            }}>
                                              {formatStatus(fileCap.status)}
                                            </span>
                                          )}
                                          <p className="text-footnote text-secondary">
                                            <strong>File:</strong> {fileCap.filename}
                                          </p>
                                          {fileCap.description && (
                                            <p className="text-footnote text-secondary">
                                              {fileCap.description}
                                            </p>
                                          )}
                                          {/* Display additional fields from markdown */}
                                          {Object.entries(fileCap.fields || {}).slice(0, 3).map(([key, value]) => (
                                            <p key={key} className="text-footnote text-secondary">
                                              <strong>{key}:</strong> {String(value).substring(0, 100)}{String(value).length > 100 ? '...' : ''}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                      <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                          onClick={() => handleOpenCapabilityInEditMode(fileCap)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--color-systemBlue)',
                                            fontSize: '14px',
                                            padding: '4px 8px',
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteFileCapability(fileCap)}
                                          disabled={deletingCapability}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: deletingCapability ? 'wait' : 'pointer',
                                            color: 'var(--color-systemRed)',
                                            fontSize: '14px',
                                            padding: '4px 8px',
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>

                                    {/* Expand/Collapse Enablers Button - Below capability content */}
                                    {hasEnablers && (
                                      <button
                                        onClick={() => toggleCapabilityExpansion(fileCap.path)}
                                        style={{
                                          width: '100%',
                                          marginTop: '16px',
                                          padding: '10px 16px',
                                          backgroundColor: isExpanded
                                            ? 'rgba(0, 122, 255, 0.1)'
                                            : 'var(--color-tertiarySystemBackground)',
                                          border: '1px solid var(--color-separator)',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '8px',
                                          transition: 'all 0.2s ease',
                                        }}
                                      >
                                        <span style={{
                                          fontSize: '14px',
                                          color: 'var(--color-systemBlue)',
                                        }}>
                                          {isExpanded ? '▲' : '▼'}
                                        </span>
                                        <span style={{
                                          fontSize: '13px',
                                          fontWeight: 600,
                                          color: 'var(--color-systemBlue)',
                                        }}>
                                          {isExpanded ? 'Hide' : 'Show'} {enablersForCap.length} Enabler{enablersForCap.length !== 1 ? 's' : ''}
                                        </span>
                                      </button>
                                    )}

                                    {/* Nested Enablers (shown when expanded) */}
                                    {isExpanded && hasEnablers && (
                                      <div style={{
                                        marginTop: '16px',
                                        paddingTop: '16px',
                                        borderTop: '1px solid var(--color-separator)',
                                      }}>
                                        <h4 className="text-subheadline" style={{
                                          marginBottom: '12px',
                                          color: 'var(--color-secondaryLabel)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                        }}>
                                          <span style={{ fontSize: '14px' }}>🔧</span>
                                          Enablers
                                        </h4>
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '12px',
                                          paddingLeft: '12px',
                                          borderLeft: '3px solid var(--color-systemBlue)',
                                        }}>
                                          {enablersForCap.map((enabler) => {
                                            const enbStatusColors = getStatusColor(enabler.status || 'planned');
                                            return (
                                              <div
                                                key={enabler.path || enabler.filename}
                                                style={{
                                                  padding: '12px 16px',
                                                  borderRadius: '8px',
                                                  backgroundColor: 'var(--color-tertiarySystemBackground)',
                                                  border: '1px solid var(--color-separator)',
                                                }}
                                              >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                  <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                      <span style={{
                                                        padding: '2px 6px',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        borderRadius: '4px',
                                                        backgroundColor: 'rgba(255, 149, 0, 0.15)',
                                                        color: 'var(--color-systemOrange)',
                                                        textTransform: 'uppercase',
                                                      }}>
                                                        ENB
                                                      </span>
                                                      <h5 className="text-subheadline" style={{
                                                        margin: 0,
                                                        fontWeight: 600,
                                                        color: 'var(--color-label)',
                                                      }}>
                                                        {enabler.name || enabler.filename}
                                                      </h5>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                      {enabler.status && (
                                                        <span style={{
                                                          padding: '2px 8px',
                                                          fontSize: '11px',
                                                          fontWeight: 500,
                                                          borderRadius: '12px',
                                                          backgroundColor: enbStatusColors.bg,
                                                          color: enbStatusColors.color,
                                                        }}>
                                                          {formatStatus(enabler.status)}
                                                        </span>
                                                      )}
                                                      {enabler.priority && (
                                                        <span className="text-caption2" style={{ color: 'var(--color-tertiaryLabel)' }}>
                                                          Priority: {enabler.priority}
                                                        </span>
                                                      )}
                                                    </div>
                                                    {enabler.purpose && (
                                                      <p className="text-caption1 text-secondary" style={{
                                                        marginTop: '8px',
                                                        marginBottom: 0,
                                                        lineHeight: '1.4',
                                                      }}>
                                                        {enabler.purpose.substring(0, 150)}{enabler.purpose.length > 150 ? '...' : ''}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                    <span className="text-caption2" style={{
                                                      color: 'var(--color-tertiaryLabel)',
                                                      whiteSpace: 'nowrap',
                                                    }}>
                                                      {enabler.filename}
                                                    </span>
                                                    <button
                                                      onClick={() => handleDeleteFileEnabler(enabler)}
                                                      style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--color-systemRed)',
                                                        fontSize: '12px',
                                                        padding: '2px 6px',
                                                      }}
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* File Capability Detail Modal */}
        {selectedFileCapability && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px',
          }}>
            <Card style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <h2 className="text-title1">
                  {isEditingFileCapability ? 'Edit Capability' : (selectedFileCapability.name || selectedFileCapability.filename)}
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isEditingFileCapability ? (
                    <>
                      <Button variant="primary" onClick={handleSaveFileCapability} disabled={savingCapability}>
                        {savingCapability ? 'Saving...' : 'Save'}
                      </Button>
                      <Button variant="secondary" onClick={() => {
                        setSelectedFileCapability(null);
                        setIsEditingFileCapability(false);
                      }}>
                        Close
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="primary" onClick={() => handleEditFileCapability(selectedFileCapability)}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleDeleteFileCapability(selectedFileCapability)}
                        disabled={deletingCapability}
                        style={{ color: 'var(--color-systemRed)' }}
                      >
                        {deletingCapability ? 'Deleting...' : 'Delete'}
                      </Button>
                      <Button variant="secondary" onClick={() => {
                        setSelectedFileCapability(null);
                        setIsEditingFileCapability(false);
                      }}>
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditingFileCapability ? (
                /* Edit Form */
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Name</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="input"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* INTENT State Model - 4 Dimensions */}
                  <div style={{
                    marginBottom: '16px',
                    padding: '16px',
                    border: '1px solid var(--color-separator)',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-secondarySystemBackground)'
                  }}>
                    <h4 className="text-subheadline" style={{ marginBottom: '12px' }}>INTENT State Model</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Lifecycle State */}
                      <div>
                        <label className="text-caption1" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Lifecycle State</label>
                        <select
                          value={editFormData.lifecycle_state}
                          onChange={(e) => setEditFormData({ ...editFormData, lifecycle_state: e.target.value })}
                          className="input"
                          style={{ width: '100%' }}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="implemented">Implemented</option>
                          <option value="maintained">Maintained</option>
                          <option value="retired">Retired</option>
                        </select>
                      </div>

                      {/* Workflow Stage */}
                      <div>
                        <label className="text-caption1" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Workflow Stage</label>
                        <select
                          value={editFormData.workflow_stage}
                          onChange={(e) => setEditFormData({ ...editFormData, workflow_stage: e.target.value })}
                          className="input"
                          disabled={editFormData.lifecycle_state !== 'active'}
                          style={{ width: '100%', opacity: editFormData.lifecycle_state !== 'active' ? 0.6 : 1 }}
                        >
                          <option value="intent">Intent</option>
                          <option value="specification">Specification</option>
                          <option value="ui_design">UI-Design</option>
                          <option value="implementation">Implementation</option>
                          <option value="control_loop">Control-Loop</option>
                        </select>
                      </div>

                      {/* Stage Status */}
                      <div>
                        <label className="text-caption1" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Stage Status</label>
                        <select
                          value={editFormData.stage_status}
                          onChange={(e) => setEditFormData({ ...editFormData, stage_status: e.target.value })}
                          className="input"
                          disabled={editFormData.lifecycle_state !== 'active'}
                          style={{ width: '100%', opacity: editFormData.lifecycle_state !== 'active' ? 0.6 : 1 }}
                        >
                          <option value="in_progress">In Progress</option>
                          <option value="ready_for_approval">Ready for Approval</option>
                          <option value="approved">Approved</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>

                      {/* Approval Status */}
                      <div>
                        <label className="text-caption1" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Approval Status</label>
                        <select
                          value={editFormData.approval_status}
                          onChange={(e) => {
                            const newApprovalStatus = e.target.value;
                            // Auto-set stage_status based on approval status
                            let newStageStatus = editFormData.stage_status;
                            if (newApprovalStatus === 'approved') {
                              newStageStatus = 'approved';
                            } else if (newApprovalStatus === 'rejected') {
                              newStageStatus = 'blocked';
                            }
                            setEditFormData({ ...editFormData, approval_status: newApprovalStatus, stage_status: newStageStatus });
                          }}
                          className="input"
                          style={{ width: '100%' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Description</label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="input"
                      rows={3}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="text-subheadline" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      Storyboard Reference
                      {isStoryboardSuggesting && (
                        <span style={{ fontSize: '12px', color: 'var(--color-systemBlue)', fontWeight: 'normal' }}>
                          (AI analyzing...)
                        </span>
                      )}
                      {storyboardNeedsConfirmation && !isStoryboardSuggesting && (
                        <span style={{ fontSize: '12px', color: 'var(--color-systemGreen)', fontWeight: 'normal' }}>
                          (AI suggested)
                        </span>
                      )}
                    </label>
                    <select
                      value={editFormData.storyboardReference}
                      onChange={(e) => {
                        setEditFormData({ ...editFormData, storyboardReference: e.target.value });
                        // If user manually changes, clear the confirmation requirement
                        if (e.target.value !== suggestedStoryboard) {
                          setStoryboardNeedsConfirmation(false);
                        }
                      }}
                      className="input"
                      disabled={isStoryboardSuggesting}
                      style={{
                        width: '100%',
                        borderColor: storyboardNeedsConfirmation ? 'var(--color-systemGreen)' : undefined,
                        borderWidth: storyboardNeedsConfirmation ? '2px' : undefined,
                        boxShadow: storyboardNeedsConfirmation ? '0 0 0 1px var(--color-systemGreen)' : undefined,
                      }}
                    >
                      <option value="">{isStoryboardSuggesting ? 'AI analyzing...' : 'Select a Storyboard Card'}</option>
                      {storyboardCards.map((card) => (
                        <option key={card.id} value={card.title}>
                          {card.title}
                        </option>
                      ))}
                    </select>
                    {storyboardNeedsConfirmation && !isStoryboardSuggesting && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-systemGreen)', fontStyle: 'italic' }}>
                          Please confirm AI suggestion
                        </span>
                        <button
                          type="button"
                          onClick={confirmStoryboardSuggestion}
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            backgroundColor: 'var(--color-systemGreen)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                    <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
                      Select the storyboard card this capability relates to ({storyboardCards.length} cards available)
                    </p>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Additional Content</label>
                    <textarea
                      value={editFormData.content}
                      onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                      className="input"
                      rows={10}
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveFileCapability} disabled={savingCapability}>
                      {savingCapability ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <p className="text-footnote text-secondary">
                      <strong>File:</strong> {selectedFileCapability.path}
                    </p>
                  </div>

                  {selectedFileCapability.description && (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 className="text-headline" style={{ marginBottom: '8px' }}>Description</h4>
                      <p className="text-body">{selectedFileCapability.description}</p>
                    </div>
                  )}

                  {/* Display all fields from the markdown */}
                  {Object.entries(selectedFileCapability.fields || {}).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '16px' }}>
                      <h4 className="text-headline" style={{ marginBottom: '8px' }}>{key}</h4>
                      <p className="text-body" style={{ whiteSpace: 'pre-wrap' }}>{value}</p>
                    </div>
                  ))}

                  {/* Raw content */}
                  {selectedFileCapability.content && (
                    <div style={{ marginTop: '24px' }}>
                      <h4 className="text-headline" style={{ marginBottom: '8px' }}>Raw Content</h4>
                      <pre style={{
                        backgroundColor: 'var(--color-secondarySystemBackground)',
                        padding: '12px',
                        borderRadius: '8px',
                        overflow: 'auto',
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {selectedFileCapability.content}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        )}

        {/* Proposed Capabilities Section */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <Card style={{ borderLeft: '4px solid var(--color-systemBlue)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h2 className="text-title1" style={{ marginBottom: '8px' }}>Proposed Capabilities</h2>
                  <p className="text-body text-secondary">
                    Based on Capability-Driven Architecture Map analysis of your conception documents
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleAcceptAllSuggestions}>
                    Accept All ({suggestions.length})
                  </Button>
                  <Button variant="secondary" onClick={() => setShowSuggestions(false)}>
                    Dismiss
                  </Button>
                </div>
              </div>

              {/* Analysis Info */}
              {analysisInfo && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 122, 255, 0.08)',
                  border: '1px solid rgba(0, 122, 255, 0.2)',
                }}>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {analysisInfo.totalConceptionDocuments && (
                      <span className="text-footnote">
                        <strong>Documents Analyzed:</strong> {analysisInfo.totalConceptionDocuments}
                      </span>
                    )}
                    {analysisInfo.keyThemes && analysisInfo.keyThemes.length > 0 && (
                      <span className="text-footnote">
                        <strong>Key Themes:</strong> {analysisInfo.keyThemes.join(', ')}
                      </span>
                    )}
                  </div>
                  {analysisInfo.coverageNotes && (
                    <p className="text-footnote text-secondary" style={{ margin: 0 }}>
                      {analysisInfo.coverageNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Proposed Capability Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-separator)',
                      backgroundColor: 'var(--color-secondarySystemBackground)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '20px',
                            backgroundColor: 'rgba(0, 122, 255, 0.15)',
                            color: 'var(--color-systemBlue)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            Capability
                          </span>
                          <h3 className="text-headline" style={{ margin: 0 }}>{suggestion.name}</h3>
                        </div>
                        <p className="text-body" style={{ marginBottom: '12px' }}>{suggestion.description}</p>

                        <div style={{ marginBottom: '8px' }}>
                          <p className="text-footnote" style={{ marginBottom: '4px' }}>
                            <strong>Rationale:</strong>
                          </p>
                          <p className="text-footnote text-secondary" style={{ margin: 0 }}>
                            {suggestion.rationale}
                          </p>
                        </div>

                        {suggestion.successMetrics && suggestion.successMetrics.length > 0 && (
                          <div>
                            <p className="text-footnote" style={{ marginBottom: '4px' }}>
                              <strong>Success Metrics:</strong>
                            </p>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                              {suggestion.successMetrics.map((metric, i) => (
                                <li key={i} className="text-footnote text-secondary">{metric}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <Button variant="primary" onClick={() => handleAcceptSuggestion(suggestion)}>
                        Accept & Create
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Database capabilities section hidden - using file-based capabilities from definition folder only */}
        {false && loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p className="text-body text-secondary">Loading capabilities...</p>
          </div>
        ) : false && capabilities.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
                No database capabilities found. Create your first capability to get started.
              </p>
              <Button variant="primary" onClick={handleCreate}>
                Create First Capability
              </Button>
            </div>
          </Card>
        ) : false ? (
          <>
            <h3 className="text-title2" style={{ marginBottom: '16px' }}>Database Capabilities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--spacing-4, 16px)' }}>
              {capabilities.map(capability => {
                const statusColors = getStatusColor(capability.status);
                const workflowStage = capability.workflow_stage || 'specification';
                const approvalStatus = capability.approval_status || 'draft';
                return (
                  <Card key={capability.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <h3
                          className="text-headline"
                          style={{
                            marginBottom: '8px',
                            cursor: 'pointer',
                            color: 'var(--color-systemBlue)',
                          }}
                          onClick={() => handleViewDetails(capability)}
                        >
                          {capability.name}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* Workflow Stage and Approval Status */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <StageBadge stage={workflowStage as WorkflowStage} size="small" />
                            <ApprovalStatusBadge status={approvalStatus} size="small" />
                          </div>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '20px',
                            backgroundColor: statusColors.bg,
                            color: statusColors.color,
                            width: 'fit-content'
                          }}>
                            {formatStatus(capability.status)}
                          </span>
                          <p className="text-footnote text-secondary">
                            <strong>ID:</strong> {capability.capability_id}
                          </p>
                          {capability.description && (
                            <p className="text-footnote text-secondary">
                              {capability.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ marginLeft: '12px' }}>
                        <button
                          onClick={() => handleEdit(capability)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-systemBlue)',
                            fontSize: '14px',
                            padding: '4px 8px',
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        ) : null}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />
    </PageLayout>
  );
};
