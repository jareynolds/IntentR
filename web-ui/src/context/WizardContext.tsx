import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Types
export type WizardFlowType = 'new' | 'refactor' | 'reverse-engineer';

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
  conception: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'vision', name: 'Product Vision' },
    { id: 'ideation', name: 'Ideation' },
    { id: 'storyboard', name: 'Storyboard' },
  ],
  definition: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'capabilities', name: 'Capabilities' },
    { id: 'enablers', name: 'Enablers' },
    { id: 'story-map', name: 'Dependencies' },
    { id: 'designs', name: 'UI Assets' },
    { id: 'ui-framework', name: 'UI Framework' },
    { id: 'ui-styles', name: 'UI Styles' },
    { id: 'ui-designer', name: 'UI Designer' },
  ],
  implementation: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'testing', name: 'Test Scenarios' },
    { id: 'system', name: 'System' },
    { id: 'ai-principles', name: 'AI Principles' },
    { id: 'code', name: 'Code' },
    { id: 'run', name: 'Run' },
  ],
  testing: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'testing-approval', name: 'Phase Approval' },
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
}

// Flow definitions
const BASE_STEPS: Record<string, Omit<WizardStep, 'path' | 'startPath'>> = {
  workspace: {
    id: 'workspace',
    name: 'Workspace',
    description: 'Select your project type and workspace',
  },
  conception: {
    id: 'conception',
    name: 'Intent Declaration',
    description: 'Capture ideas, stories, and user journeys',
  },
  definition: {
    id: 'definition',
    name: 'Formal Specification',
    description: 'Define capabilities, enablers, and design assets',
  },
  design: {
    id: 'design',
    name: 'Design',
    description: 'Create technical designs and specifications',
  },
  testing: {
    id: 'testing',
    name: 'Continuous Validation',
    description: 'Validate test scenarios and acceptance criteria',
  },
  implementation: {
    id: 'implementation',
    name: 'System Derivation',
    description: 'Build, test, and deploy your application',
  },
  discovery: {
    id: 'discovery',
    name: 'Discovery',
    description: 'Analyze and document existing code',
  },
};

const createStep = (id: string): WizardStep => ({
  ...BASE_STEPS[id],
  path: `/wizard/${id}`,
  startPath: `/wizard/${id}/start`,
});

export const WIZARD_FLOWS: Record<WizardFlowType, WizardStep[]> = {
  'new': [
    createStep('workspace'),
    createStep('conception'),
    createStep('definition'),
    createStep('design'),
    createStep('testing'),
    createStep('implementation'),
  ],
  'refactor': [
    createStep('workspace'),
    createStep('definition'),
    createStep('testing'),
    createStep('implementation'),
  ],
  'reverse-engineer': [
    createStep('workspace'),
    createStep('discovery'),
    createStep('definition'),
    createStep('design'),
    createStep('testing'),
    createStep('implementation'),
  ],
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

  // State
  const [isWizardMode, setIsWizardMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('wizard_mode_enabled');
    return saved === 'true';
  });

  const [flowType, setFlowTypeState] = useState<WizardFlowType | null>(() => {
    const saved = localStorage.getItem('wizard_flow_type');
    return saved as WizardFlowType | null;
  });

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

  // Derived state
  const steps = flowType ? WIZARD_FLOWS[flowType] : [];
  const currentStep = steps[currentStepIndex] || null;
  const currentSubpages = currentStep ? (SECTION_SUBPAGES[currentStep.id] || []) : [];
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
      // Regular subpages - navigate to the page directly
      navigate(`/${subpageId}`);
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
      // Go to last subpage of previous section
      const prevSubpages = SECTION_SUBPAGES[steps[prevIndex]?.id] || [];
      setCurrentSubpageIndex(prevSubpages.length - 1);

      // Navigate to previous step's last subpage
      const prevStepData = steps[prevIndex];
      if (prevStepData && prevSubpages.length > 0) {
        navigateToSubpage(prevStepData.id, prevSubpages[prevSubpages.length - 1].id);
      }
    }
  }, [currentStepIndex, steps, navigateToSubpage]);

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

  // Sync step index with URL when in wizard mode
  useEffect(() => {
    if (isWizardMode && flowType && location.pathname.startsWith('/wizard/')) {
      const pathParts = location.pathname.split('/');
      const stepId = pathParts[2]; // /wizard/{stepId}/...

      if (stepId) {
        const stepIndex = steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1 && stepIndex !== currentStepIndex) {
          setCurrentStepIndex(stepIndex);
        }
      }
    }
  }, [location.pathname, isWizardMode, flowType, steps, currentStepIndex]);

  const value: WizardContextType = {
    // State
    isWizardMode,
    flowType,
    currentStepIndex,
    currentSubpageIndex,
    steps,
    completedSteps,

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
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};

export default WizardContext;
