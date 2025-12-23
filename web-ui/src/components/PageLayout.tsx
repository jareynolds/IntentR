import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { WizardPageNavigation } from './wizard';
import { AIPresetIndicator } from './AIPresetIndicator';
import { PageHeader } from './PageHeader';

// Constants for global app settings storage
const INTENTR_APP_PAGE_LAYOUT_KEY = 'intentr_app_page_layout';

/**
 * PageLayout configuration for customizable layouts per workspace
 */
export interface PageLayoutConfig {
  id: string;
  name: string;
  showWizard: boolean;
  showAIPreset: boolean;
  showUIFramework: boolean;
  showWorkspace: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showInfoButton: boolean;
  isDefault?: boolean;
}

/**
 * Default layout templates
 */
export const DEFAULT_LAYOUTS: PageLayoutConfig[] = [
  {
    id: 'standard',
    name: 'Standard',
    showWizard: true,
    showAIPreset: true,
    showUIFramework: true,
    showWorkspace: true,
    showTitle: true,
    showDescription: true,
    showInfoButton: true,
    isDefault: true,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    showWizard: false,
    showAIPreset: false,
    showUIFramework: false,
    showWorkspace: false,
    showTitle: true,
    showDescription: true,
    showInfoButton: false,
  },
  {
    id: 'development',
    name: 'Development',
    showWizard: true,
    showAIPreset: true,
    showUIFramework: true,
    showWorkspace: true,
    showTitle: true,
    showDescription: true,
    showInfoButton: true,
  },
  {
    id: 'presentation',
    name: 'Presentation',
    showWizard: false,
    showAIPreset: false,
    showUIFramework: false,
    showWorkspace: true,
    showTitle: true,
    showDescription: false,
    showInfoButton: false,
  },
];

/**
 * Props for the PageLayout component
 */
interface PageLayoutProps {
  /** Page title (required) */
  title: string;
  /** Short description shown below title (required) */
  quickDescription: string;
  /** Page content */
  children: React.ReactNode;
  /** Detailed description shown when (i) is clicked */
  detailedDescription?: string;
  /** Action buttons to show in the header */
  actions?: React.ReactNode;
  /** Override: hide wizard navigation regardless of workspace config */
  hideWizard?: boolean;
  /** Override: hide AI preset indicator regardless of workspace config */
  hidePreset?: boolean;
  /** Override: hide workspace bar regardless of workspace config */
  hideWorkspace?: boolean;
  /** Use full width layout without max-width constraint */
  fullWidth?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Additional styles for the container */
  style?: React.CSSProperties;
}

/**
 * PageLayout Component
 *
 * A wrapper component that provides consistent page structure across the application.
 * Includes wizard navigation, AI/UI preset indicators, workspace bar, and page header.
 *
 * Configuration can be customized per-workspace via the UI Framework page.
 *
 * @example
 * ```tsx
 * <PageLayout
 *   title="Ideation Canvas"
 *   quickDescription="Freeform whiteboard for your ideas"
 *   detailedDescription="In Intent-Centered Engineering, ideation is..."
 *   actions={<Button>+ Add Card</Button>}
 * >
 *   <div>Page content here</div>
 * </PageLayout>
 * ```
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  quickDescription,
  children,
  detailedDescription,
  actions,
  hideWizard = false,
  hidePreset = false,
  hideWorkspace = false,
  fullWidth = false,
  className = '',
  style,
}) => {
  const { currentWorkspace } = useWorkspace();

  // State for the global app layout config
  const [appLayoutConfig, setAppLayoutConfig] = useState<PageLayoutConfig | null>(null);

  // Load layout config from localStorage on mount and listen for changes
  useEffect(() => {
    // Function to load config from localStorage
    const loadConfig = () => {
      const saved = localStorage.getItem(INTENTR_APP_PAGE_LAYOUT_KEY);
      if (saved) {
        try {
          const config = JSON.parse(saved) as PageLayoutConfig;
          setAppLayoutConfig(config);
        } catch (e) {
          console.error('Failed to parse page layout config:', e);
        }
      }
    };

    // Load initial config
    loadConfig();

    // Listen for custom event from Admin Panel when layout is changed
    const handleLayoutChange = (event: CustomEvent<PageLayoutConfig>) => {
      setAppLayoutConfig(event.detail);
    };

    window.addEventListener('intentr-page-layout-changed', handleLayoutChange as EventListener);

    // Also listen for storage changes (in case changed in another tab)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === INTENTR_APP_PAGE_LAYOUT_KEY) {
        loadConfig();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('intentr-page-layout-changed', handleLayoutChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Use global app config (from Admin Panel) if available, otherwise use standard default
  // Note: workspace config is used for target app specification, NOT for IntentR appearance
  const layoutConfig: PageLayoutConfig = appLayoutConfig || DEFAULT_LAYOUTS[0];

  // Determine what to show based on workspace config and prop overrides
  const showWizard = !hideWizard && layoutConfig.showWizard;
  const showPreset = !hidePreset && (layoutConfig.showAIPreset || layoutConfig.showUIFramework);
  const showWorkspaceBar = !hideWorkspace && layoutConfig.showWorkspace;
  const showTitle = layoutConfig.showTitle;
  const showDescription = layoutConfig.showDescription;
  const showInfoButton = layoutConfig.showInfoButton && !!detailedDescription;

  // Build the description with or without info button
  const effectiveQuickDescription = showDescription ? quickDescription : '';
  const effectiveDetailedDescription = showInfoButton ? detailedDescription : undefined;

  return (
    <div
      className={`page-layout ${className}`}
      style={{
        padding: '16px',
        maxWidth: fullWidth ? 'none' : '1400px',
        margin: fullWidth ? 0 : '0 auto',
        ...style,
      }}
    >
      {/* 1. Wizard Navigation */}
      {showWizard && <WizardPageNavigation />}

      {/* 2. AI Preset + UI Framework Indicators */}
      {showPreset && <AIPresetIndicator />}

      {/* 3-5. Workspace Bar, Title, Description (via PageHeader) */}
      {(showTitle || showWorkspaceBar) && (
        <PageHeader
          title={showTitle ? title : ''}
          quickDescription={effectiveQuickDescription}
          detailedDescription={effectiveDetailedDescription}
          workspaceName={showWorkspaceBar ? currentWorkspace?.name : undefined}
          actions={actions}
        />
      )}

      {/* Page Content */}
      <div className="page-layout__content">
        {children}
      </div>

      <style>{`
        .page-layout {
          min-height: calc(100vh - 60px);
        }

        .page-layout__content {
          /* Content area styles if needed */
        }
      `}</style>
    </div>
  );
};

export default PageLayout;
