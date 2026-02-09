import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BranchesModule } from '../branches/branches.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ContextController } from './context.controller';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => CompaniesModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => BranchesModule),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController, ContextController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
