import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportAnalyticsToExcel, exportAnalyticsToPDF } from '../../utils/exportAnalytics';

/**
 * Export dropdown menu for Analytics Dashboard
 */
export function AnalyticsExportMenu({
  analyticsData,
  scopeName,
  year,
  stage,
  disabled = false,
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportExcel = async () => {
    if (!analyticsData) return;

    setIsExporting(true);
    try {
      await exportAnalyticsToExcel(analyticsData, {
        scopeName,
        year,
        stage,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analyticsData) return;

    setIsExporting(true);
    try {
      exportAnalyticsToPDF(analyticsData, {
        scopeName,
        year,
        stage,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || !analyticsData}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid #ddd',
          background: 'white',
          fontSize: '14px',
          fontWeight: '500',
          color: disabled || !analyticsData ? '#999' : '#333',
          cursor: disabled || !analyticsData ? 'not-allowed' : 'pointer',
          opacity: disabled || !analyticsData ? 0.6 : 1,
        }}
      >
        {isExporting ? (
          <>
            <span className="loading-spinner-small" style={{ width: 14, height: 14 }} />
            {t('pages.history.exporting') || 'Exporting...'}
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            {t('pages.history.export') || 'Export'}
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #eee',
            minWidth: '180px',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={handleExportExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              color: '#333',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.target.style.background = '#f5f5f5')}
            onMouseLeave={(e) => (e.target.style.background = 'none')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#1D6F42">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
              <path d="M8 15h2v2H8v-2zm0-3h2v2H8v-2zm3 3h2v2h-2v-2zm0-3h2v2h-2v-2zm3 3h2v2h-2v-2zm0-3h2v2h-2v-2z" />
            </svg>
            {t('pages.analytics.export.excel') || 'Export to Excel'}
          </button>

          <div style={{ height: '1px', background: '#eee' }} />

          <button
            onClick={handleExportPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              color: '#333',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.target.style.background = '#f5f5f5')}
            onMouseLeave={(e) => (e.target.style.background = 'none')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#DC3545">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
              <path d="M9 13h6v1.5H9V13zm0 3h6v1.5H9V16zm0-6h3v1.5H9V10z" />
            </svg>
            {t('pages.analytics.export.pdf') || 'Export to PDF'}
          </button>
        </div>
      )}
    </div>
  );
}
