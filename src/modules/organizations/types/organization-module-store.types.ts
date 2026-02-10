export interface OrganizationModuleStoreItem {
  key: string;
  name: string;
  description?: string;
  version: string;
  dependencies: string[];
  isSystem: boolean;
  category?: string;
  icon?: string;
  installed: boolean;
}

export interface OrganizationModuleStoreResponse {
  available: OrganizationModuleStoreItem[];
  installed: OrganizationModuleStoreItem[];
}

export interface OrganizationModuleInstallResponse {
  installedKeys: string[];
  alreadyInstalledKeys: string[];
  skippedSystemKeys: string[];
  errors?: string[];
}

export interface OrganizationModuleUninstallResponse {
  uninstalledKeys: string[];
  alreadyUninstalledKeys: string[];
}
