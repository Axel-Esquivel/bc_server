import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'pos',
  name: 'pos',
  version: '1.0.0',
  enabled: true,
  dependencies: ['auth', 'companies', 'inventory', 'organizations', 'outbox', 'products'],
  description: 'Punto de venta base.',
  category: 'pos',
  suite: 'pos-suite',
  tags: ['pos'],
  order: 10,
  icon: 'pi pi-shopping-cart',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
