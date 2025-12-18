import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header, Sidebar, ProtectedRoute, ProtectedPage, UIFrameworkProvider, UIFrameworkIndicator } from './components';
import { Login, GoogleCallback, Dashboard, WorkspaceOverview, Capabilities, Features, Vision, Designs, Integrations, AIChat, Code, Run, Workspaces, Storyboard, Ideation, Analyze, Settings, Admin, System, AIPrinciples, UIFramework, UIStyles, UIDesigner, DataCollection, Enablers, ConceptionApproval, DefinitionApproval, DesignApproval, ImplementationApproval, Testing, TestingApproval, StoryMap } from './pages';
import { defaultUIFrameworks, applyUIStyleToDOM } from './pages/UIStyles';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { ThemeProvider } from './context/ThemeContext';
import { CollaborationProvider } from './context/CollaborationContext';
import { RoleAccessProvider } from './context/RoleAccessContext';
import { ApprovalProvider } from './context/ApprovalContext';
import { EnablerProvider } from './context/EnablerContext';
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
  // Phase 1: CONCEPTION - Define what to build
  // Phase 2: DEFINITION - Define the scope
  // Phase 3: DESIGN - Define how it looks
  // Phase 4: IMPLEMENTATION - Build and run it
  const dynamicSidebarItems = [
    { path: '/', label: 'Dashboard', icon: '▦' },
    { path: '/workspaces', label: 'Workspaces', icon: '◰' },
    // CONCEPTION PHASE
    {
      label: 'CONCEPTION',
      isPhase: true,
      phaseIcon: '1',
      children: [
        { path: '/vision', label: 'Product Vision' },
        { path: '/ideation', label: 'Ideation' },
        { path: '/storyboard', label: 'Storyboard' },
        { path: '/conception-approval', label: 'Phase Approval', hasRejection: phaseRejections.conception, isPhaseIncomplete: !phaseApprovals.conception },
      ]
    },
    // DEFINITION PHASE
    {
      label: 'DEFINITION',
      isPhase: true,
      phaseIcon: '2',
      children: [
        { path: '/capabilities', label: 'Capabilities' },
        { path: '/enablers', label: 'Enablers' },
        { path: '/story-map', label: 'Narrative' },
        { path: '/definition-approval', label: 'Phase Approval', hasRejection: phaseRejections.definition, isPhaseIncomplete: !phaseApprovals.definition },
      ]
    },
    // DESIGN PHASE
    {
      label: 'DESIGN',
      isPhase: true,
      phaseIcon: '3',
      children: [
        { path: '/designs', label: 'UI Assets' },
        { path: '/ui-framework', label: 'UI Framework' },
        { path: '/ui-styles', label: 'UI Styles' },
        { path: '/ui-designer', label: 'UI Designer' },
        { path: '/design-approval', label: 'Phase Approval', hasRejection: phaseRejections.design, isPhaseIncomplete: !phaseApprovals.design },
      ]
    },
    // TESTING PHASE
    {
      label: 'TESTING',
      isPhase: true,
      phaseIcon: '4',
      children: [
        { path: '/testing', label: 'Test Scenarios' },
        { path: '/testing-approval', label: 'Phase Approval', hasRejection: phaseRejections.testing, isPhaseIncomplete: !phaseApprovals.testing },
      ]
    },
    // IMPLEMENTATION PHASE
    {
      label: 'IMPLEMENTATION',
      isPhase: true,
      phaseIcon: '5',
      children: [
        { path: '/system', label: 'System' },
        { path: '/ai-principles', label: 'AI Principles' },
        { path: '/code', label: 'Code' },
        { path: '/run', label: 'Run' },
        { path: '/implementation-approval', label: 'Phase Approval', hasRejection: phaseRejections.implementation, isPhaseIncomplete: !phaseApprovals.implementation },
      ]
    },
    { path: '/ai-chat', label: 'AI Assistant', icon: '◉' },
    { path: '/integrations', label: 'Integrations', icon: '◎' },
    { path: '/settings', label: 'Settings', icon: '⚙' },
  ];

  const sidebarItems = user?.role === 'admin'
    ? [...dynamicSidebarItems, ...adminSidebarItems]
    : dynamicSidebarItems;

  return (
    <div className="app">
      <Header title="UbeCode" subtitle="Develop at the speed of Innovation" />
      <div className="app-layout">
        <Sidebar items={sidebarItems} />
        <UIFrameworkIndicator />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ProtectedPage path="/"><Dashboard /></ProtectedPage>} />
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
          </Routes>
        </main>
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
                <UIFrameworkProvider>
                  <CollaborationProvider>
                    <Router>
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
                    </Router>
                  </CollaborationProvider>
                </UIFrameworkProvider>
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
