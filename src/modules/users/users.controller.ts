import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResolveUsersDto } from './dto/resolve-users.dto';
import { SetDefaultCompanyDto } from './dto/set-default-company.dto';
import { SetDefaultOrganizationDto } from './dto/set-default-organization.dto';
import { SetDefaultEnterpriseDto } from './dto/set-default-enterprise.dto';
import { SetDefaultCurrencyDto } from './dto/set-default-currency.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me/default-Organization')
  async setDefaultOrganization(@Req() req: any, @Body() dto: SetDefaultOrganizationDto) {
    const user = await this.usersService.setDefaultOrganization(req.user.sub, dto.OrganizationId);
    return {
      message: 'Default Organization updated',
      result: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/default-company')
  async setDefaultCompany(@Req() req: any, @Body() dto: SetDefaultCompanyDto) {
    const user = await this.usersService.setDefaultCompany(req.user.sub, dto.companyId);
    return {
      message: 'Default company updated',
      result: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/default-enterprise')
  async setDefaultEnterprise(@Req() req: any, @Body() dto: SetDefaultEnterpriseDto) {
    const user = await this.usersService.setDefaultEnterprise(req.user.sub, dto.enterpriseId);
    return {
      message: 'Default enterprise updated',
      result: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/default-currency')
  async setDefaultCurrency(@Req() req: any, @Body() dto: SetDefaultCurrencyDto) {
    const user = await this.usersService.setDefaultCurrency(req.user.sub, dto.currencyId);
    return {
      message: 'Default currency updated',
      result: user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resolve')
  async resolveUsers(@Body() dto: ResolveUsersDto) {
    const users = await this.usersService.resolveUsers(dto.ids ?? []);
    return {
      message: 'Users resolved',
      result: users,
    };
  }
}
