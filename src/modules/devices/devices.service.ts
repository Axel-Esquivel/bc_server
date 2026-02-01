import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ModuleStateService } from '../../core/database/module-state.service';
import { DeviceEntity, DeviceStatus } from './entities/device.entity';

interface DevicesState {
  devices: DeviceEntity[];
}

@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly logger = new Logger(DevicesService.name);
  private readonly stateKey = 'module:devices';
  private devices: DeviceEntity[] = [];

  constructor(private readonly moduleState: ModuleStateService) {}

  async onModuleInit(): Promise<void> {
    const state = await this.moduleState.loadState<DevicesState>(this.stateKey, { devices: [] });
    this.devices = state.devices ?? [];
  }

  upsertDevice(userId: string, deviceId: string, OrganizationId?: string): DeviceEntity {
    let device = this.devices.find((item) => item.userId === userId && item.deviceId === deviceId);

    if (!device) {
      device = {
        id: uuid(),
        userId,
        deviceId,
        status: 'active',
        lastSeenAt: new Date(),
        OrganizationId,
      };
      this.devices.push(device);
    } else {
      device.lastSeenAt = new Date();
      device.OrganizationId = OrganizationId ?? device.OrganizationId;
      if (device.status === 'inactive') {
        device.status = 'active';
      }
    }

    this.persistState();
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
      this.persistState();
    }

    return device;
  }

  private persistState() {
    void this.moduleState
      .saveState<DevicesState>(this.stateKey, { devices: this.devices })
      .catch((error) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        this.logger.error(`Failed to persist devices: ${message}`);
      });
  }
}
