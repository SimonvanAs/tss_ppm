import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../config/auth';

/**
 * Role labels for display
 */
const roleLabels = {
  [UserRole.EMPLOYEE]: 'Employee',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.HR]: 'HR',
  [UserRole.OPCO_ADMIN]: 'OpCo Admin',
  [UserRole.TSS_SUPER_ADMIN]: 'Super Admin',
};

/**
 * Role colors for visual distinction
 */
const roleColors = {
  [UserRole.EMPLOYEE]: '#6c757d',
  [UserRole.MANAGER]: '#007bff',
  [UserRole.HR]: '#28a745',
  [UserRole.OPCO_ADMIN]: '#fd7e14',
  [UserRole.TSS_SUPER_ADMIN]: '#CC0E70',
};

/**
 * Development mode role switcher component
 * Only visible when auth is disabled
 */
export function DevRoleSwitcher() {
  const { isDevMode, user, switchDevRole, availableRoles } = useAuth();

  if (!isDevMode) return null;

  const currentRole = user?.role;

  return (
    <div className="dev-role-switcher">
      <span className="dev-label">DEV</span>
      <select
        value={currentRole || ''}
        onChange={(e) => switchDevRole(e.target.value)}
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          border: `2px solid ${roleColors[currentRole] || '#ccc'}`,
          background: 'white',
          fontSize: '12px',
          fontWeight: '600',
          color: roleColors[currentRole] || '#333',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {availableRoles.map((role) => (
          <option key={role} value={role}>
            {roleLabels[role] || role}
          </option>
        ))}
      </select>
      <style>{`
        .dev-role-switcher {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          margin-right: 12px;
        }
        .dev-label {
          font-size: 10px;
          font-weight: 700;
          color: #856404;
          letter-spacing: 0.5px;
        }
        .dev-role-switcher select:hover {
          opacity: 0.9;
        }
        .dev-role-switcher select:focus {
          box-shadow: 0 0 0 2px rgba(204, 14, 112, 0.2);
        }
      `}</style>
    </div>
  );
}
