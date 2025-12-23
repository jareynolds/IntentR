import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageLayout } from '../components/PageLayout';
import { WorkspaceIntegrations } from '../components/WorkspaceIntegrations';
import { WorkspaceVersionControl } from '../components/WorkspaceVersionControl';
import { FolderBrowser } from '../components/FolderBrowser';
import { INTEGRATION_URL } from '../api/client';

// Types for scanned workspaces
interface WorkspaceConfig {
  id: string;
  name: string;
  description?: string;
  workspaceType?: string;
  figmaTeamUrl?: string;
  projectFolder?: string;
  activeAIPreset?: number;
  selectedUIFramework?: string;
  selectedUILayout?: string;
  ownerId?: string;
  ownerName?: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  version: string;
}

interface ScannedWorkspace {
  folderName: string;
  folderPath: string;
  config?: WorkspaceConfig;
  hasConfig: boolean;
}

export const Workspaces: React.FC = () => {
  const {
    workspaces,
    sharedWorkspaces,
    joinedWorkspaces,
    currentWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    switchWorkspace,
    toggleSharing,
    joinSharedWorkspace,
    leaveSharedWorkspace,
    refreshSharedWorkspaces,
  } = useWorkspace();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [showVersionControlModal, setShowVersionControlModal] = useState(false);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<string | null>(null);
  const [selectedWorkspaceForIntegrations, setSelectedWorkspaceForIntegrations] = useState<any>(null);
  const [selectedWorkspaceForVersionControl, setSelectedWorkspaceForVersionControl] = useState<any>(null);
  const [selectingFolderFor, setSelectingFolderFor] = useState<string | null>(null);
  const [scannedWorkspaces, setScannedWorkspaces] = useState<ScannedWorkspace[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    figmaTeamUrl: '',
    activeAIPreset: 0,
    workspaceType: 'new' as 'new' | 'refactor' | 'enhance' | 'reverse-engineer',
  });

  useEffect(() => {
    refreshSharedWorkspaces();
    scanWorkspaceFolders(); // Scan on initial load
  }, []);

  // Normalize folder path to match how WorkspaceContext creates projectFolder
  const normalizeFolderPath = (folderPath: string): string => {
    // Extract folder name from path (e.g., "workspaces/My Project" -> "My Project")
    const folderName = folderPath.split('/').pop() || folderPath;
    // Apply same normalization as WorkspaceContext.createWorkspace
    const safeFolderName = folderName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
    return `workspaces/${safeFolderName}`;
  };

  const scanWorkspaceFolders = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/workspace-config/scan`);
      if (response.ok) {
        const data = await response.json();
        // Filter out workspaces that are already in the user's workspace list
        // Normalize BOTH sides to handle path differences (e.g., "My Project" vs "My-Project")
        const existingFolders = new Set(
          workspaces
            .map(w => w.projectFolder)
            .filter((folder): folder is string => Boolean(folder))
            .map(folder => normalizeFolderPath(folder))
        );
        console.log('Existing folders (normalized):', Array.from(existingFolders));
        const discoveredWorkspaces = (data.workspaces || []).filter(
          (sw: ScannedWorkspace) => {
            const normalizedPath = normalizeFolderPath(sw.folderPath);
            const isExisting = existingFolders.has(normalizedPath);
            console.log(`Checking ${sw.folderPath} -> ${normalizedPath}: ${isExisting ? 'FILTERED' : 'KEEP'}`);
            return !isExisting;
          }
        );
        setScannedWorkspaces(discoveredWorkspaces);
      }
    } catch (error) {
      console.error('Error scanning workspace folders:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const importScannedWorkspace = async (scanned: ScannedWorkspace) => {
    if (scanned.hasConfig && scanned.config) {
      // Import workspace from config file
      const config = scanned.config;
      await createWorkspace(
        config.name,
        config.description,
        config.figmaTeamUrl,
        (config.workspaceType as 'new' | 'refactor' | 'enhance' | 'reverse-engineer') || 'new'
      );
    } else {
      // Create new workspace from folder name
      await createWorkspace(
        scanned.folderName,
        `Imported from ${scanned.folderPath}`,
        undefined,
        'new'
      );
    }
    // Immediately remove the imported workspace from the scanned list
    // This avoids stale closure issues with the workspaces state
    setScannedWorkspaces(prev => prev.filter(sw => sw.folderPath !== scanned.folderPath));
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    await createWorkspace(formData.name, formData.description, formData.figmaTeamUrl, formData.workspaceType);
    setShowCreateModal(false);
    setFormData({ name: '', description: '', figmaTeamUrl: '', activeAIPreset: 0, workspaceType: 'new' });
  };

  const handleEdit = async () => {
    if (!editingWorkspace || !formData.name.trim()) return;

    await updateWorkspace(editingWorkspace, {
      name: formData.name,
      description: formData.description,
      figmaTeamUrl: formData.figmaTeamUrl,
      activeAIPreset: formData.activeAIPreset,
      workspaceType: formData.workspaceType,
    });
    setShowEditModal(false);
    setEditingWorkspace(null);
    setFormData({ name: '', description: '', figmaTeamUrl: '', activeAIPreset: 0, workspaceType: 'new' });
  };

  const handleDelete = async (id: string) => {
    if (workspaces.length === 1 && joinedWorkspaces.length === 0) {
      alert('Cannot delete the last workspace');
      return;
    }

    if (confirm('Are you sure you want to delete this workspace?')) {
      await deleteWorkspace(id);
    }
  };

  const handleToggleSharing = async (id: string) => {
    try {
      await toggleSharing(id);
      await refreshSharedWorkspaces();
    } catch (error) {
      alert('Failed to toggle sharing. Please try again.');
    }
  };

  const handleJoinWorkspace = async (workspace: any) => {
    try {
      await joinSharedWorkspace(workspace);
      await refreshSharedWorkspaces();
    } catch (error) {
      alert('Failed to join workspace. Please try again.');
    }
  };

  const handleLeaveWorkspace = async (id: string) => {
    if (confirm('Are you sure you want to leave this shared workspace?')) {
      try {
        await leaveSharedWorkspace(id);
        await refreshSharedWorkspaces();
      } catch (error) {
        alert('Failed to leave workspace. Please try again.');
      }
    }
  };

  const openEditModal = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setEditingWorkspace(workspaceId);
      setFormData({
        name: workspace.name,
        description: workspace.description || '',
        figmaTeamUrl: workspace.figmaTeamUrl || '',
        activeAIPreset: workspace.activeAIPreset || 0,
        workspaceType: workspace.workspaceType || 'new',
      });
      setShowEditModal(true);
    }
  };

  const openIntegrationsModal = (workspace: any) => {
    setSelectedWorkspaceForIntegrations(workspace);
    setShowIntegrationsModal(true);
  };

  const openVersionControlModal = (workspace: any) => {
    setSelectedWorkspaceForVersionControl(workspace);
    setShowVersionControlModal(true);
  };

  const openFolderBrowser = (workspaceId: string) => {
    setSelectingFolderFor(workspaceId);
    setShowFolderBrowser(true);
  };

  const handleFolderSelect = async (path: string) => {
    if (selectingFolderFor) {
      try {
        // Ensure workspace folder structure exists (creates required subfolders)
        const response = await fetch(`${INTEGRATION_URL}/folders/ensure-workspace-structure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });

        if (!response.ok) {
          console.error('Failed to ensure workspace structure');
        } else {
          const result = await response.json();
          if (result.created_folders && result.created_folders.length > 0) {
            console.log('Created workspace subfolders:', result.created_folders);
          }
        }
      } catch (error) {
        console.error('Error ensuring workspace structure:', error);
      }

      await updateWorkspace(selectingFolderFor, { projectFolder: path });
      setShowFolderBrowser(false);
      setSelectingFolderFor(null);
    }
  };

  return (
    <PageLayout
      title="Workspaces"
      quickDescription="Manage your design workspaces and collaborate with others."
      detailedDescription="Create, configure, and manage your project workspaces. You can scan existing folders for workspaces, share workspaces with collaborators, and join shared workspaces."
      className="max-w-7xl mx-auto"
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" onClick={scanWorkspaceFolders} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Scan Folders'}
          </Button>
          <Button variant="outline" onClick={refreshSharedWorkspaces}>
            🔄 Refresh Shared
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Create Workspace
          </Button>
        </div>
      }
    >

      {/* My Workspaces */}
      <div style={{ marginBottom: '48px' }}>
        <h2 className="text-title1" style={{ marginBottom: '16px' }}>My Workspaces</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
          {workspaces.sort((a, b) => {
            if (a.id === currentWorkspace?.id) return -1;
            if (b.id === currentWorkspace?.id) return 1;
            return 0;
          }).map((workspace) => {
            const isActive = currentWorkspace?.id === workspace.id;
            return (
            <Card
              key={workspace.id}
              style={{
                border: isActive ? '2px solid var(--color-primary)' : undefined,
                backgroundColor: isActive ? 'rgba(0, 122, 255, 0.05)' : undefined,
                boxShadow: isActive ? '0 2px 8px rgba(0, 122, 255, 0.15)' : undefined,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h3 className="text-headline">{workspace.name}</h3>
                    {isActive && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '20px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                      }}>
                        ACTIVE
                      </span>
                    )}
                    {workspace.isShared && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '20px',
                        backgroundColor: 'rgba(52, 199, 89, 0.1)',
                        color: 'var(--color-systemGreen)',
                      }}>
                        Shared
                      </span>
                    )}
                    {workspace.activeAIPreset && workspace.activeAIPreset > 0 && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '20px',
                        backgroundColor: workspace.activeAIPreset === 1 ? 'rgba(52, 199, 89, 0.1)' :
                                       workspace.activeAIPreset === 2 ? 'rgba(0, 122, 255, 0.1)' :
                                       workspace.activeAIPreset === 3 ? 'rgba(255, 204, 0, 0.1)' :
                                       workspace.activeAIPreset === 4 ? 'rgba(255, 149, 0, 0.1)' :
                                       'rgba(255, 59, 48, 0.1)',
                        color: workspace.activeAIPreset === 1 ? 'var(--color-systemGreen)' :
                               workspace.activeAIPreset === 2 ? 'var(--color-systemBlue)' :
                               workspace.activeAIPreset === 3 ? 'var(--color-systemYellow)' :
                               workspace.activeAIPreset === 4 ? 'var(--color-systemOrange)' :
                               'var(--color-systemRed)',
                      }}>
                        🛡️ AI Level {workspace.activeAIPreset}
                      </span>
                    )}
                  </div>
                  {workspace.description && (
                    <p className="text-footnote text-secondary">{workspace.description}</p>
                  )}
                </div>

                {workspace.figmaTeamUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'var(--color-systemBackground-secondary)', borderRadius: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🎨</span>
                    <a
                      href={workspace.figmaTeamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-footnote"
                      style={{ color: 'var(--color-systemBlue)', fontWeight: 500 }}
                    >
                      View Figma Team
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '12px', backgroundColor: 'var(--color-systemBackground-secondary)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '20px' }}>📁</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-caption1 text-tertiary" style={{ marginBottom: '2px' }}>Workspace Folder</div>
                      <div className="text-footnote" style={{ fontWeight: 500, color: workspace.projectFolder ? 'var(--color-label)' : 'var(--color-tertiaryLabel)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {workspace.projectFolder || 'Not set'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => openFolderBrowser(workspace.id)}
                    style={{ fontSize: '13px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                  >
                    {workspace.projectFolder ? 'Change' : 'Select'}
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-systemGray4)' }}>
                  <span className="text-caption1 text-tertiary">Created: {workspace.createdAt.toLocaleDateString()}</span>
                  <span className="text-caption1 text-tertiary">Updated: {workspace.updatedAt.toLocaleDateString()}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', flexWrap: 'wrap' }}>
                  {!isActive && (
                    <Button
                      variant="secondary"
                      onClick={() => switchWorkspace(workspace.id)}
                      style={{ flex: '1 1 auto', fontSize: '15px', padding: '8px 12px' }}
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => openEditModal(workspace.id)}
                    style={{ flex: '1 1 auto', fontSize: '15px', padding: '8px 12px' }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openIntegrationsModal(workspace)}
                    style={{ flex: '1 1 auto', fontSize: '15px', padding: '8px 12px' }}
                  >
                    🔗 Integrations
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openVersionControlModal(workspace)}
                    style={{ flex: '1 1 auto', fontSize: '15px', padding: '8px 12px' }}
                  >
                    🔀 Version Control
                  </Button>
                  <Button
                    variant={workspace.isShared ? "secondary" : "outline"}
                    onClick={() => handleToggleSharing(workspace.id)}
                    style={{ flex: '1 1 auto', fontSize: '15px', padding: '8px 12px' }}
                  >
                    {workspace.isShared ? '🔓 Unshare' : '🔒 Share'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(workspace.id)}
                    disabled={workspaces.length === 1 && joinedWorkspaces.length === 0}
                    style={{ flex: '1 1 auto', fontSize: '15px', padding: '8px 12px' }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      </div>

      {/* Joined Shared Workspaces */}
      {joinedWorkspaces.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <h2 className="text-title1" style={{ marginBottom: '16px' }}>Joined Workspaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
            {joinedWorkspaces.sort((a, b) => {
              if (a.id === currentWorkspace?.id) return -1;
              if (b.id === currentWorkspace?.id) return 1;
              return 0;
            }).map((workspace) => {
              const isActive = currentWorkspace?.id === workspace.id;
              return (
              <Card
                key={workspace.id}
                style={{
                  border: isActive ? '2px solid var(--color-primary)' : undefined,
                  backgroundColor: isActive ? 'rgba(0, 122, 255, 0.05)' : undefined,
                  boxShadow: isActive ? '0 2px 8px rgba(0, 122, 255, 0.15)' : undefined,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 className="text-headline">{workspace.name}</h3>
                      {isActive && (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '20px',
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-caption1 text-secondary" style={{ marginBottom: '4px' }}>
                      Owner: {workspace.ownerName || workspace.ownerId}
                    </p>
                    {workspace.description && (
                      <p className="text-footnote text-secondary">{workspace.description}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
                    {!isActive && (
                      <Button
                        variant="secondary"
                        onClick={() => switchWorkspace(workspace.id, true)}
                        style={{ flex: 1, fontSize: '15px', padding: '8px 12px' }}
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleLeaveWorkspace(workspace.id)}
                      style={{ flex: 1, fontSize: '15px', padding: '8px 12px' }}
                    >
                      Leave
                    </Button>
                  </div>
                </div>
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Shared Workspaces */}
      {sharedWorkspaces.length > 0 && (
        <div>
          <h2 className="text-title1" style={{ marginBottom: '16px' }}>Available Shared Workspaces</h2>
          <p className="text-footnote text-secondary" style={{ marginBottom: '16px' }}>
            These workspaces are shared by other users. Join them to collaborate in real-time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
            {sharedWorkspaces
              .filter(w => !joinedWorkspaces.some(j => j.id === w.id))
              .map((workspace) => (
                <Card key={workspace.id}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <h3 className="text-headline" style={{ marginBottom: '8px' }}>{workspace.name}</h3>
                      <p className="text-caption1 text-secondary" style={{ marginBottom: '8px' }}>
                        👤 Shared by: {workspace.ownerName || workspace.ownerId}
                      </p>
                      {workspace.description && (
                        <p className="text-footnote text-secondary">{workspace.description}</p>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-systemGray4)' }}>
                      <span className="text-caption1 text-tertiary">Updated: {new Date(workspace.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => handleJoinWorkspace(workspace)}
                      style={{ width: '100%', fontSize: '15px', padding: '8px 12px' }}
                    >
                      ✓ Join Workspace
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {sharedWorkspaces.length === 0 && joinedWorkspaces.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 16px', backgroundColor: 'var(--color-systemBackground-secondary)', borderRadius: '10px' }}>
          <p className="text-body text-secondary">
            No shared workspaces available. Share your workspaces using the Share button to collaborate with others.
          </p>
        </div>
      )}

      {/* Discovered Workspace Folders */}
      <div style={{ marginTop: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 className="text-title1">Discovered Workspace Folders</h2>
            <p className="text-footnote text-secondary" style={{ marginTop: '4px' }}>
              Workspace folders found in ./workspaces that aren't linked to your account
            </p>
          </div>
          <Button
            variant="outline"
            onClick={scanWorkspaceFolders}
            disabled={isScanning}
          >
            {isScanning ? 'Scanning...' : 'Scan Folders'}
          </Button>
        </div>

        {scannedWorkspaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--spacing-4, 16px)' }}>
            {scannedWorkspaces.map((scanned) => (
              <Card key={scanned.folderPath}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '24px' }}>📁</span>
                      <h3 className="text-headline">
                        {scanned.hasConfig && scanned.config ? scanned.config.name : scanned.folderName}
                      </h3>
                    </div>
                    {scanned.hasConfig && scanned.config?.description && (
                      <p className="text-footnote text-secondary" style={{ marginBottom: '8px' }}>
                        {scanned.config.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {scanned.hasConfig ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '12px',
                          backgroundColor: 'rgba(52, 199, 89, 0.1)',
                          color: 'var(--color-systemGreen)',
                        }}>
                          Has .ubeworkspace
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 149, 0, 0.1)',
                          color: 'var(--color-systemOrange)',
                        }}>
                          No config file
                        </span>
                      )}
                      {scanned.hasConfig && scanned.config?.workspaceType && (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 500,
                          borderRadius: '12px',
                          backgroundColor: 'rgba(0, 122, 255, 0.1)',
                          color: 'var(--color-systemBlue)',
                        }}>
                          {scanned.config.workspaceType}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--color-systemBackground-secondary)', borderRadius: '8px' }}>
                    <p className="text-caption2 text-tertiary" style={{ fontFamily: 'monospace' }}>
                      {scanned.folderPath}
                    </p>
                  </div>

                  {scanned.hasConfig && scanned.config && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', paddingTop: '8px', borderTop: '1px solid var(--color-systemGray4)' }}>
                      <span className="text-caption1 text-tertiary">
                        Created: {new Date(scanned.config.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-caption1 text-tertiary">
                        Updated: {new Date(scanned.config.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={() => importScannedWorkspace(scanned)}
                    style={{ width: '100%', fontSize: '15px', padding: '8px 12px' }}
                  >
                    Import Workspace
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 16px', backgroundColor: 'var(--color-systemBackground-secondary)', borderRadius: '10px' }}>
            <p className="text-body text-secondary">
              {isScanning
                ? 'Scanning workspace folders...'
                : 'No unlinked workspace folders found. All folders in ./workspaces are already linked to workspaces.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-systemBackground)',
              borderRadius: '10px',
              padding: '32px',
              maxWidth: '512px',
              width: '100%',
              margin: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-title1" style={{ marginBottom: '24px' }}>Create New Workspace</h3>

            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="label block mb-2">
                  Workspace Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Marketing Campaign"
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="workspaceType" className="label block mb-2">
                  Type *
                </label>
                <select
                  id="workspaceType"
                  value={formData.workspaceType}
                  onChange={(e) => setFormData({ ...formData, workspaceType: e.target.value as any })}
                  className="input w-full"
                  style={{
                    padding: '12px',
                    fontSize: '15px',
                    backgroundColor: 'var(--color-systemBackground)',
                    border: '1px solid var(--color-systemGray4)',
                    borderRadius: '8px',
                    color: 'var(--color-label)',
                  }}
                >
                  <option value="new">Create New Application</option>
                  <option value="refactor">Refactor Existing Application</option>
                  <option value="enhance">Enhance Existing Application</option>
                  <option value="reverse-engineer">Reverse Engineer Existing Software</option>
                </select>
                <p className="text-caption1 text-secondary" style={{ marginTop: '4px' }}>
                  Select the type of workspace to determine the workflow
                </p>
              </div>

              <div>
                <label htmlFor="description" className="label block mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this workspace"
                  className="input w-full min-h-[80px] resize-y"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="figmaTeamUrl" className="label block mb-2">
                  Figma Team URL (Optional)
                </label>
                <input
                  id="figmaTeamUrl"
                  type="url"
                  value={formData.figmaTeamUrl}
                  onChange={(e) => setFormData({ ...formData, figmaTeamUrl: e.target.value })}
                  placeholder="https://www.figma.com/files/team/123456/Team-Name"
                  className="input w-full"
                />
                <p className="text-caption1 text-secondary" style={{ marginTop: '4px' }}>
                  Paste the URL from your Figma team's files page to enable automatic project and file listing
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreate} disabled={!formData.name.trim()}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-systemBackground)',
              borderRadius: '10px',
              padding: '32px',
              maxWidth: '512px',
              width: '100%',
              margin: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-title1" style={{ marginBottom: '24px' }}>Edit Workspace</h3>

            <div className="space-y-5">
              <div>
                <label htmlFor="edit-name" className="label block mb-2">
                  Workspace Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="edit-workspaceType" className="label block mb-2">
                  Type
                </label>
                <select
                  id="edit-workspaceType"
                  value={formData.workspaceType}
                  onChange={(e) => setFormData({ ...formData, workspaceType: e.target.value as any })}
                  className="input w-full"
                  style={{
                    padding: '12px',
                    fontSize: '15px',
                    backgroundColor: 'var(--color-systemBackground)',
                    border: '1px solid var(--color-systemGray4)',
                    borderRadius: '8px',
                    color: 'var(--color-label)',
                  }}
                >
                  <option value="new">Create New Application</option>
                  <option value="refactor">Refactor Existing Application</option>
                  <option value="enhance">Enhance Existing Application</option>
                  <option value="reverse-engineer">Reverse Engineer Existing Software</option>
                </select>
                <p className="text-caption1 text-secondary" style={{ marginTop: '4px' }}>
                  Changing the type will update the navigation menu
                </p>
              </div>

              <div>
                <label htmlFor="edit-description" className="label block mb-2">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full min-h-[80px] resize-y"
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="edit-figmaTeamUrl" className="label block mb-2">
                  Figma Team URL (Optional)
                </label>
                <input
                  id="edit-figmaTeamUrl"
                  type="url"
                  value={formData.figmaTeamUrl}
                  onChange={(e) => setFormData({ ...formData, figmaTeamUrl: e.target.value })}
                  placeholder="https://www.figma.com/files/team/123456/Team-Name"
                  className="input w-full"
                />
                <p className="text-caption1 text-secondary" style={{ marginTop: '4px' }}>
                  Paste the URL from your Figma team's files page to enable automatic project and file listing
                </p>
              </div>

              <div>
                <label htmlFor="edit-aiPreset" className="label block mb-2">
                  AI Governance Preset
                </label>
                <select
                  id="edit-aiPreset"
                  value={formData.activeAIPreset}
                  onChange={(e) => setFormData({ ...formData, activeAIPreset: parseInt(e.target.value) })}
                  className="input w-full"
                  style={{
                    padding: '12px',
                    fontSize: '15px',
                    backgroundColor: 'var(--color-systemBackground)',
                    border: '1px solid var(--color-systemGray4)',
                    borderRadius: '8px',
                    color: 'var(--color-label)',
                  }}
                >
                  <option value={0}>No AI Preset (Default)</option>
                  <option value={1}>Level 1: Awareness (Advisory)</option>
                  <option value={2}>Level 2: Guided Recommendations (Suggested)</option>
                  <option value={3}>Level 3: Enforced with Warnings (Controlled)</option>
                  <option value={4}>Level 4: Strict Enforcement (Mandatory)</option>
                  <option value={5}>Level 5: Zero-Tolerance Termination (Absolute)</option>
                </select>
                <p className="text-caption1 text-secondary" style={{ marginTop: '4px' }}>
                  Select an AI governance preset to enforce compliance policies for Claude AI interactions in this workspace
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleEdit} disabled={!formData.name.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Integrations Modal */}
      {showIntegrationsModal && selectedWorkspaceForIntegrations && (
        <WorkspaceIntegrations
          workspace={selectedWorkspaceForIntegrations}
          onClose={() => {
            setShowIntegrationsModal(false);
            setSelectedWorkspaceForIntegrations(null);
          }}
        />
      )}

      {/* Folder Browser Modal */}
      {showFolderBrowser && (
        <FolderBrowser
          onSelect={handleFolderSelect}
          onClose={() => {
            setShowFolderBrowser(false);
            setSelectingFolderFor(null);
          }}
        />
      )}

      {/* Version Control Modal */}
      {showVersionControlModal && selectedWorkspaceForVersionControl && (
        <WorkspaceVersionControl
          workspace={selectedWorkspaceForVersionControl}
          onClose={() => {
            setShowVersionControlModal(false);
            setSelectedWorkspaceForVersionControl(null);
          }}
        />
      )}
    </PageLayout>
  );
};
