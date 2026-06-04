import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from "@nestjs/common";
import { ConnectionOptions, Queue, Worker } from "bullmq";
import { CreateGenerationTaskDto } from "./dto/create-generation-task.dto";
import { GenerationRunnerService } from "./generation-runner.service";

interface GenerationJobData {
  taskId: string;
  request: CreateGenerationTaskDto;
  context: GenerationJobContext;
}

interface GenerationJobContext {
  projectId: string;
}

@Injectable()
export class GenerationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationQueueService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly runner: GenerationRunnerService) {}

  async onModuleInit() {
    if (!process.env.REDIS_URL) {
      this.logger.log("REDIS_URL is missing; generation tasks will run locally.");
      return;
    }

    const connection = this.createRedisConnection(process.env.REDIS_URL);

    this.queue = new Queue("generation", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1_500
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 1_000
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
          count: 2_000
        }
      }
    });

    this.worker = new Worker(
      "generation",
      async (job) => {
        const data = job.data as GenerationJobData;
        await this.runner.execute(
          data.taskId,
          data.request,
          data.context
        );
      },
      {
        connection,
        concurrency: Number(process.env.GENERATION_WORKER_CONCURRENCY ?? 3)
      }
    );

    this.worker.on("failed", (job, error) => {
      this.logger.error(
        `Generation job ${job?.id ?? "unknown"} failed: ${error.message}`
      );
    });

    this.logger.log("Generation queue is running with BullMQ.");
  }

  async enqueue(
    taskId: string,
    request: CreateGenerationTaskDto,
    context: GenerationJobContext
  ) {
    if (!this.queue) {
      this.runLocally(taskId, request, context);
      return;
    }

    await this.queue.add(
      "generate-image",
      {
        taskId,
        request,
        context
      },
      {
        jobId: taskId
      }
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private createRedisConnection(redisUrl: string): ConnectionOptions {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname ? Number(parsed.pathname.slice(1) || 0) : 0,
      maxRetriesPerRequest: null
    };
  }

  private runLocally(
    taskId: string,
    request: CreateGenerationTaskDto,
    context: GenerationJobContext
  ) {
    setImmediate(() => {
      this.runner.execute(taskId, request, context).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Unknown local task error";
        this.logger.error(`Local generation task ${taskId} failed: ${message}`);
      });
    });
  }
}
