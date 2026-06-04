import {
  ModelCatalogItem,
  OperationsDashboard,
  ProviderDescriptor
} from "@image-platform/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getProviders() {
  try {
    return await fetchJson<ProviderDescriptor[]>("/generation/providers");
  } catch {
    return [
      {
        key: "mock",
        label: "Mock Provider",
        capabilities: ["text_to_image", "image_to_image", "inpaint"],
        configured: true,
        notes: "API 未启动时使用的前端回退数据。"
      }
    ] satisfies ProviderDescriptor[];
  }
}

export async function getCatalog() {
  try {
    return await fetchJson<ModelCatalogItem[]>("/generation/catalog");
  } catch {
    return [
      {
        id: "mock/demo-cinematic-v1",
        provider: "mock",
        label: "Demo Cinematic v1",
        task: ["text_to_image", "image_to_image", "inpaint"],
        category: "workflow",
        availability: "ready",
        notes: "API 未启动时使用的前端回退模型。"
      }
    ] satisfies ModelCatalogItem[];
  }
}

export async function getOperationsDashboard() {
  try {
    return await fetchJson<OperationsDashboard>("/operations/dashboard");
  } catch {
    return {
      project: {
        id: "project_demo",
        name: "Demo Project",
        ownerEmail: "owner@example.com",
        monthlyImageQuota: 1000,
        usedImages: 0,
        remainingImages: 1000
      },
      apiKeys: [],
      prices: [],
      usage: []
    } satisfies OperationsDashboard;
  }
}

