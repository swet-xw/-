"use client";

import {
  ArrowRight,
  ChevronDown,
  Globe2,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  X
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth-provider";
import { SettingsModal } from "./settings-modal";
import { useTheme } from "./theme-provider";

type NavKey = "home" | "studio" | "models" | "pricing" | "api" | "settings";

const navItems: Array<{ key: NavKey; label: string; href: string }> = [
  { key: "home", label: "首页", href: "/" },
  { key: "studio", label: "AI 图像", href: "/studio" },
  { key: "models", label: "模型广场", href: "/models" },
  { key: "pricing", label: "订阅价格", href: "/pricing" },
  { key: "api", label: "API 接入", href: "/api-access" }
];

export function PlatformNav({ active }: { active: NavKey }) {
  const { credits, isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const displayName = user?.name ?? "创作者";

  return (
    <>
      <nav className="cnNav fluxNav">
        <a className="cnBrand" href="/">
          <span>象</span>
          <strong>象素工坊</strong>
        </a>
        <div className="cnNavLinks">
          {navItems.map((item) => (
            <a
              className={active === item.key ? "active" : ""}
              href={item.href}
              key={item.key}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="cnNavActions">
          {isAuthenticated ? (
            <div className="accountMenuWrap">
              <button
                className="profileButton"
                onClick={() => setIsAccountOpen((current) => !current)}
                type="button"
              >
                <span className="profileAvatar">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="profileCopy">
                  <strong>{displayName}</strong>
                  <small>{credits || 500} pt</small>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={isAccountOpen ? "rotateIcon" : ""}
                  size={16}
                />
              </button>

              {isAccountOpen ? (
                <section className="accountDropdown">
                  <div className="accountMenuHeader">
                    <span className="profileAvatar large">
                      {displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{displayName}</strong>
                      <small>{user?.email}</small>
                    </div>
                  </div>

                  <div className="accountMenuStat">
                    <span>官方模型额度</span>
                    <strong>{credits || 500} pt</strong>
                  </div>

                  <button
                    onClick={() => {
                      setIsLanguageOpen(true);
                      setIsAccountOpen(false);
                    }}
                    type="button"
                  >
                    <Globe2 aria-hidden="true" size={17} />
                    <span>语言</span>
                    <strong>中文</strong>
                  </button>

                  <button
                    onClick={() => {
                      toggleTheme();
                      setIsAccountOpen(false);
                    }}
                    type="button"
                  >
                    {theme === "dark" ? (
                      <Sun aria-hidden="true" size={17} />
                    ) : (
                      <Moon aria-hidden="true" size={17} />
                    )}
                    <span>外观</span>
                    <strong>{theme === "dark" ? "浅色" : "深色"}</strong>
                  </button>

                  <button
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsAccountOpen(false);
                    }}
                    type="button"
                  >
                    <Settings aria-hidden="true" size={17} />
                    <span>设置</span>
                    <strong>API / 额度</strong>
                  </button>

                  <a href="/studio">
                    <Sparkles aria-hidden="true" size={17} />
                    <span>进入创作台</span>
                    <strong>AI 图像</strong>
                  </a>

                  <button
                    className="accountLogout"
                    onClick={() => {
                      logout();
                      setIsAccountOpen(false);
                    }}
                    type="button"
                  >
                    <LogOut aria-hidden="true" size={17} />
                    <span>退出登录</span>
                  </button>
                </section>
              ) : null}
            </div>
          ) : (
            <a className="cnNavCta navPrimaryCta" href="/login?next=/studio">
              <UserRound aria-hidden="true" size={16} />
              免费体验
              <ArrowRight aria-hidden="true" size={16} />
            </a>
          )}
        </div>
      </nav>

      {isSettingsOpen ? (
        <div className="inlineModalOverlay" role="dialog" aria-modal="true">
          <SettingsModal loginNext="/" onClose={() => setIsSettingsOpen(false)} />
        </div>
      ) : null}

      {isLanguageOpen ? (
        <div className="inlineModalOverlay" role="dialog" aria-modal="true">
          <section className="languageModal">
            <div className="modalBrand">
              <Globe2 aria-hidden="true" size={18} />
              <div>
                <strong>语言设置</strong>
                <span>选择网站显示语言</span>
              </div>
              <button
                className="modalClose"
                onClick={() => setIsLanguageOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={16} />
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
    </>
  );
}
