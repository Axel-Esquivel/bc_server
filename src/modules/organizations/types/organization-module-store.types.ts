import { ModuleCategory } from '../../module-loader/module.config';

export interface OrganizationModuleStoreItem {
  key: string;
  name: string;
  description?: string;
  version: string;
  dependencies: string[];
  isSystem: boolean;
  category: ModuleCategory;
  suite: string;
  tags: string[];
  order: number;
  icon?: string;
  installed: boolean;
}

export interface OrganizationModuleStoreResponse {
  available: OrganizationModuleStoreItem[];
  installed: OrganizationModuleStoreItem[];
}

export interface SuiteOperationError {
  key: string;
  message: string;
}

export interface SuiteOperationResponse {
  installed: string[];
  skipped: string[];
  errors: SuiteOperationError[];
  blockers: string[];
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
