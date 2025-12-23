import React from 'react';
import { WizardLayout } from '../../components/wizard';
import { Testing } from '../Testing';

export const WizardTesting: React.FC = () => {
  return (
    <WizardLayout>
      <div className="wizard-testing">
        <div className="wizard-testing-header">
          <h2>Continuous Validation Phase</h2>
          <p>Define test scenarios and acceptance criteria using BDD/Gherkin syntax for ongoing quality assurance.</p>
        </div>

        <div className="wizard-testing-content">
          <Testing />
        </div>
      </div>

      <style>{`
        .wizard-testing-header {
          margin-bottom: 1.5rem;
        }

        .wizard-testing-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .wizard-testing-header p {
          color: var(--color-grey-600);
        }

        .wizard-testing-content {
          min-height: 400px;
        }
      `}</style>
    </WizardLayout>
  );
};

export default WizardTesting;
