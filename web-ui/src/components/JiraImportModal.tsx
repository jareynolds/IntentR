import React, { useState, useEffect } from 'react';
import { Button, Alert } from './index';
import { INTEGRATION_URL } from '../api/client';

interface JiraEpic {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
  priority: string;
  labels: string[];
  created: string;
  updated: string;
  url: string;
  issue_type: string;
  metadata: Record<string, unknown>;
}

interface JiraImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectKey: string;
  projectName: string;
  credentials: Record<string, string>;
  workspacePath: string;
  onImportComplete: (importedCount: number) => void;
}

interface ImportResult {
  imported: Array<{
    jira_key: string;
    capability_id: string;
    filename: string;
  }>;
  errors: Array<{
    jira_key: string;
    error: string;
  }>;
  total_imported: number;
  total_errors: number;
}

export const JiraImportModal: React.FC<JiraImportModalProps> = ({
  isOpen,
  onClose,
  projectKey,
  projectName,
  credentials,
  workspacePath,
  onImportComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [epics, setEpics] = useState<JiraEpic[]>([]);
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'loading' | 'select' | 'importing' | 'complete'>('loading');

  useEffect(() => {
    if (isOpen && projectKey) {
      fetchEpics();
    }
  }, [isOpen, projectKey]);

  const fetchEpics = async () => {
    setLoading(true);
    setError(null);
    setStep('loading');

    try {
      const response = await fetch(`${INTEGRATION_URL}/fetch-jira-epics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: projectKey,
          credentials,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch epics');
      }

      const data = await response.json();
      setEpics(data.epics || []);
      setStep('select');

      // Select all by default
      setSelectedEpics(new Set(data.epics?.map((e: JiraEpic) => e.key) || []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch epics');
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEpic = (epicKey: string) => {
    const newSelected = new Set(selectedEpics);
    if (newSelected.has(epicKey)) {
      newSelected.delete(epicKey);
    } else {
      newSelected.add(epicKey);
    }
    setSelectedEpics(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEpics.size === epics.length) {
      setSelectedEpics(new Set());
    } else {
      setSelectedEpics(new Set(epics.map(e => e.key)));
    }
  };

  const handleImport = async () => {
    if (selectedEpics.size === 0) {
      setError('Please select at least one epic to import');
      return;
    }

    setImporting(true);
    setError(null);
    setStep('importing');

    try {
      const epicsToImport = epics.filter(e => selectedEpics.has(e.key));

      const response = await fetch(`${INTEGRATION_URL}/import-jira-epics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_path: workspacePath,
          project_key: projectKey,
          epics: epicsToImport,
          credentials,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to import epics');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep('complete');

      if (result.total_imported > 0) {
        onImportComplete(result.total_imported);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import epics');
      setStep('select');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setEpics([]);
    setSelectedEpics(new Set());
    setError(null);
    setImportResult(null);
    setStep('loading');
    onClose();
  };

  if (!isOpen) return null;

  return (
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
      zIndex: 1001,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-grey-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 className="text-title2" style={{ margin: 0 }}>
              Import Jira Epics as Capabilities
            </h2>
            <p className="text-footnote text-secondary" style={{ margin: '4px 0 0 0' }}>
              Project: {projectName} ({projectKey})
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--color-grey-500)',
              padding: '4px',
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}>
          {error && (
            <Alert type="error" style={{ marginBottom: '16px' }}>
              {error}
            </Alert>
          )}

          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid var(--color-grey-200)',
                borderTop: '4px solid var(--color-blue-500)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }} />
              <p className="text-body">Loading Epics from Jira...</p>
              <p className="text-footnote text-secondary">
                Searching for Epics and Sagas in {projectKey}
              </p>
            </div>
          )}

          {step === 'select' && (
            <>
              {epics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p className="text-body" style={{ color: 'var(--color-grey-500)' }}>
                    No Epics found in this project.
                  </p>
                  <p className="text-footnote text-secondary" style={{ marginTop: '8px' }}>
                    Make sure your project has Epic issue types configured.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}>
                    <p className="text-body">
                      Found <strong>{epics.length}</strong> Epic{epics.length !== 1 ? 's' : ''}
                    </p>
                    <Button variant="outline" onClick={handleSelectAll}>
                      {selectedEpics.size === epics.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div style={{
                    border: '1px solid var(--color-grey-200)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}>
                    {epics.map((epic, index) => (
                      <div
                        key={epic.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '16px',
                          backgroundColor: index % 2 === 0 ? 'white' : 'var(--color-grey-50)',
                          borderBottom: index < epics.length - 1 ? '1px solid var(--color-grey-200)' : 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleToggleEpic(epic.key)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEpics.has(epic.key)}
                          onChange={() => handleToggleEpic(epic.key)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            marginTop: '2px',
                            cursor: 'pointer',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              padding: '2px 6px',
                              backgroundColor: 'var(--color-purple-100)',
                              color: 'var(--color-purple-700)',
                              borderRadius: '4px',
                            }}>
                              {epic.key}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              backgroundColor: epic.status.toLowerCase().includes('done')
                                ? 'var(--color-green-100)'
                                : epic.status.toLowerCase().includes('progress')
                                  ? 'var(--color-blue-100)'
                                  : 'var(--color-grey-100)',
                              color: epic.status.toLowerCase().includes('done')
                                ? 'var(--color-green-700)'
                                : epic.status.toLowerCase().includes('progress')
                                  ? 'var(--color-blue-700)'
                                  : 'var(--color-grey-700)',
                              borderRadius: '4px',
                            }}>
                              {epic.status}
                            </span>
                            {epic.issue_type && epic.issue_type !== 'Epic' && (
                              <span style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                backgroundColor: 'var(--color-orange-100)',
                                color: 'var(--color-orange-700)',
                                borderRadius: '4px',
                              }}>
                                {epic.issue_type}
                              </span>
                            )}
                          </div>
                          <p className="text-body" style={{ margin: 0, fontWeight: 500 }}>
                            {epic.summary}
                          </p>
                          {epic.description && (
                            <p className="text-footnote text-secondary" style={{
                              margin: '4px 0 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {epic.description}
                            </p>
                          )}
                          {epic.labels && epic.labels.length > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {epic.labels.map((label) => (
                                <span key={label} style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  backgroundColor: 'var(--color-grey-100)',
                                  color: 'var(--color-grey-600)',
                                  borderRadius: '4px',
                                }}>
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <a
                          href={epic.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: 'var(--color-blue-500)',
                            fontSize: '12px',
                          }}
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid var(--color-grey-200)',
                borderTop: '4px solid var(--color-green-500)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }} />
              <p className="text-body">Importing {selectedEpics.size} Epic{selectedEpics.size !== 1 ? 's' : ''} as Capabilities...</p>
              <p className="text-footnote text-secondary">
                Creating specification files in {workspacePath}/specifications/
              </p>
            </div>
          )}

          {step === 'complete' && importResult && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              {importResult.total_imported > 0 && (
                <Alert type="success" style={{ marginBottom: '20px', textAlign: 'left' }}>
                  <strong>Successfully imported {importResult.total_imported} Capability file{importResult.total_imported !== 1 ? 's' : ''}!</strong>
                </Alert>
              )}

              {importResult.total_errors > 0 && (
                <Alert type="warning" style={{ marginBottom: '20px', textAlign: 'left' }}>
                  <strong>{importResult.total_errors} Epic{importResult.total_errors !== 1 ? 's' : ''} could not be imported:</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>
                        <strong>{err.jira_key}:</strong> {err.error}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {importResult.imported.length > 0 && (
                <div style={{
                  border: '1px solid var(--color-grey-200)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  textAlign: 'left',
                }}>
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-grey-50)',
                    borderBottom: '1px solid var(--color-grey-200)',
                    fontWeight: 600,
                  }}>
                    Imported Capabilities
                  </div>
                  {importResult.imported.map((item, index) => (
                    <div
                      key={item.jira_key}
                      style={{
                        padding: '12px 16px',
                        borderBottom: index < importResult.imported.length - 1 ? '1px solid var(--color-grey-200)' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          padding: '2px 6px',
                          backgroundColor: 'var(--color-purple-100)',
                          color: 'var(--color-purple-700)',
                          borderRadius: '4px',
                          marginRight: '8px',
                        }}>
                          {item.jira_key}
                        </span>
                        <span style={{ color: 'var(--color-grey-500)' }}>&rarr;</span>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          padding: '2px 6px',
                          backgroundColor: 'var(--color-green-100)',
                          color: 'var(--color-green-700)',
                          borderRadius: '4px',
                          marginLeft: '8px',
                        }}>
                          {item.capability_id}
                        </span>
                      </div>
                      <code style={{
                        fontSize: '11px',
                        backgroundColor: 'var(--color-grey-100)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>
                        {item.filename}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-grey-200)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={selectedEpics.size === 0 || loading}
              >
                Import {selectedEpics.size} Epic{selectedEpics.size !== 1 ? 's' : ''} as Capabilities
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button variant="primary" onClick={handleClose}>
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
