import React from 'react';
import { WizardLayout } from '../../components/wizard';
import { Capabilities } from '../Capabilities';
import { Enablers } from '../Enablers';

export const WizardDefinition: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'capabilities' | 'enablers'>('capabilities');

  return (
    <WizardLayout>
      <div className="wizard-definition">
        <div className="wizard-definition-header">
          <h2>Formal Specification Phase</h2>
          <p>Define capabilities, enablers, and design artifacts that describe your application's functionality.</p>
        </div>

        <div className="wizard-definition-tabs">
          <button
            className={`wizard-tab ${activeTab === 'capabilities' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('capabilities')}
          >
            Capabilities
          </button>
          <button
            className={`wizard-tab ${activeTab === 'enablers' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('enablers')}
          >
            Enablers
          </button>
        </div>

        <div className="wizard-definition-content">
          {activeTab === 'capabilities' && <Capabilities />}
          {activeTab === 'enablers' && <Enablers />}
        </div>
      </div>

      <style>{`
        .wizard-definition-header {
          margin-bottom: 1.5rem;
        }

        .wizard-definition-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .wizard-definition-header p {
          color: var(--color-grey-600);
        }

        .wizard-definition-tabs {
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
          background: var(--color-purple-100);
          color: var(--color-purple-700);
        }

        .wizard-definition-content {
          min-height: 400px;
        }
      `}</style>
    </WizardLayout>
  );
};

export default WizardDefinition;
