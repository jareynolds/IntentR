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
}

export const Sidebar: React.FC<SidebarProps> = ({ items }) => {
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
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const isChildActive = (children: SidebarChildItem[] | undefined) => {
    if (!children) return false;
    return children.some(child => location.pathname === child.path);
  };

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>

        {!isCollapsed && (
          <nav className="sidebar-nav">
            <ul className="sidebar-list">
            {visibleItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems.has(item.label);
              const isActive = item.path ? location.pathname === item.path : false;
              const hasActiveChild = isChildActive(item.children);
              const isPhase = item.isPhase;

              return (
                <li key={item.label}>
                  {hasChildren ? (
                    <>
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
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        )}
      </aside>

      <style>{`
        /* Apple HIG Sidebar */
        .sidebar {
          width: 256px;
          background: var(--color-systemBackground);
          border-right: 1px solid var(--color-systemGray5);
          min-height: calc(100vh - 80px);
          padding: var(--spacing-4, 16px) 0;
          position: sticky;
          top: 73px;
          transition: width 0.3s ease;
        }

        .sidebar-collapsed {
          width: 48px;
          padding: var(--spacing-4, 16px) var(--spacing-1, 4px);
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
          color: var(--color-label);
          transition: all 0.15s ease;
          z-index: 10;
        }

        .sidebar-collapse-btn:hover {
          background: var(--color-systemBlue);
          color: white;
          border-color: var(--color-systemBlue);
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
          color: var(--color-label);
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
          background: var(--color-systemFill-quaternary);
        }

        .sidebar-item-active {
          background: var(--color-systemBlue-opacity-10, rgba(0, 122, 255, 0.1));
          color: var(--color-systemBlue);
          font-weight: 600;
        }

        .sidebar-item-active:hover {
          background: var(--color-systemBlue-opacity-15, rgba(0, 122, 255, 0.15));
        }

        .sidebar-item-has-active-child {
          color: var(--color-systemBlue);
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
        }

        .sidebar-label {
          flex: 1;
          user-select: none;
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
          color: var(--color-secondaryLabel);
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .sidebar-child-item:hover {
          background: var(--color-systemFill-quaternary);
          color: var(--color-label);
        }

        .sidebar-child-item-active {
          background: var(--color-systemBlue-opacity-10, rgba(0, 122, 255, 0.1));
          color: var(--color-systemBlue);
          font-weight: 500;
        }

        .sidebar-child-item-active:hover {
          background: var(--color-systemBlue-opacity-15, rgba(0, 122, 255, 0.15));
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
        }

        /* Phase Header Styles */
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
          color: var(--color-secondaryLabel);
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
          background: var(--color-systemFill-quaternary);
          color: var(--color-label);
        }

        .sidebar-phase-has-active-child {
          color: var(--color-systemBlue);
        }

        .sidebar-phase-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-systemGray5);
          color: var(--color-label);
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .sidebar-phase-has-active-child .sidebar-phase-icon {
          background: var(--color-systemBlue);
          color: white;
        }

        .sidebar-phase-label {
          flex: 1;
          user-select: none;
        }

        .sidebar-phase-expand-icon {
          font-size: 8px;
          opacity: 0.6;
          transition: transform 0.2s ease;
        }

        .sidebar-phase-children {
          list-style: none;
          margin: var(--spacing-1, 4px) 0 var(--spacing-2, 8px) 0;
          padding: 0 0 0 var(--spacing-2, 8px);
          display: flex;
          flex-direction: column;
          gap: 2px;
          border-left: 2px solid var(--color-systemGray5);
          margin-left: 22px;
        }

        .sidebar-phase-children .sidebar-child-item {
          padding-left: var(--spacing-3, 12px);
        }

        /* Apple HIG Dark Mode Support */
        @media (prefers-color-scheme: dark) {
          .sidebar {
            background: var(--color-systemBackground);
            border-right-color: var(--color-systemGray6);
          }

          .sidebar-item {
            color: var(--color-label);
          }

          .sidebar-item:hover {
            background: var(--color-systemFill-quaternary);
          }

          .sidebar-item-active {
            background: var(--color-systemBlue-opacity-10, rgba(10, 132, 255, 0.15));
            color: var(--color-systemBlue);
          }

          .sidebar-child-item {
            color: var(--color-secondaryLabel);
          }

          .sidebar-child-item:hover {
            background: var(--color-systemFill-quaternary);
            color: var(--color-label);
          }

          .sidebar-child-item-active {
            background: var(--color-systemBlue-opacity-10, rgba(10, 132, 255, 0.15));
            color: var(--color-systemBlue);
          }

          .sidebar-phase {
            color: var(--color-secondaryLabel);
          }

          .sidebar-phase:hover {
            background: var(--color-systemFill-quaternary);
            color: var(--color-label);
          }

          .sidebar-phase-icon {
            background: var(--color-systemGray4);
          }

          .sidebar-phase-children {
            border-left-color: var(--color-systemGray4);
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 200px;
          }

          .sidebar-item {
            font-size: 14px;
            padding: var(--spacing-2, 8px) var(--spacing-2, 8px);
          }

          .sidebar-icon {
            font-size: 18px;
            width: 20px;
            height: 20px;
          }

          .sidebar-child-item {
            font-size: 13px;
            padding-left: 40px;
          }
        }
      `}</style>
    </>
  );
};
