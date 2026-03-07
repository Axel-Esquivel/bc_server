import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'price-lists',
  name: 'price-lists',
  version: '1.0.0',
  enabled: true,
  dependencies: [],
  description: 'Listas de precios y reglas.',
  category: 'master-data',
  suite: 'master-data-suite',
  tags: ['pricing', 'catalogs'],
  order: 20,
  icon: 'pi pi-tags',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;



