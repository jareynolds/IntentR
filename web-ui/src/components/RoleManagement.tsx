import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Alert } from './Alert';
import type { AccessLevel, RoleType, PageAccess, RoleDefinition } from '../context/RoleAccessContext';

// Re-export types for convenience
export type { AccessLevel, RoleType, PageAccess, RoleDefinition };

// Define all pages and subpages in the application
const DEFAULT_PAGES: Omit<PageAccess, 'accessLevel'>[] = [
  { pageName: 'Dashboard', path: '/' },
  {
    pageName: 'Workspaces',
    path: '/workspaces-parent',
    subPages: [
      { pageName: 'Workspace Settings', path: '/workspaces' },
      { pageName: 'Designs', path: '/designs' },
      { pageName: 'Ideation', path: '/ideation' },
      { pageName: 'Storyboard', path: '/storyboard' },
      { pageName: 'UI Design', path: '/system' },
      { pageName: 'Capabilities', path: '/capabilities' },
      { pageName: 'AI Principles', path: '/ai-principles' },
      { pageName: 'UI Framework', path: '/ui-framework' },
      { pageName: 'UI Styles', path: '/ui-styles' },
      { pageName: 'AI Assistant', path: '/ai-chat' },
    ]
  },
  { pageName: 'Integrations', path: '/integrations' },
  { pageName: 'Settings', path: '/settings' },
  { pageName: 'Admin Panel', path: '/admin' },
];

// Default role configurations
const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    roleType: 'Product Owner',
    description: 'Manages product vision, requirements, and priorities',
    pages: DEFAULT_PAGES.map(page => ({
      ...page,
      accessLevel: 'edit' as AccessLevel,
      subPages: page.subPages?.map(sub => ({ ...sub, accessLevel: 'edit' as AccessLevel }))
    }))
  },
  {
    roleType: 'Designer',
    description: 'Designs user interfaces and user experiences',
    pages: DEFAULT_PAGES.map(page => ({
      ...page,
      accessLevel: page.pageName === 'Admin Panel' ? 'hidden' : 'edit' as AccessLevel,
      subPages: page.subPages?.map(sub => ({ ...sub, accessLevel: 'edit' as AccessLevel }))
    }))
  },
  {
    roleType: 'Engineer',
    description: 'Implements features and maintains code quality',
    pages: DEFAULT_PAGES.map(page => ({
      ...page,
      accessLevel: page.pageName === 'Admin Panel' ? 'hidden' : 'view' as AccessLevel,
      subPages: page.subPages?.map(sub => ({
        ...sub,
        accessLevel: ['Capabilities', 'UI Design'].includes(sub.pageName) ? 'edit' : 'view' as AccessLevel
      }))
    }))
  },
  {
    roleType: 'DevOps',
    description: 'Manages infrastructure, deployments, and operations',
    pages: DEFAULT_PAGES.map(page => ({
      ...page,
      accessLevel: page.pageName === 'Admin Panel' ? 'view' :
                   ['Integrations', 'Settings'].includes(page.pageName) ? 'edit' : 'view' as AccessLevel,
      subPages: page.subPages?.map(sub => ({
        ...sub,
        accessLevel: ['UI Design', 'Integrations'].includes(sub.pageName) ? 'edit' : 'view' as AccessLevel
      }))
    }))
  },
  {
    roleType: 'Administrator',
    description: 'Full system access and user management',
    pages: DEFAULT_PAGES.map(page => ({
      ...page,
      accessLevel: 'edit' as AccessLevel,
      subPages: page.subPages?.map(sub => ({ ...sub, accessLevel: 'edit' as AccessLevel }))
    }))
  },
];

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLE_DEFINITIONS);
  const [selectedRole, setSelectedRole] = useState<RoleType>('Product Owner');
  const [hasChanges, setHasChanges] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved roles from localStorage on mount, or save defaults if none exist
  useEffect(() => {
    const savedRoles = localStorage.getItem('roleDefinitions');
    if (savedRoles) {
      try {
        setRoles(JSON.parse(savedRoles));
      } catch (e) {
        console.error('Failed to load role definitions', e);
        // If there's an error, save defaults
        localStorage.setItem('roleDefinitions', JSON.stringify(DEFAULT_ROLE_DEFINITIONS));
      }
    } else {
      // No saved roles, save defaults
      localStorage.setItem('roleDefinitions', JSON.stringify(DEFAULT_ROLE_DEFINITIONS));
    }
  }, []);

  const currentRole = roles.find(r => r.roleType === selectedRole);

  const updateAccessLevel = (pagePath: string, newLevel: AccessLevel, isSubPage: boolean = false, parentPath?: string) => {
    setRoles(prevRoles => {
      const updated = prevRoles.map(role => {
        if (role.roleType !== selectedRole) return role;

        return {
          ...role,
          pages: role.pages.map(page => {
            if (isSubPage && page.path === parentPath && page.subPages) {
              return {
                ...page,
                subPages: page.subPages.map(sub =>
                  sub.path === pagePath ? { ...sub, accessLevel: newLevel } : sub
                )
              };
            } else if (!isSubPage && page.path === pagePath) {
              return { ...page, accessLevel: newLevel };
            }
            return page;
          })
        };
      });
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      localStorage.setItem('roleDefinitions', JSON.stringify(roles));
      setSuccess('Role permissions saved successfully');
      setHasChanges(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError('Failed to save role permissions');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all roles to default settings? This cannot be undone.')) {
      setRoles(DEFAULT_ROLE_DEFINITIONS);
      localStorage.removeItem('roleDefinitions');
      setHasChanges(false);
      setSuccess('Roles reset to default settings');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const getAccessLevelColor = (level: AccessLevel) => {
    switch (level) {
      case 'edit': return 'var(--color-success, #10b981)';
      case 'view': return 'var(--color-warning, #f59e0b)';
      case 'hidden': return 'var(--color-grey-400, #9ca3af)';
    }
  };

  const getAccessLevelBg = (level: AccessLevel) => {
    switch (level) {
      case 'edit': return 'var(--color-success-100, #d1fae5)';
      case 'view': return 'var(--color-warning-100, #fef3c7)';
      case 'hidden': return 'var(--color-grey-100, #f3f4f6)';
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1>Role Management</h1>
        <p style={{ color: 'var(--color-grey-600)', marginTop: '8px' }}>
          Define access permissions for each role across all pages and subpages
        </p>
      </div>

      {error && <Alert variant="error" message={error} />}
      {success && <Alert variant="success" message={success} />}

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Save Changes
        </Button>
        <Button
          variant="secondary"
          onClick={handleReset}
        >
          Reset to Defaults
        </Button>
      </div>

      {/* Role Selector */}
      <Card style={{ marginBottom: '20px' }}>
        <h2>Select Role</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '15px' }}>
          {roles.map(role => (
            <button
              key={role.roleType}
              onClick={() => setSelectedRole(role.roleType)}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: selectedRole === role.roleType
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-grey-300)',
                background: selectedRole === role.roleType
                  ? 'var(--color-primary-50, #eff6ff)'
                  : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                fontWeight: 600,
                marginBottom: '4px',
                color: selectedRole === role.roleType ? 'var(--color-primary)' : 'inherit'
              }}>
                {role.roleType}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-grey-600)' }}>
                {role.description}
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Access Level Legend */}
      <Card style={{ marginBottom: '20px' }}>
        <h3>Access Levels</h3>
        <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: getAccessLevelBg('edit'),
              border: `2px solid ${getAccessLevelColor('edit')}`
            }} />
            <span><strong>Edit:</strong> Full access to view and modify</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: getAccessLevelBg('view'),
              border: `2px solid ${getAccessLevelColor('view')}`
            }} />
            <span><strong>View:</strong> Read-only access</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              background: getAccessLevelBg('hidden'),
              border: `2px solid ${getAccessLevelColor('hidden')}`
            }} />
            <span><strong>Hidden:</strong> No access</span>
          </div>
        </div>
      </Card>

      {/* Page Permissions Table */}
      {currentRole && (
        <Card>
          <h2>{currentRole.roleType} - Page Permissions</h2>
          <p style={{ color: 'var(--color-grey-600)', marginTop: '4px', marginBottom: '16px' }}>
            {currentRole.description}
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '15px'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '2px solid var(--color-grey-300)',
                  textAlign: 'left',
                  background: 'var(--color-grey-50)'
                }}>
                  <th style={{ padding: '12px', fontWeight: 600 }}>Page / Subpage</th>
                  <th style={{ padding: '12px', fontWeight: 600, textAlign: 'center' }}>Edit</th>
                  <th style={{ padding: '12px', fontWeight: 600, textAlign: 'center' }}>View</th>
                  <th style={{ padding: '12px', fontWeight: 600, textAlign: 'center' }}>Hidden</th>
                </tr>
              </thead>
              <tbody>
                {currentRole.pages.map(page => (
                  <React.Fragment key={page.path}>
                    {/* Parent Page */}
                    <tr style={{ borderBottom: '1px solid var(--color-grey-200)' }}>
                      <td style={{
                        padding: '12px',
                        fontWeight: 600,
                        background: page.subPages ? 'var(--color-grey-50)' : 'transparent'
                      }}>
                        {page.pageName}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="radio"
                          name={`access-${page.path}`}
                          checked={page.accessLevel === 'edit'}
                          onChange={() => updateAccessLevel(page.path, 'edit')}
                          style={{
                            cursor: 'pointer',
                            width: '18px',
                            height: '18px',
                            accentColor: getAccessLevelColor('edit')
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="radio"
                          name={`access-${page.path}`}
                          checked={page.accessLevel === 'view'}
                          onChange={() => updateAccessLevel(page.path, 'view')}
                          style={{
                            cursor: 'pointer',
                            width: '18px',
                            height: '18px',
                            accentColor: getAccessLevelColor('view')
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="radio"
                          name={`access-${page.path}`}
                          checked={page.accessLevel === 'hidden'}
                          onChange={() => updateAccessLevel(page.path, 'hidden')}
                          style={{
                            cursor: 'pointer',
                            width: '18px',
                            height: '18px',
                            accentColor: getAccessLevelColor('hidden')
                          }}
                        />
                      </td>
                    </tr>

                    {/* Sub Pages */}
                    {page.subPages?.map(subPage => (
                      <tr key={subPage.path} style={{ borderBottom: '1px solid var(--color-grey-200)' }}>
                        <td style={{
                          padding: '12px',
                          paddingLeft: '40px',
                          color: 'var(--color-grey-700)'
                        }}>
                          <span style={{ marginRight: '8px', color: 'var(--color-grey-400)' }}>└</span>
                          {subPage.pageName}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input
                            type="radio"
                            name={`access-${subPage.path}`}
                            checked={subPage.accessLevel === 'edit'}
                            onChange={() => updateAccessLevel(subPage.path, 'edit', true, page.path)}
                            style={{
                              cursor: 'pointer',
                              width: '18px',
                              height: '18px',
                              accentColor: getAccessLevelColor('edit')
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input
                            type="radio"
                            name={`access-${subPage.path}`}
                            checked={subPage.accessLevel === 'view'}
                            onChange={() => updateAccessLevel(subPage.path, 'view', true, page.path)}
                            style={{
                              cursor: 'pointer',
                              width: '18px',
                              height: '18px',
                              accentColor: getAccessLevelColor('view')
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <input
                            type="radio"
                            name={`access-${subPage.path}`}
                            checked={subPage.accessLevel === 'hidden'}
                            onChange={() => updateAccessLevel(subPage.path, 'hidden', true, page.path)}
                            style={{
                              cursor: 'pointer',
                              width: '18px',
                              height: '18px',
                              accentColor: getAccessLevelColor('hidden')
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {hasChanges && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'var(--color-warning-100)',
          border: '2px solid var(--color-warning)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1000
        }}>
          <span style={{ fontWeight: 600 }}>You have unsaved changes</span>
          <Button size="small" onClick={handleSave}>Save Now</Button>
        </div>
      )}
    </div>
  );
};
