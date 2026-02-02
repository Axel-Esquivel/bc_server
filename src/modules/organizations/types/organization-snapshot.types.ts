export interface OrganizationOrganizationModuleSnapshot {
  key: string;
  enabled?: boolean;
  configured?: boolean;
  status?: string;
}

export interface OrganizationOrganizationsnapshot {
  id: string;
  name?: string;
  organizationId?: string;
  enabledModules?: OrganizationOrganizationModuleSnapshot[];
  moduleSettings?: Record<string, unknown>;
}
