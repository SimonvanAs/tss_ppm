import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportToExcel, exportToPDF } from '../../utils/exportHistory';

/**
 * Export dropdown menu for Excel and PDF downloads
 */
export function HistoryExportMenu({ reviews, employeeName }) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
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

  const handleExport = async (format) => {
    if (!reviews || reviews.length === 0) return;

    setExporting(format);
    try {
      if (format === 'excel') {
        exportToExcel(reviews, employeeName, { language });
      } else if (format === 'pdf') {
        exportToPDF(reviews, employeeName, { language });
      }
    } catch (error) {
      console.error(`Export to ${format} failed:`, error);
    } finally {
      setExporting(null);
      setIsOpen(false);
    }
  };

  const isDisabled = !reviews || reviews.length === 0;

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: isDisabled ? '#ccc' : '#004A91',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '500',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
        {t('pages.history.export')}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
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
            overflow: 'hidden',
            zIndex: 100,
            minWidth: '160px',
          }}
        >
          {/* Excel Option */}
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting === 'excel'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '13px',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#217346">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 9.5L11 15l-2-3.5H7.5L10 15l-2.5 3.5H9l2-3.5 2 3.5h1.5L12 15l2.5-3.5H13z" />
            </svg>
            <div>
              <div style={{ fontWeight: '500' }}>
                {exporting === 'excel' ? t('pages.history.exporting') : t('pages.history.exportExcel')}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                .xlsx
              </div>
            </div>
          </button>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #eee' }} />

          {/* PDF Option */}
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting === 'pdf'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '13px',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.target.style.background = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#DC3545">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 11h-2v3h-2v-6h4v1.5h-2v1h2V13zm-3.5-6.5h-2v-1h2v1z" />
            </svg>
            <div>
              <div style={{ fontWeight: '500' }}>
                {exporting === 'pdf' ? t('pages.history.exporting') : t('pages.history.exportPDF')}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                .pdf
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
