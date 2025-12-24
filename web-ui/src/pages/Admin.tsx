import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWizard, type WizardFlowType } from '../context/WizardContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { authClient } from '../api/client';
import { Card } from '../components';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { RoleManagement } from '../components/RoleManagement';
import { Settings } from './Settings';
import { Integrations } from './Integrations';
import { DEFAULT_LAYOUTS, type PageLayoutConfig } from '../components/PageLayout';

interface WizardStepConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface WizardSubpageConfig {
  id: string;
  name: string;
}

const AVAILABLE_STEPS: WizardStepConfig[] = [
  { id: 'workspace', name: 'Workspace', description: 'Select your project type and workspace', icon: '◰' },
  { id: 'intent', name: 'Intent', description: 'Capture ideas, stories, and user journeys', icon: '◇' },
  { id: 'specification', name: 'Specification', description: 'Define capabilities and enablers', icon: '☰' },
  { id: 'system', name: 'UI Design', description: 'Configure UI framework, styles, and design assets', icon: '⚙' },
  { id: 'control-loop', name: 'Control Loop', description: 'Validate test scenarios and acceptance criteria', icon: '✓' },
  { id: 'implementation', name: 'Implementation', description: 'Build, test, and deploy your application', icon: '▶' },
  { id: 'discovery', name: 'Discovery', description: 'Analyze and document existing code', icon: '🔍' },
];

// Available subpages for each section (master list)
const AVAILABLE_SUBPAGES: Record<string, WizardSubpageConfig[]> = {
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
  system: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'designs', name: 'UI Assets' },
    { id: 'ui-framework', name: 'UI Framework' },
    { id: 'ui-styles', name: 'UI Styles' },
    { id: 'ui-designer', name: 'UI Designer' },
    { id: 'system-approval', name: 'Phase Approval' },
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
    { id: 'implementation-approval', name: 'Phase Approval' },
  ],
  discovery: [
    { id: 'overview', name: 'Section Overview' },
    { id: 'analyze', name: 'Discovery Analysis' },
  ],
};

// Default subpage order for each section
const DEFAULT_SECTION_SUBPAGES: Record<string, string[]> = {
  workspace: ['overview'],
  intent: ['overview', 'vision', 'ideation', 'storyboard'],
  specification: ['overview', 'capabilities', 'enablers', 'story-map'],
  system: ['overview', 'designs', 'ui-framework', 'ui-styles', 'ui-designer'],
  'control-loop': ['overview', 'testing', 'control-loop-approval'],
  implementation: ['overview', 'ai-principles', 'code', 'run'],
  discovery: ['overview', 'analyze'],
};

// Create a flat map of ALL subpages across all sections for cross-section lookups
const ALL_SUBPAGES_FLAT: Record<string, WizardSubpageConfig> = {};
for (const sectionId of Object.keys(AVAILABLE_SUBPAGES)) {
  for (const subpage of AVAILABLE_SUBPAGES[sectionId]) {
    ALL_SUBPAGES_FLAT[subpage.id] = subpage;
  }
}

const DEFAULT_WIZARD_FLOWS: Record<WizardFlowType, string[]> = {
  'new': ['workspace', 'intent', 'specification', 'system', 'control-loop', 'implementation'],
  'refactor': ['workspace', 'specification', 'control-loop', 'implementation'],
  'enhance': ['workspace', 'intent', 'specification', 'system', 'control-loop', 'implementation'],
  'reverse-engineer': ['workspace', 'discovery', 'specification', 'system', 'control-loop', 'implementation'],
};

const WIZARD_FLOWS_STORAGE_KEY = 'intentr_custom_wizard_flows';
const WIZARD_SUBPAGES_STORAGE_KEY = 'intentr_custom_wizard_subpages';

// Constants for global app settings storage
const INTENTR_APP_PAGE_LAYOUT_KEY = 'intentr_app_page_layout';
const INTENTR_CUSTOM_PAGE_LAYOUTS_KEY = 'intentr_custom_page_layouts';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isActive: boolean;
}

interface CreateUserForm {
  email: string;
  password: string;
  name: string;
  role: string;
}

interface EditUserForm {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
  isActive?: boolean;
}

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

// Helper function to display role names
const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'product_owner': 'Product Owner',
    'designer': 'Designer',
    'engineer': 'Engineer',
    'devops': 'DevOps',
    'admin': 'Administrator',
  };
  return roleMap[role] || role;
};

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { saveFlowsToWorkspace, customFlows: contextFlows, customSubpages: contextSubpages } = useWizard();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'integrations' | 'settings' | 'pageLayouts' | 'wizardFlows'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordForm>({
    newPassword: '',
    confirmPassword: '',
  });

  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    name: '',
    role: 'engineer',
  });

  const [editForm, setEditForm] = useState<Partial<EditUserForm>>({});

  // Wizard Flows state
  const [selectedFlowType, setSelectedFlowType] = useState<WizardFlowType>('new');
  const [wizardFlows, setWizardFlows] = useState<Record<WizardFlowType, string[]>>(DEFAULT_WIZARD_FLOWS);
  const [sectionSubpages, setSectionSubpages] = useState<Record<string, string[]>>(DEFAULT_SECTION_SUBPAGES);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const [draggedSubpage, setDraggedSubpage] = useState<{ sectionId: string; subpageId: string } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverSubpageIndex, setDragOverSubpageIndex] = useState<{ sectionId: string; index: number } | null>(null);

  // Use a ref to track drag state without causing re-renders during drag
  const draggedSubpageRef = useRef<{ sectionId: string; subpageId: string } | null>(null);
  const [, forceUpdate] = useState({});
  const [wizardFlowsHasChanges, setWizardFlowsHasChanges] = useState(false);
  const [showWizardFlowsSuccess, setShowWizardFlowsSuccess] = useState(false);

  // Page Layout state (for IntentR application appearance)
  const [pageLayouts, setPageLayouts] = useState<PageLayoutConfig[]>(DEFAULT_LAYOUTS);
  const [selectedPageLayoutId, setSelectedPageLayoutId] = useState<string>('standard');
  const [activePageLayoutId, setActivePageLayoutId] = useState<string | null>(null);
  const [showPageLayoutSuccess, setShowPageLayoutSuccess] = useState(false);
  const [showPageLayoutCustomizeModal, setShowPageLayoutCustomizeModal] = useState(false);
  const [showPageLayoutSaveModal, setShowPageLayoutSaveModal] = useState(false);
  const [newPageLayoutName, setNewPageLayoutName] = useState('');
  const [pageLayoutHasChanges, setPageLayoutHasChanges] = useState(false);

  // Page layout customization state
  const [customShowWizard, setCustomShowWizard] = useState(true);
  const [customShowAIPreset, setCustomShowAIPreset] = useState(true);
  const [customShowUIFramework, setCustomShowUIFramework] = useState(true);
  const [customShowWorkspace, setCustomShowWorkspace] = useState(true);
  const [customShowTitle, setCustomShowTitle] = useState(true);
  const [customShowDescription, setCustomShowDescription] = useState(true);
  const [customShowInfoButton, setCustomShowInfoButton] = useState(true);

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [currentUser]);

  // Load page layouts from localStorage on mount
  useEffect(() => {
    // Load custom page layouts
    const savedCustomLayouts = localStorage.getItem(INTENTR_CUSTOM_PAGE_LAYOUTS_KEY);
    if (savedCustomLayouts) {
      try {
        const customLayouts = JSON.parse(savedCustomLayouts);
        setPageLayouts([...DEFAULT_LAYOUTS, ...customLayouts]);
      } catch (e) {
        console.error('Failed to parse custom page layouts:', e);
      }
    }

    // Load active page layout
    const savedActiveLayout = localStorage.getItem(INTENTR_APP_PAGE_LAYOUT_KEY);
    if (savedActiveLayout) {
      try {
        const activeConfig = JSON.parse(savedActiveLayout);
        setActivePageLayoutId(activeConfig.id || null);
        setSelectedPageLayoutId(activeConfig.id || 'standard');
      } catch (e) {
        console.error('Failed to parse active page layout:', e);
      }
    }

    // Wizard flows are now loaded from WizardContext (which loads from workspace)
  }, []);

  // Sync wizard flows from context (workspace) when they change
  useEffect(() => {
    console.log('[Admin] Sync effect triggered');
    console.log('[Admin] contextFlows:', contextFlows);
    console.log('[Admin] contextSubpages:', contextSubpages);
    if (contextFlows) {
      console.log('[Admin] Setting wizardFlows from contextFlows');
      setWizardFlows({ ...DEFAULT_WIZARD_FLOWS, ...contextFlows });
    }
    if (contextSubpages) {
      console.log('[Admin] Setting sectionSubpages from contextSubpages');
      setSectionSubpages({ ...DEFAULT_SECTION_SUBPAGES, ...contextSubpages });
    }
  }, [contextFlows, contextSubpages]);

  // Wizard Flow handler functions
  const getCurrentFlowSteps = useCallback(() => {
    return wizardFlows[selectedFlowType] || [];
  }, [wizardFlows, selectedFlowType]);

  const getAvailableStepsForFlow = useCallback(() => {
    const currentSteps = getCurrentFlowSteps();
    return AVAILABLE_STEPS.filter(step => !currentSteps.includes(step.id));
  }, [getCurrentFlowSteps]);

  const handleDragStart = useCallback((stepId: string) => {
    setDraggedStep(stepId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDropOnStep = useCallback((targetIndex: number) => {
    if (!draggedStep) return;

    const currentSteps = [...getCurrentFlowSteps()];
    const draggedIndex = currentSteps.indexOf(draggedStep);

    if (draggedIndex === -1) {
      // Adding from available pool
      currentSteps.splice(targetIndex, 0, draggedStep);
    } else {
      // Reordering within the flow
      currentSteps.splice(draggedIndex, 1);
      currentSteps.splice(targetIndex, 0, draggedStep);
    }

    setWizardFlows(prev => ({
      ...prev,
      [selectedFlowType]: currentSteps,
    }));
    setWizardFlowsHasChanges(true);
    setDraggedStep(null);
    setDragOverIndex(null);
  }, [draggedStep, getCurrentFlowSteps, selectedFlowType]);

  const handleDropOnAvailable = useCallback(() => {
    if (!draggedStep) return;

    const currentSteps = getCurrentFlowSteps();
    if (currentSteps.includes(draggedStep)) {
      // Remove from flow
      setWizardFlows(prev => ({
        ...prev,
        [selectedFlowType]: currentSteps.filter(id => id !== draggedStep),
      }));
      setWizardFlowsHasChanges(true);
    }
    setDraggedStep(null);
    setDragOverIndex(null);
  }, [draggedStep, getCurrentFlowSteps, selectedFlowType]);

  const handleAddStep = useCallback((stepId: string) => {
    const currentSteps = getCurrentFlowSteps();
    if (!currentSteps.includes(stepId)) {
      setWizardFlows(prev => ({
        ...prev,
        [selectedFlowType]: [...currentSteps, stepId],
      }));
      setWizardFlowsHasChanges(true);
    }
  }, [getCurrentFlowSteps, selectedFlowType]);

  const handleRemoveStep = useCallback((stepId: string) => {
    const currentSteps = getCurrentFlowSteps();
    setWizardFlows(prev => ({
      ...prev,
      [selectedFlowType]: currentSteps.filter(id => id !== stepId),
    }));
    setWizardFlowsHasChanges(true);
  }, [getCurrentFlowSteps, selectedFlowType]);

  const handleMoveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    const currentSteps = [...getCurrentFlowSteps()];
    const index = currentSteps.indexOf(stepId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentSteps.length) return;

    currentSteps.splice(index, 1);
    currentSteps.splice(newIndex, 0, stepId);

    setWizardFlows(prev => ({
      ...prev,
      [selectedFlowType]: currentSteps,
    }));
    setWizardFlowsHasChanges(true);
  }, [getCurrentFlowSteps, selectedFlowType]);

  const handleSaveWizardFlows = useCallback(async () => {
    console.log('[Admin] handleSaveWizardFlows called');
    console.log('[Admin] currentWorkspace:', currentWorkspace?.id, currentWorkspace?.name);
    console.log('[Admin] wizardFlows to save:', wizardFlows);
    console.log('[Admin] sectionSubpages to save:', sectionSubpages);

    if (!currentWorkspace) {
      console.log('[Admin] No workspace selected, showing error');
      setError('No workspace selected. Please select a workspace first.');
      return;
    }

    try {
      // Save to workspace via WizardContext
      console.log('[Admin] Calling saveFlowsToWorkspace...');
      await saveFlowsToWorkspace(wizardFlows, sectionSubpages);
      console.log('[Admin] saveFlowsToWorkspace completed successfully');
      setWizardFlowsHasChanges(false);
      setShowWizardFlowsSuccess(true);
      setTimeout(() => setShowWizardFlowsSuccess(false), 3000);
    } catch (err) {
      console.error('[Admin] Failed to save wizard flows:', err);
      setError('Failed to save wizard flows to workspace.');
    }
  }, [wizardFlows, sectionSubpages, saveFlowsToWorkspace, currentWorkspace]);

  const handleResetWizardFlows = useCallback(() => {
    setWizardFlows(DEFAULT_WIZARD_FLOWS);
    setSectionSubpages(DEFAULT_SECTION_SUBPAGES);
    setWizardFlowsHasChanges(true);
  }, []);

  const handleResetCurrentFlow = useCallback(() => {
    setWizardFlows(prev => ({
      ...prev,
      [selectedFlowType]: DEFAULT_WIZARD_FLOWS[selectedFlowType],
    }));
    // Also reset subpages for sections in current flow
    const flowSections = DEFAULT_WIZARD_FLOWS[selectedFlowType];
    setSectionSubpages(prev => {
      const updated = { ...prev };
      flowSections.forEach(sectionId => {
        updated[sectionId] = DEFAULT_SECTION_SUBPAGES[sectionId] || [];
      });
      return updated;
    });
    setWizardFlowsHasChanges(true);
  }, [selectedFlowType]);

  // Section expand/collapse handlers
  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Subpage handler functions
  const getSectionSubpages = useCallback((sectionId: string) => {
    return sectionSubpages[sectionId] || [];
  }, [sectionSubpages]);

  const getAvailableSubpagesForSection = useCallback((sectionId: string) => {
    const currentSubpages = getSectionSubpages(sectionId);
    const allSubpages = AVAILABLE_SUBPAGES[sectionId] || [];
    return allSubpages.filter(sp => !currentSubpages.includes(sp.id));
  }, [getSectionSubpages]);

  const handleSubpageDragStart = useCallback((sectionId: string, subpageId: string) => {
    // Use ref to avoid re-render during drag start
    draggedSubpageRef.current = { sectionId, subpageId };
    // Delay state update to after drag has started
    requestAnimationFrame(() => {
      setDraggedSubpage({ sectionId, subpageId });
    });
  }, []);

  const handleSubpageDragOver = useCallback((e: React.DragEvent, sectionId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSubpageIndex({ sectionId, index });
  }, []);

  const handleSubpageDragLeave = useCallback(() => {
    setDragOverSubpageIndex(null);
  }, []);

  const handleSubpageDrop = useCallback((targetSectionId: string, targetIndex: number) => {
    // Use ref for immediate access (state may not be updated yet)
    const dragged = draggedSubpageRef.current || draggedSubpage;
    if (!dragged) return;

    const { sectionId: sourceSectionId, subpageId } = dragged;

    if (sourceSectionId === targetSectionId) {
      // Reordering within same section
      const currentSubpages = [...getSectionSubpages(sourceSectionId)];
      const draggedIndex = currentSubpages.indexOf(subpageId);

      if (draggedIndex !== -1) {
        currentSubpages.splice(draggedIndex, 1);
        currentSubpages.splice(targetIndex, 0, subpageId);

        setSectionSubpages(prev => ({
          ...prev,
          [sourceSectionId]: currentSubpages,
        }));
        setWizardFlowsHasChanges(true);
      }
    } else {
      // Moving between sections
      const sourceSubpages = [...getSectionSubpages(sourceSectionId)];
      const targetSubpages = [...getSectionSubpages(targetSectionId)];

      // Remove from source section
      const draggedIndex = sourceSubpages.indexOf(subpageId);
      if (draggedIndex !== -1) {
        sourceSubpages.splice(draggedIndex, 1);
      }

      // Add to target section at the specified index
      targetSubpages.splice(targetIndex, 0, subpageId);

      setSectionSubpages(prev => ({
        ...prev,
        [sourceSectionId]: sourceSubpages,
        [targetSectionId]: targetSubpages,
      }));
      setWizardFlowsHasChanges(true);
    }

    draggedSubpageRef.current = null;
    setDraggedSubpage(null);
    setDragOverSubpageIndex(null);
  }, [draggedSubpage, getSectionSubpages]);

  const handleAddSubpage = useCallback((sectionId: string, subpageId: string) => {
    const currentSubpages = getSectionSubpages(sectionId);
    if (!currentSubpages.includes(subpageId)) {
      setSectionSubpages(prev => ({
        ...prev,
        [sectionId]: [...currentSubpages, subpageId],
      }));
      setWizardFlowsHasChanges(true);
    }
  }, [getSectionSubpages]);

  const handleRemoveSubpage = useCallback((sectionId: string, subpageId: string) => {
    const currentSubpages = getSectionSubpages(sectionId);
    setSectionSubpages(prev => ({
      ...prev,
      [sectionId]: currentSubpages.filter(id => id !== subpageId),
    }));
    setWizardFlowsHasChanges(true);
  }, [getSectionSubpages]);

  const handleMoveSubpage = useCallback((sectionId: string, subpageId: string, direction: 'up' | 'down') => {
    const currentSubpages = [...getSectionSubpages(sectionId)];
    const index = currentSubpages.indexOf(subpageId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentSubpages.length) return;

    currentSubpages.splice(index, 1);
    currentSubpages.splice(newIndex, 0, subpageId);

    setSectionSubpages(prev => ({
      ...prev,
      [sectionId]: currentSubpages,
    }));
    setWizardFlowsHasChanges(true);
  }, [getSectionSubpages]);

  const handleResetSectionSubpages = useCallback((sectionId: string) => {
    setSectionSubpages(prev => ({
      ...prev,
      [sectionId]: DEFAULT_SECTION_SUBPAGES[sectionId] || [],
    }));
    setWizardFlowsHasChanges(true);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authClient.get('/api/users');
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await authClient.post('/api/users', createForm);
      setSuccess('User created successfully');
      setShowCreateForm(false);
      setCreateForm({ email: '', password: '', name: '', role: 'engineer' });
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: number) => {
    try {
      setError(null);
      // Only send fields that have values
      const updateData: any = {};
      if (editForm.email) updateData.email = editForm.email;
      if (editForm.password) updateData.password = editForm.password;
      if (editForm.name) updateData.name = editForm.name;
      if (editForm.role) updateData.role = editForm.role;
      if (editForm.isActive !== undefined) updateData.isActive = editForm.isActive;

      await authClient.put(`/api/users/${userId}`, updateData);
      setSuccess('User updated successfully');
      setEditingUser(null);
      setEditForm({});
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      setError(null);
      await authClient.delete(`/api/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const openResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
  };

  const closeResetPassword = () => {
    setResetPasswordUser(null);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (resetPasswordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError(null);
      await authClient.put(`/api/users/${resetPasswordUser.id}`, {
        password: resetPasswordForm.newPassword,
      });
      setSuccess(`Password reset successfully for ${resetPasswordUser.name}`);
      closeResetPassword();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
  };

  // Page Layout handler functions
  const handleSelectPageLayout = (id: string) => {
    setSelectedPageLayoutId(id);
    const layout = pageLayouts.find(l => l.id === id);
    if (layout) {
      setCustomShowWizard(layout.showWizard);
      setCustomShowAIPreset(layout.showAIPreset);
      setCustomShowUIFramework(layout.showUIFramework);
      setCustomShowWorkspace(layout.showWorkspace);
      setCustomShowTitle(layout.showTitle);
      setCustomShowDescription(layout.showDescription);
      setCustomShowInfoButton(layout.showInfoButton);
      setPageLayoutHasChanges(false);
    }
  };

  const handleActivatePageLayout = () => {
    const layout = pageLayouts.find(l => l.id === selectedPageLayoutId);
    if (layout) {
      // Save to localStorage for global app setting
      localStorage.setItem(INTENTR_APP_PAGE_LAYOUT_KEY, JSON.stringify(layout));
      setActivePageLayoutId(selectedPageLayoutId);
      setShowPageLayoutSuccess(true);
      setTimeout(() => setShowPageLayoutSuccess(false), 3000);

      // Dispatch a custom event so PageLayout components can react
      window.dispatchEvent(new CustomEvent('intentr-page-layout-changed', { detail: layout }));
    }
  };

  const handlePageLayoutCustomize = () => {
    const layout = pageLayouts.find(l => l.id === selectedPageLayoutId);
    if (layout) {
      setCustomShowWizard(layout.showWizard);
      setCustomShowAIPreset(layout.showAIPreset);
      setCustomShowUIFramework(layout.showUIFramework);
      setCustomShowWorkspace(layout.showWorkspace);
      setCustomShowTitle(layout.showTitle);
      setCustomShowDescription(layout.showDescription);
      setCustomShowInfoButton(layout.showInfoButton);
    }
    setShowPageLayoutCustomizeModal(true);
  };

  const handlePageLayoutCustomizationChange = (field: string, value: boolean) => {
    setPageLayoutHasChanges(true);
    switch (field) {
      case 'showWizard': setCustomShowWizard(value); break;
      case 'showAIPreset': setCustomShowAIPreset(value); break;
      case 'showUIFramework': setCustomShowUIFramework(value); break;
      case 'showWorkspace': setCustomShowWorkspace(value); break;
      case 'showTitle': setCustomShowTitle(value); break;
      case 'showDescription': setCustomShowDescription(value); break;
      case 'showInfoButton': setCustomShowInfoButton(value); break;
    }
  };

  const handleSaveCustomPageLayout = () => {
    if (!newPageLayoutName.trim()) return;

    const newLayout: PageLayoutConfig = {
      id: `custom-${Date.now()}`,
      name: newPageLayoutName.trim(),
      showWizard: customShowWizard,
      showAIPreset: customShowAIPreset,
      showUIFramework: customShowUIFramework,
      showWorkspace: customShowWorkspace,
      showTitle: customShowTitle,
      showDescription: customShowDescription,
      showInfoButton: customShowInfoButton,
    };

    // Get existing custom layouts
    const savedCustomLayouts = localStorage.getItem(INTENTR_CUSTOM_PAGE_LAYOUTS_KEY);
    let customLayouts: PageLayoutConfig[] = [];
    if (savedCustomLayouts) {
      try {
        customLayouts = JSON.parse(savedCustomLayouts);
      } catch (e) {
        customLayouts = [];
      }
    }

    // Add new layout
    customLayouts.push(newLayout);
    localStorage.setItem(INTENTR_CUSTOM_PAGE_LAYOUTS_KEY, JSON.stringify(customLayouts));

    // Update state
    setPageLayouts([...DEFAULT_LAYOUTS, ...customLayouts]);
    setSelectedPageLayoutId(newLayout.id);
    setShowPageLayoutSaveModal(false);
    setNewPageLayoutName('');
    setPageLayoutHasChanges(false);
  };

  const handleDeletePageLayout = (id: string) => {
    if (!id.startsWith('custom-')) return; // Can only delete custom layouts

    const savedCustomLayouts = localStorage.getItem(INTENTR_CUSTOM_PAGE_LAYOUTS_KEY);
    if (savedCustomLayouts) {
      try {
        let customLayouts: PageLayoutConfig[] = JSON.parse(savedCustomLayouts);
        customLayouts = customLayouts.filter(l => l.id !== id);
        localStorage.setItem(INTENTR_CUSTOM_PAGE_LAYOUTS_KEY, JSON.stringify(customLayouts));
        setPageLayouts([...DEFAULT_LAYOUTS, ...customLayouts]);

        if (selectedPageLayoutId === id) {
          setSelectedPageLayoutId('standard');
        }
        if (activePageLayoutId === id) {
          localStorage.removeItem(INTENTR_APP_PAGE_LAYOUT_KEY);
          setActivePageLayoutId(null);
        }
      } catch (e) {
        console.error('Failed to delete layout:', e);
      }
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div>
        <h1>Access Denied</h1>
        <Alert variant="error" message="You do not have permission to access this page." />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Admin Panel</h1>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--color-grey-200)',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'users' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'users' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'users' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'roles' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'roles' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'roles' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          Role Management
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'integrations' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'integrations' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'integrations' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          Integrations
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'settings' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'settings' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'settings' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('pageLayouts')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'pageLayouts' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'pageLayouts' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'pageLayouts' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          Page Layouts
        </button>
        <button
          onClick={() => setActiveTab('wizardFlows')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'wizardFlows' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'wizardFlows' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'wizardFlows' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          Wizard Flows
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>User Management</h2>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? 'Cancel' : 'Create New User'}
            </Button>
          </div>

          {error && <Alert variant="error" message={error} />}
          {success && <Alert variant="success" message={success} />}

      {showCreateForm && (
        <Card style={{ marginBottom: '20px' }}>
          <h2>Create New User</h2>
          <form onSubmit={handleCreateUser}>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label htmlFor="create-email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                <input
                  id="create-email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                />
              </div>
              <div>
                <label htmlFor="create-password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
                <input
                  id="create-password"
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                />
              </div>
              <div>
                <label htmlFor="create-name" style={{ display: 'block', marginBottom: '5px' }}>Name</label>
                <input
                  id="create-name"
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                />
              </div>
              <div>
                <label htmlFor="create-role" style={{ display: 'block', marginBottom: '5px' }}>Role</label>
                <select
                  id="create-role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                >
                  <option value="product_owner">Product Owner</option>
                  <option value="designer">Designer</option>
                  <option value="engineer">Engineer</option>
                  <option value="devops">DevOps</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <Card>
          <h2>All Users</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-grey-300)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Email</th>
                  <th style={{ padding: '10px' }}>Name</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Last Login</th>
                  <th style={{ padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-grey-200)' }}>
                    {editingUser === user.id ? (
                      <>
                        <td style={{ padding: '10px' }}>{user.id}</td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <select
                            value={editForm.role || 'engineer'}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                          >
                            <option value="product_owner">Product Owner</option>
                            <option value="designer">Designer</option>
                            <option value="engineer">Engineer</option>
                            <option value="devops">DevOps</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <select
                            value={editForm.isActive ? 'active' : 'inactive'}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <Button size="small" onClick={() => handleUpdateUser(user.id)}>Save</Button>
                            <Button size="small" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px' }}>{user.id}</td>
                        <td style={{ padding: '10px' }}>{user.email}</td>
                        <td style={{ padding: '10px' }}>{user.name}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: user.role === 'admin' ? 'var(--color-primary-100)' : 'var(--color-grey-200)',
                            color: user.role === 'admin' ? 'var(--color-primary-800)' : 'var(--color-grey-800)',
                          }}>
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: user.isActive ? 'var(--color-success-100)' : 'var(--color-error-100)',
                            color: user.isActive ? 'var(--color-success-800)' : 'var(--color-error-800)',
                          }}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <Button size="small" onClick={() => startEditUser(user)}>Edit</Button>
                            <Button
                              size="small"
                              variant="secondary"
                              onClick={() => openResetPassword(user)}
                            >
                              Reset Password
                            </Button>
                            <Button
                              size="small"
                              variant="secondary"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </>
    ) : activeTab === 'roles' ? (
      <RoleManagement />
    ) : activeTab === 'integrations' ? (
      <Integrations />
    ) : activeTab === 'settings' ? (
      <Settings />
    ) : activeTab === 'pageLayouts' ? (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>IntentR Page Layouts</h2>
          <p style={{ color: 'var(--color-grey-600)', margin: 0 }}>
            Configure the page layout for the IntentR application. Changes here affect how all pages in IntentR are displayed.
          </p>
        </div>

        {showPageLayoutSuccess && (
          <Alert variant="success" message="Page layout activated successfully! The change will apply across all IntentR pages." />
        )}

        {/* Layout Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {pageLayouts.map(layout => (
            <Card
              key={layout.id}
              onClick={() => handleSelectPageLayout(layout.id)}
              style={{
                cursor: 'pointer',
                border: selectedPageLayoutId === layout.id
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-grey-200)',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {activePageLayoutId === layout.id && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'var(--color-success)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  ACTIVE
                </div>
              )}
              <h3 style={{ margin: '0 0 12px 0' }}>{layout.name}</h3>

              {/* Preview of what elements are shown */}
              <div style={{
                background: 'var(--color-grey-50)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--color-grey-600)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {layout.showWizard && <span style={{ background: 'var(--color-blue-100)', padding: '2px 6px', borderRadius: '4px' }}>Wizard</span>}
                    {layout.showAIPreset && <span style={{ background: 'var(--color-green-100)', padding: '2px 6px', borderRadius: '4px' }}>AI Preset</span>}
                    {layout.showUIFramework && <span style={{ background: 'var(--color-purple-100)', padding: '2px 6px', borderRadius: '4px' }}>UI Framework</span>}
                    {layout.showWorkspace && <span style={{ background: 'var(--color-orange-100)', padding: '2px 6px', borderRadius: '4px' }}>Workspace</span>}
                    {layout.showTitle && <span style={{ background: 'var(--color-grey-200)', padding: '2px 6px', borderRadius: '4px' }}>Title</span>}
                    {layout.showDescription && <span style={{ background: 'var(--color-grey-200)', padding: '2px 6px', borderRadius: '4px' }}>Description</span>}
                    {layout.showInfoButton && <span style={{ background: 'var(--color-grey-200)', padding: '2px 6px', borderRadius: '4px' }}>Info</span>}
                  </div>
                </div>
              </div>

              {/* Delete button for custom layouts */}
              {layout.id.startsWith('custom-') && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this custom layout?')) {
                      handleDeletePageLayout(layout.id);
                    }
                  }}
                  style={{ marginTop: '8px' }}
                >
                  Delete
                </Button>
              )}
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <Button onClick={handleActivatePageLayout} disabled={selectedPageLayoutId === activePageLayoutId}>
            Activate Layout
          </Button>
          <Button variant="secondary" onClick={handlePageLayoutCustomize}>
            Customize
          </Button>
        </div>

        {/* Customize Modal */}
        {showPageLayoutCustomizeModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: 'var(--color-surface, white)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ margin: '0 0 16px 0' }}>Customize Page Layout</h3>
              <p style={{ color: 'var(--color-grey-600)', marginBottom: '20px' }}>
                Toggle which elements appear in the page header across IntentR.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {[
                  { key: 'showWizard', label: 'Show Wizard Button', value: customShowWizard },
                  { key: 'showAIPreset', label: 'Show AI Preset Indicator', value: customShowAIPreset },
                  { key: 'showUIFramework', label: 'Show UI Framework Indicator', value: customShowUIFramework },
                  { key: 'showWorkspace', label: 'Show Workspace Bar', value: customShowWorkspace },
                  { key: 'showTitle', label: 'Show Page Title', value: customShowTitle },
                  { key: 'showDescription', label: 'Show Description', value: customShowDescription },
                  { key: 'showInfoButton', label: 'Show Info Button', value: customShowInfoButton },
                ].map(item => (
                  <label key={item.key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'var(--color-grey-50)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={item.value}
                      onChange={(e) => handlePageLayoutCustomizationChange(item.key, e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setShowPageLayoutCustomizeModal(false)}>
                  Cancel
                </Button>
                {pageLayoutHasChanges && (
                  <Button onClick={() => {
                    setShowPageLayoutCustomizeModal(false);
                    setShowPageLayoutSaveModal(true);
                  }}>
                    Save as New Layout
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save New Layout Modal */}
        {showPageLayoutSaveModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: 'var(--color-surface, white)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px'
            }}>
              <h3 style={{ margin: '0 0 16px 0' }}>Save Custom Layout</h3>
              <p style={{ color: 'var(--color-grey-600)', marginBottom: '20px' }}>
                Enter a name for your custom page layout.
              </p>

              <input
                type="text"
                value={newPageLayoutName}
                onChange={(e) => setNewPageLayoutName(e.target.value)}
                placeholder="Layout name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-grey-300)',
                  marginBottom: '20px',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => {
                  setShowPageLayoutSaveModal(false);
                  setNewPageLayoutName('');
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCustomPageLayout} disabled={!newPageLayoutName.trim()}>
                  Save Layout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    ) : activeTab === 'wizardFlows' ? (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0' }}>Wizard Flow Configuration</h2>
          <p style={{ color: 'var(--color-grey-600)', margin: 0 }}>
            Configure the step order for each wizard flow type. Drag steps to reorder, or use the buttons to add/remove steps.
          </p>
        </div>

        {showWizardFlowsSuccess && (
          <Alert variant="success" message="Wizard flows saved successfully! Changes will apply to new wizard sessions." />
        )}

        {/* Flow Type Selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            Select Flow Type
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {(['new', 'refactor', 'enhance', 'reverse-engineer'] as WizardFlowType[]).map(flowType => (
              <button
                key={flowType}
                onClick={() => setSelectedFlowType(flowType)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: selectedFlowType === flowType ? '2px solid var(--color-primary)' : '2px solid var(--color-grey-300)',
                  background: selectedFlowType === flowType ? 'var(--color-primary-50)' : 'white',
                  color: selectedFlowType === flowType ? 'var(--color-primary-700)' : 'var(--color-grey-700)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'capitalize',
                }}
              >
                {flowType.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Current Flow Steps */}
          <Card>
            <h3 style={{ margin: '0 0 16px 0' }}>
              Current Steps ({getCurrentFlowSteps().length})
            </h3>
            <p style={{ color: 'var(--color-grey-600)', fontSize: '14px', marginBottom: '16px' }}>
              Drag to reorder or remove steps from the flow.
            </p>

            <div
              style={{
                minHeight: '200px',
                border: '2px dashed var(--color-grey-300)',
                borderRadius: '8px',
                padding: '12px',
                background: 'var(--color-grey-50)',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (getCurrentFlowSteps().length === 0) {
                  setDragOverIndex(0);
                }
              }}
              onDrop={() => {
                if (getCurrentFlowSteps().length === 0) {
                  handleDropOnStep(0);
                }
              }}
            >
              {getCurrentFlowSteps().length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '176px',
                  color: 'var(--color-grey-500)',
                  fontStyle: 'italic',
                }}>
                  Drag steps here to add them to this flow
                </div>
              ) : (
                getCurrentFlowSteps().map((stepId, index) => {
                  const step = AVAILABLE_STEPS.find(s => s.id === stepId);
                  if (!step) return null;
                  const isExpanded = expandedSections.has(stepId);
                  const currentSubpages = getSectionSubpages(stepId);
                  const availableSubpages = getAvailableSubpagesForSection(stepId);

                  return (
                    <div key={stepId} style={{ marginBottom: '8px', position: 'relative', zIndex: isExpanded ? 1 : 'auto' }}>
                      {/* Section Header */}
                      <div
                        draggable={!draggedSubpage}
                        onDragStart={() => !draggedSubpage && handleDragStart(stepId)}
                        onDragOver={(e) => {
                          if (draggedSubpage) {
                            // Subpage being dragged - allow drop on section header
                            e.preventDefault();
                            e.stopPropagation();
                            // Auto-expand section when dragging over it
                            if (!isExpanded) {
                              setExpandedSections(prev => new Set([...prev, stepId]));
                            }
                            setDragOverSubpageIndex({ sectionId: stepId, index: currentSubpages.length });
                          } else {
                            handleDragOver(e, index);
                          }
                        }}
                        onDragLeave={() => {
                          if (draggedSubpage) {
                            setDragOverSubpageIndex(null);
                          } else {
                            handleDragLeave();
                          }
                        }}
                        onDrop={() => {
                          if (draggedSubpage) {
                            handleSubpageDrop(stepId, currentSubpages.length);
                          } else {
                            handleDropOnStep(index);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedStep(null);
                          setDragOverIndex(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: draggedStep === stepId
                            ? 'var(--color-grey-200)'
                            : draggedSubpage && draggedSubpage.sectionId !== stepId
                              ? 'var(--color-primary-50)'
                              : 'white',
                          border: dragOverIndex === index
                            ? '2px solid var(--color-primary)'
                            : draggedSubpage && draggedSubpage.sectionId !== stepId && dragOverSubpageIndex?.sectionId === stepId
                              ? '2px dashed var(--color-primary)'
                              : draggedSubpage && draggedSubpage.sectionId !== stepId
                                ? '2px dashed var(--color-grey-400)'
                                : '1px solid var(--color-grey-200)',
                          borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                          cursor: draggedSubpage ? 'default' : 'grab',
                          opacity: draggedStep === stepId ? 0.5 : 1,
                          transition: 'all 0.15s ease',
                          position: 'relative',
                          zIndex: 5,
                        }}
                      >
                        {/* Drag Handle */}
                        <span style={{ color: 'var(--color-grey-400)', fontSize: '16px', cursor: 'grab' }}>
                          ⋮⋮
                        </span>

                        {/* Expand/Collapse Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSectionExpanded(stepId);
                          }}
                          style={{
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '4px',
                            background: 'var(--color-grey-100)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'transform 0.2s ease',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          }}
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          ▶
                        </button>

                        {/* Step Number */}
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {index + 1}
                        </span>

                        {/* Step Icon */}
                        <span style={{ fontSize: '20px' }}>{step.icon}</span>

                        {/* Step Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{step.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-grey-600)' }}>
                            {currentSubpages.length} page{currentSubpages.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveStep(stepId, 'up'); }}
                            disabled={index === 0}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid var(--color-grey-300)',
                              borderRadius: '4px',
                              background: 'white',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              opacity: index === 0 ? 0.5 : 1,
                            }}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveStep(stepId, 'down'); }}
                            disabled={index === getCurrentFlowSteps().length - 1}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid var(--color-grey-300)',
                              borderRadius: '4px',
                              background: 'white',
                              cursor: index === getCurrentFlowSteps().length - 1 ? 'not-allowed' : 'pointer',
                              opacity: index === getCurrentFlowSteps().length - 1 ? 0.5 : 1,
                            }}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveStep(stepId); }}
                            style={{
                              padding: '4px 8px',
                              border: '1px solid var(--color-error-300)',
                              borderRadius: '4px',
                              background: 'var(--color-error-50)',
                              color: 'var(--color-error-700)',
                              cursor: 'pointer',
                            }}
                            title="Remove section"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Expanded Subpages Section */}
                      {isExpanded && (
                        <div style={{
                          borderLeft: '1px solid var(--color-grey-200)',
                          borderRight: '1px solid var(--color-grey-200)',
                          borderBottom: '1px solid var(--color-grey-200)',
                          borderRadius: '0 0 8px 8px',
                          background: 'var(--color-grey-50)',
                          padding: '12px',
                          position: 'relative',
                          zIndex: 10,
                        }}>
                          {/* Current Subpages */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-grey-700)' }}>
                                Pages in this section:
                              </span>
                              <button
                                onClick={() => handleResetSectionSubpages(stepId)}
                                style={{
                                  padding: '2px 8px',
                                  border: '1px solid var(--color-grey-300)',
                                  borderRadius: '4px',
                                  background: 'white',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  color: 'var(--color-grey-600)',
                                }}
                                title="Reset to defaults"
                              >
                                Reset
                              </button>
                            </div>

                            {currentSubpages.length === 0 ? (
                              <div
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDragOverSubpageIndex({ sectionId: stepId, index: 0 });
                                }}
                                onDragLeave={handleSubpageDragLeave}
                                onDrop={(e) => {
                                  e.stopPropagation();
                                  handleSubpageDrop(stepId, 0);
                                }}
                                style={{
                                  padding: '12px',
                                  textAlign: 'center',
                                  color: draggedSubpage ? 'var(--color-primary)' : 'var(--color-grey-500)',
                                  fontSize: '13px',
                                  fontStyle: 'italic',
                                  border: dragOverSubpageIndex?.sectionId === stepId && dragOverSubpageIndex?.index === 0 && draggedSubpage
                                    ? '2px dashed var(--color-primary)'
                                    : draggedSubpage
                                      ? '2px dashed var(--color-grey-400)'
                                      : '1px dashed var(--color-grey-300)',
                                  borderRadius: '4px',
                                  background: dragOverSubpageIndex?.sectionId === stepId && dragOverSubpageIndex?.index === 0 && draggedSubpage
                                    ? 'var(--color-primary-50)'
                                    : 'transparent',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {draggedSubpage ? 'Drop page here' : 'No pages configured. Add pages below.'}
                              </div>
                            ) : (
                              <>
                                {currentSubpages.map((subpageId, spIndex) => {
                                  // Use flat lookup to find subpage even if it was moved from another section
                                  const subpage = ALL_SUBPAGES_FLAT[subpageId];
                                  // If subpage not found in any section, create a fallback entry
                                  const displaySubpage = subpage || { id: subpageId, name: `Unknown: ${subpageId}` };
                                  const isMissingSubpage = !subpage;

                                  return (
                                    <div
                                      key={subpageId}
                                      draggable={true}
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        handleSubpageDragStart(stepId, subpageId);
                                      }}
                                      onDragOver={(e) => handleSubpageDragOver(e, stepId, spIndex)}
                                      onDragLeave={handleSubpageDragLeave}
                                      onDrop={(e) => {
                                        e.stopPropagation();
                                        handleSubpageDrop(stepId, spIndex);
                                      }}
                                      onDragEnd={() => {
                                        draggedSubpageRef.current = null;
                                        setDraggedSubpage(null);
                                        setDragOverSubpageIndex(null);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        marginBottom: '4px',
                                        background: draggedSubpage?.subpageId === subpageId ? 'var(--color-grey-200)' : 'white',
                                        border: dragOverSubpageIndex?.sectionId === stepId && dragOverSubpageIndex?.index === spIndex
                                          ? '2px solid var(--color-primary)'
                                          : '1px solid var(--color-grey-200)',
                                        borderRadius: '4px',
                                        cursor: 'grab',
                                        opacity: draggedSubpage?.subpageId === subpageId ? 0.5 : 1,
                                        fontSize: '13px',
                                        pointerEvents: 'auto',
                                      }}
                                    >
                                      <span style={{ color: 'var(--color-grey-400)', fontSize: '12px', cursor: 'grab' }}>⋮⋮</span>
                                      <span style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: 'var(--color-grey-300)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        flexShrink: 0,
                                      }}>
                                        {spIndex + 1}
                                      </span>
                                      <span style={{
                                        flex: 1,
                                        color: isMissingSubpage ? 'var(--color-error-600)' : 'inherit',
                                        fontStyle: isMissingSubpage ? 'italic' : 'normal',
                                      }}>
                                        {displaySubpage.name}
                                      </span>
                                      <div style={{ display: 'flex', gap: '2px' }}>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleMoveSubpage(stepId, subpageId, 'up'); }}
                                          disabled={spIndex === 0}
                                          style={{
                                            padding: '2px 6px',
                                            border: '1px solid var(--color-grey-300)',
                                            borderRadius: '3px',
                                            background: 'white',
                                            cursor: spIndex === 0 ? 'not-allowed' : 'pointer',
                                            opacity: spIndex === 0 ? 0.5 : 1,
                                            fontSize: '11px',
                                          }}
                                        >
                                          ↑
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleMoveSubpage(stepId, subpageId, 'down'); }}
                                          disabled={spIndex === currentSubpages.length - 1}
                                          style={{
                                            padding: '2px 6px',
                                            border: '1px solid var(--color-grey-300)',
                                            borderRadius: '3px',
                                            background: 'white',
                                            cursor: spIndex === currentSubpages.length - 1 ? 'not-allowed' : 'pointer',
                                            opacity: spIndex === currentSubpages.length - 1 ? 0.5 : 1,
                                            fontSize: '11px',
                                          }}
                                        >
                                          ↓
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleRemoveSubpage(stepId, subpageId); }}
                                          style={{
                                            padding: '2px 6px',
                                            border: '1px solid var(--color-error-300)',
                                            borderRadius: '3px',
                                            background: 'var(--color-error-50)',
                                            color: 'var(--color-error-700)',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                {/* Drop zone at end of list */}
                                {draggedSubpage && draggedSubpage.sectionId !== stepId && (
                                  <div
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverSubpageIndex({ sectionId: stepId, index: currentSubpages.length });
                                    }}
                                    onDragLeave={handleSubpageDragLeave}
                                    onDrop={(e) => {
                                      e.stopPropagation();
                                      handleSubpageDrop(stepId, currentSubpages.length);
                                    }}
                                    style={{
                                      padding: '10px',
                                      textAlign: 'center',
                                      color: 'var(--color-primary)',
                                      fontSize: '12px',
                                      border: dragOverSubpageIndex?.sectionId === stepId && dragOverSubpageIndex?.index === currentSubpages.length
                                        ? '2px dashed var(--color-primary)'
                                        : '2px dashed var(--color-grey-300)',
                                      borderRadius: '4px',
                                      background: dragOverSubpageIndex?.sectionId === stepId && dragOverSubpageIndex?.index === currentSubpages.length
                                        ? 'var(--color-primary-50)'
                                        : 'transparent',
                                      marginTop: '4px',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    Drop page here to add at end
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Available Subpages */}
                          {availableSubpages.length > 0 && (
                            <div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-grey-700)', display: 'block', marginBottom: '8px' }}>
                                Available pages to add:
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {availableSubpages.map(subpage => (
                                  <button
                                    key={subpage.id}
                                    onClick={() => handleAddSubpage(stepId, subpage.id)}
                                    style={{
                                      padding: '4px 10px',
                                      border: '1px solid var(--color-success-300)',
                                      borderRadius: '4px',
                                      background: 'var(--color-success-50)',
                                      color: 'var(--color-success-700)',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                    title={`Add ${subpage.name}`}
                                  >
                                    + {subpage.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Available Steps Pool */}
          <Card>
            <h3 style={{ margin: '0 0 16px 0' }}>
              Available Steps ({getAvailableStepsForFlow().length})
            </h3>
            <p style={{ color: 'var(--color-grey-600)', fontSize: '14px', marginBottom: '16px' }}>
              Drag steps to the flow, or click + to add them.
            </p>

            <div
              style={{
                minHeight: '200px',
                border: '2px dashed var(--color-grey-300)',
                borderRadius: '8px',
                padding: '12px',
                background: 'var(--color-grey-50)',
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropOnAvailable}
            >
              {getAvailableStepsForFlow().length === 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '176px',
                  color: 'var(--color-grey-500)',
                  fontStyle: 'italic',
                }}>
                  All steps are in the flow. Drag here to remove.
                </div>
              ) : (
                getAvailableStepsForFlow().map(step => (
                  <div
                    key={step.id}
                    draggable
                    onDragStart={() => handleDragStart(step.id)}
                    onDragEnd={() => {
                      setDraggedStep(null);
                      setDragOverIndex(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      marginBottom: '8px',
                      background: draggedStep === step.id ? 'var(--color-grey-200)' : 'white',
                      border: '1px solid var(--color-grey-200)',
                      borderRadius: '8px',
                      cursor: 'grab',
                      opacity: draggedStep === step.id ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Drag Handle */}
                    <span style={{ color: 'var(--color-grey-400)', fontSize: '16px', cursor: 'grab' }}>
                      ⋮⋮
                    </span>

                    {/* Step Icon */}
                    <span style={{ fontSize: '20px' }}>{step.icon}</span>

                    {/* Step Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{step.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-grey-600)' }}>
                        {step.description}
                      </div>
                    </div>

                    {/* Add Button */}
                    <button
                      onClick={() => handleAddStep(step.id)}
                      style={{
                        padding: '4px 12px',
                        border: '1px solid var(--color-success-300)',
                        borderRadius: '4px',
                        background: 'var(--color-success-50)',
                        color: 'var(--color-success-700)',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      title="Add to flow"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button onClick={handleSaveWizardFlows} disabled={!wizardFlowsHasChanges}>
              Save Changes
            </Button>
            <Button variant="secondary" onClick={handleResetCurrentFlow}>
              Reset This Flow
            </Button>
            <Button variant="secondary" onClick={handleResetWizardFlows}>
              Reset All Flows
            </Button>
          </div>

          {wizardFlowsHasChanges && (
            <span style={{
              color: 'var(--color-warning-600)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              ⚠ Unsaved changes
            </span>
          )}
        </div>

        {/* Flow Comparison */}
        <Card style={{ marginTop: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Flow Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {(['new', 'refactor', 'enhance', 'reverse-engineer'] as WizardFlowType[]).map(flowType => (
              <div key={flowType}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  textTransform: 'capitalize',
                  color: flowType === selectedFlowType ? 'var(--color-primary)' : 'inherit',
                }}>
                  {flowType.replace('-', ' ')}
                  {flowType === selectedFlowType && ' (editing)'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {wizardFlows[flowType].map((stepId, index) => {
                    const step = AVAILABLE_STEPS.find(s => s.id === stepId);
                    return (
                      <div
                        key={stepId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          background: 'var(--color-grey-50)',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}
                      >
                        <span style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'var(--color-grey-400)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}>
                          {index + 1}
                        </span>
                        <span>{step?.icon}</span>
                        <span>{step?.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    ) : null}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface, white)',
            borderRadius: '8px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
              Reset Password for {resetPasswordUser.name}
            </h3>
            <p style={{ color: 'var(--color-grey-600)', marginBottom: '20px', fontSize: '14px' }}>
              Enter a new password for <strong>{resetPasswordUser.email}</strong>
            </p>
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="new-password" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordForm.newPassword}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-grey-300)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-grey-300)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Re-enter password"
                />
              </div>
              {resetPasswordForm.newPassword && resetPasswordForm.confirmPassword &&
                resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword && (
                <p style={{ color: 'var(--color-error)', fontSize: '13px', marginBottom: '16px' }}>
                  Passwords do not match
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={closeResetPassword}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword ||
                    resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword}
                >
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
