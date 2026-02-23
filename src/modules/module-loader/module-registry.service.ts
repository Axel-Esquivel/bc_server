import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleCategory, ModuleConfig, moduleCategories } from './module.config';
import { ModuleRegistryEntry } from './module-registry.types';
import { MODULE_REGISTRY_CONFIGS } from './module-registry.data';

@Injectable()
export class ModuleRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ModuleRegistryService.name);

  onModuleInit(): void {
    this.validateGraph();
  }

  listModules(): ModuleRegistryEntry[] {
    return MODULE_REGISTRY_CONFIGS.map((config) => this.toRegistryEntry(config)).filter(Boolean);
  }

  listInstallableModules(): ModuleRegistryEntry[] {
    return this.listModules().filter((module) => !module.isSystem && module.isInstallable !== false);
  }

  getModuleMap(): Map<string, ModuleRegistryEntry> {
    return new Map(this.listModules().map((module) => [module.key, module]));
  }

  private validateGraph(): void {
    const registry = this.getModuleMap();
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stack: string[] = [];

    const visit = (key: string) => {
      if (visited.has(key)) {
        return;
      }
      if (visiting.has(key)) {
        const cycleStartIndex = stack.indexOf(key);
        const cyclePath = cycleStartIndex >= 0 ? [...stack.slice(cycleStartIndex), key] : [key];
        this.logger.error(`Module dependency cycle detected: ${cyclePath.join(' -> ')}`);
        return;
      }
      const current = registry.get(key);
      if (!current) {
        return;
      }
      visiting.add(key);
      stack.push(key);
      const dependencies = Array.isArray(current.dependencies) ? current.dependencies : [];
      dependencies.forEach((dependency) => visit(dependency));
      visiting.delete(key);
      stack.pop();
      visited.add(key);
    };

    registry.forEach((_, key) => visit(key));
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
        category: 'utilities',
        suite: 'utilities-suite',
        tags: [],
        order: 100,
      };
    }
    const key = config.key ?? config.name;
    const category = this.normalizeCategory(config.category);
    return {
      key,
      name: config.name || key,
      description: config.description,
      version: config.version || '1.0.0',
      dependencies: Array.isArray(config.dependencies) ? config.dependencies : [],
      isSystem: config.isSystem ?? false,
      isInstallable: config.isInstallable ?? true,
      category,
      suite: config.suite?.trim() || 'utilities-suite',
      tags: Array.isArray(config.tags)
        ? config.tags
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : [],
      order: typeof config.order === 'number' ? config.order : 100,
      icon: config.icon,
    };
  }

  private normalizeCategory(value?: string): ModuleCategory {
    if (!value) {
      return 'utilities';
    }
    if (moduleCategories.includes(value as ModuleCategory)) {
      return value as ModuleCategory;
    }
    return 'utilities';
  }
}
