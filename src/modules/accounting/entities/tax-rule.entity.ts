import { modelOptions, prop } from '@typegoose/typegoose';

export enum TaxRegime {
  GENERAL = 'GENERAL',
  SIMPLIFIED = 'SIMPLIFIED',
  EXEMPT = 'EXEMPT',
}

@modelOptions({ schemaOptions: { timestamps: true } })
export class TaxRule {
  @prop({ required: true })
  id!: string;

  @prop({ required: true })
  name!: string;

  @prop({ required: true })
  rate!: number;

  @prop({ enum: TaxRegime, default: TaxRegime.GENERAL })
  regime!: TaxRegime;

  @prop({ default: true })
  active!: boolean;

  @prop({ required: true })
  OrganizationId!: string;

  @prop({ required: true })
  companyId!: string;
}
