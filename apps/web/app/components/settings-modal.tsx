"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  KeyRound,
  Lock,
  Plug,
  Save,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import { ApiSettings, useAuth } from "./auth-provider";
import { RechargePanel } from "./recharge-panel";

type SettingsTab = "account" | "official" | "custom" | "quota";

const settingTabs: Array<{
  id: SettingsTab;
  title: string;
  description: string;
}> = [
  {
    id: "account",
    title: "账户",
    description: "登录状态与账户信息"
  },
  {
    id: "official",
    title: "官方模型",
    description: "OpenAI / Stability Key"
  },
  {
    id: "custom",
    title: "自定义 API",
    description: "渠道网关与模型名"
  },
  {
    id: "quota",
    title: "官方额度",
    description: "充值平台官方模型"
  }
];

export function SettingsModal({
  loginNext = "/settings",
  onClose
}: {
  loginNext?: string;
  onClose?: () => void;
}) {
  const {
    apiSettings,
    isAuthenticated,
    logout,
    saveApiSettings,
    user
  } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("official");
  const [form, setForm] = useState<ApiSettings>({
    customModel: "bring-your-own-model"
  });
  const [message, setMessage] = useState("设置中心会集中管理所有 API 来源。");

  useEffect(() => {
    setForm({
      customModel: "bring-your-own-model",
      ...apiSettings
    });
  }, [apiSettings]);

  function updateField(key: keyof ApiSettings, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveApiSettings(form);
    setMessage("API 设置已保存，创作台会自动读取这些配置。");
  }

  return (
    <div className="settingsModal">
      <aside className="settingsRail">
        <div className="modalBrand">
          <ShieldCheck aria-hidden="true" size={18} />
          <div>
            <strong>设置中心</strong>
            <span>账户与模型来源</span>
          </div>
          {onClose ? (
            <button className="modalClose" onClick={onClose} type="button">
              <X aria-hidden="true" size={17} />
            </button>
          ) : null}
        </div>

        {settingTabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <strong>{tab.title}</strong>
            <span>{tab.description}</span>
          </button>
        ))}
      </aside>

      <section className="settingsDetail">
        {!isAuthenticated ? (
          <div className="authGate modalGate">
            <Lock aria-hidden="true" size={20} />
            <div>
              <strong>登录后才可以配置 API 模型</strong>
              <p>API Key、自定义网关和官方额度都属于账户资产，请先登录。</p>
            </div>
            <a href={`/login?next=${encodeURIComponent(loginNext)}`}>去登录</a>
          </div>
        ) : activeTab === "account" ? (
          <div className="settingsPanel singlePanel">
            <div className="miniHeading">
              <UserRound aria-hidden="true" size={17} />
              <span>账户信息</span>
            </div>
            <div className="accountCard">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
            <button className="dangerButton" onClick={logout} type="button">
              退出登录
            </button>
          </div>
        ) : activeTab === "quota" ? (
          <RechargePanel />
        ) : (
          <form className="settingsForm" onSubmit={submitSettings}>
            {activeTab === "official" ? (
              <article className="settingsPanel singlePanel">
                <div className="miniHeading">
                  <KeyRound aria-hidden="true" size={17} />
                  <span>官方模型 Key</span>
                </div>
                <label>
                  <span>OpenAI API Key</span>
                  <input
                    onChange={(event) =>
                      updateField("openaiApiKey", event.target.value)
                    }
                    placeholder="sk-..."
                    type="password"
                    value={form.openaiApiKey ?? ""}
                  />
                </label>
                <label>
                  <span>Stability API Key</span>
                  <input
                    onChange={(event) =>
                      updateField("stabilityApiKey", event.target.value)
                    }
                    placeholder="sk-..."
                    type="password"
                    value={form.stabilityApiKey ?? ""}
                  />
                </label>
              </article>
            ) : (
              <article className="settingsPanel singlePanel">
                <div className="miniHeading">
                  <Plug aria-hidden="true" size={17} />
                  <span>自定义 API 来源</span>
                </div>
                <label>
                  <span>接口地址</span>
                  <input
                    onChange={(event) =>
                      updateField("customProviderUrl", event.target.value)
                    }
                    placeholder="https://your-gateway.example.com/generate"
                    value={form.customProviderUrl ?? ""}
                  />
                </label>
                <label>
                  <span>Token</span>
                  <input
                    onChange={(event) =>
                      updateField("customProviderToken", event.target.value)
                    }
                    placeholder="Bearer token 或渠道 Key"
                    type="password"
                    value={form.customProviderToken ?? ""}
                  />
                </label>
                <label>
                  <span>模型名</span>
                  <input
                    onChange={(event) =>
                      updateField("customModel", event.target.value)
                    }
                    value={form.customModel ?? ""}
                  />
                </label>
              </article>
            )}

            <div className="settingActions modalActions">
              <p>{message}</p>
              <button type="submit">
                <Save aria-hidden="true" size={17} />
                保存 API 设置
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
