import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { WizardLayout } from '../../components/wizard';
import { useWizard } from '../../context/WizardContext';

// Import all page components that can be subpages
import { Vision } from '../Vision';
import { Ideation } from '../Ideation';
import { Storyboard } from '../Storyboard';
import { Capabilities } from '../Capabilities';
import { Enablers } from '../Enablers';
import { StoryMap } from '../StoryMap';
import { Designs } from '../Designs';
import { UIFramework } from '../UIFramework';
import { UIStyles } from '../UIStyles';
import { UIDesigner } from '../UIDesigner';
import { Testing } from '../Testing';
import { AIPrinciples } from '../AIPrinciples';
import { Code } from '../Code';
import { Run } from '../Run';
import { Analyze } from '../Analyze';
import { System } from '../System';
import { IntentApproval } from '../IntentApproval';
import { SpecificationApproval } from '../SpecificationApproval';
import { SystemApproval } from '../SystemApproval';
import { ControlLoopApproval } from '../ControlLoopApproval';

// Map subpage IDs to their components
const SUBPAGE_COMPONENTS: Record<string, React.ComponentType> = {
  // Intent subpages
  'vision': Vision,
  'ideation': Ideation,
  'storyboard': Storyboard,
  'intent-approval': IntentApproval,

  // Specification subpages
  'capabilities': Capabilities,
  'enablers': Enablers,
  'story-map': StoryMap,
  'specification-approval': SpecificationApproval,

  // Design subpages
  'system': System, // System Architecture page
  'designs': Designs,
  'ui-framework': UIFramework,
  'ui-styles': UIStyles,
  'ui-designer': UIDesigner,
  'design-approval': SystemApproval,

  // Control Loop subpages
  'testing': Testing,
  'control-loop-approval': ControlLoopApproval,

  // Implementation subpages
  'ai-principles': AIPrinciples,
  'code': Code,
  'run': Run,

  // Discovery subpages
  'analyze': Analyze,
};

export const WizardSubpage: React.FC = () => {
  const { stepId, subpageId } = useParams<{ stepId: string; subpageId: string }>();
  const { steps, currentStepIndex, isWizardMode, flowType } = useWizard();

  // Find the step index for the URL stepId
  const stepIndex = steps.findIndex(s => s.id === stepId);

  // If wizard mode is not active or no flow type, redirect to wizard start
  if (!isWizardMode || !flowType) {
    return <Navigate to="/wizard/workspace" replace />;
  }

  // If the step is not in the current flow, redirect to current step
  if (stepIndex === -1 && stepId) {
    return <Navigate to={steps[currentStepIndex]?.startPath || '/wizard/workspace'} replace />;
  }

  // If it's an overview subpage, redirect to the start page
  if (subpageId === 'overview') {
    return <Navigate to={`/wizard/${stepId}/start`} replace />;
  }

  // Get the component for this subpage
  const SubpageComponent = subpageId ? SUBPAGE_COMPONENTS[subpageId] : null;

  if (!SubpageComponent) {
    // Subpage not found, redirect to section start
    return <Navigate to={`/wizard/${stepId}/start`} replace />;
  }

  return (
    <WizardLayout>
      <SubpageComponent />
    </WizardLayout>
  );
};

export default WizardSubpage;
