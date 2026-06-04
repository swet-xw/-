import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { UnifiedGenerationRequest } from "@image-platform/shared";
import { Buffer } from "buffer";
import { ImageProvider } from "./image-provider";
import { sizeToAspectRatio } from "./provider-utils";

@Injectable()
export class StabilityProvider implements ImageProvider {
  key = "stability" as const;
  label = "Stability AI";
  capabilities = ["text_to_image"] as const;

  async generate(request: UnifiedGenerationRequest, taskId: string) {
    const apiKey = this.resolveApiKey(request);
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "STABILITY_API_KEY is missing. Configure the platform key or pass extra.apiKey for BYOK requests."
      );
    }

    if (request.task !== "text_to_image") {
      throw new ServiceUnavailableException(
        "The Stability adapter currently implements text_to_image. Route edit and inpaint flows through custom-http or extend this adapter."
      );
    }

    const count = request.count ?? 1;
    const images: Array<{ url: string; mimeType: string }> = [];

    for (let index = 0; index < count; index += 1) {
      const image = await this.generateOne(request, apiKey, index);
      images.push(image);
    }

    return {
      status: "succeeded" as const,
      images,
      meta: {
        providerRequestId: `stability_${taskId}`,
        endpoint: this.resolveEndpoint(request.model)
      }
    };
  }

  private async generateOne(
    request: UnifiedGenerationRequest,
    apiKey: string,
    index: number
  ) {
    const extra = request.extra ?? {};
    const outputFormat =
      typeof extra.outputFormat === "string" ? extra.outputFormat : "png";
    const body = new FormData();
    body.append("prompt", request.prompt);
    body.append("output_format", outputFormat);
    body.append("aspect_ratio", sizeToAspectRatio(request.size));

    if (request.negativePrompt) {
      body.append("negative_prompt", request.negativePrompt);
    }

    if (typeof request.seed === "number") {
      body.append("seed", String(request.seed + index));
    }

    const response = await fetch(this.resolveEndpoint(request.model), {
      method: "POST",
      headers: {
        accept: "image/*",
        authorization: `Bearer ${apiKey}`
      },
      body
    });

    if (!response.ok) {
      const message = await this.readError(response);
      throw new ServiceUnavailableException(message);
    }

    const mimeType = response.headers.get("content-type") ?? `image/${outputFormat}`;
    const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");

    return {
      url: `data:${mimeType};base64,${bytes}`,
      mimeType
    };
  }

  private resolveEndpoint(model: string) {
    const slug = model.toLowerCase().includes("core") ? "core" : "ultra";
    return `https://api.stability.ai/v2beta/stable-image/generate/${slug}`;
  }

  private resolveApiKey(request: UnifiedGenerationRequest) {
    const extra =
      request.extra && typeof request.extra === "object" && !Array.isArray(request.extra)
        ? (request.extra as Record<string, unknown>)
        : {};

    return (
      this.readString(extra, "stabilityApiKey") ??
      this.readString(extra, "apiKey") ??
      process.env.STABILITY_API_KEY
    );
  }

  private readString(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private async readError(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json().catch(() => undefined)) as
        | { message?: string; errors?: string[] }
        | undefined;
      return (
        payload?.message ??
        payload?.errors?.join(", ") ??
        `Stability request failed with status ${response.status}`
      );
    }

    const text = await response.text().catch(() => "");
    return text || `Stability request failed with status ${response.status}`;
  }
}
