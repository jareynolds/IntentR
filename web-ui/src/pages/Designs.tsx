import React, { useState, useEffect } from 'react';
import { Card, Button, AIPresetIndicator } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
import axios from 'axios';
import { INTEGRATION_URL } from '../api/client';

interface FigmaProject {
  id: string;
  name: string;
}

interface FigmaFile {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnail_url?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export const Designs: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [projects, setProjects] = useState<FigmaProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<FigmaProject | null>(null);
  const [files, setFiles] = useState<FigmaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [savedFiles, setSavedFiles] = useState<FigmaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [figmaToken, setFigmaToken] = useState('');

  // Check if Figma is configured
  useEffect(() => {
    const config = localStorage.getItem('integration_config_figma_api');
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed.fields?.access_token) {
        setFigmaToken(parsed.fields.access_token);
      }
    }
  }, []);

  // Load saved files when workspace changes
  useEffect(() => {
    if (!currentWorkspace) return;

    const savedData = localStorage.getItem(`workspace_figma_files_${currentWorkspace.id}`);
    if (savedData) {
      setSavedFiles(JSON.parse(savedData));
    } else {
      setSavedFiles([]);
    }
  }, [currentWorkspace]);

  // Fetch projects when workspace has team URL
  useEffect(() => {
    if (!currentWorkspace?.figmaTeamUrl || !figmaToken) return;

    fetchProjects();
  }, [currentWorkspace, figmaToken]);

  const fetchProjects = async () => {
    if (!currentWorkspace?.figmaTeamUrl || !figmaToken) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching Figma projects with team URL:', currentWorkspace.figmaTeamUrl);

      const response = await axios.post(`${INTEGRATION_URL}/fetch-resources`, {
        integration_name: 'Figma API',
        credentials: {
          access_token: figmaToken,
          team_url: currentWorkspace.figmaTeamUrl,
        },
      });

      console.log('Figma API response:', response.data);
      setProjects(response.data.resources || []);
    } catch (err: any) {
      console.error('Failed to fetch Figma projects:', err);
      const errorMessage = err.response?.data || err.message || 'Failed to fetch Figma projects';
      console.error('Error details:', errorMessage);
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleViewFiles = async (project: FigmaProject) => {
    setSelectedProject(project);
    setShowFilesModal(true);
    setLoadingFiles(true);
    setError(null);
    setFiles([]);
    setSelectedFiles(new Set());

    try {
      const response = await axios.post(`${INTEGRATION_URL}/fetch-files`, {
        integration_name: 'Figma API',
        resource_id: project.id,
        resource_type: 'project',
        credentials: {
          access_token: figmaToken,
        },
      });

      setFiles(response.data.files || []);

      // Pre-select already saved files
      const alreadySaved = savedFiles.filter(f => f.metadata?.project_id === project.id);
      setSelectedFiles(new Set(alreadySaved.map(f => f.id)));
    } catch (err: any) {
      console.error('Failed to fetch files:', err);
      setError(err.response?.data || err.message || 'Failed to fetch files');
    } finally {
      setLoadingFiles(false);
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

  const handleSaveFiles = () => {
    if (!currentWorkspace) return;

    // Get the selected file objects
    const selectedFileObjects = files.filter(f => selectedFiles.has(f.id));

    // Merge with existing saved files (remove duplicates)
    const existingFiles = savedFiles.filter(f => f.metadata?.project_id !== selectedProject?.id);
    const newSavedFiles = [...existingFiles, ...selectedFileObjects];

    setSavedFiles(newSavedFiles);
    localStorage.setItem(`workspace_figma_files_${currentWorkspace.id}`, JSON.stringify(newSavedFiles));

    setShowFilesModal(false);
    setSelectedProject(null);
    setFiles([]);
    setSelectedFiles(new Set());
  };

  const handleRemoveFile = (fileId: string) => {
    if (!currentWorkspace) return;

    const newSavedFiles = savedFiles.filter(f => f.id !== fileId);
    setSavedFiles(newSavedFiles);
    localStorage.setItem(`workspace_figma_files_${currentWorkspace.id}`, JSON.stringify(newSavedFiles));
  };

  if (!currentWorkspace) {
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <h1 className="text-large-title" style={{ marginBottom: '24px' }}>Design Artifacts</h1>
        <Card>
          <p className="text-body text-secondary">
            Please select a workspace to manage design artifacts.
          </p>
        </Card>
      </div>
    );
  }

  if (!currentWorkspace.figmaTeamUrl) {
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Design Artifacts</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
          Manage design files and assets for {currentWorkspace.name}
        </p>
        <Card>
          <h3 className="text-headline" style={{ marginBottom: '8px' }}>Figma Team URL Not Configured</h3>
          <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
            To access Figma projects and files, you need to add your Figma Team URL to this workspace.
          </p>
          <div style={{ backgroundColor: 'var(--color-systemGray6)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <p className="text-subheadline" style={{ marginBottom: '8px' }}>How to find your Figma Team URL:</p>
            <ol className="text-footnote text-secondary" style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>Log in to Figma</li>
              <li>Navigate to your team's files page</li>
              <li>Copy the URL from your browser (it should look like: <code>https://www.figma.com/files/team/123456/Team-Name</code>)</li>
              <li>Go to Workspaces page → Edit this workspace → Paste the URL in "Figma Team URL" field</li>
            </ol>
          </div>
          <Button variant="primary" onClick={() => window.location.href = '/workspaces'}>
            Go to Workspaces
          </Button>
        </Card>
      </div>
    );
  }

  if (!figmaToken) {
    return (
      <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Design Artifacts</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
          Manage design files and assets for {currentWorkspace.name}
        </p>
        <Card>
          <h3 className="text-headline" style={{ marginBottom: '8px' }}>Figma Not Configured</h3>
          <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
            To access Figma files, you need to configure your Figma integration first.
          </p>
          <Button variant="primary" onClick={() => window.location.href = '/integrations'}>
            Configure Figma
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      <AIPresetIndicator />
      <div style={{ marginBottom: 'var(--spacing-6, 24px)' }}>
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
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Design Artifacts</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
          Manage design files and assets
        </p>

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

        {/* Debug Info */}
        {currentWorkspace?.figmaTeamUrl && (
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--color-systemBlue-light)',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid var(--color-systemBlue)'
          }}>
            <p className="text-footnote" style={{ color: 'var(--color-systemBlue)', marginBottom: '4px' }}>
              <strong>🔍 Debug Info:</strong>
            </p>
            <p className="text-footnote" style={{ color: 'var(--color-label-primary)', fontFamily: 'monospace', fontSize: '11px' }}>
              Team URL: {currentWorkspace.figmaTeamUrl}
            </p>
            <p className="text-footnote" style={{ color: 'var(--color-label-primary)', fontFamily: 'monospace', fontSize: '11px' }}>
              Parsed Team ID: {currentWorkspace.figmaTeamUrl.includes('/team/')
                ? currentWorkspace.figmaTeamUrl.split('/team/')[1]?.split('/')[0] || 'Not found'
                : 'Invalid URL format'}
            </p>
            <p className="text-footnote" style={{ color: 'var(--color-label-primary)', fontFamily: 'monospace', fontSize: '11px' }}>
              Figma Token: {figmaToken ? '✓ Configured' : '✗ Missing'}
            </p>
            <p className="text-footnote" style={{ color: 'var(--color-label-primary)', fontFamily: 'monospace', fontSize: '11px' }}>
              Projects Found: {projects.length}
            </p>
          </div>
        )}

        {/* Saved Files Section */}
        {savedFiles.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 className="text-title2" style={{ marginBottom: '16px' }}>
              Selected Files ({savedFiles.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
              {savedFiles.map((file) => (
                <Card key={file.id}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {file.thumbnail_url && (
                      <img
                        src={file.thumbnail_url}
                        alt={file.name}
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-systemGray6)'
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 className="text-subheadline" style={{ marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </h4>
                      <p className="text-footnote text-secondary">
                        Figma File
                      </p>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-footnote"
                          style={{ color: 'var(--color-systemBlue)' }}
                        >
                          View →
                        </a>
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-footnote"
                          style={{ color: 'var(--color-systemRed)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Projects Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="text-title2">Figma Projects</h2>
            {projects.length > 0 && (
              <Button variant="ghost" onClick={fetchProjects} disabled={loading}>
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </Button>
            )}
          </div>

          {loading && projects.length === 0 && (
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
              <p className="text-body">Loading Figma projects...</p>
            </div>
          )}

          {!loading && projects.length === 0 && (
            <Card>
              <p className="text-body text-secondary">
                No Figma projects found for this team. Make sure your Figma token has access to the team.
              </p>
            </Card>
          )}

          {projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
              {projects.map((project) => {
                const projectFileCount = savedFiles.filter(f => f.metadata?.project_id === project.id).length;

                return (
                  <Card key={project.id}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '32px' }}>🎨</div>
                      <div style={{ flex: 1 }}>
                        <h3 className="text-headline" style={{ marginBottom: '4px' }}>{project.name}</h3>
                        <p className="text-footnote text-secondary">
                          Figma Project
                        </p>
                        {projectFileCount > 0 && (
                          <p className="text-footnote" style={{ color: 'var(--color-systemBlue)', marginTop: '4px' }}>
                            {projectFileCount} file{projectFileCount !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleViewFiles(project)}
                      style={{ width: '100%' }}
                    >
                      Select Files
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
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
                <h2 className="text-title2">Select Files</h2>
                <p className="text-body text-secondary" style={{ marginTop: '4px' }}>
                  {selectedProject?.name}
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

            {loadingFiles && (
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

            {!loadingFiles && files.length === 0 && (
              <p className="text-body text-secondary" style={{ textAlign: 'center', padding: '40px' }}>
                No files found in this project.
              </p>
            )}

            {!loadingFiles && files.length > 0 && (
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
                          {file.thumbnail_url && (
                            <img
                              src={file.thumbnail_url}
                              alt={file.name}
                              style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                backgroundColor: 'var(--color-systemGray6)'
                              }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <h4 className="text-subheadline">{file.name}</h4>
                            {file.updated_at && (
                              <p className="text-footnote text-secondary" style={{ marginTop: '2px' }}>
                                Updated: {new Date(file.updated_at).toLocaleDateString()}
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
                                View in Figma →
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
                    onClick={handleSaveFiles}
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
