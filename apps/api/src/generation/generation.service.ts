import { Injectable } from "@nestjs/common";
import { OperationsService } from "../operations/operations.service";
import { CreateGenerationTaskDto } from "./dto/create-generation-task.dto";
import { GenerationQueueService } from "./generation-queue.service";
import { ProviderRegistryService } from "./provider-registry.service";
import { TaskStoreService } from "./task-store.service";

@Injectable()
export class GenerationService {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly operations: OperationsService,
    private readonly queue: GenerationQueueService,
    private readonly taskStore: TaskStoreService
  ) {}

  listProviders() {
    return this.providerRegistry.describeProviders();
  }

  listCatalog() {
    return this.providerRegistry.listCatalog();
  }

  getTask(id: string) {
    return this.taskStore.get(id);
  }

  async createTask(dto: CreateGenerationTaskDto, apiKey?: string) {
    const project = await this.operations.resolveProject(apiKey);
    const requestedImages = dto.count ?? 1;
    await this.operations.ensureQuota(project.id, requestedImages);

    const task = await this.taskStore.create(dto, {
      projectId: project.id,
      ownerEmail: project.ownerEmail,
      estimatedImages: requestedImages
    });
    await this.queue.enqueue(task.id, dto, {
      projectId: project.id
    });
    return task;
  }
}
