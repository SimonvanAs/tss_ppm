import { useLanguage } from '../../contexts/LanguageContext';
import '../../pages/Pages.css';

/**
 * Tab-style selector for analytics level (Manager, BU, Company)
 */
export function LevelSelector({
  level,
  onLevelChange,
  businessUnits = [],
  selectedBusinessUnitId,
  onBusinessUnitChange,
  managers = [],
  selectedManagerId,
  onManagerChange,
  disabled = false,
}) {
  const { t } = useLanguage();

  const levels = [
    { key: 'manager', label: t('pages.analytics.levels.manager') || 'Team' },
    { key: 'bu', label: t('pages.analytics.levels.bu') || 'Business Unit' },
    { key: 'company', label: t('pages.analytics.levels.company') || 'Company' },
  ];

  return (
    <div className="level-selector">
      {/* Level tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          background: '#f0f0f0',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '16px',
        }}
      >
        {levels.map(l => (
          <button
            key={l.key}
            onClick={() => onLevelChange(l.key)}
            disabled={disabled}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: level === l.key ? '#CC0E70' : 'transparent',
              color: level === l.key ? 'white' : '#666',
              fontWeight: level === l.key ? '600' : '500',
              fontSize: '14px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* BU selector (shown when BU level selected) */}
      {level === 'bu' && businessUnits.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#666',
            }}
          >
            {t('pages.analytics.selectBU') || 'Select Business Unit'}
          </label>
          <select
            value={selectedBusinessUnitId || ''}
            onChange={e => onBusinessUnitChange(e.target.value)}
            disabled={disabled}
            className="filter-select"
          >
            <option value="">{t('pages.analytics.selectBUPlaceholder') || '-- Select --'}</option>
            {businessUnits.map(bu => (
              <option key={bu.id} value={bu.id}>
                {bu.name} ({bu.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Manager selector (shown when Manager level selected for HR+ users) */}
      {level === 'manager' && managers.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#666',
            }}
          >
            {t('pages.analytics.selectManager') || 'Select Manager'}
          </label>
          <select
            value={selectedManagerId || ''}
            onChange={e => onManagerChange(e.target.value)}
            disabled={disabled}
            className="filter-select"
          >
            <option value="">{t('pages.analytics.myTeam') || 'My Team'}</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
