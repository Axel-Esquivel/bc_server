import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'inventory',
  name: 'inventory',
  version: '1.0.0',
  enabled: true,
  dependencies: ['warehouses'],
  description: 'Inventario y stock.',
  category: 'inventory',
  suite: 'inventory-suite',
  tags: ['inventory'],
  order: 5,
  icon: 'pi pi-box',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;



