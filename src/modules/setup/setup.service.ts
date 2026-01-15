import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Collection } from 'mongodb';
import { Connection } from 'mongoose';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { InitializeSetupDto } from './dto/initialize-setup.dto';

interface SystemSettingsDocument {
  _id: string;
  installed: boolean;
  dbName: string;
  adminUserId: string;
  workspaceId?: string;
  roleId?: string;
  installedAt: Date;
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);
  private readonly systemKey = 'system';
  private readonly collection: Collection<SystemSettingsDocument>;

  constructor(
    @InjectConnection() connection: Connection,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly workspacesService: WorkspacesService,
  ) {
    const db = connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not initialized');
    }
    this.collection = db.collection<SystemSettingsDocument>('system_settings');
  }

  async getStatus() {
    const settings = await this.collection.findOne({ _id: this.systemKey });
    const installed = Boolean(settings?.installed);
    return {
      message: 'Setup status',
      result: {
        installed,
      },
      installed,
    };
  }

  async initialize(dto: InitializeSetupDto) {
    const existing = await this.collection.findOne({ _id: this.systemKey });
    if (existing?.installed) {
      throw new BadRequestException('System already initialized');
    }

    const existingUser = this.usersService.findByIdentifier(dto.adminEmail);
    if (existingUser) {
      throw new BadRequestException('Admin email already exists');
    }

    const adminUser = await this.usersService.createUser({
      email: dto.adminEmail,
      name: dto.adminName,
      username: dto.adminName,
      password: dto.adminPassword,
    });

    const workspace = this.workspacesService.createWorkspace({
      name: dto.dbName,
    }, adminUser.id);

    const superadminRole =
      this.rolesService.getRoleByName('superadmin', workspace.id) ??
      this.rolesService.createRole({
        name: 'superadmin',
        permissions: ['*:*:*'],
        workspaceId: workspace.id,
      });

    this.workspacesService.addMember(workspace.id, {
      userId: adminUser.id,
      role: 'admin',
    });

    await this.collection.updateOne(
      { _id: this.systemKey },
      {
        $set: {
          installed: true,
          dbName: dto.dbName,
          adminUserId: adminUser.id,
          workspaceId: workspace.id,
          roleId: superadminRole.id,
          installedAt: new Date(),
        },
      },
      { upsert: true },
    );

    this.logger.log(`System initialized by ${adminUser.email}`);

    return {
      message: 'System initialized',
      result: {
        installed: true,
        adminUserId: adminUser.id,
        workspaceId: workspace.id,
      },
    };
  }
}
