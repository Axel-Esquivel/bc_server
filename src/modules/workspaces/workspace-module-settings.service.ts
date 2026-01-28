import { Injectable, BadRequestException } from '@nestjs/common';
import { WorkspaceEntity } from './workspaces.service';

@Injectable()
export class WorkspaceModuleSettingsService {
  validateModuleEnabled(workspace: WorkspaceEntity, moduleId: string): void {
    const enabled = workspace.enabledModules.some(
      (module) => module.key === moduleId && module.enabled
    );
    if (!enabled) {
      throw new BadRequestException('Module not enabled');
    }
  }

  getSettings(workspace: WorkspaceEntity, moduleId: string): Record<string, unknown> {
    this.validateModuleEnabled(workspace, moduleId);
    const settings = workspace.moduleSettings?.[moduleId];
    if (typeof settings === 'object' && settings !== null) {
      return settings as Record<string, unknown>;
    }
    return {};
  }

  patchSettings(
    workspace: WorkspaceEntity,
    moduleId: string,
    partial: Record<string, unknown>
  ): Record<string, unknown> {
    this.validateModuleEnabled(workspace, moduleId);
    const current =
      typeof workspace.moduleSettings?.[moduleId] === 'object' && workspace.moduleSettings?.[moduleId] !== null
        ? (workspace.moduleSettings[moduleId] as Record<string, unknown>)
        : {};
    workspace.moduleSettings = {
      ...(workspace.moduleSettings ?? {}),
      [moduleId]: {
        ...current,
        ...(partial ?? {}),
      },
    };
    return workspace.moduleSettings[moduleId] as Record<string, unknown>;
  }
}
