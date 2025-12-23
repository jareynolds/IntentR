import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../Button';

interface Highlight {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface StartPageLayoutProps {
  title: string;
  subtitle: string;
  description: string[];
  highlights: Highlight[];
  illustration: React.ReactNode;
  onBegin: () => void;
  beginLabel?: string;
  showSkip?: boolean;
  onSkip?: () => void;
  accentColor?: 'blue' | 'purple' | 'green' | 'orange' | 'indigo';
}

export const StartPageLayout: React.FC<StartPageLayoutProps> = ({
  title,
  subtitle,
  description,
  highlights,
  illustration,
  onBegin,
  beginLabel = 'Begin',
  showSkip = true,
  onSkip,
  accentColor = 'blue',
}) => {
  const colorVars: Record<string, { light: string; medium: string; dark: string }> = {
    blue: {
      light: 'var(--color-blue-50)',
      medium: 'var(--color-blue-500)',
      dark: 'var(--color-blue-700)',
    },
    purple: {
      light: 'var(--color-purple-50)',
      medium: 'var(--color-purple-500)',
      dark: 'var(--color-purple-700)',
    },
    green: {
      light: 'var(--color-green-50)',
      medium: 'var(--color-green-500)',
      dark: 'var(--color-green-700)',
    },
    orange: {
      light: 'var(--color-orange-50)',
      medium: 'var(--color-orange-500)',
      dark: 'var(--color-orange-700)',
    },
    indigo: {
      light: 'var(--color-indigo-50)',
      medium: 'var(--color-indigo-500)',
      dark: 'var(--color-indigo-700)',
    },
  };

  const colors = colorVars[accentColor] || colorVars.blue;

  return (
    <div className="start-page">
      {/* Hero Section */}
      <div className="start-page-hero" style={{ backgroundColor: colors.light }}>
        <div className="start-page-illustration" style={{ color: colors.medium }}>
          {illustration}
        </div>
        <h1 className="start-page-title">{title}</h1>
        <p className="start-page-subtitle" style={{ color: colors.dark }}>{subtitle}</p>
      </div>

      {/* Description */}
      <div className="start-page-content">
        <div className="start-page-description">
          {description.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {/* Highlights */}
        <div className="start-page-highlights">
          {highlights.map((highlight, index) => (
            <div key={index} className="highlight-card">
              <div className="highlight-icon" style={{ backgroundColor: colors.light, color: colors.medium }}>
                {highlight.icon}
              </div>
              <div className="highlight-content">
                <h4 className="highlight-title">{highlight.title}</h4>
                <p className="highlight-description">{highlight.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="start-page-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={onBegin}
          >
            {beginLabel}
            <svg className="begin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Button>

          {showSkip && onSkip && (
            <button className="skip-link" onClick={onSkip}>
              Skip introduction and go directly to section
            </button>
          )}
        </div>
      </div>

      <style>{`
        .start-page {
          max-width: 960px;
          margin: 0 auto;
        }

        .start-page-hero {
          text-align: center;
          padding: 3rem 2rem;
          border-radius: 1rem;
          margin-bottom: 2rem;
        }

        .start-page-illustration {
          margin-bottom: 1.5rem;
        }

        .start-page-illustration svg {
          width: 5rem;
          height: 5rem;
        }

        .start-page-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-grey-900);
          margin-bottom: 0.5rem;
        }

        .start-page-subtitle {
          font-size: 1.125rem;
          font-weight: 500;
        }

        .start-page-content {
          padding: 0 2rem;
        }

        .start-page-description {
          margin-bottom: 2rem;
        }

        .start-page-description p {
          font-size: 1rem;
          line-height: 1.75;
          color: var(--color-grey-700);
          margin-bottom: 1rem;
        }

        .start-page-description p:last-child {
          margin-bottom: 0;
        }

        .start-page-highlights {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .highlight-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: white;
          border: 1px solid var(--color-grey-200);
          border-radius: 0.75rem;
        }

        .highlight-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.5rem;
        }

        .highlight-icon svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .highlight-content {
          flex: 1;
        }

        .highlight-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-grey-900);
          margin-bottom: 0.25rem;
        }

        .highlight-description {
          font-size: 0.75rem;
          color: var(--color-grey-600);
          line-height: 1.4;
        }

        .start-page-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem 0;
        }

        .begin-icon {
          width: 1.25rem;
          height: 1.25rem;
          margin-left: 0.5rem;
        }

        .skip-link {
          background: none;
          border: none;
          color: var(--color-grey-500);
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .skip-link:hover {
          color: var(--color-grey-700);
        }

        @media (max-width: 640px) {
          .start-page-hero {
            padding: 2rem 1rem;
          }

          .start-page-title {
            font-size: 1.5rem;
          }

          .start-page-subtitle {
            font-size: 1rem;
          }

          .start-page-highlights {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default StartPageLayout;
