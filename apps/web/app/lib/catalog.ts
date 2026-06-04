import { GenerationProvider, ModelCatalogItem } from "@image-platform/shared";

export const fallbackCatalog: ModelCatalogItem[] = [
  {
    id: "mock/demo-cinematic-v1",
    provider: "mock",
    label: "平台演示模型",
    task: ["text_to_image", "image_to_image", "inpaint"],
    category: "workflow",
    availability: "ready",
    notes: "本地可直接运行，用来验证文生图和图生图流程。"
  }
];

export function splitModelId(id: string) {
  const [provider, ...rest] = id.split("/");
  return {
    provider: provider as GenerationProvider,
    model: rest.join("/") || id
  };
}

export function normalizeCatalog(catalog: ModelCatalogItem[]) {
  const items = catalog.length > 0 ? catalog : fallbackCatalog;
  const hasGptImage2 = items.some((item) => item.id === "openai/gpt-image-2");

  if (hasGptImage2) {
    return items;
  }

  return [
    ...items,
    {
      id: "openai/gpt-image-2",
      provider: "openai" as const,
      label: "GPT Image 2",
      task: ["text_to_image", "image_to_image", "inpaint"],
      category: "premium" as const,
      availability: "needs-config" as const,
      notes: "接入 OpenAI Key 后可用于高质量文生图与图生图。"
    }
  ];
}
