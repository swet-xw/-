import { GenerationProvider, GenerationTaskType } from "@image-platform/shared";
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

class ReferenceImageDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  role?: "reference" | "mask" | "init";
}

export class CreateGenerationTaskDto {
  @IsIn(["mock", "openai", "stability", "custom-http"])
  provider!: GenerationProvider;

  @IsString()
  model!: string;

  @IsIn(["text_to_image", "image_to_image", "inpaint"])
  task!: GenerationTaskType;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8)
  count?: number;

  @IsOptional()
  @IsNumber()
  seed?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceImageDto)
  referenceImages?: ReferenceImageDto[];

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
