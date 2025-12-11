import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { reviewsApi, usersApi } from '../services/api';
import {
  TrendLineChart,
  YearOverYearTable,
  HistoricalGrid,
  TrendIndicator,
  HistoryFilters,
  HistoryExportMenu,
} from '../components/history';
import {
  calculateHistoryStats,
  getUniqueYears,
  filterReviewsByYearRange,
} from '../utils/historyUtils';
import './Pages.css';

export function HistoryDashboard() {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();

  // State
  const [reviews, setReviews] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [fromYear, setFromYear] = useState(null);
  const [toYear, setToYear] = useState(null);
  const [showMidYear, setShowMidYear] = useState(false);

  // Determine target user ID
  const targetUserId = userId || user?.id;
  const isOwnHistory = !userId || userId === user?.id;

  // Check access permissions
  const canViewHistory = useMemo(() => {
    if (isOwnHistory) return true;
    if (hasRole('HR') || hasRole('OPCO_ADMIN') || hasRole('TSS_SUPER_ADMIN')) return true;
    if (hasRole('MANAGER')) {
      // TODO: Check if target user is direct report
      return true;
    }
    return false;
  }, [isOwnHistory, hasRole]);

  // Load data
  useEffect(() => {
    if (!targetUserId || !canViewHistory) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load reviews for target user
        const reviewsData = await reviewsApi.list({ employeeId: targetUserId });
        setReviews(reviewsData.reviews || reviewsData || []);

        // Load target user info if not own history
        if (!isOwnHistory) {
          try {
            const userData = await usersApi.getById(targetUserId);
            setTargetUser(userData);
          } catch {
            // If can't load user, use placeholder
            setTargetUser({ firstName: 'User', lastName: '' });
          }
        }
      } catch (err) {
        console.error('Failed to load history:', err);
        setError(err.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [targetUserId, canViewHistory, isOwnHistory]);

  // Filter reviews by year range
  const filteredReviews = useMemo(() => {
    return filterReviewsByYearRange(reviews, fromYear, toYear);
  }, [reviews, fromYear, toYear]);

  // Calculate stats
  const stats = useMemo(() => {
    return calculateHistoryStats(filteredReviews);
  }, [filteredReviews]);

  // Get unique years for filters
  const years = useMemo(() => {
    return getUniqueYears(reviews);
  }, [reviews]);

  // Employee display name
  const employeeName = isOwnHistory
    ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'My'
    : `${targetUser?.firstName || ''} ${targetUser?.lastName || ''}`.trim() || 'Employee';

  // Access denied
  if (!canViewHistory) {
    return (
      <div className="page">
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ marginBottom: '8px' }}>{t('common.accessDenied')}</h2>
          <p style={{ color: '#666' }}>{t('pages.history.noAccess')}</p>
          <button
            onClick={() => navigate(-1)}
            className="admin-btn admin-btn-primary"
            style={{ marginTop: '16px' }}
          >
            {t('common.goBack')}
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="page">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
        }}>
          <div className="loading-spinner-small" />
          <p style={{ marginTop: '16px', color: '#666' }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="page">
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ marginBottom: '8px', color: '#DC3545' }}>{t('common.error')}</h2>
          <p style={{ color: '#666' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="admin-btn admin-btn-primary"
            style={{ marginTop: '16px' }}
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h1 className="page-title">{t('pages.history.title')}</h1>
            <p className="page-subtitle">
              {isOwnHistory
                ? t('pages.history.subtitleOwn')
                : t('pages.history.subtitleOther', { name: employeeName })}
            </p>
          </div>
          <HistoryExportMenu
            reviews={filteredReviews}
            employeeName={employeeName}
          />
        </div>
      </div>

      {/* Filters */}
      <HistoryFilters
        years={years}
        fromYear={fromYear}
        toYear={toYear}
        showMidYear={showMidYear}
        onFromYearChange={setFromYear}
        onToYearChange={setToYear}
        onShowMidYearChange={setShowMidYear}
      />

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.totalReviews}</div>
          <div className="stat-label">{t('pages.history.totalReviews')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats.firstYear && stats.lastYear
              ? `${stats.firstYear}-${stats.lastYear}`
              : '-'}
          </div>
          <div className="stat-label">{t('pages.history.yearsSpan')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#CC0E70' }}>
            {stats.avgWhatScore?.toFixed(2) || '-'}
          </div>
          <div className="stat-label">{t('pages.history.avgWhat')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#004A91' }}>
            {stats.avgHowScore?.toFixed(2) || '-'}
          </div>
          <div className="stat-label">{t('pages.history.avgHow')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontFamily: 'monospace' }}>
            {stats.latestGridPosition || '-'}
          </div>
          <div className="stat-label">{t('pages.history.latestPosition')}</div>
        </div>
        <div className="stat-card">
          <TrendIndicator trend={stats.trend} />
          <div className="stat-label" style={{ marginTop: '8px' }}>{t('pages.history.trend')}</div>
        </div>
      </div>

      {/* No Data State */}
      {filteredReviews.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ marginBottom: '8px' }}>{t('pages.history.noData')}</h3>
          <p style={{ color: '#666' }}>{t('pages.history.noDataDesc')}</p>
        </div>
      ) : (
        <>
          {/* Main Content - Two Column Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 240px',
            gap: '24px',
            marginBottom: '24px',
          }}>
            {/* Trend Chart */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>
                {t('pages.history.scoreTrend')}
              </h3>
              <TrendLineChart
                reviews={filteredReviews}
                height={280}
                showMidYear={showMidYear}
              />
            </div>

            {/* Historical Grid */}
            <div className="card" style={{ padding: '20px' }}>
              <HistoricalGrid
                reviews={filteredReviews}
                size={200}
              />
            </div>
          </div>

          {/* Year-over-Year Table */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>
              {t('pages.history.yearComparison')}
            </h3>
            <YearOverYearTable
              reviews={filteredReviews}
              showMidYear={showMidYear}
            />
          </div>
        </>
      )}
    </div>
  );
}
