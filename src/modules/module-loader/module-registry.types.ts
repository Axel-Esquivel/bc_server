import { ModuleCategory } from './module.config';

export interface ModuleRegistryEntry {
  key: string;
  name: string;
  description?: string;
  version: string;
  dependencies: string[];
  isSystem: boolean;
  isInstallable: boolean;
  category: ModuleCategory;
  suite: string;
  tags: string[];
  order: number;
  icon?: string;
}
