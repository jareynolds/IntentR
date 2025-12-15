import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { SPEC_URL } from '../api/client';
import {
  type Enabler,
  type EnablerWithDetails,
  type CreateEnablerRequest,
  type UpdateEnablerRequest,
  type EnablerRequirement,
  type CreateRequirementRequest,
  type UpdateRequirementRequest,
  type VerifyRequirementRequest,
  type AcceptanceCriteria,
  type CreateAcceptanceCriteriaRequest,
  type UpdateAcceptanceCriteriaRequest,
  type VerifyAcceptanceCriteriaRequest,
  type AcceptanceCriteriaSummary,
  type EntityType,
  type EnablerSpecification,
  getEnablers,
  getEnabler,
  getEnablersByCapability,
  createEnabler as apiCreateEnabler,
  updateEnabler as apiUpdateEnabler,
  deleteEnabler as apiDeleteEnabler,
  getRequirementsByEnabler,
  createRequirement as apiCreateRequirement,
  updateRequirement as apiUpdateRequirement,
  deleteRequirement as apiDeleteRequirement,
  verifyRequirement as apiVerifyRequirement,
  getCapabilityCriteria,
  getEnablerCriteria,
  getRequirementCriteria,
  createCapabilityCriteria,
  createEnablerCriteria,
  createRequirementCriteria,
  updateAcceptanceCriteria as apiUpdateCriteria,
  deleteAcceptanceCriteria as apiDeleteCriteria,
  verifyAcceptanceCriteria as apiVerifyCriteria,
  getAcceptanceCriteriaSummary,
  readEnablerSpecifications,
} from '../api/enablerService';

interface EnablerState {
  enablers: Enabler[];
  selectedEnabler: EnablerWithDetails | null;
  requirements: EnablerRequirement[];
  acceptanceCriteria: AcceptanceCriteria[];
  criteriaSummary: AcceptanceCriteriaSummary | null;
  isLoading: boolean;
  error: string | null;
  // Specification files from ./specifications folder
  specifications: EnablerSpecification[];
  showAnalyzeMode: boolean;
  isAnalyzing: boolean;
  analyzeError: string | null;
}

interface EnablerContextType extends EnablerState {
  // Enabler operations
  loadEnablers: (capabilityId?: number) => Promise<void>;
  loadEnabler: (id: number) => Promise<void>;
  createEnabler: (data: CreateEnablerRequest) => Promise<Enabler>;
  updateEnabler: (id: number, data: UpdateEnablerRequest) => Promise<Enabler>;
  deleteEnabler: (id: number) => Promise<void>;
  selectEnabler: (enabler: Enabler | null) => void;

  // Requirement operations
  loadRequirements: (enablerId: number) => Promise<void>;
  createRequirement: (data: CreateRequirementRequest) => Promise<EnablerRequirement>;
  updateRequirement: (id: number, data: UpdateRequirementRequest) => Promise<EnablerRequirement>;
  deleteRequirement: (id: number) => Promise<void>;
  verifyRequirement: (id: number, data: VerifyRequirementRequest) => Promise<EnablerRequirement>;

  // Acceptance criteria operations
  loadCriteria: (entityType: EntityType, entityId: number) => Promise<void>;
  loadCriteriaSummary: (entityType: EntityType, entityId: number) => Promise<void>;
  createCriteria: (
    entityType: EntityType,
    entityId: number,
    data: Omit<CreateAcceptanceCriteriaRequest, 'entity_type' | 'entity_id'>
  ) => Promise<AcceptanceCriteria>;
  updateCriteria: (id: number, data: UpdateAcceptanceCriteriaRequest) => Promise<AcceptanceCriteria>;
  deleteCriteria: (id: number) => Promise<void>;
  verifyCriteria: (id: number, data: VerifyAcceptanceCriteriaRequest) => Promise<AcceptanceCriteria>;

  // Specification operations
  loadSpecifications: (workspacePath?: string) => Promise<void>;
  deleteSpecification: (fileName: string, workspacePath?: string) => Promise<void>;
  updateSpecification: (spec: EnablerSpecification, workspacePath?: string) => Promise<void>;
  reorderSpecifications: (fromIndex: number, toIndex: number) => void;
  setShowAnalyzeMode: (show: boolean) => void;
  clearAnalyzeError: () => void;

  // Utility
  clearError: () => void;
  clearSelection: () => void;
}

const EnablerContext = createContext<EnablerContextType | undefined>(undefined);

// Helper function to generate markdown from an enabler specification
function generateEnablerMarkdown(spec: EnablerSpecification): string {
  let md = `# ${spec.name}\n\n`;
  md += `## Metadata\n`;
  md += `- **Name**: ${spec.name}\n`;
  md += `- **Type**: ${spec.type || 'Enabler'}\n`;
  md += `- **ID**: ${spec.id}\n`;
  md += `- **Capability ID**: ${spec.capabilityId}\n`;
  md += `- **Owner**: ${spec.owner}\n`;
  md += `- **Status**: ${spec.status}\n`;
  md += `- **Approval**: ${spec.approval}\n`;
  md += `- **Priority**: ${spec.priority}\n`;
  if (spec.analysisReview) md += `- **Analysis Review**: ${spec.analysisReview}\n`;
  if (spec.codeReview) md += `- **Code Review**: ${spec.codeReview}\n`;
  md += `\n`;

  if (spec.purpose) {
    md += `## Technical Overview\n`;
    md += `### Purpose\n`;
    md += `${spec.purpose}\n\n`;
  }

  if (spec.functionalRequirements.length > 0) {
    md += `## Functional Requirements\n`;
    md += `| ID | Name | Requirement | Status | Priority |\n`;
    md += `|----|------|-------------|--------|----------|\n`;
    spec.functionalRequirements.forEach((req) => {
      md += `| ${req.id} | ${req.name} | ${req.requirement} | ${req.status || ''} | ${req.priority || ''} |\n`;
    });
    md += `\n`;
  }

  if (spec.nonFunctionalRequirements.length > 0) {
    md += `## Non-Functional Requirements\n`;
    md += `| ID | Name | Requirement | Type | Status |\n`;
    md += `|----|------|-------------|------|--------|\n`;
    spec.nonFunctionalRequirements.forEach((req) => {
      md += `| ${req.id} | ${req.name} | ${req.requirement} | ${req.type || ''} | ${req.status || ''} |\n`;
    });
    md += `\n`;
  }

  return md;
}

export const EnablerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [state, setState] = useState<EnablerState>({
    enablers: [],
    selectedEnabler: null,
    requirements: [],
    acceptanceCriteria: [],
    criteriaSummary: null,
    isLoading: false,
    error: null,
    // Specification files state (persists across navigation)
    specifications: [],
    showAnalyzeMode: false,
    isAnalyzing: false,
    analyzeError: null,
  });

  // ========================
  // Enabler Operations
  // ========================

  const loadEnablers = useCallback(async (capabilityId?: number) => {
    if (!isAuthenticated) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = capabilityId
        ? await getEnablersByCapability(capabilityId)
        : await getEnablers();
      setState((prev) => ({
        ...prev,
        enablers: response.enablers || [],
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load enablers',
      }));
    }
  }, [isAuthenticated]);

  const loadEnabler = useCallback(async (id: number) => {
    if (!isAuthenticated) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const enabler = await getEnabler(id);
      setState((prev) => ({
        ...prev,
        selectedEnabler: enabler,
        requirements: enabler.requirements || [],
        acceptanceCriteria: enabler.acceptance_criteria || [],
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load enabler',
      }));
    }
  }, [isAuthenticated]);

  const createEnabler = useCallback(async (data: CreateEnablerRequest): Promise<Enabler> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const enabler = await apiCreateEnabler(data);
      setState((prev) => ({
        ...prev,
        enablers: [...prev.enablers, enabler],
        isLoading: false,
      }));
      return enabler;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to create enabler',
      }));
      throw error;
    }
  }, []);

  const updateEnabler = useCallback(async (id: number, data: UpdateEnablerRequest): Promise<Enabler> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const enabler = await apiUpdateEnabler(id, data);
      setState((prev) => ({
        ...prev,
        enablers: prev.enablers.map((e) => (e.id === id ? enabler : e)),
        selectedEnabler: prev.selectedEnabler?.id === id
          ? { ...prev.selectedEnabler, ...enabler }
          : prev.selectedEnabler,
        isLoading: false,
      }));
      return enabler;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to update enabler',
      }));
      throw error;
    }
  }, []);

  const deleteEnabler = useCallback(async (id: number): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiDeleteEnabler(id);
      setState((prev) => ({
        ...prev,
        enablers: prev.enablers.filter((e) => e.id !== id),
        selectedEnabler: prev.selectedEnabler?.id === id ? null : prev.selectedEnabler,
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to delete enabler',
      }));
      throw error;
    }
  }, []);

  const selectEnabler = useCallback((enabler: Enabler | null) => {
    if (enabler) {
      loadEnabler(enabler.id);
    } else {
      setState((prev) => ({
        ...prev,
        selectedEnabler: null,
        requirements: [],
        acceptanceCriteria: [],
        criteriaSummary: null,
      }));
    }
  }, [loadEnabler]);

  // ========================
  // Requirement Operations
  // ========================

  const loadRequirements = useCallback(async (enablerId: number) => {
    if (!isAuthenticated) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await getRequirementsByEnabler(enablerId);
      setState((prev) => ({
        ...prev,
        requirements: response.requirements || [],
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load requirements',
      }));
    }
  }, [isAuthenticated]);

  const createRequirement = useCallback(
    async (data: CreateRequirementRequest): Promise<EnablerRequirement> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const requirement = await apiCreateRequirement(data);
        setState((prev) => ({
          ...prev,
          requirements: [...prev.requirements, requirement],
          isLoading: false,
        }));
        return requirement;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to create requirement',
        }));
        throw error;
      }
    },
    []
  );

  const updateRequirement = useCallback(
    async (id: number, data: UpdateRequirementRequest): Promise<EnablerRequirement> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const requirement = await apiUpdateRequirement(id, data);
        setState((prev) => ({
          ...prev,
          requirements: prev.requirements.map((r) => (r.id === id ? requirement : r)),
          isLoading: false,
        }));
        return requirement;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to update requirement',
        }));
        throw error;
      }
    },
    []
  );

  const deleteRequirement = useCallback(async (id: number): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiDeleteRequirement(id);
      setState((prev) => ({
        ...prev,
        requirements: prev.requirements.filter((r) => r.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to delete requirement',
      }));
      throw error;
    }
  }, []);

  const verifyRequirement = useCallback(
    async (id: number, data: VerifyRequirementRequest): Promise<EnablerRequirement> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const requirement = await apiVerifyRequirement(id, data);
        setState((prev) => ({
          ...prev,
          requirements: prev.requirements.map((r) => (r.id === id ? requirement : r)),
          isLoading: false,
        }));
        return requirement;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to verify requirement',
        }));
        throw error;
      }
    },
    []
  );

  // ========================
  // Acceptance Criteria Operations
  // ========================

  const loadCriteria = useCallback(async (entityType: EntityType, entityId: number) => {
    if (!isAuthenticated) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      let response;
      switch (entityType) {
        case 'capability':
          response = await getCapabilityCriteria(entityId);
          break;
        case 'enabler':
          response = await getEnablerCriteria(entityId);
          break;
        case 'requirement':
          response = await getRequirementCriteria(entityId);
          break;
      }
      setState((prev) => ({
        ...prev,
        acceptanceCriteria: response?.criteria || [],
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to load acceptance criteria',
      }));
    }
  }, [isAuthenticated]);

  const loadCriteriaSummary = useCallback(async (entityType: EntityType, entityId: number) => {
    if (!isAuthenticated) return;

    try {
      const summary = await getAcceptanceCriteriaSummary(entityType, entityId);
      setState((prev) => ({
        ...prev,
        criteriaSummary: summary,
      }));
    } catch (error: any) {
      console.error('Failed to load criteria summary:', error);
    }
  }, [isAuthenticated]);

  const createCriteria = useCallback(
    async (
      entityType: EntityType,
      entityId: number,
      data: Omit<CreateAcceptanceCriteriaRequest, 'entity_type' | 'entity_id'>
    ): Promise<AcceptanceCriteria> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        let criteria;
        switch (entityType) {
          case 'capability':
            criteria = await createCapabilityCriteria(entityId, data);
            break;
          case 'enabler':
            criteria = await createEnablerCriteria(entityId, data);
            break;
          case 'requirement':
            criteria = await createRequirementCriteria(entityId, data);
            break;
        }
        setState((prev) => ({
          ...prev,
          acceptanceCriteria: [...prev.acceptanceCriteria, criteria],
          isLoading: false,
        }));
        // Refresh summary
        loadCriteriaSummary(entityType, entityId);
        return criteria;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to create acceptance criteria',
        }));
        throw error;
      }
    },
    [loadCriteriaSummary]
  );

  const updateCriteria = useCallback(
    async (id: number, data: UpdateAcceptanceCriteriaRequest): Promise<AcceptanceCriteria> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const criteria = await apiUpdateCriteria(id, data);
        setState((prev) => ({
          ...prev,
          acceptanceCriteria: prev.acceptanceCriteria.map((c) => (c.id === id ? criteria : c)),
          isLoading: false,
        }));
        return criteria;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to update acceptance criteria',
        }));
        throw error;
      }
    },
    []
  );

  const deleteCriteria = useCallback(async (id: number): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiDeleteCriteria(id);
      setState((prev) => ({
        ...prev,
        acceptanceCriteria: prev.acceptanceCriteria.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to delete acceptance criteria',
      }));
      throw error;
    }
  }, []);

  const verifyCriteria = useCallback(
    async (id: number, data: VerifyAcceptanceCriteriaRequest): Promise<AcceptanceCriteria> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const criteria = await apiVerifyCriteria(id, data);
        setState((prev) => ({
          ...prev,
          acceptanceCriteria: prev.acceptanceCriteria.map((c) => (c.id === id ? criteria : c)),
          isLoading: false,
        }));
        return criteria;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to verify acceptance criteria',
        }));
        throw error;
      }
    },
    []
  );

  // ========================
  // Specification Operations
  // ========================

  const loadSpecifications = useCallback(async (workspacePath?: string) => {
    setState((prev) => ({ ...prev, isAnalyzing: true, analyzeError: null }));
    try {
      const response = await readEnablerSpecifications(workspacePath);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          specifications: response.enablers,
          isAnalyzing: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          analyzeError: response.message || 'Failed to read specifications',
        }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        analyzeError: error.message || 'Failed to analyze specifications',
      }));
    }
  }, []);

  const deleteSpecification = useCallback(async (fileName: string, workspacePath?: string) => {
    try {
      const response = await fetch(`${SPEC_URL}/api/delete-specification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, workspacePath, subfolder: 'definition' }),
      });

      const data = await response.json();
      if (data.success) {
        setState((prev) => ({
          ...prev,
          specifications: prev.specifications.filter((s) => s.fileName !== fileName),
        }));
      } else {
        throw new Error(data.error || 'Failed to delete specification');
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        analyzeError: error.message || 'Failed to delete specification',
      }));
      throw error;
    }
  }, []);

  const updateSpecification = useCallback(async (spec: EnablerSpecification, workspacePath?: string) => {
    try {
      // Generate updated markdown content from the specification
      const content = generateEnablerMarkdown(spec);

      const response = await fetch(`${SPEC_URL}/api/save-specification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: spec.fileName,
          content,
          workspacePath,
          subfolder: 'definition'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setState((prev) => ({
          ...prev,
          specifications: prev.specifications.map((s) =>
            s.fileName === spec.fileName ? { ...spec, content } : s
          ),
        }));
      } else {
        throw new Error(data.error || 'Failed to update specification');
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        analyzeError: error.message || 'Failed to update specification',
      }));
      throw error;
    }
  }, []);

  const reorderSpecifications = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newSpecs = [...prev.specifications];
      const [removed] = newSpecs.splice(fromIndex, 1);
      newSpecs.splice(toIndex, 0, removed);
      return { ...prev, specifications: newSpecs };
    });
  }, []);

  const setShowAnalyzeMode = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showAnalyzeMode: show }));
  }, []);

  const clearAnalyzeError = useCallback(() => {
    setState((prev) => ({ ...prev, analyzeError: null }));
  }, []);

  // ========================
  // Utility Operations
  // ========================

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedEnabler: null,
      requirements: [],
      acceptanceCriteria: [],
      criteriaSummary: null,
    }));
  }, []);

  return (
    <EnablerContext.Provider
      value={{
        ...state,
        loadEnablers,
        loadEnabler,
        createEnabler,
        updateEnabler,
        deleteEnabler,
        selectEnabler,
        loadRequirements,
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
        loadSpecifications,
        deleteSpecification,
        updateSpecification,
        reorderSpecifications,
        setShowAnalyzeMode,
        clearAnalyzeError,
        clearError,
        clearSelection,
      }}
    >
      {children}
    </EnablerContext.Provider>
  );
};

export const useEnabler = (): EnablerContextType => {
  const context = useContext(EnablerContext);
  if (!context) {
    throw new Error('useEnabler must be used within EnablerProvider');
  }
  return context;
};
