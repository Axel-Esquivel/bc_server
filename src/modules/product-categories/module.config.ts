import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'product-categories',
  name: 'product-categories',
  version: '1.0.0',
  enabled: true,
  dependencies: ['auth'],
  description: 'Categorias de productos.',
  category: 'master-data',
  tags: ['products', 'categories'],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;
