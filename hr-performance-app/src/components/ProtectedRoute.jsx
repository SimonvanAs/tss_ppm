import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { UserRole } from '../config/auth';

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  const { t } = useLanguage();
  return (
    <div className="auth-loading">
      <div className="auth-loading-spinner"></div>
      <p>{t('common.loading')}</p>
    </div>
  );
}

/**
 * Access denied component
 */
function AccessDenied({ requiredRoles }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="auth-denied">
      <h2>{t('common.accessDenied')}</h2>
      <p>{t('pages.accessDenied.message') || 'You do not have permission to access this page.'}</p>
      {user && (
        <p className="auth-denied-info">
          {t('pages.accessDenied.currentRole') || 'Your current role'}: <strong>{user.role}</strong>
          {requiredRoles && requiredRoles.length > 0 && (
            <>
              <br />
              {t('pages.accessDenied.requiredRoles') || 'Required roles'}: <strong>{requiredRoles.join(', ')}</strong>
            </>
          )}
        </p>
      )}
      <div className="auth-denied-actions">
        <button onClick={() => window.history.back()}>{t('common.goBack')}</button>
        <button onClick={() => logout()}>{t('common.logout') || 'Logout'}</button>
      </div>
    </div>
  );
}

/**
 * Protected route wrapper
 * Requires authentication and optionally specific roles
 */
export function ProtectedRoute({ children, roles = [], requireAuth = true }) {
  const { isAuthenticated, isLoading, user, hasRoles, login } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    login(window.location.href);
    return <LoadingSpinner />;
  }

  // Check role requirements
  if (roles.length > 0 && !hasRoles(roles)) {
    return <AccessDenied requiredRoles={roles} />;
  }

  return children;
}

/**
 * Role guard component
 * Conditionally renders children based on user roles
 */
export function RoleGuard({ children, allowedRoles = [], fallback = null }) {
  const { isAuthenticated, user, hasRoles } = useAuth();

  if (!isAuthenticated || !user) {
    return fallback;
  }

  if (allowedRoles.length > 0 && !hasRoles(allowedRoles)) {
    return fallback;
  }

  return children;
}

/**
 * Specific role guards for common use cases
 */
export function ManagerGuard({ children, fallback = null }) {
  return (
    <RoleGuard
      allowedRoles={[UserRole.MANAGER, UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function HRGuard({ children, fallback = null }) {
  return (
    <RoleGuard
      allowedRoles={[UserRole.HR, UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function AdminGuard({ children, fallback = null }) {
  return (
    <RoleGuard
      allowedRoles={[UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export function SuperAdminGuard({ children, fallback = null }) {
  return (
    <RoleGuard
      allowedRoles={[UserRole.TSS_SUPER_ADMIN]}
      fallback={fallback}
    >
      {children}
    </RoleGuard>
  );
}

export default ProtectedRoute;
