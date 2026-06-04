"use client";

import {
  GenerationProvider,
  GenerationTaskType,
  ModelCatalogItem,
  OperationsDashboard,
  ProviderDescriptor,
  UnifiedGenerationResult
} from "@image-platform/shared";
import {
  ChevronLeft,
  DollarSign,
  Globe2,
  Home,
  Image as ImageIcon,
  ImagePlus,
  Languages,
  LayoutGrid,
  Loader2,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Upload,
  UserRound,
  Zap
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { SettingsModal } from "./settings-modal";
import { useTheme } from "./theme-provider";
import { normalizeCatalog, splitModelId } from "../lib/catalog";

interface LandingPageProps {
  apiBaseUrl: string;
  providers: ProviderDescriptor[];
  catalog: ModelCatalogItem[];
  dashboard: OperationsDashboard;
}

const promptExamples = [
  "国风赛博城市夜景，雨后街道反光，霓虹招牌，电影级构图，超精细细节",
  "一张高端护肤品广告图，黑色亚克力台面，硬边轮廓光，商业摄影质感",
  "把参考图改成暗黑杂志封面风格，保留人物姿态，增加胶片颗粒和强对比"
];

export function LandingPage({
  apiBaseUrl,
  catalog,
  dashboard
}: LandingPageProps) {
  const { apiSettings, credits, isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const modelCatalog = normalizeCatalog(catalog);
  const runnableModel =
    modelCatalog.find((item) => item.provider === "mock") ?? modelCatalog[0];
  const [task, setTask] = useState<GenerationTaskType>("text_to_image");
  const [selectedModelId, setSelectedModelId] = useState(runnableModel.id);
  const [prompt, setPrompt] = useState(promptExamples[0]);
  const [negativePrompt] = useState("低清晰度，畸形手指，文字水印，过曝");
  const [size, setSize] = useState("1024x1024");
  const [count] = useState(1);
  const [quality, setQuality] = useState("medium");
  const [referenceImage, setReferenceImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [status, setStatus] = useState("准备好了，开始创作");
  const [result, setResult] = useState<UnifiedGenerationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStudioAccountOpen, setIsStudioAccountOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const displayName = user?.name ?? "创作者";

  const selectedModel =
    modelCatalog.find((item) => item.id === selectedModelId) ?? runnableModel;
  const requestProvider = selectedModel.provider;
  const requestModel =
    requestProvider === "custom-http"
      ? apiSettings.customModel || "bring-your-own-model"
      : splitModelId(selectedModel.id).model;
  const price =
    dashboard.prices.find(
      (item) => item.provider === requestProvider && item.model === requestModel
    ) ??
    dashboard.prices.find((item) => item.provider === requestProvider) ??
    null;
  const estimatedCost = price
    ? ((price.pricePerImageCents * count) / 100).toFixed(2)
    : "0.00";

  async function handleReferenceUpload(file: File | null) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReferenceImage({
          url: reader.result,
          name: file.name
        });
        setTask("image_to_image");
      }
    };
    reader.readAsDataURL(file);
  }

  function buildExtra() {
    const extra: Record<string, unknown> = {
      quality,
      sourceMode: "settings"
    };

    const configuredKey = resolveConfiguredApiKey(requestProvider, apiSettings);
    if (configuredKey) {
      extra.apiKey = configuredKey;
    }

    if (requestProvider === "custom-http") {
      if (apiSettings.customProviderUrl) {
        extra.customProviderUrl = apiSettings.customProviderUrl;
      }
      if (apiSettings.customProviderToken) {
        extra.customProviderToken = apiSettings.customProviderToken;
      }
    }

    return extra;
  }

  async function createTask() {
    setIsSubmitting(true);
    setStatus("模型正在出图...");
    setResult(null);

    try {
      const createResponse = await fetch(`${apiBaseUrl}/generation/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: requestProvider,
          model: requestModel,
          task,
          prompt,
          negativePrompt,
          size,
          count,
          referenceImages:
            task === "text_to_image" || !referenceImage
              ? undefined
              : [
                  {
                    url: referenceImage.url,
                    role: "reference"
                  }
                ],
          extra: buildExtra()
        })
      });

      if (!createResponse.ok) {
        const payload = (await createResponse.json().catch(() => undefined)) as
          | { message?: string | string[] }
          | undefined;
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message ?? `创建失败：${createResponse.status}`;
        throw new Error(message);
      }

      const created = (await createResponse.json()) as UnifiedGenerationResult;

      for (let index = 0; index < 28; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        const pollResponse = await fetch(
          `${apiBaseUrl}/generation/tasks/${created.id}`,
          {
            cache: "no-store"
          }
        );
        const current = (await pollResponse.json()) as UnifiedGenerationResult;
        setResult(current);

        if (current.status === "succeeded" || current.status === "failed") {
          setStatus(
            current.status === "succeeded"
              ? "作品已生成"
              : current.error ?? "任务失败"
          );
          return;
        }
      }

      setStatus("任务仍在队列中，请稍后查看");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "请求失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="studioApp">
      <aside className="studioSidebar">
        <div className="studioBrand">
          <span>象</span>
          <strong>象素工坊</strong>
          <ChevronLeft aria-hidden="true" size={17} />
        </div>

        <nav className="studioNav codexNav">
          <div className="navGroup">
            <span className="navGroupTitle">项目</span>
            <a href="/">
              <Home aria-hidden="true" size={17} />
              首页
            </a>
            <a className="active" href="/studio">
              <ImageIcon aria-hidden="true" size={17} />
              AI 图像
            </a>
            <a href="/pricing">
              <DollarSign aria-hidden="true" size={17} />
              订阅价格
            </a>
          </div>

          <div className="navGroup">
            <span className="navGroupTitle">工具</span>
            <a href="/models">
              <Sparkles aria-hidden="true" size={17} />
              模型广场
            </a>
            <a href="/api-access">
              <LayoutGrid aria-hidden="true" size={17} />
              API 接入
            </a>
          </div>
        </nav>

        <div className="sidebarFooter">
          <section className="accountDock studioAccountDock">
            {isAuthenticated ? (
              <>
                <button
                  className="studioProfileButton"
                  onClick={() =>
                    setIsStudioAccountOpen((current) => !current)
                  }
                  type="button"
                >
                  <span className="avatarOrb">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>{displayName}</strong>
                    <small>{credits || 500} pt</small>
                  </span>
                  <ChevronLeft
                    aria-hidden="true"
                    className={isStudioAccountOpen ? "profileChevron open" : "profileChevron"}
                    size={15}
                  />
                </button>

                {isStudioAccountOpen ? (
                  <section className="studioProfilePopover" aria-label="工作台偏好设置">
                    <button
                      onClick={() => {
                        setIsLanguageOpen(true);
                        setIsStudioAccountOpen(false);
                      }}
                      type="button"
                    >
                      <Languages aria-hidden="true" size={16} />
                      语言
                      <strong>中文</strong>
                    </button>
                    <button
                      onClick={() => {
                        toggleTheme();
                        setIsStudioAccountOpen(false);
                      }}
                      type="button"
                    >
                      {theme === "dark" ? (
                        <Sun aria-hidden="true" size={16} />
                      ) : (
                        <Moon aria-hidden="true" size={16} />
                      )}
                      模式
                      <strong>{theme === "dark" ? "浅色" : "深色"}</strong>
                    </button>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setIsStudioAccountOpen(false);
                      }}
                      type="button"
                    >
                      <Settings aria-hidden="true" size={16} />
                      设置
                      <strong>API</strong>
                    </button>
                    <button
                      className="studioLogout"
                      onClick={() => {
                        logout();
                        setIsStudioAccountOpen(false);
                      }}
                      type="button"
                    >
                      <LogOut aria-hidden="true" size={16} />
                      退出登录
                    </button>
                  </section>
                ) : null}
              </>
            ) : (
              <a className="studioProfileButton" href="/login?next=/studio">
                <span className="avatarOrb">
                  <UserRound aria-hidden="true" size={16} />
                </span>
                <span>
                  <strong>未登录</strong>
                  <small>登录后配置 API</small>
                </span>
                <ChevronLeft className="profileChevron" aria-hidden="true" size={15} />
              </a>
            )}
          </section>
        </div>
      </aside>

      <section className="studioWorkspace">
        <div className="topAssetTabs">
          <a href="/models">
            <Sparkles aria-hidden="true" size={16} />
            灵感
          </a>
          <a className="active" href="/pricing">
            <LayoutGrid aria-hidden="true" size={16} />
            我的资产
          </a>
        </div>

        <section className={result?.images[0] ? "canvasStage hasImage" : "canvasStage"}>
          {result?.images[0] ? (
            <img alt="生成结果预览" src={result.images[0].url} />
          ) : (
            <div className="emptyCanvas">
              <div className="emptyIcon">
                <ImageIcon aria-hidden="true" size={28} />
              </div>
              <h1>{status}</h1>
              <p>在下方输入框里描述你想要的画面，然后点击生成，你的作品会出现在这里。</p>
            </div>
          )}
        </section>

        <section className="bottomComposer">
          <div className="composerTabs">
            <button
              className={task === "text_to_image" ? "active" : ""}
              onClick={() => setTask("text_to_image")}
              type="button"
            >
              图片生成
            </button>
            <button
              className={task === "image_to_image" ? "active" : ""}
              onClick={() => setTask("image_to_image")}
              type="button"
            >
              图片编辑
            </button>
          </div>

          <label className="composerPrompt">
            <textarea
              rows={3}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="请详细描述你想要生成的画面细节..."
            />
          </label>

          <div className="composerControls">
            <select
              className="modelSelect"
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
            >
              {modelCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            {task === "image_to_image" ? (
              <label className="uploadMini">
                <Upload aria-hidden="true" size={16} />
                {referenceImage ? referenceImage.name : "参考图"}
                <input
                  accept="image/*"
                  onChange={(event) =>
                    handleReferenceUpload(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
              </label>
            ) : null}

            <select value={size} onChange={(event) => setSize(event.target.value)}>
              <option value="1024x1024">1K</option>
              <option value="1536x1024">3:2</option>
              <option value="1024x1536">2:3</option>
              <option value="1792x1024">16:9</option>
            </select>

            <select value={quality} onChange={(event) => setQuality(event.target.value)}>
              <option value="medium">中质量</option>
              <option value="high">高质量</option>
              <option value="low">快速</option>
            </select>

            <button
              className="composerGenerate"
              disabled={isSubmitting}
              onClick={createTask}
              type="button"
            >
              {isSubmitting ? (
                <Loader2 aria-hidden="true" className="spinIcon" size={16} />
              ) : (
                <ImagePlus aria-hidden="true" size={16} />
              )}
              生成
              <span>{estimatedCost === "0.00" ? "免费" : `$${estimatedCost}`}</span>
            </button>
          </div>
        </section>
      </section>

      {isSettingsOpen ? (
        <div className="inlineModalOverlay" role="dialog" aria-modal="true">
          <SettingsModal loginNext="/studio" onClose={() => setIsSettingsOpen(false)} />
        </div>
      ) : null}

      {isLanguageOpen ? (
        <div className="inlineModalOverlay" role="dialog" aria-modal="true">
          <section className="languageModal">
            <div className="modalBrand">
              <Globe2 aria-hidden="true" size={18} />
              <div>
                <strong>语言设置</strong>
                <span>选择工作台显示语言</span>
              </div>
              <button
                className="modalClose"
                onClick={() => setIsLanguageOpen(false)}
                type="button"
              >
                关闭
              </button>
            </div>
            <button className="languageOption active" type="button">
              中文
              <span>当前语言</span>
            </button>
            <button className="languageOption" type="button">
              English
              <span>即将支持</span>
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function resolveConfiguredApiKey(
  provider: GenerationProvider,
  apiSettings: {
    openaiApiKey?: string;
    stabilityApiKey?: string;
    customProviderToken?: string;
  }
) {
  if (provider === "openai") {
    return apiSettings.openaiApiKey;
  }
  if (provider === "stability") {
    return apiSettings.stabilityApiKey;
  }
  if (provider === "custom-http") {
    return apiSettings.customProviderToken;
  }

  return undefined;
}
