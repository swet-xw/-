import { Layers3, RadioTower, ShieldCheck, Sparkles } from "lucide-react";
import { PlatformNav } from "../components/platform-nav";
import { getCatalog, getProviders } from "../lib/api";
import { normalizeCatalog } from "../lib/catalog";

export default async function ModelsPage() {
  const [catalog, providers] = await Promise.all([getCatalog(), getProviders()]);
  const models = normalizeCatalog(catalog);
  const readyProviders = providers.filter((provider) => provider.configured).length;

  return (
    <main className="cnShell">
      <PlatformNav active="models" />

      <section className="fluxPageHero">
        <div className="fluxHeroBadge">
          <Layers3 aria-hidden="true" size={18} />
          MODEL MARKET
        </div>
        <h1>模型广场</h1>
        <p>
          把 GPT Image 2、Stable Image、自定义 API、私有工作流都放进同一个模型目录。用户看到的是模型能力，你在后台决定走官方额度、自带 Key 还是渠道网关。
        </p>
        <div className="heroStatsGrid">
          <span>
            <strong>{models.length}</strong>
            模型条目
          </span>
          <span>
            <strong>{readyProviders}</strong>
            已配置来源
          </span>
          <span>
            <strong>{providers.length}</strong>
            Provider 插槽
          </span>
        </div>
      </section>

      <section className="fluxSection">
        <div className="fluxSectionHead">
          <div>
            <span>MODEL CATALOG</span>
            <h2>统一模型目录</h2>
            <p>按任务能力、模型来源和可用状态展示，保持全站同一套卡片语言。</p>
          </div>
          <Sparkles aria-hidden="true" size={28} />
        </div>

        <div className="fluxModelGrid">
          {models.map((item) => (
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

        <div className="fluxSplitBand modelStrategyBand">
          <article>
            <Sparkles aria-hidden="true" size={20} />
            <h2>推荐默认组合</h2>
            <p>平台官方额度默认主推 GPT Image 2；成本敏感场景可以用轻量模型；渠道、开源或私有工作流走自定义 API。</p>
          </article>
          <article>
            <RadioTower aria-hidden="true" size={20} />
            <h2>统一能力标记</h2>
            <p>每个模型都标注支持文生图、图生图或局部重绘，前端可以按任务类型过滤可用模型。</p>
          </article>
          <article>
            <ShieldCheck aria-hidden="true" size={20} />
            <h2>开放来源策略</h2>
            <p>同一个模型条目可以使用平台 Key，也可以让用户填自己的 Key，或者路由到自定义 HTTP 网关。</p>
          </article>
        </div>
      </section>
    </main>
  );
}
