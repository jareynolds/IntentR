import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../api/client';
import { Card } from '../components';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { RoleManagement } from '../components/RoleManagement';
import { Settings } from './Settings';
import { Integrations } from './Integrations';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isActive: boolean;
}

interface CreateUserForm {
  email: string;
  password: string;
  name: string;
  role: string;
}

interface EditUserForm {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
  isActive?: boolean;
}

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

// Helper function to display role names
const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'product_owner': 'Product Owner',
    'designer': 'Designer',
    'engineer': 'Engineer',
    'devops': 'DevOps',
    'admin': 'Administrator',
  };
  return roleMap[role] || role;
};

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'integrations' | 'settings'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordForm>({
    newPassword: '',
    confirmPassword: '',
  });

  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    name: '',
    role: 'engineer',
  });

  const [editForm, setEditForm] = useState<Partial<EditUserForm>>({});

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authClient.get('/api/users');
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await authClient.post('/api/users', createForm);
      setSuccess('User created successfully');
      setShowCreateForm(false);
      setCreateForm({ email: '', password: '', name: '', role: 'engineer' });
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: number) => {
    try {
      setError(null);
      // Only send fields that have values
      const updateData: any = {};
      if (editForm.email) updateData.email = editForm.email;
      if (editForm.password) updateData.password = editForm.password;
      if (editForm.name) updateData.name = editForm.name;
      if (editForm.role) updateData.role = editForm.role;
      if (editForm.isActive !== undefined) updateData.isActive = editForm.isActive;

      await authClient.put(`/api/users/${userId}`, updateData);
      setSuccess('User updated successfully');
      setEditingUser(null);
      setEditForm({});
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      setError(null);
      await authClient.delete(`/api/users/${userId}`);
      setSuccess('User deleted successfully');
      fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const openResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
  };

  const closeResetPassword = () => {
    setResetPasswordUser(null);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (resetPasswordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError(null);
      await authClient.put(`/api/users/${resetPasswordUser.id}`, {
        password: resetPasswordForm.newPassword,
      });
      setSuccess(`Password reset successfully for ${resetPasswordUser.name}`);
      closeResetPassword();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div>
        <h1>Access Denied</h1>
        <Alert variant="error" message="You do not have permission to access this page." />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Admin Panel</h1>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--color-grey-200)',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'users' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'users' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'users' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'roles' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'roles' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'roles' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          Role Management
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'integrations' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'integrations' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'integrations' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          Integrations
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'settings' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'settings' ? 'white' : 'var(--color-grey-700)',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'settings' ? '2px solid var(--color-primary)' : 'none',
            marginBottom: '-2px'
          }}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>User Management</h2>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? 'Cancel' : 'Create New User'}
            </Button>
          </div>

          {error && <Alert variant="error" message={error} />}
          {success && <Alert variant="success" message={success} />}

      {showCreateForm && (
        <Card style={{ marginBottom: '20px' }}>
          <h2>Create New User</h2>
          <form onSubmit={handleCreateUser}>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label htmlFor="create-email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                <input
                  id="create-email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                />
              </div>
              <div>
                <label htmlFor="create-password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
                <input
                  id="create-password"
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                />
              </div>
              <div>
                <label htmlFor="create-name" style={{ display: 'block', marginBottom: '5px' }}>Name</label>
                <input
                  id="create-name"
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                />
              </div>
              <div>
                <label htmlFor="create-role" style={{ display: 'block', marginBottom: '5px' }}>Role</label>
                <select
                  id="create-role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                >
                  <option value="product_owner">Product Owner</option>
                  <option value="designer">Designer</option>
                  <option value="engineer">Engineer</option>
                  <option value="devops">DevOps</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <Card>
          <h2>All Users</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-grey-300)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Email</th>
                  <th style={{ padding: '10px' }}>Name</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Last Login</th>
                  <th style={{ padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-grey-200)' }}>
                    {editingUser === user.id ? (
                      <>
                        <td style={{ padding: '10px' }}>{user.id}</td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <select
                            value={editForm.role || 'engineer'}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                          >
                            <option value="product_owner">Product Owner</option>
                            <option value="designer">Designer</option>
                            <option value="engineer">Engineer</option>
                            <option value="devops">DevOps</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <select
                            value={editForm.isActive ? 'active' : 'inactive'}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'active' })}
                            style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-grey-300)' }}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <Button size="small" onClick={() => handleUpdateUser(user.id)}>Save</Button>
                            <Button size="small" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px' }}>{user.id}</td>
                        <td style={{ padding: '10px' }}>{user.email}</td>
                        <td style={{ padding: '10px' }}>{user.name}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: user.role === 'admin' ? 'var(--color-primary-100)' : 'var(--color-grey-200)',
                            color: user.role === 'admin' ? 'var(--color-primary-800)' : 'var(--color-grey-800)',
                          }}>
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: user.isActive ? 'var(--color-success-100)' : 'var(--color-error-100)',
                            color: user.isActive ? 'var(--color-success-800)' : 'var(--color-error-800)',
                          }}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <Button size="small" onClick={() => startEditUser(user)}>Edit</Button>
                            <Button
                              size="small"
                              variant="secondary"
                              onClick={() => openResetPassword(user)}
                            >
                              Reset Password
                            </Button>
                            <Button
                              size="small"
                              variant="secondary"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </>
    ) : activeTab === 'roles' ? (
      <RoleManagement />
    ) : activeTab === 'integrations' ? (
      <Integrations />
    ) : activeTab === 'settings' ? (
      <Settings />
    ) : null}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
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
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface, white)',
            borderRadius: '8px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
              Reset Password for {resetPasswordUser.name}
            </h3>
            <p style={{ color: 'var(--color-grey-600)', marginBottom: '20px', fontSize: '14px' }}>
              Enter a new password for <strong>{resetPasswordUser.email}</strong>
            </p>
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="new-password" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordForm.newPassword}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-grey-300)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-grey-300)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Re-enter password"
                />
              </div>
              {resetPasswordForm.newPassword && resetPasswordForm.confirmPassword &&
                resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword && (
                <p style={{ color: 'var(--color-error)', fontSize: '13px', marginBottom: '16px' }}>
                  Passwords do not match
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" variant="secondary" onClick={closeResetPassword}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword ||
                    resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword}
                >
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
