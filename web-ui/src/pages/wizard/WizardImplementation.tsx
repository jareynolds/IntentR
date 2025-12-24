import React from 'react';
import { WizardLayout } from '../../components/wizard';
import { System } from '../System';
import { Code } from '../Code';
import { Run } from '../Run';
import { AIPrinciples } from '../AIPrinciples';

export const WizardImplementation: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'system' | 'ai' | 'code' | 'run'>('system');

  return (
    <WizardLayout>
      <div className="wizard-implementation">
        <div className="wizard-implementation-header">
          <h2>Implementation Phase</h2>
          <p>Configure your UI design, generate code with AI, and run your application.</p>
        </div>

        <div className="wizard-implementation-tabs">
          <button
            className={`wizard-tab ${activeTab === 'system' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            UI Design
          </button>
          <button
            className={`wizard-tab ${activeTab === 'ai' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI Principles
          </button>
          <button
            className={`wizard-tab ${activeTab === 'code' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            Code
          </button>
          <button
            className={`wizard-tab ${activeTab === 'run' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('run')}
          >
            Run
          </button>
        </div>

        <div className="wizard-implementation-content">
          {activeTab === 'system' && <System />}
          {activeTab === 'ai' && <AIPrinciples />}
          {activeTab === 'code' && <Code />}
          {activeTab === 'run' && <Run />}
        </div>
      </div>

      <style>{`
        .wizard-implementation-header {
          margin-bottom: 1.5rem;
        }

        .wizard-implementation-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .wizard-implementation-header p {
          color: var(--color-grey-600);
        }

        .wizard-implementation-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--color-grey-200);
          padding-bottom: 0.5rem;
        }

        .wizard-tab {
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-grey-600);
          cursor: pointer;
          border-radius: 0.375rem;
          transition: all 0.2s ease;
        }

        .wizard-tab:hover {
          background: var(--color-grey-100);
          color: var(--color-grey-900);
        }

        .wizard-tab--active {
          background: var(--color-orange-100);
          color: var(--color-orange-700);
        }

        .wizard-implementation-content {
          min-height: 400px;
        }
      `}</style>
    </WizardLayout>
  );
};

export default WizardImplementation;
