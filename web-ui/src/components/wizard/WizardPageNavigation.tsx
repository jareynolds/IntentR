import React from 'react';
import { useWizard } from '../../context/WizardContext';

/**
 * WizardPageNavigation - Navigation bar for wizard subpages
 *
 * This component provides Previous/Next navigation for pages that are
 * rendered as wizard subpages (e.g., Capabilities, Enablers, Ideation, etc.)
 *
 * It only renders when wizard mode is active.
 */
export const WizardPageNavigation: React.FC = () => {
  const {
    isWizardMode,
    isFirstStep,
    isLastStep,
    isFirstSubpage,
    isLastSubpage,
    currentStep,
    currentSubpage,
    currentSubpages,
    currentSubpageIndex,
    nextSubpage,
    previousSubpage,
    jumpToNextSection,
  } = useWizard();

  // Only render when in wizard mode
  if (!isWizardMode) {
    return null;
  }

  const handleNext = () => {
    nextSubpage();
  };

  const handlePrevious = () => {
    previousSubpage();
  };

  const handleJumpToNextSection = () => {
    jumpToNextSection();
  };

  const getNextLabel = () => {
    if (isLastStep && isLastSubpage) return 'Complete';
    return 'Next';
  };

  return (
    <>
      <div className="wizard-page-nav">
        <div className="wizard-page-nav-left">
          {!(isFirstStep && isFirstSubpage) && (
            <button
              className="wizard-page-nav-btn wizard-page-nav-btn--outline"
              onClick={handlePrevious}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
          )}
        </div>

        <div className="wizard-page-nav-center">
          <span className="wizard-page-nav-progress">
            {currentStep?.name} {currentSubpage ? `- ${currentSubpage.name}` : ''} ({currentSubpageIndex + 1}/{currentSubpages.length})
          </span>
        </div>

        <div className="wizard-page-nav-right">
          {!isLastStep && !isLastSubpage && (
            <button
              className="wizard-page-nav-btn wizard-page-nav-btn--outline"
              onClick={handleJumpToNextSection}
            >
              Skip to Next Section
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <button
            className="wizard-page-nav-btn wizard-page-nav-btn--primary"
            onClick={handleNext}
          >
            {getNextLabel()}
            {!(isLastStep && isLastSubpage) && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .wizard-page-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, var(--color-blue-50, #eff6ff) 0%, var(--color-blue-100, #dbeafe) 100%);
          border: 1px solid var(--color-blue-200, #bfdbfe);
          border-radius: 0.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .wizard-page-nav-left,
        .wizard-page-nav-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .wizard-page-nav-center {
          flex: 1;
          text-align: center;
        }

        .wizard-page-nav-progress {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-blue-700, #1d4ed8);
        }

        .wizard-page-nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .wizard-page-nav-btn svg {
          width: 0.875rem;
          height: 0.875rem;
        }

        .wizard-page-nav-btn--outline {
          background: white;
          border-color: var(--color-grey-300, #d1d5db);
          color: var(--color-grey-700, #374151);
        }

        .wizard-page-nav-btn--outline:hover {
          background: var(--color-grey-100, #f3f4f6);
          border-color: var(--color-grey-400, #9ca3af);
        }

        .wizard-page-nav-btn--primary {
          background: var(--color-blue-500, #3b82f6);
          color: white;
        }

        .wizard-page-nav-btn--primary:hover {
          background: var(--color-blue-600, #2563eb);
        }

        @media (max-width: 768px) {
          .wizard-page-nav {
            flex-wrap: wrap;
            gap: 0.5rem;
            padding: 0.5rem;
          }

          .wizard-page-nav-center {
            order: -1;
            width: 100%;
            margin-bottom: 0.5rem;
          }

          .wizard-page-nav-btn {
            padding: 0.375rem 0.625rem;
            font-size: 0.75rem;
          }

          .wizard-page-nav-btn svg {
            width: 0.75rem;
            height: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .wizard-page-nav-btn span {
            display: none;
          }

          .wizard-page-nav-btn {
            padding: 0.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default WizardPageNavigation;
