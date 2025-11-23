import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DeviceEntity, DeviceStatus } from './entities/device.entity';

@Injectable()
export class DevicesService {
  private readonly devices: DeviceEntity[] = [];

  upsertDevice(userId: string, deviceId: string, workspaceId?: string): DeviceEntity {
    let device = this.devices.find((item) => item.userId === userId && item.deviceId === deviceId);

    if (!device) {
      device = {
        id: uuid(),
        userId,
        deviceId,
        status: 'active',
        lastSeenAt: new Date(),
        workspaceId,
      };
      this.devices.push(device);
    } else {
      device.lastSeenAt = new Date();
      device.workspaceId = workspaceId ?? device.workspaceId;
      if (device.status === 'inactive') {
        device.status = 'active';
      }
    }

    return device;
  }

  listByUser(userId: string): DeviceEntity[] {
    return this.devices.filter((device) => device.userId === userId);
  }

  blockDevice(userId: string, deviceId: string): DeviceEntity | undefined {
    const device = this.devices.find((item) => item.userId === userId && item.deviceId === deviceId);
    if (device) {
      device.status = 'blocked';
      device.lastSeenAt = new Date();
    }

    return device;
  }
}
