import { Module } from "@nestjs/common";
import { OperationsModule } from "../operations/operations.module";
import { GenerationController } from "./generation.controller";
import { GenerationQueueService } from "./generation-queue.service";
import { GenerationRunnerService } from "./generation-runner.service";
import { GenerationService } from "./generation.service";
import { ProviderRegistryService } from "./provider-registry.service";
import { CustomHttpProvider } from "./providers/custom-http.provider";
import { MockProvider } from "./providers/mock.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { StabilityProvider } from "./providers/stability.provider";
import { TaskStoreService } from "./task-store.service";

@Module({
  imports: [OperationsModule],
  controllers: [GenerationController],
  providers: [
    TaskStoreService,
    GenerationService,
    GenerationRunnerService,
    GenerationQueueService,
    ProviderRegistryService,
    MockProvider,
    OpenAIProvider,
    StabilityProvider,
    CustomHttpProvider
  ]
})
export class GenerationModule {}
