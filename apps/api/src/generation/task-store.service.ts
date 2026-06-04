import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import {
  GeneratedImage,
  GenerationProvider,
  GenerationTaskStatus,
  UnifiedGenerationResult
} from "@image-platform/shared";
import { randomUUID } from "crypto";
import { CreateGenerationTaskDto } from "./dto/create-generation-task.dto";

interface GenerationTaskRecord {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt: string;
  images: unknown;
  error: string | null;
  meta: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaClientLike {
  generationTask: {
    create(args: unknown): Promise<GenerationTaskRecord>;
    findUnique(args: unknown): Promise<GenerationTaskRecord | null>;
    update(args: unknown): Promise<GenerationTaskRecord>;
  };
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

interface CreateTaskContext {
  projectId?: string;
  ownerEmail?: string;
  estimatedImages?: number;
}

@Injectable()
export class TaskStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskStoreService.name);
  private readonly tasks = new Map<string, UnifiedGenerationResult>();
  private initPromise?: Promise<void>;
  private prisma?: PrismaClientLike;

  async onModuleInit() {
    await this.ensureReady();
  }

  async onModuleDestroy() {
    await this.prisma?.$disconnect();
  }

  async create(dto: CreateGenerationTaskDto, context: CreateTaskContext = {}) {
    await this.ensureReady();

    const id = `task_${randomUUID()}`;
    const timestamp = new Date().toISOString();

    const task: UnifiedGenerationResult = {
      id,
      status: "queued",
      provider: dto.provider,
      model: dto.model,
      prompt: dto.prompt,
      images: [],
      meta: {
        projectId: context.projectId,
        ownerEmail: context.ownerEmail,
        estimatedImages: context.estimatedImages
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };

    if (this.prisma) {
      const record = await this.prisma.generationTask.create({
        data: {
          id,
          projectId: context.projectId,
          status: task.status,
          provider: dto.provider,
          model: dto.model,
          task: dto.task,
          prompt: dto.prompt,
          negativePrompt: dto.negativePrompt,
          size: dto.size,
          count: dto.count,
          seed: dto.seed,
          referenceImages: dto.referenceImages ?? [],
          extra: this.sanitizeExtra(dto.extra),
          images: [],
          meta: task.meta
        }
      });

      return this.toResult(record);
    }

    this.tasks.set(id, task);
    return task;
  }

  async get(id: string) {
    await this.ensureReady();

    if (this.prisma) {
      const record = await this.prisma.generationTask.findUnique({
        where: {
          id
        }
      });

      if (!record) {
        throw new NotFoundException(`Task ${id} not found`);
      }

      return this.toResult(record);
    }

    const task = this.tasks.get(id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return task;
  }

  async markRunning(id: string) {
    return this.patch(id, {
      status: "running",
      error: undefined
    });
  }

  async complete(id: string, result: Partial<UnifiedGenerationResult>) {
    return this.patch(id, {
      ...result,
      status: result.status ?? "succeeded"
    });
  }

  async fail(id: string, error: string) {
    return this.patch(id, {
      status: "failed",
      error
    });
  }

  private async ensureReady() {
    if (!this.initPromise) {
      this.initPromise = this.startPrisma();
    }

    await this.initPromise;
  }

  private async startPrisma() {
    if (!process.env.DATABASE_URL) {
      this.logger.log("DATABASE_URL is missing; generation tasks will stay in memory.");
      return;
    }

    try {
      const prismaModule = (await import("@prisma/client")) as {
        PrismaClient: new () => PrismaClientLike;
      };

      this.prisma = new prismaModule.PrismaClient();
      await this.prisma.$connect();
      this.logger.log("Task store is using PostgreSQL via Prisma.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Prisma startup error";
      this.prisma = undefined;
      this.logger.error(
        `Prisma could not start; falling back to memory task storage. ${message}`
      );
    }
  }

  private async patch(id: string, update: Partial<UnifiedGenerationResult>) {
    await this.ensureReady();

    if (this.prisma) {
      const record = await this.prisma.generationTask.update({
        where: {
          id
        },
        data: {
          status: update.status,
          images: update.images,
          error: update.error,
          meta: update.meta,
          costCents: this.readCostCents(update.meta),
          provider: update.provider,
          model: update.model,
          prompt: update.prompt
        }
      });

      return this.toResult(record);
    }

    const existing = await this.get(id);
    const next: UnifiedGenerationResult = {
      ...existing,
      ...update,
      id,
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(id, next);
    return next;
  }

  private readCostCents(meta: unknown) {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
      return undefined;
    }

    const value = (meta as Record<string, unknown>).costCents;
    return typeof value === "number" ? value : undefined;
  }

  private sanitizeExtra(extra: Record<string, unknown> | undefined) {
    if (!extra) {
      return {};
    }

    const secretKeys = new Set([
      "apiKey",
      "openaiApiKey",
      "stabilityApiKey",
      "customProviderToken",
      "providerToken",
      "authorization"
    ]);

    return Object.fromEntries(
      Object.entries(extra).map(([key, value]) => [
        key,
        secretKeys.has(key) ? "[redacted]" : value
      ])
    );
  }

  private toResult(record: GenerationTaskRecord): UnifiedGenerationResult {
    return {
      id: record.id,
      status: this.toStatus(record.status),
      provider: this.toProvider(record.provider),
      model: record.model,
      prompt: record.prompt,
      images: this.toImages(record.images),
      error: record.error ?? undefined,
      meta: this.toMeta(record.meta),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    };
  }

  private toStatus(value: string): GenerationTaskStatus {
    if (
      value === "queued" ||
      value === "running" ||
      value === "succeeded" ||
      value === "failed"
    ) {
      return value;
    }

    return "failed";
  }

  private toProvider(value: string): GenerationProvider {
    if (
      value === "mock" ||
      value === "openai" ||
      value === "stability" ||
      value === "custom-http"
    ) {
      return value;
    }

    return "custom-http";
  }

  private toImages(value: unknown): GeneratedImage[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is GeneratedImage => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const image = item as Record<string, unknown>;
      return typeof image.url === "string" && typeof image.mimeType === "string";
    });
  }

  private toMeta(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }
}
