import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizard, WIZARD_FLOWS, type WizardFlowType } from '../../context/WizardContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Card } from '../Card';
import { Button } from '../Button';

interface WorkspaceTypeOption {
  id: WizardFlowType;
  title: string;
  description: string;
  icon: React.ReactNode;
  workflow: string[];
  color: string;
}

const WORKSPACE_TYPE_OPTIONS: WorkspaceTypeOption[] = [
  {
    id: 'new',
    title: 'Create New Application',
    description: 'Start from scratch with the full INTENT development workflow. Define your vision, create capabilities, design the solution, test, and implement.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    workflow: ['Intent Declaration', 'Formal Specification', 'System Derivation', 'Continuous Validation'],
    color: 'blue',
  },
  {
    id: 'refactor',
    title: 'Refactor IntentR Application',
    description: 'Improve an existing IntentR workspace that already has defined capabilities. Skip conception and go straight to enhancing definitions.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    workflow: ['Formal Specification', 'System Derivation', 'Continuous Validation'],
    color: 'purple',
  },
  {
    id: 'reverse-engineer',
    title: 'Reverse Engineer Application',
    description: 'Document and integrate an existing non-IntentR application. Start with discovery to analyze the codebase, then create specifications.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    workflow: ['Discovery', 'Formal Specification', 'System Derivation', 'Continuous Validation'],
    color: 'orange',
  },
];

export const WorkspaceTypeStep: React.FC = () => {
  const navigate = useNavigate();
  const { setFlowType, nextStep } = useWizard();
  const { currentWorkspace, workspaces } = useWorkspace();
  const [selectedType, setSelectedType] = useState<WizardFlowType | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(currentWorkspace?.id || '');

  const handleTypeSelect = (type: WizardFlowType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType) {
      setFlowType(selectedType);
      // Navigate to the first step after workspace (which is the start page of the next section)
      const steps = WIZARD_FLOWS[selectedType];
      if (steps.length > 1) {
        navigate(steps[1].startPath);
      }
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      blue: {
        bg: isSelected ? 'var(--color-blue-50)' : 'white',
        border: isSelected ? 'var(--color-blue-500)' : 'var(--color-grey-200)',
        text: 'var(--color-blue-600)',
        hover: 'var(--color-blue-50)',
      },
      purple: {
        bg: isSelected ? 'var(--color-purple-50)' : 'white',
        border: isSelected ? 'var(--color-purple-500)' : 'var(--color-grey-200)',
        text: 'var(--color-purple-600)',
        hover: 'var(--color-purple-50)',
      },
      orange: {
        bg: isSelected ? 'var(--color-orange-50)' : 'white',
        border: isSelected ? 'var(--color-orange-500)' : 'var(--color-grey-200)',
        text: 'var(--color-orange-600)',
        hover: 'var(--color-orange-50)',
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="workspace-type-step">
      <div className="workspace-type-header">
        <h1>What would you like to do?</h1>
        <p>Select the type of project you want to work on. This will determine your workflow path.</p>
      </div>

      {/* Current Workspace Display */}
      {currentWorkspace && (
        <div className="current-workspace-info">
          <span className="current-workspace-label">Current Workspace:</span>
          <span className="current-workspace-name">{currentWorkspace.name}</span>
        </div>
      )}

      {/* Workspace Type Options */}
      <div className="workspace-type-options">
        {WORKSPACE_TYPE_OPTIONS.map((option) => {
          const isSelected = selectedType === option.id;
          const colors = getColorClasses(option.color, isSelected);

          return (
            <button
              key={option.id}
              onClick={() => handleTypeSelect(option.id)}
              className={`workspace-type-card ${isSelected ? 'workspace-type-card--selected' : ''}`}
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
              }}
            >
              <div className="workspace-type-card-header">
                <div
                  className="workspace-type-icon"
                  style={{ color: colors.text }}
                >
                  {option.icon}
                </div>
                <div className="workspace-type-radio">
                  {isSelected ? (
                    <div className="radio-selected" style={{ backgroundColor: colors.text }} />
                  ) : (
                    <div className="radio-unselected" />
                  )}
                </div>
              </div>

              <h3 className="workspace-type-title">{option.title}</h3>
              <p className="workspace-type-description">{option.description}</p>

              <div className="workspace-type-workflow">
                <span className="workflow-label">Workflow:</span>
                <div className="workflow-steps">
                  {option.workflow.map((step, index) => (
                    <React.Fragment key={step}>
                      <span className="workflow-step">{step}</span>
                      {index < option.workflow.length - 1 && (
                        <span className="workflow-arrow">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="workspace-type-actions">
        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={!selectedType}
        >
          Continue with {selectedType ? WORKSPACE_TYPE_OPTIONS.find(o => o.id === selectedType)?.title : 'selected option'}
          <svg className="continue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>

      <style>{`
        .workspace-type-step {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
        }

        .workspace-type-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .workspace-type-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .workspace-type-header p {
          font-size: 1rem;
          color: var(--color-grey-600);
        }

        .current-workspace-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--color-grey-100);
          border-radius: 0.5rem;
          margin-bottom: 2rem;
        }

        .current-workspace-label {
          font-size: 0.875rem;
          color: var(--color-grey-600);
        }

        .current-workspace-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .workspace-type-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .workspace-type-card {
          display: block;
          width: 100%;
          text-align: left;
          padding: 1.5rem;
          border: 2px solid;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .workspace-type-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .workspace-type-card--selected {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .workspace-type-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .workspace-type-icon {
          width: 2.5rem;
          height: 2.5rem;
        }

        .workspace-type-icon svg {
          width: 100%;
          height: 100%;
        }

        .workspace-type-radio {
          width: 1.25rem;
          height: 1.25rem;
        }

        .radio-selected {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          position: relative;
        }

        .radio-selected::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 0.5rem;
          height: 0.5rem;
          background: white;
          border-radius: 50%;
        }

        .radio-unselected {
          width: 100%;
          height: 100%;
          border: 2px solid var(--color-grey-300);
          border-radius: 50%;
        }

        .workspace-type-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .workspace-type-description {
          font-size: 0.875rem;
          color: var(--color-grey-600);
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .workspace-type-workflow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-grey-200);
        }

        .workflow-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-grey-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .workflow-steps {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.25rem;
        }

        .workflow-step {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: var(--color-grey-100);
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-grey-700);
        }

        .workflow-arrow {
          color: var(--color-grey-400);
          font-size: 0.75rem;
        }

        .workspace-type-actions {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }

        .continue-icon {
          width: 1.25rem;
          height: 1.25rem;
          margin-left: 0.5rem;
        }

        @media (max-width: 640px) {
          .workspace-type-step {
            padding: 1rem;
          }

          .workspace-type-header h1 {
            font-size: 1.5rem;
          }

          .workspace-type-card {
            padding: 1rem;
          }

          .workflow-steps {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default WorkspaceTypeStep;
