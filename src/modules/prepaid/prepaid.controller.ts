import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';
import { PrepaidService } from './prepaid.service';
import { CreatePrepaidProviderDto } from './dto/create-prepaid-provider.dto';
import { UpdatePrepaidProviderDto } from './dto/update-prepaid-provider.dto';
import { CreatePrepaidDepositDto } from './dto/create-prepaid-deposit.dto';
import { CreatePrepaidConsumptionDto } from './dto/create-prepaid-consumption.dto';
import { CreatePrepaidVariantConfigDto } from './dto/create-prepaid-variant-config.dto';
import { UpdatePrepaidVariantConfigDto } from './dto/update-prepaid-variant-config.dto';
import { PrepaidBalanceQueryDto } from './dto/prepaid-balance-query.dto';

@Controller('prepaid')
@UseGuards(JwtAuthGuard)
export class PrepaidController {
  constructor(private readonly prepaidService: PrepaidService) {}

  @Get('providers')
  async listProviders(@Query('organizationId') organizationId: string | undefined, @Query('enterpriseId') enterpriseId: string | undefined, @Req() req: AuthenticatedRequest) {
    const orgId = organizationId ?? req.user?.organizationId;
    const entId = enterpriseId ?? req.user?.enterpriseId;
    if (!orgId || !entId) {
      throw new BadRequestException('OrganizationId and enterpriseId are required');
    }
    const result = await this.prepaidService.listProviders(orgId, entId);
    return { message: 'Prepaid providers retrieved', result };
  }

  @Post('providers')
  async createProvider(@Body() dto: CreatePrepaidProviderDto) {
    const result = await this.prepaidService.createProvider(dto);
    return { message: 'Prepaid provider created', result };
  }

  @Patch('providers/:id')
  async updateProvider(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePrepaidProviderDto,
  ) {
    const orgId = organizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.prepaidService.updateProvider(id, dto, orgId);
    return { message: 'Prepaid provider updated', result };
  }

  @Get('balances')
  async balances(@Query() query: PrepaidBalanceQueryDto) {
    const result = await this.prepaidService.listBalances(query.OrganizationId, query.enterpriseId, query.providerId);
    return { message: 'Prepaid balances retrieved', result };
  }

  @Post('deposits')
  async deposit(@Body() dto: CreatePrepaidDepositDto) {
    const result = await this.prepaidService.deposit(dto);
    return { message: 'Prepaid deposit created', result };
  }

  @Get('deposits')
  async listDeposits(@Query('organizationId') organizationId: string | undefined, @Query('enterpriseId') enterpriseId: string | undefined, @Query('providerId') providerId: string | undefined, @Req() req: AuthenticatedRequest) {
    const orgId = organizationId ?? req.user?.organizationId;
    const entId = enterpriseId ?? req.user?.enterpriseId;
    if (!orgId || !entId) {
      throw new BadRequestException('OrganizationId and enterpriseId are required');
    }
    const result = await this.prepaidService.listDeposits(orgId, entId, providerId);
    return { message: 'Prepaid deposits retrieved', result };
  }

  @Post('consume')
  async consume(@Body() dto: CreatePrepaidConsumptionDto) {
    const result = await this.prepaidService.consumeBalance(dto);
    return { message: 'Prepaid balance consumed', result };
  }

  @Post('variant-configs')
  async createVariantConfig(@Body() dto: CreatePrepaidVariantConfigDto) {
    const result = await this.prepaidService.createVariantConfig(dto);
    return { message: 'Prepaid variant config created', result };
  }

  @Patch('variant-configs/:id')
  async updateVariantConfig(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePrepaidVariantConfigDto,
  ) {
    const orgId = organizationId ?? req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException('OrganizationId is required');
    }
    const result = await this.prepaidService.updateVariantConfig(id, dto, orgId);
    return { message: 'Prepaid variant config updated', result };
  }

  @Get('variant-configs')
  async listVariantConfigs(@Query('organizationId') organizationId: string | undefined, @Query('enterpriseId') enterpriseId: string | undefined, @Req() req: AuthenticatedRequest) {
    const orgId = organizationId ?? req.user?.organizationId;
    const entId = enterpriseId ?? req.user?.enterpriseId;
    if (!orgId || !entId) {
      throw new BadRequestException('OrganizationId and enterpriseId are required');
    }
    const result = await this.prepaidService.listVariantConfigs(orgId, entId);
    return { message: 'Prepaid variant configs retrieved', result };
  }
}
