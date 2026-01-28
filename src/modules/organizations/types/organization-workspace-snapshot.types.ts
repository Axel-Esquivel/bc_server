export interface OrganizationWorkspaceModuleSnapshot {
  key: string;
  enabled?: boolean;
  configured?: boolean;
  status?: string;
}

export interface OrganizationWorkspaceSnapshot {
  id: string;
  name?: string;
  organizationId?: string;
  enabledModules?: OrganizationWorkspaceModuleSnapshot[];
  moduleSettings?: Record<string, unknown>;
}
