import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi } from '../../services/api';

function TeamModal({ team, businessUnits, users, teamTypes, onSave, onClose, t }) {
  const [formData, setFormData] = useState({
    businessUnitId: team?.businessUnit?.id || team?.businessUnitId || '',
    code: team?.code || '',
    name: team?.name || '',
    description: team?.description || '',
    teamType: team?.teamType || '',
    managerId: team?.manager?.id || team?.managerId || '',
    sortOrder: team?.sortOrder || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(t('admin.teams.nameRequired'));
      return;
    }
    if (!formData.code.trim()) {
      setError(t('admin.teams.codeRequired'));
      return;
    }
    if (!formData.businessUnitId) {
      setError(t('admin.teams.buRequired'));
      return;
    }
    if (!formData.teamType) {
      setError(t('admin.teams.typeRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const dataToSave = {
        ...formData,
        managerId: formData.managerId || null,
      };
      await onSave(dataToSave);
      onClose();
    } catch (err) {
      setError(err.message);
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
      <div
        className="admin-modal"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
      >
        <div className="admin-modal-header">
          <h3 id="team-modal-title" className="admin-modal-title">
            {team ? t('admin.teams.edit') : t('admin.teams.create')}
          </h3>
          <button className="admin-modal-close" onClick={onClose} aria-label={t('common.close')}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            {error && (
              <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.teams.businessUnit')} *</label>
              <select
                className="admin-form-select"
                value={formData.businessUnitId}
                onChange={e => setFormData({ ...formData, businessUnitId: e.target.value })}
                disabled={!!team}
              >
                <option value="">{t('admin.teams.selectBusinessUnit')}</option>
                {businessUnits.map(bu => (
                  <option key={bu.id} value={bu.id}>
                    {bu.name} ({bu.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.teams.code')} *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder={t('admin.teams.codePlaceholder')}
                  maxLength={10}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">{t('admin.teams.type')} *</label>
                <select
                  className="admin-form-select"
                  value={formData.teamType}
                  onChange={e => {
                    const type = e.target.value;
                    const typeName = teamTypes.find(tt => tt.code === type)?.name || '';
                    setFormData({
                      ...formData,
                      teamType: type,
                      code: type || formData.code,
                      name: typeName || formData.name,
                    });
                  }}
                >
                  <option value="">{t('admin.teams.selectTeamType')}</option>
                  {teamTypes.map(tt => (
                    <option key={tt.code} value={tt.code}>
                      {tt.code} - {t(`admin.teams.teamTypes.${tt.code}`) || tt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.teams.name')} *</label>
              <input
                type="text"
                className="admin-form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.teams.namePlaceholder')}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.functionTitles.description')}</label>
              <textarea
                className="admin-form-textarea"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('admin.teams.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.teams.manager')}</label>
              <select
                className="admin-form-select"
                value={formData.managerId}
                onChange={e => setFormData({ ...formData, managerId: e.target.value })}
              >
                <option value="">{t('admin.teams.selectManager')}</option>
                {users.filter(u => u.role === 'MANAGER' || u.role === 'HR' || u.role === 'OPCO_ADMIN').map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">{t('admin.teams.sortOrder')}</label>
              <input
                type="number"
                className="admin-form-input"
                value={formData.sortOrder}
                onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                min={0}
              />
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

function CreateStandardTeamsModal({ businessUnits, onConfirm, onClose, t }) {
  const [selectedBU, setSelectedBU] = useState('');
  const [includeMA, setIncludeMA] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!selectedBU) {
      setError(t('admin.teams.buRequired'));
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await onConfirm(selectedBU, includeMA);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
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
      <div
        className="admin-modal"
        style={{ maxWidth: '500px' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="standard-teams-modal-title"
      >
        <div className="admin-modal-header">
          <h3 id="standard-teams-modal-title" className="admin-modal-title">
            {t('admin.teams.createStandard')}
          </h3>
          <button className="admin-modal-close" onClick={onClose} aria-label={t('common.close')}>&times;</button>
        </div>

        <div className="admin-modal-body">
          {error && (
            <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <p style={{ marginBottom: '16px', color: '#666' }}>
            {t('admin.teams.createStandardDesc')}
          </p>

          <div className="admin-form-group">
            <label className="admin-form-label">{t('admin.teams.businessUnit')} *</label>
            <select
              className="admin-form-select"
              value={selectedBU}
              onChange={e => setSelectedBU(e.target.value)}
            >
              <option value="">{t('admin.teams.selectBusinessUnit')}</option>
              {businessUnits.map(bu => (
                <option key={bu.id} value={bu.id}>
                  {bu.name} ({bu.code})
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeMA}
                onChange={e => setIncludeMA(e.target.checked)}
              />
              {t('admin.teams.includeMA')}
            </label>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSubmit}
            disabled={creating || !selectedBU}
          >
            {creating ? t('common.creating') : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, t }) {
  return (
    <div
      className="admin-modal-overlay"
      onClick={onCancel}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      role="button"
      tabIndex={-1}
      aria-label="Close dialog"
    >
      <div
        className="admin-modal"
        style={{ maxWidth: '400px' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="admin-modal-header">
          <h3 id="confirm-dialog-title" className="admin-modal-title">{title}</h3>
          <button className="admin-modal-close" onClick={onCancel} aria-label={t('common.close')}>&times;</button>
        </div>
        <div className="admin-modal-body">
          <p>{message}</p>
        </div>
        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className="admin-btn admin-btn-danger" onClick={onConfirm}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TeamsManagement() {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('OPCO_ADMIN') || hasRole('TSS_SUPER_ADMIN');

  const [teams, setTeams] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [teamTypes, setTeamTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBU, setSelectedBU] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStandardModal, setShowStandardModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedBU]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamsRes, busRes, usersRes, typesRes] = await Promise.all([
        adminApi.getTeams(selectedBU || null),
        adminApi.getBusinessUnits(),
        adminApi.getUsers(),
        adminApi.getTeamTypes(),
      ]);

      setTeams(teamsRes || []);
      setBusinessUnits(busRes || []);
      setUsers(usersRes || []);
      setTeamTypes(typesRes || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(t('admin.teams.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeam = async (data) => {
    if (editingTeam) {
      await adminApi.updateTeam(editingTeam.id, data);
    } else {
      await adminApi.createTeam(data);
    }
    loadData();
    setEditingTeam(null);
  };

  const handleDelete = async (team) => {
    if (team._count?.members > 0) {
      setError(t('admin.teams.deleteBlockedMembers', { count: team._count.members }));
      return;
    }
    setDeleteConfirm(team);
  };

  const confirmDelete = async () => {
    try {
      await adminApi.deleteTeam(deleteConfirm.id);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      setError(err.message);
      setDeleteConfirm(null);
    }
  };

  const handleCreateStandardTeams = async (businessUnitId, includeMA) => {
    const result = await adminApi.createStandardTeams(businessUnitId, includeMA);
    setSuccessMessage(
      `${t('admin.teams.standardCreated', { count: result.created })}. ${t('admin.teams.standardSkipped', { count: result.skipped })}`
    );
    setTimeout(() => setSuccessMessage(null), 5000);
    loadData();
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = !searchTerm ||
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.manager?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.manager?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 className="admin-page-title">{t('admin.teams.title')}</h1>
          <p className="admin-page-subtitle">{t('admin.teams.subtitle')}</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => setShowStandardModal(true)}
            >
              {t('admin.teams.createStandard')}
            </button>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => {
                setEditingTeam(null);
                setShowModal(true);
              }}
            >
              + {t('admin.teams.addNew')}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          {error}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {successMessage && (
        <div className="admin-alert admin-alert-success">
          {successMessage}
          <button onClick={() => setSuccessMessage(null)}>&times;</button>
        </div>
      )}

      <div className="admin-filters">
        <div className="admin-search">
          <input
            type="text"
            className="admin-search-input"
            placeholder={t('admin.teams.searchPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="admin-filter-select"
          value={selectedBU}
          onChange={e => setSelectedBU(e.target.value)}
        >
          <option value="">{t('admin.teams.allBusinessUnits')}</option>
          {businessUnits.map(bu => (
            <option key={bu.id} value={bu.id}>
              {bu.name} ({bu.code})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading teams...</p>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h3>{t('admin.teams.noItems')}</h3>
          <p>{t('admin.teams.noItemsDesc')}</p>
          {isAdmin && (
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => {
                setEditingTeam(null);
                setShowModal(true);
              }}
            >
              + {t('admin.teams.addFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.teams.code')}</th>
                <th>{t('admin.teams.name')}</th>
                <th>{t('admin.teams.type')}</th>
                <th>{t('admin.teams.businessUnit')}</th>
                <th>{t('admin.teams.manager')}</th>
                <th>{t('admin.teams.members')}</th>
                <th>{t('admin.teams.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map(team => (
                <tr key={team.id}>
                  <td>
                    <span className="admin-badge admin-badge-info">{team.code}</span>
                  </td>
                  <td>{team.name}</td>
                  <td>{t(`admin.teams.teamTypes.${team.teamType}`) || team.teamType}</td>
                  <td>{team.businessUnit?.name || '-'}</td>
                  <td>
                    {team.manager
                      ? `${team.manager.firstName} ${team.manager.lastName}`
                      : <span style={{ color: '#999' }}>{t('admin.teams.noManager')}</span>
                    }
                  </td>
                  <td>
                    <span className="admin-badge">{team._count?.members || 0}</span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="admin-btn admin-btn-icon"
                        onClick={() => {
                          setEditingTeam(team);
                          setShowModal(true);
                        }}
                        title={t('common.edit')}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {isAdmin && (
                        <button
                          className="admin-btn admin-btn-icon admin-btn-danger"
                          onClick={() => handleDelete(team)}
                          title={t('common.delete')}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <TeamModal
          team={editingTeam}
          businessUnits={businessUnits}
          users={users}
          teamTypes={teamTypes}
          onSave={handleSaveTeam}
          onClose={() => {
            setShowModal(false);
            setEditingTeam(null);
          }}
          t={t}
        />
      )}

      {showStandardModal && (
        <CreateStandardTeamsModal
          businessUnits={businessUnits}
          onConfirm={handleCreateStandardTeams}
          onClose={() => setShowStandardModal(false)}
          t={t}
        />
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title={t('admin.teams.deleteTitle')}
          message={t('admin.teams.deleteMessage', { name: deleteConfirm.name })}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          t={t}
        />
      )}
    </div>
  );
}
