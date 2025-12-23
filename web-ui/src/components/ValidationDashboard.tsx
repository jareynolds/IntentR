import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'storyboard-capability' | 'capability-enabler' | 'vision-alignment' | 'requirement-coverage';
  title: string;
  description: string;
  affectedItem: string;
  navigateTo: string;
}

interface IntegrityScore {
  category: string;
  label: string;
  score: number;
  total: number;
  icon: string;
}

interface TrendDataPoint {
  date: string;
  score: number;
}

interface ValidationData {
  overallScore: number;
  scores: IntegrityScore[];
  issues: ValidationIssue[];
  trends: TrendDataPoint[];
}

export const ValidationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [validationData, setValidationData] = useState<ValidationData>({
    overallScore: 0,
    scores: [],
    issues: [],
    trends: [],
  });

  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      loadValidationData();
    }
  }, [currentWorkspace?.projectFolder]);

  const loadValidationData = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setLoading(true);
    try {
      // Fetch storyboards, capabilities, and enablers
      const [storyRes, capRes, enbRes] = await Promise.all([
        fetch(`${INTEGRATION_URL}/story-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
        }),
        fetch(`${INTEGRATION_URL}/capability-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
        }),
        fetch(`${INTEGRATION_URL}/enabler-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
        }),
      ]);

      const storyData = await storyRes.json();
      const capData = await capRes.json();
      const enbData = await enbRes.json();

      const stories = storyData.stories || [];
      const capabilities = capData.capabilities || [];
      const enablers = enbData.enablers || [];

      // Calculate validation scores and issues
      const { scores, issues } = calculateValidation(stories, capabilities, enablers);

      // Calculate overall score
      const overallScore = scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / scores.length)
        : 0;

      // Generate trend data (mock for now, could be persisted)
      const trends = generateTrendData(overallScore);

      setValidationData({ overallScore, scores, issues, trends });
    } catch (error) {
      console.error('Error loading validation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateValidation = (
    stories: any[],
    capabilities: any[],
    enablers: any[]
  ): { scores: IntegrityScore[]; issues: ValidationIssue[] } => {
    const issues: ValidationIssue[] = [];

    // 1. Storyboard → Capability Mapping
    const storiesWithCaps = stories.filter(s => {
      // Check if any capability references this storyboard
      return capabilities.some(c =>
        c.content?.toLowerCase().includes(s.title?.toLowerCase()) ||
        c.fields?.['Storyboard Reference']?.includes(s.id)
      );
    });

    const storyboardScore: IntegrityScore = {
      category: 'storyboard-capability',
      label: 'Storyboard → Capability',
      score: storiesWithCaps.length,
      total: Math.max(stories.length, 1),
      icon: '📖',
    };

    // Add issues for unmapped storyboards
    stories.forEach(story => {
      const hasCap = capabilities.some(c =>
        c.content?.toLowerCase().includes(story.title?.toLowerCase())
      );
      if (!hasCap && story.title) {
        issues.push({
          id: `story-orphan-${story.id}`,
          type: 'warning',
          category: 'storyboard-capability',
          title: 'Storyboard without Capability',
          description: `"${story.title}" has no linked capability`,
          affectedItem: story.title,
          navigateTo: '/storyboard',
        });
      }
    });

    // 2. Capability → Enabler Coverage
    const capsWithEnablers = capabilities.filter(c => {
      const capId = extractCapabilityId(c);
      return enablers.some(e =>
        e.content?.includes(capId) ||
        e.fields?.['Capability ID']?.includes(capId)
      );
    });

    const capabilityEnablerScore: IntegrityScore = {
      category: 'capability-enabler',
      label: 'Capability → Enabler',
      score: capsWithEnablers.length,
      total: Math.max(capabilities.length, 1),
      icon: '⚡',
    };

    // Add issues for capabilities without enablers
    capabilities.forEach(cap => {
      const capId = extractCapabilityId(cap);
      const hasEnabler = enablers.some(e =>
        e.content?.includes(capId) ||
        e.fields?.['Capability ID']?.includes(capId)
      );
      if (!hasEnabler && cap.name) {
        issues.push({
          id: `cap-no-enabler-${capId}`,
          type: 'error',
          category: 'capability-enabler',
          title: 'Capability without Enabler',
          description: `"${cap.name}" has no implementing enablers`,
          affectedItem: cap.name,
          navigateTo: '/capabilities',
        });
      }
    });

    // 3. Enabler Orphans (enablers without valid capability)
    const orphanEnablers = enablers.filter(e => {
      const capRef = e.fields?.['Capability ID'] || '';
      return !capabilities.some(c => extractCapabilityId(c) === capRef);
    });

    orphanEnablers.forEach(enabler => {
      if (enabler.name) {
        issues.push({
          id: `enabler-orphan-${enabler.filename}`,
          type: 'warning',
          category: 'capability-enabler',
          title: 'Orphan Enabler',
          description: `"${enabler.name}" references non-existent capability`,
          affectedItem: enabler.name,
          navigateTo: '/enablers',
        });
      }
    });

    const enablerOrphanScore: IntegrityScore = {
      category: 'enabler-orphan',
      label: 'Enabler Integrity',
      score: enablers.length - orphanEnablers.length,
      total: Math.max(enablers.length, 1),
      icon: '🔧',
    };

    // 4. Requirements Coverage (check if enablers have requirements)
    const enablersWithReqs = enablers.filter(e => {
      const content = e.content || '';
      return content.includes('FR-') || content.includes('NFR-') ||
        content.includes('Functional Requirements') ||
        (e.fields?.['Functional Requirements'] && e.fields['Functional Requirements'].length > 10);
    });

    const reqCoverageScore: IntegrityScore = {
      category: 'requirement-coverage',
      label: 'Requirement Coverage',
      score: enablersWithReqs.length,
      total: Math.max(enablers.length, 1),
      icon: '📋',
    };

    enablers.forEach(enabler => {
      const content = enabler.content || '';
      const hasReqs = content.includes('FR-') || content.includes('NFR-');
      if (!hasReqs && enabler.name) {
        issues.push({
          id: `enabler-no-reqs-${enabler.filename}`,
          type: 'info',
          category: 'requirement-coverage',
          title: 'Missing Requirements',
          description: `"${enabler.name}" has no defined requirements`,
          affectedItem: enabler.name,
          navigateTo: '/enablers',
        });
      }
    });

    return {
      scores: [storyboardScore, capabilityEnablerScore, enablerOrphanScore, reqCoverageScore],
      issues: issues.sort((a, b) => {
        const priority = { error: 0, warning: 1, info: 2 };
        return priority[a.type] - priority[b.type];
      }),
    };
  };

  const extractCapabilityId = (cap: any): string => {
    const idMatch = cap.content?.match(/\*\*ID\*\*:\s*(CAP-[A-Z0-9-]+)/i);
    if (idMatch) return idMatch[1].toUpperCase();

    const filenameMatch = cap.filename?.match(/(CAP-[A-Z0-9-]+)/i);
    if (filenameMatch) return filenameMatch[1].toUpperCase();

    return cap.filename || '';
  };

  const generateTrendData = (currentScore: number): TrendDataPoint[] => {
    // Generate last 7 days of trend data
    const trends: TrendDataPoint[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Simulate gradual improvement toward current score
      const variance = Math.random() * 10 - 5;
      const baseScore = currentScore - (i * 3) + variance;

      trends.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.max(0, Math.min(100, Math.round(baseScore))),
      });
    }

    // Ensure last point is current score
    trends[trends.length - 1].score = currentScore;

    return trends;
  };

  const getScoreColor = (score: number, total: number): string => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getIssueIcon = (type: string): string => {
    switch (type) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="validation-dashboard loading">
        <p>Loading validation data...</p>
      </div>
    );
  }

  const errorCount = validationData.issues.filter(i => i.type === 'error').length;
  const warningCount = validationData.issues.filter(i => i.type === 'warning').length;
  const infoCount = validationData.issues.filter(i => i.type === 'info').length;

  return (
    <div className="validation-dashboard">
      <style>{`
        .validation-dashboard {
          background: white;
          border-radius: 12px;
          border: 1px solid var(--color-grey-200);
          margin-bottom: 24px;
          overflow: hidden;
        }

        .validation-dashboard.loading {
          padding: 40px;
          text-align: center;
          color: var(--color-grey-500);
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--color-grey-100);
          background: var(--color-grey-50);
        }

        .dashboard-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dashboard-title h2 {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-grey-900);
          margin: 0;
        }

        .overall-score {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .score-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: white;
        }

        .score-label {
          font-size: 14px;
          color: var(--color-grey-600);
        }

        .issue-summary {
          display: flex;
          gap: 16px;
        }

        .issue-count {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
        }

        .issue-count.errors {
          background: #fee2e2;
          color: #dc2626;
        }

        .issue-count.warnings {
          background: #fef3c7;
          color: #d97706;
        }

        .issue-count.info {
          background: #dbeafe;
          color: #2563eb;
        }

        .dashboard-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: var(--color-grey-100);
        }

        .dashboard-section {
          background: white;
          padding: 20px 24px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-grey-700);
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .scores-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .score-card {
          background: var(--color-grey-50);
          border-radius: 8px;
          padding: 16px;
        }

        .score-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .score-card-icon {
          font-size: 20px;
        }

        .score-card-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-grey-700);
        }

        .score-bar-container {
          height: 8px;
          background: var(--color-grey-200);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .score-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .score-value {
          font-size: 12px;
          color: var(--color-grey-600);
        }

        .issues-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .issue-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: var(--color-grey-50);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .issue-item:hover {
          background: var(--color-blue-50);
          border-color: var(--color-blue-200);
        }

        .issue-icon {
          font-size: 16px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .issue-content {
          flex: 1;
          min-width: 0;
        }

        .issue-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-grey-900);
          margin-bottom: 2px;
        }

        .issue-description {
          font-size: 12px;
          color: var(--color-grey-600);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .issue-arrow {
          color: var(--color-grey-400);
          flex-shrink: 0;
        }

        .no-issues {
          text-align: center;
          padding: 32px;
          color: var(--color-grey-500);
        }

        .no-issues-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }

        .trend-chart {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 120px;
          padding-top: 20px;
        }

        .trend-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .trend-bar {
          width: 100%;
          max-width: 40px;
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease;
        }

        .trend-date {
          font-size: 10px;
          color: var(--color-grey-500);
          white-space: nowrap;
        }

        .dashboard-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--color-grey-100);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .refresh-btn {
          padding: 8px 16px;
          background: var(--color-blue-600);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .refresh-btn:hover {
          background: var(--color-blue-700);
        }

        .last-updated {
          font-size: 12px;
          color: var(--color-grey-500);
        }
      `}</style>

      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Intent → Specification Integrity</h2>
          <div className="issue-summary">
            {errorCount > 0 && (
              <span className="issue-count errors">🔴 {errorCount} errors</span>
            )}
            {warningCount > 0 && (
              <span className="issue-count warnings">🟡 {warningCount} warnings</span>
            )}
            {infoCount > 0 && (
              <span className="issue-count info">🔵 {infoCount} info</span>
            )}
          </div>
        </div>
        <div className="overall-score">
          <div className="score-label">Overall Health</div>
          <div
            className="score-circle"
            style={{
              background: validationData.overallScore >= 80 ? '#22c55e' :
                validationData.overallScore >= 60 ? '#f59e0b' : '#ef4444',
            }}
          >
            {validationData.overallScore}%
          </div>
        </div>
      </div>

      <div className="dashboard-body">
        <div className="dashboard-section">
          <h3 className="section-title">Integrity Scores</h3>
          <div className="scores-grid">
            {validationData.scores.map((score) => (
              <div key={score.category} className="score-card">
                <div className="score-card-header">
                  <span className="score-card-icon">{score.icon}</span>
                  <span className="score-card-label">{score.label}</span>
                </div>
                <div className="score-bar-container">
                  <div
                    className="score-bar"
                    style={{
                      width: `${(score.score / score.total) * 100}%`,
                      background: getScoreColor(score.score, score.total),
                    }}
                  />
                </div>
                <div className="score-value">
                  {score.score} / {score.total} ({Math.round((score.score / score.total) * 100)}%)
                </div>
              </div>
            ))}
          </div>

          <h3 className="section-title" style={{ marginTop: 24 }}>7-Day Trend</h3>
          <div className="trend-chart">
            {validationData.trends.map((point, index) => (
              <div key={index} className="trend-bar-container">
                <div
                  className="trend-bar"
                  style={{
                    height: `${point.score}%`,
                    background: point.score >= 80 ? '#22c55e' :
                      point.score >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                  title={`${point.date}: ${point.score}%`}
                />
                <span className="trend-date">{point.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h3 className="section-title">Issues & Recommendations</h3>
          {validationData.issues.length === 0 ? (
            <div className="no-issues">
              <div className="no-issues-icon">✅</div>
              <p>No issues found! Your Intent and Specification are well aligned.</p>
            </div>
          ) : (
            <div className="issues-list">
              {validationData.issues.slice(0, 10).map((issue) => (
                <div
                  key={issue.id}
                  className="issue-item"
                  onClick={() => navigate(issue.navigateTo)}
                >
                  <span className="issue-icon">{getIssueIcon(issue.type)}</span>
                  <div className="issue-content">
                    <div className="issue-title">{issue.title}</div>
                    <div className="issue-description">{issue.description}</div>
                  </div>
                  <span className="issue-arrow">→</span>
                </div>
              ))}
              {validationData.issues.length > 10 && (
                <div className="issue-item" style={{ justifyContent: 'center', cursor: 'default' }}>
                  <span style={{ color: 'var(--color-grey-500)', fontSize: 13 }}>
                    +{validationData.issues.length - 10} more issues
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-footer">
        <span className="last-updated">
          Last updated: {new Date().toLocaleTimeString()}
        </span>
        <button className="refresh-btn" onClick={loadValidationData}>
          Refresh Validation
        </button>
      </div>
    </div>
  );
};

export default ValidationDashboard;
