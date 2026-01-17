const moduleConfig = {
  name: 'accounting',
  version: '1.0.0',
  enabled: true,
  dependencies: [],
  setupWizard: {
    steps: [
      {
        id: 'locale',
        title: 'Configuracion fiscal',
        description: 'Selecciona el pais y la moneda base.',
        fields: [
          {
            key: 'country',
            label: 'Pais',
            type: 'select',
            required: true,
            dataSource: 'countries',
          },
          {
            key: 'currency',
            label: 'Moneda',
            type: 'select',
            required: true,
            dataSource: 'currencies',
          },
        ],
      },
      {
        id: 'calendar',
        title: 'Periodo fiscal',
        description: 'Define el inicio del ejercicio fiscal.',
        fields: [
          {
            key: 'fiscalYearStart',
            label: 'Mes de inicio',
            type: 'select',
            options: [
              { label: 'Enero', value: '01' },
              { label: 'Febrero', value: '02' },
              { label: 'Marzo', value: '03' },
              { label: 'Abril', value: '04' },
              { label: 'Mayo', value: '05' },
              { label: 'Junio', value: '06' },
              { label: 'Julio', value: '07' },
              { label: 'Agosto', value: '08' },
              { label: 'Septiembre', value: '09' },
              { label: 'Octubre', value: '10' },
              { label: 'Noviembre', value: '11' },
              { label: 'Diciembre', value: '12' },
            ],
          },
        ],
      },
    ],
  },
};

export default moduleConfig;
