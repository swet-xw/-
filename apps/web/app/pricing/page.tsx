import { BadgeDollarSign, BarChart3, CheckCircle2, Wallet } from "lucide-react";
import { PlatformNav } from "../components/platform-nav";
import { RechargePanel } from "../components/recharge-panel";
import { getOperationsDashboard } from "../lib/api";

const plans = [
  ["免费体验", "适合试用平台能力", "500 pt", "包含 mock 模型体验和基础创作入口"],
  ["创作者", "适合稳定文生图/图生图", "按量充值", "支持官方模型额度和用户自带 API Key"],
  ["团队开放版", "适合接渠道和私有工作流", "自定义", "支持自定义 API、网关 Token 和模型名路由"]
];

export default async function PricingPage() {
  const dashboard = await getOperationsDashboard();
  const usedRatio =
    dashboard.project.monthlyImageQuota === 0
      ? 0
      : Math.round(
          (dashboard.project.usedImages / dashboard.project.monthlyImageQuota) * 100
        );

  return (
    <main className="cnShell">
      <PlatformNav active="pricing" />

      <section className="fluxPageHero">
        <div className="fluxHeroBadge">
          <Wallet aria-hidden="true" size={18} />
          PRICING
        </div>
        <h1>免费开始，按需升级</h1>
        <p>
          参考 Flux Art 的价格页结构，将官方额度、按量充值、模型单价和自定义来源集中展示，后续可替换成真实套餐和支付系统。
        </p>
        <div className="heroStatsGrid">
          <span>
            <strong>{dashboard.project.monthlyImageQuota}</strong>
            月额度
          </span>
          <span>
            <strong>{dashboard.project.usedImages}</strong>
            已使用
          </span>
          <span>
            <strong>{dashboard.project.remainingImages}</strong>
            剩余
          </span>
        </div>
      </section>

      <section className="fluxSection">
        <div className="pricingPlanGrid">
          {plans.map(([title, subtitle, price, copy]) => (
            <article className="pricingPlanCard" key={title}>
              <span>{subtitle}</span>
              <h2>{title}</h2>
              <strong>{price}</strong>
              <p>{copy}</p>
              <a href={title === "团队开放版" ? "/api-access" : "/studio"}>
                开始使用
              </a>
            </article>
          ))}
        </div>

        <RechargePanel />

        <div className="quotaPanel">
          <div>
            <div className="miniHeading">
              <BarChart3 aria-hidden="true" size={17} />
              <span>额度使用率</span>
            </div>
            <h2>{usedRatio}%</h2>
            <p>{dashboard.project.name} 当前仍在本地内存模式；接入数据库后即可持久化额度、API Key 和使用流水。</p>
          </div>
          <div className="quotaBar">
            <i style={{ width: `${Math.min(usedRatio, 100)}%` }} />
          </div>
        </div>

        <div className="fluxSectionHead compactHead">
          <div>
            <span>MODEL COST</span>
            <h2>模型单价参考</h2>
            <p>这里先以演示单价展示，方便后续接入真实采购价、会员折扣和渠道成本。</p>
          </div>
          <BadgeDollarSign aria-hidden="true" size={28} />
        </div>

        <div className="priceGrid">
          {dashboard.prices.map((price) => (
            <article key={`${price.provider}-${price.model}`}>
              <CheckCircle2 aria-hidden="true" size={18} />
              <span>{price.provider}</span>
              <h2>{price.model}</h2>
              <strong>${(price.pricePerImageCents / 100).toFixed(2)}</strong>
              <small>每张演示估算价</small>
            </article>
          ))}
        </div>

        <div className="faqGrid">
          {[
            ["可以只用自己的 API Key 吗？", "可以。登录后在设置弹窗中填写官方 Key 或自定义 API 来源即可。"],
            ["官方额度和自定义来源能共存吗？", "能共存。创作台会根据选择的模型和设置自动组装请求参数。"],
            ["后续可以接真实支付吗？", "可以。当前已预留充值和额度结构，后续替换支付网关即可。"]
          ].map(([question, answer]) => (
            <article key={question}>
              <CheckCircle2 aria-hidden="true" size={18} />
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
