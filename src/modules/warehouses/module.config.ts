import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  name: 'warehouses',
  version: '1.0.0',
  enabled: true,
  dependencies: ['companies', 'branches', 'auth'],
};

export default moduleConfig;
