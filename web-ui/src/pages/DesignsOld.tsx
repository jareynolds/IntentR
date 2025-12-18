import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import axios from 'axios';
import { INTEGRATION_URL } from '../api/client';

interface IntegrationResource {
  id: string;
  name: string;
  type: string;
}

interface IntegrationFile {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnail_url?: string;
  size?: number;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export const Designs: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [workspaceIntegrations, setWorkspaceIntegrations] = useState<Record<string, IntegrationResource[]>>({});
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<IntegrationResource | null>(null);
  const [files, setFiles] = useState<IntegrationFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load workspace integrations from localStorage
  useEffect(() => {
    if (!currentWorkspace) return;

    const allIntegrations = JSON.parse(localStorage.getItem('workspace_integrations') || '{}');
    const workspaceIntgs = allIntegrations[currentWorkspace.id] || {};
    setWorkspaceIntegrations(workspaceIntgs);
  }, [currentWorkspace]);

  const getIntegrationConfig = (integrationName: string) => {
    const configKey = `integration_config_${integrationName.toLowerCase().replace(/\s+/g, '_')}`;
    const config = localStorage.getItem(configKey);
    if (!config) return null;
    return JSON.parse(config);
  };

  const handleViewFiles = async (integrationName: string, resource: IntegrationResource) => {
    setSelectedIntegration(integrationName);
    setSelectedResource(resource);
    setShowFilesModal(true);
    setLoading(true);
    setError(null);
    setFiles([]);

    try {
      const config = getIntegrationConfig(integrationName);
      if (!config || !config.fields) {
        throw new Error(`${integrationName} is not configured`);
      }

      const response = await axios.post(`${INTEGRATION_URL}/fetch-files`, {
        integration_name: integrationName,
        resource_id: resource.id,
        resource_type: resource.type,
        credentials: config.fields
      });

      setFiles(response.data.files || []);

      // Load previously selected files for this resource
      const savedSelections = JSON.parse(localStorage.getItem('workspace_design_files') || '{}');
      const workspaceFiles = savedSelections[currentWorkspace?.id || ''] || {};
      const resourceFiles = workspaceFiles[`${integrationName}_${resource.id}`] || [];
      setSelectedFiles(new Set(resourceFiles));
    } catch (err: any) {
      setError(err.response?.data || err.message || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleSaveFileSelection = () => {
    if (!currentWorkspace || !selectedIntegration || !selectedResource) return;

    // Save selected files to localStorage
    const savedSelections = JSON.parse(localStorage.getItem('workspace_design_files') || '{}');
    if (!savedSelections[currentWorkspace.id]) {
      savedSelections[currentWorkspace.id] = {};
    }

    const resourceKey = `${selectedIntegration}_${selectedResource.id}`;
    savedSelections[currentWorkspace.id][resourceKey] = Array.from(selectedFiles);

    // Also save the file details for easy access
    const selectedFileDetails = files.filter(f => selectedFiles.has(f.id));
    const fileDetailsKey = `${resourceKey}_details`;
    savedSelections[currentWorkspace.id][fileDetailsKey] = selectedFileDetails;

    localStorage.setItem('workspace_design_files', JSON.stringify(savedSelections));

    setShowFilesModal(false);
    setSelectedFiles(new Set());
    setSelectedIntegration(null);
    setSelectedResource(null);
    setFiles([]);
  };

  const getIntegrationIcon = (name: string) => {
    if (name.includes('Figma')) return '🎨';
    if (name.includes('GitHub')) return '💻';
    if (name.includes('Jira')) return '📋';
    return '🔗';
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      <div style={{ marginBottom: 'var(--spacing-6, 24px)' }}>
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Design Artifacts</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
          {currentWorkspace
            ? `Manage design files and assets for ${currentWorkspace.name}`
            : 'Select a workspace to manage design files'}
        </p>

        {!currentWorkspace && (
          <Card>
            <p className="text-body text-secondary">
              Please select a workspace to view and manage design artifacts.
            </p>
          </Card>
        )}

        {currentWorkspace && Object.keys(workspaceIntegrations).length === 0 && (
          <Card>
            <h3 className="text-headline" style={{ marginBottom: '8px' }}>No Integrations Configured</h3>
            <p className="text-footnote text-secondary" style={{ marginBottom: '16px' }}>
              Configure integrations for this workspace to access design files and assets.
            </p>
            <p className="text-footnote text-secondary">
              Go to Workspaces → Click "🔗 Integrations" on your workspace to link resources.
            </p>
          </Card>
        )}

        {currentWorkspace && Object.keys(workspaceIntegrations).length > 0 && (
          <div>
            <h2 className="text-title2" style={{ marginBottom: '16px' }}>Linked Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
              {Object.entries(workspaceIntegrations).map(([integrationName, resources]) => (
                <Card key={integrationName} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{getIntegrationIcon(integrationName)}</div>
                    <div style={{ flex: 1 }}>
                      <h3 className="text-headline" style={{ marginBottom: '4px' }}>{integrationName}</h3>
                      <p className="text-footnote text-secondary">
                        {resources.length} resource{resources.length !== 1 ? 's' : ''} linked
                      </p>
                    </div>
                  </div>

                  <div style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    marginBottom: '12px',
                    padding: '8px',
                    backgroundColor: 'var(--color-systemGray6)',
                    borderRadius: '8px'
                  }}>
                    {resources.map((resource, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '6px 8px',
                          marginBottom: idx < resources.length - 1 ? '4px' : 0,
                          backgroundColor: 'white',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span className="text-footnote" style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}>
                          {resource.name}
                        </span>
                        <Button
                          variant="ghost"
                          onClick={() => handleViewFiles(integrationName, resource)}
                          style={{ fontSize: '12px', padding: '4px 8px', marginLeft: '8px' }}
                        >
                          Assets/Files
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Files Selection Modal */}
      {showFilesModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 className="text-title2">Assets & Files</h2>
                <p className="text-body text-secondary" style={{ marginTop: '4px' }}>
                  {selectedResource?.name}
                </p>
              </div>
              <button
                onClick={() => setShowFilesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--color-grey-500)'
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--color-systemRed-light)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <p className="text-footnote" style={{ color: 'var(--color-systemRed)' }}>
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '4px solid var(--color-grey-200)',
                  borderTop: '4px solid var(--color-blue-500)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <p className="text-body">Loading files...</p>
              </div>
            )}

            {!loading && files.length === 0 && !error && (
              <p className="text-body text-secondary" style={{ textAlign: 'center', padding: '40px' }}>
                No files found for this resource.
              </p>
            )}

            {!loading && files.length > 0 && (
              <div>
                <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
                  Select files to make available in this workspace:
                </p>

                <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                  {files.map((file) => {
                    const isSelected = selectedFiles.has(file.id);

                    return (
                      <div
                        key={file.id}
                        onClick={() => toggleFileSelection(file.id)}
                        style={{
                          padding: '12px',
                          border: `2px solid ${isSelected ? 'var(--color-systemBlue)' : 'var(--color-grey-300)'}`,
                          borderRadius: '8px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--color-systemBlue-light)' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <h4 className="text-subheadline">{file.name}</h4>
                            {file.type && (
                              <p className="text-footnote text-secondary" style={{ marginTop: '2px' }}>
                                Type: {file.type}
                                {file.size && ` • Size: ${(file.size / 1024).toFixed(1)} KB`}
                              </p>
                            )}
                            {file.url && (
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-footnote"
                                style={{ color: 'var(--color-systemBlue)', marginTop: '4px', display: 'inline-block' }}
                              >
                                View in {selectedIntegration} →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--color-grey-300)' }}>
                  <Button
                    variant="primary"
                    onClick={handleSaveFileSelection}
                    disabled={selectedFiles.size === 0}
                    style={{ flex: 1 }}
                  >
                    Save {selectedFiles.size} File{selectedFiles.size !== 1 ? 's' : ''}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilesModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
