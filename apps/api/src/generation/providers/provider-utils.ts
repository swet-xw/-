import {
  GeneratedImage,
  GenerationTaskStatus,
  UnifiedGenerationRequest,
} from "@image-platform/shared";

interface UrlLikeImage {
  url?: string;
  mimeType?: string;
}

interface Base64LikeImage {
  b64_json?: string;
  base64?: string;
  mimeType?: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function resolveMimeType(value: unknown, fallback = "image/png") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function toDataUrl(base64: string, mimeType = "image/png") {
  return `data:${mimeType};base64,${base64}`;
}

function normalizeImage(value: unknown): GeneratedImage | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const url = typeof record.url === "string" ? record.url : undefined;
  if (url) {
    return {
      url,
      mimeType: resolveMimeType(record.mimeType)
    };
  }

  const base64 =
    typeof record.b64_json === "string"
      ? record.b64_json
      : typeof record.base64 === "string"
        ? record.base64
        : undefined;

  if (!base64) {
    return undefined;
  }

  return {
    url: toDataUrl(base64, resolveMimeType(record.mimeType)),
    mimeType: resolveMimeType(record.mimeType)
  };
}

export function buildOpenAIImagePayload(request: UnifiedGenerationRequest) {
  const extra = asRecord(request.extra) ?? {};

  return {
    model: request.model,
    prompt: request.prompt,
    size: typeof request.size === "string" ? request.size : "1024x1024",
    n: typeof request.count === "number" ? request.count : 1,
    quality: typeof extra.quality === "string" ? extra.quality : undefined,
    background:
      typeof extra.background === "string" ? extra.background : undefined,
    output_format:
      typeof extra.outputFormat === "string" ? extra.outputFormat : undefined,
    user: typeof extra.user === "string" ? extra.user : undefined
  };
}

export function normalizeOpenAIImages(payload: unknown): GeneratedImage[] {
  const root = asRecord(payload);
  const items = Array.isArray(root?.data) ? root.data : [];

  return items
    .map((item) => {
      const record = asRecord(item);
      if (!record) {
        return undefined;
      }

      if (typeof record.url === "string") {
        return {
          url: record.url,
          mimeType: "image/png"
        };
      }

      if (typeof record.b64_json === "string") {
        return {
          url: toDataUrl(record.b64_json, "image/png"),
          mimeType: "image/png"
        };
      }

      return undefined;
    })
    .filter((item): item is GeneratedImage => Boolean(item));
}

export function normalizeCustomProviderResponse(payload: unknown) {
  const root = asRecord(payload) ?? {};
  const images = [
    ...(Array.isArray(root.images) ? root.images : []),
    ...(Array.isArray(root.data) ? root.data : [])
  ]
    .map(normalizeImage)
    .filter((item): item is GeneratedImage => Boolean(item));

  const singleImage = normalizeImage(root.image);
  if (images.length === 0 && singleImage) {
    images.push(singleImage);
  }

  if (images.length === 0 && typeof root.url === "string") {
    images.push({
      url: root.url,
      mimeType: resolveMimeType(root.mimeType)
    });
  }

  const status: GenerationTaskStatus =
    root.status === "failed"
      ? "failed"
      : images.length > 0
        ? "succeeded"
        : "failed";

  return {
    status,
    images,
    error:
      typeof root.error === "string"
        ? root.error
        : images.length === 0
          ? "Custom provider returned no recognizable images"
          : undefined,
    meta: {
      upstreamTaskId:
        typeof root.id === "string"
          ? root.id
          : typeof root.taskId === "string"
            ? root.taskId
            : undefined,
      rawStatus: typeof root.status === "string" ? root.status : undefined
    }
  };
}

export function sizeToAspectRatio(size?: string) {
  if (!size) {
    return "1:1";
  }

  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) {
    return "1:1";
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) {
    return "1:1";
  }

  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.05) {
    return "1:1";
  }

  if (ratio > 1.6) {
    return "16:9";
  }

  if (ratio > 1.2) {
    return "3:2";
  }

  if (ratio < 0.65) {
    return "9:16";
  }

  if (ratio < 0.85) {
    return "2:3";
  }

  return "1:1";
}
