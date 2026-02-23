import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ModuleStateService } from '../../core/database/module-state.service';
import { ModuleCategory, ModuleConfig, moduleCategories } from './module.config';

export interface ModuleDescriptor {
  config: ModuleConfig;
  /**
   * Dependencies that are currently available and enabled.
   */
  resolvedDependencies: string[];
  /**
   * Dependencies that are missing or disabled. Presence here means the module is degraded.
   */
  missingDependencies: string[];
  /**
   * Indicates the module cannot run with full capabilities because of missing dependencies.
   */
  degraded: boolean;
}

interface ModuleLoaderState {
  modules: ModuleConfig[];
}

@Injectable()
export class ModuleLoaderService implements OnModuleInit {
  private readonly logger = new Logger(ModuleLoaderService.name);
  private readonly stateKey = 'module:module-loader';
  /**
   * In-memory store of available modules. Replace with MongoDB persistence when ready.
   */
  private readonly modules = new Map<string, ModuleDescriptor>();

  private readonly modulesDir = path.resolve(__dirname, '..');

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const storedState = await this.moduleState.loadState<ModuleLoaderState>(this.stateKey, { modules: [] });
    const filesystemModules = this.readModuleConfigs();
    const configs = this.mergeConfigs(filesystemModules, storedState.modules ?? []);
    if (configs.length === 0) {
      this.logger.warn('No module.config.ts files found. Module catalog will be empty.');
    }
    this.loadModules(configs);
    this.persistModules();
  }

  listModules(): ModuleDescriptor[] {
    return Array.from(this.modules.values()).map((descriptor) => ({
      ...descriptor,
      config: { ...descriptor.config },
      resolvedDependencies: [...descriptor.resolvedDependencies],
      missingDependencies: [...descriptor.missingDependencies],
    }));
  }

  enableModule(name: string): ModuleDescriptor {
    const descriptor = this.modules.get(name);
    if (!descriptor) {
      throw new NotFoundException(`Module ${name} not found`);
    }

    descriptor.config.enabled = true;
    this.resolveDependencies();
    this.persistModules();
    return this.modules.get(name)!;
  }

  disableModule(name: string): ModuleDescriptor {
    const descriptor = this.modules.get(name);
    if (!descriptor) {
      throw new NotFoundException(`Module ${name} not found`);
    }

    descriptor.config.enabled = false;
    this.resolveDependencies();
    this.persistModules();
    return this.modules.get(name)!;
  }

  private loadModules(configs: ModuleConfig[]): void {
    configs.forEach((config) => {
      this.modules.set(config.name, {
        config: { ...config },
        resolvedDependencies: [],
        missingDependencies: [],
        degraded: false,
      });
    });

    this.resolveDependencies();
  }

  private readModuleConfigs(): ModuleConfig[] {
    const entries = fs.readdirSync(this.modulesDir, { withFileTypes: true });
    const configs: ModuleConfig[] = [];

    entries.forEach((entry) => {
      if (!entry.isDirectory()) return;

      const configPathJs = path.join(this.modulesDir, entry.name, 'module.config.js');
      const configPathTs = path.join(this.modulesDir, entry.name, 'module.config.ts');
      const configPath = fs.existsSync(configPathJs)
        ? configPathJs
        : fs.existsSync(configPathTs)
          ? configPathTs
          : null;

      if (!configPath) {
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const loaded = require(configPath);
        const rawConfig = (loaded?.default ?? loaded?.moduleConfig ?? loaded?.config ?? loaded) as ModuleConfig;
        if (!rawConfig || !rawConfig.name) {
          this.logger.warn(`Invalid module.config in ${entry.name}`);
          return;
        }

        const normalizedCategory = this.normalizeCategory(rawConfig.category);
        const normalized: ModuleConfig = {
          key: rawConfig.key ?? rawConfig.name ?? entry.name,
          name: rawConfig.name || rawConfig.key || entry.name,
          version: rawConfig.version || '1.0.0',
          enabled: rawConfig.enabled ?? true,
          dependencies: rawConfig.dependencies ?? [],
          isSystem: rawConfig.isSystem ?? false,
          isInstallable: rawConfig.isInstallable ?? true,
          setupWizard: rawConfig.setupWizard,
          settingsSchema: rawConfig.settingsSchema,
          description: rawConfig.description,
          category: normalizedCategory,
          suite: rawConfig.suite?.trim() || 'utilities-suite',
          tags: Array.isArray(rawConfig.tags)
            ? rawConfig.tags
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0)
            : [],
          order: typeof rawConfig.order === 'number' ? rawConfig.order : 100,
          icon: rawConfig.icon,
        };

        configs.push(normalized);
      } catch (error) {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.warn(`Failed to load module config for ${entry.name}: ${message}`);
      }
    });

    return configs;
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

  private mergeConfigs(filesystemConfigs: ModuleConfig[], storedConfigs: ModuleConfig[]): ModuleConfig[] {
    const stored = new Map(storedConfigs.map((config) => [config.name, config]));
    return filesystemConfigs.map((config) => {
      const persisted = stored.get(config.name);
      return {
        ...config,
        enabled: persisted?.enabled ?? config.enabled,
      };
    });
  }

  private resolveDependencies(): void {
    this.modules.forEach((descriptor) => {
      const dependencies = descriptor.config.dependencies || [];
      const resolvedDependencies: string[] = [];
      const missingDependencies: string[] = [];

      dependencies.forEach((dependencyName) => {
        const dependencyDescriptor = this.modules.get(dependencyName);
        const isDependencyActive = dependencyDescriptor?.config.enabled;

        if (dependencyDescriptor && isDependencyActive) {
          resolvedDependencies.push(dependencyName);
        } else {
          missingDependencies.push(dependencyName);
        }
      });

      descriptor.resolvedDependencies = resolvedDependencies;
      descriptor.missingDependencies = missingDependencies;
      descriptor.degraded = missingDependencies.length > 0;
    });
  }

  private persistModules() {
    const configs = Array.from(this.modules.values()).map((descriptor) => ({
      ...descriptor.config,
    }));
    void this.moduleState
      .saveState<ModuleLoaderState>(this.stateKey, { modules: configs })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist module loader state: ${message}`);
      });
  }
}
