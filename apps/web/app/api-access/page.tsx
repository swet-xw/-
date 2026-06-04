import { Braces, KeyRound, Plug, RadioTower } from "lucide-react";
import { PlatformNav } from "../components/platform-nav";
import { getProviders } from "../lib/api";

const requestExample = `POST /generation/tasks
{
  "provider": "custom-http",
  "model": "bring-your-own-model",
  "task": "image_to_image",
  "prompt": "把参考图改成暗黑商业海报",
  "referenceImages": [{ "url": "data:image/png;base64,...", "role": "reference" }],
  "extra": {
    "sourceMode": "custom",
    "customProviderUrl": "https://your-gateway.example.com/generate",
    "customProviderToken": "sk-..."
  }
}`;

export default async function ApiAccessPage() {
  const providers = await getProviders();

  return (
    <main className="cnShell">
      <PlatformNav active="api" />

      <section className="fluxPageHero">
        <div className="fluxHeroBadge">
          <Plug aria-hidden="true" size={18} />
          API ROUTER
        </div>
        <h1>API 接入</h1>
        <p>
          对外暴露统一生图任务接口；对内按来源路由到 OpenAI、Stability、自定义渠道或私有模型网关。适合做官方购买，也适合开放用户自带 Key。
        </p>
      </section>

      <section className="fluxSection">
        <div className="fluxSectionHead">
          <div>
            <span>OPEN SOURCE</span>
            <h2>三种模型来源</h2>
            <p>平台官方购买、用户自带 Key、自定义渠道网关可以并行存在。</p>
          </div>
          <RadioTower aria-hidden="true" size={28} />
        </div>

        <div className="sourceGrid pageSourceGrid">
          {[
            ["官方额度", "平台统一维护官方 Key、额度、采购成本和结算规则。", "平台代付"],
            ["自带 API Key", "用户在前端填自己的 Key，单次请求透传到对应 provider。", "BYOK"],
            ["自定义 API", "接渠道商、中转站、自研代理、ComfyUI 或私有模型。", "HTTP"]
          ].map(([title, copy, badge]) => (
            <article className="sourceCard staticCard" key={title}>
              <span>{badge}</span>
              <strong>{title}</strong>
              <small>{copy}</small>
            </article>
          ))}
        </div>

        <div className="apiLayout fluxApiLayout">
          <article className="codePanel">
            <div className="miniHeading">
              <Braces aria-hidden="true" size={17} />
              <span>统一请求示例</span>
            </div>
            <pre>{requestExample}</pre>
          </article>

          <aside className="providerList">
            <div className="miniHeading">
              <RadioTower aria-hidden="true" size={17} />
              <span>Provider 状态</span>
            </div>
            {providers.map((provider) => (
              <div className="providerRow" key={provider.key}>
                <div>
                  <strong>{provider.label}</strong>
                  <span>{provider.notes}</span>
                </div>
                <em>{provider.configured ? "READY" : "NEEDS KEY"}</em>
              </div>
            ))}
            <div className="providerHint strongHint">
              <KeyRound aria-hidden="true" size={16} />
              <span>前端输入的 API Key 仅用于本次任务请求，任务持久化记录会做敏感字段脱敏。</span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
