import { Controller, Get, Logger, OnModuleInit } from '@nestjs/common';

@Controller('health')
export class HealthController implements OnModuleInit {
  private readonly logger = new Logger(HealthController.name);

  onModuleInit() {
    this.logger.log('Health endpoints mounted at /api/health');
  }

  @Get()
  getHealth() {
    return {
      status: 'ok',
    };
  }
}
