import type { Metadata } from "next";
import { AuthProvider } from "./components/auth-provider";
import { ThemeProvider } from "./components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "象素工坊",
  description: "中文 AI 生图平台，支持官方额度、自带 API Key 和自定义模型来源。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
