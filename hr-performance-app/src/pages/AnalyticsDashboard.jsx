import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { analyticsApi, adminApi, usersApi } from '../services/api';
import {
  Interactive9Grid,
  LevelSelector,
  DistributionBars,
  EmployeeDrawer,
  AnalyticsExportMenu,
} from '../components/analytics';
import { formatScore } from '../utils/analyticsUtils';
import './Pages.css';

export function AnalyticsDashboard() {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();

  // State
  const [level, setLevel] = useState('manager');
  const [year, setYear] = useState(new Date().getFullYear());
  const [stage, setStage] = useState('endYear');
  const [businessUnitId, setBusinessUnitId] = useState(null);
  const [managerId, setManagerId] = useState(null);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [managers, setManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  // Check if user is HR+ (can see all levels)
  const isHROrAdmin = hasRole('HR') || hasRole('OPCO_ADMIN') || hasRole('TSS_SUPER_ADMIN');

  // Available years (current year and 4 previous)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Load business units and managers for filters
  useEffect(() => {
    const loadFilters = async () => {
      if (isHROrAdmin) {
        try {
          const [buData, usersData] = await Promise.all([
            adminApi.getBusinessUnits().catch(() => []),
            usersApi.getManagers().catch(() => ({ managers: [] })),
          ]);
          setBusinessUnits(buData || []);
          setManagers(usersData.managers || []);
        } catch (err) {
          console.error('Failed to load filters:', err);
        }
      }
    };
    loadFilters();
  }, [isHROrAdmin]);

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [level, year, stage, businessUnitId, managerId]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = { level, year, stage };
      if (businessUnitId && level === 'bu') {
        params.businessUnitId = businessUnitId;
      }
      if (managerId && level === 'manager') {
        params.managerId = managerId;
      }

      // Don't fetch BU analytics without a selected BU
      if (level === 'bu' && !businessUnitId) {
        setAnalyticsData(null);
        setIsLoading(false);
        return;
      }

      const data = await analyticsApi.get9Grid(params);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = (newLevel) => {
    setLevel(newLevel);
    setSelectedCell(null);
    setDrawerOpen(false);

    // Reset BU selection when changing levels
    if (newLevel !== 'bu') {
      setBusinessUnitId(null);
    }
  };

  const handleCellClick = (cell) => {
    setSelectedCell(cell.key);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedCell(null);
  };

  // Stats cards data
  const stats = useMemo(() => {
    if (!analyticsData) return null;
    return analyticsData.summary;
  }, [analyticsData]);

  // Scope name for exports
  const scopeName = useMemo(() => {
    if (analyticsData?.scope?.name) return analyticsData.scope.name;
    if (level === 'company') return t('pages.analytics.levels.company') || 'Company';
    if (level === 'bu') {
      const bu = businessUnits.find(b => b.id === businessUnitId);
      return bu?.name || t('pages.analytics.levels.bu') || 'Business Unit';
    }
    if (level === 'manager') {
      const mgr = managers.find(m => m.id === managerId);
      return mgr ? `${mgr.firstName} ${mgr.lastName}'s Team` : t('pages.analytics.levels.manager') || 'Team';
    }
    return 'Analytics';
  }, [analyticsData, level, businessUnits, businessUnitId, managers, managerId, t]);

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h1 className="page-title">
              {t('pages.analytics.title') || 'Performance Analytics'}
            </h1>
            <p className="page-subtitle">
              {analyticsData?.scope?.name ||
                (t('pages.analytics.subtitle') || '9-Grid distribution across your organization')}
            </p>
          </div>

          {/* Year and Stage selectors */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value, 10))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
              }}
            >
              {availableYears.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={stage}
              onChange={e => setStage(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
              }}
            >
              <option value="endYear">{t('pages.analytics.endYear') || 'End Year'}</option>
              <option value="midYear">{t('pages.analytics.midYear') || 'Mid Year'}</option>
            </select>

            <AnalyticsExportMenu
              analyticsData={analyticsData}
              scopeName={scopeName}
              year={year}
              stage={stage}
              disabled={isLoading || !analyticsData}
            />
          </div>
        </div>
      </div>

      {/* Level Selector (only for HR+) */}
      {isHROrAdmin && (
        <LevelSelector
          level={level}
          onLevelChange={handleLevelChange}
          businessUnits={businessUnits}
          selectedBusinessUnitId={businessUnitId}
          onBusinessUnitChange={setBusinessUnitId}
          managers={managers}
          selectedManagerId={managerId}
          onManagerChange={setManagerId}
          disabled={isLoading}
        />
      )}

      {/* Error message */}
      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: 'rgba(220, 53, 69, 0.05)',
            borderColor: '#DC3545',
          }}
        >
          <p style={{ color: '#DC3545', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner-small" />
          <p>{t('common.loading') || 'Loading...'}</p>
        </div>
      ) : level === 'bu' && !businessUnitId ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666' }}>
            {t('pages.analytics.selectBUPrompt') ||
              'Please select a Business Unit to view analytics'}
          </p>
        </div>
      ) : analyticsData ? (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats?.totalEmployees || 0}</div>
              <div className="stat-label">
                {t('pages.analytics.stats.totalEmployees') || 'Total Employees'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats?.scoredEmployees || 0}</div>
              <div className="stat-label">
                {t('pages.analytics.stats.scoredEmployees') || 'Scored'}
              </div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-value">{stats?.completionRate || 0}%</div>
              <div className="stat-label">
                {t('pages.analytics.stats.completionRate') || 'Completion Rate'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#CC0E70' }}>
                {formatScore(stats?.avgWhatScore)}
              </div>
              <div className="stat-label">
                {t('pages.analytics.stats.avgWhat') || 'Avg WHAT'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#004A91' }}>
                {formatScore(stats?.avgHowScore)}
              </div>
              <div className="stat-label">
                {t('pages.analytics.stats.avgHow') || 'Avg HOW'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#1B5E20' }}>
                {analyticsData?.distribution?.topTalent || 0}
              </div>
              <div className="stat-label">
                {t('pages.analytics.stats.topTalent') || 'Top Talent'}
              </div>
            </div>
          </div>

          {/* Main Content: Grid + Distribution */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '24px',
              marginTop: '24px',
            }}
          >
            {/* 9-Grid */}
            <div className="card" style={{ padding: '24px' }}>
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                }}
              >
                {t('pages.analytics.gridTitle') || '9-Grid Distribution'}
              </h3>
              <div style={{ position: 'relative', paddingLeft: '30px' }}>
                <Interactive9Grid
                  gridData={analyticsData?.grid}
                  onCellClick={handleCellClick}
                  selectedCell={selectedCell}
                  size="large"
                />
              </div>
              <p
                style={{
                  margin: '16px 0 0',
                  fontSize: '12px',
                  color: '#999',
                  textAlign: 'center',
                }}
              >
                {t('pages.analytics.clickToView') || 'Click a cell to view employees'}
              </p>
            </div>

            {/* Distribution Bars */}
            <div className="card" style={{ padding: '24px' }}>
              <h3
                style={{
                  margin: '0 0 20px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                }}
              >
                {t('pages.analytics.distributionTitle') || 'Performance Distribution'}
              </h3>
              <DistributionBars
                distribution={analyticsData?.distribution}
                totalScored={stats?.scoredEmployees || 0}
              />

              {/* Legend */}
              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #eee',
                }}
              >
                <h4
                  style={{
                    margin: '0 0 12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#666',
                  }}
                >
                  {t('pages.analytics.legend') || 'Grid Legend'}
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        background: '#1B5E20',
                      }}
                    />
                    <span>A3, B3, A2 - {t('pages.analytics.grid.topTalent') || 'Top Talent'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        background: '#28A745',
                      }}
                    />
                    <span>
                      B2, C3, A1 - {t('pages.analytics.grid.solidPerformer') || 'Solid Performer'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        background: '#FFA500',
                      }}
                    />
                    <span>
                      C2, B1 - {t('pages.analytics.grid.needsAttention') || 'Needs Attention'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        background: '#DC3545',
                      }}
                    />
                    <span>C1 - {t('pages.analytics.grid.concern') || 'Concern'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666' }}>
            {t('pages.analytics.noData') || 'No analytics data available'}
          </p>
        </div>
      )}

      {/* Employee Drawer */}
      <EmployeeDrawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        boxKey={selectedCell}
        level={level}
        year={year}
        stage={stage}
        businessUnitId={businessUnitId}
        managerId={managerId}
      />
    </div>
  );
}
