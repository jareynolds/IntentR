import React from 'react';
import { WizardLayout } from '../../components/wizard';
import { Ideation } from '../Ideation';
import { Storyboard } from '../Storyboard';
import { Vision } from '../Vision';

// Intent Declaration phase includes: Vision, Ideation, Storyboard
// For wizard mode, we show a combined view or tabs

export const WizardConception: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'vision' | 'ideation' | 'storyboard'>('vision');

  return (
    <WizardLayout>
      <div className="wizard-conception">
        <div className="wizard-conception-header">
          <h2>Intent Declaration Phase</h2>
          <p>Define your vision, capture ideas, and create storyboards for your application.</p>
        </div>

        <div className="wizard-conception-tabs">
          <button
            className={`wizard-tab ${activeTab === 'vision' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('vision')}
          >
            Product Vision
          </button>
          <button
            className={`wizard-tab ${activeTab === 'ideation' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('ideation')}
          >
            Ideation
          </button>
          <button
            className={`wizard-tab ${activeTab === 'storyboard' ? 'wizard-tab--active' : ''}`}
            onClick={() => setActiveTab('storyboard')}
          >
            Storyboard
          </button>
        </div>

        <div className="wizard-conception-content">
          {activeTab === 'vision' && <Vision />}
          {activeTab === 'ideation' && <Ideation />}
          {activeTab === 'storyboard' && <Storyboard />}
        </div>
      </div>

      <style>{`
        .wizard-conception-header {
          margin-bottom: 1.5rem;
        }

        .wizard-conception-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .wizard-conception-header p {
          color: var(--color-grey-600);
        }

        .wizard-conception-tabs {
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
          background: var(--color-blue-100);
          color: var(--color-blue-700);
        }

        .wizard-conception-content {
          min-height: 400px;
        }
      `}</style>
    </WizardLayout>
  );
};

export default WizardConception;
