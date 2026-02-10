import { SettingsSchema, SetupWizardConfig } from '../../core/types/organization-setup-settings.types';

export interface ModuleConfig {
  /**
   * Stable key used for dependencies and installation.
   */
  key?: string;
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
  /**
   * Marks a module as internal/system and not meant for user installation.
   */
  isSystem?: boolean;
  /**
   * Controls whether the module should appear as installable in setup.
   */
  isInstallable?: boolean;
  /**
   * Optional setup wizard schema for module initialization.
   */
  setupWizard?: SetupWizardConfig;
  /**
   * Optional settings schema for module configuration.
   */
  settingsSchema?: SettingsSchema;
  /**
   * Optional human-friendly description for module catalogs.
   */
  description?: string;
  /**
   * Optional category/group for module catalogs.
   */
  category?: string;
  /**
   * Optional icon key for module catalogs.
   */
  icon?: string;
}

/**
 * Template example to be copied by feature modules when defining their own module.config.ts
 * (real implementations can later be persisted in MongoDB or configuration service).
 */
export const moduleTemplate: ModuleConfig = {
  key: 'my-module',
  name: 'my-module',
  version: '0.0.1',
  enabled: false,
  dependencies: [],
  isSystem: false,
  isInstallable: true,
  description: 'Describe what the module provides.',
  category: 'general',
  icon: 'pi pi-box',
};

const moduleConfig: ModuleConfig = {
  key: 'module-loader',
  name: 'module-loader',
  version: '1.0.0',
  enabled: true,
  dependencies: [],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;



