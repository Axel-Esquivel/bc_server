import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'inventory',
  name: 'inventory',
  version: '1.0.0',
  enabled: true,
  dependencies: ['warehouses'],
};

export default moduleConfig;

