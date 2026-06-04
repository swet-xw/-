import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { UnifiedGenerationRequest } from "@image-platform/shared";
import { Buffer } from "buffer";
import { ImageProvider } from "./image-provider";
import {
  buildOpenAIImagePayload,
  normalizeOpenAIImages
} from "./provider-utils";

@Injectable()
export class OpenAIProvider implements ImageProvider {
  key = "openai" as const;
  label = "OpenAI Images";
  capabilities = ["text_to_image", "image_to_image", "inpaint"] as const;

  async generate(request: UnifiedGenerationRequest, taskId: string) {
    const apiKey = this.resolveApiKey(request);
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "OPENAI_API_KEY is missing. Configure the platform key or pass extra.apiKey for BYOK requests."
      );
    }

    const response =
      request.task === "text_to_image"
        ? await this.createImage(request, apiKey)
        : await this.editImage(request, apiKey);

    const payload = (await response.json().catch(() => undefined)) as unknown;
    if (!response.ok) {
      const message =
        typeof (payload as { error?: { message?: string } })?.error?.message ===
        "string"
          ? (payload as { error: { message: string } }).error.message
          : `OpenAI request failed with status ${response.status}`;

      throw new ServiceUnavailableException(message);
    }

    const images = normalizeOpenAIImages(payload);
    if (images.length === 0) {
      throw new ServiceUnavailableException(
        "OpenAI returned no images in a recognized format"
      );
    }

    return {
      status: "succeeded" as const,
      images,
      meta: {
        providerRequestId: `openai_${taskId}`,
        requestMode: request.task === "text_to_image" ? "generation" : "edit",
        upstreamCreated:
          typeof (payload as { created?: number })?.created === "number"
            ? (payload as { created: number }).created
            : undefined
      }
    };
  }

  private createImage(request: UnifiedGenerationRequest, apiKey: string) {
    return fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(buildOpenAIImagePayload(request))
    });
  }

  private async editImage(request: UnifiedGenerationRequest, apiKey: string) {
    const references =
      request.referenceImages?.filter((image) => image.role !== "mask") ?? [];
    const mask = request.referenceImages?.find((image) => image.role === "mask");

    if (references.length === 0) {
      throw new ServiceUnavailableException(
        "OpenAI image_to_image and inpaint requests require at least one reference image."
      );
    }

    const extra = this.asRecord(request.extra) ?? {};
    const body = new FormData();
    body.append("model", request.model);
    body.append("prompt", request.prompt);
    body.append("size", typeof request.size === "string" ? request.size : "1024x1024");
    body.append("n", String(typeof request.count === "number" ? request.count : 1));

    if (typeof extra.quality === "string") {
      body.append("quality", extra.quality);
    }

    if (typeof extra.background === "string") {
      body.append("background", extra.background);
    }

    if (typeof extra.outputFormat === "string") {
      body.append("output_format", extra.outputFormat);
    }

    for (const reference of references) {
      await this.appendImage(body, "image", reference.url);
    }

    if (mask) {
      await this.appendImage(body, "mask", mask.url);
    }

    return fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body
    });
  }

  private resolveApiKey(request: UnifiedGenerationRequest) {
    const extra = this.asRecord(request.extra) ?? {};
    return (
      this.readString(extra, "openaiApiKey") ??
      this.readString(extra, "apiKey") ??
      process.env.OPENAI_API_KEY
    );
  }

  private async appendImage(body: FormData, field: string, value: string) {
    if (!value.startsWith("data:")) {
      body.append(field, value);
      return;
    }

    const match = value.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) {
      throw new ServiceUnavailableException("Unsupported reference image data URL");
    }

    const [, mimeType, base64] = match;
    const bytes = Buffer.from(base64, "base64");
    const blob = new Blob([bytes], { type: mimeType });
    const extension = mimeType.split("/")[1] ?? "png";
    body.append(field, blob, `${field}.${extension}`);
  }

  private asRecord(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private readString(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
