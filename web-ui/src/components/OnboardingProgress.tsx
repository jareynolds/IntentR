import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  checkComplete: () => boolean;
  action: {
    label: string;
    path: string;
  };
}

interface OnboardingProgressProps {
  onShowTutorial?: () => void;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({ onShowTutorial }) => {
  const navigate = useNavigate();
  const { workspaces, currentWorkspace } = useWorkspace();
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  // Define onboarding tasks
  const tasks: OnboardingTask[] = [
    {
      id: 'tutorial',
      title: 'Complete the Tutorial',
      description: 'Learn the basics of Intentr with our interactive guide',
      icon: '📚',
      checkComplete: () => localStorage.getItem('intentr_tutorial_completed') === 'true',
      action: {
        label: 'Start Tutorial',
        path: '',
      },
    },
    {
      id: 'workspace',
      title: 'Create Your First Workspace',
      description: 'Set up a project workspace to start building',
      icon: '📁',
      checkComplete: () => workspaces.length > 0,
      action: {
        label: 'Create Workspace',
        path: '/workspaces?action=new',
      },
    },
    {
      id: 'vision',
      title: 'Define Your Vision',
      description: 'Write your product vision and key goals',
      icon: '🎯',
      checkComplete: () => {
        if (!currentWorkspace?.id) return false;
        const visionKey = `vision_${currentWorkspace.id}`;
        const saved = localStorage.getItem(visionKey);
        return !!saved && saved.length > 50;
      },
      action: {
        label: 'Write Vision',
        path: '/vision',
      },
    },
    {
      id: 'capability',
      title: 'Create Your First Capability',
      description: 'Define a business capability for your application',
      icon: '⚡',
      checkComplete: () => {
        if (!currentWorkspace?.id) return false;
        const capKey = `capabilities_${currentWorkspace.id}`;
        const saved = localStorage.getItem(capKey);
        if (!saved) return false;
        try {
          const caps = JSON.parse(saved);
          return Array.isArray(caps) && caps.length > 0;
        } catch {
          return false;
        }
      },
      action: {
        label: 'Add Capability',
        path: '/capabilities',
      },
    },
    {
      id: 'ai-principles',
      title: 'Configure AI Governance',
      description: 'Set your AI governance level for the workspace',
      icon: '🤖',
      checkComplete: () => {
        if (!currentWorkspace?.activeAIPreset) return false;
        return currentWorkspace.activeAIPreset !== 'None';
      },
      action: {
        label: 'Configure AI',
        path: '/ai-principles',
      },
    },
  ];

  // Check task completion status
  useEffect(() => {
    const completed = new Set<string>();
    tasks.forEach(task => {
      if (task.checkComplete()) {
        completed.add(task.id);
      }
    });
    setCompletedTasks(completed);

    // Check if dismissed
    const dismissedUntil = localStorage.getItem('onboarding_dismissed_until');
    if (dismissedUntil) {
      const dismissDate = new Date(dismissedUntil);
      if (dismissDate > new Date()) {
        setDismissed(true);
      }
    }
  }, [workspaces, currentWorkspace]);

  const completedCount = completedTasks.size;
  const totalTasks = tasks.length;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);
  const allComplete = completedCount === totalTasks;

  const handleDismiss = () => {
    // Dismiss for 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    localStorage.setItem('onboarding_dismissed_until', tomorrow.toISOString());
    setDismissed(true);
  };

  const handleTaskAction = (task: OnboardingTask) => {
    if (task.id === 'tutorial') {
      onShowTutorial?.();
    } else {
      navigate(task.action.path);
    }
  };

  // Don't show if dismissed or all complete
  if (dismissed || allComplete) {
    return null;
  }

  // Find next incomplete task
  const nextTask = tasks.find(t => !completedTasks.has(t.id));

  return (
    <div className="onboarding-progress">
      <style>{`
        .onboarding-progress {
          background: linear-gradient(135deg, var(--color-blue-50) 0%, var(--color-purple-50) 100%);
          border: 1px solid var(--color-blue-200);
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 24px;
        }

        .onboarding-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .onboarding-title-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .onboarding-icon {
          font-size: 28px;
        }

        .onboarding-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-grey-900);
          margin: 0 0 4px;
        }

        .onboarding-subtitle {
          font-size: 13px;
          color: var(--color-grey-600);
          margin: 0;
        }

        .dismiss-button {
          background: none;
          border: none;
          color: var(--color-grey-400);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .dismiss-button:hover {
          background: var(--color-grey-100);
          color: var(--color-grey-600);
        }

        .progress-bar-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--color-blue-500) 0%, var(--color-purple-500) 100%);
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .progress-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--color-grey-600);
          margin-bottom: 16px;
        }

        .tasks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }

        .task-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 16px;
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-card:hover:not(.completed) {
          border-color: var(--color-blue-300);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
          transform: translateY(-1px);
        }

        .task-card.completed {
          background: var(--color-green-50);
          border-color: var(--color-green-200);
          cursor: default;
        }

        .task-card.next {
          border-color: var(--color-blue-400);
          box-shadow: 0 0 0 3px var(--color-blue-100);
        }

        .task-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .task-icon {
          font-size: 18px;
        }

        .task-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-grey-900);
          flex: 1;
        }

        .task-status {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .task-status.completed {
          background: var(--color-green-500);
          color: white;
        }

        .task-status.pending {
          background: var(--color-grey-200);
          color: var(--color-grey-500);
        }

        .task-status.next {
          background: var(--color-blue-500);
          color: white;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .task-description {
          font-size: 11px;
          color: var(--color-grey-500);
          line-height: 1.4;
        }

        .task-action {
          display: none;
          font-size: 12px;
          color: var(--color-blue-600);
          font-weight: 500;
          margin-top: 4px;
        }

        .task-card:hover:not(.completed) .task-action {
          display: block;
        }
      `}</style>

      <div className="onboarding-header">
        <div className="onboarding-title-section">
          <span className="onboarding-icon">🎯</span>
          <div>
            <h3 className="onboarding-title">Getting Started with Intentr</h3>
            <p className="onboarding-subtitle">Complete these steps to set up your workspace</p>
          </div>
        </div>
        <button className="dismiss-button" onClick={handleDismiss} title="Dismiss for today">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="progress-stats">
        <span>{completedCount} of {totalTasks} tasks completed</span>
        <span>{progressPercent}% complete</span>
      </div>

      <div className="tasks-grid">
        {tasks.map((task) => {
          const isCompleted = completedTasks.has(task.id);
          const isNext = task.id === nextTask?.id;

          return (
            <div
              key={task.id}
              className={`task-card ${isCompleted ? 'completed' : ''} ${isNext ? 'next' : ''}`}
              onClick={() => !isCompleted && handleTaskAction(task)}
            >
              <div className="task-header">
                <span className="task-icon">{task.icon}</span>
                <span className="task-title">{task.title}</span>
                <span className={`task-status ${isCompleted ? 'completed' : isNext ? 'next' : 'pending'}`}>
                  {isCompleted ? '✓' : isNext ? '→' : (tasks.indexOf(task) + 1)}
                </span>
              </div>
              <div className="task-description">{task.description}</div>
              {!isCompleted && (
                <div className="task-action">{task.action.label} →</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingProgress;
