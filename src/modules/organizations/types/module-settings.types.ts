export interface OrganizationModuleSettingsMap {
  [moduleKey: string]: unknown;
}

export interface PriceListsModuleSettings {
  defaultByCompanyId: Record<string, string | null>;
}
