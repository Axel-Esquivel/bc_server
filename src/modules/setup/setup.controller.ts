import { Body, Controller, Get, Logger, OnModuleInit, Post } from '@nestjs/common';
import { InitializeSetupDto } from './dto/initialize-setup.dto';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController implements OnModuleInit {
  private readonly logger = new Logger(SetupController.name);

  constructor(private readonly setupService: SetupService) {}

  onModuleInit() {
    this.logger.log('Setup endpoints mounted at /api/setup');
  }

  @Get('status')
  getStatus() {
    return this.setupService.getStatus();
  }

  @Post('initialize')
  initialize(@Body() dto: InitializeSetupDto) {
    return this.setupService.initialize(dto);
  }
}
