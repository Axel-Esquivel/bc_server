import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'stock',
  name: 'stock',
  version: '1.0.0',
  enabled: true,
  dependencies: ['auth'],
  description: 'Stock como proyeccion por ubicacion.',
  category: 'inventory',
  suite: 'inventory-suite',
  tags: ['inventory', 'stock'],
  order: 30,
  icon: 'pi pi-database',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
