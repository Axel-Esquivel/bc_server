export type DeviceStatus = 'active' | 'blocked' | 'inactive';

export interface DeviceEntity {
  id: string;
  userId: string;
  deviceId: string;
  status: DeviceStatus;
  lastSeenAt: Date;
  workspaceId?: string;
}
