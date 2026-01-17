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

  getSettings(workspace: WorkspaceEntity, moduleId: string): Record<string, any> {
    this.validateModuleEnabled(workspace, moduleId);
    return workspace.moduleSettings?.[moduleId] ?? {};
  }

  patchSettings(
    workspace: WorkspaceEntity,
    moduleId: string,
    partial: Record<string, any>
  ): Record<string, any> {
    this.validateModuleEnabled(workspace, moduleId);
    workspace.moduleSettings = {
      ...(workspace.moduleSettings ?? {}),
      [moduleId]: {
        ...(workspace.moduleSettings?.[moduleId] ?? {}),
        ...(partial ?? {}),
      },
    };
    return workspace.moduleSettings[moduleId];
  }
}
