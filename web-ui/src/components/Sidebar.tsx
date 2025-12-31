import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRoleAccess } from '../context/RoleAccessContext';
import { useApproval } from '../context/ApprovalContext';

export interface SidebarChildItem {
  path: string;
  label: string;
  hasRejection?: boolean; // Show red text with exclamation point if true
  isPhaseIncomplete?: boolean; // Show warning symbol if phase not fully approved
}

export interface SidebarItem {
  path?: string;
  label: string;
  icon?: string;
  children?: SidebarChildItem[];
  isPhase?: boolean; // New: marks item as a phase header
  phaseIcon?: string; // New: icon for phase (e.g., number or symbol)
  showApprovalBadge?: boolean; // Show pending approval count badge
}

export interface SidebarProps {
  items: SidebarItem[];
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ items, isMobileOpen = false, onMobileClose }) => {
  const location = useLocation();
  let isPageVisible: (path: string) => boolean;
  let pendingApprovalCount = 0;

  try {
    const roleAccess = useRoleAccess();
    isPageVisible = roleAccess.isPageVisible;
  } catch (e) {
    // If RoleAccessProvider isn't available, show all items
    isPageVisible = () => true;
  }

  try {
    const approval = useApproval();
    pendingApprovalCount = approval.pendingCount;
  } catch (e) {
    // If ApprovalProvider isn't available, show 0
    pendingApprovalCount = 0;
  }

  // Initialize expanded items from localStorage or use defaults
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sidebar_expanded_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      } catch (e) {
        // If parsing fails, use defaults
      }
    }
    return new Set(['SPECIFICATION', 'DEFINITION', 'DESIGN', 'EXECUTION', 'Workspaces']);
  });

  // Initialize collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  // Persist expanded items to localStorage when they change
  useEffect(() => {
    localStorage.setItem('sidebar_expanded_items', JSON.stringify(Array.from(expandedItems)));
  }, [expandedItems]);

  // Persist collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Filter items based on role permissions
  const visibleItems = useMemo(() => {
    return items.map(item => {
      // If item has a direct path, check if visible
      if (item.path && !isPageVisible(item.path)) {
        return null;
      }

      // If item has children, filter visible children
      if (item.children) {
        const visibleChildren = item.children.filter(child => isPageVisible(child.path));

        // If no visible children, hide the parent item
        if (visibleChildren.length === 0) {
          return null;
        }

        return {
          ...item,
          children: visibleChildren
        };
      }

      return item;
    }).filter(Boolean) as SidebarItem[];
  }, [items, isPageVisible]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => {
      if (prev.has(label)) {
        // If already expanded, just collapse it
        const newSet = new Set(prev);
        newSet.delete(label);
        return newSet;
      } else {
        // If collapsed, expand it and collapse all others
        return new Set([label]);
      }
    });
  };

  const isChildActive = (children: SidebarChildItem[] | undefined) => {
    if (!children) return false;
    return children.some(child => location.pathname === child.path);
  };

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Mobile close button */}
        <button
          className="sidebar-mobile-close"
          onClick={onMobileClose}
          title="Close menu"
          aria-label="Close navigation menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <button
          className="sidebar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>

        <nav className="sidebar-nav">
          <ul className="sidebar-list">
            {visibleItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems.has(item.label);
              const isActive = item.path ? location.pathname === item.path : false;
              const hasActiveChild = isChildActive(item.children);
              const isPhase = item.isPhase;
              const iconToShow = isPhase ? item.phaseIcon : item.icon;

              return (
                <li key={item.label}>
                  {isCollapsed ? (
                    /* Collapsed view - icons only */
                    item.path ? (
                      <Link
                        to={item.path}
                        className={`sidebar-item-collapsed ${isActive ? 'sidebar-item-collapsed-active' : ''}`}
                        title={item.label}
                      >
                        <span className="sidebar-icon-collapsed">
                          {iconToShow || item.label.charAt(0)}
                        </span>
                        {item.showApprovalBadge && pendingApprovalCount > 0 && (
                          <span className="sidebar-badge-collapsed">{pendingApprovalCount}</span>
                        )}
                      </Link>
                    ) : hasChildren && item.children?.[0] ? (
                      <Link
                        to={item.children[0].path}
                        className={`sidebar-item-collapsed ${hasActiveChild ? 'sidebar-item-collapsed-active' : ''}`}
                        title={item.label}
                      >
                        <span className="sidebar-icon-collapsed">
                          {iconToShow || item.label.charAt(0)}
                        </span>
                      </Link>
                    ) : (
                      <button
                        onClick={() => toggleExpand(item.label)}
                        className={`sidebar-item-collapsed ${hasActiveChild ? 'sidebar-item-collapsed-active' : ''}`}
                        title={item.label}
                      >
                        <span className="sidebar-icon-collapsed">
                          {iconToShow || item.label.charAt(0)}
                        </span>
                      </button>
                    )
                  ) : (
                    /* Expanded view - full items */
                    hasChildren ? (
                      <>
                        {/* Phase with path - clicking label navigates, arrow toggles expand */}
                        {isPhase && item.path ? (
                          <div className={`sidebar-phase-container ${hasActiveChild || location.pathname === item.path ? 'sidebar-phase-has-active-child' : ''}`}>
                            <Link
                              to={item.path}
                              className="sidebar-phase sidebar-phase-link"
                              onClick={() => {
                                // Expand this section (and collapse others) when clicking
                                if (!isExpanded) {
                                  toggleExpand(item.label);
                                }
                              }}
                            >
                              {item.phaseIcon && (
                                <span className="sidebar-phase-icon">
                                  {item.phaseIcon}
                                </span>
                              )}
                              <span className="sidebar-phase-label">{item.label}</span>
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(item.label);
                              }}
                              className="sidebar-phase-toggle"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleExpand(item.label)}
                            className={`${isPhase ? 'sidebar-phase' : 'sidebar-item'} ${hasActiveChild ? (isPhase ? 'sidebar-phase-has-active-child' : 'sidebar-item-has-active-child') : ''}`}
                          >
                            {isPhase && item.phaseIcon && (
                              <span className="sidebar-phase-icon">
                                {item.phaseIcon}
                              </span>
                            )}
                            {!isPhase && item.icon && (
                              <span className="sidebar-icon">
                                {item.icon}
                              </span>
                            )}
                            <span className={isPhase ? 'sidebar-phase-label' : 'sidebar-label'}>{item.label}</span>
                            <span className={isPhase ? 'sidebar-phase-expand-icon' : 'sidebar-expand-icon'}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </button>
                        )}
                        {isExpanded && item.children && (
                          <ul className={isPhase ? 'sidebar-phase-children' : 'sidebar-children'}>
                            {item.children.map((child) => {
                              const isChildActive = location.pathname === child.path;
                              const showIncomplete = child.isPhaseIncomplete && !child.hasRejection;
                              return (
                                <li key={child.path}>
                                  <Link
                                    to={child.path}
                                    className={`sidebar-child-item ${isChildActive ? 'sidebar-child-item-active' : ''} ${child.hasRejection ? 'sidebar-child-item-rejected' : ''} ${showIncomplete ? 'sidebar-child-item-incomplete' : ''}`}
                                  >
                                    {child.hasRejection && <span className="sidebar-rejection-icon">!</span>}
                                    {showIncomplete && <span className="sidebar-incomplete-icon">⚠</span>}
                                    <span className="sidebar-child-label">{child.label}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        to={item.path!}
                        className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                      >
                        {item.icon && (
                          <span className="sidebar-icon">
                            {item.icon}
                          </span>
                        )}
                        <span className="sidebar-label">{item.label}</span>
                        {item.showApprovalBadge && pendingApprovalCount > 0 && (
                          <span className="sidebar-badge">
                            {pendingApprovalCount}
                          </span>
                        )}
                      </Link>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <style>{`
        /* Apple HIG Sidebar - Uses UI Styles CSS variables with fallbacks */
        .sidebar {
          width: 256px;
          background: var(--sidebar-background, var(--color-systemBackground));
          border-right: 1px solid var(--sidebar-border-color, var(--color-systemGray5));
          height: calc(100vh - 82px);
          padding: var(--spacing-4, 16px) 0;
          position: fixed;
          top: 82px;
          left: 0;
          overflow-y: auto;
          z-index: 100;
          transition: width 0.3s ease;
        }

        .sidebar-collapsed {
          width: 56px;
          padding: var(--spacing-4, 16px) var(--spacing-1, 4px);
        }

        .sidebar-collapsed .sidebar-nav {
          padding: 0 4px;
        }

        .sidebar-collapsed .sidebar-list {
          align-items: center;
        }

        .sidebar-collapsed .sidebar-collapse-btn {
          position: relative;
          top: 0;
          right: 0;
          margin-bottom: 12px;
        }

        /* Collapsed item styles */
        .sidebar-item-collapsed {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          color: var(--sidebar-foreground, var(--color-label));
          text-decoration: none;
          transition: all 0.15s ease;
          border: none;
          background: none;
          cursor: pointer;
          position: relative;
        }

        .sidebar-item-collapsed:hover {
          background: var(--sidebar-item-hover-bg, var(--color-systemFill-quaternary));
        }

        .sidebar-item-collapsed-active {
          background: var(--sidebar-active-bg, var(--color-systemBlue-opacity-10, rgba(0, 122, 255, 0.1)));
          color: var(--sidebar-accent, var(--color-systemBlue));
        }

        .sidebar-icon-collapsed {
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-badge-collapsed {
          position: absolute;
          top: 2px;
          right: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 8px;
          background-color: var(--color-systemRed, #ff3b30);
          color: white;
          font-size: 10px;
          font-weight: 600;
        }

        .sidebar-collapse-btn {
          position: absolute;
          top: var(--spacing-3, 12px);
          right: var(--spacing-2, 8px);
          background: var(--color-systemGray6);
          border: 1px solid var(--color-separator);
          border-radius: 6px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          color: var(--color-grey-900);
          transition: all 0.15s ease;
          z-index: 10;
        }

        .sidebar-collapse-btn:hover {
          background: var(--sidebar-accent, var(--color-systemBlue));
          color: white;
          border-color: var(--sidebar-accent, var(--color-systemBlue));
        }

        .sidebar-nav {
          height: 100%;
          padding: 0 var(--spacing-3, 12px);
        }

        .sidebar-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-1, 4px);
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-3, 12px);
          padding: var(--spacing-2, 8px) var(--spacing-3, 12px);
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          line-height: 20px;
          color: var(--sidebar-foreground, var(--color-label));
          text-decoration: none;
          transition: all 0.15s ease;
          position: relative;
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }

        .sidebar-item:hover {
          background: var(--sidebar-item-hover-bg, var(--color-systemFill-quaternary));
        }

        .sidebar-item-active {
          background: var(--sidebar-active-bg, var(--color-systemBlue-opacity-10, rgba(0, 122, 255, 0.1)));
          color: var(--sidebar-accent, var(--color-systemBlue));
          font-weight: 600;
        }

        .sidebar-item-active:hover {
          background: var(--sidebar-active-hover-bg, var(--color-systemBlue-opacity-15, rgba(0, 122, 255, 0.15)));
        }

        .sidebar-item-has-active-child {
          color: var(--sidebar-accent, var(--color-systemBlue));
          font-weight: 600;
        }

        .sidebar-icon {
          font-size: 20px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--sidebar-foreground, var(--color-label));
        }

        .sidebar-label {
          flex: 1;
          user-select: none;
          color: var(--sidebar-foreground, var(--color-label));
        }

        .sidebar-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 10px;
          background-color: var(--color-systemRed, #ff3b30);
          color: white;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
        }

        .sidebar-expand-icon {
          font-size: 10px;
          opacity: 0.6;
          transition: transform 0.2s ease;
          color: var(--sidebar-foreground, var(--color-label));
        }

        /* Children */
        .sidebar-children {
          list-style: none;
          margin: var(--spacing-1, 4px) 0 var(--spacing-2, 8px) 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-child-item {
          display: flex;
          align-items: center;
          padding: var(--spacing-2, 8px) var(--spacing-3, 12px) var(--spacing-2, 8px) 48px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 400;
          line-height: 20px;
          color: var(--sidebar-foreground, var(--color-secondaryLabel));
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .sidebar-child-item:hover {
          background: var(--sidebar-item-hover-bg, var(--color-systemFill-quaternary));
          color: var(--sidebar-foreground, var(--color-label));
        }

        .sidebar-child-item-active {
          background: var(--sidebar-active-bg, var(--color-systemBlue-opacity-10, rgba(0, 122, 255, 0.1)));
          color: var(--sidebar-accent, var(--color-systemBlue));
          font-weight: 500;
        }

        .sidebar-child-item-active:hover {
          background: var(--sidebar-active-hover-bg, var(--color-systemBlue-opacity-15, rgba(0, 122, 255, 0.15)));
        }

        .sidebar-child-item-rejected {
          color: var(--color-systemRed, #ff3b30) !important;
          font-weight: 600;
        }

        .sidebar-child-item-rejected:hover {
          color: var(--color-systemRed, #ff3b30) !important;
          background: rgba(255, 59, 48, 0.1);
        }

        .sidebar-rejection-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-systemRed, #ff3b30);
          color: white;
          font-size: 11px;
          font-weight: 700;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .sidebar-child-item-incomplete {
          color: var(--color-systemOrange, #ff9500) !important;
          font-weight: 500;
        }

        .sidebar-child-item-incomplete:hover {
          color: var(--color-systemOrange, #ff9500) !important;
          background: rgba(255, 149, 0, 0.1);
        }

        .sidebar-incomplete-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          color: var(--color-systemOrange, #ff9500);
          font-size: 14px;
          font-weight: 700;
          margin-right: 8px;
          flex-shrink: 0;
        }

        .sidebar-child-label {
          user-select: none;
          color: var(--sidebar-foreground, var(--color-label));
        }

        /* Phase Header Styles */
        .sidebar-phase-container {
          display: flex;
          align-items: center;
          margin-top: var(--spacing-3, 12px);
          border-radius: 8px;
          transition: all 0.15s ease;
        }

        .sidebar-phase-container:first-child {
          margin-top: 0;
        }

        .sidebar-phase-container:hover {
          background: var(--sidebar-item-hover-bg, var(--color-systemFill-quaternary));
        }

        .sidebar-phase-container.sidebar-phase-has-active-child .sidebar-phase-icon {
          background: var(--sidebar-accent, var(--color-systemBlue));
          color: white;
        }

        .sidebar-phase-container.sidebar-phase-has-active-child .sidebar-phase-label {
          color: var(--sidebar-accent, var(--color-systemBlue));
        }

        .sidebar-phase-link {
          flex: 1;
          margin-top: 0 !important;
        }

        .sidebar-phase-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 8px;
          opacity: 0.6;
          color: var(--sidebar-foreground, var(--color-label));
          border-radius: 4px;
          transition: all 0.15s ease;
          margin-right: 8px;
        }

        .sidebar-phase-toggle:hover {
          opacity: 1;
          background: var(--color-systemGray5);
        }

        .sidebar-phase {
          display: flex;
          align-items: center;
          gap: var(--spacing-2, 8px);
          padding: var(--spacing-3, 12px) var(--spacing-3, 12px);
          margin-top: var(--spacing-3, 12px);
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: var(--sidebar-foreground, var(--color-secondaryLabel));
          text-decoration: none;
          transition: all 0.15s ease;
          position: relative;
          border: none;
          background: none;
          width: 100%;
          cursor: pointer;
          text-align: left;
        }

        .sidebar-phase:first-child {
          margin-top: 0;
        }

        .sidebar-phase:hover {
          background: var(--sidebar-item-hover-bg, var(--color-systemFill-quaternary));
          color: var(--sidebar-foreground, var(--color-label));
        }

        .sidebar-phase-has-active-child {
          color: var(--sidebar-accent, var(--color-systemBlue));
        }

        .sidebar-phase-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: white;
          color: black;
          font-size: 14px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .sidebar-phase-has-active-child .sidebar-phase-icon {
          background: var(--sidebar-accent, var(--color-systemBlue));
          color: white;
        }

        .sidebar-phase-label {
          flex: 1;
          user-select: none;
          color: var(--sidebar-foreground, var(--color-label));
        }

        .sidebar-phase-expand-icon {
          font-size: 8px;
          opacity: 0.6;
          transition: transform 0.2s ease;
          color: var(--sidebar-foreground, var(--color-label));
        }

        .sidebar-phase-children {
          list-style: none;
          margin: var(--spacing-1, 4px) 0 var(--spacing-2, 8px) 0;
          padding: 0 0 0 var(--spacing-2, 8px);
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-left: 2px solid var(--sidebar-border-color, var(--color-systemGray5));
          margin-left: 22px;
        }

        .sidebar-phase-children .sidebar-child-item {
          padding-left: var(--spacing-3, 12px);
        }

        /* Mobile backdrop */
        .sidebar-backdrop {
          display: none;
        }

        /* Mobile close button - hidden on desktop */
        .sidebar-mobile-close {
          display: none;
        }

        @media (max-width: 768px) {
          /* Backdrop overlay for mobile */
          .sidebar-backdrop {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 199;
            animation: fadeIn 0.3s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          /* Sidebar off-canvas by default on mobile */
          .sidebar {
            width: 280px;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 200;
            top: 0;
            height: 100vh;
            padding-top: var(--spacing-6, 24px);
          }

          /* Sidebar visible when open */
          .sidebar.sidebar-mobile-open {
            transform: translateX(0);
          }

          /* Force expanded mode on mobile (no collapsed state) */
          .sidebar.sidebar-collapsed {
            width: 280px;
            transform: translateX(-100%);
          }

          .sidebar.sidebar-collapsed.sidebar-mobile-open {
            transform: translateX(0);
          }

          /* Hide desktop collapse button on mobile */
          .sidebar-collapse-btn {
            display: none;
          }

          /* Show mobile close button */
          .sidebar-mobile-close {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: var(--spacing-3, 12px);
            right: var(--spacing-3, 12px);
            width: 36px;
            height: 36px;
            border: none;
            background: var(--color-systemFill-quaternary, rgba(120, 120, 128, 0.08));
            border-radius: 50%;
            cursor: pointer;
            color: var(--color-label, #000);
            transition: background 0.2s ease;
            z-index: 10;
          }

          .sidebar-mobile-close:hover {
            background: var(--color-systemFill, rgba(120, 120, 128, 0.2));
          }

          .sidebar-item {
            font-size: 15px;
            padding: var(--spacing-3, 12px) var(--spacing-3, 12px);
          }

          .sidebar-icon {
            font-size: 20px;
            width: 24px;
            height: 24px;
          }

          .sidebar-child-item {
            font-size: 14px;
            padding: var(--spacing-2, 8px) var(--spacing-3, 12px) var(--spacing-2, 8px) 44px;
          }

          .sidebar-phase {
            font-size: 12px;
            padding: var(--spacing-3, 12px);
          }

          .sidebar-phase-children .sidebar-child-item {
            padding-left: var(--spacing-4, 16px);
          }
        }
      `}</style>
    </>
  );
};
