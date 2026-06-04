"use client";

import { Lock, Wallet } from "lucide-react";
import { useAuth } from "./auth-provider";

const rechargePlans = [
  { amount: 100, label: "轻量体验包" },
  { amount: 500, label: "标准创作包" },
  { amount: 2000, label: "团队运营包" }
];

export function RechargePanel() {
  const { credits, isAuthenticated, recharge } = useAuth();

  if (!isAuthenticated) {
    return (
      <section className="authGate">
        <Lock aria-hidden="true" size={20} />
        <div>
          <strong>登录后才可以充值官方模型额度</strong>
          <p>官方模型额度、API 模型配置都属于账户资产，需要先登录。</p>
        </div>
        <a href="/login?next=/pricing">去登录</a>
      </section>
    );
  }

  return (
    <section className="rechargePanel">
      <div>
        <div className="miniHeading">
          <Wallet aria-hidden="true" size={17} />
          <span>官方模型余额</span>
        </div>
        <h2>{credits} 张</h2>
        <p>这里是本地演示充值余额；接真实支付后可替换成订单和余额接口。</p>
      </div>
      <div className="rechargeGrid">
        {rechargePlans.map((plan) => (
          <button key={plan.amount} onClick={() => recharge(plan.amount)} type="button">
            <span>{plan.label}</span>
            <strong>充值 {plan.amount} 张</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
