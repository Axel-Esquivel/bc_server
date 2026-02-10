import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'inventory',
  name: 'inventory',
  version: '1.0.0',
  enabled: true,
  dependencies: ['warehouses'],
  description: 'Inventario y stock.',
  category: 'inventario',
  icon: 'pi pi-box',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;



