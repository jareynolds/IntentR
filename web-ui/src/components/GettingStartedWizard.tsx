import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  details: string[];
  action?: {
    label: string;
    path: string;
  };
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Intentr',
    description: 'Intentr helps you build software faster using AI-assisted development with clear intent and specifications.',
    icon: '👋',
    details: [
      'Define your vision and ideas clearly',
      'AI helps translate intent to specifications',
      'Generate code from well-defined requirements',
      'Maintain traceability from idea to implementation',
    ],
  },
  {
    id: 'workflow',
    title: 'The INTENT Workflow',
    description: 'Intentr follows a structured workflow that ensures quality and traceability at every step.',
    icon: '🔄',
    details: [
      'Intent Declaration - Capture ideas, vision, and storyboards',
      'Formal Specification - Define capabilities and enablers',
      'System Derivation - Generate code from specifications',
      'Continuous Validation - Test and verify implementation',
    ],
  },
  {
    id: 'workspace',
    title: 'Workspaces',
    description: 'Workspaces are your project containers. Each workspace has its own specifications, settings, and generated code.',
    icon: '📁',
    details: [
      'Create workspaces for each project',
      'Configure AI principles per workspace',
      'Set UI frameworks and styles',
      'Track progress through development phases',
    ],
    action: {
      label: 'Create Your First Workspace',
      path: '/workspaces?action=new',
    },
  },
  {
    id: 'ai-principles',
    title: 'AI Governance',
    description: 'Intentr includes configurable AI governance levels to match your project requirements.',
    icon: '🤖',
    details: [
      'Level 1: Advisory - Suggestions only',
      'Level 2: Guided - Recommended actions',
      'Level 3: Controlled - Enforced with warnings',
      'Level 4: Mandatory - Strict enforcement',
      'Level 5: Absolute - Zero tolerance',
    ],
  },
  {
    id: 'ready',
    title: 'You\'re Ready!',
    description: 'You now understand the basics of Intentr. Let\'s start building something amazing!',
    icon: '🚀',
    details: [
      'Use the Step-by-Step Wizard for guided development',
      'Check the Help drawer anytime for assistance',
      'Explore the Walkthroughs section for more tutorials',
      'Join the community for support and best practices',
    ],
    action: {
      label: 'Start Building',
      path: '/wizard/workspace',
    },
  },
];

interface GettingStartedWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const GettingStartedWizard: React.FC<GettingStartedWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = WIZARD_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setIsAnimating(false);
    }, 200);
  };

  const handlePrevious = () => {
    if (isFirstStep) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setIsAnimating(false);
    }, 200);
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleAction = () => {
    if (step.action) {
      onComplete();
      navigate(step.action.path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wizard-overlay">
      <style>{`
        .wizard-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .wizard-modal {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 560px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .wizard-header {
          position: relative;
          padding: 24px 24px 16px;
          background: var(--color-grey-100);
          color: var(--color-grey-900);
        }

        .wizard-skip {
          position: absolute;
          top: 16px;
          right: 16px;
          background: var(--color-grey-200);
          border: none;
          padding: 6px 12px;
          border-radius: 20px;
          color: var(--color-grey-700);
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .wizard-skip:hover {
          background: var(--color-grey-300);
        }

        .wizard-progress {
          display: flex;
          gap: 6px;
          margin-bottom: 20px;
        }

        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }

        .progress-dot.active {
          width: 24px;
          border-radius: 4px;
          background: white;
        }

        .progress-dot.completed {
          background: rgba(255, 255, 255, 0.7);
        }

        .wizard-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .wizard-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px;
        }

        .wizard-description {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.5;
          margin: 0;
        }

        .wizard-content {
          padding: 24px;
          transition: opacity 0.2s ease;
        }

        .wizard-content.animating {
          opacity: 0.5;
        }

        .details-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: var(--color-grey-50);
          border-radius: 8px;
          font-size: 14px;
          color: var(--color-grey-700);
          line-height: 1.4;
        }

        .detail-check {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-green-100);
          color: var(--color-green-600);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .wizard-action {
          margin-top: 20px;
          padding: 16px;
          background: var(--color-blue-50);
          border-radius: 8px;
          border: 1px dashed var(--color-blue-200);
        }

        .action-button {
          width: 100%;
          padding: 12px 20px;
          background: var(--color-blue-600);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .action-button:hover {
          background: var(--color-blue-700);
        }

        .wizard-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: var(--color-grey-50);
          border-top: 1px solid var(--color-grey-100);
        }

        .footer-hint {
          font-size: 12px;
          color: var(--color-grey-500);
        }

        .footer-buttons {
          display: flex;
          gap: 12px;
        }

        .nav-button {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .nav-button.secondary {
          background: white;
          border: 1px solid var(--color-grey-300);
          color: var(--color-grey-700);
        }

        .nav-button.secondary:hover {
          background: var(--color-grey-50);
          border-color: var(--color-grey-400);
        }

        .nav-button.secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-button.primary {
          background: var(--color-blue-600);
          border: none;
          color: white;
        }

        .nav-button.primary:hover {
          background: var(--color-blue-700);
        }

        .step-counter {
          font-size: 13px;
          color: var(--color-grey-600);
        }
      `}</style>

      <div className="wizard-modal">
        <div className="wizard-header">
          <button className="wizard-skip" onClick={handleSkip}>
            Skip Tutorial
          </button>
          <div className="wizard-progress">
            {WIZARD_STEPS.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${
                  index === currentStep ? 'active' :
                  index < currentStep ? 'completed' : ''
                }`}
              />
            ))}
          </div>
          <div className="wizard-icon">{step.icon}</div>
          <h2 className="wizard-title">{step.title}</h2>
          <p className="wizard-description">{step.description}</p>
        </div>

        <div className={`wizard-content ${isAnimating ? 'animating' : ''}`}>
          <div className="details-list">
            {step.details.map((detail, index) => (
              <div key={index} className="detail-item">
                <span className="detail-check">✓</span>
                <span>{detail}</span>
              </div>
            ))}
          </div>

          {step.action && (
            <div className="wizard-action">
              <button className="action-button" onClick={handleAction}>
                {step.action.label}
              </button>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <span className="step-counter">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </span>
          <div className="footer-buttons">
            <button
              className="nav-button secondary"
              onClick={handlePrevious}
              disabled={isFirstStep}
            >
              Back
            </button>
            <button
              className="nav-button primary"
              onClick={handleNext}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GettingStartedWizard;
