import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  CheckCircle2,
  ImagePlus,
  Layers3,
  Plug,
  ShieldCheck,
  Sparkles,
  Wand2
} from "lucide-react";
import { PlatformNav } from "./components/platform-nav";
import { RechargePanel } from "./components/recharge-panel";
import { getCatalog, getOperationsDashboard } from "./lib/api";
import { normalizeCatalog } from "./lib/catalog";

const heroModelPills = [
  "GPT Image 2",
  "Nano Banana Pro",
  "Stable Image Ultra",
  "自定义 API"
];

const templateCards = [
  ["商品主图", "电商营销", "突出商品主体，生成高质感商业主图。"],
  ["产品 KV", "品牌传播", "为新品发布生成统一调性的视觉海报。"],
  ["人物一致性", "角色创作", "保持人物特征，多场景延展创作。"],
  ["装修效果图", "空间设计", "把空间描述快速转成氛围效果图。"],
  ["老照片修复", "图像增强", "修复模糊、划痕和低清晰度图像。"],
  ["UI 界面图", "界面设计", "用提示词生成 App 界面方向草图。"]
];

const platformFeatures = [
  ["官方额度", "平台统一购买主流模型额度，用户登录后可充值直接使用。"],
  ["自带 Key", "支持 OpenAI、Stability 等官方 Key，适合团队独立结算。"],
  ["开放 API", "可接入渠道商、自研网关、ComfyUI 或私有模型工作流。"]
];

export default async function HomePage() {
  const [catalog, dashboard] = await Promise.all([
    getCatalog(),
    getOperationsDashboard()
  ]);
  const models = normalizeCatalog(catalog);

  return (
    <main className="cnShell">
      <PlatformNav active="home" />

      <section className="fluxHero">
        <div className="fluxHeroBackdrop" aria-hidden="true" />
        <div className="fluxHeroBadge">
          <Sparkles aria-hidden="true" size={18} />
          一站式 AI 图像平台
        </div>
        <h1>
          <span>AI 如此简单</span>
          <span>激发你的无限创意</span>
        </h1>
        <p>
          集合 GPT Image 2、Stable Image、自定义 API 与私有工作流，支持文生图、图生图、官方额度和用户自带 Key。
        </p>
        <div className="fluxHeroActions">
          <a className="cnNavCta navPrimaryCta" href="/studio">
            开始创作
            <ArrowRight aria-hidden="true" size={16} />
          </a>
          <a className="ghostLink" href="/models">
            探索模型
          </a>
        </div>
        <div className="heroModelPills">
          {heroModelPills.map((model) => (
            <span key={model}>{model}</span>
          ))}
        </div>

        <div className="heroCreatorCard">
          <div className="creatorTabsPreview">
            <span className="active">图片生成</span>
            <span>图片编辑</span>
          </div>
          <div className="creatorPromptPreview">
            <ImagePlus aria-hidden="true" size={18} />
            <span>描述你想要生成的画面或上传参考图，平台会自动路由到合适模型。</span>
          </div>
          <div className="creatorMetaPreview">
            <span>GPT Image 2</span>
            <span>1K</span>
            <span>中质量</span>
            <a href="/studio">生成</a>
          </div>
        </div>
      </section>

      <section className="fluxSection">
        <div className="fluxSectionHead">
          <div>
            <span>GLOBAL MODELS</span>
            <h2>主流模型统一接入</h2>
            <p>用户看到的是能力入口，你可以在后台决定走官方额度、自带 Key 还是自定义渠道。</p>
          </div>
          <Layers3 aria-hidden="true" size={28} />
        </div>

        <div className="fluxModelGrid">
          {models.slice(0, 6).map((item) => (
            <article className="modelCard fluxCard" key={item.id}>
              <div className="modelCardTop">
                <span>{item.category}</span>
                <strong>{item.availability === "ready" ? "可运行" : "需配置"}</strong>
              </div>
              <h2>{item.label}</h2>
              <p>{item.notes}</p>
              <div className="tagRow">
                <span>{item.provider}</span>
                {item.task.map((task) => (
                  <span key={task}>{task}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="fluxSection">
        <div className="fluxSectionHead">
          <div>
            <span>CREATIVE TEMPLATES</span>
            <h2>创意模板</h2>
            <p>参考 Flux Art 的模板化入口，把常见商业场景直接做成中文工具卡片。</p>
          </div>
          <Wand2 aria-hidden="true" size={28} />
        </div>

        <div className="templateGrid">
          {templateCards.map(([title, badge, copy]) => (
            <article className="templateCard" key={title}>
              <span>{badge}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fluxSplitBand">
        {platformFeatures.map(([title, copy], index) => (
          <article key={title}>
            {index === 0 ? (
              <BadgeDollarSign aria-hidden="true" size={22} />
            ) : index === 1 ? (
              <ShieldCheck aria-hidden="true" size={22} />
            ) : (
              <Plug aria-hidden="true" size={22} />
            )}
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="fluxSection">
        <div className="fluxSectionHead">
          <div>
            <span>PRICING</span>
            <h2>价格与额度</h2>
            <p>首页保留价格和额度信息，创作台只负责实际工具使用。</p>
          </div>
          <Boxes aria-hidden="true" size={28} />
        </div>

        <RechargePanel />

        <div className="priceGrid">
          {dashboard.prices.slice(0, 6).map((price) => (
            <article key={`${price.provider}-${price.model}`}>
              <CheckCircle2 aria-hidden="true" size={18} />
              <span>{price.provider}</span>
              <h2>{price.model}</h2>
              <strong>${(price.pricePerImageCents / 100).toFixed(2)}</strong>
              <small>每张演示估算价</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
