import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BlockDeviceDto } from './dto/block-device.dto';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  listMyDevices(@Req() req: any) {
    const devices = this.devicesService.listByUser(req.user.sub);
    return {
      message: 'User devices',
      result: devices,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('block')
  blockDevice(@Req() req: any, @Body() dto: BlockDeviceDto) {
    const device = this.devicesService.blockDevice(req.user.sub, dto.deviceId);
    return {
      message: 'Device block status updated',
      result: device,
    };
  }
}
