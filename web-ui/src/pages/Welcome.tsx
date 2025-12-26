import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { GettingStartedWizard } from '../components/GettingStartedWizard';

interface StartAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface Walkthrough {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  requiresAdmin?: boolean;
}

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaces, switchWorkspace } = useWorkspace();
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Check if this is first visit and show tutorial
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('intentr_tutorial_completed');
    const hasSeenWelcome = sessionStorage.getItem('intentr_welcome_seen');

    if (!tutorialCompleted && !hasSeenWelcome) {
      // Show tutorial on first visit
      setShowTutorial(true);
      sessionStorage.setItem('intentr_welcome_seen', 'true');
    }
  }, []);

  const handleTutorialComplete = () => {
    localStorage.setItem('intentr_tutorial_completed', 'true');
    setShowTutorial(false);
  };

  const startActions: StartAction[] = [
    {
      id: 'wizard',
      title: 'Use the Step by Step Wizard',
      description: 'Guided workflow to create, refactor, or reverse-engineer applications',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      action: () => {
        localStorage.setItem('wizard_mode_enabled', 'true');
        navigate('/wizard/workspace');
      },
    },
    {
      id: 'new-workspace',
      title: 'Generate New Workspace',
      description: 'Create a new workspace and start building your application from scratch',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: () => navigate('/workspaces?action=new'),
    },
    {
      id: 'open-workspace',
      title: 'Open Existing Workspace',
      description: 'Continue working on one of your existing workspaces',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => setShowWorkspaceSelector(true),
    },
    {
      id: 'refactor-workspace',
      title: 'Refactor an Existing Application',
      description: 'Analyze and document an existing codebase using the Discovery phase',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      action: () => {
        // Navigate to the Discovery phase start page
        localStorage.setItem('wizard_mode_enabled', 'true');
        navigate('/wizard/discovery/start');
      },
    },
  ];

  const walkthroughs: Walkthrough[] = [
    {
      id: 'getting-started',
      title: 'Getting Started with IntentR',
      description: 'Learn the basics of IntentR with an interactive tutorial',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      action: () => {
        setShowTutorial(true);
      },
    },
    {
      id: 'connect-tools',
      title: 'Connect with External Tools',
      description: 'Set up integrations with Figma, GitHub, and other development tools',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      action: () => navigate('/integrations'),
    },
    {
      id: 'learn-fundamentals',
      title: 'Learn Fundamentals of INTENT',
      description: 'Understand the INTENT philosophy and engineering framework',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      action: () => {
        navigate('/learn-intent');
      },
    },
    {
      id: 'setup-team',
      title: 'Setup My Team',
      description: 'Manage team members, roles, and permissions',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      action: () => navigate('/admin'),
      requiresAdmin: true,
    },
  ];

  const handleOpenWorkspace = async (workspaceId: string) => {
    await switchWorkspace(workspaceId);
    setShowWorkspaceSelector(false);
    navigate('/workspaces');
  };

  const filteredWalkthroughs = walkthroughs.filter(w => !w.requiresAdmin || isAdmin);

  return (
    <div className="welcome-page">
      <div className="welcome-header">
        <div className="welcome-logo">
          <svg viewBox="0 0 40 40" fill="none" className="logo-icon">
            <rect width="40" height="40" rx="8" fill="var(--color-blue-600)" />
            <path d="M12 14h16v2H12zM12 19h12v2H12zM12 24h14v2H12z" fill="white" />
          </svg>
          <div className="logo-text">
            <h1>Welcome to Intentr</h1>
            <p>Innovate Faster with Integrity</p>
          </div>
        </div>
      </div>

      <div className="welcome-content">
        {/* Left Column - Start */}
        <div className="welcome-column">
          <h2 className="column-title">Start</h2>
          <div className="action-list">
            {startActions.map((action) => (
              <button
                key={action.id}
                className="action-item"
                onClick={action.action}
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-text">
                  <span className="action-title">{action.title}</span>
                  <span className="action-description">{action.description}</span>
                </div>
                <div className="action-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Recent Workspaces */}
          {workspaces.length > 0 && (
            <div className="recent-section">
              <h3 className="section-subtitle">Recent Workspaces</h3>
              <div className="recent-list">
                {workspaces.slice(0, 5).map((workspace) => (
                  <button
                    key={workspace.id}
                    className="recent-item"
                    onClick={() => handleOpenWorkspace(workspace.id)}
                  >
                    <svg className="recent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="recent-name">{workspace.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Walkthroughs */}
        <div className="welcome-column">
          <h2 className="column-title">Walkthroughs</h2>
          <div className="walkthrough-list">
            {filteredWalkthroughs.map((walkthrough) => (
              <button
                key={walkthrough.id}
                className="walkthrough-item"
                onClick={walkthrough.action}
              >
                <div className="walkthrough-icon">{walkthrough.icon}</div>
                <div className="walkthrough-text">
                  <span className="walkthrough-title">{walkthrough.title}</span>
                  <span className="walkthrough-description">{walkthrough.description}</span>
                </div>
                <div className="walkthrough-badge">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Help & Resources */}
          <div className="help-section">
            <h3 className="section-subtitle">Help & Resources</h3>
            <div className="help-links">
              <a href="#" className="help-link" onClick={(e) => { e.preventDefault(); navigate('/settings'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </a>
              <a href="#" className="help-link" onClick={(e) => { e.preventDefault(); navigate('/ai-chat'); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                AI Assistant
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Selector Modal */}
      {showWorkspaceSelector && (
        <div className="modal-overlay" onClick={() => setShowWorkspaceSelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Workspace</h3>
              <button className="modal-close" onClick={() => setShowWorkspaceSelector(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {workspaces.length === 0 ? (
                <div className="empty-state">
                  <p>No workspaces found. Create a new one to get started.</p>
                  <Button variant="primary" onClick={() => { setShowWorkspaceSelector(false); navigate('/workspaces?action=new'); }}>
                    Create Workspace
                  </Button>
                </div>
              ) : (
                <div className="workspace-grid">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.id}
                      className="workspace-card"
                      onClick={() => handleOpenWorkspace(workspace.id)}
                    >
                      <div className="workspace-card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <span className="workspace-card-name">{workspace.name}</span>
                      {workspace.description && (
                        <span className="workspace-card-description">{workspace.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .welcome-page {
          min-height: 100%;
          padding: 2rem;
          background: var(--color-grey-50);
        }

        .welcome-header {
          max-width: 1200px;
          margin: 0 auto 2.5rem;
        }

        .welcome-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
        }

        .logo-text h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin: 0;
        }

        .logo-text p {
          font-size: 0.875rem;
          color: var(--color-grey-500);
          margin: 0.25rem 0 0;
        }

        .welcome-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .welcome-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .column-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-grey-500);
          margin: 0;
        }

        .action-list,
        .walkthrough-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .action-item,
        .walkthrough-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .action-item:hover,
        .walkthrough-item:hover {
          border-color: var(--color-blue-300);
          background: var(--color-blue-50);
          transform: translateX(4px);
        }

        .action-icon,
        .walkthrough-icon {
          flex-shrink: 0;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-blue-100);
          border-radius: 0.5rem;
          color: var(--color-blue-600);
        }

        .action-icon svg,
        .walkthrough-icon svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .action-text,
        .walkthrough-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .action-title,
        .walkthrough-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .action-description,
        .walkthrough-description {
          font-size: 0.8125rem;
          color: var(--color-grey-500);
          line-height: 1.4;
        }

        .action-arrow {
          flex-shrink: 0;
          color: var(--color-grey-400);
        }

        .action-arrow svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .walkthrough-badge {
          flex-shrink: 0;
          color: var(--color-green-500);
        }

        .walkthrough-badge svg {
          width: 1.5rem;
          height: 1.5rem;
        }

        .section-subtitle {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-grey-700);
          margin: 1rem 0 0.75rem;
        }

        .recent-section {
          margin-top: 1rem;
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .recent-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.15s ease;
          text-align: left;
          width: 100%;
        }

        .recent-item:hover {
          background: var(--color-grey-100);
        }

        .recent-icon {
          width: 1rem;
          height: 1rem;
          color: var(--color-grey-400);
        }

        .recent-name {
          font-size: 0.875rem;
          color: var(--color-blue-600);
        }

        .recent-item:hover .recent-name {
          text-decoration: underline;
        }

        .help-section {
          margin-top: auto;
          padding-top: 1.5rem;
          border-top: 1px solid var(--color-grey-200);
        }

        .help-links {
          display: flex;
          gap: 1.5rem;
        }

        .help-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-grey-600);
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .help-link:hover {
          color: var(--color-blue-600);
        }

        .help-link svg {
          width: 1rem;
          height: 1rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 0.75rem;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--color-grey-200);
        }

        .modal-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-grey-900);
          margin: 0;
        }

        .modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border: none;
          background: transparent;
          border-radius: 0.375rem;
          color: var(--color-grey-500);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .modal-close:hover {
          background: var(--color-grey-100);
          color: var(--color-grey-700);
        }

        .modal-close svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          max-height: calc(80vh - 60px);
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
        }

        .empty-state p {
          color: var(--color-grey-600);
          margin-bottom: 1rem;
        }

        .workspace-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .workspace-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem 1rem;
          background: var(--color-grey-50);
          border: 1px solid var(--color-grey-200);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .workspace-card:hover {
          border-color: var(--color-blue-300);
          background: var(--color-blue-50);
        }

        .workspace-card-icon {
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-blue-500);
        }

        .workspace-card-icon svg {
          width: 2rem;
          height: 2rem;
        }

        .workspace-card-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .workspace-card-description {
          font-size: 0.75rem;
          color: var(--color-grey-500);
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .welcome-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .workspace-grid {
            grid-template-columns: 1fr;
          }

          .help-links {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>

      {/* Getting Started Tutorial Wizard */}
      <GettingStartedWizard
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={handleTutorialComplete}
      />
    </div>
  );
};

export default Welcome;
