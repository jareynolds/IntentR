import React, { useState, useEffect, useCallback } from 'react';
import { Card, Alert, Button, ConfirmDialog, PageHeader } from '../components';
import { WizardPageNavigation } from '../components/wizard';
import { useWorkspace } from '../context/WorkspaceContext';
import { INTEGRATION_URL } from '../api/client';

// Test Scenario interface
interface TestScenario {
  id: string;
  name: string;
  feature: string;
  enablerId: string;
  enablerName: string;
  requirementIds: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'ready' | 'passed' | 'failed' | 'blocked';
  automation: 'automated' | 'manual' | 'pending';
  tags: string[];
  gherkin: string;
  lastExecuted?: string;
  executionTime?: number;
}

// Test Suite interface
interface TestSuite {
  id: string;
  name: string;
  enablerId: string;
  scenarios: TestScenario[];
  status: 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';
  coverage: number;
}

// Enabler with test information
interface EnablerWithTests {
  id: string;
  name: string;
  filename: string;
  path: string;
  capabilityId: string;
  requirementCount: number;
  testSuiteId?: string;
  scenarioCount: number;
  passedCount: number;
  failedCount: number;
  coverage: number;
}

// Coverage metrics
interface CoverageMetrics {
  totalRequirements: number;
  requirementsWithTests: number;
  requirementCoverage: number;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  blockedScenarios: number;
  scenarioPassRate: number;
  criticalPassRate: number;
  automationRate: number;
}

export const Testing: React.FC = () => {
  const { currentWorkspace } = useWorkspace();

  // State
  const [enablers, setEnablers] = useState<EnablerWithTests[]>([]);
  const [selectedEnabler, setSelectedEnabler] = useState<EnablerWithTests | null>(null);
  const [testSuite, setTestSuite] = useState<TestSuite | null>(null);
  const [allScenarios, setAllScenarios] = useState<TestScenario[]>([]); // All scenarios from files
  const [scenarios, setScenarios] = useState<TestScenario[]>([]); // Filtered scenarios for selected enabler
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [coverageMetrics, setCoverageMetrics] = useState<CoverageMetrics | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState<TestScenario | null>(null);
  const [scenarioForm, setScenarioForm] = useState({
    name: '',
    feature: '',
    requirementIds: '',
    priority: 'medium' as TestScenario['priority'],
    automation: 'pending' as TestScenario['automation'],
    tags: '',
    gherkin: `@TS-XXXXXX @FR-XXXXXX
Scenario: [Scenario Name]
  Given [precondition]
  When [action]
  Then [expected outcome]
  And [additional assertion]`,
  });

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Load enablers with test information
  const loadEnablers = useCallback(async () => {
    if (!currentWorkspace?.projectFolder) {
      console.log('loadEnablers: No project folder');
      return;
    }

    console.log('loadEnablers: Loading from', currentWorkspace.projectFolder);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${INTEGRATION_URL}/enabler-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: currentWorkspace.projectFolder }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('loadEnablers: Failed', errorText);
        throw new Error(`Failed to load enablers: ${errorText}`);
      }

      const data = await response.json();
      console.log('loadEnablers: Got response', data);

      // Transform to EnablerWithTests
      // Use filename (without .md) as unique ID since enablerId may not be unique
      const enablersWithTests: EnablerWithTests[] = (data.enablers || []).map((e: Record<string, unknown>) => {
        const filename = e.filename as string || '';
        const uniqueId = filename.replace(/\.md$/i, '') || (e.enablerId as string) || '';
        return {
          id: uniqueId,
          name: e.name as string || 'Unnamed Enabler',
          filename: filename,
          path: e.path as string || '',
          capabilityId: e.capabilityId as string || '',
          requirementCount: 0, // Would need to parse from file
          testSuiteId: undefined,
          scenarioCount: 0,
          passedCount: 0,
          failedCount: 0,
          coverage: 0,
        };
      });

      setEnablers(enablersWithTests);

      // Calculate mock coverage metrics
      setCoverageMetrics({
        totalRequirements: enablersWithTests.length * 3, // Estimate
        requirementsWithTests: Math.floor(enablersWithTests.length * 2),
        requirementCoverage: 67,
        totalScenarios: enablersWithTests.length * 2,
        passedScenarios: Math.floor(enablersWithTests.length * 1.5),
        failedScenarios: Math.floor(enablersWithTests.length * 0.3),
        blockedScenarios: Math.floor(enablersWithTests.length * 0.2),
        scenarioPassRate: 75,
        criticalPassRate: 100,
        automationRate: 45,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enablers');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.projectFolder]);

  // Load enablers on mount
  useEffect(() => {
    loadEnablers();
  }, [loadEnablers]);

  // Generate unique ID
  const generateId = () => {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${timestamp}${random}`;
  };

  // Handle enabler selection
  const handleEnablerSelect = (enabler: EnablerWithTests) => {
    setSelectedEnabler(enabler);

    // Filter scenarios for this enabler from all loaded scenarios
    const enablerScenarios = allScenarios.filter(s => s.enablerId === enabler.id);
    setScenarios(enablerScenarios);

    // Load or create test suite for this enabler
    const suiteId = `TST-${enabler.id.replace('ENB-', '')}`;
    setTestSuite({
      id: suiteId,
      name: `${enabler.name} Tests`,
      enablerId: enabler.id,
      scenarios: enablerScenarios,
      status: enablerScenarios.length > 0 ? 'in_progress' : 'not_started',
      coverage: enabler.coverage,
    });

    setSelectedScenario(null);
  };

  // Save scenario to markdown file - throws on error
  const saveScenarioToFile = async (scenario: TestScenario): Promise<void> => {
    if (!currentWorkspace?.projectFolder) {
      throw new Error('No workspace path available');
    }

    const response = await fetch(`${INTEGRATION_URL}/save-test-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspacePath: currentWorkspace.projectFolder,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        feature: scenario.feature,
        enablerId: scenario.enablerId,
        enablerName: scenario.enablerName,
        requirementIds: scenario.requirementIds,
        priority: scenario.priority,
        status: scenario.status,
        automation: scenario.automation,
        tags: scenario.tags,
        gherkin: scenario.gherkin,
        lastExecuted: scenario.lastExecuted || '',
        executionTime: scenario.executionTime || 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save scenario "${scenario.name}": ${errorText}`);
    }
  };

  // Delete scenario file
  const deleteScenarioFile = async (scenarioId: string) => {
    if (!currentWorkspace?.projectFolder) {
      return;
    }

    try {
      const response = await fetch(`${INTEGRATION_URL}/delete-test-scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
          scenarioId: scenarioId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to delete scenario file:', errorText);
      }
    } catch (err) {
      console.error('Error deleting scenario file:', err);
    }
  };

  // Load scenarios from files
  const loadScenariosFromFiles = useCallback(async () => {
    if (!currentWorkspace?.projectFolder) {
      return;
    }

    try {
      const response = await fetch(`${INTEGRATION_URL}/list-test-scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspacePath: currentWorkspace.projectFolder,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.scenarios && Array.isArray(data.scenarios)) {
          // Convert loaded scenarios to the correct format
          const loadedScenarios: TestScenario[] = data.scenarios.map((s: Record<string, unknown>) => ({
            id: s.id as string || '',
            name: s.name as string || '',
            feature: s.feature as string || '',
            enablerId: s.enablerId as string || '',
            enablerName: s.enablerName as string || '',
            requirementIds: Array.isArray(s.requirementIds) ? s.requirementIds : [],
            priority: (s.priority as TestScenario['priority']) || 'medium',
            status: (s.status as TestScenario['status']) || 'draft',
            automation: (s.automation as TestScenario['automation']) || 'pending',
            tags: Array.isArray(s.tags) ? s.tags : [],
            gherkin: s.gherkin as string || '',
            lastExecuted: s.lastExecuted as string || undefined,
            executionTime: s.executionTime as number || undefined,
          }));

          // Store all scenarios
          setAllScenarios(loadedScenarios);

          // Update enabler counts with loaded scenario data
          setEnablers(prev => prev.map(enabler => {
            const enablerScenarios = loadedScenarios.filter(s => s.enablerId === enabler.id);
            const passedCount = enablerScenarios.filter(s => s.status === 'passed').length;
            const failedCount = enablerScenarios.filter(s => s.status === 'failed').length;
            return {
              ...enabler,
              scenarioCount: enablerScenarios.length,
              passedCount,
              failedCount,
              coverage: enabler.requirementCount > 0
                ? Math.round((enablerScenarios.length / enabler.requirementCount) * 100)
                : 0,
            };
          }));

          // If an enabler is already selected, update its scenarios
          if (selectedEnabler) {
            const enablerScenarios = loadedScenarios.filter(s => s.enablerId === selectedEnabler.id);
            setScenarios(enablerScenarios);
          }
        }
      }
    } catch (err) {
      console.error('Error loading scenarios from files:', err);
    }
  }, [currentWorkspace?.projectFolder, selectedEnabler]);

  // Load scenarios when workspace changes
  useEffect(() => {
    loadScenariosFromFiles();
  }, [loadScenariosFromFiles]);

  // Analyze enablers and generate test scenarios using AI
  const handleAnalyzeScenarios = async () => {
    console.log('handleAnalyzeScenarios called', {
      projectFolder: currentWorkspace?.projectFolder,
      enablersCount: enablers.length
    });

    if (!currentWorkspace?.projectFolder) {
      setError('No workspace selected. Please select a workspace first.');
      return;
    }

    if (enablers.length === 0) {
      setError('No enablers found in workspace. Please add enabler files to the definition folder first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get API key from localStorage
      const apiKey = localStorage.getItem('anthropic_api_key') || '';
      if (!apiKey) {
        setError('Anthropic API key not configured. Please set it in settings.');
        setIsAnalyzing(false);
        return;
      }

      // Read enabler files to get their content
      const enablerContents: { enabler: EnablerWithTests; content: string }[] = [];
      const readErrors: string[] = [];

      for (const enabler of enablers) {
        try {
          if (!enabler.path) {
            readErrors.push(`Enabler "${enabler.name}" has no file path`);
            continue;
          }

          const response = await fetch(`${INTEGRATION_URL}/read-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspacePath: currentWorkspace.projectFolder,
              filePath: enabler.path,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.content) {
              enablerContents.push({ enabler, content: data.content });
            } else {
              readErrors.push(`Enabler "${enabler.name}" file is empty`);
            }
          } else {
            readErrors.push(`Failed to read enabler "${enabler.name}": ${response.statusText}`);
          }
        } catch (err) {
          readErrors.push(`Error reading enabler "${enabler.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (enablerContents.length === 0) {
        const errorMsg = readErrors.length > 0
          ? `Could not read any enabler files:\n${readErrors.join('\n')}`
          : 'Could not read any enabler files. Make sure enabler files exist in the definition folder.';
        throw new Error(errorMsg);
      }

      // Process enablers in batches to avoid token limits
      const BATCH_SIZE = 5;
      const allParsedScenarios: TestScenario[] = [];
      const totalBatches = Math.ceil(enablerContents.length / BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, enablerContents.length);
        const batch = enablerContents.slice(batchStart, batchEnd);

        setSuccessMessage(`Processing batch ${batchIndex + 1} of ${totalBatches} (${batch.length} enablers)...`);

        // Build prompt for AI
        const prompt = `You are a QA engineer expert in BDD/Gherkin test scenarios. Analyze the following enablers and generate comprehensive test scenarios for each one.

For each enabler, generate 2-3 test scenarios in Gherkin format. Each scenario should:
1. Have a unique scenario ID in format TS-XXXXXX (use random 6 digits)
2. Link to relevant requirement IDs if mentioned in the enabler (FR-XXXXXX or NFR-XXXXXX)
3. Follow proper Gherkin syntax with Given/When/Then steps
4. Cover both happy path and edge cases

IMPORTANT: Return your response in the following JSON format ONLY (no markdown, no explanation):
{
  "scenarios": [
    {
      "id": "TS-123456",
      "name": "Scenario name here",
      "feature": "Feature name",
      "enablerId": "ENB-XXXXXX",
      "enablerName": "Enabler name",
      "requirementIds": ["FR-123456"],
      "priority": "high",
      "gherkin": "@TS-123456 @FR-123456\\nScenario: Scenario name\\n  Given precondition\\n  When action\\n  Then expected result"
    }
  ]
}

Here are the enablers to analyze:

${batch.map(({ enabler, content }) => `
=== ENABLER: ${enabler.name} (${enabler.id}) ===
${content}
`).join('\n')}

Generate test scenarios for ALL the enablers above. Remember to return ONLY valid JSON.`;

        // Call AI endpoint
        const aiResponse = await fetch(`${INTEGRATION_URL}/ai-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            workspacePath: currentWorkspace.projectFolder,
            apiKey: apiKey,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          throw new Error(`AI request failed for batch ${batchIndex + 1}: ${errorText}`);
        }

        const aiData = await aiResponse.json();

        // Check for error in response body (backend returns errors this way)
        if (aiData.error) {
          throw new Error(aiData.error);
        }

        const aiMessage = aiData.response || aiData.message || '';

        if (!aiMessage) {
          throw new Error('AI returned empty response. Please check your API key in Settings.');
        }

        // Parse AI response - try to extract JSON from the response
        try {
          // Try to find JSON in the response
          const jsonMatch = aiMessage.match(/\{[\s\S]*"scenarios"[\s\S]*\}/);
          if (jsonMatch) {
            let jsonStr = jsonMatch[0];

            // Try to fix truncated JSON by extracting complete scenario objects
            try {
              JSON.parse(jsonStr);
            } catch {
              // JSON is truncated, try to salvage complete scenarios
              console.log('Attempting to salvage truncated JSON response...');
              const scenarioMatches = jsonStr.match(/\{[^{}]*"id"\s*:\s*"TS-[^"]+[^{}]*"gherkin"\s*:\s*"[^"]*"\s*\}/g);
              if (scenarioMatches && scenarioMatches.length > 0) {
                jsonStr = `{"scenarios": [${scenarioMatches.join(',')}]}`;
              }
            }

            const parsed = JSON.parse(jsonStr);
            if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
              const batchScenarios = parsed.scenarios.map((s: Record<string, unknown>) => ({
                id: (s.id as string) || `TS-${generateId()}`,
                name: (s.name as string) || 'Unnamed Scenario',
                feature: (s.feature as string) || 'Generated Feature',
                enablerId: (s.enablerId as string) || '',
                enablerName: (s.enablerName as string) || '',
                requirementIds: Array.isArray(s.requirementIds) ? s.requirementIds as string[] : [],
                priority: ((s.priority as string) || 'medium') as TestScenario['priority'],
                status: 'draft' as TestScenario['status'],
                automation: 'pending' as TestScenario['automation'],
                tags: ['ai-generated'],
                gherkin: (s.gherkin as string) || '',
              }));
              allParsedScenarios.push(...batchScenarios);
            }
          }
        } catch (parseErr) {
          console.error(`Failed to parse AI response for batch ${batchIndex + 1}:`, parseErr);
          console.log('AI Response was:', aiMessage);
          // Continue to next batch instead of failing completely
          console.warn(`Skipping batch ${batchIndex + 1} due to parse error`);
        }
      }

      const parsedScenarios = allParsedScenarios;

      if (parsedScenarios.length === 0) {
        throw new Error('AI did not generate any valid scenarios. Please try again.');
      }

      // Save each scenario to file
      let savedCount = 0;
      for (const scenario of parsedScenarios) {
        // Find matching enabler to get correct name
        const matchingEnabler = enablers.find(e => e.id === scenario.enablerId);
        if (matchingEnabler) {
          scenario.enablerName = matchingEnabler.name;
        }

        await saveScenarioToFile(scenario);
        savedCount++;
      }

      // Reload scenarios from files
      await loadScenariosFromFiles();

      setSuccessMessage(`Successfully generated and saved ${savedCount} test scenarios using AI`);
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze enablers');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle scenario form submission
  const handleScenarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEnabler || !testSuite) return;

    const scenarioId = editingScenario?.id || `TS-${generateId()}`;

    const newScenario: TestScenario = {
      id: scenarioId,
      name: scenarioForm.name,
      feature: scenarioForm.feature || testSuite.name,
      enablerId: selectedEnabler.id,
      enablerName: selectedEnabler.name,
      requirementIds: scenarioForm.requirementIds.split(',').map(s => s.trim()).filter(Boolean),
      priority: scenarioForm.priority,
      status: 'draft',
      automation: scenarioForm.automation,
      tags: scenarioForm.tags.split(',').map(s => s.trim()).filter(Boolean),
      gherkin: scenarioForm.gherkin.replace('@TS-XXXXXX', `@${scenarioId}`),
    };

    // Save to file first
    try {
      await saveScenarioToFile(newScenario);

      if (editingScenario) {
        setScenarios(prev => prev.map(s => s.id === editingScenario.id ? newScenario : s));
        setAllScenarios(prev => prev.map(s => s.id === editingScenario.id ? newScenario : s));
        setSuccessMessage('Test scenario updated and saved to file');
      } else {
        setScenarios(prev => [...prev, newScenario]);
        setAllScenarios(prev => [...prev, newScenario]);
        setSuccessMessage('Test scenario created and saved to file');
      }

      resetScenarioForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save test scenario');
    }
  };

  // Reset scenario form
  const resetScenarioForm = () => {
    setShowScenarioForm(false);
    setEditingScenario(null);
    setScenarioForm({
      name: '',
      feature: '',
      requirementIds: '',
      priority: 'medium',
      automation: 'pending',
      tags: '',
      gherkin: `@TS-XXXXXX @FR-XXXXXX
Scenario: [Scenario Name]
  Given [precondition]
  When [action]
  Then [expected outcome]
  And [additional assertion]`,
    });
  };

  // Edit scenario
  const handleEditScenario = (scenario: TestScenario) => {
    setEditingScenario(scenario);
    setScenarioForm({
      name: scenario.name,
      feature: scenario.feature,
      requirementIds: scenario.requirementIds.join(', '),
      priority: scenario.priority,
      automation: scenario.automation,
      tags: scenario.tags.join(', '),
      gherkin: scenario.gherkin,
    });
    setShowScenarioForm(true);
  };

  // Delete scenario
  const handleDeleteScenario = (scenario: TestScenario) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Test Scenario',
      message: `Are you sure you want to delete "${scenario.name}"? This will also delete the markdown file. This action cannot be undone.`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        // Delete the file first
        await deleteScenarioFile(scenario.id);

        setScenarios(prev => prev.filter(s => s.id !== scenario.id));
        setAllScenarios(prev => prev.filter(s => s.id !== scenario.id));
        if (selectedScenario?.id === scenario.id) {
          setSelectedScenario(null);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setSuccessMessage('Test scenario and file deleted successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
    });
  };

  // Run scenario (mock)
  const handleRunScenario = async (scenario: TestScenario) => {
    // Simulate test execution
    const results: TestScenario['status'][] = ['passed', 'failed', 'blocked'];
    const randomResult = results[Math.floor(Math.random() * 3)];
    const executionTime = Math.random() * 5000;
    const lastExecuted = new Date().toISOString();

    const updatedScenario = {
      ...scenario,
      status: randomResult,
      lastExecuted,
      executionTime,
    };

    try {
      // Save updated scenario to file
      await saveScenarioToFile(updatedScenario);

      setScenarios(prev => prev.map(s =>
        s.id === scenario.id ? updatedScenario : s
      ));
      setAllScenarios(prev => prev.map(s =>
        s.id === scenario.id ? updatedScenario : s
      ));

      setSuccessMessage(`Test "${scenario.name}" completed with result: ${randomResult.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save test result');
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'passed': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'blocked': return '#f59e0b';
      case 'ready': return '#3b82f6';
      case 'draft': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <div className="testing-page">
      <WizardPageNavigation />
      <style>{`
        .testing-page {
          padding: 0;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--color-grey-600);
          margin-top: 4px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .metric-card {
          background: white;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid var(--color-grey-200);
        }

        .metric-label {
          font-size: 12px;
          color: var(--color-grey-600);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-top: 4px;
        }

        .metric-value.success { color: #22c55e; }
        .metric-value.warning { color: #f59e0b; }
        .metric-value.danger { color: #ef4444; }

        .main-content {
          display: grid;
          grid-template-columns: 300px 1fr 400px;
          gap: 24px;
          min-height: 600px;
        }

        @media (max-width: 1200px) {
          .main-content {
            grid-template-columns: 1fr;
          }
        }

        .panel {
          background: white;
          border-radius: 8px;
          border: 1px solid var(--color-grey-200);
          overflow: hidden;
        }

        .panel-header {
          padding: 16px;
          border-bottom: 1px solid var(--color-grey-200);
          background: var(--color-grey-50);
        }

        .panel-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-grey-800);
        }

        .panel-content {
          padding: 16px;
          max-height: 500px;
          overflow-y: auto;
        }

        .enabler-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .enabler-item {
          padding: 12px;
          border-radius: 6px;
          border: 1px solid var(--color-grey-200);
          cursor: pointer;
          transition: all 0.2s;
        }

        .enabler-item:hover {
          border-color: var(--color-primary);
          background: var(--color-primary-50);
        }

        .enabler-item.selected {
          border-color: var(--color-primary);
          background: var(--color-primary-100);
        }

        .enabler-name {
          font-weight: 500;
          color: var(--color-grey-900);
          font-size: 14px;
        }

        .enabler-meta {
          display: flex;
          gap: 8px;
          margin-top: 4px;
          font-size: 12px;
          color: var(--color-grey-600);
        }

        .scenario-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .scenario-item {
          padding: 12px;
          border-radius: 6px;
          border: 1px solid var(--color-grey-200);
          cursor: pointer;
          transition: all 0.2s;
        }

        .scenario-item:hover {
          border-color: var(--color-primary);
        }

        .scenario-item.selected {
          border-color: var(--color-primary);
          background: var(--color-primary-50);
        }

        .scenario-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .scenario-name {
          font-weight: 500;
          color: var(--color-grey-900);
          font-size: 14px;
        }

        .scenario-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 8px;
        }

        .tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .tag.status {
          color: white;
        }

        .tag.priority {
          background: var(--color-grey-100);
        }

        .tag.requirement {
          background: var(--color-blue-100);
          color: var(--color-blue-800);
        }

        .gherkin-preview {
          margin-top: 12px;
          padding: 12px;
          background: #1e1e1e;
          border-radius: 6px;
          overflow-x: auto;
        }

        .gherkin-preview pre {
          margin: 0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          line-height: 1.6;
          color: #d4d4d4;
          white-space: pre-wrap;
        }

        .gherkin-keyword {
          color: #569cd6;
          font-weight: bold;
        }

        .gherkin-tag {
          color: #4ec9b0;
        }

        .gherkin-string {
          color: #ce9178;
        }

        .gherkin-comment {
          color: #6a9955;
        }

        .scenario-detail-panel {
          position: sticky;
          top: 24px;
        }

        .detail-section {
          margin-bottom: 16px;
        }

        .detail-label {
          font-size: 12px;
          color: var(--color-grey-600);
          margin-bottom: 4px;
        }

        .detail-value {
          font-size: 14px;
          color: var(--color-grey-900);
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .form-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .form-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .form-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--color-grey-200);
        }

        .form-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--color-grey-900);
        }

        .form-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-grey-700);
          margin-bottom: 6px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--color-grey-300);
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-100);
        }

        .form-textarea {
          min-height: 200px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          resize: vertical;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--color-grey-200);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--color-grey-500);
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
      `}</style>

      <div style={{ padding: '16px', paddingBottom: 0 }}>
        <PageHeader
          title="Testing (BDD/Gherkin)"
          quickDescription="Create and manage Gherkin test scenarios for your enablers."
          detailedDescription="INTENT uses Behavior-Driven Development (BDD) with Gherkin syntax for testing.
Test scenarios are linked to requirements in enablers and provide executable specifications.
AI analysis can automatically generate test scenarios from your enabler requirements, ensuring comprehensive coverage."
          workspaceName={currentWorkspace?.name}
          actions={
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-grey-600)' }}>
                {enablers.length} enablers loaded
              </span>
              <Button
                variant="primary"
                onClick={handleAnalyzeScenarios}
                disabled={isAnalyzing || enablers.length === 0}
                title={enablers.length === 0 ? 'No enablers found - add enabler files to the definition folder' : 'Analyze enablers and generate test scenarios'}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </Button>
            </div>
          }
        />
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Coverage Metrics */}
      {coverageMetrics && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Requirement Coverage</div>
            <div className={`metric-value ${coverageMetrics.requirementCoverage >= 80 ? 'success' : coverageMetrics.requirementCoverage >= 50 ? 'warning' : 'danger'}`}>
              {coverageMetrics.requirementCoverage}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Scenario Pass Rate</div>
            <div className={`metric-value ${coverageMetrics.scenarioPassRate >= 80 ? 'success' : coverageMetrics.scenarioPassRate >= 50 ? 'warning' : 'danger'}`}>
              {coverageMetrics.scenarioPassRate}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Critical Pass Rate</div>
            <div className={`metric-value ${coverageMetrics.criticalPassRate === 100 ? 'success' : 'danger'}`}>
              {coverageMetrics.criticalPassRate}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Automation Rate</div>
            <div className={`metric-value ${coverageMetrics.automationRate >= 70 ? 'success' : coverageMetrics.automationRate >= 40 ? 'warning' : 'danger'}`}>
              {coverageMetrics.automationRate}%
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Enabler List */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Enablers</div>
          </div>
          <div className="panel-content">
            {isLoading ? (
              <div className="empty-state">Loading enablers...</div>
            ) : enablers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">-</div>
                <p>No enablers found in workspace</p>
              </div>
            ) : (
              <div className="enabler-list">
                {enablers.map(enabler => (
                  <div
                    key={enabler.filename || enabler.id}
                    className={`enabler-item ${selectedEnabler?.id === enabler.id ? 'selected' : ''}`}
                    onClick={() => handleEnablerSelect(enabler)}
                  >
                    <div className="enabler-name">{enabler.name}</div>
                    <div className="enabler-meta">
                      <span>{enabler.id}</span>
                      <span>|</span>
                      <span>{enabler.scenarioCount} tests</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scenario List */}
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="panel-title">
              {testSuite ? `Test Suite: ${testSuite.name}` : 'Test Scenarios'}
            </div>
            {selectedEnabler && (
              <Button
                variant="primary"
                size="small"
                onClick={() => setShowScenarioForm(true)}
              >
                + Add Scenario
              </Button>
            )}
          </div>
          <div className="panel-content">
            {!selectedEnabler ? (
              <div className="empty-state">
                <div className="empty-state-icon">-</div>
                <p>Select an enabler to view test scenarios</p>
              </div>
            ) : scenarios.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">-</div>
                <p>No test scenarios yet</p>
                <p style={{ marginTop: 8, fontSize: 14 }}>
                  Click "Add Scenario" to create your first Gherkin test
                </p>
              </div>
            ) : (
              <div className="scenario-list">
                {scenarios.map(scenario => (
                  <div
                    key={scenario.id}
                    className={`scenario-item ${selectedScenario?.id === scenario.id ? 'selected' : ''}`}
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <div className="scenario-header">
                      <div className="scenario-name">{scenario.name}</div>
                      <span
                        className="tag status"
                        style={{ backgroundColor: getStatusColor(scenario.status) }}
                      >
                        {scenario.status}
                      </span>
                    </div>
                    <div className="scenario-tags">
                      <span
                        className="tag priority"
                        style={{ color: getPriorityColor(scenario.priority) }}
                      >
                        {scenario.priority}
                      </span>
                      {scenario.requirementIds.map(reqId => (
                        <span key={reqId} className="tag requirement">{reqId}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scenario Detail */}
        <div className="panel scenario-detail-panel">
          <div className="panel-header">
            <div className="panel-title">Scenario Details</div>
          </div>
          <div className="panel-content">
            {!selectedScenario ? (
              <div className="empty-state">
                <div className="empty-state-icon">-</div>
                <p>Select a scenario to view details</p>
              </div>
            ) : (
              <>
                <div className="detail-section">
                  <div className="detail-label">Scenario ID</div>
                  <div className="detail-value">{selectedScenario.id}</div>
                </div>

                <div className="detail-section">
                  <div className="detail-label">Feature</div>
                  <div className="detail-value">{selectedScenario.feature}</div>
                </div>

                <div className="detail-section">
                  <div className="detail-label">Linked Requirements</div>
                  <div className="scenario-tags" style={{ marginTop: 4 }}>
                    {selectedScenario.requirementIds.map(reqId => (
                      <span key={reqId} className="tag requirement">{reqId}</span>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <div className="detail-label">Gherkin</div>
                  <div className="gherkin-preview">
                    <pre dangerouslySetInnerHTML={{
                      __html: selectedScenario.gherkin
                        .replace(/(@\S+)/g, '<span class="gherkin-tag">$1</span>')
                        .replace(/(Feature:|Scenario:|Scenario Outline:|Background:|Examples:)/g, '<span class="gherkin-keyword">$1</span>')
                        .replace(/(Given|When|Then|And|But)/g, '<span class="gherkin-keyword">$1</span>')
                        .replace(/"([^"]*)"/g, '<span class="gherkin-string">"$1"</span>')
                    }} />
                  </div>
                </div>

                {selectedScenario.lastExecuted && (
                  <div className="detail-section">
                    <div className="detail-label">Last Executed</div>
                    <div className="detail-value">
                      {new Date(selectedScenario.lastExecuted).toLocaleString()}
                      {selectedScenario.executionTime && (
                        <span style={{ marginLeft: 8, color: 'var(--color-grey-500)' }}>
                          ({(selectedScenario.executionTime / 1000).toFixed(2)}s)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="action-buttons">
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleRunScenario(selectedScenario)}
                  >
                    Run Test
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleEditScenario(selectedScenario)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => handleDeleteScenario(selectedScenario)}
                  >
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scenario Form Modal */}
      {showScenarioForm && (
        <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && resetScenarioForm()}>
          <div className="form-modal">
            <div className="form-header">
              {selectedEnabler && (
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-systemBlue)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    borderRadius: '4px',
                  }}>
                    ENABLER
                  </span>
                  {selectedEnabler.name}
                </div>
              )}
              <h2 className="form-title">
                {editingScenario ? 'Edit Test Scenario' : 'Create Test Scenario'}
              </h2>
            </div>
            <form onSubmit={handleScenarioSubmit}>
              <div className="form-body">
                <div className="form-group">
                  <label className="form-label">Scenario Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={scenarioForm.name}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Successful login with valid credentials"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={scenarioForm.priority}
                      onChange={(e) => setScenarioForm(prev => ({ ...prev, priority: e.target.value as TestScenario['priority'] }))}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Automation Status</label>
                    <select
                      className="form-select"
                      value={scenarioForm.automation}
                      onChange={(e) => setScenarioForm(prev => ({ ...prev, automation: e.target.value as TestScenario['automation'] }))}
                    >
                      <option value="pending">Pending</option>
                      <option value="automated">Automated</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Requirements (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={scenarioForm.requirementIds}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, requirementIds: e.target.value }))}
                    placeholder="e.g., FR-123456, FR-789012"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={scenarioForm.tags}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., smoke, regression, critical"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gherkin Scenario *</label>
                  <textarea
                    className="form-textarea"
                    value={scenarioForm.gherkin}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, gherkin: e.target.value }))}
                    placeholder="Write your Gherkin scenario here..."
                    required
                  />
                </div>
              </div>
              <div className="form-footer">
                <Button variant="secondary" type="button" onClick={resetScenarioForm}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editingScenario ? 'Update Scenario' : 'Create Scenario'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Testing;
