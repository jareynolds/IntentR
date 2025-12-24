import React from 'react';
import { useWizard } from '../../context/WizardContext';

interface WizardStepperProps {
  className?: string;
}

// Icon components for each step
const StepIcons: Record<string, React.ReactNode> = {
  workspace: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  intent: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  specification: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'control-loop': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  implementation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
};

// Fixed display steps that always show the standard workflow
const DISPLAY_STEPS = [
  { id: 'workspace', name: 'Workspace' },
  { id: 'intent', name: 'Intent' },
  { id: 'specification', name: 'Specification' },
  { id: 'system', name: 'UI Design' },
  { id: 'control-loop', name: 'Control Loop' },
  { id: 'implementation', name: 'Implementation' },
];

export const WizardStepper: React.FC<WizardStepperProps> = ({ className = '' }) => {
  const { steps, currentStepIndex, completedSteps, goToStep } = useWizard();

  // Map the current workflow step to the display step index
  const currentStep = steps[currentStepIndex];
  const currentDisplayIndex = currentStep
    ? DISPLAY_STEPS.findIndex(ds => ds.id === currentStep.id)
    : 0;

  // Determine status based on actual workflow progress
  const getDisplayStepStatus = (displayIndex: number, displayStepId: string) => {
    // Find if this display step exists in the current workflow
    const workflowIndex = steps.findIndex(s => s.id === displayStepId);

    if (workflowIndex === -1) {
      // Step not in current workflow - show as upcoming/inactive
      return 'upcoming';
    }

    if (completedSteps.has(workflowIndex)) {
      return 'completed';
    }

    if (workflowIndex === currentStepIndex) {
      return 'active';
    }

    return 'upcoming';
  };

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={`wizard-stepper ${className}`}>
      <div className="wizard-stepper-container">
        {DISPLAY_STEPS.map((displayStep, index) => {
          const status = getDisplayStepStatus(index, displayStep.id);
          // Allow clicking any section that's in the current workflow
          const workflowIndex = steps.findIndex(s => s.id === displayStep.id);
          const isInWorkflow = workflowIndex !== -1;
          const isClickable = isInWorkflow; // Allow jumping to any section in workflow

          return (
            <React.Fragment key={displayStep.id}>
              {/* Step Card */}
              <button
                onClick={() => {
                  if (isClickable && isInWorkflow) {
                    goToStep(workflowIndex);
                  }
                }}
                disabled={!isClickable}
                className={`wizard-step-card wizard-step-card--${status} ${isClickable ? 'wizard-step-card--clickable' : ''} ${!isInWorkflow ? 'wizard-step-card--not-in-workflow' : ''}`}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                <div className="wizard-step-icon">
                  {status === 'completed' ? (
                    <svg className="wizard-step-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    StepIcons[displayStep.id] || <span>{index + 1}</span>
                  )}
                </div>
                <div className="wizard-step-name">{displayStep.name}</div>
                <div className="wizard-step-status">
                  {status === 'completed' && 'Done'}
                  {status === 'active' && 'Current'}
                  {status === 'upcoming' && ''}
                </div>
              </button>

              {/* Connector Arrow */}
              {index < DISPLAY_STEPS.length - 1 && (
                <div className="wizard-step-connector">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        .wizard-stepper {
          width: 100%;
          padding: 1rem 0;
        }

        .wizard-stepper-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .wizard-step-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 1rem;
          min-width: 100px;
          border-radius: 0.5rem;
          border: 2px solid;
          background: white;
          cursor: default;
          transition: all 0.2s ease;
        }

        .wizard-step-card--clickable {
          cursor: pointer;
        }

        .wizard-step-card--clickable:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .wizard-step-card--completed {
          border-color: var(--color-green-500, #22c55e);
          background-color: var(--color-green-50, #f0fdf4);
        }

        .wizard-step-card--completed .wizard-step-icon {
          background-color: var(--color-green-500, #22c55e);
          color: white;
        }

        .wizard-step-card--completed .wizard-step-name {
          color: var(--color-green-700, #15803d);
        }

        .wizard-step-card--completed .wizard-step-status {
          color: var(--color-green-600, #16a34a);
        }

        .wizard-step-card--active {
          border-color: var(--color-blue-500, #3b82f6);
          background-color: var(--color-blue-50, #eff6ff);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .wizard-step-card--active .wizard-step-icon {
          background-color: var(--color-blue-500, #3b82f6);
          color: white;
        }

        .wizard-step-card--active .wizard-step-name {
          color: var(--color-blue-700, #1d4ed8);
          font-weight: 600;
        }

        .wizard-step-card--active .wizard-step-status {
          color: var(--color-blue-600, #2563eb);
        }

        .wizard-step-card--upcoming {
          border-color: var(--color-grey-300, #d1d5db);
          background-color: var(--color-grey-50, #f9fafb);
        }

        .wizard-step-card--upcoming .wizard-step-icon {
          background-color: var(--color-grey-300, #d1d5db);
          color: var(--color-grey-600, #4b5563);
        }

        .wizard-step-card--upcoming .wizard-step-name {
          color: var(--color-grey-500, #6b7280);
        }

        .wizard-step-card--upcoming:disabled {
          opacity: 0.7;
        }

        .wizard-step-card--not-in-workflow {
          opacity: 0.5;
          border-style: dashed;
        }

        .wizard-step-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.375rem;
        }

        .wizard-step-icon svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .wizard-step-check {
          width: 1rem;
          height: 1rem;
        }

        .wizard-step-name {
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
          white-space: nowrap;
        }

        .wizard-step-status {
          font-size: 0.625rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.125rem;
          min-height: 0.875rem;
        }

        .wizard-step-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-grey-400, #9ca3af);
        }

        .wizard-step-connector svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        @media (max-width: 768px) {
          .wizard-step-card {
            min-width: 80px;
            padding: 0.5rem 0.75rem;
          }

          .wizard-step-name {
            font-size: 0.625rem;
          }

          .wizard-step-icon {
            width: 2rem;
            height: 2rem;
          }

          .wizard-step-icon svg {
            width: 1rem;
            height: 1rem;
          }

          .wizard-step-connector svg {
            width: 1rem;
            height: 1rem;
          }
        }

        @media (max-width: 480px) {
          .wizard-stepper-container {
            gap: 0.25rem;
          }

          .wizard-step-card {
            min-width: 60px;
            padding: 0.375rem 0.5rem;
          }

          .wizard-step-name {
            font-size: 0.5rem;
          }

          .wizard-step-status {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default WizardStepper;
