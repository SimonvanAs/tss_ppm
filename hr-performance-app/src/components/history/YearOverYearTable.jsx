import { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { buildYearOverYearComparison, getPerformanceLabel } from '../../utils/historyUtils';
import { ScoreChangeIndicator } from './ScoreChangeIndicator';

/**
 * Year-over-year comparison table with change indicators
 */
export function YearOverYearTable({ reviews, showMidYear = false }) {
  const { t } = useLanguage();

  const comparison = useMemo(() => {
    return buildYearOverYearComparison(reviews);
  }, [reviews]);

  if (!comparison.years || comparison.years.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#999',
        background: '#f8f9fa',
        borderRadius: '8px',
      }}>
        {t('pages.history.noData')}
      </div>
    );
  }

  const scoreKey = showMidYear ? 'whatScoreMidYear' : 'whatScoreEndYear';
  const howKey = showMidYear ? 'howScoreMidYear' : 'howScoreEndYear';

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', minWidth: '100px' }}>{t('pages.history.metric')}</th>
            {comparison.years.map(year => (
              <th key={year} style={{ textAlign: 'center', minWidth: '100px' }}>
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* WHAT Score Row */}
          <tr>
            <td style={{ fontWeight: '600' }}>{t('pages.history.whatScore')}</td>
            {comparison.years.map((year, i) => {
              const score = comparison.metrics[scoreKey][year];
              const change = comparison.changes[year]?.whatChange;
              return (
                <td key={year} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: '#f8e8ef',
                      color: '#CC0E70',
                      borderRadius: '16px',
                      fontWeight: '600',
                    }}>
                      {score?.toFixed(2) || '-'}
                    </span>
                    {change && i > 0 && (
                      <ScoreChangeIndicator
                        direction={change.direction}
                        delta={change.delta}
                        size="small"
                      />
                    )}
                  </div>
                </td>
              );
            })}
          </tr>

          {/* HOW Score Row */}
          <tr>
            <td style={{ fontWeight: '600' }}>{t('pages.history.howScore')}</td>
            {comparison.years.map((year, i) => {
              const score = comparison.metrics[howKey][year];
              const change = comparison.changes[year]?.howChange;
              return (
                <td key={year} style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: '#e8f0f8',
                      color: '#004A91',
                      borderRadius: '16px',
                      fontWeight: '600',
                    }}>
                      {score?.toFixed(2) || '-'}
                    </span>
                    {change && i > 0 && (
                      <ScoreChangeIndicator
                        direction={change.direction}
                        delta={change.delta}
                        size="small"
                      />
                    )}
                  </div>
                </td>
              );
            })}
          </tr>

          {/* Grid Position Row */}
          <tr>
            <td style={{ fontWeight: '600' }}>{t('pages.history.gridPosition')}</td>
            {comparison.years.map(year => {
              const position = comparison.metrics.gridPosition[year];
              return (
                <td key={year} style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: position ? '#e7f3ff' : '#f0f0f0',
                    color: position ? '#333' : '#999',
                    borderRadius: '4px',
                    fontWeight: '600',
                    fontFamily: 'monospace',
                  }}>
                    {position || '-'}
                  </span>
                </td>
              );
            })}
          </tr>

          {/* Status Row */}
          <tr>
            <td style={{ fontWeight: '600' }}>{t('pages.history.status')}</td>
            {comparison.years.map(year => {
              const status = comparison.metrics.status[year];
              return (
                <td key={year} style={{ textAlign: 'center' }}>
                  <StatusBadge status={status} />
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusStyles = {
    COMPLETED: { background: '#d4edda', color: '#155724' },
    ARCHIVED: { background: '#e2e3e5', color: '#383d41' },
    END_YEAR_REVIEW: { background: '#fff3cd', color: '#856404' },
    MID_YEAR_COMPLETE: { background: '#d1ecf1', color: '#0c5460' },
    MID_YEAR_REVIEW: { background: '#d1ecf1', color: '#0c5460' },
    GOAL_SETTING_COMPLETE: { background: '#cce5ff', color: '#004085' },
    GOAL_SETTING: { background: '#cce5ff', color: '#004085' },
    DRAFT: { background: '#f0f0f0', color: '#666' },
  };

  const style = statusStyles[status] || statusStyles.DRAFT;

  const formatStatus = (s) => {
    const map = {
      COMPLETED: 'Completed',
      ARCHIVED: 'Archived',
      END_YEAR_REVIEW: 'End-Year',
      MID_YEAR_COMPLETE: 'Mid-Year Done',
      MID_YEAR_REVIEW: 'Mid-Year',
      GOAL_SETTING_COMPLETE: 'Goals Set',
      GOAL_SETTING: 'Goal Setting',
      DRAFT: 'Draft',
    };
    return map[s] || s || '-';
  };

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
      ...style,
    }}>
      {formatStatus(status)}
    </span>
  );
}
