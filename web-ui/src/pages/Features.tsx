import React, { useState, useEffect } from 'react';
import { Card, Alert, Button, PageLayout } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

interface FileFeature {
  filename: string;
  path: string;
  name: string;
  description: string;
  status: string;
  content: string;
  fields: Record<string, string>;
  benefitHypothesis?: string;
}

export const Features: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [features, setFeatures] = useState<FileFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FileFeature | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [savingFeature, setSavingFeature] = useState(false);
  const [deletingFeature, setDeletingFeature] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    status: '',
    benefitHypothesis: '',
    acceptanceCriteria: '',
    content: '',
  });

  // Load features when workspace changes
  useEffect(() => {
    setFeatures([]);
    setError(null);
    if (currentWorkspace?.projectFolder) {
      fetchFeatures();
    }
  }, [currentWorkspace?.id, currentWorkspace?.projectFolder]);

  const fetchFeatures = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setLoading(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/feature-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      const data = await response.json();
      if (data.features) {
        setFeatures(data.features);
      }
    } catch (err) {
      console.error('Failed to fetch feature files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFeature = () => {
    setEditFormData({
      name: '',
      description: '',
      status: 'Planned',
      benefitHypothesis: '',
      acceptanceCriteria: '',
      content: '',
    });
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditFeature = (feature: FileFeature) => {
    setEditFormData({
      name: feature.name,
      description: feature.description,
      status: feature.status,
      benefitHypothesis: feature.benefitHypothesis || feature.fields['Benefit Hypothesis'] || '',
      acceptanceCriteria: feature.fields['Acceptance Criteria'] || '',
      content: feature.content,
    });
    setIsEditing(true);
  };

  const handleSaveFeature = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setSavingFeature(true);
    try {
      let path = selectedFeature?.path;
      if (isCreating) {
        const safeName = editFormData.name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const sequenceNum = features.length + 1;
        const fileName = `FEAT-${safeName}-${sequenceNum}.md`;
        path = `${currentWorkspace.projectFolder}/specifications/${fileName}`;
      }

      const response = await fetch(`${INTEGRATION_URL}/save-feature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          name: editFormData.name,
          description: editFormData.description,
          status: editFormData.status,
          benefitHypothesis: editFormData.benefitHypothesis,
          acceptanceCriteria: editFormData.acceptanceCriteria,
          content: editFormData.content,
        }),
      });

      if (response.ok) {
        await fetchFeatures();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedFeature(null);
      } else {
        const errorData = await response.text();
        setError(`Failed to save: ${errorData}`);
      }
    } catch (err) {
      setError(`Failed to save feature: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingFeature(false);
    }
  };

  const handleDeleteFeature = async (feature: FileFeature) => {
    if (!confirm(`Are you sure you want to delete "${feature.name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingFeature(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/delete-feature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: feature.path,
        }),
      });

      if (response.ok) {
        await fetchFeatures();
        if (selectedFeature?.path === feature.path) {
          setSelectedFeature(null);
          setIsEditing(false);
        }
      } else {
        const errorData = await response.text();
        setError(`Failed to delete: ${errorData}`);
      }
    } catch (err) {
      setError(`Failed to delete feature: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingFeature(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedFeature) {
      setEditFormData({
        name: selectedFeature.name,
        description: selectedFeature.description,
        status: selectedFeature.status,
        benefitHypothesis: selectedFeature.benefitHypothesis || selectedFeature.fields['Benefit Hypothesis'] || '',
        acceptanceCriteria: selectedFeature.fields['Acceptance Criteria'] || '',
        content: selectedFeature.content,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'implemented':
      case 'done':
        return { bg: 'rgba(76, 217, 100, 0.1)', color: 'var(--color-systemGreen)' };
      case 'in_progress':
      case 'in progress':
      case 'implementing':
        return { bg: 'rgba(255, 204, 0, 0.1)', color: 'var(--color-systemYellow)' };
      case 'planned':
        return { bg: 'rgba(0, 122, 255, 0.1)', color: 'var(--color-systemBlue)' };
      case 'deprecated':
        return { bg: 'rgba(142, 142, 147, 0.1)', color: 'var(--color-systemGray)' };
      default:
        return { bg: 'rgba(142, 142, 147, 0.1)', color: 'var(--color-systemGray)' };
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter logic
  const filterFeatures = (items: FileFeature[]) => {
    return items.filter(feature => {
      const matchesSearch = searchQuery === '' ||
        feature.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' ||
        feature.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  };

  // Group by status
  const groupByStatus = (items: FileFeature[]) => {
    const groups: Record<string, FileFeature[]> = {
      'Planned': [],
      'In Progress': [],
      'Implemented': [],
      'Deprecated': [],
    };

    items.forEach(feature => {
      const status = formatStatus(feature.status || 'Planned');
      if (groups[status]) {
        groups[status].push(feature);
      } else {
        groups['Planned'].push(feature);
      }
    });

    return groups;
  };

  const filteredFeatures = filterFeatures(features);
  const groupedFeatures = groupByStatus(filteredFeatures);

  // Summary counts
  const summaryCounts = {
    total: features.length,
    planned: features.filter(f => f.status?.toLowerCase() === 'planned').length,
    inProgress: features.filter(f => f.status?.toLowerCase() === 'in progress' || f.status?.toLowerCase() === 'in_progress').length,
    implemented: features.filter(f => f.status?.toLowerCase() === 'implemented' || f.status?.toLowerCase() === 'done').length,
    deprecated: features.filter(f => f.status?.toLowerCase() === 'deprecated').length,
  };

  const toggleSection = (status: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Edit/Create Form
  if (isEditing) {
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="text-large-title" style={{ marginBottom: '8px' }}>
            {isCreating ? 'Create Feature' : 'Edit Feature'}
          </h1>
        </div>

        <Card>
          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Feature Name *</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="input"
              placeholder="Enter feature name"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Status</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Implemented">Implemented</option>
                <option value="Deprecated">Deprecated</option>
              </select>
            </div>

          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Description</label>
            <textarea
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Brief description of the feature"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Benefit Hypothesis</label>
            <textarea
              value={editFormData.benefitHypothesis}
              onChange={(e) => setEditFormData({ ...editFormData, benefitHypothesis: e.target.value })}
              className="input"
              rows={3}
              placeholder="If we deliver [feature], then [users] will be able to [benefit], which will result in [business outcome]."
              style={{ width: '100%' }}
            />
            <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
              A benefit hypothesis states the expected measurable benefit to the end user or business.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Acceptance Criteria</label>
            <textarea
              value={editFormData.acceptanceCriteria}
              onChange={(e) => setEditFormData({ ...editFormData, acceptanceCriteria: e.target.value })}
              className="input"
              rows={4}
              placeholder="- [ ] Criteria 1&#10;- [ ] Criteria 2&#10;- [ ] Criteria 3"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Additional Notes</label>
            <textarea
              value={editFormData.content}
              onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
              className="input"
              rows={6}
              placeholder="Any additional notes or context..."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveFeature} disabled={savingFeature || !editFormData.name}>
              {savingFeature ? 'Saving...' : (isCreating ? 'Create Feature' : 'Save Changes')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Feature Detail View
  if (selectedFeature && !isEditing) {
    const statusColors = getStatusColor(selectedFeature.status);
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 className="text-large-title">{selectedFeature.name}</h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setSelectedFeature(null)}>
                Back to List
              </Button>
              <Button variant="primary" onClick={() => handleEditFeature(selectedFeature)}>
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDeleteFeature(selectedFeature)}
                disabled={deletingFeature}
                style={{ color: 'var(--color-systemRed)' }}
              >
                {deletingFeature ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Status and Parent Epic */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="text-subheadline" style={{ marginBottom: '8px' }}>Status</p>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '20px',
                    backgroundColor: statusColors.bg,
                    color: statusColors.color,
                  }}>
                    {formatStatus(selectedFeature.status)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Description */}
            {selectedFeature.description && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>Description</h3>
                <p className="text-body">{selectedFeature.description}</p>
              </Card>
            )}

            {/* Benefit Hypothesis */}
            {(selectedFeature.benefitHypothesis || selectedFeature.fields['Benefit Hypothesis']) && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>Benefit Hypothesis</h3>
                <p className="text-body" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedFeature.benefitHypothesis || selectedFeature.fields['Benefit Hypothesis']}
                </p>
              </Card>
            )}

            {/* Acceptance Criteria */}
            {selectedFeature.fields['Acceptance Criteria'] && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>Acceptance Criteria</h3>
                <pre style={{
                  backgroundColor: 'var(--color-secondarySystemBackground)',
                  padding: '12px',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                  fontSize: '13px',
                }}>
                  {selectedFeature.fields['Acceptance Criteria']}
                </pre>
              </Card>
            )}

            {/* Other Fields */}
            {Object.entries(selectedFeature.fields || {})
              .filter(([key]) => !['Benefit Hypothesis', 'Acceptance Criteria', 'Metadata'].includes(key))
              .map(([key, value]) => (
                <Card key={key}>
                  <h3 className="text-title2" style={{ marginBottom: '16px' }}>{key}</h3>
                  <p className="text-body" style={{ whiteSpace: 'pre-wrap' }}>{value}</p>
                </Card>
              ))}

            {/* File Info */}
            <Card>
              <p className="text-footnote text-secondary">
                <strong>File:</strong> {selectedFeature.path}
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <PageLayout
      title="Feature Management"
      quickDescription="INTENT Features - Deliverables that provide measurable business value."
      detailedDescription="In Intent-Centered and Engineering-Driven, Narration for Transformation (INTENT), features are services that fulfill stakeholder needs. Each feature includes a benefit hypothesis and acceptance criteria. With AI-assisted development, feature specifications become the blueprint for rapid implementation."
      actions={
        <Button variant="primary" onClick={handleCreateFeature}>
          + Create Feature
        </Button>
      }
    >

        {error && (
          <Alert type="error" style={{ marginBottom: '24px' }}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {/* File-based Features Section */}
        {currentWorkspace?.projectFolder && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="text-title2">Features from Specifications</h3>
              <Button variant="secondary" onClick={fetchFeatures} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p className="text-body text-secondary">Loading feature files...</p>
              </div>
            ) : features.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
                    No feature files found in ./specifications folder.
                    <br />
                    <span className="text-footnote">Looking for files matching: FEAT-*.md</span>
                  </p>
                  <Button variant="primary" onClick={handleCreateFeature}>
                    Create First Feature
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Summary Dashboard */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <Card style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-label)' }}>
                      {summaryCounts.total}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      Total Features
                    </div>
                  </Card>
                  <Card
                    style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setStatusFilter('planned')}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemBlue)' }}>
                      {summaryCounts.planned}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      Planned
                    </div>
                  </Card>
                  <Card
                    style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setStatusFilter('in progress')}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemYellow)' }}>
                      {summaryCounts.inProgress}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      In Progress
                    </div>
                  </Card>
                  <Card
                    style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setStatusFilter('implemented')}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemGreen)' }}>
                      {summaryCounts.implemented}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      Implemented
                    </div>
                  </Card>
                  <Card
                    style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setStatusFilter('deprecated')}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemGray)' }}>
                      {summaryCounts.deprecated}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      Deprecated
                    </div>
                  </Card>
                </div>

                {/* Search and Filter Controls */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Search features..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-separator)',
                    }}
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input"
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-separator)',
                      minWidth: '150px',
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="planned">Planned</option>
                    <option value="in progress">In Progress</option>
                    <option value="implemented">Implemented</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                  {(searchQuery || statusFilter !== 'all') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Feature Cards grouped by status */}
                {filteredFeatures.length === 0 ? (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p className="text-body text-secondary">
                        No features match your search criteria.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.entries(groupedFeatures).map(([status, items]) => {
                      if (items.length === 0) return null;

                      const statusColors = getStatusColor(status);
                      const isCollapsed = collapsedSections[status];

                      return (
                        <div key={status}>
                          {/* Status Section Header */}
                          <div
                            onClick={() => toggleSection(status)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px 16px',
                              backgroundColor: statusColors.bg,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              marginBottom: isCollapsed ? '0' : '12px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '18px' }}>
                                {isCollapsed ? '>' : 'v'}
                              </span>
                              <h4 className="text-headline" style={{ margin: 0, color: statusColors.color }}>
                                {status}
                              </h4>
                              <span style={{
                                padding: '2px 8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                color: statusColors.color,
                              }}>
                                {items.length}
                              </span>
                            </div>
                          </div>

                          {/* Feature Cards */}
                          {!isCollapsed && (
                            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--spacing-4, 16px)' }}>
                              {items.map((feature, index) => {
                                const featureStatusColors = getStatusColor(feature.status || 'planned');
                                return (
                                  <Card key={index}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                          <h3
                                            className="text-headline"
                                            style={{
                                              cursor: 'pointer',
                                              color: 'var(--color-systemBlue)',
                                            }}
                                            onClick={() => setSelectedFeature(feature)}
                                          >
                                            {feature.name || feature.filename}
                                          </h3>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{
                                              display: 'inline-block',
                                              padding: '4px 12px',
                                              fontSize: '12px',
                                              fontWeight: 600,
                                              borderRadius: '20px',
                                              backgroundColor: featureStatusColors.bg,
                                              color: featureStatusColors.color,
                                            }}>
                                              {formatStatus(feature.status || 'Planned')}
                                            </span>
                                          </div>
                                          <p className="text-footnote text-secondary">
                                            <strong>File:</strong> {feature.filename}
                                          </p>
                                          {feature.description && (
                                            <p className="text-footnote text-secondary">
                                              {feature.description.substring(0, 120)}{feature.description.length > 120 ? '...' : ''}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                          onClick={() => setSelectedFeature(feature)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--color-systemBlue)',
                                            fontSize: '14px',
                                            padding: '4px 8px',
                                          }}
                                        >
                                          View
                                        </button>
                                        <button
                                          onClick={() => handleDeleteFeature(feature)}
                                          disabled={deletingFeature}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: deletingFeature ? 'wait' : 'pointer',
                                            color: 'var(--color-systemRed)',
                                            fontSize: '14px',
                                            padding: '4px 8px',
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* No workspace folder message */}
        {!currentWorkspace?.projectFolder && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
                Please set a project folder for this workspace to manage features.
              </p>
            </div>
          </Card>
        )}
    </PageLayout>
  );
};
