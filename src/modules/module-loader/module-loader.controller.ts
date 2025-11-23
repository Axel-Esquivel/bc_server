import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ModuleLoaderService } from './module-loader.service';

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
