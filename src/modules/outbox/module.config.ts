import { ModuleConfig } from '../module-loader/module.config';

const moduleConfig: ModuleConfig = {
  key: 'outbox',
  name: 'outbox',
  version: '1.0.0',
  enabled: true,
  dependencies: ['realtime'],
  description: 'Outbox de eventos para integraciones y notificaciones.',
  category: 'utilities',
  tags: ['outbox', 'events'],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;
