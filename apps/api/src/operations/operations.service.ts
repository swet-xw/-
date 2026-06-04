import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException
} from "@nestjs/common";
import {
  ApiKeyDescriptor,
  CreatedApiKey,
  GenerationProvider,
  ModelPrice,
  OperationsDashboard,
  ProjectAccount,
  UsageLedgerEntry
} from "@image-platform/shared";
import { createHash, randomBytes, randomUUID } from "crypto";

interface InternalProject {
  id: string;
  name: string;
  ownerEmail: string;
  monthlyImageQuota: number;
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
}

interface ProjectRecord {
  id: string;
  name: string;
  ownerId: string;
  monthlyImageQuota: number;
}

interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  projectId: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

interface ModelPriceRecord {
  provider: string;
  model: string;
  pricePerImageCents: number;
  currency: string;
}

interface UsageLedgerRecord {
  id: string;
  projectId: string;
  taskId: string;
  provider: string;
  model: string;
  imageCount: number;
  costCents: number;
  createdAt: Date;
}

interface PrismaClientLike {
  user: {
    upsert(args: unknown): Promise<UserRecord>;
  };
  project: {
    findUnique(args: unknown): Promise<ProjectRecord | null>;
    upsert(args: unknown): Promise<ProjectRecord>;
  };
  apiKey: {
    create(args: unknown): Promise<ApiKeyRecord>;
    findMany(args: unknown): Promise<ApiKeyRecord[]>;
    findUnique(args: unknown): Promise<ApiKeyRecord | null>;
    update(args: unknown): Promise<ApiKeyRecord>;
    upsert(args: unknown): Promise<ApiKeyRecord>;
  };
  modelPrice: {
    findMany(args?: unknown): Promise<ModelPriceRecord[]>;
    upsert(args: unknown): Promise<ModelPriceRecord>;
  };
  usageLedger: {
    create(args: unknown): Promise<UsageLedgerRecord>;
    findMany(args: unknown): Promise<UsageLedgerRecord[]>;
  };
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

@Injectable()
export class OperationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OperationsService.name);
  private readonly defaultProject: InternalProject = {
    id: "project_demo",
    name: "Demo Project",
    ownerEmail: process.env.DEV_OWNER_EMAIL ?? "owner@example.com",
    monthlyImageQuota: Number(process.env.DEV_MONTHLY_IMAGE_QUOTA ?? 1000)
  };

  private readonly memoryApiKeys = new Map<string, ApiKeyDescriptor>();
  private readonly memoryUsage: UsageLedgerEntry[] = [];
  private readonly defaultPrices: ModelPrice[] = [
    {
      provider: "mock",
      model: "demo-cinematic-v1",
      pricePerImageCents: 0,
      currency: "USD"
    },
    {
      provider: "openai",
      model: "gpt-image-2",
      pricePerImageCents: 12,
      currency: "USD"
    },
    {
      provider: "openai",
      model: "gpt-image-1.5",
      pricePerImageCents: 8,
      currency: "USD"
    },
    {
      provider: "openai",
      model: "gpt-image-1-mini",
      pricePerImageCents: 3,
      currency: "USD"
    },
    {
      provider: "stability",
      model: "stable-image-ultra",
      pricePerImageCents: 6,
      currency: "USD"
    },
    {
      provider: "custom-http",
      model: "bring-your-own-model",
      pricePerImageCents: 1,
      currency: "USD"
    }
  ];

  private initPromise?: Promise<void>;
  private prisma?: PrismaClientLike;

  async onModuleInit() {
    await this.ensureReady();
  }

  async onModuleDestroy() {
    await this.prisma?.$disconnect();
  }

  async getDashboard(): Promise<OperationsDashboard> {
    await this.ensureReady();

    if (!this.prisma) {
      return {
        project: await this.getProjectAccount(this.defaultProject.id),
        apiKeys: [...this.memoryApiKeys.values()],
        prices: this.defaultPrices,
        usage: this.memoryUsage.slice(-20).reverse()
      };
    }

    const [apiKeys, prices, usage] = await Promise.all([
      this.prisma.apiKey.findMany({
        where: {
          projectId: this.defaultProject.id
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      this.prisma.modelPrice.findMany({
        orderBy: {
          provider: "asc"
        }
      }),
      this.prisma.usageLedger.findMany({
        where: {
          projectId: this.defaultProject.id
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 20
      })
    ]);

    return {
      project: await this.getProjectAccount(this.defaultProject.id),
      apiKeys: apiKeys.map((key) => this.toApiKeyDescriptor(key)),
      prices: prices.map((price) => this.toModelPrice(price)),
      usage: usage.map((entry) => this.toUsageEntry(entry))
    };
  }

  async createApiKey(name: string): Promise<CreatedApiKey> {
    await this.ensureReady();

    const apiKey = `ip_${randomBytes(24).toString("base64url")}`;
    const descriptor: ApiKeyDescriptor = {
      id: `key_${randomUUID()}`,
      name,
      prefix: apiKey.slice(0, 10),
      projectId: this.defaultProject.id,
      createdAt: new Date().toISOString()
    };

    if (this.prisma) {
      const record = await this.prisma.apiKey.create({
        data: {
          id: descriptor.id,
          projectId: descriptor.projectId,
          name: descriptor.name,
          prefix: descriptor.prefix,
          keyHash: this.hash(apiKey)
        }
      });

      return {
        apiKey,
        descriptor: this.toApiKeyDescriptor(record)
      };
    }

    this.memoryApiKeys.set(this.hash(apiKey), descriptor);

    return {
      apiKey,
      descriptor
    };
  }

  async resolveProject(apiKey?: string) {
    await this.ensureReady();

    if (!apiKey) {
      return this.defaultProject;
    }

    const envKey = process.env.DEV_API_KEY;
    if (envKey && apiKey === envKey) {
      return this.defaultProject;
    }

    const keyHash = this.hash(apiKey);
    if (this.prisma) {
      const record = await this.prisma.apiKey.findUnique({
        where: {
          keyHash
        }
      });

      if (!record || record.revokedAt) {
        throw new UnauthorizedException("Invalid API key");
      }

      await this.prisma.apiKey.update({
        where: {
          id: record.id
        },
        data: {
          lastUsedAt: new Date()
        }
      });

      return this.defaultProject;
    }

    const descriptor = this.memoryApiKeys.get(keyHash);
    if (!descriptor || descriptor.revokedAt) {
      throw new UnauthorizedException("Invalid API key");
    }

    descriptor.lastUsedAt = new Date().toISOString();
    return this.defaultProject;
  }

  async ensureQuota(projectId: string, requestedImages: number) {
    const project = await this.getProjectAccount(projectId);
    if (project.remainingImages < requestedImages) {
      throw new ForbiddenException("Monthly image quota exceeded");
    }
  }

  async calculateCost(
    provider: GenerationProvider,
    model: string,
    imageCount: number
  ) {
    const price = await this.findPrice(provider, model);
    return price.pricePerImageCents * imageCount;
  }

  async recordGenerationUsage(params: {
    projectId: string;
    taskId: string;
    provider: GenerationProvider;
    model: string;
    imageCount: number;
    costCents: number;
  }) {
    await this.ensureReady();

    if (this.prisma) {
      const record = await this.prisma.usageLedger.create({
        data: {
          id: `usage_${randomUUID()}`,
          projectId: params.projectId,
          taskId: params.taskId,
          provider: params.provider,
          model: params.model,
          imageCount: params.imageCount,
          costCents: params.costCents
        }
      });

      return this.toUsageEntry(record);
    }

    const entry: UsageLedgerEntry = {
      id: `usage_${randomUUID()}`,
      projectId: params.projectId,
      taskId: params.taskId,
      provider: params.provider,
      model: params.model,
      imageCount: params.imageCount,
      costCents: params.costCents,
      createdAt: new Date().toISOString()
    };

    this.memoryUsage.push(entry);
    return entry;
  }

  private async ensureReady() {
    if (!this.initPromise) {
      this.initPromise = this.startPrisma();
    }

    await this.initPromise;
  }

  private async startPrisma() {
    if (!process.env.DATABASE_URL) {
      this.logger.log("DATABASE_URL is missing; operations will stay in memory.");
      return;
    }

    try {
      const prismaModule = (await import("@prisma/client")) as {
        PrismaClient: new () => PrismaClientLike;
      };

      this.prisma = new prismaModule.PrismaClient();
      await this.prisma.$connect();
      await this.seedDefaults();
      this.logger.log("Operations store is using PostgreSQL via Prisma.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Prisma startup error";
      this.prisma = undefined;
      this.logger.error(
        `Prisma could not start for operations; falling back to memory. ${message}`
      );
    }
  }

  private async seedDefaults() {
    if (!this.prisma) {
      return;
    }

    await this.prisma.user.upsert({
      where: {
        email: this.defaultProject.ownerEmail
      },
      update: {
        name: "Demo Owner"
      },
      create: {
        id: "user_demo",
        email: this.defaultProject.ownerEmail,
        name: "Demo Owner"
      }
    });

    await this.prisma.project.upsert({
      where: {
        id: this.defaultProject.id
      },
      update: {
        name: this.defaultProject.name,
        monthlyImageQuota: this.defaultProject.monthlyImageQuota
      },
      create: {
        id: this.defaultProject.id,
        name: this.defaultProject.name,
        ownerId: "user_demo",
        monthlyImageQuota: this.defaultProject.monthlyImageQuota
      }
    });

    for (const price of this.defaultPrices) {
      await this.prisma.modelPrice.upsert({
        where: {
          provider_model: {
            provider: price.provider,
            model: price.model
          }
        },
        update: {
          pricePerImageCents: price.pricePerImageCents,
          currency: price.currency
        },
        create: {
          id: `price_${price.provider}_${price.model}`.replace(/[^a-z0-9_]/gi, "_"),
          provider: price.provider,
          model: price.model,
          pricePerImageCents: price.pricePerImageCents,
          currency: price.currency
        }
      });
    }

    if (process.env.DEV_API_KEY) {
      await this.prisma.apiKey.upsert({
        where: {
          keyHash: this.hash(process.env.DEV_API_KEY)
        },
        update: {
          name: "Development Key",
          revokedAt: null
        },
        create: {
          id: "key_development",
          projectId: this.defaultProject.id,
          name: "Development Key",
          prefix: process.env.DEV_API_KEY.slice(0, 10),
          keyHash: this.hash(process.env.DEV_API_KEY)
        }
      });
    }
  }

  private async getProjectAccount(projectId: string): Promise<ProjectAccount> {
    await this.ensureReady();

    if (this.prisma) {
      const project =
        (await this.prisma.project.findUnique({
          where: {
            id: projectId
          }
        })) ?? this.defaultProject;
      const usage = await this.prisma.usageLedger.findMany({
        where: {
          projectId
        }
      });
      const usedImages = usage.reduce(
        (total, entry) => total + entry.imageCount,
        0
      );

      return {
        id: project.id,
        name: project.name,
        ownerEmail: this.defaultProject.ownerEmail,
        monthlyImageQuota: project.monthlyImageQuota,
        usedImages,
        remainingImages: Math.max(project.monthlyImageQuota - usedImages, 0)
      };
    }

    const usedImages = this.memoryUsage
      .filter((entry) => entry.projectId === this.defaultProject.id)
      .reduce((total, entry) => total + entry.imageCount, 0);

    return {
      id: this.defaultProject.id,
      name: this.defaultProject.name,
      ownerEmail: this.defaultProject.ownerEmail,
      monthlyImageQuota: this.defaultProject.monthlyImageQuota,
      usedImages,
      remainingImages: Math.max(
        this.defaultProject.monthlyImageQuota - usedImages,
        0
      )
    };
  }

  private async findPrice(provider: GenerationProvider, model: string) {
    await this.ensureReady();

    if (this.prisma) {
      const prices = await this.prisma.modelPrice.findMany({
        where: {
          provider
        }
      });
      const exact = prices.find((price) => price.model === model);
      const fallback = prices[0];
      if (exact || fallback) {
        return this.toModelPrice(exact ?? fallback);
      }
    }

    return (
      this.defaultPrices.find(
        (price) => price.provider === provider && price.model === model
      ) ??
      this.defaultPrices.find((price) => price.provider === provider) ?? {
        provider,
        model,
        pricePerImageCents: 1,
        currency: "USD" as const
      }
    );
  }

  private toApiKeyDescriptor(record: ApiKeyRecord): ApiKeyDescriptor {
    return {
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      projectId: record.projectId,
      createdAt: record.createdAt.toISOString(),
      lastUsedAt: record.lastUsedAt?.toISOString(),
      revokedAt: record.revokedAt?.toISOString()
    };
  }

  private toModelPrice(record: ModelPriceRecord): ModelPrice {
    return {
      provider: this.toProvider(record.provider),
      model: record.model,
      pricePerImageCents: record.pricePerImageCents,
      currency: record.currency === "USD" ? "USD" : "USD"
    };
  }

  private toUsageEntry(record: UsageLedgerRecord): UsageLedgerEntry {
    return {
      id: record.id,
      projectId: record.projectId,
      taskId: record.taskId,
      provider: this.toProvider(record.provider),
      model: record.model,
      imageCount: record.imageCount,
      costCents: record.costCents,
      createdAt: record.createdAt.toISOString()
    };
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

  private hash(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }
}
