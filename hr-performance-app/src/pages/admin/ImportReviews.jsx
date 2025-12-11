import { useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiClient } from '../../services/api';
import './AdminLayout.css';

export function ImportReviews() {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

      if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension)) {
        setError(t('admin.import.invalidFileType') || 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
        setFile(null);
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setError(t('admin.import.fileTooLarge') || 'File size exceeds 10MB limit.');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError(t('admin.import.noFileSelected') || 'Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use fetch directly since apiClient doesn't support FormData yet
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
      
      // Get token from apiClient
      const token = apiClient.accessToken;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/admin/reviews/import`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to import reviews');
      }

      setResults(data.results);
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || t('admin.import.uploadError') || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('admin.import.title') || 'Import Historical Reviews'}</h1>
        <p className="admin-page-subtitle">
          {t('admin.import.subtitle') || 'Upload an Excel file to import previous performance reviews into the system.'}
        </p>
      </div>

      {/* Instructions */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <div className="admin-card-header">
          <h3 className="admin-card-title">{t('admin.import.instructions') || 'File Format Requirements'}</h3>
        </div>
        <div style={{ padding: '16px' }}>
          <p style={{ marginBottom: '12px' }}>
            {t('admin.import.formatDescription') || 'Your Excel file should contain the following columns:'}
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
            <li><strong>Employee Email</strong> or <strong>Employee Name</strong> (required)</li>
            <li><strong>Year</strong> (required) - e.g., 2023, 2024</li>
            <li><strong>WHAT Score</strong> (optional) - numeric score 1-3</li>
            <li><strong>HOW Score</strong> (optional) - numeric score 1-3</li>
            <li><strong>TOV Level</strong> (optional) - A, B, C, or D</li>
            <li><strong>Status</strong> (optional) - DRAFT, COMPLETED, etc.</li>
          </ul>
          <p style={{ fontSize: '0.875rem', color: '#666' }}>
            {t('admin.import.note') || 'Note: Column names are flexible and will be automatically detected. The first row should contain headers.'}
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <div className="admin-card-header">
          <h3 className="admin-card-title">{t('admin.import.uploadTitle') || 'Upload File'}</h3>
        </div>
        <div style={{ padding: '16px' }}>
          {!results && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="file-upload"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: '#004A91',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {t('admin.import.selectFile') || 'Select File'}
                </label>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                {file && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{file.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                          {(file.size / 1024).toFixed(2)} KB
                        </div>
                      </div>
                      <button
                        onClick={handleReset}
                        className="admin-btn admin-btn-ghost"
                        style={{ padding: '4px 8px' }}
                        disabled={isUploading}
                      >
                        {t('common.remove') || 'Remove'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                  border: '1px solid #DC3545',
                  borderRadius: '4px',
                  color: '#DC3545',
                  marginBottom: '16px',
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="admin-btn admin-btn-primary"
                style={{ width: '100%' }}
              >
                {isUploading ? (
                  <>
                    <span className="admin-loading-spinner" style={{ marginRight: '8px' }} />
                    {t('admin.import.uploading') || 'Uploading...'}
                  </>
                ) : (
                  t('admin.import.upload') || 'Upload and Import'
                )}
              </button>
            </>
          )}

          {/* Results */}
          {results && (
            <div>
              <div style={{
                padding: '16px',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                marginBottom: '16px',
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#155724' }}>
                  {t('admin.import.complete') || 'Import Complete!'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <strong>{t('admin.import.totalRows') || 'Total Rows:'}</strong> {results.total}
                  </div>
                  <div style={{ color: '#28a745' }}>
                    <strong>{t('admin.import.created') || 'Created:'}</strong> {results.created}
                  </div>
                  <div style={{ color: '#004A91' }}>
                    <strong>{t('admin.import.updated') || 'Updated:'}</strong> {results.updated}
                  </div>
                  <div style={{ color: '#ffc107' }}>
                    <strong>{t('admin.import.skipped') || 'Skipped:'}</strong> {results.skipped}
                  </div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ marginBottom: '8px' }}>
                    {t('admin.import.errors') || 'Errors'} ({results.errors.length})
                  </h4>
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}>
                    <table style={{ width: '100%', fontSize: '0.875rem' }}>
                      <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                        <tr>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Row</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.errors.map((err, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{err.row}</td>
                            <td style={{ padding: '8px', color: '#DC3545' }}>{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={handleReset}
                className="admin-btn admin-btn-secondary"
                style={{ width: '100%' }}
              >
                {t('admin.import.importAnother') || 'Import Another File'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
