export interface ModuleConfig {
  /**
   * Unique module name. This should be reused across the application when referencing dependencies.
   */
  name: string;
  /**
   * Semantic version of the module implementation.
   */
  version: string;
  /**
   * Flag to enable/disable the module at runtime.
   */
  enabled: boolean;
  /**
   * Names of other modules that must be present and enabled for this module to be fully operational.
   */
  dependencies?: string[];
}

/**
 * Template example to be copied by feature modules when defining their own module.config.ts
 * (real implementations can later be persisted in MongoDB or configuration service).
 */
export const moduleTemplate: ModuleConfig = {
  name: 'my-module',
  version: '0.0.1',
  enabled: false,
  dependencies: [],
};

const moduleConfig: ModuleConfig = {
  name: 'module-loader',
  version: '1.0.0',
  enabled: true,
  dependencies: [],
};

export default moduleConfig;
