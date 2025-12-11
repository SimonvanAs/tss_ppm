import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';

export function GlobalDashboard() {
  const { t } = useLanguage();
  const [opcos, setOpcos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getOpCos();
      setOpcos(data);
    } catch (err) {
      console.error('Failed to load OpCos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate aggregate stats
  const totalOpcos = opcos.length;
  const activeOpcos = opcos.filter(o => o.isActive).length;

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
          <div className="admin-empty-title">{t('admin.global.error')}</div>
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
        <h1 className="admin-page-title">{t('admin.global.title')}</h1>
        <p className="admin-page-subtitle">{t('admin.global.subtitle')}</p>
      </div>

      {/* Super Admin Badge */}
      <div className="admin-card" style={{ padding: '16px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(204, 14, 112, 0.1), rgba(0, 74, 145, 0.1))' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #CC0E70 0%, #004A91 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
          </div>
          <div>
            <strong style={{ color: '#CC0E70' }}>{t('admin.global.superAdminView')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
              {t('admin.global.superAdminDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Global Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.global.totalOpcos')}</div>
          <div className="admin-stat-value">{totalOpcos}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.global.activeOpcos')}</div>
          <div className="admin-stat-value">{activeOpcos}</div>
          <div className="admin-stat-change positive">
            {totalOpcos > 0 ? Math.round((activeOpcos / totalOpcos) * 100) : 0}% {t('admin.global.ofTotal')}
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.global.inactiveOpcos')}</div>
          <div className="admin-stat-value">{totalOpcos - activeOpcos}</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('admin.global.systemStatus')}</div>
          <div className="admin-stat-value" style={{ fontSize: '20px', color: '#28a745' }}>
            {t('admin.global.healthy')}
          </div>
        </div>
      </div>

      {/* OpCo Overview */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">{t('admin.global.opcoOverview')}</h3>
          <Link to="/admin/opcos" className="admin-btn admin-btn-sm admin-btn-secondary" style={{ textDecoration: 'none' }}>
            {t('admin.global.manageOpcos')}
          </Link>
        </div>

        {opcos.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-title">{t('admin.global.noOpcos')}</div>
            <div className="admin-empty-text">{t('admin.global.noOpcosDesc')}</div>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.global.opco')}</th>
                <th>{t('admin.global.domain')}</th>
                <th>{t('admin.global.status')}</th>
                <th>{t('admin.global.created')}</th>
              </tr>
            </thead>
            <tbody>
              {opcos.map(opco => (
                <tr key={opco.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: opco.isActive
                          ? 'linear-gradient(135deg, #CC0E70 0%, #004A91 100%)'
                          : '#ccc',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}>
                        {opco.displayName?.substring(0, 2).toUpperCase() || 'OP'}
                      </div>
                      <div>
                        <strong>{opco.displayName}</strong>
                        <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>{opco.name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: opco.domain ? '#333' : '#999' }}>
                    {opco.domain || '-'}
                  </td>
                  <td>
                    <span className={`admin-badge ${opco.isActive ? 'admin-badge-success' : 'admin-badge-danger'}`}>
                      {opco.isActive ? t('admin.global.active') : t('admin.global.inactive')}
                    </span>
                  </td>
                  <td style={{ color: '#666', fontSize: '13px' }}>
                    {opco.createdAt ? new Date(opco.createdAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* System Health */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">{t('admin.global.systemHealth')}</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#28a745">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <strong style={{ fontSize: '13px' }}>{t('admin.global.database')}</strong>
            </div>
            <span style={{ fontSize: '12px', color: '#28a745' }}>{t('admin.global.connected')}</span>
          </div>

          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#28a745">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <strong style={{ fontSize: '13px' }}>{t('admin.global.authentication')}</strong>
            </div>
            <span style={{ fontSize: '12px', color: '#28a745' }}>{t('admin.global.keycloakOk')}</span>
          </div>

          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#28a745">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <strong style={{ fontSize: '13px' }}>{t('admin.global.api')}</strong>
            </div>
            <span style={{ fontSize: '12px', color: '#28a745' }}>{t('admin.global.operational')}</span>
          </div>

          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', borderLeft: '4px solid #28a745' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#28a745">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <strong style={{ fontSize: '13px' }}>{t('admin.global.whisper')}</strong>
            </div>
            <span style={{ fontSize: '12px', color: '#28a745' }}>{t('admin.global.available')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
