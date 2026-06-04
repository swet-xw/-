import { Body, Controller, Get, Post } from "@nestjs/common";
import { OperationsService } from "./operations.service";

@Controller("operations")
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get("dashboard")
  getDashboard() {
    return this.operationsService.getDashboard();
  }

  @Post("api-keys")
  createApiKey(@Body("name") name?: string) {
    return this.operationsService.createApiKey(name ?? "Default API Key");
  }
}
