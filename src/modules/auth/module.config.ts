import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'auth',
  name: 'auth',
  version: '1.0.0',
  enabled: true,
  dependencies: ['users'],
  category: 'core',
  suite: 'core-suite',
  tags: ['core'],
  order: 10,
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;
