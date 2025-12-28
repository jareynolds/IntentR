import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Sidebar, ProtectedRoute, ProtectedPage, UIFrameworkProvider, UIFrameworkIndicator } from './components';
import { Login, GoogleCallback, Welcome, Dashboard, WorkspaceOverview, Capabilities, Features, Vision, Designs, Integrations, AIChat, Code, Run, Workspaces, Storyboard, Ideation, Analyze, Settings, Admin, System, AIPrinciples, UIFramework, UIStyles, UIDesigner, DataCollection, Enablers, IntentApproval, SpecificationApproval, SystemApproval, ImplementationApproval, Testing, ControlLoopApproval, StoryMap, LearnINTENT, SyncCode2Spec } from './pages';
import {
  WizardWorkspace,
  WizardIntentStart,
  WizardIntent,
  WizardSpecificationStart,
  WizardSpecification,
  WizardSystemStart,
  WizardSystem,
  WizardControlLoopStart,
  WizardControlLoop,
  WizardImplementationStart,
  WizardImplementation,
  WizardDiscoveryStart,
  WizardDiscovery,
  WizardSubpage,
} from './pages/wizard';
import { defaultUIFrameworks, applyUIStyleToDOM } from './pages/UIStyles';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { ThemeProvider } from './context/ThemeContext';
import { CollaborationProvider } from './context/CollaborationContext';
import { RoleAccessProvider } from './context/RoleAccessContext';
import { ApprovalProvider } from './context/ApprovalContext';
import { EnablerProvider } from './context/EnablerContext';
import {
  WizardProvider,
  useWizard,
  STEP_DEFINITIONS,
  ALL_SUBPAGES_FLAT,
  DEFAULT_WIZARD_FLOWS,
  type WizardFlowType,
} from './context/WizardContext';
import { VersionControlProvider } from './context/VersionControlContext';
import { EntityStateProvider } from './context/EntityStateContext';
import { VersionControlPanel, VersionHistoryDrawer } from './components';
import './styles/main.css';

const adminSidebarItems = [
  { path: '/admin', label: 'Admin Panel', icon: '◈' },
];

// Helper to check if a phase has any rejections
const checkPhaseRejections = (workspaceId: string, phase: string): boolean => {
  if (!workspaceId) return false;

  try {
    if (phase === 'control-loop') {
      // Control Loop uses: phaseApprovals_${workspaceId}_control-loop (array of items)
      const key = `phaseApprovals_${workspaceId}_control-loop`;
      const data = localStorage.getItem(key);
      if (!data) return false;
      const items = JSON.parse(data);
      return items.some((item: { status: string }) => item.status === 'rejected');
    } else {
      // Other phases use: ${phase}-item-approvals-${workspaceId} (object with itemId keys)
      const key = `${phase}-item-approvals-${workspaceId}`;
      const data = localStorage.getItem(key);
      if (!data) return false;
      const approvals = JSON.parse(data);
      // Check if any item has status 'rejected'
      return Object.values(approvals).some((item: any) => item.status === 'rejected');
    }
  } catch {
    return false;
  }
};

// Helper to check if a phase is fully approved
const checkPhaseApproved = (workspaceId: string, phase: string): boolean => {
  if (!workspaceId) return false;

  try {
    if (phase === 'control-loop') {
      // Control Loop phase: check if all items in phaseApprovals_${workspaceId}_control-loop are approved
      const key = `phaseApprovals_${workspaceId}_control-loop`;
      const data = localStorage.getItem(key);
      if (!data) return false;
      const items = JSON.parse(data);
      if (!Array.isArray(items) || items.length === 0) return false;
      return items.every((item: { status: string }) => item.status === 'approved');
    } else {
      // Other phases use: ${phase}-approved-${workspaceId}
      const key = `${phase}-approved-${workspaceId}`;
      const data = localStorage.getItem(key);
      if (!data) return false;
      const parsed = JSON.parse(data);
      return parsed.approved === true;
    }
  } catch {
    return false;
  }
};

function AppContent() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { flowType, customFlows, customSubpages } = useWizard();

  // Track rejection status for each phase
  const [phaseRejections, setPhaseRejections] = useState({
    intent: false,
    specification: false,
    system: false,
    implementation: false,
    'control-loop': false,
  });

  // Track approval status for each phase (true = fully approved)
  const [phaseApprovals, setPhaseApprovals] = useState({
    intent: false,
    specification: false,
    system: false,
    implementation: false,
    'control-loop': false,
  });

  // Apply saved UI style when workspace changes
  useEffect(() => {
    if (currentWorkspace?.selectedUIFramework) {
      // Include custom frameworks from workspace
      const allFrameworks = currentWorkspace.customUIFrameworks
        ? [...defaultUIFrameworks, ...currentWorkspace.customUIFrameworks]
        : defaultUIFrameworks;

      const savedFramework = allFrameworks.find(
        f => f.id === currentWorkspace.selectedUIFramework
      );
      if (savedFramework) {
        applyUIStyleToDOM(savedFramework);
      }
    }
  }, [currentWorkspace?.selectedUIFramework, currentWorkspace?.customUIFrameworks]);

  // Check for rejections and approvals when workspace changes or on interval
  useEffect(() => {
    const checkStatus = () => {
      if (currentWorkspace?.id) {
        setPhaseRejections({
          intent: checkPhaseRejections(currentWorkspace.id, 'intent'),
          specification: checkPhaseRejections(currentWorkspace.id, 'specification'),
          system: checkPhaseRejections(currentWorkspace.id, 'system'),
          implementation: checkPhaseRejections(currentWorkspace.id, 'implementation'),
          'control-loop': checkPhaseRejections(currentWorkspace.id, 'control-loop'),
        });
        setPhaseApprovals({
          intent: checkPhaseApproved(currentWorkspace.id, 'intent'),
          specification: checkPhaseApproved(currentWorkspace.id, 'specification'),
          system: checkPhaseApproved(currentWorkspace.id, 'system'),
          implementation: checkPhaseApproved(currentWorkspace.id, 'implementation'),
          'control-loop': checkPhaseApproved(currentWorkspace.id, 'control-loop'),
        });
      } else {
        setPhaseRejections({
          intent: false,
          specification: false,
          system: false,
          implementation: false,
          'control-loop': false,
        });
        setPhaseApprovals({
          intent: false,
          specification: false,
          system: false,
          implementation: false,
          'control-loop': false,
        });
      }
    };

    checkStatus();

    // Check periodically for changes (e.g., from approval pages)
    const interval = setInterval(checkStatus, 2000);

    // Also listen for storage events from other tabs
    window.addEventListener('storage', checkStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkStatus);
    };
  }, [currentWorkspace?.id]);

  // Build sidebar items dynamically from wizard configuration
  // Use the active flow type, or default to 'new' if none selected
  const activeFlowType: WizardFlowType = flowType || 'new';
  const activeSections = customFlows[activeFlowType] || DEFAULT_WIZARD_FLOWS[activeFlowType];

  // Helper to build children (subpages) for a section
  const buildSectionChildren = (sectionId: string) => {
    const subpageIds = customSubpages[sectionId] || [];
    // Filter out 'overview' as it's the section start page, not a child item
    const childSubpages = subpageIds.filter(id => id !== 'overview');

    return childSubpages.map(subpageId => {
      const subpage = ALL_SUBPAGES_FLAT[subpageId];
      const isApprovalPage = subpageId.endsWith('-approval');
      const phaseId = sectionId as keyof typeof phaseRejections;

      return {
        path: `/${subpageId}`,
        label: subpage?.name || subpageId,
        ...(isApprovalPage && phaseRejections[phaseId] !== undefined && {
          hasRejection: phaseRejections[phaseId],
          isPhaseIncomplete: !phaseApprovals[phaseId],
        }),
      };
    });
  };

  // Build dynamic sidebar items from wizard configuration
  const dynamicSidebarItems = [
    { path: '/', label: 'Welcome', icon: '⌂' },
    { path: '/dashboard', label: 'Dashboard', icon: '▦' },
    { path: '/workspaces', label: 'Workspaces', icon: '◰' },
    // Dynamically generated sections based on active flow
    ...activeSections
      .filter(sectionId => sectionId !== 'workspace') // Workspace is not shown as a sidebar section
      .map(sectionId => {
        const stepDef = STEP_DEFINITIONS[sectionId];
        if (!stepDef) return null;

        return {
          label: stepDef.name.toUpperCase(),
          path: `/wizard/${sectionId}/start`,
          isPhase: true,
          phaseIcon: stepDef.icon,
          children: buildSectionChildren(sectionId),
        };
      })
      .filter(Boolean),
    { path: '/ai-chat', label: 'AI Assistant', icon: '◉' },
    { path: '/sync-code-to-spec', label: 'Sync Code to Spec', icon: '⟲' },
  ];

  const sidebarItems = user?.role === 'admin'
    ? [...dynamicSidebarItems, ...adminSidebarItems]
    : dynamicSidebarItems;

  return (
    <div className="app">
      <Header title="Intentr" subtitle="Innovate Faster with Integrity" />
      <div className="app-layout">
        <Sidebar items={sidebarItems} />
        <UIFrameworkIndicator />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ProtectedPage path="/"><Welcome /></ProtectedPage>} />
            <Route path="/dashboard" element={<ProtectedPage path="/dashboard"><Dashboard /></ProtectedPage>} />
            <Route path="/workspace-overview" element={<ProtectedPage path="/workspace-overview"><WorkspaceOverview /></ProtectedPage>} />
            <Route path="/ideation" element={<ProtectedPage path="/ideation"><Ideation /></ProtectedPage>} />
            <Route path="/analyze" element={<ProtectedPage path="/analyze"><Analyze /></ProtectedPage>} />
            <Route path="/storyboard" element={<ProtectedPage path="/storyboard"><Storyboard /></ProtectedPage>} />
            <Route path="/intent-approval" element={<ProtectedPage path="/intent-approval"><IntentApproval /></ProtectedPage>} />
            <Route path="/specification-approval" element={<ProtectedPage path="/specification-approval"><SpecificationApproval /></ProtectedPage>} />
            <Route path="/system-approval" element={<ProtectedPage path="/system-approval"><SystemApproval /></ProtectedPage>} />
            <Route path="/implementation-approval" element={<ProtectedPage path="/implementation-approval"><ImplementationApproval /></ProtectedPage>} />
            <Route path="/testing" element={<ProtectedPage path="/testing"><Testing /></ProtectedPage>} />
            <Route path="/control-loop-approval" element={<ProtectedPage path="/control-loop-approval"><ControlLoopApproval /></ProtectedPage>} />
            <Route path="/system" element={<ProtectedPage path="/system"><System /></ProtectedPage>} />
            <Route path="/capabilities" element={<ProtectedPage path="/capabilities"><Capabilities /></ProtectedPage>} />
            <Route path="/enablers" element={<ProtectedPage path="/enablers"><Enablers /></ProtectedPage>} />
            <Route path="/story-map" element={<ProtectedPage path="/story-map"><StoryMap /></ProtectedPage>} />
            <Route path="/features" element={<ProtectedPage path="/features"><Features /></ProtectedPage>} />
            <Route path="/vision" element={<ProtectedPage path="/vision"><Vision /></ProtectedPage>} />
            <Route path="/workspaces" element={<ProtectedPage path="/workspaces"><Workspaces /></ProtectedPage>} />
            <Route path="/designs" element={<ProtectedPage path="/designs"><Designs /></ProtectedPage>} />
            <Route path="/integrations" element={<ProtectedPage path="/integrations"><Integrations /></ProtectedPage>} />
            <Route path="/ai-chat" element={<ProtectedPage path="/ai-chat"><AIChat /></ProtectedPage>} />
            <Route path="/code" element={<ProtectedPage path="/code"><Code /></ProtectedPage>} />
            <Route path="/run" element={<ProtectedPage path="/run"><Run /></ProtectedPage>} />
            <Route path="/ai-principles" element={<ProtectedPage path="/ai-principles"><AIPrinciples /></ProtectedPage>} />
            <Route path="/ui-framework" element={<ProtectedPage path="/ui-framework"><UIFramework /></ProtectedPage>} />
            <Route path="/ui-styles" element={<ProtectedPage path="/ui-styles"><UIStyles /></ProtectedPage>} />
            <Route path="/ui-designer" element={<ProtectedPage path="/ui-designer"><UIDesigner /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage path="/settings"><Settings /></ProtectedPage>} />
            <Route path="/admin" element={<ProtectedPage path="/admin"><Admin /></ProtectedPage>} />
            <Route path="/data-collection" element={<ProtectedPage path="/data-collection"><DataCollection /></ProtectedPage>} />
            <Route path="/learn-intent" element={<ProtectedPage path="/learn-intent"><LearnINTENT /></ProtectedPage>} />
            <Route path="/sync-code-to-spec" element={<ProtectedPage path="/sync-code-to-spec"><SyncCode2Spec /></ProtectedPage>} />

            {/* Wizard Routes */}
            <Route path="/wizard/workspace" element={<ProtectedPage path="/wizard/workspace"><WizardWorkspace /></ProtectedPage>} />
            <Route path="/wizard/intent/start" element={<ProtectedPage path="/wizard/intent/start"><WizardIntentStart /></ProtectedPage>} />
            <Route path="/wizard/intent" element={<ProtectedPage path="/wizard/intent"><WizardIntent /></ProtectedPage>} />
            <Route path="/wizard/specification/start" element={<ProtectedPage path="/wizard/specification/start"><WizardSpecificationStart /></ProtectedPage>} />
            <Route path="/wizard/specification" element={<ProtectedPage path="/wizard/specification"><WizardSpecification /></ProtectedPage>} />
            <Route path="/wizard/system/start" element={<ProtectedPage path="/wizard/system/start"><WizardSystemStart /></ProtectedPage>} />
            <Route path="/wizard/system" element={<ProtectedPage path="/wizard/system"><WizardSystem /></ProtectedPage>} />
            <Route path="/wizard/control-loop/start" element={<ProtectedPage path="/wizard/control-loop/start"><WizardControlLoopStart /></ProtectedPage>} />
            <Route path="/wizard/control-loop" element={<ProtectedPage path="/wizard/control-loop"><WizardControlLoop /></ProtectedPage>} />
            <Route path="/wizard/implementation/start" element={<ProtectedPage path="/wizard/implementation/start"><WizardImplementationStart /></ProtectedPage>} />
            <Route path="/wizard/implementation" element={<ProtectedPage path="/wizard/implementation"><WizardImplementation /></ProtectedPage>} />
            <Route path="/wizard/discovery/start" element={<ProtectedPage path="/wizard/discovery/start"><WizardDiscoveryStart /></ProtectedPage>} />
            <Route path="/wizard/discovery" element={<ProtectedPage path="/wizard/discovery"><WizardDiscovery /></ProtectedPage>} />

            {/* Generic wizard subpage route - handles all subpages within wizard mode */}
            <Route path="/wizard/:stepId/:subpageId" element={<ProtectedPage path="/wizard/subpage"><WizardSubpage /></ProtectedPage>} />
          </Routes>
        </main>
        {/* Version Control Components */}
        <VersionControlPanel />
        <VersionHistoryDrawer />
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AuthProvider>
          <RoleAccessProvider>
            <ApprovalProvider>
              <EnablerProvider>
              <WorkspaceProvider>
                <VersionControlProvider>
                <UIFrameworkProvider>
                  <CollaborationProvider>
                    <EntityStateProvider>
                    <Router>
                      <WizardProvider>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/auth/google/callback" element={<GoogleCallback />} />

                      {/* Protected routes */}
                      <Route
                        path="/*"
                        element={
                          <ProtectedRoute>
                            <AppContent />
                          <style>{`
                            .app-layout {
                              display: flex;
                              min-height: calc(100vh - 80px);
                            }

                            .app-main {
                              flex: 1;
                              padding: 30px;
                              margin-left: 256px;
                              background: var(--color-grey-50);
                              overflow-y: auto;
                            }

                            @media (max-width: 768px) {
                              .app-main {
                                padding: 20px;
                                margin-left: 56px;
                              }
                            }
                          `}</style>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                      </WizardProvider>
                    </Router>
                  </EntityStateProvider>
                  </CollaborationProvider>
                </UIFrameworkProvider>
                </VersionControlProvider>
              </WorkspaceProvider>
              </EnablerProvider>
            </ApprovalProvider>
          </RoleAccessProvider>
        </AuthProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
