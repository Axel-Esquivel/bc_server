export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'divider'
  | 'note';

export interface FieldOption {
  label: string;
  value: string | number | boolean;
}

export interface SetupField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: string | number | boolean | string[] | number[];
  options?: FieldOption[];
  dataSource?: string;
  validators?: string[];
}

export interface SetupStep {
  id: string;
  title: string;
  description?: string;
  fields: SetupField[];
}

export interface SetupWizardConfig {
  steps: SetupStep[];
}

export interface SettingsField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  default?: string | number | boolean | string[] | number[];
  options?: FieldOption[];
  dataSource?: string;
  validators?: string[];
}

export interface SettingsGroup {
  id: string;
  title: string;
  fields: SettingsField[];
}

export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  groups?: SettingsGroup[];
  fields?: SettingsField[];
}

export interface SettingsSchema {
  sections: SettingsSection[];
}
