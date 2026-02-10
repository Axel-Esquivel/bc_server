import { Injectable } from '@nestjs/common';
import { ModuleConfig } from './module.config';
import { ModuleRegistryEntry } from './module-registry.types';
import { MODULE_REGISTRY_CONFIGS } from './module-registry.data';

@Injectable()
export class ModuleRegistryService {
  listModules(): ModuleRegistryEntry[] {
    return MODULE_REGISTRY_CONFIGS.map((config) => this.toRegistryEntry(config)).filter(Boolean);
  }

  listInstallableModules(): ModuleRegistryEntry[] {
    return this.listModules().filter((module) => !module.isSystem && module.isInstallable !== false);
  }

  getModuleMap(): Map<string, ModuleRegistryEntry> {
    return new Map(this.listModules().map((module) => [module.key, module]));
  }

  private toRegistryEntry(config: ModuleConfig | undefined | null): ModuleRegistryEntry {
    if (!config) {
      return {
        key: 'unknown',
        name: 'unknown',
        version: '1.0.0',
        dependencies: [],
        isSystem: true,
        isInstallable: false,
      };
    }
    const key = config.key ?? config.name;
    return {
      key,
      name: config.name || key,
      description: config.description,
      version: config.version || '1.0.0',
      dependencies: Array.isArray(config.dependencies) ? config.dependencies : [],
      isSystem: config.isSystem ?? false,
      isInstallable: config.isInstallable ?? true,
      category: config.category,
      icon: config.icon,
    };
  }
}
