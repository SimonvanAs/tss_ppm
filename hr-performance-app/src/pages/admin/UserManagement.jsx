import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

const ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'];

function RoleBadge({ role }) {
  const roleClass = {
    EMPLOYEE: 'role-badge-employee',
    MANAGER: 'role-badge-manager',
    HR: 'role-badge-hr',
    OPCO_ADMIN: 'role-badge-opco-admin',
    TSS_SUPER_ADMIN: 'role-badge-super-admin',
  }[role] || 'role-badge-employee';

  return <span className={`role-badge ${roleClass}`}>{role}</span>;
}

function UserModal({ user, managers, functionTitles, tovLevels, onSave, onClose, t }) {
  const [formData, setFormData] = useState({
    role: user?.role || 'EMPLOYEE',
    managerId: user?.managerId || '',
    functionTitleId: user?.functionTitleId || '',
    tovLevelId: user?.tovLevelId || '',
    isActive: user?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [autoLevelApplied, setAutoLevelApplied] = useState(false);

  // Handle function title change - auto-populate TOV level if mapped
  const handleFunctionTitleChange = (functionTitleId) => {
    const selectedTitle = functionTitles.find(ft => ft.id === functionTitleId);
    const newFormData = { ...formData, functionTitleId };

    // If function title has a mapped TOV level, auto-apply it
    if (selectedTitle?.tovLevelId) {
      newFormData.tovLevelId = selectedTitle.tovLevelId;
      setAutoLevelApplied(true);
    } else {
      setAutoLevelApplied(false);
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(user.id, formData);
      onClose();
    } catch (err) {
      console.error('Failed to save user:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="admin-modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={-1}
      aria-label="Close modal"
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="admin-modal"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
      >
        <div className="admin-modal-header">
          <h3 id="edit-user-title" className="admin-modal-title">
            {t('admin.users.editUser')}: {user?.firstName} {user?.lastName}
          </h3>
          <button className="admin-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.users.email')}</label>
              <input
                type="email"
                className="admin-form-input"
                value={user?.email || ''}
                disabled
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.users.role')}</label>
              <select
                className="admin-form-select"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.users.manager')}</label>
              <select
                className="admin-form-select"
                value={formData.managerId}
                onChange={e => setFormData({ ...formData, managerId: e.target.value })}
              >
                <option value="">{t('admin.users.noManager')}</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.users.functionTitle')}</label>
              <select
                className="admin-form-select"
                value={formData.functionTitleId}
                onChange={e => handleFunctionTitleChange(e.target.value)}
              >
                <option value="">{t('admin.users.noFunction')}</option>
                {functionTitles.map(ft => (
                  <option key={ft.id} value={ft.id}>
                    {ft.name}
                    {ft.tovLevel ? ` → ${ft.tovLevel.code}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                {t('admin.users.tovLevel')}
                {autoLevelApplied && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#28a745', fontWeight: 'normal' }}>
                    ({t('admin.users.autoApplied')})
                  </span>
                )}
              </label>
              <select
                className="admin-form-select"
                value={formData.tovLevelId}
                onChange={e => {
                  setFormData({ ...formData, tovLevelId: e.target.value });
                  setAutoLevelApplied(false);
                }}
              >
                <option value="">{t('admin.users.noLevel')}</option>
                {tovLevels.map(tl => (
                  <option key={tl.id} value={tl.id}>
                    {tl.code} - {tl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                />
                {t('admin.users.active')}
              </label>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserManagement() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [functionTitles, setFunctionTitles] = useState([]);
  const [tovLevels, setTovLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, functionTitlesData, tovLevelsData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getFunctionTitles(),
        adminApi.getTovLevels(),
      ]);

      setUsers(usersData);
      setFunctionTitles(functionTitlesData);
      setTovLevels(tovLevelsData);

      // Filter managers from users
      const managerUsers = usersData.filter(u =>
        ['MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'].includes(u.role)
      );
      setManagers(managerUsers);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (userId, data) => {
    await adminApi.updateUser(userId, data);
    await loadData();
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !search ||
      user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());

    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner" />
        {t('common.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <div className="admin-empty">
          <div className="admin-empty-title">{t('admin.users.error')}</div>
          <div className="admin-empty-text">{error}</div>
          <button className="admin-btn admin-btn-primary" onClick={loadData}>
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('admin.users.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.users.subtitle')}</p>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <svg className="admin-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder={t('admin.users.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">{t('admin.users.allRoles')}</option>
          {ROLES.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">{t('admin.users.allStatuses')}</option>
          <option value="active">{t('admin.users.activeOnly')}</option>
          <option value="inactive">{t('admin.users.inactiveOnly')}</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="admin-card">
        {filteredUsers.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
            <div className="admin-empty-title">{t('admin.users.noUsers')}</div>
            <div className="admin-empty-text">{t('admin.users.noUsersDesc')}</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.users.name')}</th>
                <th>{t('admin.users.email')}</th>
                <th>{t('admin.users.role')}</th>
                <th>{t('admin.users.manager')}</th>
                <th>{t('admin.users.functionTitle')}</th>
                <th>{t('admin.users.status')}</th>
                <th>{t('admin.users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.firstName} {user.lastName}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td><RoleBadge role={user.role} /></td>
                  <td>
                    {user.manager ? (
                      `${user.manager.firstName} ${user.manager.lastName}`
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    {user.functionTitle?.name || (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    <span className={`admin-badge ${user.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                      {user.isActive ? t('admin.users.active') : t('admin.users.inactive')}
                    </span>
                  </td>
                  <td>
                    <button
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => setEditingUser(user)}
                    >
                      {t('admin.users.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <UserModal
          user={editingUser}
          managers={managers.filter(m => m.id !== editingUser.id)}
          functionTitles={functionTitles}
          tovLevels={tovLevels}
          onSave={handleSaveUser}
          onClose={() => setEditingUser(null)}
          t={t}
        />
      )}
    </div>
  );
}
