import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useWorkspace } from '../context/WorkspaceContext';
import { PageLayout } from '../components';
import { INTEGRATION_URL } from '../api/client';

interface CategorizedChange {
  id: string;
  category: string;
  severity: string;
  description: string;
  affectedFiles: string[];
  codeSnippet?: string;
  originalBehavior?: string;
  newBehavior?: string;
}

interface SpecificationUpdate {
  changeId: string;
  targetType: string;
  targetId: string;
  targetName: string;
  section: string;
  action: string;
  currentText?: string;
  proposedText: string;
  rationale: string;
  approved?: boolean;
}

interface PromptImprovement {
  changeId: string;
  issue: string;
  suggestedAddition: string;
  category: string;
}

interface NewRequirement {
  changeId: string;
  type: string;
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  targetEnabler: string;
}

interface Warning {
  type: string;
  message: string;
  recommendation: string;
}

interface AnalysisResult {
  summary: string;
  totalChanges: number;
  categorizedChanges: CategorizedChange[];
  specificationUpdates: SpecificationUpdate[];
  promptImprovements: PromptImprovement[];
  newRequirements: NewRequirement[];
  warnings: Warning[];
  confidence: number;
  needsHumanReview: string[];
}

// Session storage key for analysis results
const getStorageKey = (workspaceId: string) => `syncCode2Spec_analysis_${workspaceId}`;
const getAppliedStorageKey = (workspaceId: string) => `syncCode2Spec_applied_${workspaceId}`;

export const SyncCode2Spec: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [codeFiles, setCodeFiles] = useState<string[]>([]);
  const [codeContent, setCodeContent] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'changes' | 'updates' | 'improvements' | 'requirements'>('changes');
  const [applyingUpdates, setApplyingUpdates] = useState<Set<string>>(new Set());
  const [appliedUpdates, setAppliedUpdates] = useState<Set<string>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load cached analysis from sessionStorage on mount
  useEffect(() => {
    if (currentWorkspace?.id) {
      const cached = sessionStorage.getItem(getStorageKey(currentWorkspace.id));
      if (cached) {
        try {
          setAnalysis(JSON.parse(cached));
        } catch (e) {
          console.error('Failed to parse cached analysis:', e);
        }
      }
      const appliedCached = sessionStorage.getItem(getAppliedStorageKey(currentWorkspace.id));
      if (appliedCached) {
        try {
          setAppliedUpdates(new Set(JSON.parse(appliedCached)));
        } catch (e) {
          console.error('Failed to parse cached applied updates:', e);
        }
      }
    }
  }, [currentWorkspace?.id]);

  // Save analysis to sessionStorage when it changes
  useEffect(() => {
    if (currentWorkspace?.id && analysis) {
      sessionStorage.setItem(getStorageKey(currentWorkspace.id), JSON.stringify(analysis));
    }
  }, [analysis, currentWorkspace?.id]);

  // Save applied updates to sessionStorage when they change
  useEffect(() => {
    if (currentWorkspace?.id && appliedUpdates.size > 0) {
      sessionStorage.setItem(getAppliedStorageKey(currentWorkspace.id), JSON.stringify([...appliedUpdates]));
    }
  }, [appliedUpdates, currentWorkspace?.id]);

  const fetchCodeFiles = async () => {
    if (!currentWorkspace?.projectFolder) return;

    setIsFetchingCode(true);
    setError(null);

    try {
      const response = await fetch(`${INTEGRATION_URL}/get-code-diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          codeFolder: 'code',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCodeFiles(data.files || []);
        setCodeContent(data.diff || '');
      } else {
        setError(data.error || 'Failed to fetch code files');
      }
    } catch (err) {
      setError(`Failed to fetch code files: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsFetchingCode(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace?.projectFolder) {
      fetchCodeFiles();
    }
  }, [currentWorkspace?.projectFolder]);

  const handleAnalyze = async () => {
    if (!currentWorkspace?.projectFolder) {
      setError('No workspace selected');
      return;
    }

    const anthropicKey = localStorage.getItem('anthropic_api_key') || '';
    if (!anthropicKey) {
      setError('Please add your Anthropic API key in the Settings page.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    // Clear applied updates when re-analyzing
    setAppliedUpdates(new Set());
    if (currentWorkspace?.id) {
      sessionStorage.removeItem(getAppliedStorageKey(currentWorkspace.id));
    }

    try {
      const response = await fetch(`${INTEGRATION_URL}/sync-code-to-spec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          codeChanges: codeContent,
          fileList: codeFiles,
          anthropicKey,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysis(null);
    setAppliedUpdates(new Set());
    if (currentWorkspace?.id) {
      sessionStorage.removeItem(getStorageKey(currentWorkspace.id));
      sessionStorage.removeItem(getAppliedStorageKey(currentWorkspace.id));
    }
  };

  const handleApplyUpdate = async (update: SpecificationUpdate, index: number) => {
    if (!currentWorkspace?.projectFolder) return;

    const updateKey = `update-${update.targetId}-${index}`;
    setApplyingUpdates(prev => new Set(prev).add(updateKey));
    setError(null);

    try {
      const response = await fetch(`${INTEGRATION_URL}/apply-spec-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          targetType: update.targetType,
          targetId: update.targetId,
          targetName: update.targetName,
          section: update.section,
          action: update.action,
          currentText: update.currentText,
          proposedText: update.proposedText,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAppliedUpdates(prev => new Set(prev).add(updateKey));
      } else {
        setError(`Failed to apply update to ${update.targetName || update.targetId}: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Failed to apply update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setApplyingUpdates(prev => {
        const next = new Set(prev);
        next.delete(updateKey);
        return next;
      });
    }
  };

  // Generate a proper enabler markdown file from a new requirement
  const generateEnablerMarkdown = (req: NewRequirement): string => {
    const acceptanceCriteriaList = req.acceptanceCriteria
      .map(ac => `- [ ] ${ac}`)
      .join('\n');

    return `# ${req.title}

## Metadata
- **ID**: ${req.id}
- **Type**: ${req.type === 'FR' ? 'Functional Requirement' : 'Non-Functional Requirement'}
- **Status**: Draft
- **Priority**: Medium
- **Approval**: Pending

## Purpose
${req.description}

## Requirements

### ${req.id}: ${req.title}
${req.description}

## Acceptance Criteria
${acceptanceCriteriaList}

## Technical Specifications (Template)
[To be defined during Design phase]

## Dependencies
- Target Enabler: ${req.targetEnabler}

## Approval History
| Date | Stage | Decision | By | Feedback |
|------|-------|----------|-----|----------|
| ${new Date().toISOString().split('T')[0]} | Created | Draft | System | Created from SyncCode2Spec analysis |
`;
  };

  const handleApplyRequirement = async (req: NewRequirement, index: number) => {
    if (!currentWorkspace?.projectFolder) return;

    const reqKey = `req-${req.id}-${index}`;
    setApplyingUpdates(prev => new Set(prev).add(reqKey));
    setError(null);

    try {
      // Generate filename from requirement ID
      const filename = `${req.id}.md`;
      const content = generateEnablerMarkdown(req);

      const response = await fetch(`${INTEGRATION_URL}/apply-spec-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          targetType: req.type === 'FR' ? 'requirement' : 'requirement',
          targetId: filename,
          targetName: req.title,
          section: 'full',
          action: 'create',
          proposedText: content,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAppliedUpdates(prev => new Set(prev).add(reqKey));
      } else {
        setError(`Failed to create requirement ${req.id}: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Failed to create requirement: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setApplyingUpdates(prev => {
        const next = new Set(prev);
        next.delete(reqKey);
        return next;
      });
    }
  };

  const handleCopyText = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }, []);

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      bug_fix: '#ef4444',
      missing_requirement: '#f59e0b',
      edge_case: '#3b82f6',
      performance: '#10b981',
      refactor: '#8b5cf6',
      new_feature: '#06b6d4',
      security: '#dc2626',
      error_handling: '#f97316',
    };
    return colors[category] || '#6b7280';
  };

  const getSeverityBadge = (severity: string): string => {
    const badges: Record<string, string> = {
      critical: 'bg-red-600',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500',
    };
    return badges[severity] || 'bg-gray-500';
  };

  return (
    <PageLayout
      title="Sync Code to Spec"
      quickDescription="Reverse-engineer manual code changes back into specifications."
      detailedDescription="This page analyzes manual code changes made outside the IntentR workflow and proposes updates to your enabler and capability specifications. This ensures your specifications remain the source of truth, aligned with the INTENT Framework's Reverse-to-Design activity."
      className="page-container"
    >
      {!currentWorkspace ? (
        <Card>
          <p className="text-gray-500">Please select a workspace to use this feature.</p>
        </Card>
      ) : (
        <>
          {/* Code Files Overview */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Code Files</h3>
                <p className="text-sm text-gray-500">
                  {codeFiles.length} files found in the code folder
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={fetchCodeFiles}
                  disabled={isFetchingCode}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  {isFetchingCode ? 'Refreshing...' : 'Refresh Files'}
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={isLoading || codeFiles.length === 0}
                >
                  {isLoading ? 'Analyzing...' : 'Analyze Changes'}
                </Button>
                {analysis && (
                  <Button
                    onClick={clearAnalysis}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Clear Analysis
                  </Button>
                )}
              </div>
            </div>

            {codeFiles.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded p-3">
                <div className="flex flex-wrap gap-2">
                  {codeFiles.map((file, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-500">
              <p className="text-red-500">{error}</p>
            </Card>
          )}

          {/* Analysis Results */}
          {analysis && (
            <>
              {/* Summary Card */}
              <Card className="mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Analysis Summary</h3>
                    <p className="text-gray-600 dark:text-gray-300">{analysis.summary}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{analysis.totalChanges}</div>
                    <div className="text-sm text-gray-500">Changes Found</div>
                    <div className="mt-2">
                      <span className="text-sm">Confidence: </span>
                      <span className={`font-semibold ${analysis.confidence >= 0.8 ? 'text-green-600' : analysis.confidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Math.round(analysis.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {analysis.warnings && analysis.warnings.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings</h4>
                    {analysis.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">
                        <strong>{warning.type}:</strong> {warning.message}
                        {warning.recommendation && (
                          <span className="block text-xs mt-1">Recommendation: {warning.recommendation}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Needs Human Review */}
                {analysis.needsHumanReview && analysis.needsHumanReview.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Requires Human Review</h4>
                    <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300">
                      {analysis.needsHumanReview.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              {/* Tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { id: 'changes', label: 'Changes', count: analysis.categorizedChanges?.length || 0 },
                  { id: 'updates', label: 'Spec Updates', count: analysis.specificationUpdates?.length || 0 },
                  { id: 'improvements', label: 'Prompt Improvements', count: analysis.promptImprovements?.length || 0 },
                  { id: 'requirements', label: 'New Requirements', count: analysis.newRequirements?.length || 0 },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <Card>
                {activeTab === 'changes' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Categorized Changes</h3>
                    {!analysis.categorizedChanges || analysis.categorizedChanges.length === 0 ? (
                      <p className="text-gray-500">No changes identified.</p>
                    ) : (
                      analysis.categorizedChanges.map((change, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg dark:border-gray-700"
                          style={{ borderLeftColor: getCategoryColor(change.category), borderLeftWidth: '4px' }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-gray-500">{change.id}</span>
                            <span
                              className="px-2 py-0.5 rounded text-xs text-white"
                              style={{ backgroundColor: getCategoryColor(change.category) }}
                            >
                              {change.category.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs text-white ${getSeverityBadge(change.severity)}`}>
                              {change.severity}
                            </span>
                          </div>
                          <p className="mb-2">{change.description}</p>
                          <div className="text-sm text-gray-500">
                            <strong>Files:</strong> {change.affectedFiles?.join(', ') || 'N/A'}
                          </div>
                          {change.codeSnippet && (
                            <pre className="mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                              {change.codeSnippet}
                            </pre>
                          )}
                          {(change.originalBehavior || change.newBehavior) && (
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              {change.originalBehavior && (
                                <div>
                                  <strong className="text-red-500">Before:</strong> {change.originalBehavior}
                                </div>
                              )}
                              {change.newBehavior && (
                                <div>
                                  <strong className="text-green-500">After:</strong> {change.newBehavior}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'updates' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Proposed Specification Updates</h3>
                    {!analysis.specificationUpdates || analysis.specificationUpdates.length === 0 ? (
                      <p className="text-gray-500">No specification updates proposed.</p>
                    ) : (
                      analysis.specificationUpdates.map((update, index) => {
                        const updateKey = `update-${update.targetId}-${index}`;
                        const isApplying = applyingUpdates.has(updateKey);
                        const isApplied = appliedUpdates.has(updateKey);

                        return (
                          <div key={index} className="p-4 border rounded-lg dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-xs bg-purple-600 text-white">
                                  {update.targetType}
                                </span>
                                <span className="font-mono text-sm">{update.targetId}</span>
                                <span className="text-gray-500">- {update.targetName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  update.action === 'add' || update.action === 'create' ? 'bg-green-600' :
                                  update.action === 'modify' ? 'bg-yellow-600' : 'bg-red-600'
                                } text-white`}>
                                  {update.action}
                                </span>
                                <Button
                                  onClick={() => handleApplyUpdate(update, index)}
                                  disabled={isApplying || isApplied}
                                  className={`text-xs px-3 py-1 ${isApplied ? 'bg-green-600' : ''}`}
                                >
                                  {isApplied ? 'Applied' : isApplying ? 'Applying...' : 'Apply'}
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 mb-2">
                              Section: <strong>{update.section}</strong>
                            </div>
                            {update.currentText && (
                              <div className="mb-2">
                                <div className="text-xs text-gray-500 mb-1">Current:</div>
                                <pre className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap break-words">
                                  {update.currentText}
                                </pre>
                              </div>
                            )}
                            <div className="mb-2">
                              <div className="text-xs text-gray-500 mb-1">Proposed:</div>
                              <pre className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300 overflow-x-auto whitespace-pre-wrap break-words max-h-96">
                                {update.proposedText}
                              </pre>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Rationale:</strong> {update.rationale}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {activeTab === 'improvements' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Prompt Improvement Suggestions</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      These suggestions can be added to your code generation prompts to avoid similar manual fixes in the future.
                    </p>
                    {!analysis.promptImprovements || analysis.promptImprovements.length === 0 ? (
                      <p className="text-gray-500">No prompt improvements suggested.</p>
                    ) : (
                      analysis.promptImprovements.map((improvement, index) => (
                        <div key={index} className="p-4 border rounded-lg dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-gray-500">{improvement.changeId}</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-cyan-600 text-white">
                              {improvement.category}
                            </span>
                          </div>
                          <div className="mb-3">
                            <strong className="text-red-500">Issue:</strong> {improvement.issue}
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <strong className="text-green-500">Suggested Addition:</strong>
                              <Button
                                onClick={() => handleCopyText(improvement.suggestedAddition, index)}
                                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700"
                              >
                                {copiedIndex === index ? 'Copied!' : 'Copy Text'}
                              </Button>
                            </div>
                            <textarea
                              readOnly
                              value={improvement.suggestedAddition}
                              className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono border border-gray-300 dark:border-gray-600 resize-y"
                              style={{ minHeight: '120px', maxHeight: '300px' }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'requirements' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">New Requirements to Add</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      These new requirements were identified from code changes. Click Apply to create specification files in the definition folder.
                    </p>
                    {!analysis.newRequirements || analysis.newRequirements.length === 0 ? (
                      <p className="text-gray-500">No new requirements identified.</p>
                    ) : (
                      analysis.newRequirements.map((req, index) => {
                        const reqKey = `req-${req.id}-${index}`;
                        const isApplying = applyingUpdates.has(reqKey);
                        const isApplied = appliedUpdates.has(reqKey);

                        return (
                          <div key={index} className="p-4 border rounded-lg dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  req.type === 'FR' ? 'bg-blue-600' : 'bg-purple-600'
                                } text-white`}>
                                  {req.type}
                                </span>
                                <span className="font-mono text-sm">{req.id}</span>
                                <span className="font-medium">{req.title}</span>
                              </div>
                              <Button
                                onClick={() => handleApplyRequirement(req, index)}
                                disabled={isApplying || isApplied}
                                className={`text-xs px-3 py-1 ${isApplied ? 'bg-green-600' : ''}`}
                              >
                                {isApplied ? 'Applied' : isApplying ? 'Creating...' : 'Apply'}
                              </Button>
                            </div>
                            <p className="mb-2 text-gray-600 dark:text-gray-300">{req.description}</p>
                            <div className="text-sm text-gray-500 mb-2">
                              <strong>Target Enabler:</strong> {req.targetEnabler}
                            </div>
                            <div>
                              <strong className="text-sm">Acceptance Criteria:</strong>
                              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {req.acceptanceCriteria?.map((criteria, idx) => (
                                  <li key={idx}>{criteria}</li>
                                )) || <li>No acceptance criteria defined</li>}
                              </ul>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </PageLayout>
  );
};
