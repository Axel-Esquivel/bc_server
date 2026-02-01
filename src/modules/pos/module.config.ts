const moduleConfig = {
  name: 'pos',
  version: '1.0.0',
  enabled: true,
  dependencies: ['inventory', 'Organizations'],
  setupWizard: {
    steps: [
      {
        id: 'register',
        title: 'Caja y moneda',
        description: 'Define la caja y moneda por defecto.',
        fields: [
          {
            key: 'registerName',
            label: 'Nombre de la caja',
            type: 'text',
            required: true,
          },
          {
            key: 'defaultCurrency',
            label: 'Moneda',
            type: 'select',
            required: true,
            dataSource: 'currencies',
          },
        ],
      },
      {
        id: 'tax',
        title: 'Impuestos',
        description: 'Configura la tasa de impuesto por defecto.',
        fields: [
          {
            key: 'defaultTaxRate',
            label: 'Tasa por defecto',
            type: 'select',
            options: [
              { label: '0%', value: '0' },
              { label: '5%', value: '5' },
              { label: '10%', value: '10' },
              { label: '15%', value: '15' },
              { label: '21%', value: '21' },
            ],
          },
        ],
      },
    ],
  },
};

export default moduleConfig;
