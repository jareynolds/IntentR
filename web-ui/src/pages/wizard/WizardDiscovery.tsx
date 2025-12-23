import React from 'react';
import { WizardLayout } from '../../components/wizard';
import { AIChat } from '../AIChat';

export const WizardDiscovery: React.FC = () => {
  return (
    <WizardLayout>
      <div className="wizard-discovery">
        <div className="wizard-discovery-header">
          <h2>Discovery Phase</h2>
          <p>Analyze and document existing code using AI-assisted discovery. This is a documentation-only phase.</p>
        </div>

        <div className="wizard-discovery-notice">
          <div className="notice-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="notice-content">
            <h4>Discovery Mode Active</h4>
            <p>
              The AI is configured for discovery mode. It will analyze existing code and create documentation
              without making any code changes. Use the AI Assistant below to start analyzing your codebase.
            </p>
          </div>
        </div>

        <div className="wizard-discovery-content">
          <AIChat />
        </div>
      </div>

      <style>{`
        .wizard-discovery-header {
          margin-bottom: 1.5rem;
        }

        .wizard-discovery-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .wizard-discovery-header p {
          color: var(--color-grey-600);
        }

        .wizard-discovery-notice {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: var(--color-orange-50);
          border: 1px solid var(--color-orange-200);
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .notice-icon {
          flex-shrink: 0;
          color: var(--color-orange-600);
        }

        .notice-icon svg {
          width: 1.5rem;
          height: 1.5rem;
        }

        .notice-content h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-orange-800);
          margin-bottom: 0.25rem;
        }

        .notice-content p {
          font-size: 0.875rem;
          color: var(--color-orange-700);
          line-height: 1.5;
        }

        .wizard-discovery-content {
          min-height: 400px;
        }
      `}</style>
    </WizardLayout>
  );
};

export default WizardDiscovery;
