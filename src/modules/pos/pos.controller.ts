import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../core/types/authenticated-request.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductByCodeQueryDto } from '../products/dto/product-by-code-query.dto';
import { ProductSearchQueryDto } from '../products/dto/product-search-query.dto';
import { CreatePosConfigDto } from './dto/create-pos-config.dto';
import { UpdatePosConfigDto } from './dto/update-pos-config.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { CreatePosSaleDto } from './dto/create-pos-sale.dto';
import { PosSaleActionDto } from './dto/pos-sale-action.dto';
import { ActivePosSessionQueryDto } from './dto/active-pos-session.dto';
import { PosConfigListQueryDto } from './dto/pos-config-list-query.dto';
import { PosSessionSummaryDto } from './dto/pos-session-summary.dto';
import { CreatePosCashMovementDto } from './dto/create-pos-cash-movement.dto';
import { PosCashMovementListQueryDto } from './dto/pos-cash-movement-list-query.dto';
import { PosService } from './pos.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { OrganizationMemberStatus } from '../organizations/entities/organization.entity';

@Controller('pos')
@UseGuards(JwtAuthGuard)
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Post('configs')
  async createConfig(@Body() dto: CreatePosConfigDto, @Req() req: AuthenticatedRequest) {
    await this.assertPermission(dto.OrganizationId, this.getUserId(req), 'pos.configure');
    const result = await this.posService.createConfig(dto);
    return { message: 'POS creado', result };
  }

  @Get('configs')
  async listConfigs(@Query() query: PosConfigListQueryDto, @Req() req: AuthenticatedRequest) {
    if (query.OrganizationId) {
      await this.assertPermission(query.OrganizationId, this.getUserId(req), 'pos.read');
    }
    const result = this.posService.listConfigs(query);
    return { message: 'Configuraciones POS', result };
  }

  @Get('configs/available/me')
  async listAvailableConfigs(@Query() query: PosConfigListQueryDto, @Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    if (query.OrganizationId) {
      await this.assertPermission(query.OrganizationId, userId, 'pos.access');
    }
    const result = this.posService.listAvailableConfigsForUser(userId, query);
    return { message: 'POS disponibles', result };
  }

  @Get('configs/:id')
  async getConfig(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const config = this.posService.getConfig(id);
    await this.assertPermission(config.OrganizationId, this.getUserId(req), 'pos.read');
    return { message: 'POS encontrado', result: config };
  }

  @Patch('configs/:id')
  async updateConfig(@Param('id') id: string, @Body() dto: UpdatePosConfigDto, @Req() req: AuthenticatedRequest) {
    const config = this.posService.getConfig(id);
    await this.assertPermission(config.OrganizationId, this.getUserId(req), 'pos.configure');
    const result = await this.posService.updateConfig(id, dto);
    return { message: 'POS actualizado', result };
  }

  @Delete('configs/:id')
  async removeConfig(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const config = this.posService.getConfig(id);
    await this.assertPermission(config.OrganizationId, this.getUserId(req), 'pos.configure');
    this.posService.removeConfig(id);
    return { message: 'POS eliminado', result: { id } };
  }

  @Post('sessions/open')
  async openSession(@Body() dto: OpenPosSessionDto, @Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    await this.assertPermission(dto.OrganizationId, userId, 'pos.session.open');
    this.assertActor(dto.cashierUserId, userId);
    return { message: 'Sesion POS abierta', result: this.posService.openSession(dto) };
  }

  @Get('sessions/active')
  async getActiveSession(@Query() query: ActivePosSessionQueryDto, @Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    if (query.OrganizationId) {
      await this.assertPermission(query.OrganizationId, userId, 'pos.access');
    }
    if (query.cashierUserId) {
      this.assertActor(query.cashierUserId, userId);
    }
    return { message: 'Sesion activa POS', result: this.posService.getActiveSession(query) };
  }

  @Get('sessions/:id/summary')
  async getSessionSummary(
    @Param('id') sessionId: string,
    @Query() query: { OrganizationId?: string; companyId?: string; enterpriseId?: string },
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string; result: PosSessionSummaryDto | null }> {
    if (!query.OrganizationId || !query.companyId || !query.enterpriseId) {
      return { message: 'Contexto incompleto', result: null };
    }
    await this.assertPermission(query.OrganizationId, this.getUserId(req), 'pos.session.history');
    const result = this.posService.getSessionSummary(sessionId, {
      OrganizationId: query.OrganizationId,
      companyId: query.companyId,
      enterpriseId: query.enterpriseId,
    });
    return { message: 'Resumen de sesion POS', result };
  }

  @Post('sessions/close')
  async closeSession(@Body() dto: ClosePosSessionDto, @Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    await this.assertPermission(dto.OrganizationId, userId, 'pos.session.close');
    this.assertActor(dto.cashierUserId, userId);
    return { message: 'Sesion POS cerrada', result: this.posService.closeSession(dto) };
  }

  @Post('sessions/:id/movements')
  async createMovement(
    @Param('id') sessionId: string,
    @Body() dto: CreatePosCashMovementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (dto.sessionId !== sessionId) {
      throw new BadRequestException('SessionId no coincide');
    }
    const userId = this.getUserId(req);
    await this.assertPermission(dto.OrganizationId, userId, 'pos.cash.move');
    if (dto.type === 'withdrawal') {
      await this.assertPermission(dto.OrganizationId, userId, 'pos.cash.withdrawal');
    }
    this.assertActor(dto.createdByUserId, userId);
    const result = this.posService.createCashMovement(dto);
    return { message: 'Movimiento registrado', result };
  }

  @Get('sessions/:id/movements')
  async listMovements(
    @Param('id') sessionId: string,
    @Query() query: PosCashMovementListQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (query.OrganizationId) {
      await this.assertPermission(query.OrganizationId, this.getUserId(req), 'pos.session.history');
    }
    const result = this.posService.listCashMovements({ ...query, sessionId });
    return { message: 'Movimientos POS', result };
  }

  @Get('variants/search')
  async searchVariants(@Query() query: ProductSearchQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    if (!orgId) {
      return { message: 'Busqueda POS sin OrganizationId', result: [] };
    }
    await this.assertPermission(orgId, this.getUserId(req), 'pos.access');
    const result = await this.posService.searchVariants({
      OrganizationId: orgId,
      enterpriseId: query.enterpriseId,
      companyId: query.companyId,
      q: query.q,
    });
    return { message: 'Busqueda POS de variantes', result };
  }

  @Get('variants/by-code')
  async findVariantByCode(@Query() query: ProductByCodeQueryDto, @Req() req: AuthenticatedRequest) {
    const orgId = query.OrganizationId ?? req.user?.organizationId ?? undefined;
    if (!orgId) {
      return { message: 'Busqueda POS sin OrganizationId', result: null };
    }
    await this.assertPermission(orgId, this.getUserId(req), 'pos.access');
    const result = await this.posService.findVariantByCode({
      OrganizationId: orgId,
      enterpriseId: query.enterpriseId,
      companyId: query.companyId,
      code: query.code,
    });
    return { message: 'Busqueda POS por codigo', result };
  }

  @Post('sales')
  async createSale(@Body() dto: CreatePosSaleDto, @Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    await this.assertPermission(dto.OrganizationId, userId, 'pos.sale.create');
    this.assertActor(dto.cashierUserId, userId);
    return { message: 'Venta POS creada', result: this.posService.createSale(dto) };
  }

  @Post('sales/:id/post')
  async postSale(@Param('id') saleId: string, @Body() dto: PosSaleActionDto, @Req() req: AuthenticatedRequest) {
    await this.assertPermission(dto.OrganizationId, this.getUserId(req), 'pos.sale.create');
    return { message: 'Venta POS confirmada', result: this.posService.postSale(saleId, dto) };
  }

  @Get('sales/recent')
  async listRecent(
    @Query() query: { OrganizationId?: string; companyId?: string; enterpriseId?: string; limit?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    if (query.OrganizationId) {
      await this.assertPermission(query.OrganizationId, this.getUserId(req), 'pos.session.history');
    }
    const limit = query.limit ? Number(query.limit) : undefined;
    const result = this.posService.listRecentSales({
      OrganizationId: query.OrganizationId,
      companyId: query.companyId,
      enterpriseId: query.enterpriseId,
      limit: Number.isNaN(limit ?? NaN) ? undefined : limit,
    });
    return { message: 'Ventas recientes POS', result };
  }

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.sub ?? req.user?.id ?? '';
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado.');
    }
    return userId;
  }

  private assertActor(actorId: string, userId: string): void {
    if (actorId !== userId) {
      throw new BadRequestException('El usuario no coincide con la sesión.');
    }
  }

  private async assertPermission(organizationId: string, userId: string, permission: string): Promise<void> {
    const organization = await this.organizationsService.getOrganization(organizationId);
    const member = organization.members.find((item) => item.userId === userId);
    if (!member || member.status !== OrganizationMemberStatus.Active) {
      throw new BadRequestException('Usuario sin membresía activa.');
    }
    const role = organization.roles.find((item) => item.key === member.roleKey);
    if (!role) {
      throw new BadRequestException('Rol no encontrado.');
    }
    if (!this.hasPermission(role.permissions, permission)) {
      throw new BadRequestException('Permiso insuficiente.');
    }
  }

  private hasPermission(permissions: string[], required: string): boolean {
    if (permissions.includes('*') || permissions.includes(required)) {
      return true;
    }
    return permissions.some((permission) => {
      if (!permission.endsWith('.*')) {
        return false;
      }
      const prefix = permission.slice(0, -1);
      return required.startsWith(prefix);
    });
  }
}
