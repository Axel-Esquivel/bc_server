export interface ModuleRegistryEntry {
  key: string;
  name: string;
  description?: string;
  version: string;
  dependencies: string[];
  isSystem: boolean;
  isInstallable: boolean;
  category?: string;
  icon?: string;
}
