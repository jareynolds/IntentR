import React, { useState, useEffect, useRef } from 'react';

interface PageHeaderProps {
  title: string;
  quickDescription: string;
  detailedDescription?: string;
  workspaceName?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  quickDescription,
  detailedDescription,
  workspaceName,
  actions,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandedRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't close if clicking the info button itself
      if (infoButtonRef.current?.contains(target)) {
        return;
      }

      // Close if clicking outside the expanded section
      if (expandedRef.current && !expandedRef.current.contains(target)) {
        setIsExpanded(false);
      }
    };

    // Add listener with a small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Handle escape key to close
  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="page-header">
      {/* Workspace indicator (if provided) */}
      {workspaceName && (
        <div className="page-header__workspace">
          <h4 className="text-title3">{workspaceName}</h4>
        </div>
      )}

      {/* Title and actions row */}
      <div className="page-header__title-row">
        <h1 className="text-large-title">{title}</h1>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>

      {/* Quick description with info button */}
      <div className="page-header__quick-desc">
        <p className="text-body text-secondary">
          {quickDescription}
          {detailedDescription && (
            <button
              ref={infoButtonRef}
              className="page-header__info-btn"
              onClick={toggleExpanded}
              aria-expanded={isExpanded}
              aria-label="Show more information"
              title="Click for more details"
            >
              <span className="info-icon">ⓘ</span>
            </button>
          )}
        </p>
      </div>

      {/* Expanded detailed description */}
      {detailedDescription && isExpanded && (
        <div
          ref={expandedRef}
          className="page-header__expanded"
        >
          <div className="page-header__expanded-content">
            <div className="page-header__expanded-header">
              <span className="expanded-title">About this page</span>
              <button
                className="page-header__close-btn"
                onClick={() => setIsExpanded(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="page-header__expanded-body">
              {detailedDescription.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page-header {
          margin-bottom: 24px;
        }

        .page-header__workspace {
          background: var(--color-blue-500, #3b82f6);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: inline-block;
        }

        .page-header__workspace h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
        }

        .page-header__title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .page-header__title-row h1 {
          margin: 0;
        }

        .page-header__actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .page-header__quick-desc {
          margin-bottom: 16px;
        }

        .page-header__quick-desc p {
          margin: 0;
          display: inline;
        }

        .page-header__info-btn {
          background: none;
          border: none;
          padding: 0 0 0 6px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          vertical-align: middle;
          color: var(--color-blue-500, #3b82f6);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
        }

        .page-header__info-btn:hover {
          color: var(--color-blue-600, #2563eb);
          transform: scale(1.1);
        }

        .page-header__info-btn .info-icon {
          display: inline-block;
        }

        .page-header__expanded {
          position: relative;
          margin-top: 12px;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .page-header__expanded-content {
          background: var(--color-blue-50, #eff6ff);
          border: 1px solid var(--color-blue-200, #bfdbfe);
          border-radius: 8px;
          overflow: hidden;
        }

        .page-header__expanded-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--color-blue-100, #dbeafe);
          border-bottom: 1px solid var(--color-blue-200, #bfdbfe);
        }

        .expanded-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--color-blue-800, #1e40af);
        }

        .page-header__close-btn {
          background: none;
          border: none;
          font-size: 20px;
          line-height: 1;
          color: var(--color-blue-600, #2563eb);
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.15s ease;
        }

        .page-header__close-btn:hover {
          background: var(--color-blue-200, #bfdbfe);
        }

        .page-header__expanded-body {
          padding: 16px;
        }

        .page-header__expanded-body p {
          margin: 0 0 12px 0;
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-grey-700, #374151);
        }

        .page-header__expanded-body p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default PageHeader;
