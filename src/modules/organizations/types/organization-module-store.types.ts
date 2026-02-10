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
  modules: OrganizationModuleStoreItem[];
}

export interface OrganizationModuleInstallResponse {
  installed: string[];
  alreadyInstalled: string[];
  skippedSystem: string[];
  errors?: string[];
}
