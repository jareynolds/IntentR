import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Sidebar, ProtectedRoute, ProtectedPage, UIFrameworkProvider, UIFrameworkIndicator } from './components';
import { Login, GoogleCallback, Welcome, Dashboard, WorkspaceOverview, Capabilities, Features, Vision, Designs, Integrations, AIChat, Code, Run, Workspaces, Storyboard, Ideation, Analyze, Settings, Admin, System, AIPrinciples, UIFramework, UIStyles, UIDesigner, DataCollection, Enablers, ConceptionApproval, DefinitionApproval, DesignApproval, ImplementationApproval, Testing, TestingApproval, StoryMap, LearnINTENT } from './pages';
import {
  WizardWorkspace,
  WizardConceptionStart,
  WizardConception,
  WizardDefinitionStart,
  WizardDefinition,
  WizardDesignStart,
  WizardDesign,
  WizardTestingStart,
  WizardTesting,
  WizardImplementationStart,
  WizardImplementation,
  WizardDiscoveryStart,
  WizardDiscovery,
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
import { WizardProvider } from './context/WizardContext';
import { VersionControlProvider } from './context/VersionControlContext';
import { VersionControlPanel, VersionHistoryDrawer } from './components';
import './styles/main.css';

const adminSidebarItems = [
  { path: '/admin', label: 'Admin Panel', icon: '◈' },
];

// Helper to check if a phase has any rejections
const checkPhaseRejections = (workspaceId: string, phase: string): boolean => {
  if (!workspaceId) return false;

  try {
    if (phase === 'testing') {
      // Testing uses: phaseApprovals_${workspaceId}_testing (array of items)
      const key = `phaseApprovals_${workspaceId}_testing`;
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
    if (phase === 'testing') {
      // Testing phase: check if all items in phaseApprovals_${workspaceId}_testing are approved
      const key = `phaseApprovals_${workspaceId}_testing`;
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

  // Track rejection status for each phase
  const [phaseRejections, setPhaseRejections] = useState({
    conception: false,
    definition: false,
    design: false,
    implementation: false,
    testing: false,
  });

  // Track approval status for each phase (true = fully approved)
  const [phaseApprovals, setPhaseApprovals] = useState({
    conception: false,
    definition: false,
    design: false,
    implementation: false,
    testing: false,
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
          conception: checkPhaseRejections(currentWorkspace.id, 'conception'),
          definition: checkPhaseRejections(currentWorkspace.id, 'definition'),
          design: checkPhaseRejections(currentWorkspace.id, 'design'),
          implementation: checkPhaseRejections(currentWorkspace.id, 'implementation'),
          testing: checkPhaseRejections(currentWorkspace.id, 'testing'),
        });
        setPhaseApprovals({
          conception: checkPhaseApproved(currentWorkspace.id, 'conception'),
          definition: checkPhaseApproved(currentWorkspace.id, 'definition'),
          design: checkPhaseApproved(currentWorkspace.id, 'design'),
          implementation: checkPhaseApproved(currentWorkspace.id, 'implementation'),
          testing: checkPhaseApproved(currentWorkspace.id, 'testing'),
        });
      } else {
        setPhaseRejections({
          conception: false,
          definition: false,
          design: false,
          implementation: false,
          testing: false,
        });
        setPhaseApprovals({
          conception: false,
          definition: false,
          design: false,
          implementation: false,
          testing: false,
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

  // Build sidebar items with phase-based navigation
  // Phase 1: INTENT DECLARATION - Define what to build (formerly Conception)
  // Phase 2: FORMAL SPECIFICATION - Define scope and design (formerly Definition + Design)
  // Phase 3: SYSTEM DERIVATION - Build, test and run it (formerly Implementation + Test Scenarios)
  // Phase 4: CONTINUOUS VALIDATION - Ongoing quality assurance (formerly Testing)
  const dynamicSidebarItems = [
    { path: '/', label: 'Welcome', icon: '⌂' },
    { path: '/dashboard', label: 'Dashboard', icon: '▦' },
    { path: '/workspaces', label: 'Workspaces', icon: '◰' },
    // INTENT DECLARATION PHASE (formerly Conception)
    {
      label: 'INTENT DECLARATION',
      path: '/wizard/conception/start',
      isPhase: true,
      phaseIcon: '◇',
      children: [
        { path: '/vision', label: 'Product Vision' },
        { path: '/ideation', label: 'Ideation' },
        { path: '/storyboard', label: 'Storyboard' },
        { path: '/conception-approval', label: 'Phase Approval', hasRejection: phaseRejections.conception, isPhaseIncomplete: !phaseApprovals.conception },
      ]
    },
    // FORMAL SPECIFICATION PHASE (formerly Definition + Design merged)
    {
      label: 'FORMAL SPECIFICATION',
      path: '/wizard/definition/start',
      isPhase: true,
      phaseIcon: '☰',
      children: [
        { path: '/capabilities', label: 'Capabilities' },
        { path: '/enablers', label: 'Enablers' },
        { path: '/story-map', label: 'Dependencies' },
        { path: '/designs', label: 'UI Assets' },
        { path: '/ui-framework', label: 'UI Framework' },
        { path: '/ui-styles', label: 'UI Styles' },
        { path: '/ui-designer', label: 'UI Designer' },
        { path: '/definition-approval', label: 'Phase Approval', hasRejection: phaseRejections.definition || phaseRejections.design, isPhaseIncomplete: !phaseApprovals.definition || !phaseApprovals.design },
      ]
    },
    // SYSTEM DERIVATION PHASE (formerly Implementation + Test Scenarios)
    {
      label: 'SYSTEM DERIVATION',
      path: '/wizard/implementation/start',
      isPhase: true,
      phaseIcon: '⚙',
      children: [
        { path: '/testing', label: 'Test Scenarios' },
        { path: '/system', label: 'System' },
        { path: '/ai-principles', label: 'AI Principles' },
        { path: '/code', label: 'Code' },
        { path: '/run', label: 'Run' },
        { path: '/implementation-approval', label: 'Phase Approval', hasRejection: phaseRejections.implementation, isPhaseIncomplete: !phaseApprovals.implementation },
      ]
    },
    // CONTINUOUS VALIDATION PHASE (formerly Testing - new pages to be added later)
    {
      label: 'CONTINUOUS VALIDATION',
      path: '/wizard/testing/start',
      isPhase: true,
      phaseIcon: '✓',
      children: [
        { path: '/testing-approval', label: 'Phase Approval', hasRejection: phaseRejections.testing, isPhaseIncomplete: !phaseApprovals.testing },
      ]
    },
    { path: '/ai-chat', label: 'AI Assistant', icon: '◉' },
  ];

  const sidebarItems = user?.role === 'admin'
    ? [...dynamicSidebarItems, ...adminSidebarItems]
    : dynamicSidebarItems;

  return (
    <div className="app">
      <Header title="Intentr" subtitle="Innovate Faster" />
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
            <Route path="/conception-approval" element={<ProtectedPage path="/conception-approval"><ConceptionApproval /></ProtectedPage>} />
            <Route path="/definition-approval" element={<ProtectedPage path="/definition-approval"><DefinitionApproval /></ProtectedPage>} />
            <Route path="/design-approval" element={<ProtectedPage path="/design-approval"><DesignApproval /></ProtectedPage>} />
            <Route path="/implementation-approval" element={<ProtectedPage path="/implementation-approval"><ImplementationApproval /></ProtectedPage>} />
            <Route path="/testing" element={<ProtectedPage path="/testing"><Testing /></ProtectedPage>} />
            <Route path="/testing-approval" element={<ProtectedPage path="/testing-approval"><TestingApproval /></ProtectedPage>} />
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

            {/* Wizard Routes */}
            <Route path="/wizard/workspace" element={<ProtectedPage path="/wizard/workspace"><WizardWorkspace /></ProtectedPage>} />
            <Route path="/wizard/conception/start" element={<ProtectedPage path="/wizard/conception/start"><WizardConceptionStart /></ProtectedPage>} />
            <Route path="/wizard/conception" element={<ProtectedPage path="/wizard/conception"><WizardConception /></ProtectedPage>} />
            <Route path="/wizard/definition/start" element={<ProtectedPage path="/wizard/definition/start"><WizardDefinitionStart /></ProtectedPage>} />
            <Route path="/wizard/definition" element={<ProtectedPage path="/wizard/definition"><WizardDefinition /></ProtectedPage>} />
            <Route path="/wizard/design/start" element={<ProtectedPage path="/wizard/design/start"><WizardDesignStart /></ProtectedPage>} />
            <Route path="/wizard/design" element={<ProtectedPage path="/wizard/design"><WizardDesign /></ProtectedPage>} />
            <Route path="/wizard/testing/start" element={<ProtectedPage path="/wizard/testing/start"><WizardTestingStart /></ProtectedPage>} />
            <Route path="/wizard/testing" element={<ProtectedPage path="/wizard/testing"><WizardTesting /></ProtectedPage>} />
            <Route path="/wizard/implementation/start" element={<ProtectedPage path="/wizard/implementation/start"><WizardImplementationStart /></ProtectedPage>} />
            <Route path="/wizard/implementation" element={<ProtectedPage path="/wizard/implementation"><WizardImplementation /></ProtectedPage>} />
            <Route path="/wizard/discovery/start" element={<ProtectedPage path="/wizard/discovery/start"><WizardDiscoveryStart /></ProtectedPage>} />
            <Route path="/wizard/discovery" element={<ProtectedPage path="/wizard/discovery"><WizardDiscovery /></ProtectedPage>} />
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
                              background: var(--color-grey-50);
                              overflow-y: auto;
                            }

                            @media (max-width: 768px) {
                              .app-main {
                                padding: 20px;
                              }
                            }
                          `}</style>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                      </WizardProvider>
                    </Router>
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
