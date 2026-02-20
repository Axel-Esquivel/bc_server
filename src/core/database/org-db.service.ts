import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class OrgDbService {
  private readonly cache = new Map<string, Connection>();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  getConnection(organizationId: string): Connection {
    if (!organizationId) {
      throw new Error('organizationId is required');
    }
    const dbName = `bc_org_${organizationId}`;
    const cached = this.cache.get(dbName);
    if (cached) {
      return cached;
    }
    const orgConn = this.connection.useDb(dbName, { useCache: true });
    this.cache.set(dbName, orgConn);
    return orgConn;
  }
}
