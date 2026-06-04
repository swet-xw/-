import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { UnifiedGenerationRequest } from "@image-platform/shared";
import { ImageProvider } from "./image-provider";
import { normalizeCustomProviderResponse } from "./provider-utils";

@Injectable()
export class CustomHttpProvider implements ImageProvider {
  key = "custom-http" as const;
  label = "Custom HTTP API";
  capabilities = ["text_to_image", "image_to_image", "inpaint"] as const;

  async generate(request: UnifiedGenerationRequest, taskId: string) {
    const endpoint = this.resolveEndpoint(request);
    if (!endpoint) {
      throw new ServiceUnavailableException(
        "CUSTOM_PROVIDER_URL is missing. Configure a platform endpoint or pass extra.customProviderUrl."
      );
    }

    const token = this.resolveToken(request);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.resolveHeaders(request),
        ...(token
          ? {
              Authorization: `Bearer ${token}`
            }
          : {})
      },
      body: JSON.stringify({
        taskId,
        request
      })
    });

    const payload = (await response.json().catch(() => undefined)) as unknown;
    if (!response.ok) {
      const root =
        payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const message =
        typeof root.error === "string"
          ? root.error
          : `Custom provider request failed with status ${response.status}`;

      throw new ServiceUnavailableException(message);
    }

    const normalized = normalizeCustomProviderResponse(payload);
    if (normalized.images.length === 0) {
      throw new ServiceUnavailableException(
        normalized.error ?? "Custom provider returned no images"
      );
    }

    return {
      status: normalized.status,
      images: normalized.images,
      error: normalized.error,
      meta: {
        providerRequestId: `custom_${taskId}`,
        upstream: endpoint,
        authMode: token ? "bearer" : "none",
        forwardedShape: {
          provider: request.provider,
          model: request.model,
          task: request.task
        },
        ...normalized.meta
      }
    };
  }

  private resolveEndpoint(request: UnifiedGenerationRequest) {
    const extra = this.asRecord(request.extra) ?? {};
    return (
      this.readString(extra, "customProviderUrl") ??
      this.readString(extra, "providerUrl") ??
      this.readString(extra, "endpoint") ??
      process.env.CUSTOM_PROVIDER_URL
    );
  }

  private resolveToken(request: UnifiedGenerationRequest) {
    const extra = this.asRecord(request.extra) ?? {};
    return (
      this.readString(extra, "customProviderToken") ??
      this.readString(extra, "providerToken") ??
      this.readString(extra, "apiKey") ??
      process.env.CUSTOM_PROVIDER_TOKEN
    );
  }

  private resolveHeaders(request: UnifiedGenerationRequest) {
    const extra = this.asRecord(request.extra) ?? {};
    const headers = this.asRecord(extra.customHeaders);
    if (!headers) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(headers).filter((entry): entry is [string, string] => {
        const [key, value] = entry;
        return key.length > 0 && typeof value === "string";
      })
    );
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
