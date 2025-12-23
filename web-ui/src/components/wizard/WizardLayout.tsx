import React, { useState } from 'react';
import { useWizard, type WizardFlowType } from '../../context/WizardContext';
import { ConfirmDialog } from '../ConfirmDialog';

interface WizardLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  canProceed?: boolean;
}

const FLOW_TYPE_LABELS: Record<WizardFlowType, string> = {
  'new': 'New Application',
  'refactor': 'Refactor IntentR App',
  'reverse-engineer': 'Reverse Engineer App',
};

export const WizardLayout: React.FC<WizardLayoutProps> = ({
  children,
  showNavigation = true,
  nextLabel,
  previousLabel,
  onNext,
  onPrevious,
  canProceed = true,
}) => {
  const {
    flowType,
    isFirstStep,
    isLastStep,
    isFirstSubpage,
    isLastSubpage,
    currentStep,
    currentSubpage,
    currentSubpages,
    currentSubpageIndex,
    currentStepIndex,
    steps,
    nextSubpage,
    previousSubpage,
    jumpToNextSection,
    goToStep,
    exitWizard,
    getStepStatus,
  } = useWizard();

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else {
      nextSubpage();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else {
      previousSubpage();
    }
  };

  const handleJumpToNextSection = () => {
    jumpToNextSection();
  };

  const handleExitClick = () => {
    setShowExitConfirm(true);
  };

  const handleExitConfirm = () => {
    setShowExitConfirm(false);
    exitWizard();
  };

  const getNextLabel = () => {
    if (nextLabel) return nextLabel;
    if (isLastStep && isLastSubpage) return 'Complete';
    return 'Next';
  };

  return (
    <div className="wizard-layout">
      {/* Compact Single-Line Header */}
      <header className="wizard-compact-header">
        {/* Exit Button */}
        <button
          onClick={handleExitClick}
          className="wizard-exit-btn"
          aria-label="Exit wizard"
          title="Exit Wizard"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Previous Button */}
        {showNavigation && !(isFirstStep && isFirstSubpage) && (
          <button
            className="wizard-nav-btn wizard-nav-btn--prev"
            onClick={handlePrevious}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Prev</span>
          </button>
        )}

        {/* Center: Step Dots + Current Info */}
        <div className="wizard-center">
          {/* Step Dots */}
          <div className="wizard-step-dots">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              return (
                <button
                  key={step.id}
                  className={`wizard-dot wizard-dot--${status}`}
                  onClick={() => goToStep(index)}
                  title={step.name}
                >
                  {status === 'completed' && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Current Step Info */}
          <div className="wizard-step-info">
            <span className="wizard-step-label">
              Step {currentStepIndex + 1}/{steps.length}: {currentStep?.name}
            </span>
            {currentSubpage && currentSubpages.length > 1 && (
              <span className="wizard-subpage-label">
                - {currentSubpage.name} ({currentSubpageIndex + 1}/{currentSubpages.length})
              </span>
            )}
          </div>

          {/* Flow Type Badge */}
          {flowType && (
            <span className="wizard-flow-badge">{FLOW_TYPE_LABELS[flowType]}</span>
          )}
        </div>

        {/* Right: Skip + Next */}
        {showNavigation && (
          <div className="wizard-nav-right">
            {!isLastStep && !isLastSubpage && (
              <button
                className="wizard-nav-btn wizard-nav-btn--skip"
                onClick={handleJumpToNextSection}
                title="Skip to next section"
              >
                <span>Skip</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <button
              className="wizard-nav-btn wizard-nav-btn--next"
              onClick={handleNext}
              disabled={!canProceed}
            >
              <span>{getNextLabel()}</span>
              {!(isLastStep && isLastSubpage) && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="wizard-content">
        {children}
      </main>

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Exit Wizard Mode?"
        message="Are you sure you want to exit the wizard? Your progress will be saved, and you can continue later or use sidebar navigation instead."
        confirmLabel="Exit Wizard"
        confirmVariant="danger"
        onConfirm={handleExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
      />

      <style>{`
        .wizard-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--color-grey-50, #f9fafb);
        }

        /* Compact Header - Single Line */
        .wizard-compact-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: white;
          border-bottom: 1px solid var(--color-grey-200, #e5e7eb);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          height: 48px;
        }

        /* Exit Button - Compact */
        .wizard-exit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--color-grey-300, #d1d5db);
          border-radius: 0.375rem;
          background: white;
          color: var(--color-grey-600, #4b5563);
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .wizard-exit-btn:hover {
          background: var(--color-red-50, #fef2f2);
          border-color: var(--color-red-300, #fca5a5);
          color: var(--color-red-600, #dc2626);
        }

        .wizard-exit-btn svg {
          width: 16px;
          height: 16px;
        }

        /* Navigation Buttons */
        .wizard-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.625rem;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
          white-space: nowrap;
        }

        .wizard-nav-btn svg {
          width: 14px;
          height: 14px;
        }

        .wizard-nav-btn--prev,
        .wizard-nav-btn--skip {
          background: white;
          border-color: var(--color-grey-300, #d1d5db);
          color: var(--color-grey-700, #374151);
        }

        .wizard-nav-btn--prev:hover,
        .wizard-nav-btn--skip:hover {
          background: var(--color-grey-100, #f3f4f6);
          border-color: var(--color-grey-400, #9ca3af);
        }

        .wizard-nav-btn--next {
          background: var(--color-blue-500, #3b82f6);
          color: white;
        }

        .wizard-nav-btn--next:hover {
          background: var(--color-blue-600, #2563eb);
        }

        .wizard-nav-btn--next:disabled {
          background: var(--color-grey-300, #d1d5db);
          cursor: not-allowed;
        }

        /* Center Section */
        .wizard-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          min-width: 0;
        }

        /* Step Dots */
        .wizard-step-dots {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .wizard-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid;
          cursor: pointer;
          transition: all 0.15s ease;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wizard-dot svg {
          width: 8px;
          height: 8px;
        }

        .wizard-dot--completed {
          background: var(--color-green-500, #22c55e);
          border-color: var(--color-green-500, #22c55e);
          color: white;
        }

        .wizard-dot--active {
          background: var(--color-blue-500, #3b82f6);
          border-color: var(--color-blue-500, #3b82f6);
          box-shadow: 0 0 0 3px var(--color-blue-100, #dbeafe);
        }

        .wizard-dot--upcoming {
          background: white;
          border-color: var(--color-grey-300, #d1d5db);
        }

        .wizard-dot--upcoming:hover {
          border-color: var(--color-grey-400, #9ca3af);
        }

        /* Step Info */
        .wizard-step-info {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8125rem;
          color: var(--color-grey-700, #374151);
        }

        .wizard-step-label {
          font-weight: 600;
        }

        .wizard-subpage-label {
          color: var(--color-grey-500, #6b7280);
        }

        /* Flow Badge */
        .wizard-flow-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          background: var(--color-blue-100, #dbeafe);
          color: var(--color-blue-700, #1d4ed8);
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.025em;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        /* Right Nav Group */
        .wizard-nav-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Content */
        .wizard-content {
          flex: 1;
          padding: 2.5rem 3rem;
          overflow-y: auto;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .wizard-compact-header {
            padding: 0.375rem 0.75rem;
            gap: 0.5rem;
          }

          .wizard-step-info {
            font-size: 0.75rem;
          }

          .wizard-subpage-label {
            display: none;
          }

          .wizard-flow-badge {
            display: none;
          }

          .wizard-nav-btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }

          .wizard-nav-btn span {
            display: none;
          }

          .wizard-nav-btn svg {
            width: 16px;
            height: 16px;
          }

          .wizard-content {
            padding: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .wizard-step-dots {
            display: none;
          }

          .wizard-step-label {
            font-size: 0.6875rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WizardLayout;
