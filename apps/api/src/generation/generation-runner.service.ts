import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { UnifiedGenerationRequest } from "@image-platform/shared";
import { OperationsService } from "../operations/operations.service";
import { CreateGenerationTaskDto } from "./dto/create-generation-task.dto";
import { ProviderRegistryService } from "./provider-registry.service";
import { TaskStoreService } from "./task-store.service";

@Injectable()
export class GenerationRunnerService {
  constructor(
    private readonly operations: OperationsService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly taskStore: TaskStoreService
  ) {}

  async execute(
    taskId: string,
    dto: CreateGenerationTaskDto,
    context: { projectId: string }
  ) {
    try {
      await this.taskStore.markRunning(taskId);

      const provider = this.providerRegistry.get(dto.provider);
      if (!provider) {
        throw new ServiceUnavailableException(
          `Provider ${dto.provider} is not configured`
        );
      }

      const request: UnifiedGenerationRequest = {
        provider: dto.provider,
        model: dto.model,
        task: dto.task,
        prompt: dto.prompt,
        negativePrompt: dto.negativePrompt,
        size: dto.size,
        count: dto.count,
        seed: dto.seed,
        referenceImages: dto.referenceImages,
        extra: dto.extra
      };

      const result = await provider.generate(request, taskId);
      if (!result) {
        throw new ServiceUnavailableException("Provider returned no result");
      }

      const imageCount = result.images?.length ?? 0;
      const costCents = await this.operations.calculateCost(
        dto.provider,
        dto.model,
        imageCount
      );
      await this.operations.recordGenerationUsage({
        projectId: context.projectId,
        taskId,
        provider: dto.provider,
        model: dto.model,
        imageCount,
        costCents
      });

      return await this.taskStore.complete(taskId, {
        ...result,
        id: taskId,
        provider: dto.provider,
        model: dto.model,
        prompt: dto.prompt,
        meta: {
          ...result.meta,
          projectId: context.projectId,
          imageCount,
          costCents
        }
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown provider error";
      await this.taskStore.fail(taskId, message).catch(() => undefined);
      throw error;
    }
  }
}
