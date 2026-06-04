import {
  GenerationProvider,
  GenerationTaskType,
  UnifiedGenerationRequest,
  UnifiedGenerationResult
} from "@image-platform/shared";

export interface ImageProvider {
  key: GenerationProvider;
  label: string;
  capabilities: readonly GenerationTaskType[];
  generate(
    request: UnifiedGenerationRequest,
    taskId: string
  ): Promise<Partial<UnifiedGenerationResult>>;
}
