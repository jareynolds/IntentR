import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from './WorkspaceContext';

// Types
export type WizardFlowType = 'new' | 'refactor' | 'enhance' | 'reverse-engineer';

export type WizardStepStatus = 'completed' | 'active' | 'upcoming';

export interface WizardSubpage {
  id: string;
  name: string;
}

export interface WizardStep {
  id: string;
  name: string;
  path: string;
  startPath: string;
  description: string;
  subpages?: WizardSubpage[];
}

// Subpages for each section
export const SECTION_SUBPAGES: Record<string, WizardSubpage[]> = {
  workspace: [
    { id: 'overview', name: 'Section Overview' },
  ],
  intent: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'vision', name: 'Product Vision' },
    { id: 'ideation', name: 'Ideation' },
    { id: 'storyboard', name: 'Storyboard' },
  ],
  specification: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'capabilities', name: 'Capabilities' },
    { id: 'enablers', name: 'Enablers' },
    { id: 'story-map', name: 'Dependencies' },
  ],
  design: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'system', name: 'System Architecture' },
    { id: 'designs', name: 'UI Assets' },
    { id: 'ui-framework', name: 'UI Framework' },
    { id: 'ui-styles', name: 'UI Styles' },
    { id: 'ui-designer', name: 'UI Designer' },
  ],
  'control-loop': [
    { id: 'overview', name: 'Section Overview' },
    { id: 'testing', name: 'Test Scenarios' },
    { id: 'control-loop-approval', name: 'Phase Approval' },
  ],
  implementation: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'ai-principles', name: 'AI Principles' },
    { id: 'code', name: 'Code' },
    { id: 'run', name: 'Run' },
  ],
  discovery: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'discovery', name: 'Discovery Analysis' },
  ],
};

interface WizardContextType {
  // State
  isWizardMode: boolean;
  flowType: WizardFlowType | null;
  currentStepIndex: number;
  currentSubpageIndex: number;
  steps: WizardStep[];
  completedSteps: Set<number>;

  // Configuration (for sidebar synchronization)
  customFlows: Record<WizardFlowType, string[]>;
  customSubpages: Record<string, string[]>;

  // Computed
  currentStep: WizardStep | null;
  currentSubpage: WizardSubpage | null;
  currentSubpages: WizardSubpage[];
  isFirstStep: boolean;
  isLastStep: boolean;
  isFirstSubpage: boolean;
  isLastSubpage: boolean;
  progress: number;

  // Actions
  setWizardMode: (enabled: boolean) => void;
  setFlowType: (type: WizardFlowType) => void;
  nextStep: () => void;
  nextSubpage: () => void;
  previousStep: () => void;
  previousSubpage: () => void;
  goToStep: (index: number) => void;
  goToSubpage: (index: number) => void;
  jumpToNextSection: () => void;
  completeCurrentStep: () => void;
  exitWizard: () => void;
  resetWizard: () => void;
  getStepStatus: (index: number) => WizardStepStatus;
  saveFlowsToWorkspace: (flows: Record<WizardFlowType, string[]>, subpages: Record<string, string[]>) => Promise<void>;
}

// Step definitions with icons for sidebar display
export interface StepDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const STEP_DEFINITIONS: Record<string, StepDefinition> = {
  workspace: {
    id: 'workspace',
    name: 'Workspace',
    description: 'Select your project type and workspace',
    icon: '◰',
  },
  intent: {
    id: 'intent',
    name: 'Intent',
    description: 'Capture ideas, stories, and user journeys',
    icon: '◇',
  },
  specification: {
    id: 'specification',
    name: 'Specification',
    description: 'Define capabilities and enablers',
    icon: '☰',
  },
  design: {
    id: 'design',
    name: 'Design',
    description: 'Configure UI framework, styles, and design assets',
    icon: '⚙',
  },
  'control-loop': {
    id: 'control-loop',
    name: 'Control Loop',
    description: 'Validate test scenarios and acceptance criteria',
    icon: '✓',
  },
  implementation: {
    id: 'implementation',
    name: 'Implementation',
    description: 'Build, test, and deploy your application',
    icon: '▶',
  },
  discovery: {
    id: 'discovery',
    name: 'Discovery',
    description: 'Analyze and document existing code',
    icon: '🔍',
  },
};

// Flow definitions (alias for backward compatibility)
const BASE_STEPS: Record<string, Omit<WizardStep, 'path' | 'startPath'>> = STEP_DEFINITIONS;

const createStep = (id: string): WizardStep => ({
  ...BASE_STEPS[id],
  path: `/wizard/${id}`,
  startPath: `/wizard/${id}/start`,
});

// Default wizard flows (fallback)
export const DEFAULT_WIZARD_FLOWS: Record<WizardFlowType, string[]> = {
  'new': ['workspace', 'intent', 'specification', 'design', 'control-loop', 'implementation'],
  'refactor': ['workspace', 'specification', 'design', 'control-loop', 'implementation'],
  'enhance': ['workspace', 'intent', 'specification', 'design', 'control-loop', 'implementation'],
  'reverse-engineer': ['workspace', 'discovery', 'specification', 'design', 'control-loop', 'implementation'],
};

// Storage keys for custom wizard flows and subpages
export const WIZARD_FLOWS_STORAGE_KEY = 'intentr_custom_wizard_flows';
export const WIZARD_SUBPAGES_STORAGE_KEY = 'intentr_custom_wizard_subpages';

// Helper to load custom wizard flows from localStorage
export const loadCustomWizardFlows = (): Record<WizardFlowType, string[]> => {
  try {
    const saved = localStorage.getItem(WIZARD_FLOWS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_WIZARD_FLOWS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load custom wizard flows:', e);
  }
  return DEFAULT_WIZARD_FLOWS;
};

// Default subpages per section (just the IDs)
export const DEFAULT_SECTION_SUBPAGE_IDS: Record<string, string[]> = {
  workspace: ['overview'],
  intent: ['overview', 'vision', 'ideation', 'storyboard'],
  specification: ['overview', 'capabilities', 'enablers', 'story-map'],
  design: ['overview', 'system', 'designs', 'ui-framework', 'ui-styles', 'ui-designer'],
  'control-loop': ['overview', 'testing', 'control-loop-approval'],
  implementation: ['overview', 'ai-principles', 'code', 'run'],
  discovery: ['overview', 'analyze'],
};

// All available subpages with their names (used for lookup)
export const ALL_SUBPAGE_DEFINITIONS: Record<string, { id: string; name: string }[]> = {
  workspace: [
    { id: 'overview', name: 'Section Overview' },
  ],
  intent: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'vision', name: 'Product Vision' },
    { id: 'ideation', name: 'Ideation' },
    { id: 'storyboard', name: 'Storyboard' },
    { id: 'intent-approval', name: 'Phase Approval' },
  ],
  specification: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'capabilities', name: 'Capabilities' },
    { id: 'enablers', name: 'Enablers' },
    { id: 'story-map', name: 'Dependencies' },
    { id: 'specification-approval', name: 'Phase Approval' },
  ],
  design: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'system', name: 'System Architecture' },
    { id: 'designs', name: 'UI Assets' },
    { id: 'ui-framework', name: 'UI Framework' },
    { id: 'ui-styles', name: 'UI Styles' },
    { id: 'ui-designer', name: 'UI Designer' },
    { id: 'design-approval', name: 'Phase Approval' },
  ],
  'control-loop': [
    { id: 'overview', name: 'Section Overview' },
    { id: 'testing', name: 'Test Scenarios' },
    { id: 'control-loop-approval', name: 'Phase Approval' },
  ],
  implementation: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'ai-principles', name: 'AI Principles' },
    { id: 'code', name: 'Code' },
    { id: 'run', name: 'Run' },
  ],
  discovery: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'analyze', name: 'Discovery Analysis' },
  ],
};

// Helper to load custom wizard subpages from localStorage
export const loadCustomWizardSubpages = (): Record<string, string[]> => {
  try {
    const saved = localStorage.getItem(WIZARD_SUBPAGES_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SECTION_SUBPAGE_IDS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load custom wizard subpages:', e);
  }
  return DEFAULT_SECTION_SUBPAGE_IDS;
};

// Create a flat map of ALL subpage definitions across all sections
// This allows looking up any subpage regardless of which section it was originally in
const ALL_SUBPAGES_FLAT: Record<string, WizardSubpage> = {};
for (const sectionId of Object.keys(ALL_SUBPAGE_DEFINITIONS)) {
  for (const subpage of ALL_SUBPAGE_DEFINITIONS[sectionId]) {
    ALL_SUBPAGES_FLAT[subpage.id] = subpage;
  }
}

// Export the flat map for use by other components (like Admin.tsx)
export { ALL_SUBPAGES_FLAT };

// Helper to convert subpage IDs to WizardSubpage objects
// Uses flat lookup to support subpages that have been moved between sections
const getSubpagesForSection = (sectionId: string, subpageIds: string[]): WizardSubpage[] => {
  return subpageIds
    .map(id => ALL_SUBPAGES_FLAT[id])
    .filter((subpage): subpage is WizardSubpage => subpage !== undefined);
};

// Helper to convert step IDs to WizardStep objects
const createFlowSteps = (stepIds: string[]): WizardStep[] => {
  return stepIds.map(id => createStep(id)).filter(step => step.id); // Filter out invalid steps
};

// Export for backward compatibility - will use custom flows if available
export const WIZARD_FLOWS: Record<WizardFlowType, WizardStep[]> = {
  'new': createFlowSteps(loadCustomWizardFlows()['new']),
  'refactor': createFlowSteps(loadCustomWizardFlows()['refactor']),
  'enhance': createFlowSteps(loadCustomWizardFlows()['enhance']),
  'reverse-engineer': createFlowSteps(loadCustomWizardFlows()['reverse-engineer']),
};

// Context
const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const useWizard = (): WizardContextType => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};

interface WizardProviderProps {
  children: ReactNode;
}

export const WizardProvider: React.FC<WizardProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentWorkspace, updateWorkspace } = useWorkspace();

  // Track previous workspace ID to detect workspace changes
  const prevWorkspaceIdRef = useRef<string | null>(null);

  // State for custom wizard flows and subpages
  const [customFlows, setCustomFlows] = useState<Record<WizardFlowType, string[]>>(() => loadCustomWizardFlows());
  const [customSubpages, setCustomSubpages] = useState<Record<string, string[]>>(() => loadCustomWizardSubpages());

  // Flow type state - must be declared before workspace loading effect
  const [flowType, setFlowTypeState] = useState<WizardFlowType | null>(() => {
    const saved = localStorage.getItem('wizard_flow_type');
    return saved as WizardFlowType | null;
  });

  // Load flows from workspace when workspace changes OR when workspace flows are updated
  useEffect(() => {
    console.log('[WizardContext] Workspace load effect triggered');
    console.log('[WizardContext] currentWorkspace:', currentWorkspace?.id, currentWorkspace?.name);
    console.log('[WizardContext] currentWorkspace.workspaceType:', currentWorkspace?.workspaceType);
    console.log('[WizardContext] currentWorkspace.wizardFlows:', currentWorkspace?.wizardFlows);
    console.log('[WizardContext] prevWorkspaceIdRef:', prevWorkspaceIdRef.current);

    if (!currentWorkspace) {
      console.log('[WizardContext] No currentWorkspace, returning');
      return;
    }

    // Check if this is a workspace switch (different ID)
    const isWorkspaceSwitch = prevWorkspaceIdRef.current !== currentWorkspace.id;

    if (isWorkspaceSwitch) {
      console.log('[WizardContext] Workspace ID changed, loading flows from workspace');
      prevWorkspaceIdRef.current = currentWorkspace.id;

      // IMPORTANT: Sync flowType from workspace's workspaceType when switching workspaces
      // This ensures the sidebar and wizard show the correct flow for the workspace
      const workspaceFlowType = currentWorkspace.workspaceType as WizardFlowType | undefined;
      if (workspaceFlowType && ['new', 'refactor', 'enhance', 'reverse-engineer'].includes(workspaceFlowType)) {
        console.log('[WizardContext] Setting flowType from workspace.workspaceType:', workspaceFlowType);
        setFlowTypeState(workspaceFlowType);
        localStorage.setItem('wizard_flow_type', workspaceFlowType);
      } else {
        console.log('[WizardContext] No valid workspaceType, defaulting flowType to "new"');
        setFlowTypeState('new');
        localStorage.setItem('wizard_flow_type', 'new');
      }
    } else {
      console.log('[WizardContext] Same workspace ID - checking if flows were updated in workspace');
    }

    // Always sync from workspace if flows exist (handles both workspace switch and updates)
    if (currentWorkspace.wizardFlows) {
      const mergedFlows = { ...DEFAULT_WIZARD_FLOWS, ...currentWorkspace.wizardFlows };
      console.log('[WizardContext] Syncing wizardFlows from workspace:', mergedFlows);
      setCustomFlows(mergedFlows);
    } else if (isWorkspaceSwitch) {
      // Only reset to defaults on workspace switch, not on every update
      console.log('[WizardContext] No wizardFlows in workspace, using defaults');
      setCustomFlows(DEFAULT_WIZARD_FLOWS);
    }

    if (currentWorkspace.wizardSubpages) {
      const mergedSubpages = { ...DEFAULT_SECTION_SUBPAGE_IDS, ...currentWorkspace.wizardSubpages };
      console.log('[WizardContext] Syncing wizardSubpages from workspace:', mergedSubpages);
      setCustomSubpages(mergedSubpages);
    } else if (isWorkspaceSwitch) {
      // Only reset to defaults on workspace switch, not on every update
      console.log('[WizardContext] No wizardSubpages in workspace, using defaults');
      setCustomSubpages(DEFAULT_SECTION_SUBPAGE_IDS);
    }

    // Dispatch event so sidebar updates
    console.log('[WizardContext] Dispatching intentr-wizard-flows-changed event for sidebar');
    window.dispatchEvent(new CustomEvent('intentr-wizard-flows-changed', {
      detail: {
        flows: currentWorkspace.wizardFlows || DEFAULT_WIZARD_FLOWS,
        subpages: currentWorkspace.wizardSubpages || DEFAULT_SECTION_SUBPAGE_IDS,
      }
    }));
  }, [currentWorkspace?.id, currentWorkspace?.workspaceType, currentWorkspace?.wizardFlows, currentWorkspace?.wizardSubpages]);

  // State
  const [isWizardMode, setIsWizardMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('wizard_mode_enabled');
    return saved === 'true';
  });

  // Note: flowType state is declared earlier (before workspace loading effect)

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    const saved = localStorage.getItem('wizard_current_step');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [currentSubpageIndex, setCurrentSubpageIndex] = useState<number>(() => {
    const saved = localStorage.getItem('wizard_current_subpage');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('wizard_completed_steps');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Listen for wizard flows changes from admin panel
  useEffect(() => {
    const handleFlowsChanged = (event: CustomEvent<{ flows: Record<WizardFlowType, string[]>; subpages: Record<string, string[]> }>) => {
      if (event.detail.flows) {
        setCustomFlows(event.detail.flows);
      }
      if (event.detail.subpages) {
        setCustomSubpages(event.detail.subpages);
      }
    };

    window.addEventListener('intentr-wizard-flows-changed', handleFlowsChanged as EventListener);

    return () => {
      window.removeEventListener('intentr-wizard-flows-changed', handleFlowsChanged as EventListener);
    };
  }, []);

  // Derived state - use custom flows and subpages
  const steps = flowType ? createFlowSteps(customFlows[flowType]) : [];
  const currentStep = steps[currentStepIndex] || null;
  // Get subpages for current section using custom configuration
  const currentSubpages = currentStep
    ? getSubpagesForSection(currentStep.id, customSubpages[currentStep.id] || DEFAULT_SECTION_SUBPAGE_IDS[currentStep.id] || [])
    : [];
  const currentSubpage = currentSubpages[currentSubpageIndex] || null;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstSubpage = currentSubpageIndex === 0;
  const isLastSubpage = currentSubpageIndex === currentSubpages.length - 1;
  const progress = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('wizard_mode_enabled', String(isWizardMode));
  }, [isWizardMode]);

  useEffect(() => {
    if (flowType) {
      localStorage.setItem('wizard_flow_type', flowType);
    } else {
      localStorage.removeItem('wizard_flow_type');
    }
  }, [flowType]);

  useEffect(() => {
    localStorage.setItem('wizard_current_step', String(currentStepIndex));
  }, [currentStepIndex]);

  useEffect(() => {
    localStorage.setItem('wizard_completed_steps', JSON.stringify([...completedSteps]));
  }, [completedSteps]);

  useEffect(() => {
    localStorage.setItem('wizard_current_subpage', String(currentSubpageIndex));
  }, [currentSubpageIndex]);

  // Actions
  const setWizardMode = useCallback((enabled: boolean) => {
    setIsWizardMode(enabled);
    if (!enabled) {
      // Reset wizard state when disabled
      setFlowTypeState(null);
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
    }
  }, []);

  const setFlowType = useCallback((type: WizardFlowType) => {
    setFlowTypeState(type);
    setCurrentStepIndex(0);
    setCurrentSubpageIndex(0);
    setCompletedSteps(new Set());
  }, []);

  // Navigate to a subpage within the current section
  const navigateToSubpage = useCallback((stepId: string, subpageId: string) => {
    if (subpageId === 'overview') {
      // Overview pages are the start pages
      navigate(`/wizard/${stepId}/start`);
    } else {
      // Regular subpages - navigate within wizard context
      navigate(`/wizard/${stepId}/${subpageId}`);
    }
  }, [navigate]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, currentStepIndex]));
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setCurrentSubpageIndex(0); // Reset to first subpage (overview)

      // Navigate to next step's start page (overview)
      const nextStepData = steps[nextIndex];
      if (nextStepData) {
        navigate(nextStepData.startPath);
      }
    }
  }, [currentStepIndex, steps, navigate]);

  const nextSubpage = useCallback(() => {
    if (currentSubpageIndex < currentSubpages.length - 1) {
      const nextIndex = currentSubpageIndex + 1;
      setCurrentSubpageIndex(nextIndex);
      const nextSubpageData = currentSubpages[nextIndex];
      if (nextSubpageData && currentStep) {
        navigateToSubpage(currentStep.id, nextSubpageData.id);
      }
    } else if (!isLastStep) {
      // At last subpage of current section, go to next section
      nextStep();
    }
  }, [currentSubpageIndex, currentSubpages, currentStep, isLastStep, nextStep, navigateToSubpage]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      // Go to last subpage of previous section using custom subpages
      const prevSectionId = steps[prevIndex]?.id;
      const prevSubpageIds = customSubpages[prevSectionId] || DEFAULT_SECTION_SUBPAGE_IDS[prevSectionId] || [];
      const prevSubpages = getSubpagesForSection(prevSectionId, prevSubpageIds);
      setCurrentSubpageIndex(prevSubpages.length - 1);

      // Navigate to previous step's last subpage
      const prevStepData = steps[prevIndex];
      if (prevStepData && prevSubpages.length > 0) {
        navigateToSubpage(prevStepData.id, prevSubpages[prevSubpages.length - 1].id);
      }
    }
  }, [currentStepIndex, steps, customSubpages, navigateToSubpage]);

  const previousSubpage = useCallback(() => {
    if (currentSubpageIndex > 0) {
      const prevIndex = currentSubpageIndex - 1;
      setCurrentSubpageIndex(prevIndex);
      const prevSubpageData = currentSubpages[prevIndex];
      if (prevSubpageData && currentStep) {
        navigateToSubpage(currentStep.id, prevSubpageData.id);
      }
    } else if (!isFirstStep) {
      // At first subpage of current section, go to previous section
      previousStep();
    }
  }, [currentSubpageIndex, currentSubpages, currentStep, isFirstStep, previousStep, navigateToSubpage]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      // Allow navigation to any step (user can click any section)
      setCurrentStepIndex(index);
      setCurrentSubpageIndex(0); // Start at overview
      const stepData = steps[index];
      if (stepData) {
        navigate(stepData.startPath);
      }
    }
  }, [steps, navigate]);

  const goToSubpage = useCallback((index: number) => {
    if (index >= 0 && index < currentSubpages.length && currentStep) {
      setCurrentSubpageIndex(index);
      const subpageData = currentSubpages[index];
      if (subpageData) {
        navigateToSubpage(currentStep.id, subpageData.id);
      }
    }
  }, [currentSubpages, currentStep, navigateToSubpage]);

  const jumpToNextSection = useCallback(() => {
    // Mark current step as completed and move to next section
    if (currentStepIndex < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStepIndex]));
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setCurrentSubpageIndex(0);

      const nextStepData = steps[nextIndex];
      if (nextStepData) {
        navigate(nextStepData.startPath);
      }
    }
  }, [currentStepIndex, steps, navigate]);

  const completeCurrentStep = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, currentStepIndex]));
  }, [currentStepIndex]);

  const exitWizard = useCallback(() => {
    setIsWizardMode(false);
    navigate('/');
  }, [navigate]);

  const resetWizard = useCallback(() => {
    setFlowTypeState(null);
    setCurrentStepIndex(0);
    setCurrentSubpageIndex(0);
    setCompletedSteps(new Set());
    localStorage.removeItem('wizard_flow_type');
    localStorage.removeItem('wizard_current_step');
    localStorage.removeItem('wizard_current_subpage');
    localStorage.removeItem('wizard_completed_steps');
  }, []);

  const getStepStatus = useCallback((index: number): WizardStepStatus => {
    if (completedSteps.has(index)) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'upcoming';
  }, [completedSteps, currentStepIndex]);

  // Save flows to the current workspace
  const saveFlowsToWorkspace = useCallback(async (
    flows: Record<WizardFlowType, string[]>,
    subpages: Record<string, string[]>
  ): Promise<void> => {
    console.log('[WizardContext] saveFlowsToWorkspace called');
    console.log('[WizardContext] currentWorkspace:', currentWorkspace?.id, currentWorkspace?.name);
    console.log('[WizardContext] flows to save:', flows);
    console.log('[WizardContext] subpages to save:', subpages);

    if (!currentWorkspace) {
      console.warn('[WizardContext] Cannot save flows: no workspace selected');
      return;
    }

    // Update local state
    console.log('[WizardContext] Setting customFlows state...');
    setCustomFlows(flows);
    setCustomSubpages(subpages);

    // Save to workspace
    console.log('[WizardContext] Calling updateWorkspace...');
    await updateWorkspace(currentWorkspace.id, {
      wizardFlows: flows,
      wizardSubpages: subpages,
    });
    console.log('[WizardContext] updateWorkspace completed');

    // Dispatch event so sidebar updates
    console.log('[WizardContext] Dispatching intentr-wizard-flows-changed event');
    window.dispatchEvent(new CustomEvent('intentr-wizard-flows-changed', {
      detail: { flows, subpages }
    }));
  }, [currentWorkspace, updateWorkspace]);

  // Sync step and subpage index with URL when in wizard mode
  useEffect(() => {
    if (isWizardMode && flowType && location.pathname.startsWith('/wizard/')) {
      const pathParts = location.pathname.split('/');
      const stepId = pathParts[2]; // /wizard/{stepId}/...
      const subpageId = pathParts[3]; // /wizard/{stepId}/{subpageId} or 'start'

      if (stepId) {
        const stepIndex = steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
          setCurrentStepIndex(stepIndex);
        }

        // Sync subpage index
        if (stepIndex !== -1) {
          const sectionSubpageIds = customSubpages[stepId] || DEFAULT_SECTION_SUBPAGE_IDS[stepId] || [];
          if (subpageId === 'start' || subpageId === undefined) {
            // Start page is the overview (first subpage)
            if (currentSubpageIndex !== 0) {
              setCurrentSubpageIndex(0);
            }
          } else if (subpageId) {
            const subpageIndex = sectionSubpageIds.indexOf(subpageId);
            if (subpageIndex !== -1 && subpageIndex !== currentSubpageIndex) {
              setCurrentSubpageIndex(subpageIndex);
            }
          }
        }
      }
    }
  }, [location.pathname, isWizardMode, flowType, steps, currentStepIndex, currentSubpageIndex, customSubpages]);

  const value: WizardContextType = {
    // State
    isWizardMode,
    flowType,
    currentStepIndex,
    currentSubpageIndex,
    steps,
    completedSteps,

    // Configuration (for sidebar synchronization)
    customFlows,
    customSubpages,

    // Computed
    currentStep,
    currentSubpage,
    currentSubpages,
    isFirstStep,
    isLastStep,
    isFirstSubpage,
    isLastSubpage,
    progress,

    // Actions
    setWizardMode,
    setFlowType,
    nextStep,
    nextSubpage,
    previousStep,
    previousSubpage,
    goToStep,
    goToSubpage,
    jumpToNextSection,
    completeCurrentStep,
    exitWizard,
    resetWizard,
    getStepStatus,
    saveFlowsToWorkspace,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};

export default WizardContext;
