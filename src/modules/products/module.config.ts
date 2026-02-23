import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'products',
  name: 'products',
  version: '1.0.0',
  enabled: true,
  dependencies: [],
  description: 'Productos y catalogo.',
  category: 'master-data',
  suite: 'master-data-suite',
  tags: ['products'],
  order: 10,
  icon: 'pi pi-box',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
