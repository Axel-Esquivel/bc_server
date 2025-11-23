import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuleConfig } from './module.config';

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

@Injectable()
export class ModuleLoaderService {
  /**
   * In-memory store of available modules. Replace with MongoDB persistence when ready.
   */
  private readonly modules = new Map<string, ModuleDescriptor>();

  constructor() {
    // Seed initial modules. Later this will be loaded from MongoDB or configuration service.
    const initialModules: ModuleConfig[] = [
      {
        name: 'module-loader',
        version: '1.0.0',
        enabled: true,
        dependencies: [],
      },
    ];

    this.loadModules(initialModules);
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
    return this.modules.get(name)!;
  }

  disableModule(name: string): ModuleDescriptor {
    const descriptor = this.modules.get(name);
    if (!descriptor) {
      throw new NotFoundException(`Module ${name} not found`);
    }

    descriptor.config.enabled = false;
    this.resolveDependencies();
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
}
