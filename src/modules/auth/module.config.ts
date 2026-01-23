const moduleConfig = {
  name: 'auth',
  version: '1.0.0',
  enabled: true,
  dependencies: ['users', 'devices', 'workspaces'],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;
