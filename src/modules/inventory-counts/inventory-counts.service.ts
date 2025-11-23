import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InventoryService } from '../inventory/inventory.service';
import { CreateInventoryMovementDto } from '../inventory/dto/create-inventory-movement.dto';
import { InventoryDirection } from '../inventory/entities/inventory-movement.entity';
import { StockProjectionRecord } from '../inventory/entities/stock-projection.entity';
import { AddInventoryCountRoundDto } from './dto/add-round.dto';
import { CreateInventoryCountSessionDto } from './dto/create-inventory-count-session.dto';
import { ReviewInventoryCountDto } from './dto/review-inventory-count.dto';
import {
  InventoryCountLineRecord,
  InventoryCountLineStatus,
} from './entities/inventory-count-line.entity';
import {
  InventoryCountMode,
  InventoryCountScope,
  InventoryCountSessionRecord,
  InventoryCountStatus,
} from './entities/inventory-count-session.entity';
import { InventoryCountRoundRecord } from './entities/inventory-count-round.entity';

@Injectable()
export class InventoryCountsService {
  // TODO: Replace in-memory stores with MongoDB persistence and proper repositories.
  private readonly sessions: InventoryCountSessionRecord[] = [];
  private readonly lines: InventoryCountLineRecord[] = [];
  private readonly rounds: InventoryCountRoundRecord[] = [];

  constructor(private readonly inventoryService: InventoryService) {}

  createSession(dto: CreateInventoryCountSessionDto) {
    const session: InventoryCountSessionRecord = {
      id: uuid(),
      createdAt: new Date(),
      warehouseId: dto.warehouseId,
      companyId: dto.companyId,
      workspaceId: dto.workspaceId,
      scope: dto.scope ?? InventoryCountScope.FULL,
      mode: dto.mode ?? InventoryCountMode.BLIND,
      roundsPlanned: dto.roundsPlanned,
      status: InventoryCountStatus.IN_PROGRESS,
      startedAt: new Date(),
      closedAt: undefined,
    };

    this.sessions.push(session);

    const sessionLines = dto.lines.map((line) => {
      if (line.warehouseId !== dto.warehouseId) {
        throw new BadRequestException('Line warehouse must match session warehouse');
      }

      const systemQtyAtStart = this.lookupSystemQuantity(
        line.variantId,
        line.warehouseId,
        line.locationId,
        line.batchId,
        dto.workspaceId,
        dto.companyId,
      );

      const countLine: InventoryCountLineRecord = {
        id: uuid(),
        createdAt: new Date(),
        sessionId: session.id,
        variantId: line.variantId,
        warehouseId: line.warehouseId,
        locationId: line.locationId,
        batchId: line.batchId,
        systemQtyAtStart,
        status: InventoryCountLineStatus.PENDING,
        workspaceId: dto.workspaceId,
        companyId: dto.companyId,
      };

      this.lines.push(countLine);
      return countLine;
    });

    return { session, lines: sessionLines };
  }

  registerRound(sessionId: string, dto: AddInventoryCountRoundDto) {
    const session = this.findSession(sessionId);
    if (session.status !== InventoryCountStatus.IN_PROGRESS) {
      throw new BadRequestException('Rounds can only be registered while session is in progress');
    }

    const nextRoundNumber = dto.roundNumber ?? this.nextRoundNumber(sessionId);
    if (nextRoundNumber > session.roundsPlanned) {
      throw new BadRequestException('Round exceeds planned rounds');
    }

    const createdRounds: InventoryCountRoundRecord[] = dto.results.map((result) => {
      const line = this.findLine(result.lineId);
      if (line.sessionId !== sessionId) {
        throw new BadRequestException('Line does not belong to this session');
      }

      const round: InventoryCountRoundRecord = {
        id: uuid(),
        createdAt: new Date(),
        sessionId,
        lineId: line.id,
        roundNumber: nextRoundNumber,
        countedQty: result.countedQty,
        countedBy: result.countedBy,
        countedAt: result.countedAt ? new Date(result.countedAt) : new Date(),
        source: result.source,
        workspaceId: line.workspaceId,
        companyId: line.companyId,
      };

      this.rounds.push(round);

      if (result.countedQty === line.systemQtyAtStart) {
        line.status = InventoryCountLineStatus.OK;
      } else if (nextRoundNumber < session.roundsPlanned) {
        line.status = InventoryCountLineStatus.RECOUNT_REQUIRED;
      }

      return round;
    });

    return {
      session,
      roundNumber: nextRoundNumber,
      rounds: createdRounds,
    };
  }

  review(sessionId: string, dto: ReviewInventoryCountDto) {
    const session = this.findSession(sessionId);
    if (session.status !== InventoryCountStatus.IN_PROGRESS && session.status !== InventoryCountStatus.REVIEW) {
      throw new BadRequestException('Session is not ready for review');
    }

    dto.decisions.forEach((decision) => {
      const line = this.findLine(decision.lineId);
      if (line.sessionId !== sessionId) {
        throw new BadRequestException('Line does not belong to this session');
      }

      line.finalQty = decision.finalQty;
      line.decisionBy = decision.decisionBy;
      line.decisionAt = decision.decisionAt ? new Date(decision.decisionAt) : new Date();
      line.reason = decision.reason;
      line.status = InventoryCountLineStatus.FINALIZED;
    });

    session.status = InventoryCountStatus.REVIEW;

    return {
      session,
      lines: this.lines.filter((line) => line.sessionId === sessionId),
    };
  }

  post(sessionId: string) {
    const session = this.findSession(sessionId);
    if (session.status !== InventoryCountStatus.REVIEW && session.status !== InventoryCountStatus.APPROVED) {
      throw new BadRequestException('Session must be in review or approved to post adjustments');
    }

    const sessionLines = this.lines.filter((line) => line.sessionId === sessionId);
    if (!sessionLines.length) {
      throw new BadRequestException('No lines available to post');
    }

    sessionLines.forEach((line) => {
      if (line.finalQty === undefined || line.finalQty === null) {
        throw new BadRequestException('All lines must have final quantities before posting');
      }

      const movement: CreateInventoryMovementDto = {
        direction: InventoryDirection.ADJUST,
        variantId: line.variantId,
        warehouseId: line.warehouseId,
        locationId: line.locationId,
        batchId: line.batchId,
        quantity: line.finalQty,
        operationId: `inventory-count:${session.id}:${line.id}`,
        references: {
          source: 'inventory-count',
          sessionId: session.id,
          lineId: line.id,
        },
        workspaceId: line.workspaceId,
        companyId: line.companyId,
      };

      this.inventoryService.recordMovement(movement);
    });

    session.status = InventoryCountStatus.POSTED;
    session.closedAt = new Date();

    return {
      session,
      lines: sessionLines,
    };
  }

  list(sessionId: string) {
    const session = this.findSession(sessionId);
    const lines = this.lines.filter((line) => line.sessionId === sessionId);
    const rounds = this.rounds.filter((round) => round.sessionId === sessionId);

    return { session, lines, rounds };
  }

  private findSession(id: string): InventoryCountSessionRecord {
    const session = this.sessions.find((item) => item.id === id);
    if (!session) {
      throw new NotFoundException('Inventory count session not found');
    }
    return session;
  }

  private findLine(id: string): InventoryCountLineRecord {
    const line = this.lines.find((item) => item.id === id);
    if (!line) {
      throw new NotFoundException('Inventory count line not found');
    }
    return line;
  }

  private nextRoundNumber(sessionId: string): number {
    const existingRounds = this.rounds.filter((round) => round.sessionId === sessionId);
    if (!existingRounds.length) {
      return 1;
    }

    return Math.max(...existingRounds.map((round) => round.roundNumber)) + 1;
  }

  private lookupSystemQuantity(
    variantId: string,
    warehouseId: string,
    locationId: string | undefined,
    batchId: string | undefined,
    workspaceId: string,
    companyId: string,
  ): number {
    const projections = this.inventoryService.listStock({ variantId, warehouseId, locationId }) as StockProjectionRecord[];
    const matching = projections.find(
      (projection) =>
        projection.workspaceId === workspaceId &&
        projection.companyId === companyId &&
        projection.batchId === batchId,
    );

    return matching ? matching.onHand : 0;
  }
}
