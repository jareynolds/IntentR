import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components';
import { useWorkspace, type Workspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { INTEGRATION_URL } from '../api/client';

interface FileCapability {
  filename: string;
  path: string;
  name: string;
  description: string;
  status: string;
  content: string;
  fields: Record<string, string>;
}

interface WorkspaceMetrics {
  workspaceId: string;
  capabilities: FileCapability[];
  statusCounts: {
    notSpecified: number;
    planned: number;
    inProgress: number;
    implemented: number;
    deprecated: number;
    total: number;
  };
  completionPercentage: number;
  blockerCount: number;
  lastActivity: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { workspaces, joinedWorkspaces, currentWorkspace, switchWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [workspaceMetrics, setWorkspaceMetrics] = useState<Map<string, WorkspaceMetrics>>(new Map());
  const [loading, setLoading] = useState(false);

  // Sort workspaces to show current workspace first (top-left)
  const allWorkspaces = [...workspaces, ...joinedWorkspaces].sort((a, b) => {
    if (a.id === currentWorkspace?.id) return -1;
    if (b.id === currentWorkspace?.id) return 1;
    return 0;
  });

  useEffect(() => {
    if (allWorkspaces.length > 0) {
      fetchAllWorkspaceMetrics();
    }
  }, [allWorkspaces.length]);

  const fetchAllWorkspaceMetrics = async () => {
    setLoading(true);
    const metricsMap = new Map<string, WorkspaceMetrics>();

    for (const workspace of allWorkspaces) {
      if (!workspace.projectFolder) {
        // Workspace without project folder
        metricsMap.set(workspace.id, {
          workspaceId: workspace.id,
          capabilities: [],
          statusCounts: {
            notSpecified: 0,
            planned: 0,
            inProgress: 0,
            implemented: 0,
            deprecated: 0,
            total: 0,
          },
          completionPercentage: 0,
          blockerCount: 0,
          lastActivity: new Date(workspace.updatedAt).toLocaleDateString(),
        });
        continue;
      }

      try {
        const response = await fetch(`${INTEGRATION_URL}/capability-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspacePath: workspace.projectFolder }),
        });
        const data = await response.json();
        const capabilities = data.capabilities || [];

        const statusCounts = {
          notSpecified: capabilities.filter((c: FileCapability) => !c.status || c.status.trim() === '').length,
          planned: capabilities.filter((c: FileCapability) => c.status?.toLowerCase() === 'planned').length,
          inProgress: capabilities.filter((c: FileCapability) => c.status?.toLowerCase() === 'in progress' || c.status?.toLowerCase() === 'in_progress').length,
          implemented: capabilities.filter((c: FileCapability) => c.status?.toLowerCase() === 'implemented').length,
          deprecated: capabilities.filter((c: FileCapability) => c.status?.toLowerCase() === 'deprecated').length,
          total: capabilities.length,
        };

        const completionPercentage = statusCounts.total > 0
          ? Math.round((statusCounts.implemented / statusCounts.total) * 100)
          : 0;

        const blockerCount =
          statusCounts.notSpecified +
          capabilities.filter((c: FileCapability) => !c.description || c.description.trim() === '').length;

        metricsMap.set(workspace.id, {
          workspaceId: workspace.id,
          capabilities,
          statusCounts,
          completionPercentage,
          blockerCount,
          lastActivity: new Date(workspace.updatedAt).toLocaleDateString(),
        });
      } catch (err) {
        console.error(`Failed to fetch capabilities for workspace ${workspace.name}:`, err);
        metricsMap.set(workspace.id, {
          workspaceId: workspace.id,
          capabilities: [],
          statusCounts: {
            notSpecified: 0,
            planned: 0,
            inProgress: 0,
            implemented: 0,
            deprecated: 0,
            total: 0,
          },
          completionPercentage: 0,
          blockerCount: 0,
          lastActivity: new Date(workspace.updatedAt).toLocaleDateString(),
        });
      }
    }

    setWorkspaceMetrics(metricsMap);
    setLoading(false);
  };

  // Calculate aggregate metrics across all workspaces
  const aggregateMetrics = {
    totalWorkspaces: allWorkspaces.length,
    totalCapabilities: Array.from(workspaceMetrics.values()).reduce((sum, m) => sum + m.statusCounts.total, 0),
    totalImplemented: Array.from(workspaceMetrics.values()).reduce((sum, m) => sum + m.statusCounts.implemented, 0),
    totalInProgress: Array.from(workspaceMetrics.values()).reduce((sum, m) => sum + m.statusCounts.inProgress, 0),
    totalPlanned: Array.from(workspaceMetrics.values()).reduce((sum, m) => sum + m.statusCounts.planned, 0),
    totalBlockers: Array.from(workspaceMetrics.values()).reduce((sum, m) => sum + m.blockerCount, 0),
    averageCompletion: allWorkspaces.length > 0
      ? Math.round(Array.from(workspaceMetrics.values()).reduce((sum, m) => sum + m.completionPercentage, 0) / workspaceMetrics.size)
      : 0,
  };

  // Generate cross-workspace recent activity
  const getCrossWorkspaceActivity = () => {
    const activities: { id: string; workspace: string; type: string; message: string; time: string; color: string }[] = [];

    allWorkspaces.forEach(workspace => {
      const metrics = workspaceMetrics.get(workspace.id);
      if (!metrics) return;

      // Add implemented capabilities
      if (metrics.statusCounts.implemented > 0) {
        activities.push({
          id: `${workspace.id}-impl`,
          workspace: workspace.name,
          type: 'success',
          message: `✅ ${metrics.statusCounts.implemented} capabilities implemented`,
          time: metrics.lastActivity,
          color: 'var(--color-systemGreen)',
        });
      }

      // Add in-progress items
      if (metrics.statusCounts.inProgress > 0) {
        activities.push({
          id: `${workspace.id}-progress`,
          workspace: workspace.name,
          type: 'info',
          message: `⚙️ ${metrics.statusCounts.inProgress} capabilities in progress`,
          time: metrics.lastActivity,
          color: 'var(--color-systemYellow)',
        });
      }

      // Add blockers
      if (metrics.blockerCount > 0) {
        activities.push({
          id: `${workspace.id}-blockers`,
          workspace: workspace.name,
          type: 'warning',
          message: `⚠️ ${metrics.blockerCount} items need attention`,
          time: metrics.lastActivity,
          color: 'var(--color-systemOrange)',
        });
      }
    });

    return activities.slice(0, 8); // Return max 8 activities
  };

  const crossWorkspaceActivities = getCrossWorkspaceActivity();

  const handleOpenWorkspace = (workspace: Workspace) => {
    const isJoinedWorkspace = joinedWorkspaces.some(w => w.id === workspace.id);
    switchWorkspace(workspace.id, isJoinedWorkspace);
    navigate('/workspace-overview');
  };

  const getWorkspaceTypeLabel = (workspaceType?: string) => {
    switch (workspaceType) {
      case 'new': return 'New Application';
      case 'refactor': return 'Refactor';
      case 'enhance': return 'Enhancement';
      case 'reverse-engineer': return 'Reverse Engineer';
      default: return 'Unknown';
    }
  };

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--spacing-6, 24px)' }}>
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Dashboard</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>Overview of all your workspaces and projects.</p>
      </div>

      {/* Aggregate Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            {aggregateMetrics.totalWorkspaces}
          </div>
          <div className="text-footnote text-secondary">Total Workspaces</div>
        </Card>

        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-systemBlue)' }}>
            {aggregateMetrics.totalCapabilities}
          </div>
          <div className="text-footnote text-secondary">Total Capabilities</div>
        </Card>

        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-systemGreen)' }}>
            {aggregateMetrics.averageCompletion}%
          </div>
          <div className="text-footnote text-secondary">Avg Completion</div>
        </Card>

        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: aggregateMetrics.totalBlockers > 0 ? 'var(--color-systemOrange)' : 'var(--color-systemGreen)' }}>
            {aggregateMetrics.totalBlockers}
          </div>
          <div className="text-footnote text-secondary">Total Blockers</div>
        </Card>
      </div>

      {/* Workspaces Grid */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="text-title2" style={{ margin: 0 }}>Your Workspaces</h3>
          <Button variant="primary" onClick={() => navigate('/workspaces')}>
            + New Workspace
          </Button>
        </div>

        {loading ? (
          <Card style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-body text-secondary">Loading workspace metrics...</p>
          </Card>
        ) : allWorkspaces.length === 0 ? (
          <Card style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
              No workspaces found. Create your first workspace to get started.
            </p>
            <Button variant="primary" onClick={() => navigate('/workspaces')}>
              Create Workspace
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
            {allWorkspaces.map(workspace => {
              const metrics = workspaceMetrics.get(workspace.id);
              const isJoined = joinedWorkspaces.some(w => w.id === workspace.id);

              const isActive = currentWorkspace?.id === workspace.id;

              return (
                <Card
                  key={workspace.id}
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    border: isActive ? '2px solid var(--color-primary)' : undefined,
                    backgroundColor: isActive ? 'rgba(0, 122, 255, 0.05)' : undefined,
                    boxShadow: isActive ? '0 2px 8px rgba(0, 122, 255, 0.15)' : undefined,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    if (isActive) {
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 122, 255, 0.25)';
                    } else {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (isActive) {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.15)';
                    } else {
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  onClick={() => handleOpenWorkspace(workspace)}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h4 className="text-title3" style={{ margin: 0, color: 'var(--color-label)' }}>
                        {workspace.name}
                        {isJoined && <span style={{ marginLeft: '8px', fontSize: '12px' }}>👥</span>}
                      </h4>
                      {isActive && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                          fontWeight: 600,
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-footnote text-secondary" style={{ margin: '4px 0 0 0' }}>
                      {getWorkspaceTypeLabel(workspace.workspaceType)}
                    </p>
                  </div>

                  {metrics ? (
                    <>
                      {/* Progress Bar */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: 'var(--color-tertiarySystemFill)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${metrics.completionPercentage}%`,
                            height: '100%',
                            backgroundColor: 'var(--color-systemGreen)',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <p className="text-caption2 text-secondary" style={{ marginTop: '4px' }}>
                          {metrics.completionPercentage}% Complete
                        </p>
                      </div>

                      {/* Metrics Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-systemGreen)' }}>
                            {metrics.statusCounts.implemented}
                          </div>
                          <div className="text-caption2 text-secondary">Done</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-systemYellow)' }}>
                            {metrics.statusCounts.inProgress}
                          </div>
                          <div className="text-caption2 text-secondary">In Progress</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: metrics.blockerCount > 0 ? 'var(--color-systemOrange)' : 'var(--color-systemGray)' }}>
                            {metrics.blockerCount}
                          </div>
                          <div className="text-caption2 text-secondary">Blockers</div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-separator)' }}>
                        <span className="text-caption2 text-secondary">
                          Last updated: {metrics.lastActivity}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!isActive && (
                            <Button
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                const isJoinedWorkspace = joinedWorkspaces.some(w => w.id === workspace.id);
                                switchWorkspace(workspace.id, isJoinedWorkspace);
                              }}
                              style={{ fontSize: '12px', padding: '4px 12px' }}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center' }}>
                      <p className="text-caption2 text-secondary">Loading metrics...</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cross-Workspace Recent Activity */}
      {crossWorkspaceActivities.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Card>
            <h3 className="text-title2" style={{ marginBottom: '16px' }}>📊 Recent Activity Across Workspaces</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {crossWorkspaceActivities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-secondarySystemFill)',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${activity.color}`,
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-tertiarySystemFill)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-secondarySystemFill)';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p className="text-footnote text-secondary" style={{ margin: '0 0 4px 0' }}>
                      {activity.workspace}
                    </p>
                    <p className="text-body" style={{ margin: 0, color: 'var(--color-label)' }}>
                      {activity.message}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                    <span className="text-footnote text-secondary">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div style={{ marginTop: '24px' }}>
        <h3 className="text-title2" style={{ marginBottom: '16px' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <Button variant="primary" onClick={() => navigate('/workspaces')}>
            + Create Workspace
          </Button>
          <Button variant="secondary" onClick={() => navigate('/integrations')}>
            🔌 Integrations
          </Button>
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            ⚙️ Settings
          </Button>
          {user?.role === 'admin' && (
            <Button variant="secondary" onClick={() => navigate('/admin')}>
              ◈ Admin Panel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
