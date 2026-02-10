import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'locations',
  name: 'locations',
  version: '1.0.0',
  enabled: true,
  dependencies: ['companies'],
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;

