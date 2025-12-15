import { useLanguage } from '../../contexts/LanguageContext';
import '../../pages/Pages.css';

/**
 * Filter controls for history dashboard
 */
export function HistoryFilters({
  years,
  fromYear,
  toYear,
  showMidYear,
  onFromYearChange,
  onToYearChange,
  onShowMidYearChange,
}) {
  const { t } = useLanguage();

  if (!years || years.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 16px',
      background: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '16px',
    }}>
      {/* Year Range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '13px', color: '#666' }}>
          {t('pages.history.yearRange')}:
        </label>
        <select
          value={fromYear || ''}
          onChange={(e) => onFromYearChange(e.target.value ? Number(e.target.value) : null)}
          className="filter-select"
        >
          <option value="">{t('pages.history.allYears')}</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <span style={{ color: '#999' }}>-</span>
        <select
          value={toYear || ''}
          onChange={(e) => onToYearChange(e.target.value ? Number(e.target.value) : null)}
          className="filter-select"
        >
          <option value="">{t('pages.history.allYears')}</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Mid-Year Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#666',
        }}>
          <input
            type="checkbox"
            checked={showMidYear}
            onChange={(e) => onShowMidYearChange(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          {t('pages.history.showMidYear')}
        </label>
      </div>
    </div>
  );
}
