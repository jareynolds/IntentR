import React from 'react';
import { WizardLayout, WorkspaceTypeStep } from '../../components/wizard';

export const WizardWorkspace: React.FC = () => {
  return (
    <WizardLayout>
      <WorkspaceTypeStep />
    </WizardLayout>
  );
};

export default WizardWorkspace;
