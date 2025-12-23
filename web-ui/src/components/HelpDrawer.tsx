import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string[];
  relatedPages?: string[];
  action?: {
    label: string;
    path: string;
  };
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of Intentr',
    icon: '🚀',
    content: [
      'Intentr uses the INTENT methodology for AI-assisted software development.',
      'Start by creating a workspace for your project.',
      'Define your vision and storyboards in the Intent Declaration phase.',
      'Create capabilities and enablers in the Formal Specification phase.',
      'Generate code in the System Derivation phase.',
    ],
    action: {
      label: 'Start Tutorial',
      path: '/',
    },
  },
  {
    id: 'workspaces',
    title: 'Working with Workspaces',
    description: 'Organize your projects',
    icon: '📁',
    content: [
      'Each workspace is a separate project container.',
      'Workspaces have their own specifications, AI settings, and code.',
      'Switch between workspaces using the dropdown in the header.',
      'Configure workspace settings in the Settings page.',
      'Export workspaces to share with team members.',
    ],
    relatedPages: ['/workspaces', '/settings'],
  },
  {
    id: 'intent-declaration',
    title: 'Intent Declaration',
    description: 'Vision, Ideation & Storyboards',
    icon: '💡',
    content: [
      'Vision: Define the product goals and target users.',
      'Ideation: Brainstorm features and capabilities.',
      'Storyboards: Create user journey narratives.',
      'These form the foundation for formal specifications.',
      'AI uses this context to generate better specifications.',
    ],
    relatedPages: ['/vision', '/ideation', '/storyboard'],
  },
  {
    id: 'formal-specification',
    title: 'Formal Specification',
    description: 'Capabilities & Enablers',
    icon: '📋',
    content: [
      'Capabilities: High-level business functions.',
      'Enablers: Technical implementations of capabilities.',
      'Requirements: Specific functional and non-functional needs.',
      'Each enabler links to a parent capability.',
      'Use the dependency view to see relationships.',
    ],
    relatedPages: ['/capabilities', '/enablers', '/story-map'],
  },
  {
    id: 'ai-governance',
    title: 'AI Governance',
    description: 'Control AI behavior',
    icon: '🤖',
    content: [
      'Level 1 (Advisory): AI provides suggestions only.',
      'Level 2 (Guided): AI recommends actions.',
      'Level 3 (Controlled): Enforced with warnings.',
      'Level 4 (Mandatory): Strict enforcement.',
      'Level 5 (Absolute): Zero tolerance for violations.',
    ],
    relatedPages: ['/ai-principles'],
  },
  {
    id: 'code-generation',
    title: 'Code Generation',
    description: 'Generate code from specs',
    icon: '⚡',
    content: [
      'Ensure all phase approvals are complete.',
      'Configure your preferred UI framework.',
      'Review the generation command before running.',
      'Generated code appears in the code folder.',
      'Use the Run page to test your application.',
    ],
    relatedPages: ['/code', '/run'],
  },
  {
    id: 'validation',
    title: 'Continuous Validation',
    description: 'Test and verify',
    icon: '✅',
    content: [
      'Define test scenarios using Gherkin syntax.',
      'Link tests to requirements for traceability.',
      'Review validation dashboard for integrity scores.',
      'Approve testing phase before deployment.',
      'Monitor coverage and pass rates.',
    ],
    relatedPages: ['/testing', '/testing-approval'],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Work faster',
    icon: '⌨️',
    content: [
      '⌘/Ctrl + K: Open command palette',
      '⌘/Ctrl + S: Save current work',
      '⌘/Ctrl + /: Toggle help drawer',
      'Esc: Close modals and drawers',
      '↑/↓: Navigate lists',
    ],
  },
];

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter topics based on search
  const filteredTopics = HELP_TOPICS.filter(topic =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.content.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get contextual help based on current page
  const getContextualTopic = (): HelpTopic | null => {
    const path = location.pathname;
    return HELP_TOPICS.find(topic =>
      topic.relatedPages?.some(p => path.includes(p))
    ) || null;
  };

  const contextualTopic = getContextualTopic();

  const handleTopicClick = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  const handleActionClick = (action: { label: string; path: string }) => {
    onClose();
    navigate(action.path);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="help-drawer">
        <style>{`
          .drawer-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 1999;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .help-drawer {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 380px;
            max-width: 90vw;
            background: white;
            box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
            z-index: 2000;
            display: flex;
            flex-direction: column;
            animation: slideIn 0.25s ease;
          }

          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .drawer-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--color-grey-100);
            background: var(--color-grey-50);
          }

          .drawer-header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .drawer-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--color-grey-900);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .close-button {
            width: 32px;
            height: 32px;
            border: none;
            background: var(--color-grey-100);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--color-grey-600);
            transition: all 0.15s ease;
          }

          .close-button:hover {
            background: var(--color-grey-200);
            color: var(--color-grey-800);
          }

          .search-input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid var(--color-grey-200);
            border-radius: 8px;
            font-size: 14px;
            background: white;
            transition: all 0.15s ease;
          }

          .search-input:focus {
            outline: none;
            border-color: var(--color-blue-400);
            box-shadow: 0 0 0 3px var(--color-blue-100);
          }

          .drawer-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
          }

          .contextual-section {
            margin-bottom: 20px;
          }

          .section-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--color-grey-500);
            margin-bottom: 10px;
            padding: 0 8px;
          }

          .topic-card {
            background: white;
            border: 1px solid var(--color-grey-200);
            border-radius: 10px;
            margin-bottom: 8px;
            overflow: hidden;
            transition: all 0.15s ease;
          }

          .topic-card:hover {
            border-color: var(--color-grey-300);
          }

          .topic-card.expanded {
            border-color: var(--color-blue-300);
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
          }

          .topic-card.contextual {
            border-color: var(--color-purple-300);
            background: var(--color-purple-50);
          }

          .topic-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 16px;
            cursor: pointer;
            transition: background 0.15s ease;
          }

          .topic-header:hover {
            background: var(--color-grey-50);
          }

          .topic-icon {
            font-size: 24px;
            flex-shrink: 0;
          }

          .topic-info {
            flex: 1;
            min-width: 0;
          }

          .topic-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--color-grey-900);
            margin: 0 0 2px;
          }

          .topic-description {
            font-size: 12px;
            color: var(--color-grey-500);
            margin: 0;
          }

          .topic-arrow {
            color: var(--color-grey-400);
            transition: transform 0.2s ease;
          }

          .topic-card.expanded .topic-arrow {
            transform: rotate(180deg);
          }

          .topic-content {
            padding: 0 16px 16px;
            border-top: 1px solid var(--color-grey-100);
          }

          .content-list {
            list-style: none;
            padding: 12px 0 0;
            margin: 0;
          }

          .content-list li {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 13px;
            color: var(--color-grey-700);
            line-height: 1.5;
            margin-bottom: 8px;
          }

          .content-list li::before {
            content: "•";
            color: var(--color-blue-500);
            font-weight: bold;
            flex-shrink: 0;
          }

          .topic-action {
            margin-top: 12px;
          }

          .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: var(--color-blue-600);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease;
          }

          .action-btn:hover {
            background: var(--color-blue-700);
          }

          .related-pages {
            margin-top: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .related-page {
            padding: 4px 10px;
            background: var(--color-grey-100);
            border-radius: 12px;
            font-size: 11px;
            color: var(--color-grey-600);
            cursor: pointer;
            transition: all 0.15s ease;
            border: none;
          }

          .related-page:hover {
            background: var(--color-blue-100);
            color: var(--color-blue-700);
          }

          .drawer-footer {
            padding: 16px 24px;
            border-top: 1px solid var(--color-grey-100);
            background: var(--color-grey-50);
          }

          .footer-links {
            display: flex;
            gap: 16px;
            justify-content: center;
          }

          .footer-link {
            font-size: 13px;
            color: var(--color-blue-600);
            text-decoration: none;
            cursor: pointer;
            transition: color 0.15s ease;
            background: none;
            border: none;
            padding: 0;
          }

          .footer-link:hover {
            color: var(--color-blue-800);
            text-decoration: underline;
          }

          .no-results {
            text-align: center;
            padding: 32px 16px;
            color: var(--color-grey-500);
          }

          .no-results-icon {
            font-size: 32px;
            margin-bottom: 8px;
          }
        `}</style>

        <div className="drawer-header">
          <div className="drawer-header-top">
            <h2 className="drawer-title">
              <span>❓</span> Help
            </h2>
            <button className="close-button" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            className="search-input"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="drawer-content">
          {/* Contextual Help */}
          {contextualTopic && !searchQuery && (
            <div className="contextual-section">
              <div className="section-label">Relevant to this page</div>
              <div className={`topic-card contextual ${expandedTopic === contextualTopic.id ? 'expanded' : ''}`}>
                <div className="topic-header" onClick={() => handleTopicClick(contextualTopic.id)}>
                  <span className="topic-icon">{contextualTopic.icon}</span>
                  <div className="topic-info">
                    <h4 className="topic-title">{contextualTopic.title}</h4>
                    <p className="topic-description">{contextualTopic.description}</p>
                  </div>
                  <span className="topic-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </div>
                {expandedTopic === contextualTopic.id && (
                  <div className="topic-content">
                    <ul className="content-list">
                      {contextualTopic.content.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All Topics */}
          <div className="section-label">
            {searchQuery ? 'Search Results' : 'All Topics'}
          </div>

          {filteredTopics.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <p>No topics found for "{searchQuery}"</p>
            </div>
          ) : (
            filteredTopics
              .filter(topic => !contextualTopic || topic.id !== contextualTopic.id || searchQuery)
              .map((topic) => (
                <div
                  key={topic.id}
                  className={`topic-card ${expandedTopic === topic.id ? 'expanded' : ''}`}
                >
                  <div className="topic-header" onClick={() => handleTopicClick(topic.id)}>
                    <span className="topic-icon">{topic.icon}</span>
                    <div className="topic-info">
                      <h4 className="topic-title">{topic.title}</h4>
                      <p className="topic-description">{topic.description}</p>
                    </div>
                    <span className="topic-arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                  {expandedTopic === topic.id && (
                    <div className="topic-content">
                      <ul className="content-list">
                        {topic.content.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                      {topic.action && (
                        <div className="topic-action">
                          <button
                            className="action-btn"
                            onClick={() => handleActionClick(topic.action!)}
                          >
                            {topic.action.label}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {topic.relatedPages && topic.relatedPages.length > 0 && (
                        <div className="related-pages">
                          {topic.relatedPages.map((page) => (
                            <button
                              key={page}
                              className="related-page"
                              onClick={() => { onClose(); navigate(page); }}
                            >
                              {page.replace('/', '').replace('-', ' ') || 'home'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>

        <div className="drawer-footer">
          <div className="footer-links">
            <button className="footer-link" onClick={() => { onClose(); navigate('/'); }}>
              View Tutorial
            </button>
            <button className="footer-link" onClick={() => { onClose(); navigate('/ai-chat'); }}>
              Ask AI Assistant
            </button>
            <button className="footer-link" onClick={() => window.open('https://docs.intentr.io', '_blank')}>
              Documentation
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpDrawer;
