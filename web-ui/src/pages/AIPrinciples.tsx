import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useWorkspace } from '../context/WorkspaceContext';
import { AIPresetIndicator, PageHeader } from '../components';
import { UIFrameworkIndicator } from '../components/UIFrameworkIndicator';
import { WizardPageNavigation } from '../components/wizard';
import { INTEGRATION_URL } from '../api/client';

const presetDescriptions = [
  {
    level: 1,
    name: 'Level 1: Awareness (Advisory)',
    description: 'For early development, prototyping, and exploratory analysis. Provides awareness and suggestions without strict enforcement.',
    useCases: 'Startups, solo developers, proof of concepts, hackathons',
    color: 'green',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    textClass: 'text-green-700',
  },
  {
    level: 2,
    name: 'Level 2: Guided Recommendations (Suggested)',
    description: 'For development environments with experienced teams. Provides warnings and recommendations with logging.',
    useCases: 'Scrum teams, iterative development, continuous integration',
    color: 'blue',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-700',
  },
  {
    level: 3,
    name: 'Level 3: Enforced with Warnings (Controlled)',
    description: 'For production environments and regulated industries. Strict enforcement with explicit warnings.',
    useCases: 'Enterprise teams, quality-critical systems, SaaS applications',
    color: 'yellow',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    textClass: 'text-yellow-700',
  },
  {
    level: 4,
    name: 'Level 4: Strict Enforcement (Mandatory)',
    description: 'For mission-critical systems. Absolute enforcement with zero tolerance and immediate termination.',
    useCases: 'Financial systems, medical devices, aerospace, ISO-certified processes',
    color: 'orange',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    textClass: 'text-orange-700',
  },
  {
    level: 5,
    name: 'Level 5: Zero-Tolerance Termination (Absolute)',
    description: 'For safety-critical systems where failure is catastrophic. Maximum enforcement with governance escalation.',
    useCases: 'Nuclear systems, flight controls, medical life support, defense systems',
    color: 'red',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-700',
  },
];

export const AIPrinciples: React.FC = () => {
  const { currentWorkspace, setActiveAIPreset } = useWorkspace();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.activeAIPreset) {
      setSelectedPreset(currentWorkspace.activeAIPreset);
    }
  }, [currentWorkspace]);

  const handleActivatePreset = async () => {
    if (!currentWorkspace || selectedPreset === null) {
      alert('Please select a preset first');
      return;
    }

    if (selectedPreset < 1 || selectedPreset > 5) {
      alert('Invalid preset selection');
      return;
    }

    const preset = presetDescriptions[selectedPreset - 1];
    const confirmMessage = `Are you sure you want to activate "${preset.name}"?\n\nThis will apply the governance policies defined in AI-Policy-Preset${selectedPreset}.md to all Claude AI interactions within this workspace.\n\nAll workspace pages will show the active preset indicator.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsActivating(true);
    try {
      // Copy the preset policy file to the workspace specifications folder
      if (currentWorkspace.projectFolder) {
        const response = await fetch(`${INTEGRATION_URL}/activate-ai-preset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspacePath: currentWorkspace.projectFolder,
            presetNumber: selectedPreset,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('Failed to copy preset file:', errorText);
          // Continue with activation even if copy fails
        }
      }

      await setActiveAIPreset(selectedPreset);
      setActivationSuccess(true);
      setTimeout(() => setActivationSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to activate AI preset:', error);
      alert('Failed to activate AI preset');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivatePreset = async () => {
    if (!currentWorkspace) return;

    if (!confirm('Are you sure you want to deactivate the current AI preset?\n\nThis will remove all AI governance policies from this workspace.')) {
      return;
    }

    setIsActivating(true);
    try {
      await setActiveAIPreset(0); // 0 means no preset
      setSelectedPreset(null);
      setActivationSuccess(true);
      setTimeout(() => setActivationSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to deactivate AI preset:', error);
      alert('Failed to deactivate AI preset');
    } finally {
      setIsActivating(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-grey-900 mb-2">AI Principles</h2>
          <p className="text-grey-600">Configure AI governance and development principles for your workspace</p>
        </div>
        <Card>
          <p className="text-grey-600 text-center py-8">
            Please select a workspace from the Workspace Settings page to configure AI principles.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto" style={{ padding: '16px' }}>
      <WizardPageNavigation />
      <AIPresetIndicator />
      <UIFrameworkIndicator />
      <div style={{ marginBottom: 'var(--spacing-6, 24px)' }}>
        <PageHeader
          title="AI Governance & Principles"
          quickDescription="Configure AI governance framework for your workspace."
          detailedDescription="INTENT provides 5 levels of AI governance enforcement, from Advisory (Level 1) to Zero-Tolerance (Level 5).
Each level defines how strictly AI agents must follow development rules and approval workflows.
Select a preset that matches your project's risk profile and regulatory requirements."
          workspaceName={currentWorkspace?.name}
        />
      </div>

      {activationSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-green-800 font-medium">
              {currentWorkspace.activeAIPreset ? 'AI Preset activated successfully!' : 'AI Preset deactivated successfully!'}
            </span>
          </div>
        </div>
      )}

      {/* Overview Card */}
      <Card>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-grey-900 mb-2">AI Governance Framework</h3>
          <p className="text-sm text-grey-600 mb-4">
            Select an AI governance preset that aligns with your project's requirements. Each preset defines how Claude AI will interact with your workspace, enforcing different levels of compliance, quality gates, and safety controls.
          </p>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">How It Works</h4>
                <p className="text-sm text-blue-700">
                  When you activate a preset, all Claude AI queries, prompts, and commands within this workspace will strictly follow the governance policies defined in the corresponding <code className="bg-blue-100 px-1 py-0.5 rounded">AI-Policy-Preset{selectedPreset || 'X'}.md</code> file. The active preset indicator will appear at the top of all workspace pages.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Preset Selection Cards */}
      <div className="space-y-4">
        {presetDescriptions.map((preset) => {
          const isSelected = selectedPreset === preset.level;
          const isActive = currentWorkspace.activeAIPreset === preset.level;

          return (
            <Card key={preset.level}>
              <div
                className={`cursor-pointer transition-all ${
                  isSelected ? `${preset.bgClass} border-2 ${preset.borderClass}` : 'hover:bg-grey-50'
                }`}
                onClick={() => setSelectedPreset(preset.level)}
                style={{ padding: '20px', borderRadius: '8px' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${preset.bgClass} ${preset.borderClass} border`}
                      >
                        <span className={`text-sm font-bold ${preset.textClass}`}>{preset.level}</span>
                      </div>
                      <h3 className={`text-lg font-semibold ${isSelected ? preset.textClass : 'text-grey-900'}`}>
                        {preset.name}
                      </h3>
                      {isActive && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Active
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mb-3 ${isSelected ? preset.textClass : 'text-grey-700'}`}>
                      {preset.description}
                    </p>
                    <div className="flex items-start gap-2">
                      <svg
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? preset.textClass : 'text-grey-500'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className={`text-xs ${isSelected ? preset.textClass : 'text-grey-600'}`}>
                        <strong>Use Cases:</strong> {preset.useCases}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <a
                        href={`/AI_Principles/AI-Policy-Preset${preset.level}.md`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-medium ${preset.textClass} hover:underline flex items-center gap-1`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Policy Document
                      </a>
                    </div>
                  </div>
                  <div className="ml-4">
                    {isSelected && (
                      <svg
                        className={`w-6 h-6 ${preset.textClass}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex-1">
          {currentWorkspace.activeAIPreset && (
            <p className="text-sm text-grey-600">
              Currently active: <strong className="text-grey-900">{presetDescriptions[currentWorkspace.activeAIPreset - 1]?.name}</strong>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentWorkspace.activeAIPreset && (
            <Button
              variant="outline"
              onClick={handleDeactivatePreset}
              disabled={isActivating}
            >
              Deactivate Preset
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleActivatePreset}
            disabled={!selectedPreset || isActivating}
          >
            {isActivating ? 'Activating...' : 'Activate Selected Preset'}
          </Button>
        </div>
      </div>

      {/* Governance Categories Info */}
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-grey-900 mb-2">Governance Framework Categories</h3>
          <p className="text-sm text-grey-600 mb-4">
            Each AI preset covers the following 12 governance categories with varying levels of enforcement:
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            '1. Workflow Governance & State Machine Compliance',
            '2. Quality Gates & Pre-Condition Verification',
            '3. Documentation Standards & Templates',
            '4. Security & Authorization Compliance',
            '5. Development Lifecycle Management',
            '6. Architecture Principles & Design Patterns',
            '7. Change Management & State Transitions',
            '8. Code Review & Testing Standards',
            '9. Dependency Management & Integration',
            '10. Risk Management & Safety Controls',
            '11. Metadata & Configuration Standards',
            '12. File Naming & ID Generation Standards',
          ].map((category) => (
            <div key={category} className="flex items-start gap-2 p-2 bg-grey-50 rounded">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-grey-700">{category}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
