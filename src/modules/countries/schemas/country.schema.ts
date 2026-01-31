import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CountryDocument = Country & Document;

@Schema({ collection: 'countries', timestamps: true })
export class Country {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, unique: true, index: true })
  iso2: string;

  @Prop({ required: true, unique: true, index: true })
  iso3: string;

  @Prop({ required: true })
  nameEs: string;

  @Prop({ required: true })
  nameEn: string;

  @Prop()
  phoneCode?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const CountrySchema = SchemaFactory.createForClass(Country);
