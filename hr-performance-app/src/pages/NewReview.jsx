import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { reviewsApi, usersApi, adminApi } from '../services/api';
import './Pages.css';

export function NewReview() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [tovLevels, setTovLevels] = useState([]);

  const [formData, setFormData] = useState({
    employeeId: '',
    managerId: user?.id || '',
    year: new Date().getFullYear(),
    tovLevelId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [employeesData, tovLevelsData] = await Promise.all([
        usersApi.list({ limit: 100 }),
        adminApi.getTovLevels(),
      ]);

      // Extract array from response (handle both { data: [...] } and direct array)
      const employeesList = Array.isArray(employeesData)
        ? employeesData
        : (Array.isArray(employeesData?.data) ? employeesData.data : []);
      const tovLevelsList = Array.isArray(tovLevelsData)
        ? tovLevelsData
        : (Array.isArray(tovLevelsData?.data) ? tovLevelsData.data : []);

      console.log('Loaded employees:', employeesList.length, 'TOV levels:', tovLevelsList.length);

      setEmployees(employeesList);
      setTovLevels(tovLevelsList);

      // Set default manager to current user if they are a manager
      if (user?.id && !formData.managerId) {
        setFormData(prev => ({ ...prev, managerId: user.id }));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fill manager and TOV level when employee is selected
    if (name === 'employeeId') {
      const selectedEmployee = employees.find(emp => emp.id === value);
      if (selectedEmployee) {
        setFormData(prev => ({
          ...prev,
          // Use employee's manager if available, otherwise keep current
          managerId: selectedEmployee.managerId || prev.managerId,
          tovLevelId: selectedEmployee.tovLevelId || prev.tovLevelId,
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.managerId || !formData.tovLevelId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const review = await reviewsApi.create({
        employeeId: formData.employeeId,
        managerId: formData.managerId,
        year: parseInt(formData.year),
        tovLevelId: formData.tovLevelId,
      });

      // Navigate to the new review
      navigate(`/review/${review.id}`);
    } catch (err) {
      console.error('Failed to create review:', err);
      setError(err.message || 'Failed to create review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('pages.newReview.title') || 'Create New Review'}</h1>
      </div>

      <div className="card">
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="year">{t('pages.newReview.year') || 'Year'} *</label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
            >
              {[0, 1, 2].map(offset => {
                const year = new Date().getFullYear() + offset;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="employeeId">{t('pages.newReview.employee') || 'Employee'} *</label>
            <select
              id="employeeId"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
            >
              <option value="">{t('pages.newReview.selectEmployee') || 'Select employee...'}</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="managerId">{t('pages.newReview.manager') || 'Manager'} *</label>
            <select
              id="managerId"
              name="managerId"
              value={formData.managerId}
              onChange={handleChange}
              required
            >
              <option value="">{t('pages.newReview.selectManager') || 'Select manager...'}</option>
              {employees
                .filter(emp => ['MANAGER', 'HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'].includes(emp.role))
                .map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.email})
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tovLevelId">{t('pages.newReview.tovLevel') || 'TOV Level'} *</label>
            <select
              id="tovLevelId"
              name="tovLevelId"
              value={formData.tovLevelId}
              onChange={handleChange}
              required
            >
              <option value="">{t('pages.newReview.selectTovLevel') || 'Select TOV level...'}</option>
              {tovLevels.map(level => (
                <option key={level.id} value={level.id}>
                  {level.code} - {level.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (t('common.creating') || 'Creating...') : (t('pages.newReview.create') || 'Create Review')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}