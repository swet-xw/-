import { Injectable, NotFoundException } from "@nestjs/common";
import { GenerationProvider, ModelCatalogItem } from "@image-platform/shared";
import { CustomHttpProvider } from "./providers/custom-http.provider";
import { ImageProvider } from "./providers/image-provider";
import { MockProvider } from "./providers/mock.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { StabilityProvider } from "./providers/stability.provider";

@Injectable()
export class ProviderRegistryService {
  private readonly providers: Record<GenerationProvider, ImageProvider>;
  private readonly catalog: ModelCatalogItem[] = [
    {
      id: "mock/demo-cinematic-v1",
      provider: "mock",
      label: "Demo Cinematic v1",
      task: ["text_to_image", "image_to_image", "inpaint"],
      category: "workflow",
      availability: "ready",
      notes: "本地联调占位模型，用来验证任务流和 UI。"
    },
    {
      id: "openai/gpt-image-2",
      provider: "openai",
      label: "GPT Image 2",
      task: ["text_to_image", "image_to_image", "inpaint"],
      category: "premium",
      availability: "needs-config",
      notes: "OpenAI 当前主力图片模型，支持高质量文生图、图像编辑与多参考图工作流。"
    },
    {
      id: "openai/gpt-image-1.5",
      provider: "openai",
      label: "GPT Image 1.5",
      task: ["text_to_image", "image_to_image", "inpaint"],
      category: "premium",
      availability: "needs-config",
      notes: "高质量生成与编辑，适合默认主打模型。"
    },
    {
      id: "openai/gpt-image-1-mini",
      provider: "openai",
      label: "GPT Image 1 Mini",
      task: ["text_to_image"],
      category: "premium",
      availability: "needs-config",
      notes: "更适合轻量预览、批量草图和成本敏感场景。"
    },
    {
      id: "stability/stable-image-ultra",
      provider: "stability",
      label: "Stable Image Ultra",
      task: ["text_to_image"],
      category: "workflow",
      availability: "needs-config",
      notes: "适合扩图、局部编辑和图片工作流补充。"
    },
    {
      id: "custom-http/bring-your-own-model",
      provider: "custom-http",
      label: "自定义 API 模型",
      task: ["text_to_image", "image_to_image", "inpaint"],
      category: "custom",
      availability: "needs-config",
      notes: "接渠道商、自研代理、内部工作流或私有模型。"
    },
    {
      id: "self-hosted/comfyui-workflow",
      provider: "custom-http",
      label: "ComfyUI Workflow Gateway",
      task: ["text_to_image", "image_to_image", "inpaint"],
      category: "self-hosted",
      availability: "planned",
      notes: "建议通过内网 worker 或中间层接入，而不是直接暴露 ComfyUI。"
    }
  ];

  constructor(
    mockProvider: MockProvider,
    openaiProvider: OpenAIProvider,
    stabilityProvider: StabilityProvider,
    customHttpProvider: CustomHttpProvider
  ) {
    this.providers = {
      mock: mockProvider,
      openai: openaiProvider,
      stability: stabilityProvider,
      "custom-http": customHttpProvider
    };
  }

  get(provider: GenerationProvider) {
    return this.providers[provider];
  }

  getOrThrow(provider: GenerationProvider) {
    const item = this.get(provider);
    if (!item) {
      throw new NotFoundException(`Provider ${provider} not found`);
    }

    return item;
  }

  describeProviders() {
    return Object.values(this.providers).map((provider) => ({
      key: provider.key,
      label: provider.label,
      capabilities: [...provider.capabilities],
      configured: this.isProviderConfigured(provider.key),
      notes: this.describeProviderNotes(provider.key)
    }));
  }

  listCatalog() {
    return this.catalog.map((item) => ({
      ...item,
      availability:
        item.availability === "needs-config" && this.isProviderConfigured(item.provider)
          ? "ready"
          : item.availability
    }));
  }

  private isProviderConfigured(provider: GenerationProvider) {
    switch (provider) {
      case "mock":
        return true;
      case "openai":
        return Boolean(process.env.OPENAI_API_KEY);
      case "stability":
        return Boolean(process.env.STABILITY_API_KEY);
      case "custom-http":
        return Boolean(process.env.CUSTOM_PROVIDER_URL);
      default:
        return false;
    }
  }

  private describeProviderNotes(provider: GenerationProvider) {
    switch (provider) {
      case "mock":
        return "占位 provider，适合联调统一任务流。";
      case "openai":
        return "支持平台官方 Key，也支持单次请求传入自带 API Key。";
      case "stability":
        return "支持平台官方 Key 和自带 Key，当前接入 Stable Image text-to-image。";
      case "custom-http":
        return "可用于接第三方渠道、自研中转、开源模型网关或私有模型服务。";
      default:
        return undefined;
    }
  }
}
