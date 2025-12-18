import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../components';
import { useWorkspace } from '../context/WorkspaceContext';
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

export const WorkspaceOverview: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState<FileCapability[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      fetchCapabilities();
    }
  }, [currentWorkspace?.id]);

  const fetchCapabilities = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setLoading(true);
    try {
      const response = await fetch(`${INTEGRATION_URL}/capability-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });
      const data = await response.json();
      if (data.capabilities) {
        setCapabilities(data.capabilities);
      }
    } catch (err) {
      console.error('Failed to fetch capabilities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const statusCounts = {
    notSpecified: capabilities.filter(c => !c.status || c.status.trim() === '').length,
    planned: capabilities.filter(c => c.status?.toLowerCase() === 'planned').length,
    inProgress: capabilities.filter(c => c.status?.toLowerCase() === 'in progress' || c.status?.toLowerCase() === 'in_progress').length,
    implemented: capabilities.filter(c => c.status?.toLowerCase() === 'implemented').length,
    deprecated: capabilities.filter(c => c.status?.toLowerCase() === 'deprecated').length,
    total: capabilities.length,
  };

  const completionPercentage = statusCounts.total > 0
    ? Math.round((statusCounts.implemented / statusCounts.total) * 100)
    : 0;

  // Detect blockers
  const blockers = {
    notSpecified: statusCounts.notSpecified,
    stuckInProgress: capabilities.filter(c => c.status?.toLowerCase() === 'in progress').length, // Simplified for now
    missingSpecs: capabilities.filter(c => !c.description || c.description.trim() === '').length,
  };

  const totalBlockers = blockers.notSpecified + blockers.stuckInProgress + blockers.missingSpecs;

  // Generate recent activity from capability data
  const getRecentActivity = () => {
    const activities: { id: string; type: string; message: string; time: string; color: string }[] = [];

    // Add activities for implemented capabilities (most recent accomplishments)
    capabilities
      .filter(c => c.status?.toLowerCase() === 'implemented')
      .slice(0, 3)
      .forEach((cap, idx) => {
        activities.push({
          id: `impl-${idx}`,
          type: 'success',
          message: `✅ Implemented: ${cap.name || cap.filename}`,
          time: 'Recently',
          color: 'var(--color-systemGreen)',
        });
      });

    // Add activities for in-progress items
    capabilities
      .filter(c => c.status?.toLowerCase() === 'in progress' || c.status?.toLowerCase() === 'in_progress')
      .slice(0, 2)
      .forEach((cap, idx) => {
        activities.push({
          id: `progress-${idx}`,
          type: 'info',
          message: `⚙️ Working on: ${cap.name || cap.filename}`,
          time: 'In Progress',
          color: 'var(--color-systemYellow)',
        });
      });

    // Add activities for planned items
    capabilities
      .filter(c => c.status?.toLowerCase() === 'planned')
      .slice(0, 2)
      .forEach((cap, idx) => {
        activities.push({
          id: `planned-${idx}`,
          type: 'info',
          message: `📋 Planned: ${cap.name || cap.filename}`,
          time: 'Upcoming',
          color: 'var(--color-systemBlue)',
        });
      });

    // Add alert for not specified items if any exist
    if (blockers.notSpecified > 0) {
      activities.push({
        id: 'not-specified',
        type: 'warning',
        message: `⚠️ ${blockers.notSpecified} capabilities need status assignment`,
        time: 'Action Required',
        color: 'var(--color-systemOrange)',
      });
    }

    return activities.slice(0, 6); // Return max 6 activities
  };

  const recentActivities = getRecentActivity();

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      {/* Workspace Header */}
      {currentWorkspace && (
        <div style={{
          backgroundColor: 'var(--color-primary)',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="text-title1" style={{ margin: 0, color: 'white' }}>
                {currentWorkspace.name}
              </h2>
              <p className="text-footnote" style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.8)' }}>
                Workspace Type: {currentWorkspace.workspaceType === 'new' ? 'New Application' :
                                 currentWorkspace.workspaceType === 'refactor' ? 'Refactor' :
                                 currentWorkspace.workspaceType === 'enhance' ? 'Enhancement' : 'Reverse Engineer'}
              </p>
            </div>
            {user && (
              <div style={{ textAlign: 'right' }}>
                <p className="text-footnote" style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>
                  Welcome, {user.name}
                </p>
                <p className="text-caption2" style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.6)' }}>
                  {user.role}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Title */}
      <div style={{ marginBottom: 'var(--spacing-6, 24px)' }}>
        <h1 className="text-large-title" style={{ marginBottom: '8px' }}>Dashboard</h1>
        <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>Real-time overview of your project status and metrics.</p>
      </div>

      {/* Main Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>

        {/* Capability Status Overview */}
        <Card style={{ gridColumn: currentWorkspace ? 'span 2' : 'span 1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="text-title2" style={{ margin: 0 }}>📊 Capability Progress</h3>
            {loading && <span className="text-footnote text-secondary">Loading...</span>}
          </div>

          {statusCounts.total > 0 ? (
            <>
              {/* Progress Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'var(--color-tertiarySystemFill)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    width: `${completionPercentage}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-systemGreen)',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {completionPercentage > 10 && (
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                        {completionPercentage}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-footnote text-secondary" style={{ marginTop: '8px' }}>
                  {completionPercentage}% Complete ({statusCounts.implemented} of {statusCounts.total} capabilities)
                </p>
              </div>

              {/* Status Counts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate('/capabilities')}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemGreen)' }}>
                    {statusCounts.implemented}
                  </div>
                  <div className="text-footnote text-secondary">✅ Implemented</div>
                </div>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate('/capabilities')}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemYellow)' }}>
                    {statusCounts.inProgress}
                  </div>
                  <div className="text-footnote text-secondary">⚙️ In Progress</div>
                </div>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate('/capabilities')}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemBlue)' }}>
                    {statusCounts.planned}
                  </div>
                  <div className="text-footnote text-secondary">📋 Planned</div>
                </div>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate('/capabilities')}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-systemGray)' }}>
                    {statusCounts.notSpecified}
                  </div>
                  <div className="text-footnote text-secondary">❓ Not Specified</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="primary" onClick={() => navigate('/capabilities')}>
                  View All Capabilities
                </Button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p className="text-body text-secondary" style={{ marginBottom: '16px' }}>
                No capabilities found. {currentWorkspace ? 'Start by analyzing your specifications.' : 'Select a workspace to get started.'}
              </p>
              <Button variant="primary" onClick={() => navigate('/capabilities')}>
                Go to Capabilities
              </Button>
            </div>
          )}
        </Card>

        {/* Blockers & Alerts */}
        <Card>
          <h3 className="text-title2" style={{ marginBottom: '16px' }}>⚠️ Attention Needed</h3>

          {totalBlockers > 0 ? (
            <>
              <div style={{
                padding: '12px 16px',
                backgroundColor: totalBlockers > 5 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 204, 0, 0.1)',
                borderRadius: '8px',
                marginBottom: '16px',
                border: `1px solid ${totalBlockers > 5 ? 'var(--color-systemRed)' : 'var(--color-systemYellow)'}`,
              }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: totalBlockers > 5 ? 'var(--color-systemRed)' : 'var(--color-systemYellow)' }}>
                  {totalBlockers}
                </div>
                <div className="text-footnote" style={{ color: totalBlockers > 5 ? 'var(--color-systemRed)' : 'var(--color-systemYellow)' }}>
                  {totalBlockers === 1 ? 'Issue Detected' : 'Issues Detected'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {blockers.notSpecified > 0 && (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-secondarySystemFill)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }} onClick={() => navigate('/capabilities')}>
                    <span style={{ color: 'var(--color-systemOrange)' }}>🟡</span> {blockers.notSpecified} capabilities missing status
                  </div>
                )}
                {blockers.missingSpecs > 0 && (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-secondarySystemFill)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }} onClick={() => navigate('/capabilities')}>
                    <span style={{ color: 'var(--color-systemBlue)' }}>🔵</span> {blockers.missingSpecs} capabilities missing descriptions
                  </div>
                )}
                {blockers.stuckInProgress > 0 && (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-secondarySystemFill)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }} onClick={() => navigate('/capabilities')}>
                    <span style={{ color: 'var(--color-systemYellow)' }}>🟡</span> {blockers.stuckInProgress} in progress (review needed)
                  </div>
                )}
              </div>

              <Button variant="primary" onClick={() => navigate('/capabilities')}>
                Resolve Issues →
              </Button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
              <p className="text-body text-secondary">
                All Clear! No issues detected.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <div style={{ marginTop: '24px' }}>
        <Card>
          <h3 className="text-title2" style={{ marginBottom: '16px' }}>📊 Recent Activity</h3>

          {recentActivities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentActivities.map((activity) => (
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
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p className="text-body text-secondary">
                No recent activity. {currentWorkspace ? 'Start working on capabilities to see activity here.' : 'Select a workspace to get started.'}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions Bar */}
      <div style={{ marginTop: '24px' }}>
        <h3 className="text-title2" style={{ marginBottom: '16px' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <Button variant="primary" onClick={() => navigate('/capabilities')}>
            + New Capability
          </Button>
          <Button variant="secondary" onClick={() => navigate('/capabilities')}>
            🤖 Analyze Specs
          </Button>
          <Button variant="secondary" onClick={() => navigate('/designs')}>
            🎨 View UI Assets
          </Button>
          <Button variant="secondary" onClick={() => navigate('/ui-designer')}>
            ✨ UI Designer
          </Button>
          <Button variant="secondary" onClick={() => navigate('/storyboard')}>
            📋 Storyboard
          </Button>
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            ⚙️ Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
