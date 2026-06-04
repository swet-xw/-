export type GenerationTaskType = "text_to_image" | "image_to_image" | "inpaint";

export type GenerationTaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export type GenerationProvider =
  | "mock"
  | "openai"
  | "stability"
  | "custom-http";

export interface ReferenceImageInput {
  url: string;
  role?: "reference" | "mask" | "init";
}

export interface UnifiedGenerationRequest {
  provider: GenerationProvider;
  model: string;
  task: GenerationTaskType;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  count?: number;
  seed?: number;
  referenceImages?: ReferenceImageInput[];
  extra?: Record<string, unknown>;
}

export interface GeneratedImage {
  url: string;
  mimeType: string;
}

export interface UnifiedGenerationResult {
  id: string;
  status: GenerationTaskStatus;
  provider: GenerationProvider;
  model: string;
  prompt: string;
  images: GeneratedImage[];
  error?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderDescriptor {
  key: GenerationProvider;
  label: string;
  capabilities: GenerationTaskType[];
  configured: boolean;
  notes?: string;
}

export interface ModelCatalogItem {
  id: string;
  provider: GenerationProvider;
  label: string;
  task: GenerationTaskType[];
  category: "premium" | "workflow" | "custom" | "self-hosted";
  availability: "ready" | "needs-config" | "planned";
  notes: string;
}

export interface ProjectAccount {
  id: string;
  name: string;
  ownerEmail: string;
  monthlyImageQuota: number;
  usedImages: number;
  remainingImages: number;
}

export interface ApiKeyDescriptor {
  id: string;
  name: string;
  prefix: string;
  projectId: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export interface CreatedApiKey {
  apiKey: string;
  descriptor: ApiKeyDescriptor;
}

export interface ModelPrice {
  provider: GenerationProvider;
  model: string;
  pricePerImageCents: number;
  currency: "USD";
}

export interface UsageLedgerEntry {
  id: string;
  projectId: string;
  taskId: string;
  provider: GenerationProvider;
  model: string;
  imageCount: number;
  costCents: number;
  createdAt: string;
}

export interface OperationsDashboard {
  project: ProjectAccount;
  apiKeys: ApiKeyDescriptor[];
  prices: ModelPrice[];
  usage: UsageLedgerEntry[];
}
