import { useState, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { adminApi } from '../../services/api';
import './AdminLayout.css';

export function ImportEmployees() {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dryRun, setDryRun] = useState(true);
  const [preview, setPreview] = useState(null);
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
        setError(t('admin.importEmployees.invalidFileType') || 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.');
        setFile(null);
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setError(t('admin.importEmployees.fileTooLarge') || 'File size exceeds 10MB limit.');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResults(null);
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError(t('admin.importEmployees.noFileSelected') || 'Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults(null);
    setPreview(null);

    try {
      const data = await adminApi.importEmployees(file, dryRun);

      setResults(data.results);
      if (data.preview) {
        setPreview(data.preview);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || t('admin.importEmployees.uploadError') || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProceedWithImport = async () => {
    if (!file) return;

    setDryRun(false);
    setIsUploading(true);
    setError(null);

    try {
      const data = await adminApi.importEmployees(file, false);

      setResults(data.results);
      setPreview(null);
      setDryRun(true); // Reset for next import
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setError(null);
    setPreview(null);
    setDryRun(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('admin.importEmployees.title') || 'Import Employees'}</h1>
        <p className="admin-page-subtitle">
          {t('admin.importEmployees.subtitle') || 'Bulk upload employees with user creation and historical performance scores.'}
        </p>
      </div>

      {/* Instructions */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">{t('admin.importEmployees.instructions') || 'File Format Requirements'}</h3>
        </div>
        <div className="admin-card-content">
          <p className="import-format-description">
            {t('admin.importEmployees.formatDescription') || 'Your Excel or CSV file should contain the following columns:'}
          </p>
          <ul className="import-column-list">
            <li><strong>Email</strong> (required) - Employee email address</li>
            <li><strong>Name</strong> or <strong>First Name / Last Name</strong> - Employee name</li>
            <li><strong>Role</strong> (optional) - EMPLOYEE, MANAGER, HR, OPCO_ADMIN</li>
            <li><strong>Manager Email</strong> (optional) - Email of the manager</li>
            <li><strong>Function Title</strong> (optional) - Must match existing function titles</li>
            <li><strong>TOV Level</strong> (optional) - A, B, C, or D</li>
            <li><strong>Business Unit</strong> (optional) - Business unit code or name</li>
            <li><strong>Year</strong> (optional) - Performance year (e.g., 2023, 2024)</li>
            <li><strong>WHAT Score</strong> (optional) - Score between 1.00 and 3.00</li>
            <li><strong>HOW Score</strong> (optional) - Score between 1.00 and 3.00</li>
          </ul>
          <div className="import-info-box">
            <strong>{t('admin.importEmployees.importBehavior') || 'Import Behavior'}:</strong>
            <ul className="import-info-box-list">
              <li>New users will be created for emails not found in the database</li>
              <li>Existing users will be updated with new manager, function title, or TOV level if provided</li>
              <li>Historic review records will be created/updated when Year and scores are provided</li>
            </ul>
          </div>
          <p className="import-note">
            {t('admin.importEmployees.note') || 'Note: Column names are flexible and will be automatically detected. The first row should contain headers. Maximum 1000 rows per file.'}
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">{t('admin.importEmployees.uploadTitle') || 'Upload File'}</h3>
        </div>
        <div className="admin-card-content">
          {!results && (
            <>
              <div className="import-checkbox-wrapper">
                <label
                  htmlFor="file-upload"
                  className="file-upload-label"
                >
                  {t('admin.importEmployees.selectFile') || 'Select File'}
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
                  <div className="import-file-info">
                    <div className="import-file-info-row">
                      <div>
                        <strong>{file.name}</strong>
                        <div className="import-file-size">
                          {(file.size / 1024).toFixed(2)} KB
                        </div>
                      </div>
                      <button
                        onClick={handleReset}
                        className="admin-btn admin-btn-sm admin-btn-secondary"
                        disabled={isUploading}
                      >
                        {t('common.remove') || 'Remove'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Mode Checkbox */}
              <div className="import-checkbox-wrapper">
                <label className="import-checkbox-label">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    disabled={isUploading}
                  />
                  <span>
                    <strong>{t('admin.importEmployees.previewMode') || 'Preview Only'}</strong>
                    <span className="import-checkbox-hint">
                      {t('admin.importEmployees.previewModeHint') || 'Show what would be created/updated without making changes'}
                    </span>
                  </span>
                </label>
              </div>

              {error && (
                <div className="import-error">
                  {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="admin-btn admin-btn-primary"
              >
                {isUploading ? (
                  <>
                    <span className="admin-loading-spinner" />
                    {t('admin.importEmployees.uploading') || 'Processing...'}
                  </>
                ) : dryRun ? (
                  t('admin.importEmployees.preview') || 'Preview Import'
                ) : (
                  t('admin.importEmployees.upload') || 'Upload and Import'
                )}
              </button>
            </>
          )}

          {/* Preview Results */}
          {results && dryRun && (
            <div>
              <div className="import-preview-banner">
                <h4>
                  {t('admin.importEmployees.previewResults') || 'Preview Results'}
                </h4>
                <p>
                  {t('admin.importEmployees.previewNote') || 'No changes have been made. Review the preview below and click "Proceed with Import" to execute.'}
                </p>
                <div className="import-results-grid">
                  <div>
                    <strong>{t('admin.importEmployees.totalRows') || 'Total Rows:'}</strong> {results.total}
                  </div>
                  <div className="text-success">
                    <strong>{t('admin.importEmployees.usersToCreate') || 'Users to Create:'}</strong> {results.usersCreated}
                  </div>
                  <div className="text-primary">
                    <strong>{t('admin.importEmployees.usersToUpdate') || 'Users to Update:'}</strong> {results.usersUpdated}
                  </div>
                  <div className="text-success">
                    <strong>{t('admin.importEmployees.reviewsToCreate') || 'Reviews to Create:'}</strong> {results.reviewsCreated}
                  </div>
                  <div className="text-primary">
                    <strong>{t('admin.importEmployees.reviewsToUpdate') || 'Reviews to Update:'}</strong> {results.reviewsUpdated}
                  </div>
                  <div className="text-warning">
                    <strong>{t('admin.importEmployees.skipped') || 'Skipped:'}</strong> {results.skipped}
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              {preview && preview.length > 0 && (
                <div className="import-preview-section">
                  <h4>
                    {t('admin.importEmployees.previewSample') || 'Sample of First 10 Rows'}
                  </h4>
                  <div className="import-table-scroll">
                    <table className="import-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Email</th>
                          <th>Name</th>
                          <th>Action</th>
                          <th>Has Scores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.row}</td>
                            <td>{item.email}</td>
                            <td>{item.name || '(from email)'}</td>
                            <td>
                              <span className={`import-action-badge ${item.action === 'CREATE_USER' ? 'import-action-badge-create' : 'import-action-badge-update'}`}>
                                {item.action === 'CREATE_USER' ? 'Create' : 'Update'}
                              </span>
                            </td>
                            <td>
                              {item.hasScores ? 'Yes' : 'No'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors */}
              {results.errors && results.errors.length > 0 && (
                <div className="import-errors-section">
                  <h4>
                    {t('admin.importEmployees.errors') || 'Errors'} ({results.errors.length})
                  </h4>
                  <div className="import-errors-scroll">
                    <table className="import-errors-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.errors.map((err, idx) => (
                          <tr key={idx}>
                            <td>{err.row}</td>
                            <td>{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="import-button-group">
                <button
                  onClick={handleProceedWithImport}
                  disabled={isUploading || (results.usersCreated + results.usersUpdated + results.reviewsCreated + results.reviewsUpdated === 0)}
                  className="admin-btn admin-btn-primary"
                >
                  {isUploading ? (
                    <>
                      <span className="admin-loading-spinner" />
                      {t('admin.importEmployees.importing') || 'Importing...'}
                    </>
                  ) : (
                    t('admin.importEmployees.proceedImport') || 'Proceed with Import'
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="admin-btn admin-btn-secondary"
                  disabled={isUploading}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Final Results */}
          {results && !dryRun && (
            <div>
              <div className="import-success-banner">
                <h4>
                  {t('admin.importEmployees.complete') || 'Import Complete!'}
                </h4>
                <div className="import-results-grid">
                  <div>
                    <strong>{t('admin.importEmployees.totalRows') || 'Total Rows:'}</strong> {results.total}
                  </div>
                  <div className="text-success">
                    <strong>{t('admin.importEmployees.usersCreated') || 'Users Created:'}</strong> {results.usersCreated}
                  </div>
                  <div className="text-primary">
                    <strong>{t('admin.importEmployees.usersUpdated') || 'Users Updated:'}</strong> {results.usersUpdated}
                  </div>
                  <div className="text-success">
                    <strong>{t('admin.importEmployees.reviewsCreated') || 'Reviews Created:'}</strong> {results.reviewsCreated}
                  </div>
                  <div className="text-primary">
                    <strong>{t('admin.importEmployees.reviewsUpdated') || 'Reviews Updated:'}</strong> {results.reviewsUpdated}
                  </div>
                  <div className="text-warning">
                    <strong>{t('admin.importEmployees.skipped') || 'Skipped:'}</strong> {results.skipped}
                  </div>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="import-errors-section">
                  <h4>
                    {t('admin.importEmployees.errors') || 'Errors'} ({results.errors.length})
                  </h4>
                  <div className="import-table-scroll">
                    <table className="import-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.errors.map((err, idx) => (
                          <tr key={idx}>
                            <td>{err.row}</td>
                            <td className="text-error">{err.message}</td>
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
              >
                {t('admin.importEmployees.importAnother') || 'Import Another File'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
