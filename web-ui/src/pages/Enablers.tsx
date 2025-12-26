import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Alert, Button, ConfirmDialog, PageLayout } from '../components';
import { useEnabler } from '../context/EnablerContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useEntityState } from '../context/EntityStateContext';
import { INTEGRATION_URL } from '../api/client';
import { ReadOnlyStateFields } from '../components/ReadOnlyStateFields';

// File-based capability from workspace definition folder
interface FileCapability {
  filename: string;
  path: string;
  name: string;
  description: string;
  purpose?: string;
  status: string;
  capabilityId: string;
  storyboardReference?: string;
  flowOrder?: number; // Order based on storyboard position
}

// File-based enabler from workspace definition folder
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
  // INTENT State Model - 4 dimensions (from fields parsing)
  fields?: Record<string, string>;
}
import {
  type Enabler,
  type EnablerRequirement,
  type AcceptanceCriteria,
  type CreateEnablerRequest,
  type UpdateEnablerRequest,
  type CreateRequirementRequest,
  type CriteriaFormat,
  type CriteriaPriority,
  type RequirementType,
  type RequirementPriority,
  type EnablerSpecification,
  type LifecycleState,
  type WorkflowStage,
  type StageStatus,
  type ApprovalStatus,
  getEnablerStatusDisplayName,
  getEnablerStatusColor,
  getRequirementTypeDisplayName,
  getRequirementPriorityDisplayName,
  getRequirementPriorityColor,
  getCriteriaFormatDisplayName,
  getCriteriaStatusDisplayName,
  getCriteriaStatusColor,
  getCriteriaPriorityDisplayName,
  generateId,
  getSpecificationStatusColor,
  getSpecificationApprovalColor,
} from '../api/enablerService';

export const Enablers: React.FC = () => {
  const {
    enablers,
    selectedEnabler,
    requirements,
    acceptanceCriteria,
    criteriaSummary,
    isLoading,
    error,
    loadEnablers,
    loadEnabler,
    createEnabler,
    updateEnabler,
    deleteEnabler,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    verifyRequirement,
    loadCriteria,
    loadCriteriaSummary,
    createCriteria,
    updateCriteria,
    deleteCriteria,
    verifyCriteria,
    clearError,
    clearSelection,
    // Specification state (persists across navigation)
    specifications,
    isAnalyzing,
    analyzeError,
    loadSpecifications,
    deleteSpecification,
    updateSpecification,
    reorderSpecifications,
    clearAnalyzeError,
  } = useEnabler();

  const { currentWorkspace } = useWorkspace();
  const { enablers: dbEnablers, syncEnabler, fetchEnablerState, capabilities: dbCapabilities, syncCapability, refreshWorkspaceState } = useEntityState();
  const [searchParams, setSearchParams] = useSearchParams();
  const [capabilities, setCapabilities] = useState<FileCapability[]>([]);
  const [loadingCapabilities, setLoadingCapabilities] = useState(false);
  const [fileEnablers, setFileEnablers] = useState<FileEnabler[]>([]);
  const [loadingFileEnablers, setLoadingFileEnablers] = useState(false);
  const [selectedCapabilityId, setSelectedCapabilityId] = useState<string | null>(null);
  // Separate state for the capability selection in the enabler form (doesn't affect main filter)
  const [formCapabilityId, setFormCapabilityId] = useState<string | null>(null);
  // AI-suggested capability state
  const [suggestedCapabilityId, setSuggestedCapabilityId] = useState<string | null>(null);
  const [isCapabilitySuggesting, setIsCapabilitySuggesting] = useState(false);
  const [capabilityNeedsConfirmation, setCapabilityNeedsConfirmation] = useState(false);
  const [showEnablerForm, setShowEnablerForm] = useState(false);
  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [editingEnabler, setEditingEnabler] = useState<Enabler | null>(null);
  const [editingRequirement, setEditingRequirement] = useState<EnablerRequirement | null>(null);
  const [editingCriteria, setEditingCriteria] = useState<AcceptanceCriteria | null>(null);

  // Selected specification for detail view (local state, doesn't need persistence)
  const [selectedSpecification, setSelectedSpecification] = useState<EnablerSpecification | null>(null);

  // Editing specification state
  const [editingSpecification, setEditingSpecification] = useState<EnablerSpecification | null>(null);

  // Editing file-based enabler state
  const [editingFileEnabler, setEditingFileEnabler] = useState<FileEnabler | null>(null);

  // Drag and drop state
  const [draggedSpecIndex, setDraggedSpecIndex] = useState<number | null>(null);

  // Proposed enablers from AI analysis
  const [proposedEnablers, setProposedEnablers] = useState<Array<{
    name: string;
    purpose: string;
    capabilityName: string;
    capabilityId: string;
    rationale: string;
    requirements?: string[];
  }>>([]);
  const [showProposedEnablers, setShowProposedEnablers] = useState(false);
  const [isAnalyzingCapabilities, setIsAnalyzingCapabilities] = useState(false);

  // Multi-select mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedEnablerIds, setSelectedEnablerIds] = useState<Set<string>>(new Set());

  const [analysisInfo, setAnalysisInfo] = useState<{
    totalCapabilities?: number;
    analyzedCapabilities?: string[];
    coverageNotes?: string;
  } | null>(null);

  // Inline requirement for enabler form
  interface InlineRequirement {
    id: string;
    name: string;
    description: string;
    type: 'functional' | 'non_functional';
    priority: string;
    status: string;
    nfrCategory?: string;
  }

  // Form states
  const [enablerFormData, setEnablerFormData] = useState<Partial<CreateEnablerRequest>>({
    enabler_id: '',
    capability_id: 0,
    name: '',
    purpose: '',
    owner: '',
    priority: 'medium',
    // INTENT State Model - 4 dimensions
    // New enablers: active lifecycle, specification stage, in_progress status
    lifecycle_state: 'active',
    workflow_stage: 'specification',
    stage_status: 'in_progress',
    approval_status: 'pending',
  });

  // Inline requirements for enabler creation
  const [inlineRequirements, setInlineRequirements] = useState<InlineRequirement[]>([]);

  const [requirementFormData, setRequirementFormData] = useState<Partial<CreateRequirementRequest>>({
    requirement_id: '',
    enabler_id: 0,
    name: '',
    description: '',
    requirement_type: 'functional',
    priority: 'should_have',
    notes: '',
  });

  const [criteriaFormData, setCriteriaFormData] = useState({
    criteria_id: '',
    title: '',
    description: '',
    criteria_format: 'checklist' as CriteriaFormat,
    given_clause: '',
    when_clause: '',
    then_clause: '',
    metric_name: '',
    metric_target: '',
    priority: 'must' as CriteriaPriority,
  });

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

  // Load capabilities and file enablers when workspace changes or on mount
  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      loadCapabilities();
      loadFileEnablers();
    }
  }, [currentWorkspace?.projectFolder]);

  // Also load on initial mount if workspace is already set
  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      loadCapabilities();
      loadFileEnablers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load enablers when capability is selected (using capability ID string for file-based capabilities)
  useEffect(() => {
    if (selectedCapabilityId) {
      // For file-based capabilities, we use the capability ID string
      // The enabler context needs to handle this appropriately
      const numericId = parseInt(selectedCapabilityId) || 0;
      if (numericId > 0) {
        loadEnablers(numericId);
      }
    }
  }, [selectedCapabilityId, loadEnablers]);

  // Load criteria when enabler is selected
  useEffect(() => {
    if (selectedEnabler) {
      loadCriteria('enabler', selectedEnabler.id);
      loadCriteriaSummary('enabler', selectedEnabler.id);
    }
  }, [selectedEnabler, loadCriteria, loadCriteriaSummary]);

  // Handle opening a specific item from URL parameter
  useEffect(() => {
    const openItem = searchParams.get('open');
    if (openItem && fileEnablers.length > 0 && !editingFileEnabler) {
      // Find an enabler with matching filename
      const matchingEnabler = fileEnablers.find(e => e.filename === openItem);
      if (matchingEnabler) {
        setEditingFileEnabler(matchingEnabler);
        // Scroll to the enabler section
        setTimeout(() => {
          const element = document.getElementById(`enabler-${matchingEnabler.filename}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      // Clear the search param after attempting to open
      setSearchParams({}, { replace: true });
    }
  }, [fileEnablers, searchParams, editingFileEnabler, setSearchParams]);

  // Load capabilities from workspace's definition folder (CAP-*.md files)
  // Sorted by storyboard flow order (matching the Narrative/StoryMap page logic)
  const loadCapabilities = async () => {
    if (!currentWorkspace?.projectFolder) {
      setCapabilities([]);
      return;
    }

    setLoadingCapabilities(true);
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

      if (response.ok) {
        const data = await response.json();

        // Get storyboard canvas data for ordering (same approach as Narrative/StoryMap page)
        const storyboardData = currentWorkspace?.storyboard;

        // Create a position map from the storyboard canvas cards (matching StoryMap logic)
        const positionMap = new Map<string, number>();
        if (storyboardData?.cards && storyboardData.cards.length > 0) {
          // Sort cards by Y position and assign flow order
          const sortedCards = [...storyboardData.cards].sort((a, b) => (a.y || 0) - (b.y || 0));
          sortedCards.forEach((card: { id: string; title: string; y?: number }, index: number) => {
            positionMap.set(card.id, index);
            positionMap.set(card.title.toLowerCase(), index);
          });
        }

        // Filter to only include CAP-*.md files and map to FileCapability interface
        const caps: FileCapability[] = (data.capabilities || [])
          .filter((cap: any) => cap.filename?.startsWith('CAP-'))
          .map((cap: any) => {
            const storyboardRef = cap.fields?.['Storyboard Reference'] || '';
            // Get flow order from storyboard position
            const flowOrder = storyboardRef
              ? (positionMap.get(storyboardRef.toLowerCase()) ?? Infinity)
              : Infinity;

            return {
              filename: cap.filename,
              path: cap.path,
              name: cap.name || cap.filename.replace(/\.md$/, ''),
              description: cap.description || '',
              purpose: cap.purpose || cap.fields?.['Purpose'] || '',
              status: cap.status || '',
              capabilityId: cap.fields?.['ID'] || cap.filename.replace(/\.md$/, ''),
              storyboardReference: storyboardRef,
              flowOrder: flowOrder,
            };
          });

        // Sort capabilities by storyboard flow order, then by name
        caps.sort((a, b) => {
          const orderA = a.flowOrder ?? Infinity;
          const orderB = b.flowOrder ?? Infinity;
          if (orderA !== orderB) return orderA - orderB;
          return (a.name || '').localeCompare(b.name || '');
        });

        setCapabilities(caps);
      }
    } catch (err) {
      console.error('Failed to load capabilities from workspace:', err);
      setCapabilities([]);
    } finally {
      setLoadingCapabilities(false);
    }
  };

  // Load enablers from workspace's definition folder (ENB-*.md files)
  const loadFileEnablers = async (): Promise<FileEnabler[]> => {
    if (!currentWorkspace?.projectFolder) {
      setFileEnablers([]);
      return [];
    }

    setLoadingFileEnablers(true);
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

      if (response.ok) {
        const data = await response.json();
        // Filter to only include ENB-*.md files
        const enbs: FileEnabler[] = (data.enablers || [])
          .filter((enb: any) => enb.filename?.startsWith('ENB-'))
          .map((enb: any) => ({
            filename: enb.filename,
            path: enb.path,
            name: enb.name || enb.filename.replace(/\.md$/, ''),
            purpose: enb.purpose || '',
            status: enb.status || '',
            owner: enb.owner || '',
            priority: enb.priority || 'medium',
            capabilityId: enb.capabilityId || '',
            enablerId: enb.enablerId || enb.filename.replace(/\.md$/, ''),
            // Include fields for INTENT State Model dimensions
            fields: enb.fields || {},
          }));
        setFileEnablers(enbs);
        return enbs;
      }
      return [];
    } catch (err) {
      console.error('Failed to load enablers from workspace:', err);
      setFileEnablers([]);
      return [];
    } finally {
      setLoadingFileEnablers(false);
    }
  };

  // Enabler handlers
  const handleCreateEnabler = () => {
    setEditingEnabler(null);
    setEditingFileEnabler(null);
    // Reset AI suggestion state
    setSuggestedCapabilityId(null);
    setCapabilityNeedsConfirmation(false);
    setIsCapabilitySuggesting(false);
    // Initialize form capability from the selected filter
    setFormCapabilityId(selectedCapabilityId);
    // For file-based capabilities, we store the capability ID string
    // The numeric capability_id is 0 since we're using file-based references
    setEnablerFormData({
      enabler_id: generateId('ENB'),
      capability_id: 0, // Use 0 for file-based capabilities
      name: '',
      purpose: '',
      owner: '',
      priority: 'medium',
      // INTENT State Model - 4 dimensions
      // New enablers: active lifecycle, specification stage, in_progress status
      lifecycle_state: 'active',
      workflow_stage: 'specification',
      stage_status: 'in_progress',
      approval_status: 'pending',
    });
    setInlineRequirements([]); // Reset inline requirements
    setShowEnablerForm(true);
  };

  // Edit file-based enabler
  const handleEditFileEnabler = async (enabler: FileEnabler) => {
    setEditingEnabler(null);
    setEditingFileEnabler(enabler);

    // Reset AI suggestion state
    setSuggestedCapabilityId(null);
    setCapabilityNeedsConfirmation(false);

    // Set the capability ID for the form dropdown (NOT the main filter)
    // If the stored capabilityId is actually a name (not an ID like CAP-xxx), find the actual capability
    let capIdToSet = enabler.capabilityId || null;
    if (capIdToSet && !capIdToSet.startsWith('CAP-')) {
      // The stored value might be a capability name, find the matching capability by name
      const matchingCap = capabilities.find(c =>
        c.name === capIdToSet ||
        c.name?.toLowerCase() === capIdToSet?.toLowerCase()
      );
      if (matchingCap?.capabilityId) {
        capIdToSet = matchingCap.capabilityId;
        console.log('Resolved capability name to ID:', enabler.capabilityId, '->', capIdToSet);
      }
    }
    setFormCapabilityId(capIdToSet);

    // Get INTENT State Model dimensions from DATABASE (single source of truth)
    const enablerId = enabler.enablerId || enabler.fields?.['ID'] || '';
    let lifecycleState = 'draft';
    let workflowStage = 'intent';
    let stageStatus = 'in_progress';
    let approvalStatus = 'pending';

    if (enablerId) {
      // Try to get state from cached dbEnablers first
      let dbState = dbEnablers.get(enablerId);

      // If not in cache, fetch from database
      if (!dbState) {
        dbState = await fetchEnablerState(enablerId) || undefined;
      }

      if (dbState) {
        lifecycleState = dbState.lifecycle_state || 'draft';
        workflowStage = dbState.workflow_stage || 'intent';
        stageStatus = dbState.stage_status || 'in_progress';
        approvalStatus = dbState.approval_status || 'pending';
      }
    }

    // Populate form with existing enabler data
    setEnablerFormData({
      enabler_id: enabler.enablerId || '',
      capability_id: 0,
      name: enabler.name || '',
      purpose: enabler.purpose || '',
      owner: enabler.owner || '',
      priority: (enabler.priority as any) || 'medium',
      // INTENT State Model - 4 dimensions from DATABASE
      lifecycle_state: lifecycleState as LifecycleState,
      workflow_stage: workflowStage as WorkflowStage,
      stage_status: stageStatus as StageStatus,
      approval_status: approvalStatus as ApprovalStatus,
    });

    // Try to load requirements from the file
    // For now, we'll start with empty requirements since they need to be parsed from the file
    // In a future enhancement, we could fetch and parse the markdown to extract requirements
    setInlineRequirements([]);

    setShowEnablerForm(true);

    // Trigger AI capability suggestion only if no capability ID exists
    if (!enabler.capabilityId && enabler.name && capabilities.length > 0) {
      suggestBestCapability(enabler.name, enabler.purpose || '');
    }
  };

  // Add inline requirement during enabler creation
  const handleAddInlineRequirement = () => {
    const newReq: InlineRequirement = {
      id: generateId('FR'),
      name: '',
      description: '',
      type: 'functional',
      priority: 'should_have',
      status: 'Draft',
      nfrCategory: undefined,
    };
    setInlineRequirements([...inlineRequirements, newReq]);
  };

  // Update inline requirement
  const handleUpdateInlineRequirement = (index: number, field: string, value: string) => {
    const updated = [...inlineRequirements];
    if (field === 'type') {
      // Update ID prefix when type changes
      const newId = value === 'functional' ? generateId('FR') : generateId('NFR');
      updated[index] = { ...updated[index], [field]: value, id: newId };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setInlineRequirements(updated);
  };

  // Remove inline requirement
  const handleRemoveInlineRequirement = (index: number) => {
    setInlineRequirements(inlineRequirements.filter((_, i) => i !== index));
  };

  // Get the selected capability name for display
  const getSelectedCapabilityName = () => {
    const cap = capabilities.find(c => c.capabilityId === selectedCapabilityId);
    return cap ? `${cap.capabilityId} - ${cap.name}` : selectedCapabilityId || '';
  };

  // AI-powered capability matching
  const suggestBestCapability = async (enablerName: string, enablerPurpose: string) => {
    if (capabilities.length === 0 || !currentWorkspace?.projectFolder) return;

    setIsCapabilitySuggesting(true);
    setCapabilityNeedsConfirmation(false);

    try {
      // Build a prompt for Claude to match the enabler to the best capability
      const capabilityList = capabilities.map(cap =>
        `- ${cap.capabilityId}: ${cap.name}${cap.description ? ` - ${cap.description}` : ''}`
      ).join('\n');

      const prompt = `Given an enabler with the following details:
Name: ${enablerName}
Purpose: ${enablerPurpose || 'Not specified'}

And the following available capabilities:
${capabilityList}

Which capability ID is the BEST match for this enabler?
Respond with ONLY the capability ID (e.g., "CAP-123456") and nothing else. If no good match exists, respond with "NONE".`;

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

        const suggestedId = data.response?.trim();

        // Validate the suggested ID exists in our capabilities
        if (suggestedId && suggestedId !== 'NONE') {
          // Extract just the CAP-XXXXXX part if there's extra text
          const capMatch = suggestedId.match(/CAP-\d+/i);
          const cleanId = capMatch ? capMatch[0].toUpperCase() : suggestedId.toUpperCase();

          const matchingCap = capabilities.find(c =>
            c.capabilityId.toUpperCase() === cleanId
          );

          if (matchingCap) {
            setSuggestedCapabilityId(matchingCap.capabilityId);
            setFormCapabilityId(matchingCap.capabilityId);
            setCapabilityNeedsConfirmation(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to get AI capability suggestion:', err);
    } finally {
      setIsCapabilitySuggesting(false);
    }
  };

  // Confirm the AI-suggested capability and save it
  const confirmCapabilitySuggestion = async () => {
    setCapabilityNeedsConfirmation(false);

    // Save the capability reference to the file immediately
    if (editingFileEnabler && suggestedCapabilityId) {
      const capability = capabilities.find(c => c.capabilityId === suggestedCapabilityId);
      const capabilityName = capability?.name || suggestedCapabilityId;

      try {
        await fetch(`${INTEGRATION_URL}/update-enabler-capability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: editingFileEnabler.path,
            capabilityId: suggestedCapabilityId,
            capabilityName: capabilityName,
          }),
        });
        // Refresh the enablers list to get updated data
        const refreshedEnablers = await loadFileEnablers();

        // Update editingFileEnabler with the refreshed data
        const refreshedEnabler = refreshedEnablers.find(
          (e) => e.path === editingFileEnabler.path
        );
        if (refreshedEnabler) {
          setEditingFileEnabler(refreshedEnabler);
          // Also update the form capability ID with the new value
          setFormCapabilityId(refreshedEnabler.capabilityId || suggestedCapabilityId);
        }
      } catch (err) {
        console.error('Failed to save capability reference:', err);
      }
    }
  };

  const handleEditEnabler = (enabler: Enabler) => {
    setEditingEnabler(enabler);
    setEnablerFormData({
      enabler_id: enabler.enabler_id,
      capability_id: enabler.capability_id,
      name: enabler.name,
      purpose: enabler.purpose || '',
      owner: enabler.owner || '',
      priority: enabler.priority,
      // INTENT State Model - 4 dimensions
      lifecycle_state: enabler.lifecycle_state || 'draft',
      workflow_stage: enabler.workflow_stage || 'intent',
      stage_status: enabler.stage_status || 'in_progress',
      approval_status: enabler.approval_status || 'pending',
    });
    setShowEnablerForm(true);
  };

  // Multi-select mode handlers
  const toggleEnablerSelection = (enablerId: string) => {
    setSelectedEnablerIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(enablerId)) {
        newSet.delete(enablerId);
      } else {
        newSet.add(enablerId);
      }
      return newSet;
    });
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedEnablerIds(new Set());
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!currentWorkspace?.name || selectedEnablerIds.size === 0) return;

    try {
      // Update each selected enabler's status in the DATABASE (single source of truth)
      // Markdown file updates removed - database is authoritative for state
      for (const enablerId of selectedEnablerIds) {
        const enabler = fileEnablers.find(e => e.enablerId === enablerId);
        if (!enabler) continue;

        // Map old status values to INTENT State Model stage_status
        // Old statuses: draft, ready_for_analysis, in_analysis, ready_for_design, in_design, etc.
        // New stage_status: in_progress, ready_for_approval, approved, blocked
        let stageStatus: 'in_progress' | 'ready_for_approval' | 'approved' | 'blocked' = 'in_progress';
        if (newStatus.includes('ready')) {
          stageStatus = 'ready_for_approval';
        } else if (newStatus === 'implemented') {
          stageStatus = 'approved';
        } else if (newStatus === 'deprecated' || newStatus === 'blocked') {
          stageStatus = 'blocked';
        }

        // Sync to database
        try {
          await syncEnabler({
            enabler_id: enablerId,
            name: enabler.name,
            workspace_id: currentWorkspace.name,
            stage_status: stageStatus,
          });
          console.log(`Updated enabler ${enablerId} stage_status to ${stageStatus} in database`);
        } catch (syncErr) {
          console.error(`Failed to sync enabler ${enablerId} to database:`, syncErr);
        }
      }

      // Reload file enablers to reflect changes
      await loadFileEnablers();
      await refreshWorkspaceState();

      // Exit select mode after successful update
      exitSelectMode();
    } catch (err) {
      console.error('Failed to bulk update enabler status:', err);
    }
  };

  const handleSaveEnabler = async () => {
    try {
      if (!currentWorkspace?.projectFolder) {
        throw new Error('Workspace folder not configured. Please set a project folder in Workspaces.');
      }

      // If editing existing enabler, use the original filename; otherwise generate new one
      let fileName: string;
      if (editingFileEnabler) {
        fileName = editingFileEnabler.filename;
      } else {
        // Generate filename from enabler ID + first 3 words of name
        const nameSlug = (enablerFormData.name || '')
          .toLowerCase()
          .split(/\s+/)
          .slice(0, 3)
          .join('-')
          .replace(/[^a-z0-9-]/g, '');
        fileName = `${enablerFormData.enabler_id}-${nameSlug}.md`;
      }

      // Find the capability name for reference - search by both ID and name
      const capability = capabilities.find(c =>
        c.capabilityId === formCapabilityId ||
        c.name === formCapabilityId ||
        c.name?.toLowerCase() === formCapabilityId?.toLowerCase()
      );
      const capabilityName = capability?.name || formCapabilityId || 'Unknown';
      const capabilityId = capability?.capabilityId || formCapabilityId || '';

      // Generate markdown content (NO state fields - state is stored in database only)
      let markdown = `# ${enablerFormData.name}\n\n`;
      markdown += `## Metadata\n`;
      markdown += `- **ID**: ${enablerFormData.enabler_id}\n`;
      markdown += `- **Type**: Enabler\n`;
      markdown += `- **Capability ID**: ${capabilityId}\n`;  // Store the actual capability ID for reliable parsing
      markdown += `- **Capability**: ${capabilityName}\n`;
      markdown += `- **Owner**: ${enablerFormData.owner || 'Not specified'}\n`;
      markdown += `- **Priority**: ${enablerFormData.priority || 'medium'}\n`;
      // NOTE: State fields (lifecycle_state, workflow_stage, stage_status, approval_status)
      // are NOT written to markdown - database is the single source of truth
      markdown += `- **Created**: ${new Date().toLocaleString()}\n\n`;

      if (enablerFormData.purpose) {
        markdown += `## Purpose\n${enablerFormData.purpose}\n\n`;
      }

      // Add Functional Requirements section
      const functionalReqs = inlineRequirements.filter(r => r.type === 'functional');
      markdown += `## Functional Requirements\n`;
      if (functionalReqs.length > 0) {
        markdown += `| ID | Name | Requirement | Status | Priority | Approval |\n`;
        markdown += `|----|------|-------------|--------|----------|----------|\n`;
        functionalReqs.forEach(req => {
          markdown += `| ${req.id} | ${req.name} | ${req.description} | ${req.status} | ${req.priority} | Pending |\n`;
        });
      } else {
        markdown += `_No functional requirements defined yet._\n`;
      }
      markdown += `\n`;

      // Add Non-Functional Requirements section
      const nonFunctionalReqs = inlineRequirements.filter(r => r.type === 'non_functional');
      markdown += `## Non-Functional Requirements\n`;
      if (nonFunctionalReqs.length > 0) {
        markdown += `| ID | Name | Requirement | Type | Status | Priority | Approval |\n`;
        markdown += `|----|------|-------------|------|--------|----------|----------|\n`;
        nonFunctionalReqs.forEach(req => {
          markdown += `| ${req.id} | ${req.name} | ${req.description} | ${req.nfrCategory || 'General'} | ${req.status} | ${req.priority} | Pending |\n`;
        });
      } else {
        markdown += `_No non-functional requirements defined yet._\n`;
      }
      markdown += `\n`;

      markdown += `## Acceptance Criteria\n_No acceptance criteria defined yet._\n`;

      // Save to definition folder
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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save enabler');
      }

      // Save state to DATABASE via EntityStateContext (single source of truth for state)
      if (currentWorkspace?.id && enablerFormData.enabler_id) {
        try {
          // Find the parent capability - check both capabilityId formats
          console.log('Looking for capability with formCapabilityId:', formCapabilityId);
          console.log('Available capabilities:', capabilities.map(c => ({ id: c.capabilityId, name: c.name })));

          const capability = capabilities.find(c =>
            c.capabilityId === formCapabilityId ||
            c.name === formCapabilityId ||  // Match by capability name too
            c.name?.toLowerCase() === formCapabilityId?.toLowerCase()  // Case-insensitive name match
          );
          console.log('Found capability:', capability);

          // IMPORTANT: We need the database ID of the capability, not the string capability_id
          // First, check if the capability is already in the database cache
          let capabilityDbId = 0;
          const capId = capability?.capabilityId || capability?.fields?.['ID'] || capability?.fields?.['Capability ID'];

          if (capId) {
            console.log('Checking database for capability:', capId);
            const dbCap = dbCapabilities.get(capId);
            console.log('Database capability found:', dbCap);

            if (dbCap?.id) {
              capabilityDbId = dbCap.id;
              console.log('Using cached database ID:', capabilityDbId);
            } else {
              // Capability not in database yet - sync it first to satisfy FK constraint
              console.log('Parent capability not in database, syncing first:', capId);
              const syncedCap = await syncCapability({
                capability_id: capId,
                name: capability?.name || 'Unknown',
                description: capability?.description || '',
                purpose: capability?.purpose || '',
                storyboard_reference: capability?.storyboardReference || '',
                workspace_id: currentWorkspace.name, // Must use .name to match EntityStateContext queries
                file_path: capability?.path || '',
                lifecycle_state: 'draft',
                workflow_stage: 'intent',
                stage_status: 'in_progress',
                approval_status: 'pending',
              });
              console.log('Synced capability result:', syncedCap);
              if (syncedCap?.id) {
                capabilityDbId = syncedCap.id;
                console.log('Parent capability synced with database ID:', capabilityDbId);
              } else {
                console.error('syncCapability returned but without id:', syncedCap);
              }
            }
          } else {
            console.log('No capability ID found in capability object');
          }

          if (capabilityDbId === 0) {
            console.warn('Could not determine parent capability database ID, enabler state sync skipped. capId:', capId, 'formCapabilityId:', formCapabilityId);
          } else {
            // AUTO-RESET: If item was blocked and user edited it, reset to in_progress/pending
            let stageStatusToSave = enablerFormData.stage_status || 'in_progress';
            let approvalStatusToSave = enablerFormData.approval_status || 'pending';
            if (enablerFormData.stage_status === 'blocked') {
              stageStatusToSave = 'in_progress';
              approvalStatusToSave = 'pending';
            }

            await syncEnabler({
              enabler_id: enablerFormData.enabler_id,
              capability_id: capabilityDbId, // Use the database ID, not the string ID
              name: enablerFormData.name,
              description: enablerFormData.purpose || '',
              purpose: enablerFormData.purpose || '',
              owner: enablerFormData.owner || '',
              priority: enablerFormData.priority || 'medium',
              workspace_id: currentWorkspace.name, // Must use .name to match EntityStateContext queries
              file_path: editingFileEnabler?.path || `${currentWorkspace.projectFolder}/definition/${fileName}`,
              // INTENT State Model - saved to DATABASE only (with auto-reset if blocked)
              lifecycle_state: (enablerFormData.lifecycle_state || 'draft') as 'draft' | 'active' | 'implemented' | 'maintained' | 'retired',
              workflow_stage: (enablerFormData.workflow_stage || 'intent') as 'intent' | 'specification' | 'ui_design' | 'implementation' | 'control_loop',
              stage_status: stageStatusToSave as 'in_progress' | 'ready_for_approval' | 'approved' | 'blocked',
              approval_status: approvalStatusToSave as 'pending' | 'approved' | 'rejected',
            });
          }
        } catch (syncErr) {
          console.warn('Failed to sync enabler state to database:', syncErr);
          alert('Failed to save state to database. Please try again.');
          return; // Don't proceed if state save fails - state is critical
        }
      }

      setShowEnablerForm(false);
      setEditingEnabler(null);
      setEditingFileEnabler(null); // Clear editing state for file-based enablers
      setInlineRequirements([]); // Clear inline requirements
      // Reload file enablers to show the new/updated enabler
      loadFileEnablers();
    } catch (err) {
      console.error('Failed to save enabler:', err);
      alert(err instanceof Error ? err.message : 'Failed to save enabler');
    }
  };

  // Delete file-based enabler
  const handleDeleteFileEnabler = (enabler: FileEnabler) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Enabler',
      message: `Are you sure you want to delete "${enabler.name}"? This will delete the file ${enabler.filename} from the definition folder.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        closeConfirmDialog();
        try {
          const response = await fetch(`${INTEGRATION_URL}/delete-specification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              path: enabler.path,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to delete enabler');
          }

          // Reload file enablers
          loadFileEnablers();
        } catch (err) {
          console.error('Failed to delete enabler:', err);
          alert(err instanceof Error ? err.message : 'Failed to delete enabler');
        }
      },
    });
  };

  const handleDeleteEnabler = (id: number) => {
    const enabler = enablers.find(e => e.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Enabler',
      message: `Are you sure you want to delete "${enabler?.name || 'this enabler'}"?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        closeConfirmDialog();
        try {
          await deleteEnabler(id);
        } catch (err) {
          console.error('Failed to delete enabler:', err);
        }
      },
    });
  };

  // Requirement handlers
  const handleCreateRequirement = () => {
    if (!selectedEnabler) return;
    setEditingRequirement(null);
    setRequirementFormData({
      requirement_id: generateId('FR'),
      enabler_id: selectedEnabler.id,
      name: '',
      description: '',
      requirement_type: 'functional',
      priority: 'should_have',
      notes: '',
    });
    setShowRequirementForm(true);
  };

  const handleSaveRequirement = async () => {
    try {
      if (editingRequirement) {
        await updateRequirement(editingRequirement.id, requirementFormData);
      } else {
        await createRequirement(requirementFormData as CreateRequirementRequest);
      }
      setShowRequirementForm(false);
      setEditingRequirement(null);
    } catch (err) {
      console.error('Failed to save requirement:', err);
    }
  };

  const handleVerifyRequirement = async (req: EnablerRequirement) => {
    try {
      await verifyRequirement(req.id, {
        completed: !req.completed,
        notes: `Verification status changed on ${new Date().toLocaleString()}`,
      });
    } catch (err) {
      console.error('Failed to verify requirement:', err);
    }
  };

  // Acceptance Criteria handlers
  const handleCreateCriteria = () => {
    if (!selectedEnabler) return;
    setEditingCriteria(null);
    setCriteriaFormData({
      criteria_id: generateId('AC'),
      title: '',
      description: '',
      criteria_format: 'checklist',
      given_clause: '',
      when_clause: '',
      then_clause: '',
      metric_name: '',
      metric_target: '',
      priority: 'must',
    });
    setShowCriteriaForm(true);
  };

  const handleSaveCriteria = async () => {
    if (!selectedEnabler) return;
    try {
      if (editingCriteria) {
        await updateCriteria(editingCriteria.id, criteriaFormData);
      } else {
        await createCriteria('enabler', selectedEnabler.id, criteriaFormData);
      }
      setShowCriteriaForm(false);
      setEditingCriteria(null);
    } catch (err) {
      console.error('Failed to save criteria:', err);
    }
  };

  const handleVerifyCriteria = async (criteria: AcceptanceCriteria, status: 'passed' | 'failed' | 'blocked' | 'skipped') => {
    try {
      await verifyCriteria(criteria.id, {
        status,
        verification_notes: `Status changed to ${status} on ${new Date().toLocaleString()}`,
      });
    } catch (err) {
      console.error('Failed to verify criteria:', err);
    }
  };

  // Analyze capabilities to propose enablers
  const handleAnalyzeSpecifications = async () => {
    if (!currentWorkspace?.projectFolder) {
      alert('Please set a project folder for this workspace first.');
      return;
    }

    // Get API key
    const anthropicKey = localStorage.getItem('anthropic_api_key') || '';
    if (!anthropicKey) {
      alert('Please add your Anthropic API key in the Settings page.');
      return;
    }

    setIsAnalyzingCapabilities(true);
    setProposedEnablers([]);
    setAnalysisInfo(null);

    try {
      // Call backend to analyze capabilities and propose enablers
      const response = await fetch(`${INTEGRATION_URL}/analyze-capabilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          anthropic_key: anthropicKey,
          existingEnablers: fileEnablers.map(e => e.name),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to analyze capabilities');
      }

      const result = await response.json();

      // Check for message (no files found)
      if (result.message && (!result.suggestions || result.suggestions.length === 0)) {
        alert(result.message);
        return;
      }

      if (result.suggestions && result.suggestions.length > 0) {
        setProposedEnablers(result.suggestions);
        setShowProposedEnablers(true);

        // Store analysis info if available
        if (result.analysis) {
          setAnalysisInfo(result.analysis);
        }
      } else {
        alert('Analysis complete. No new enablers suggested - your capabilities may already be well covered by existing enablers.');
      }
    } catch (err) {
      console.error('Failed to analyze capabilities:', err);
      alert(`Failed to analyze: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzingCapabilities(false);
    }
  };

  // Accept a proposed enabler and save as markdown file
  const handleAcceptProposedEnabler = async (enabler: typeof proposedEnablers[0]) => {
    if (!currentWorkspace?.projectFolder) return;

    // Generate filename: ENB-NAME-(n).md
    const safeName = enabler.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const sequenceNum = fileEnablers.length + proposedEnablers.indexOf(enabler) + 1;
    const fileName = `ENB-${safeName}-${sequenceNum}.md`;

    // Generate markdown content following INTENT Enabler template
    let markdown = `# ${enabler.name}\n\n`;
    markdown += `## Metadata\n`;
    markdown += `- **Name**: ${enabler.name}\n`;
    markdown += `- **Type**: Enabler\n`;
    markdown += `- **Capability**: ${enabler.capabilityName}\n`;
    markdown += `- **Status**: Ready for Analysis\n`;
    markdown += `- **Approval**: Pending\n`;
    markdown += `- **Priority**: Medium\n`;
    markdown += `- **Analysis Review**: Required\n`;
    markdown += `- **Generated**: ${new Date().toLocaleString()}\n`;
    markdown += `- **Source**: Capability Analysis\n\n`;
    markdown += `## Technical Context\n\n`;
    markdown += `### Purpose\n`;
    markdown += `${enabler.purpose}\n\n`;
    markdown += `### Rationale\n`;
    markdown += `${enabler.rationale}\n\n`;
    markdown += `## Functional Requirements\n`;
    markdown += `| ID | Name | Requirement | Status | Priority | Approval |\n`;
    markdown += `|----|------|-------------|--------|----------|----------|\n`;
    if (enabler.requirements && enabler.requirements.length > 0) {
      enabler.requirements.forEach((req, idx) => {
        markdown += `| FR-${String(idx + 1).padStart(6, '0')} | Requirement ${idx + 1} | ${req} | Ready for Design | Medium | Pending |\n`;
      });
    } else {
      markdown += `| | _To be defined_ | | | | |\n`;
    }
    markdown += `\n`;
    markdown += `## Non-Functional Requirements\n`;
    markdown += `| ID | Name | Requirement | Type | Status | Priority | Approval |\n`;
    markdown += `|----|------|-------------|------|--------|----------|----------|\n`;
    markdown += `| | _To be defined_ | | | | | |\n\n`;
    markdown += `## Technical Specifications (Template)\n\n`;
    markdown += `### API Technical Specifications\n`;
    markdown += `| API Type | Operation | Endpoint | Description | Request | Response |\n`;
    markdown += `|----------|-----------|----------|-------------|---------|----------|\n`;
    markdown += `| | | | | | |\n\n`;
    markdown += `## Acceptance Scenarios (Gherkin)\n\n`;
    markdown += `\`\`\`gherkin\n`;
    markdown += `Feature: ${enabler.name}\n`;
    markdown += `  As a user\n`;
    markdown += `  I want to ${enabler.purpose.toLowerCase()}\n`;
    markdown += `  So that I can achieve the capability goals\n\n`;
    markdown += `  Scenario: Basic functionality\n`;
    markdown += `    Given the system is ready\n`;
    markdown += `    When the user performs the action\n`;
    markdown += `    Then the expected result should occur\n`;
    markdown += `\`\`\`\n`;

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
        // Remove from proposed enablers
        setProposedEnablers(prev => prev.filter(e => e.name !== enabler.name));
        // Refresh file enablers
        await loadFileEnablers();
        alert(`✅ Created definition/${fileName}`);
      } else {
        throw new Error('Failed to save enabler file');
      }
    } catch (err) {
      alert(`Failed to create enabler: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Accept all proposed enablers
  const handleAcceptAllProposedEnablers = async () => {
    for (const enabler of proposedEnablers) {
      await handleAcceptProposedEnabler(enabler);
    }
    setShowProposedEnablers(false);
  };

  // Delete specification handler
  const handleDeleteSpecification = (spec: EnablerSpecification) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Specification',
      message: `Are you sure you want to delete "${spec.name}"? This will delete the file ${spec.fileName} from the specifications folder.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        closeConfirmDialog();
        try {
          await deleteSpecification(spec.fileName);
        } catch (err) {
          console.error('Failed to delete specification:', err);
        }
      },
    });
  };

  // Edit specification handler
  const handleEditSpecification = (spec: EnablerSpecification) => {
    setEditingSpecification({ ...spec });
  };

  // Save edited specification
  const handleSaveSpecification = async () => {
    if (!editingSpecification) return;
    try {
      await updateSpecification(editingSpecification);
      setEditingSpecification(null);
    } catch (err) {
      console.error('Failed to save specification:', err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedSpecIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSpecIndex === null || draggedSpecIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSpecIndex === null || draggedSpecIndex === targetIndex) return;
    reorderSpecifications(draggedSpecIndex, targetIndex);
    setDraggedSpecIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedSpecIndex(null);
  };

  // Render specification detail modal
  const renderSpecificationDetail = () => {
    if (!selectedSpecification) return null;
    return (
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
      }}>
        <Card style={{ maxWidth: '900px', width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <h2 className="text-title1">{selectedSpecification.name}</h2>
              <p className="text-footnote text-secondary">{selectedSpecification.id}</p>
            </div>
            <button
              onClick={() => setSelectedSpecification(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: 'var(--color-secondaryLabel)' }}
            >
              x
            </button>
          </div>

          {/* Metadata */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: 'var(--color-tertiarySystemBackground)',
            borderRadius: '8px',
          }}>
            <div>
              <p className="text-caption2 text-tertiary">Capability</p>
              <p className="text-subheadline">{selectedSpecification.capabilityId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-caption2 text-tertiary">Status</p>
              <span style={{
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: `${getSpecificationStatusColor(selectedSpecification.status)}20`,
                color: getSpecificationStatusColor(selectedSpecification.status),
              }}>
                {selectedSpecification.status}
              </span>
            </div>
            <div>
              <p className="text-caption2 text-tertiary">Approval</p>
              <span style={{
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: `${getSpecificationApprovalColor(selectedSpecification.approval)}20`,
                color: getSpecificationApprovalColor(selectedSpecification.approval),
              }}>
                {selectedSpecification.approval}
              </span>
            </div>
            <div>
              <p className="text-caption2 text-tertiary">Priority</p>
              <p className="text-subheadline">{selectedSpecification.priority}</p>
            </div>
            <div>
              <p className="text-caption2 text-tertiary">Owner</p>
              <p className="text-subheadline">{selectedSpecification.owner || 'N/A'}</p>
            </div>
            <div>
              <p className="text-caption2 text-tertiary">File</p>
              <p className="text-subheadline">{selectedSpecification.fileName}</p>
            </div>
          </div>

          {/* Purpose */}
          {selectedSpecification.purpose && (
            <div style={{ marginBottom: '24px' }}>
              <h4 className="text-title3" style={{ marginBottom: '8px' }}>Purpose</h4>
              <p className="text-body">{selectedSpecification.purpose}</p>
            </div>
          )}

          {/* Functional Requirements */}
          {selectedSpecification.functionalRequirements.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 className="text-title3" style={{ marginBottom: '12px' }}>
                Functional Requirements ({selectedSpecification.functionalRequirements.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedSpecification.functionalRequirements.map((req, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    border: '1px solid var(--color-separator)',
                    borderRadius: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <span className="text-footnote text-secondary" style={{ marginRight: '8px' }}>{req.id}</span>
                        <span className="text-headline">{req.name}</span>
                      </div>
                      {req.status && (
                        <span style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          backgroundColor: `${getSpecificationStatusColor(req.status)}20`,
                          color: getSpecificationStatusColor(req.status),
                        }}>
                          {req.status}
                        </span>
                      )}
                    </div>
                    <p className="text-body text-secondary" style={{ marginTop: '4px' }}>{req.requirement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-Functional Requirements */}
          {selectedSpecification.nonFunctionalRequirements.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 className="text-title3" style={{ marginBottom: '12px' }}>
                Non-Functional Requirements ({selectedSpecification.nonFunctionalRequirements.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedSpecification.nonFunctionalRequirements.map((req, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    border: '1px solid var(--color-separator)',
                    borderRadius: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <span className="text-footnote text-secondary" style={{ marginRight: '8px' }}>{req.id}</span>
                        <span className="text-headline">{req.name}</span>
                        {req.type && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            backgroundColor: 'rgba(255, 149, 0, 0.1)',
                            color: 'var(--color-systemOrange)',
                          }}>
                            {req.type}
                          </span>
                        )}
                      </div>
                      {req.status && (
                        <span style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          backgroundColor: `${getSpecificationStatusColor(req.status)}20`,
                          color: getSpecificationStatusColor(req.status),
                        }}>
                          {req.status}
                        </span>
                      )}
                    </div>
                    <p className="text-body text-secondary" style={{ marginTop: '4px' }}>{req.requirement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button variant="secondary" onClick={() => setSelectedSpecification(null)}>Close</Button>
          </div>
        </Card>
      </div>
    );
  };

  // Render enabler form modal
  const renderEnablerForm = () => (
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
    }}>
      <Card style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
        <h2 className="text-title1" style={{ marginBottom: '24px' }}>
          {editingEnabler || editingFileEnabler ? 'Edit Enabler' : 'Create Enabler'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="text-subheadline">
              Enabler ID <span style={{ color: 'var(--color-systemGreen)', fontSize: '12px', fontWeight: 'normal' }}>(auto-generated)</span>
            </label>
            <input
              type="text"
              className="input"
              readOnly
              value={enablerFormData.enabler_id}
              onChange={(e) => setEnablerFormData({ ...enablerFormData, enabler_id: e.target.value })}
              style={{
                width: '100%',
                marginTop: '4px',
                backgroundColor: 'var(--color-tertiarySystemBackground)',
                color: 'var(--color-secondaryLabel)',
                cursor: 'default',
              }}
            />
          </div>

          <div>
            <label className="text-subheadline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Capability
              {isCapabilitySuggesting && (
                <span style={{ fontSize: '12px', color: 'var(--color-systemBlue)', fontWeight: 'normal' }}>
                  (AI analyzing...)
                </span>
              )}
              {capabilityNeedsConfirmation && !isCapabilitySuggesting && (
                <span style={{ fontSize: '12px', color: 'var(--color-systemGreen)', fontWeight: 'normal' }}>
                  (AI suggested)
                </span>
              )}
            </label>
            <select
              className="input"
              value={formCapabilityId || ''}
              onChange={(e) => {
                setFormCapabilityId(e.target.value || null);
                // If user manually changes, clear the confirmation requirement
                if (e.target.value !== suggestedCapabilityId) {
                  setCapabilityNeedsConfirmation(false);
                }
              }}
              disabled={loadingCapabilities || isCapabilitySuggesting}
              style={{
                width: '100%',
                marginTop: '4px',
                borderColor: capabilityNeedsConfirmation ? 'var(--color-systemRed)' : undefined,
                borderWidth: capabilityNeedsConfirmation ? '2px' : undefined,
                boxShadow: capabilityNeedsConfirmation ? '0 0 0 1px var(--color-systemRed)' : undefined,
              }}
            >
              <option value="">{loadingCapabilities ? 'Loading...' : isCapabilitySuggesting ? 'AI analyzing...' : 'Select Capability'}</option>
              {capabilities.map((cap) => (
                <option key={cap.filename} value={cap.capabilityId}>
                  {cap.capabilityId} - {cap.name}
                </option>
              ))}
            </select>
            {capabilityNeedsConfirmation && !isCapabilitySuggesting && (
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-systemRed)', fontStyle: 'italic' }}>
                  Please confirm AI suggestion
                </span>
                <button
                  type="button"
                  onClick={confirmCapabilitySuggestion}
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
          </div>

          <div>
            <label className="text-subheadline">Name *</label>
            <input
              type="text"
              className="input"
              value={enablerFormData.name}
              onChange={(e) => setEnablerFormData({ ...enablerFormData, name: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label className="text-subheadline">Purpose</label>
            <textarea
              className="input"
              rows={3}
              value={enablerFormData.purpose}
              onChange={(e) => setEnablerFormData({ ...enablerFormData, purpose: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label className="text-subheadline">Owner</label>
            <input
              type="text"
              className="input"
              value={enablerFormData.owner}
              onChange={(e) => setEnablerFormData({ ...enablerFormData, owner: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="text-subheadline">Priority</label>
              <select
                className="input"
                value={enablerFormData.priority}
                onChange={(e) => setEnablerFormData({ ...enablerFormData, priority: e.target.value as any })}
                style={{ width: '100%', marginTop: '4px' }}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

          </div>

          {/* Requirements Section */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-separator)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className="text-subheadline">Requirements ({inlineRequirements.length})</label>
              <Button variant="secondary" onClick={handleAddInlineRequirement} style={{ padding: '4px 12px', fontSize: '12px' }}>
                + Add Requirement
              </Button>
            </div>

            {inlineRequirements.length === 0 ? (
              <p className="text-footnote text-secondary" style={{ textAlign: 'center', padding: '16px' }}>
                No requirements added yet. Click "Add Requirement" to define functional or non-functional requirements.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {inlineRequirements.map((req, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      border: '1px solid var(--color-separator)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-tertiarySystemBackground)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <span className="text-footnote text-secondary">{req.id}</span>
                      <button
                        onClick={() => handleRemoveInlineRequirement(index)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-systemRed)', fontSize: '12px' }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label className="text-caption1">Type</label>
                        <select
                          className="input"
                          value={req.type}
                          onChange={(e) => handleUpdateInlineRequirement(index, 'type', e.target.value)}
                          style={{ width: '100%', marginTop: '2px', padding: '6px', fontSize: '12px' }}
                        >
                          <option value="functional">Functional (FR)</option>
                          <option value="non_functional">Non-Functional (NFR)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-caption1">Priority</label>
                        <select
                          className="input"
                          value={req.priority}
                          onChange={(e) => handleUpdateInlineRequirement(index, 'priority', e.target.value)}
                          style={{ width: '100%', marginTop: '2px', padding: '6px', fontSize: '12px' }}
                        >
                          <option value="must_have">Must Have</option>
                          <option value="should_have">Should Have</option>
                          <option value="could_have">Could Have</option>
                          <option value="wont_have">Won't Have</option>
                        </select>
                      </div>
                    </div>

                    {req.type === 'non_functional' && (
                      <div style={{ marginBottom: '8px' }}>
                        <label className="text-caption1">NFR Category</label>
                        <select
                          className="input"
                          value={req.nfrCategory || ''}
                          onChange={(e) => handleUpdateInlineRequirement(index, 'nfrCategory', e.target.value)}
                          style={{ width: '100%', marginTop: '2px', padding: '6px', fontSize: '12px' }}
                        >
                          <option value="">Select Category</option>
                          <option value="Performance">Performance</option>
                          <option value="Security">Security</option>
                          <option value="Usability">Usability</option>
                          <option value="Scalability">Scalability</option>
                          <option value="Reliability">Reliability</option>
                          <option value="Maintainability">Maintainability</option>
                          <option value="Compatibility">Compatibility</option>
                        </select>
                      </div>
                    )}

                    <div style={{ marginBottom: '8px' }}>
                      <label className="text-caption1">Name *</label>
                      <input
                        type="text"
                        className="input"
                        value={req.name}
                        onChange={(e) => handleUpdateInlineRequirement(index, 'name', e.target.value)}
                        placeholder="Requirement name"
                        style={{ width: '100%', marginTop: '2px', padding: '6px', fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <label className="text-caption1">Description *</label>
                      <textarea
                        className="input"
                        value={req.description}
                        onChange={(e) => handleUpdateInlineRequirement(index, 'description', e.target.value)}
                        placeholder="Describe the requirement..."
                        rows={2}
                        style={{ width: '100%', marginTop: '2px', padding: '6px', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <label className="text-caption1">Status</label>
                      <select
                        className="input"
                        value={req.status}
                        onChange={(e) => handleUpdateInlineRequirement(index, 'status', e.target.value)}
                        style={{ width: '100%', marginTop: '2px', padding: '6px', fontSize: '12px' }}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Ready for Design">Ready for Design</option>
                        <option value="Ready for Implementation">Ready for Implementation</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* INTENT State - Read Only (change via Phase Approval page) */}
        <ReadOnlyStateFields
          lifecycleState={enablerFormData.lifecycle_state || 'draft'}
          workflowStage={enablerFormData.workflow_stage || 'intent'}
          stageStatus={enablerFormData.stage_status || 'in_progress'}
          approvalStatus={enablerFormData.approval_status || 'pending'}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
          <Button variant="secondary" onClick={() => {
            setShowEnablerForm(false);
            setEditingFileEnabler(null);
            // Reset AI suggestion state
            setSuggestedCapabilityId(null);
            setCapabilityNeedsConfirmation(false);
            setIsCapabilitySuggesting(false);
          }}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveEnabler} disabled={!enablerFormData.name || !formCapabilityId}>
            {editingFileEnabler ? 'Update Enabler' : 'Save Enabler'}
          </Button>
        </div>
      </Card>
    </div>
  );

  // Render requirement form modal
  const renderRequirementForm = () => (
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
    }}>
      <Card style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
        <h2 className="text-title1" style={{ marginBottom: '24px' }}>
          {editingRequirement ? 'Edit Requirement' : 'Create Requirement'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="text-subheadline">Requirement ID</label>
            <input
              type="text"
              className="input"
              value={requirementFormData.requirement_id}
              onChange={(e) => setRequirementFormData({ ...requirementFormData, requirement_id: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label className="text-subheadline">Type</label>
            <select
              className="input"
              value={requirementFormData.requirement_type}
              onChange={(e) => {
                const type = e.target.value as RequirementType;
                setRequirementFormData({
                  ...requirementFormData,
                  requirement_type: type,
                  requirement_id: type === 'functional' ? generateId('FR') : generateId('NFR'),
                });
              }}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <option value="functional">Functional</option>
              <option value="non_functional">Non-Functional</option>
            </select>
          </div>

          <div>
            <label className="text-subheadline">Name *</label>
            <input
              type="text"
              className="input"
              value={requirementFormData.name}
              onChange={(e) => setRequirementFormData({ ...requirementFormData, name: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label className="text-subheadline">Description *</label>
            <textarea
              className="input"
              rows={3}
              value={requirementFormData.description}
              onChange={(e) => setRequirementFormData({ ...requirementFormData, description: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label className="text-subheadline">Priority (MoSCoW)</label>
            <select
              className="input"
              value={requirementFormData.priority}
              onChange={(e) => setRequirementFormData({ ...requirementFormData, priority: e.target.value as RequirementPriority })}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <option value="must_have">Must Have</option>
              <option value="should_have">Should Have</option>
              <option value="could_have">Could Have</option>
              <option value="wont_have">Won't Have</option>
            </select>
          </div>

          <div>
            <label className="text-subheadline">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={requirementFormData.notes}
              onChange={(e) => setRequirementFormData({ ...requirementFormData, notes: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button variant="secondary" onClick={() => setShowRequirementForm(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveRequirement}>Save</Button>
        </div>
      </Card>
    </div>
  );

  // Render acceptance criteria form modal
  const renderCriteriaForm = () => (
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
    }}>
      <Card style={{ maxWidth: '700px', width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
        <h2 className="text-title1" style={{ marginBottom: '24px' }}>
          {editingCriteria ? 'Edit Acceptance Criteria' : 'Add Acceptance Criteria'}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="text-subheadline">Criteria ID</label>
            <input
              type="text"
              className="input"
              value={criteriaFormData.criteria_id}
              onChange={(e) => setCriteriaFormData({ ...criteriaFormData, criteria_id: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label className="text-subheadline">Format</label>
            <select
              className="input"
              value={criteriaFormData.criteria_format}
              onChange={(e) => setCriteriaFormData({ ...criteriaFormData, criteria_format: e.target.value as CriteriaFormat })}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <option value="checklist">Checklist</option>
              <option value="given_when_then">Given/When/Then (BDD)</option>
              <option value="metric">Metric</option>
            </select>
          </div>

          <div>
            <label className="text-subheadline">Title *</label>
            <input
              type="text"
              className="input"
              value={criteriaFormData.title}
              onChange={(e) => setCriteriaFormData({ ...criteriaFormData, title: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label className="text-subheadline">Description *</label>
            <textarea
              className="input"
              rows={2}
              value={criteriaFormData.description}
              onChange={(e) => setCriteriaFormData({ ...criteriaFormData, description: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          {criteriaFormData.criteria_format === 'given_when_then' && (
            <>
              <div>
                <label className="text-subheadline">Given (Preconditions)</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Given the user is logged in and has admin privileges..."
                  value={criteriaFormData.given_clause}
                  onChange={(e) => setCriteriaFormData({ ...criteriaFormData, given_clause: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
              <div>
                <label className="text-subheadline">When (Action)</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="When the user clicks the submit button..."
                  value={criteriaFormData.when_clause}
                  onChange={(e) => setCriteriaFormData({ ...criteriaFormData, when_clause: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
              <div>
                <label className="text-subheadline">Then (Expected Result)</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Then the form should be submitted and a success message displayed..."
                  value={criteriaFormData.then_clause}
                  onChange={(e) => setCriteriaFormData({ ...criteriaFormData, then_clause: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </>
          )}

          {criteriaFormData.criteria_format === 'metric' && (
            <>
              <div>
                <label className="text-subheadline">Metric Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Response Time, Uptime, Error Rate"
                  value={criteriaFormData.metric_name}
                  onChange={(e) => setCriteriaFormData({ ...criteriaFormData, metric_name: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
              <div>
                <label className="text-subheadline">Target Value</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., < 200ms, > 99.9%, < 0.1%"
                  value={criteriaFormData.metric_target}
                  onChange={(e) => setCriteriaFormData({ ...criteriaFormData, metric_target: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-subheadline">Priority</label>
            <select
              className="input"
              value={criteriaFormData.priority}
              onChange={(e) => setCriteriaFormData({ ...criteriaFormData, priority: e.target.value as CriteriaPriority })}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <option value="must">Must</option>
              <option value="should">Should</option>
              <option value="could">Could</option>
              <option value="wont">Won't</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button variant="secondary" onClick={() => setShowCriteriaForm(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveCriteria}>Save</Button>
        </div>
      </Card>
    </div>
  );

  // Render edit specification modal
  const renderEditSpecificationModal = () => {
    if (!editingSpecification) return null;
    return (
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
      }}>
        <Card style={{ maxWidth: '700px', width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
            <h2 className="text-title1">Edit Specification</h2>
            <button
              onClick={() => setEditingSpecification(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: 'var(--color-secondaryLabel)' }}
            >
              x
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="text-subheadline">ID</label>
              <input
                type="text"
                className="input"
                value={editingSpecification.id}
                disabled
                style={{ width: '100%', marginTop: '4px', backgroundColor: 'var(--color-tertiarySystemBackground)' }}
              />
            </div>

            <div>
              <label className="text-subheadline">Name *</label>
              <input
                type="text"
                className="input"
                value={editingSpecification.name}
                onChange={(e) => setEditingSpecification({ ...editingSpecification, name: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label className="text-subheadline">Capability ID</label>
              <input
                type="text"
                className="input"
                value={editingSpecification.capabilityId}
                onChange={(e) => setEditingSpecification({ ...editingSpecification, capabilityId: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label className="text-subheadline">Purpose</label>
              <textarea
                className="input"
                rows={3}
                value={editingSpecification.purpose}
                onChange={(e) => setEditingSpecification({ ...editingSpecification, purpose: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="text-subheadline">Lifecycle State</label>
                <select
                  className="input"
                  value={editingSpecification.lifecycle_state || 'draft'}
                  onChange={(e) => setEditingSpecification({ ...editingSpecification, lifecycle_state: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="implemented">Implemented</option>
                  <option value="maintained">Maintained</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              <div>
                <label className="text-subheadline">Workflow Stage</label>
                <select
                  className="input"
                  value={editingSpecification.workflow_stage || 'intent'}
                  onChange={(e) => setEditingSpecification({ ...editingSpecification, workflow_stage: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <option value="intent">Intent</option>
                  <option value="specification">Specification</option>
                  <option value="ui_design">UI-Design</option>
                  <option value="implementation">Implementation</option>
                  <option value="control_loop">Control-Loop</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="text-subheadline">Stage Status</label>
                <select
                  className="input"
                  value={editingSpecification.stage_status || 'in_progress'}
                  onChange={(e) => setEditingSpecification({ ...editingSpecification, stage_status: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <option value="in_progress">In Progress</option>
                  <option value="ready_for_approval">Ready for Approval</option>
                  <option value="approved">Approved</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div>
                <label className="text-subheadline">Approval Status</label>
                <select
                  className="input"
                  value={editingSpecification.approval_status || 'pending'}
                  onChange={(e) => {
                    const newApprovalStatus = e.target.value;
                    // Auto-set stage_status based on approval status
                    let newStageStatus = editingSpecification.stage_status;
                    if (newApprovalStatus === 'approved') {
                      newStageStatus = 'approved';
                    } else if (newApprovalStatus === 'rejected') {
                      newStageStatus = 'blocked';
                    }
                    setEditingSpecification({ ...editingSpecification, approval_status: newApprovalStatus, stage_status: newStageStatus });
                  }}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="text-subheadline">Priority</label>
                <select
                  className="input"
                  value={editingSpecification.priority}
                  onChange={(e) => setEditingSpecification({ ...editingSpecification, priority: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-subheadline">Owner</label>
                <input
                  type="text"
                  className="input"
                  value={editingSpecification.owner}
                  onChange={(e) => setEditingSpecification({ ...editingSpecification, owner: e.target.value })}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </div>

            {/* Requirements Summary */}
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--color-tertiarySystemBackground)',
              borderRadius: '8px',
            }}>
              <p className="text-subheadline" style={{ marginBottom: '8px' }}>Requirements</p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span className="text-footnote">
                  <strong>Functional:</strong> {editingSpecification.functionalRequirements.length}
                </span>
                <span className="text-footnote">
                  <strong>Non-Functional:</strong> {editingSpecification.nonFunctionalRequirements.length}
                </span>
              </div>
              <p className="text-caption2 text-tertiary" style={{ marginTop: '8px' }}>
                Note: To edit individual requirements, please modify the specification file directly.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button variant="secondary" onClick={() => setEditingSpecification(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveSpecification}>Save Changes</Button>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <PageLayout
      title="Enabler Management"
      quickDescription="Manage enablers, requirements, and acceptance criteria for your capabilities."
      detailedDescription="In INTENT, enablers are technical implementations that realize capabilities through specific functionality.
Each enabler contains functional and non-functional requirements with testable acceptance criteria.
Enablers bridge the gap between high-level business capabilities and actual code implementation, providing clear specifications for AI-assisted development."
      actions={
        <Button
          variant="secondary"
          onClick={handleAnalyzeSpecifications}
          disabled={isAnalyzingCapabilities}
        >
          {isAnalyzingCapabilities ? 'Analyzing...' : 'Analyze'}
        </Button>
      }
    >

      {error && (
        <Alert type="error" style={{ marginBottom: '16px' }}>
          <strong>Error:</strong> {error}
          <button onClick={clearError} style={{ marginLeft: '12px', color: 'var(--color-systemBlue)' }}>
            Dismiss
          </button>
        </Alert>
      )}

      {analyzeError && (
        <Alert type="error" style={{ marginBottom: '16px' }}>
          <strong>Analyze Error:</strong> {analyzeError}
          <button onClick={clearAnalyzeError} style={{ marginLeft: '12px', color: 'var(--color-systemBlue)' }}>
            Dismiss
          </button>
        </Alert>
      )}

      {/* Proposed Enablers Section */}
      {showProposedEnablers && proposedEnablers.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <Card style={{ borderLeft: '4px solid var(--color-systemGreen)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <div>
                <h2 className="text-title1" style={{ marginBottom: '8px' }}>Proposed Enablers</h2>
                <p className="text-body text-secondary">
                  Based on analysis of your capability documents
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" onClick={handleAcceptAllProposedEnablers}>
                  Accept All ({proposedEnablers.length})
                </Button>
                <Button variant="secondary" onClick={() => setShowProposedEnablers(false)}>
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
                backgroundColor: 'rgba(76, 217, 100, 0.08)',
                border: '1px solid rgba(76, 217, 100, 0.2)',
              }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {analysisInfo.totalCapabilities && (
                    <span className="text-footnote">
                      <strong>Capabilities Analyzed:</strong> {analysisInfo.totalCapabilities}
                    </span>
                  )}
                  {analysisInfo.analyzedCapabilities && analysisInfo.analyzedCapabilities.length > 0 && (
                    <span className="text-footnote">
                      <strong>From:</strong> {analysisInfo.analyzedCapabilities.join(', ')}
                    </span>
                  )}
                </div>
                {analysisInfo.coverageNotes && (
                  <p className="text-footnote text-secondary">{analysisInfo.coverageNotes}</p>
                )}
              </div>
            )}

            {/* Proposed Enabler Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '16px',
            }}>
              {proposedEnablers.map((enabler, index) => (
                <Card key={index} style={{
                  border: '1px solid var(--color-separator)',
                  backgroundColor: 'var(--color-secondarySystemBackground)',
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h3 className="text-headline">{enabler.name}</h3>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        backgroundColor: 'rgba(76, 217, 100, 0.1)',
                        color: 'var(--color-systemGreen)',
                      }}>
                        Enabler
                      </span>
                    </div>
                    <p className="text-footnote text-secondary" style={{ marginBottom: '8px' }}>
                      <strong>For Capability:</strong> {enabler.capabilityName}
                    </p>
                    <p className="text-subheadline" style={{ marginBottom: '8px' }}>{enabler.purpose}</p>
                    <p className="text-footnote text-secondary">{enabler.rationale}</p>
                    {enabler.requirements && enabler.requirements.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <p className="text-footnote" style={{ fontWeight: 500, marginBottom: '4px' }}>Suggested Requirements:</p>
                        <ul style={{ margin: 0, paddingLeft: '16px' }}>
                          {enabler.requirements.slice(0, 3).map((req, idx) => (
                            <li key={idx} className="text-footnote text-secondary">{req}</li>
                          ))}
                          {enabler.requirements.length > 3 && (
                            <li className="text-footnote text-secondary">...and {enabler.requirements.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleAcceptProposedEnabler(enabler)}
                    style={{ width: '100%' }}
                  >
                    Accept & Create
                  </Button>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Specification Files from ./specifications folder */}
      {specifications.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 className="text-title2" style={{ marginBottom: '4px' }}>
                Specification Files ({specifications.length})
              </h3>
              <p className="text-footnote text-secondary">
                Enabler specifications from ./specifications folder (ENB-*.md files)
              </p>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '12px',
          }}>
            {specifications.map((spec, index) => (
              <div
                key={spec.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  cursor: 'grab',
                  padding: '16px',
                  border: draggedSpecIndex === index
                    ? '2px dashed var(--color-systemBlue)'
                    : '1px solid var(--color-separator)',
                  borderRadius: '12px',
                  backgroundColor: draggedSpecIndex === index
                    ? 'var(--color-tertiarySystemBackground)'
                    : 'var(--color-secondarySystemBackground)',
                  transition: 'box-shadow 0.2s, transform 0.2s, border 0.2s',
                  opacity: draggedSpecIndex === index ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (draggedSpecIndex === null) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => setSelectedSpecification(spec)}
                  >
                    <h4 className="text-headline" style={{ marginBottom: '4px' }}>{spec.name}</h4>
                    <p className="text-caption2 text-tertiary">{spec.id}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditSpecification(spec); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-systemBlue)',
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-tertiarySystemBackground)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSpecification(spec); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-systemRed)',
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedSpecification(spec)}
                >
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      backgroundColor: `${getSpecificationStatusColor(spec.status)}20`,
                      color: getSpecificationStatusColor(spec.status),
                    }}>
                      {spec.status}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      backgroundColor: `${getSpecificationApprovalColor(spec.approval)}20`,
                      color: getSpecificationApprovalColor(spec.approval),
                    }}>
                      {spec.approval}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-tertiarySystemBackground)',
                      color: 'var(--color-tertiaryLabel)',
                    }}>
                      {spec.priority}
                    </span>
                  </div>

                  {spec.purpose && (
                    <p className="text-caption1 text-secondary" style={{
                      marginBottom: '8px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {spec.purpose}
                    </p>
                  )}

                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--color-separator)',
                    fontSize: '11px',
                  }}>
                    <span className="text-tertiary">
                      <strong>Cap:</strong> {spec.capabilityId || 'N/A'}
                    </span>
                    <span className="text-tertiary">
                      <strong>FR:</strong> {spec.functionalRequirements.length}
                    </span>
                    <span className="text-tertiary">
                      <strong>NFR:</strong> {spec.nonFunctionalRequirements.length}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Capability Selection */}
      <Card style={{ marginBottom: '24px' }}>
        <h3 className="text-title2" style={{ marginBottom: '16px' }}>Select Capability</h3>
        {!currentWorkspace?.projectFolder ? (
          <p className="text-body text-secondary">
            Please set a project folder for this workspace to load capabilities.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              className="input"
              value={selectedCapabilityId || ''}
              onChange={(e) => {
                clearSelection();
                setSelectedCapabilityId(e.target.value || null);
              }}
              disabled={loadingCapabilities}
              style={{ flex: 1, padding: '10px 16px' }}
            >
              <option value="">
                {loadingCapabilities ? 'Loading capabilities...' : '-- Select a Capability --'}
              </option>
              {capabilities.map((cap) => (
                <option key={cap.filename} value={cap.capabilityId}>
                  {cap.capabilityId} - {cap.name}
                </option>
              ))}
            </select>
            {selectedCapabilityId && (
              <Button variant="primary" onClick={handleCreateEnabler}>
                + Add Enabler
              </Button>
            )}
          </div>
        )}
        {!loadingCapabilities && capabilities.length === 0 && currentWorkspace?.projectFolder && (
          <p className="text-footnote text-secondary" style={{ marginTop: '8px' }}>
            No capabilities found. Create CAP-*.md files in the definition folder.
          </p>
        )}
      </Card>

      {/* Enablers List - Always show, filter by capability if selected */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedEnabler ? '350px 1fr' : '1fr', gap: '24px' }}>
        {/* File-based Enablers Column */}
        <div>
          {(() => {
            // Helper function to extract CAP-XXXXXX pattern from capability ID
            const normalizeCapabilityId = (capId: string | undefined): string => {
              if (!capId) return '';
              // Look for CAP-XXXXXX pattern anywhere in the string
              const match = capId.match(/CAP-\d+/i);
              return match ? match[0].toUpperCase() : capId.trim().toUpperCase();
            };

            // Filter file enablers by selected capability, or show all if none selected
            // Use normalized comparison to handle different capability ID formats
            const normalizedSelectedCapId = normalizeCapabilityId(selectedCapabilityId || undefined);
            const filteredEnablers = selectedCapabilityId
              ? fileEnablers.filter(e => normalizeCapabilityId(e.capabilityId) === normalizedSelectedCapId)
              : fileEnablers;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="text-title2">
                    {selectedCapabilityId ? (
                      <>
                        Enablers ({filteredEnablers.length})
                        <span className="text-footnote text-secondary" style={{ fontWeight: 'normal', marginLeft: '8px' }}>
                          for {capabilities.find(c => c.capabilityId === selectedCapabilityId)?.name || selectedCapabilityId}
                        </span>
                      </>
                    ) : (
                      <>All Enablers ({fileEnablers.length})</>
                    )}
                  </h3>
                  {filteredEnablers.length > 0 && (
                    <button
                      onClick={() => isSelectMode ? exitSelectMode() : setIsSelectMode(true)}
                      style={{
                        background: isSelectMode ? 'var(--color-systemBlue)' : 'none',
                        border: isSelectMode ? 'none' : '1px solid var(--color-separator)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        color: isSelectMode ? 'white' : 'var(--color-systemBlue)',
                        cursor: 'pointer',
                      }}
                    >
                      {isSelectMode ? 'Done' : 'Select'}
                    </button>
                  )}
                </div>

                {/* Selection Action Bar */}
                {isSelectMode && selectedEnablerIds.size > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    marginBottom: '16px',
                    backgroundColor: 'var(--color-systemBlue)10',
                    borderRadius: '8px',
                    border: '1px solid var(--color-systemBlue)40',
                  }}>
                    <span className="text-subheadline" style={{ color: 'var(--color-systemBlue)' }}>
                      {selectedEnablerIds.size} selected
                    </span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkStatusChange(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-separator)',
                        backgroundColor: 'var(--color-secondarySystemBackground)',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Change Status...</option>
                      <option value="In Draft">In Draft</option>
                      <option value="Ready for Analysis">Ready for Analysis</option>
                      <option value="In Analysis">In Analysis</option>
                      <option value="Ready for Design">Ready for Design</option>
                      <option value="In Design">In Design</option>
                      <option value="Ready for Implementation">Ready for Implementation</option>
                      <option value="In Implementation">In Implementation</option>
                      <option value="Implemented">Implemented</option>
                      <option value="Ready for Refactor">Ready for Refactor</option>
                      <option value="Ready for Retirement">Ready for Retirement</option>
                    </select>
                    <button
                      onClick={() => setSelectedEnablerIds(new Set())}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-secondaryLabel)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
                {loadingFileEnablers ? (
                  <p className="text-body text-secondary">Loading enablers...</p>
                ) : filteredEnablers.length === 0 ? (
                  <Card>
                    <p className="text-body text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                      {selectedCapabilityId
                        ? 'No enablers found for this capability. Create your first enabler to get started.'
                        : 'No enablers found. Select a capability and create your first enabler to get started.'}
                    </p>
                  </Card>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      {filteredEnablers.map((enabler) => {
                        const isSelected = selectedEnablerIds.has(enabler.enablerId);
                        return (
                        <Card
                          key={enabler.enablerId}
                          onClick={() => {
                            if (isSelectMode) {
                              toggleEnablerSelection(enabler.enablerId);
                            } else {
                              handleEditFileEnabler(enabler);
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--color-systemBlue)' : undefined,
                            backgroundColor: isSelected ? 'var(--color-systemBlue)08' : undefined,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                              <h4 className="text-headline" style={{ marginBottom: '8px' }}>{enabler.name}</h4>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '12px',
                                  backgroundColor: 'var(--color-systemGreen)20',
                                  color: 'var(--color-systemGreen)',
                                }}>
                                  {enabler.status || 'Planned'}
                                </span>
                                <span style={{
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '12px',
                                  backgroundColor: 'var(--color-tertiarySystemBackground)',
                                  color: 'var(--color-secondaryLabel)',
                                }}>
                                  {(enabler.priority || 'medium').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-footnote text-secondary">{enabler.enablerId}</p>
                              {enabler.purpose && (
                                <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
                                  {enabler.purpose.length > 100 ? enabler.purpose.substring(0, 100) + '...' : enabler.purpose}
                                </p>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditFileEnabler(enabler); }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--color-systemBlue)',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFileEnabler(enabler); }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--color-systemRed)',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Enabler Details Column */}
          {selectedEnabler && (
            <div>
              <Card style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <h3 className="text-title2">{selectedEnabler.name}</h3>
                    <p className="text-footnote text-secondary">{selectedEnabler.enabler_id}</p>
                  </div>
                  <button
                    onClick={clearSelection}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--color-secondaryLabel)' }}
                  >
                    x
                  </button>
                </div>

                {selectedEnabler.purpose && (
                  <div style={{ marginBottom: '16px' }}>
                    <p className="text-subheadline" style={{ marginBottom: '4px' }}>Purpose</p>
                    <p className="text-body">{selectedEnabler.purpose}</p>
                  </div>
                )}

                {/* Criteria Summary */}
                {criteriaSummary && criteriaSummary.total_count > 0 && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--color-tertiarySystemBackground)',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <p className="text-subheadline" style={{ marginBottom: '8px' }}>Acceptance Criteria Progress</p>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: `conic-gradient(var(--color-systemGreen) ${criteriaSummary.percentage}%, var(--color-systemGray3) 0)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-systemBackground)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 'bold',
                        }}>
                          {Math.round(criteriaSummary.percentage)}%
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <span className="text-footnote">Passed: {criteriaSummary.passed_count}</span>
                        <span className="text-footnote">Failed: {criteriaSummary.failed_count}</span>
                        <span className="text-footnote">Pending: {criteriaSummary.pending_count}</span>
                        <span className="text-footnote">Blocked: {criteriaSummary.blocked_count}</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Requirements Section */}
              <Card style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 className="text-title3">Requirements ({requirements.length})</h4>
                  <Button variant="primary" onClick={handleCreateRequirement}>+ Add Requirement</Button>
                </div>

                {requirements.length === 0 ? (
                  <p className="text-body text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                    No requirements defined yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {requirements.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-separator)',
                          backgroundColor: req.completed ? 'rgba(52, 199, 89, 0.05)' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <input
                                type="checkbox"
                                checked={req.completed}
                                onChange={() => handleVerifyRequirement(req)}
                                style={{ width: '18px', height: '18px' }}
                              />
                              <h5 className="text-headline" style={{
                                textDecoration: req.completed ? 'line-through' : 'none',
                                color: req.completed ? 'var(--color-secondaryLabel)' : undefined,
                              }}>
                                {req.name}
                              </h5>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                              <span style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                backgroundColor: req.requirement_type === 'functional' ? 'rgba(0, 122, 255, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                                color: req.requirement_type === 'functional' ? 'var(--color-systemBlue)' : 'var(--color-systemOrange)',
                              }}>
                                {getRequirementTypeDisplayName(req.requirement_type)}
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                backgroundColor: `${getRequirementPriorityColor(req.priority)}15`,
                                color: getRequirementPriorityColor(req.priority),
                              }}>
                                {getRequirementPriorityDisplayName(req.priority)}
                              </span>
                            </div>
                            <p className="text-footnote text-secondary">{req.description}</p>
                            <p className="text-caption2 text-tertiary" style={{ marginTop: '4px' }}>{req.requirement_id}</p>
                          </div>
                          <button
                            onClick={() => deleteRequirement(req.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-systemRed)', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Acceptance Criteria Section */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 className="text-title3">Acceptance Criteria ({acceptanceCriteria.length})</h4>
                  <Button variant="primary" onClick={handleCreateCriteria}>+ Add Criteria</Button>
                </div>

                {acceptanceCriteria.length === 0 ? (
                  <p className="text-body text-secondary" style={{ textAlign: 'center', padding: '20px' }}>
                    No acceptance criteria defined yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {acceptanceCriteria.map((criteria) => (
                      <div
                        key={criteria.id}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-separator)',
                          backgroundColor: criteria.status === 'passed' ? 'rgba(52, 199, 89, 0.05)' :
                                          criteria.status === 'failed' ? 'rgba(255, 59, 48, 0.05)' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <h5 className="text-headline">{criteria.title}</h5>
                              <span style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                backgroundColor: `${getCriteriaStatusColor(criteria.status)}20`,
                                color: getCriteriaStatusColor(criteria.status),
                              }}>
                                {getCriteriaStatusDisplayName(criteria.status)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                              <span style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                backgroundColor: 'var(--color-tertiarySystemBackground)',
                                color: 'var(--color-secondaryLabel)',
                              }}>
                                {getCriteriaFormatDisplayName(criteria.criteria_format)}
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                backgroundColor: 'var(--color-tertiarySystemBackground)',
                                color: 'var(--color-secondaryLabel)',
                              }}>
                                {getCriteriaPriorityDisplayName(criteria.priority)}
                              </span>
                            </div>
                            <p className="text-footnote text-secondary">{criteria.description}</p>

                            {/* Show format-specific fields */}
                            {criteria.criteria_format === 'given_when_then' && (
                              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                {criteria.given_clause && <p><strong>Given:</strong> {criteria.given_clause}</p>}
                                {criteria.when_clause && <p><strong>When:</strong> {criteria.when_clause}</p>}
                                {criteria.then_clause && <p><strong>Then:</strong> {criteria.then_clause}</p>}
                              </div>
                            )}

                            {criteria.criteria_format === 'metric' && (
                              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                {criteria.metric_name && <p><strong>Metric:</strong> {criteria.metric_name}</p>}
                                {criteria.metric_target && <p><strong>Target:</strong> {criteria.metric_target}</p>}
                                {criteria.metric_actual && <p><strong>Actual:</strong> {criteria.metric_actual}</p>}
                              </div>
                            )}

                            <p className="text-caption2 text-tertiary" style={{ marginTop: '4px' }}>{criteria.criteria_id}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {criteria.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleVerifyCriteria(criteria, 'passed')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-systemGreen)', fontSize: '11px' }}
                                >
                                  Pass
                                </button>
                                <button
                                  onClick={() => handleVerifyCriteria(criteria, 'failed')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-systemRed)', fontSize: '11px' }}
                                >
                                  Fail
                                </button>
                              </>
                            )}
                            {criteria.status !== 'pending' && (
                              <button
                                onClick={() => updateCriteria(criteria.id, { status: 'pending' })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-systemOrange)', fontSize: '11px' }}
                              >
                                Reset
                              </button>
                            )}
                            <button
                              onClick={() => deleteCriteria(criteria.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-systemRed)', fontSize: '11px' }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

      {/* Modals */}
      {showEnablerForm && renderEnablerForm()}
      {showRequirementForm && renderRequirementForm()}
      {showCriteriaForm && renderCriteriaForm()}
      {selectedSpecification && renderSpecificationDetail()}
      {editingSpecification && renderEditSpecificationModal()}

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
