import React from 'react';
import { WizardLayout } from '../../components/wizard';
import { Designs } from '../Designs';
import { UIFramework } from '../UIFramework';
import { UIStyles } from '../UIStyles';

export const WizardSystem: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'assets' | 'framework' | 'styles'>('assets');

  return (
    <WizardLayout>
      <div className="wizard-system">
        <div className="wizard-system-header">
          <h2>UI Design Phase</h2>
          <p>Create UI assets, select frameworks, and define styles for your application.</p>
        </div>

        <div className="wizard-system-tabs">
          <button
            className={`wizard-tab ${activeTab === 'assets' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            UI Assets
          </button>
          <button
            className={`wizard-tab ${activeTab === 'framework' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('framework')}
          >
            UI Framework
          </button>
          <button
            className={`wizard-tab ${activeTab === 'styles' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('styles')}
          >
            UI Styles
          </button>
        </div>

        <div className="wizard-system-content">
          {activeTab === 'assets' && <Designs />}
          {activeTab === 'framework' && <UIFramework />}
          {activeTab === 'styles' && <UIStyles />}
        </div>
      </div>

      <style>{`
        .wizard-system-header {
          margin-bottom: 1.5rem;
        }

        .wizard-system-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .wizard-system-header p {
          color: var(--color-grey-600);
        }

        .wizard-system-tabs {
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
          background: var(--color-indigo-100);
          color: var(--color-indigo-700);
        }

        .wizard-system-content {
          min-height: 400px;
        }
      `}</style>
    </WizardLayout>
  );
};

export default WizardSystem;
