import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';
import { DevicesModule } from '../devices/devices.module';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CompaniesModule } from '../companies/companies.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './jwt.strategy';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => DevicesModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => CompaniesModule),
    MongooseModule.forFeature([{ name: RefreshToken.name, schema: RefreshTokenSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'demo-secret',
      signOptions: { expiresIn: resolveAccessTokenExpiresIn() },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, PermissionsGuard, JwtStrategy],
  exports: [AuthService, JwtAuthGuard, RolesGuard, PermissionsGuard, JwtModule],
})
export class AuthModule {}

const STRING_VALUE_REGEX = /^\d+(?:\.\d+)?(ms|s|m|h|d|w|y)$/i;

function isStringValue(value: string): value is StringValue {
  return STRING_VALUE_REGEX.test(value);
}

function resolveAccessTokenExpiresIn(): StringValue | number {
  const raw = process.env.JWT_EXPIRES_IN;
  if (!raw) {
    return '1d';
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  if (isStringValue(raw)) {
    return raw;
  }
  return '1d';
}
