/**
 * OpCo Settings Schema and Utilities
 */

export interface ReviewCycleSettings {
  goalSettingStart: string | null;
  goalSettingEnd: string | null;
  midYearStart: string | null;
  midYearEnd: string | null;
  endYearStart: string | null;
  endYearEnd: string | null;
}

export interface ApprovalSettings {
  goalSettingRequiresManager: boolean;
  goalSettingRequiresHR: boolean;
  midYearRequiresManager: boolean;
  midYearRequiresHR: boolean;
  endYearRequiresManager: boolean;
  endYearRequiresHR: boolean;
}

export interface SignatureSettings {
  requireEmployeeSignature: boolean;
  requireManagerSignature: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  reminderDaysBeforeDeadline: number;
  overdueReminderIntervalDays: number;
  notifyOnPendingApprovals: boolean;
}

export interface BrandingSettings {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  customCss: string | null;
}

export interface WorkflowSettings {
  reviewCycle: ReviewCycleSettings;
  approvals: ApprovalSettings;
  signatures: SignatureSettings;
}

export interface OpCoSettings {
  workflow: WorkflowSettings;
  notifications: NotificationSettings;
  branding: BrandingSettings;
  [key: string]: unknown; // Allow indexing for Prisma JSON compatibility
}

export const DEFAULT_SETTINGS: OpCoSettings = {
  workflow: {
    reviewCycle: {
      goalSettingStart: null,
      goalSettingEnd: null,
      midYearStart: null,
      midYearEnd: null,
      endYearStart: null,
      endYearEnd: null,
    },
    approvals: {
      goalSettingRequiresManager: true,
      goalSettingRequiresHR: false,
      midYearRequiresManager: true,
      midYearRequiresHR: false,
      endYearRequiresManager: true,
      endYearRequiresHR: true,
    },
    signatures: {
      requireEmployeeSignature: true,
      requireManagerSignature: true,
    },
  },
  notifications: {
    enabled: false,
    reminderDaysBeforeDeadline: 7,
    overdueReminderIntervalDays: 3,
    notifyOnPendingApprovals: true,
  },
  branding: {
    logoUrl: null,
    primaryColor: '#CC0E70',
    accentColor: '#004A91',
    customCss: null,
  },
};

/**
 * Deep merge settings with defaults
 */
export function mergeWithDefaults(settings: Partial<OpCoSettings> | null | undefined): OpCoSettings {
  if (!settings) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    workflow: {
      reviewCycle: {
        ...DEFAULT_SETTINGS.workflow.reviewCycle,
        ...(settings.workflow?.reviewCycle || {}),
      },
      approvals: {
        ...DEFAULT_SETTINGS.workflow.approvals,
        ...(settings.workflow?.approvals || {}),
      },
      signatures: {
        ...DEFAULT_SETTINGS.workflow.signatures,
        ...(settings.workflow?.signatures || {}),
      },
    },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(settings.notifications || {}),
    },
    branding: {
      ...DEFAULT_SETTINGS.branding,
      ...(settings.branding || {}),
    },
  };
}

/**
 * Validate date ranges for review cycles
 * Returns an array of error messages (empty if valid)
 */
export function validateDateRanges(reviewCycle: ReviewCycleSettings): string[] {
  const errors: string[] = [];

  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const goalStart = parseDate(reviewCycle.goalSettingStart);
  const goalEnd = parseDate(reviewCycle.goalSettingEnd);
  const midStart = parseDate(reviewCycle.midYearStart);
  const midEnd = parseDate(reviewCycle.midYearEnd);
  const endStart = parseDate(reviewCycle.endYearStart);
  const endEnd = parseDate(reviewCycle.endYearEnd);

  // Check each period's start is before its end
  if (goalStart && goalEnd && goalStart >= goalEnd) {
    errors.push('Goal setting start date must be before end date');
  }
  if (midStart && midEnd && midStart >= midEnd) {
    errors.push('Mid-year review start date must be before end date');
  }
  if (endStart && endEnd && endStart >= endEnd) {
    errors.push('End-year review start date must be before end date');
  }

  // Check periods are sequential (if dates are set)
  if (goalEnd && midStart && goalEnd > midStart) {
    errors.push('Goal setting must end before mid-year review starts');
  }
  if (midEnd && endStart && midEnd > endStart) {
    errors.push('Mid-year review must end before end-year review starts');
  }

  return errors;
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate branding settings
 * Returns an array of error messages (empty if valid)
 */
export function validateBranding(branding: Partial<BrandingSettings>): string[] {
  const errors: string[] = [];

  if (branding.primaryColor && !isValidHexColor(branding.primaryColor)) {
    errors.push('Primary color must be a valid hex color (e.g., #CC0E70)');
  }
  if (branding.accentColor && !isValidHexColor(branding.accentColor)) {
    errors.push('Accent color must be a valid hex color (e.g., #004A91)');
  }

  return errors;
}
