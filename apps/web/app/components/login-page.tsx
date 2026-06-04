"use client";

import { FormEvent, useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "./auth-provider";
import { PlatformNav } from "./platform-nav";

export function LoginPage() {
  const { isAuthenticated, login, user } = useAuth();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("demo123456");
  const [error, setError] = useState("");

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      login(email, password);
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") ?? "/settings";
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    }
  }

  return (
    <main className="cnShell">
      <PlatformNav active="settings" />

      <section className="loginShell">
        <form className="loginPanel" onSubmit={submitLogin}>
          <div className="pageKicker">
            <ShieldCheck aria-hidden="true" size={18} />
            SIGN IN
          </div>
          <h1>{isAuthenticated ? "已经登录" : "登录 / 注册"}</h1>
          <p>首次使用会自动创建本地演示账户；登录成功后即可体验创作台、充值额度和保存 API 模型配置。</p>

          {isAuthenticated ? (
            <div className="authGate slimGate">
              <strong>{user?.email}</strong>
              <a href="/settings">进入设置中心</a>
            </div>
          ) : (
            <>
              <label>
                <span>邮箱</span>
                <input
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>
              <label>
                <span>密码</span>
                <input
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </label>
              {error ? <strong className="formError">{error}</strong> : null}
              <button type="submit">
                <LogIn aria-hidden="true" size={17} />
                登录 / 注册
              </button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
