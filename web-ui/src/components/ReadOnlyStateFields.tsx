import React from 'react';

interface ReadOnlyStateFieldsProps {
  lifecycleState: string;
  workflowStage: string;
  stageStatus: string;
  approvalStatus: string;
}

// Helper functions to format display values
const formatLifecycleState = (state: string): string => {
  const map: Record<string, string> = {
    draft: 'Draft',
    active: 'Active',
    implemented: 'Implemented',
    maintained: 'Maintained',
    retired: 'Retired',
  };
  return map[state] || state;
};

const formatWorkflowStage = (stage: string): string => {
  const map: Record<string, string> = {
    intent: 'Intent',
    specification: 'Specification',
    ui_design: 'UI Design',
    implementation: 'Implementation',
    control_loop: 'Control Loop',
  };
  return map[stage] || stage;
};

const formatStageStatus = (status: string): string => {
  const map: Record<string, string> = {
    in_progress: 'In Progress',
    ready_for_approval: 'Ready for Approval',
    approved: 'Approved',
    blocked: 'Blocked',
  };
  return map[status] || status;
};

const formatApprovalStatus = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return map[status] || status;
};

/**
 * Read-only display of INTENT State Model fields.
 * These fields can only be changed via the Phase Approval pages.
 */
export const ReadOnlyStateFields: React.FC<ReadOnlyStateFieldsProps> = ({
  lifecycleState,
  workflowStage,
  stageStatus,
  approvalStatus,
}) => {
  return (
    <div style={{
      marginTop: '16px',
      paddingTop: '12px',
      borderTop: '1px solid var(--color-border, #e0e0e0)',
      fontSize: '11px',
      color: 'var(--color-secondaryLabel, #666)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center',
    }}>
      <span><span style={{ fontWeight: 500 }}>Lifecycle:</span> {formatLifecycleState(lifecycleState)}</span>
      <span style={{ opacity: 0.5 }}>|</span>
      <span><span style={{ fontWeight: 500 }}>Workflow:</span> {formatWorkflowStage(workflowStage)}</span>
      <span style={{ opacity: 0.5 }}>|</span>
      <span><span style={{ fontWeight: 500 }}>Stage:</span> {formatStageStatus(stageStatus)}</span>
      <span style={{ opacity: 0.5 }}>|</span>
      <span><span style={{ fontWeight: 500 }}>Approval:</span> {formatApprovalStatus(approvalStatus)}</span>
    </div>
  );
};

export default ReadOnlyStateFields;
