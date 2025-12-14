import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { analyticsApi } from '../../services/api';
import { getGridColor, getPerformanceLevel, formatScore } from '../../utils/analyticsUtils';

/**
 * Slide-out drawer showing employees in a selected grid position
 */
export function EmployeeDrawer({
  isOpen,
  onClose,
  boxKey,
  level,
  year,
  stage,
  businessUnitId,
  managerId,
}) {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const drawerRef = useRef(null);

  // Load employees when drawer opens or filters change
  useEffect(() => {
    if (isOpen && boxKey) {
      loadEmployees(1);
    }
  }, [isOpen, boxKey, level, year, stage, businessUnitId, managerId]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const loadEmployees = async (page) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = {
        level,
        year,
        stage,
        page,
        limit: 20,
      };

      if (businessUnitId) params.businessUnitId = businessUnitId;
      if (managerId) params.managerId = managerId;

      const data = await analyticsApi.getGridEmployees(boxKey, params);

      setEmployees(data.employees || []);
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load employees:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadEmployees(newPage);
  };

  // Parse boxKey
  const [whatPos, howPos] = boxKey ? boxKey.split('-').map(Number) : [0, 0];
  const gridLabel = boxKey ? `${['C', 'B', 'A'][whatPos - 1] || '?'}${howPos}` : '';
  const performanceLevel = getPerformanceLevel(whatPos, howPos);
  const color = getGridColor(whatPos, howPos);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close drawer"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 999,
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '480px',
          maxWidth: '90vw',
          background: 'white',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Grid position badge */}
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '8px',
              background: color,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
            }}
          >
            <span style={{ fontSize: '18px' }}>{gridLabel}</span>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>
              {t('pages.analytics.drillDown.title')?.replace('{position}', gridLabel) ||
                `Employees in ${gridLabel}`}
            </h3>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
              {performanceLevel} - {pagination.total}{' '}
              {t('pages.analytics.employees') || 'employees'}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: '#f0f0f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#666',
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
              }}
            >
              <div className="loading-spinner-small" />
            </div>
          ) : error ? (
            <div style={{ color: '#DC3545', padding: '16px', textAlign: 'center' }}>
              {error}
            </div>
          ) : employees.length === 0 ? (
            <div style={{ color: '#999', padding: '40px', textAlign: 'center' }}>
              {t('pages.analytics.drillDown.noEmployees') || 'No employees in this position'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {employees.map(emp => (
                <div
                  key={emp.id}
                  style={{
                    padding: '14px 16px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {/* Avatar placeholder */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#CC0E70',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    {emp.firstName?.[0]}
                    {emp.lastName?.[0]}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {emp.functionTitle || emp.email}
                    </div>
                    {emp.businessUnit && (
                      <div style={{ color: '#999', fontSize: '11px' }}>
                        {emp.businessUnit}
                      </div>
                    )}
                  </div>

                  {/* Scores */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: '#CC0E70', fontWeight: '600' }}>
                        W: {formatScore(emp.whatScore)}
                      </span>
                      {' / '}
                      <span style={{ color: '#004A91', fontWeight: '600' }}>
                        H: {formatScore(emp.howScore)}
                      </span>
                    </div>
                  </div>

                  {/* View review link */}
                  <Link
                    to={`/review/${emp.reviewId}`}
                    style={{
                      padding: '6px 12px',
                      background: '#004A91',
                      color: 'white',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {t('pages.analytics.drillDown.viewReview') || 'View'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: 'white',
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                opacity: pagination.page <= 1 ? 0.5 : 1,
              }}
            >
              {t('common.previous') || 'Previous'}
            </button>
            <span style={{ padding: '8px 16px', color: '#666' }}>
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: 'white',
                cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
              }}
            >
              {t('common.next') || 'Next'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
