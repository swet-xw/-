import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { CreateGenerationTaskDto } from "./dto/create-generation-task.dto";
import { GenerationService } from "./generation.service";

@Controller("generation")
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Get("providers")
  listProviders() {
    return this.generationService.listProviders();
  }

  @Get("catalog")
  listCatalog() {
    return this.generationService.listCatalog();
  }

  @Get("tasks/:id")
  getTask(@Param("id") id: string) {
    return this.generationService.getTask(id);
  }

  @Post("tasks")
  createTask(
    @Body() dto: CreateGenerationTaskDto,
    @Headers("x-api-key") apiKey?: string
  ) {
    return this.generationService.createTask(dto, apiKey);
  }
}
