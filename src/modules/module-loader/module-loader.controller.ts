import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ModuleLoaderService } from './module-loader.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class UpdateModuleStateDto {
  @IsString()
  name!: string;
}

@Controller('modules')
export class ModuleLoaderController {
  constructor(private readonly moduleLoaderService: ModuleLoaderService) {}

  @Get()
  listModules() {
    return {
      message: 'Module catalog',
      result: this.moduleLoaderService.listModules(),
    };
  }

  @Get('catalog')
  listCatalog() {
    return {
      message: 'Module catalog',
      result: this.moduleLoaderService.listModules(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('definitions')
  listDefinitions(@Query('OrganizationId') _OrganizationId?: string) {
    const modules = this.moduleLoaderService
      .listModules()
      .filter(
        (descriptor) =>
          descriptor.config.isSystem !== true && descriptor.config.isInstallable !== false,
      )
      .map((descriptor) => ({
        id: descriptor.config.name,
        name: descriptor.config.name,
        version: descriptor.config.version,
        dependencies: descriptor.config.dependencies ?? [],
        setupWizard: descriptor.config.setupWizard,
        settingsSchema: descriptor.config.settingsSchema,
      }));

    return {
      message: 'Module definitions',
      result: modules,
    };
  }

  @Post('install')
  installModule(@Body() body: UpdateModuleStateDto) {
    const updated = this.moduleLoaderService.enableModule(body.name);
    return {
      message: `Module ${body.name} enabled`,
      result: updated,
    };
  }

  @Post('uninstall')
  uninstallModule(@Body() body: UpdateModuleStateDto) {
    const updated = this.moduleLoaderService.disableModule(body.name);
    return {
      message: `Module ${body.name} disabled`,
      result: updated,
    };
  }
}
