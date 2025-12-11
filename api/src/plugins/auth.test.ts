import { describe, it, expect } from 'vitest';
import { UserRole, roleHierarchy, hasMinimumRole, canAccessUser, AuthUser } from './auth.js';

describe('UserRole enum', () => {
  it('should have all expected roles', () => {
    expect(UserRole.EMPLOYEE).toBe('EMPLOYEE');
    expect(UserRole.MANAGER).toBe('MANAGER');
    expect(UserRole.HR).toBe('HR');
    expect(UserRole.OPCO_ADMIN).toBe('OPCO_ADMIN');
    expect(UserRole.TSS_SUPER_ADMIN).toBe('TSS_SUPER_ADMIN');
  });
});

describe('roleHierarchy', () => {
  it('should have correct hierarchy levels', () => {
    expect(roleHierarchy[UserRole.EMPLOYEE]).toBe(1);
    expect(roleHierarchy[UserRole.MANAGER]).toBe(2);
    expect(roleHierarchy[UserRole.HR]).toBe(3);
    expect(roleHierarchy[UserRole.OPCO_ADMIN]).toBe(4);
    expect(roleHierarchy[UserRole.TSS_SUPER_ADMIN]).toBe(5);
  });

  it('should maintain correct ordering', () => {
    expect(roleHierarchy[UserRole.EMPLOYEE]).toBeLessThan(roleHierarchy[UserRole.MANAGER]);
    expect(roleHierarchy[UserRole.MANAGER]).toBeLessThan(roleHierarchy[UserRole.HR]);
    expect(roleHierarchy[UserRole.HR]).toBeLessThan(roleHierarchy[UserRole.OPCO_ADMIN]);
    expect(roleHierarchy[UserRole.OPCO_ADMIN]).toBeLessThan(roleHierarchy[UserRole.TSS_SUPER_ADMIN]);
  });
});

describe('hasMinimumRole', () => {
  it('should return true when user has exact required role', () => {
    expect(hasMinimumRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
    expect(hasMinimumRole(UserRole.EMPLOYEE, UserRole.EMPLOYEE)).toBe(true);
    expect(hasMinimumRole(UserRole.TSS_SUPER_ADMIN, UserRole.TSS_SUPER_ADMIN)).toBe(true);
  });

  it('should return true when user has higher role', () => {
    expect(hasMinimumRole(UserRole.MANAGER, UserRole.EMPLOYEE)).toBe(true);
    expect(hasMinimumRole(UserRole.TSS_SUPER_ADMIN, UserRole.EMPLOYEE)).toBe(true);
    expect(hasMinimumRole(UserRole.HR, UserRole.MANAGER)).toBe(true);
    expect(hasMinimumRole(UserRole.OPCO_ADMIN, UserRole.HR)).toBe(true);
  });

  it('should return false when user has lower role', () => {
    expect(hasMinimumRole(UserRole.EMPLOYEE, UserRole.MANAGER)).toBe(false);
    expect(hasMinimumRole(UserRole.MANAGER, UserRole.HR)).toBe(false);
    expect(hasMinimumRole(UserRole.HR, UserRole.OPCO_ADMIN)).toBe(false);
    expect(hasMinimumRole(UserRole.OPCO_ADMIN, UserRole.TSS_SUPER_ADMIN)).toBe(false);
  });
});

describe('canAccessUser', () => {
  const createAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    id: 'user-1',
    keycloakId: 'kc-user-1',
    email: 'user@example.com',
    roles: [],
    role: UserRole.EMPLOYEE,
    ...overrides,
  });

  it('should allow access to own data by id', () => {
    const authUser = createAuthUser({ id: 'user-123' });
    expect(canAccessUser(authUser, 'user-123')).toBe(true);
  });

  it('should allow access to own data by keycloakId', () => {
    const authUser = createAuthUser({ keycloakId: 'kc-user-456' });
    expect(canAccessUser(authUser, 'kc-user-456')).toBe(true);
  });

  it('should allow managers to access other users', () => {
    const authUser = createAuthUser({ role: UserRole.MANAGER });
    expect(canAccessUser(authUser, 'other-user-id')).toBe(true);
  });

  it('should allow HR to access other users', () => {
    const authUser = createAuthUser({ role: UserRole.HR });
    expect(canAccessUser(authUser, 'other-user-id')).toBe(true);
  });

  it('should allow OpCo Admin to access other users', () => {
    const authUser = createAuthUser({ role: UserRole.OPCO_ADMIN });
    expect(canAccessUser(authUser, 'other-user-id')).toBe(true);
  });

  it('should allow TSS Super Admin to access other users', () => {
    const authUser = createAuthUser({ role: UserRole.TSS_SUPER_ADMIN });
    expect(canAccessUser(authUser, 'other-user-id')).toBe(true);
  });

  it('should deny employees access to other users data', () => {
    const authUser = createAuthUser({
      id: 'user-1',
      keycloakId: 'kc-user-1',
      role: UserRole.EMPLOYEE
    });
    expect(canAccessUser(authUser, 'other-user-id')).toBe(false);
  });
});
