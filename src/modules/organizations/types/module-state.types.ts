export enum OrganizationModuleStatus {
  Disabled = 'disabled',
  EnabledUnconfigured = 'enabled_unconfigured',
  Configured = 'configured',
}

export interface OrganizationModuleState {
  status: OrganizationModuleStatus;
  configuredAt?: string;
  configuredBy?: string;
}

export type OrganizationModuleKey = string;

export type OrganizationModuleStates = Record<OrganizationModuleKey, OrganizationModuleState>;
