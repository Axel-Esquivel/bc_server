import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'inventory-events',
  name: 'inventory-events',
  version: '1.0.0',
  enabled: true,
  dependencies: ['stock-movements', 'outbox', 'locations', 'auth'],
  description: 'Consumidor de eventos externos para inventario.',
  category: 'inventario',
  icon: 'pi pi-bolt',
  isSystem: false,
  isInstallable: true,
};

export default moduleConfig;
