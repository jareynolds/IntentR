import React from 'react';
import { useWizard } from '../../context/WizardContext';

interface WizardSubpageStepperProps {
  className?: string;
}

export const WizardSubpageStepper: React.FC<WizardSubpageStepperProps> = ({ className = '' }) => {
  const { currentSubpages, currentSubpageIndex, goToSubpage } = useWizard();

  if (currentSubpages.length <= 1) {
    return null;
  }

  return (
    <div className={`wizard-subpage-stepper ${className}`}>
      <div className="wizard-subpage-container">
        {currentSubpages.map((subpage, index) => {
          const isActive = index === currentSubpageIndex;
          const isCompleted = index < currentSubpageIndex;
          const status = isActive ? 'active' : isCompleted ? 'completed' : 'upcoming';

          return (
            <React.Fragment key={subpage.id}>
              {/* Subpage Pill */}
              <button
                onClick={() => goToSubpage(index)}
                className={`wizard-subpage-pill wizard-subpage-pill--${status}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="wizard-subpage-indicator">
                  {isCompleted ? (
                    <svg className="wizard-subpage-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="wizard-subpage-name">{subpage.name}</span>
              </button>

              {/* Connector */}
              {index < currentSubpages.length - 1 && (
                <div className={`wizard-subpage-connector ${index < currentSubpageIndex ? 'wizard-subpage-connector--completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        .wizard-subpage-stepper {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: var(--color-grey-50, #f9fafb);
          border-top: 1px solid var(--color-grey-200, #e5e7eb);
        }

        .wizard-subpage-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }

        .wizard-subpage-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .wizard-subpage-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .wizard-subpage-pill--completed {
          border-color: var(--color-green-400, #4ade80);
          background: var(--color-green-50, #f0fdf4);
        }

        .wizard-subpage-pill--completed .wizard-subpage-indicator {
          background: var(--color-green-500, #22c55e);
          color: white;
        }

        .wizard-subpage-pill--completed .wizard-subpage-name {
          color: var(--color-green-700, #15803d);
        }

        .wizard-subpage-pill--active {
          border-color: var(--color-blue-400, #60a5fa);
          background: var(--color-blue-50, #eff6ff);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .wizard-subpage-pill--active .wizard-subpage-indicator {
          background: var(--color-blue-500, #3b82f6);
          color: white;
        }

        .wizard-subpage-pill--active .wizard-subpage-name {
          color: var(--color-blue-700, #1d4ed8);
          font-weight: 600;
        }

        .wizard-subpage-pill--upcoming {
          border-color: var(--color-grey-300, #d1d5db);
          background: white;
        }

        .wizard-subpage-pill--upcoming .wizard-subpage-indicator {
          background: var(--color-grey-200, #e5e7eb);
          color: var(--color-grey-500, #6b7280);
        }

        .wizard-subpage-pill--upcoming .wizard-subpage-name {
          color: var(--color-grey-500, #6b7280);
        }

        .wizard-subpage-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .wizard-subpage-check {
          width: 0.875rem;
          height: 0.875rem;
        }

        .wizard-subpage-name {
          font-size: 0.8125rem;
        }

        .wizard-subpage-connector {
          width: 1.5rem;
          height: 2px;
          background: var(--color-grey-300, #d1d5db);
          flex-shrink: 0;
        }

        .wizard-subpage-connector--completed {
          background: var(--color-green-400, #4ade80);
        }

        @media (max-width: 768px) {
          .wizard-subpage-stepper {
            padding: 0.5rem 1rem;
          }

          .wizard-subpage-pill {
            padding: 0.25rem 0.5rem;
          }

          .wizard-subpage-name {
            font-size: 0.75rem;
          }

          .wizard-subpage-indicator {
            width: 1.25rem;
            height: 1.25rem;
            font-size: 0.625rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WizardSubpageStepper;
