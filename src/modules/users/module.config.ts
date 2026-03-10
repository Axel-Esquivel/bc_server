const moduleConfig = {
  key: 'users',
  name: 'users',
  version: '1.0.0',
  enabled: true,
  dependencies: ['auth', 'branches', 'companies', 'organizations'],
  isSystem: true,
  isInstallable: false,
};

export default moduleConfig;



