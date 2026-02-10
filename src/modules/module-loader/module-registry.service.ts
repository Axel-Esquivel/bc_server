import { Injectable } from '@nestjs/common';
import { ModuleLoaderService } from './module-loader.service';
import { ModuleRegistryEntry } from './module-registry.types';

@Injectable()
export class ModuleRegistryService {
  constructor(private readonly moduleLoader: ModuleLoaderService) {}

  listModules(): ModuleRegistryEntry[] {
    return this.moduleLoader.listModules().map((descriptor) => {
      const config = descriptor.config;
      return {
        key: config.name,
        name: config.name,
        description: config.description,
        version: config.version,
        dependencies: Array.isArray(config.dependencies) ? config.dependencies : [],
        isSystem: config.isSystem ?? false,
        isInstallable: config.isInstallable ?? true,
        category: config.category,
        icon: config.icon,
      };
    });
  }

  getModuleMap(): Map<string, ModuleRegistryEntry> {
    return new Map(this.listModules().map((module) => [module.key, module]));
  }
}
