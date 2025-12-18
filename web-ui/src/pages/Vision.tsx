import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Alert, Button, AIPresetIndicator } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

interface FileTheme {
  filename: string;
  path: string;
  name: string;
  description: string;
  status: string;
  content: string;
  fields: Record<string, string>;
  themeType?: 'vision' | 'strategic-theme' | 'market-context';
}

export const Vision: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [themes, setThemes] = useState<FileTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<FileTheme | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [deletingTheme, setDeletingTheme] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    themeType: 'strategic-theme' as 'vision' | 'strategic-theme' | 'market-context',
    targetOutcomes: '',
    keyMetrics: '',
    timeHorizon: '',
    stakeholders: '',
    content: '',
  });

  // Load themes when workspace changes
  useEffect(() => {
    setThemes([]);
    setError(null);
    if (currentWorkspace?.projectFolder) {
      fetchThemes();
    }
  }, [currentWorkspace?.id, currentWorkspace?.projectFolder]);

  // Handle opening a specific item from URL parameter
  useEffect(() => {
    const openItem = searchParams.get('open');
    if (openItem && themes.length > 0 && !selectedTheme) {
      const themeToOpen = themes.find(t => t.filename === openItem);
      if (themeToOpen) {
        setSelectedTheme(themeToOpen);
        // Clear the search param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [themes, searchParams, selectedTheme, setSearchParams]);

  const fetchThemes = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setLoading(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/theme-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      const data = await response.json();
      if (data.themes) {
        setThemes(data.themes);
      }
    } catch (err) {
      console.error('Failed to fetch theme files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTheme = () => {
    setEditFormData({
      name: '',
      description: '',
      themeType: 'strategic-theme',
      targetOutcomes: '',
      keyMetrics: '',
      timeHorizon: '',
      stakeholders: '',
      content: '',
    });
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditTheme = (theme: FileTheme) => {
    setEditFormData({
      name: theme.name,
      description: theme.fields['Description'] || theme.description || '',
      themeType: theme.themeType || 'strategic-theme',
      targetOutcomes: theme.fields['Target Outcomes'] || '',
      keyMetrics: theme.fields['Key Metrics'] || '',
      timeHorizon: theme.fields['Time Horizon'] || '',
      stakeholders: theme.fields['Stakeholders'] || '',
      content: theme.fields['Additional Notes'] || '',
    });
    setIsEditing(true);
  };

  const handleSaveTheme = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setSavingTheme(true);
    try {
      let path = selectedTheme?.path;
      if (isCreating) {
        const safeName = editFormData.name
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        const sequenceNum = themes.length + 1;
        // Use appropriate filename prefix based on theme type
        let prefix = 'STRAT'; // default for strategic-theme
        if (editFormData.themeType === 'vision') {
          prefix = 'VIS';
        } else if (editFormData.themeType === 'market-context') {
          prefix = 'MKT';
        }
        const fileName = `${prefix}-${safeName}-${sequenceNum}.md`;
        path = `${currentWorkspace.projectFolder}/conception/${fileName}`;
      }

      const response = await fetch(`${INTEGRATION_URL}/save-theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          name: editFormData.name,
          description: editFormData.description,
          themeType: editFormData.themeType,
          targetOutcomes: editFormData.targetOutcomes,
          keyMetrics: editFormData.keyMetrics,
          timeHorizon: editFormData.timeHorizon,
          stakeholders: editFormData.stakeholders,
          content: editFormData.content,
        }),
      });

      if (response.ok) {
        await fetchThemes();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedTheme(null);
      } else {
        const errorData = await response.text();
        setError(`Failed to save: ${errorData}`);
      }
    } catch (err) {
      setError(`Failed to save theme: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingTheme(false);
    }
  };

  const handleDeleteTheme = async (theme: FileTheme) => {
    if (!confirm(`Are you sure you want to delete "${theme.name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingTheme(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/delete-theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: theme.path,
        }),
      });

      if (response.ok) {
        await fetchThemes();
        if (selectedTheme?.path === theme.path) {
          setSelectedTheme(null);
          setIsEditing(false);
        }
      } else {
        const errorData = await response.text();
        setError(`Failed to delete: ${errorData}`);
      }
    } catch (err) {
      setError(`Failed to delete theme: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingTheme(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedTheme) {
      setEditFormData({
        name: selectedTheme.name,
        description: selectedTheme.fields['Description'] || selectedTheme.description || '',
        themeType: selectedTheme.themeType || 'strategic-theme',
        targetOutcomes: selectedTheme.fields['Target Outcomes'] || '',
        keyMetrics: selectedTheme.fields['Key Metrics'] || '',
        timeHorizon: selectedTheme.fields['Time Horizon'] || '',
        stakeholders: selectedTheme.fields['Stakeholders'] || '',
        content: selectedTheme.fields['Additional Notes'] || '',
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'vision':
        return { bg: 'rgba(175, 82, 222, 0.1)', color: 'var(--color-systemPurple)', icon: '0' };
      case 'strategic-theme':
        return { bg: 'rgba(0, 122, 255, 0.1)', color: 'var(--color-systemBlue)', icon: '>' };
      case 'market-context':
        return { bg: 'rgba(76, 217, 100, 0.1)', color: 'var(--color-systemGreen)', icon: '#' };
      default:
        return { bg: 'rgba(142, 142, 147, 0.1)', color: 'var(--color-systemGray)', icon: '?' };
    }
  };

  const formatType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'vision':
        return 'Vision Statement';
      case 'strategic-theme':
        return 'Strategic Theme';
      case 'market-context':
        return 'Market Context';
      default:
        return type || 'Unknown';
    }
  };

  // Filter logic
  const filterThemes = (items: FileTheme[]) => {
    return items.filter(theme => {
      const matchesSearch = searchQuery === '' ||
        theme.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        theme.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' ||
        theme.themeType?.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesType;
    });
  };

  // Group by type
  const groupByType = (items: FileTheme[]) => {
    const groups: Record<string, FileTheme[]> = {
      'vision': [],
      'strategic-theme': [],
      'market-context': [],
    };

    items.forEach(theme => {
      const type = theme.themeType?.toLowerCase() || 'strategic-theme';
      if (groups[type]) {
        groups[type].push(theme);
      } else {
        groups['strategic-theme'].push(theme);
      }
    });

    return groups;
  };

  const filteredThemes = filterThemes(themes);
  const groupedThemes = groupByType(filteredThemes);

  // Summary counts
  const summaryCounts = {
    total: themes.length,
    vision: themes.filter(t => t.themeType?.toLowerCase() === 'vision').length,
    strategicTheme: themes.filter(t => t.themeType?.toLowerCase() === 'strategic-theme' || !t.themeType).length,
    marketContext: themes.filter(t => t.themeType?.toLowerCase() === 'market-context').length,
  };

  // Edit/Create Form
  if (isEditing) {
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="text-large-title" style={{ marginBottom: '8px' }}>
            {isCreating ? 'Create Theme' : 'Edit Theme'}
          </h1>
        </div>

        <Card>
          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Theme Type *</label>
            <select
              value={editFormData.themeType}
              onChange={(e) => setEditFormData({ ...editFormData, themeType: e.target.value as any })}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="vision">Vision Statement - The aspirational future state</option>
              <option value="strategic-theme">Strategic Theme - A key business objective</option>
              <option value="market-context">Market Context - Market research and analysis</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Name *</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="input"
              placeholder={
                editFormData.themeType === 'vision' ? 'e.g., Become the leading platform for...' :
                editFormData.themeType === 'market-context' ? 'e.g., Enterprise Market Analysis' :
                'e.g., Improve User Experience'
              }
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Description</label>
            <textarea
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="input"
              rows={4}
              placeholder="Detailed description of this theme..."
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Target Outcomes</label>
            <textarea
              value={editFormData.targetOutcomes}
              onChange={(e) => setEditFormData({ ...editFormData, targetOutcomes: e.target.value })}
              className="input"
              rows={3}
              placeholder="What outcomes are we trying to achieve?"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Key Metrics / KPIs</label>
            <textarea
              value={editFormData.keyMetrics}
              onChange={(e) => setEditFormData({ ...editFormData, keyMetrics: e.target.value })}
              className="input"
              rows={3}
              placeholder="How will we measure success?"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Time Horizon</label>
              <input
                type="text"
                value={editFormData.timeHorizon}
                onChange={(e) => setEditFormData({ ...editFormData, timeHorizon: e.target.value })}
                className="input"
                placeholder="e.g., Q1 2025, FY2025, 18 months"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Stakeholders</label>
              <input
                type="text"
                value={editFormData.stakeholders}
                onChange={(e) => setEditFormData({ ...editFormData, stakeholders: e.target.value })}
                className="input"
                placeholder="e.g., Product, Engineering, Sales"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="text-subheadline" style={{ display: 'block', marginBottom: '8px' }}>Additional Notes</label>
            <textarea
              value={editFormData.content}
              onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
              className="input"
              rows={6}
              placeholder="Any additional context, research, or notes..."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveTheme} disabled={savingTheme || !editFormData.name}>
              {savingTheme ? 'Saving...' : (isCreating ? 'Create Theme' : 'Save Changes')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Theme Detail View
  if (selectedTheme && !isEditing) {
    const typeColors = getTypeColor(selectedTheme.themeType || 'strategic-theme');
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 className="text-large-title">{selectedTheme.name}</h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="secondary" onClick={() => setSelectedTheme(null)}>
                Back to List
              </Button>
              <Button variant="primary" onClick={() => handleEditTheme(selectedTheme)}>
                Edit
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDeleteTheme(selectedTheme)}
                disabled={deletingTheme}
                style={{ color: 'var(--color-systemRed)' }}
              >
                {deletingTheme ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Type Badge */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{typeColors.icon}</span>
                <span style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '20px',
                  backgroundColor: typeColors.bg,
                  color: typeColors.color,
                }}>
                  {formatType(selectedTheme.themeType || 'strategic-theme')}
                </span>
              </div>
            </Card>

            {/* Description */}
            {selectedTheme.description && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>Description</h3>
                <p className="text-body" style={{ whiteSpace: 'pre-wrap' }}>{selectedTheme.description}</p>
              </Card>
            )}

            {/* Target Outcomes */}
            {selectedTheme.fields['Target Outcomes'] && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>Target Outcomes</h3>
                <p className="text-body" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedTheme.fields['Target Outcomes']}
                </p>
              </Card>
            )}

            {/* Key Metrics */}
            {selectedTheme.fields['Key Metrics'] && (
              <Card>
                <h3 className="text-title2" style={{ marginBottom: '16px' }}>Key Metrics / KPIs</h3>
                <p className="text-body" style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedTheme.fields['Key Metrics']}
                </p>
              </Card>
            )}

            {/* Time Horizon and Stakeholders */}
            {(selectedTheme.fields['Time Horizon'] || selectedTheme.fields['Stakeholders']) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {selectedTheme.fields['Time Horizon'] && (
                  <Card>
                    <h3 className="text-title2" style={{ marginBottom: '8px' }}>Time Horizon</h3>
                    <p className="text-body">{selectedTheme.fields['Time Horizon']}</p>
                  </Card>
                )}
                {selectedTheme.fields['Stakeholders'] && (
                  <Card>
                    <h3 className="text-title2" style={{ marginBottom: '8px' }}>Stakeholders</h3>
                    <p className="text-body">{selectedTheme.fields['Stakeholders']}</p>
                  </Card>
                )}
              </div>
            )}

            {/* File Info */}
            <Card>
              <p className="text-footnote text-secondary">
                <strong>File:</strong> {selectedTheme.path}
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      <AIPresetIndicator />

      {/* Workspace Header */}
      {currentWorkspace && (
        <div style={{
          backgroundColor: 'var(--color-primary)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h4 className="text-title3" style={{ margin: 0, color: 'white' }}>
            Workspace: {currentWorkspace.name}
          </h4>
        </div>
      )}

      <div style={{ marginBottom: 'var(--spacing-6, 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Product vision and business strategy</h1>
            <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
              Strategic Intent / Product Thesis (Why this exists, success criteria)
            </p>
          </div>
          <Button variant="primary" onClick={handleCreateTheme}>
            + Create Theme
          </Button>
        </div>

        {error && (
          <Alert type="error" style={{ marginBottom: '24px' }}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        <Alert type="info" style={{ marginBottom: '24px' }}>
          <strong>SAWai Strategic Themes:</strong> In Scaled Agile With AI (SAWai), strategic themes are
          differentiating business objectives that connect your portfolio to the enterprise strategy.
          With AI-assisted development, the emphasis shifts to high-quality specifications - well-defined
          themes guide AI tools to generate better outcomes.
        </Alert>

        {/* File-based Themes Section */}
        {currentWorkspace?.projectFolder && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="text-title2">Themes from Specifications</h3>
              <Button variant="secondary" onClick={fetchThemes} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p className="text-body text-secondary">Loading theme files...</p>
              </div>
            ) : themes.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
                    No theme files found in ./specifications folder.
                    <br />
                    <span className="text-footnote">Looking for files matching: VIS-*.md, STRAT-*.md, MKT-*.md</span>
                  </p>
                  <Button variant="primary" onClick={handleCreateTheme}>
                    Create First Theme
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Summary Dashboard */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px'
                }}>
                  <Card style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-label)' }}>
                      {summaryCounts.total}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      Total Themes
                    </div>
                  </Card>
                  <Card
                    style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setTypeFilter('vision')}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemPurple)' }}>
                      {summaryCounts.vision}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      Vision Statements
                    </div>
                  </Card>
                  <Card
                    style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setTypeFilter('strategic-theme')}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemBlue)' }}>
                      {summaryCounts.strategicTheme}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      Strategic Themes
                    </div>
                  </Card>
                  <Card
                    style={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }}
                    onClick={() => setTypeFilter('market-context')}
                  >
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemGreen)' }}>
                      {summaryCounts.marketContext}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-secondaryLabel)', marginTop: '4px' }}>
                      Market Context
                    </div>
                  </Card>
                </div>

                {/* Search and Filter Controls */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <input
                    type="text"
                    placeholder="Search themes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input"
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-separator)',
                    }}
                  />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="input"
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-separator)',
                      minWidth: '180px',
                    }}
                  >
                    <option value="all">All Types</option>
                    <option value="vision">Vision Statements</option>
                    <option value="strategic-theme">Strategic Themes</option>
                    <option value="market-context">Market Context</option>
                  </select>
                  {(searchQuery || typeFilter !== 'all') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearchQuery('');
                        setTypeFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Cascading Theme Cards Layout */}
                {filteredThemes.length === 0 ? (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p className="text-body text-secondary">
                        No themes match your search criteria.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Vision Cards - Top Level (no indent) */}
                    {groupedThemes['vision'].map((theme, index) => (
                      <Card
                        key={`vision-${index}`}
                        style={{
                          borderLeft: '4px solid var(--color-systemPurple)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedTheme(theme)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '20px',
                              backgroundColor: 'rgba(175, 82, 222, 0.15)',
                              color: 'var(--color-systemPurple)',
                              marginBottom: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}>
                              Vision
                            </span>
                            <h3 className="text-headline" style={{ marginBottom: '8px', color: 'var(--color-label)' }}>
                              {theme.name}
                            </h3>
                            {theme.description && (
                              <p className="text-body text-secondary" style={{ margin: 0 }}>
                                {theme.description.substring(0, 200)}{theme.description.length > 200 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTheme(theme); }}
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
                              onClick={(e) => { e.stopPropagation(); handleDeleteTheme(theme); }}
                              disabled={deletingTheme}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
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
                    ))}

                    {/* Strategic Theme Cards - Indented 50px */}
                    {groupedThemes['strategic-theme'].map((theme, index) => (
                      <Card
                        key={`strategic-${index}`}
                        style={{
                          marginLeft: '50px',
                          borderLeft: '4px solid var(--color-systemBlue)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedTheme(theme)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '20px',
                              backgroundColor: 'rgba(0, 122, 255, 0.15)',
                              color: 'var(--color-systemBlue)',
                              marginBottom: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}>
                              Strategic Theme
                            </span>
                            <h3 className="text-headline" style={{ marginBottom: '8px', color: 'var(--color-label)' }}>
                              {theme.name}
                            </h3>
                            {theme.description && (
                              <p className="text-body text-secondary" style={{ margin: 0 }}>
                                {theme.description.substring(0, 200)}{theme.description.length > 200 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTheme(theme); }}
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
                              onClick={(e) => { e.stopPropagation(); handleDeleteTheme(theme); }}
                              disabled={deletingTheme}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
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
                    ))}

                    {/* Market Context Cards - Indented 100px */}
                    {groupedThemes['market-context'].map((theme, index) => (
                      <Card
                        key={`market-${index}`}
                        style={{
                          marginLeft: '100px',
                          borderLeft: '4px solid var(--color-systemGreen)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedTheme(theme)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '20px',
                              backgroundColor: 'rgba(76, 217, 100, 0.15)',
                              color: 'var(--color-systemGreen)',
                              marginBottom: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}>
                              Market Context
                            </span>
                            <h3 className="text-headline" style={{ marginBottom: '8px', color: 'var(--color-label)' }}>
                              {theme.name}
                            </h3>
                            {theme.description && (
                              <p className="text-body text-secondary" style={{ margin: 0 }}>
                                {theme.description.substring(0, 200)}{theme.description.length > 200 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTheme(theme); }}
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
                              onClick={(e) => { e.stopPropagation(); handleDeleteTheme(theme); }}
                              disabled={deletingTheme}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
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
                    ))}
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
                Please set a project folder for this workspace to manage vision and themes.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
