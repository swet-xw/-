import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GenerationModule } from "./generation/generation.module";
import { OperationsModule } from "./operations/operations.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"]
    }),
    OperationsModule,
    GenerationModule
  ]
})
export class AppModule {}
