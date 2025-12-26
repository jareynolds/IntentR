import React, { useState, useEffect } from 'react';
import type {
  Capability,
  CapabilityWithDetails,
  CreateCapabilityRequest,
  CapabilityAsset,
} from '../api/services';
import type {
  LifecycleState,
  WorkflowStage,
  StageStatus,
  ApprovalStatus,
} from '../api/enablerService';
import { capabilityService } from '../api/services';
import { Button } from './Button';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

interface StoryboardFile {
  fileName: string;
  name: string;
}

interface CapabilityFormProps {
  capability?: CapabilityWithDetails;
  onSave: () => void;
  onCancel: () => void;
  allCapabilities: Capability[];
}

// Generate a unique CAP-XXXXXX ID
const generateCapabilityId = (): string => {
  const now = Date.now();
  const timeComponent = parseInt(now.toString().slice(-4));
  const randomComponent = Math.floor(Math.random() * 100);
  const combined = (timeComponent * 100 + randomComponent).toString().padStart(6, '0').slice(-6);
  return `CAP-${combined}`;
};

export const CapabilityForm: React.FC<CapabilityFormProps> = ({
  capability,
  onSave,
  onCancel,
  allCapabilities
}) => {
  const { currentWorkspace } = useWorkspace();
  const [storyboardFiles, setStoryboardFiles] = useState<StoryboardFile[]>([]);
  const [loadingStoryboards, setLoadingStoryboards] = useState(false);
  const [storyboardsLoaded, setStoryboardsLoaded] = useState(false);
  const [formData, setFormData] = useState<CreateCapabilityRequest>({
    capability_id: capability ? '' : generateCapabilityId(), // Auto-generate for new capabilities
    name: '',
    description: '',
    purpose: '',
    storyboard_reference: '',
    upstream_dependencies: [],
    downstream_dependencies: [],
    assets: [],
    // INTENT State Model - 4 dimensions
    lifecycle_state: 'draft',
    workflow_stage: 'intent',
    stage_status: 'in_progress',
    approval_status: 'pending',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (capability) {
      setFormData({
        capability_id: capability.capability_id,
        name: capability.name,
        description: capability.description,
        purpose: capability.purpose,
        storyboard_reference: capability.storyboard_reference,
        upstream_dependencies: capability.upstream_dependencies.map(d => d.id!),
        downstream_dependencies: capability.downstream_dependencies.map(d => d.id!),
        assets: capability.assets,
        // INTENT State Model - 4 dimensions
        lifecycle_state: capability.lifecycle_state || 'draft',
        workflow_stage: capability.workflow_stage || 'intent',
        stage_status: capability.stage_status || 'in_progress',
        approval_status: capability.approval_status || 'pending',
      });
    }
  }, [capability]);

  // Function to load storyboard files from the conception folder
  const loadStoryboardFiles = async (force = false) => {
    if (!currentWorkspace?.projectFolder) {
      console.log('[CapabilityForm] No workspace projectFolder set. Current workspace:', currentWorkspace);
      return;
    }

    // Don't reload if already loaded unless forced
    if (storyboardsLoaded && !force) {
      return;
    }

    console.log('[CapabilityForm] Loading storyboard files from:', currentWorkspace.projectFolder);
    setLoadingStoryboards(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/story-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[CapabilityForm] API response stories count:', data.stories?.length || 0);

        // Known section files to exclude (from old export format)
        const excludedSectionFiles = [
          'STORY-dependencies.md',
          'STORY-description.md',
          'STORY-flow-visualization.md',
          'STORY-implementation-notes.md',
          'STORY-metadata.md',
          'STORY-success-criteria.md',
          'STORY-overview.md',
          'STORY-statistics.md',
          'STORY-story-cards.md',
          'STORY-complete-flow-diagram.md',
        ];

        // Extract file names that match STORY-*.md only (not SBSUP-* or section files)
        const stories: StoryboardFile[] = (data.stories || [])
          .filter((story: any) => {
            const fileName = story.filename || '';
            // Only include STORY-* files, exclude SBSUP-* and known section files
            return fileName.startsWith('STORY-') && !excludedSectionFiles.includes(fileName);
          })
          .map((story: any) => ({
            fileName: story.filename,
            name: story.title || story.filename.replace(/\.md$/, '').replace(/^STORY-/, '').replace(/-/g, ' '),
          }));
        console.log('[CapabilityForm] Filtered stories:', stories);
        setStoryboardFiles(stories);
        setStoryboardsLoaded(true);
      } else {
        console.error('[CapabilityForm] API error:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('[CapabilityForm] Failed to load storyboard files:', err);
    } finally {
      setLoadingStoryboards(false);
    }
  };

  // Load storyboard files on mount and when workspace changes
  useEffect(() => {
    console.log('[CapabilityForm] useEffect triggered. Workspace:', currentWorkspace?.name, 'ProjectFolder:', currentWorkspace?.projectFolder);
    setStoryboardsLoaded(false); // Reset when workspace changes
    if (currentWorkspace?.projectFolder) {
      loadStoryboardFiles(true);
    }
  }, [currentWorkspace?.projectFolder]);

  // Also load on initial mount (in case projectFolder was already set)
  useEffect(() => {
    console.log('[CapabilityForm] Initial mount. Loading storyboards if workspace folder is set.');
    if (currentWorkspace?.projectFolder && !storyboardsLoaded) {
      loadStoryboardFiles(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!currentWorkspace?.projectFolder) {
        throw new Error('Workspace folder not configured. Please set a project folder in Workspaces.');
      }

      // Generate filename from capability ID + first 3 words of name
      const nameSlug = formData.name
        .toLowerCase()
        .split(/\s+/)
        .slice(0, 3)
        .join('-')
        .replace(/[^a-z0-9-]/g, '');
      const fileName = `${formData.capability_id}-${nameSlug}.md`;

      // Generate markdown content
      let markdown = `# ${formData.name}\n\n`;
      markdown += `## Metadata\n`;
      markdown += `- **ID**: ${formData.capability_id}\n`;
      markdown += `- **Type**: Capability\n`;
      markdown += `- **Lifecycle State**: ${formData.lifecycle_state}\n`;
      markdown += `- **Workflow Stage**: ${formData.workflow_stage}\n`;
      markdown += `- **Stage Status**: ${formData.stage_status}\n`;
      markdown += `- **Approval Status**: ${formData.approval_status}\n`;
      if (formData.storyboard_reference) {
        markdown += `- **Storyboard Reference**: ${formData.storyboard_reference}\n`;
      }
      markdown += `- **Created**: ${new Date().toLocaleString()}\n\n`;

      if (formData.description) {
        markdown += `## Description\n${formData.description}\n\n`;
      }

      if (formData.purpose) {
        markdown += `## Purpose\n${formData.purpose}\n\n`;
      }

      if (formData.upstream_dependencies.length > 0) {
        markdown += `## Upstream Dependencies\n`;
        formData.upstream_dependencies.forEach(id => {
          const dep = allCapabilities.find(c => c.id === id);
          if (dep) {
            markdown += `- ${dep.capability_id}: ${dep.name}\n`;
          }
        });
        markdown += '\n';
      }

      if (formData.downstream_dependencies.length > 0) {
        markdown += `## Downstream Dependencies\n`;
        formData.downstream_dependencies.forEach(id => {
          const dep = allCapabilities.find(c => c.id === id);
          if (dep) {
            markdown += `- ${dep.capability_id}: ${dep.name}\n`;
          }
        });
        markdown += '\n';
      }

      if (formData.assets.length > 0) {
        markdown += `## Assets\n`;
        formData.assets.forEach(asset => {
          markdown += `### ${asset.asset_name}\n`;
          markdown += `- **Type**: ${asset.asset_type}\n`;
          markdown += `- **URL**: ${asset.asset_url}\n`;
          if (asset.description) {
            markdown += `- **Description**: ${asset.description}\n`;
          }
          markdown += '\n';
        });
      }

      // Save to definition folder
      const response = await fetch(`${INTEGRATION_URL}/save-specifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          files: [{ fileName, content: markdown }],
          subfolder: 'definition'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to save capability');
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save capability');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = () => {
    setFormData({
      ...formData,
      assets: [
        ...formData.assets,
        {
          asset_type: 'url',
          asset_name: '',
          asset_url: '',
          description: '',
        },
      ],
    });
  };

  const handleRemoveAsset = (index: number) => {
    setFormData({
      ...formData,
      assets: formData.assets.filter((_, i) => i !== index),
    });
  };

  const handleAssetChange = (index: number, field: keyof CapabilityAsset, value: string) => {
    const newAssets = [...formData.assets];
    newAssets[index] = { ...newAssets[index], [field]: value };
    setFormData({ ...formData, assets: newAssets });
  };

  const handleDependencyChange = (type: 'upstream' | 'downstream', capabilityId: number, checked: boolean) => {
    const field = type === 'upstream' ? 'upstream_dependencies' : 'downstream_dependencies';
    const current = formData[field];

    if (checked) {
      setFormData({ ...formData, [field]: [...current, capabilityId] });
    } else {
      setFormData({ ...formData, [field]: current.filter(id => id !== capabilityId) });
    }
  };

  const availableCapabilities = allCapabilities.filter(c => c.id !== capability?.id);

  return (
    <form onSubmit={handleSubmit} className="capability-form" style={{ maxWidth: '800px' }}>
      {error && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: 'rgba(255, 59, 48, 0.1)',
          borderRadius: '8px',
          color: 'var(--color-systemRed)'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Capability ID */}
        <div>
          <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>
            Capability ID <span style={{ color: 'var(--color-systemGreen)', fontSize: '12px', fontWeight: 'normal' }}>(auto-generated)</span>
          </label>
          <input
            type="text"
            required
            readOnly
            value={formData.capability_id}
            onChange={(e) => setFormData({ ...formData, capability_id: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-separator)',
              fontSize: '15px',
              backgroundColor: 'var(--color-tertiarySystemBackground)',
              color: 'var(--color-secondaryLabel)',
              cursor: 'default',
            }}
          />
        </div>

        {/* Name */}
        <div>
          <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>
            Name <span style={{ color: 'var(--color-systemRed)' }}>*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Capability name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-separator)',
              fontSize: '15px',
            }}
          />
        </div>

        {/* INTENT State Model - 4 Dimensions */}
        <div style={{
          border: '1px solid var(--color-separator)',
          borderRadius: '12px',
          padding: '16px',
          backgroundColor: 'var(--color-secondarySystemBackground)'
        }}>
          <h4 className="text-subheadline" style={{ marginBottom: '16px', color: 'var(--color-label)' }}>
            INTENT State Model
          </h4>
          <p className="text-footnote text-secondary" style={{ marginBottom: '16px' }}>
            Track the capability through its lifecycle using 4 independent dimensions.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Lifecycle State */}
            <div>
              <label className="text-footnote" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Lifecycle State
              </label>
              <select
                value={formData.lifecycle_state}
                onChange={(e) => setFormData({ ...formData, lifecycle_state: e.target.value as LifecycleState })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-separator)',
                  fontSize: '14px',
                  backgroundColor: 'var(--color-systemBackground)',
                }}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="implemented">Implemented</option>
                <option value="maintained">Maintained</option>
                <option value="retired">Retired</option>
              </select>
              <p className="text-caption2 text-tertiary" style={{ marginTop: '4px' }}>
                Where is this in its overall life?
              </p>
            </div>

            {/* Workflow Stage */}
            <div>
              <label className="text-footnote" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Workflow Stage
              </label>
              <select
                value={formData.workflow_stage}
                onChange={(e) => setFormData({ ...formData, workflow_stage: e.target.value as WorkflowStage })}
                disabled={formData.lifecycle_state !== 'active'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-separator)',
                  fontSize: '14px',
                  backgroundColor: formData.lifecycle_state !== 'active' ? 'var(--color-tertiarySystemBackground)' : 'var(--color-systemBackground)',
                  opacity: formData.lifecycle_state !== 'active' ? 0.6 : 1,
                }}
              >
                <option value="intent">Intent</option>
                <option value="specification">Specification</option>
                <option value="ui_design">UI-Design</option>
                <option value="implementation">Implementation</option>
                <option value="control_loop">Control-Loop</option>
              </select>
              <p className="text-caption2 text-tertiary" style={{ marginTop: '4px' }}>
                {formData.lifecycle_state !== 'active' ? 'Only applies when Active' : 'Which of the 5 stages?'}
              </p>
            </div>

            {/* Stage Status */}
            <div>
              <label className="text-footnote" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Stage Status
              </label>
              <select
                value={formData.stage_status}
                onChange={(e) => setFormData({ ...formData, stage_status: e.target.value as StageStatus })}
                disabled={formData.lifecycle_state !== 'active'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-separator)',
                  fontSize: '14px',
                  backgroundColor: formData.lifecycle_state !== 'active' ? 'var(--color-tertiarySystemBackground)' : 'var(--color-systemBackground)',
                  opacity: formData.lifecycle_state !== 'active' ? 0.6 : 1,
                }}
              >
                <option value="in_progress">In Progress</option>
                <option value="ready_for_approval">Ready for Approval</option>
                <option value="approved">Approved</option>
                <option value="blocked">Blocked</option>
              </select>
              <p className="text-caption2 text-tertiary" style={{ marginTop: '4px' }}>
                {formData.lifecycle_state !== 'active' ? 'Only applies when Active' : 'Progress within stage'}
              </p>
            </div>

            {/* Approval Status */}
            <div>
              <label className="text-footnote" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Approval Status
              </label>
              <select
                value={formData.approval_status}
                onChange={(e) => setFormData({ ...formData, approval_status: e.target.value as ApprovalStatus })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-separator)',
                  fontSize: '14px',
                  backgroundColor: 'var(--color-systemBackground)',
                }}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <p className="text-caption2 text-tertiary" style={{ marginTop: '4px' }}>
                Authorization decision
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>
            Description
          </label>
          <textarea
            placeholder="Brief description of the capability"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-separator)',
              fontSize: '15px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Purpose */}
        <div>
          <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>
            Purpose
          </label>
          <textarea
            placeholder="Detailed purpose and objectives of this capability"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            rows={5}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-separator)',
              fontSize: '15px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Storyboard Reference */}
        <div>
          <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>
            Storyboard Card Reference
          </label>
          {!currentWorkspace?.projectFolder ? (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(255, 204, 0, 0.1)',
              borderRadius: '8px',
              border: '1px solid var(--color-systemYellow)',
            }}>
              <p className="text-footnote" style={{ color: 'var(--color-systemOrange)', margin: 0 }}>
                <strong>Workspace folder not set.</strong> Go to the Workspaces page and select a project folder for this workspace to enable storyboard selection.
              </p>
            </div>
          ) : (
            <>
              <p className="text-footnote text-secondary" style={{ marginBottom: '8px' }}>
                Select a storyboard card (STORY-*.md files from conception folder)
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={formData.storyboard_reference}
                  onChange={(e) => setFormData({ ...formData, storyboard_reference: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-separator)',
                    fontSize: '15px',
                    backgroundColor: 'var(--color-systemBackground)',
                  }}
                >
                  <option value="">
                    {loadingStoryboards ? 'Loading...' : '-- Select a storyboard card --'}
                  </option>
                  {storyboardFiles.map((file) => (
                    <option key={file.fileName} value={file.fileName}>
                      {file.name} ({file.fileName})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => loadStoryboardFiles(true)}
                  disabled={loadingStoryboards}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-separator)',
                    backgroundColor: 'var(--color-secondarySystemBackground)',
                    cursor: loadingStoryboards ? 'wait' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {loadingStoryboards ? '...' : '↻'}
                </button>
              </div>
              {!loadingStoryboards && storyboardFiles.length === 0 && (
                <p className="text-footnote" style={{ marginTop: '8px', color: 'var(--color-secondaryLabel)' }}>
                  No storyboard cards found. Export cards from the Storyboard page to create STORY-*.md files in the conception folder.
                </p>
              )}
            </>
          )}
        </div>

        {/* Upstream Dependencies */}
        <div>
          <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>
            Upstream Dependencies
          </label>
          <p className="text-footnote text-secondary" style={{ marginBottom: '12px' }}>
            Select capabilities that this capability depends on
          </p>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid var(--color-separator)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            {availableCapabilities.length === 0 ? (
              <p className="text-footnote text-secondary">No other capabilities available</p>
            ) : (
              availableCapabilities.map(cap => (
                <label key={cap.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.upstream_dependencies.includes(cap.id!)}
                    onChange={(e) => handleDependencyChange('upstream', cap.id!, e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span className="text-body">{cap.capability_id} - {cap.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Downstream Dependencies */}
        <div>
          <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>
            Downstream Dependencies
          </label>
          <p className="text-footnote text-secondary" style={{ marginBottom: '12px' }}>
            Select capabilities that depend on this capability
          </p>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid var(--color-separator)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            {availableCapabilities.length === 0 ? (
              <p className="text-footnote text-secondary">No other capabilities available</p>
            ) : (
              availableCapabilities.map(cap => (
                <label key={cap.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.downstream_dependencies.includes(cap.id!)}
                    onChange={(e) => handleDependencyChange('downstream', cap.id!, e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span className="text-body">{cap.capability_id} - {cap.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Assets */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="text-subheadline">Assets</label>
            <Button type="button" variant="secondary" size="small" onClick={handleAddAsset}>
              + Add Asset
            </Button>
          </div>
          <p className="text-footnote text-secondary" style={{ marginBottom: '12px' }}>
            Add files or URLs with descriptions of how they should be used
          </p>

          {formData.assets.map((asset, index) => (
            <div key={index} style={{
              border: '1px solid var(--color-separator)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="text-subheadline">Asset {index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAsset(index)}
                  style={{
                    color: 'var(--color-systemRed)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Remove
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="text-footnote" style={{ display: 'block', marginBottom: '4px' }}>
                    Asset Type
                  </label>
                  <select
                    value={asset.asset_type}
                    onChange={(e) => handleAssetChange(index, 'asset_type', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-separator)',
                      fontSize: '14px',
                    }}
                  >
                    <option value="url">URL</option>
                    <option value="file">File</option>
                  </select>
                </div>

                <div>
                  <label className="text-footnote" style={{ display: 'block', marginBottom: '4px' }}>
                    Asset Name
                  </label>
                  <input
                    type="text"
                    value={asset.asset_name}
                    onChange={(e) => handleAssetChange(index, 'asset_name', e.target.value)}
                    placeholder="Name of the asset"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-separator)',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label className="text-footnote" style={{ display: 'block', marginBottom: '4px' }}>
                    {asset.asset_type === 'url' ? 'URL' : 'File Path'}
                  </label>
                  <input
                    type="text"
                    value={asset.asset_url}
                    onChange={(e) => handleAssetChange(index, 'asset_url', e.target.value)}
                    placeholder={asset.asset_type === 'url' ? 'https://...' : '/path/to/file'}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-separator)',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label className="text-footnote" style={{ display: 'block', marginBottom: '4px' }}>
                    Description (How to use this asset)
                  </label>
                  <textarea
                    value={asset.description}
                    onChange={(e) => handleAssetChange(index, 'description', e.target.value)}
                    placeholder="Describe how this asset should be used"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-separator)',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px' }}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : (capability ? 'Update Capability' : 'Create Capability')}
          </Button>
        </div>
      </div>
    </form>
  );
};
