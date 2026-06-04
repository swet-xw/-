"use client";

import {
  ModelCatalogItem,
  ProviderDescriptor,
  UnifiedGenerationResult
} from "@image-platform/shared";
import { PlayCircle } from "lucide-react";
import { useState } from "react";

interface GenerationConsoleProps {
  apiBaseUrl: string;
  apiKey?: string;
  providers: ProviderDescriptor[];
  catalog: ModelCatalogItem[];
  onTaskFinished?: () => void;
}

export function GenerationConsole({
  apiBaseUrl,
  apiKey,
  providers,
  catalog,
  onTaskFinished
}: GenerationConsoleProps) {
  const defaultModel = catalog[0];
  const [provider, setProvider] = useState(defaultModel?.provider ?? "mock");
  const [model, setModel] = useState(defaultModel?.id.split("/")[1] ?? "demo-cinematic-v1");
  const [task, setTask] = useState<"text_to_image" | "image_to_image" | "inpaint">(
    defaultModel?.task[0] ?? "text_to_image"
  );
  const [prompt, setPrompt] = useState(
    "A cinematic portrait of a traveler under amber street lights"
  );
  const [status, setStatus] = useState("还没有发起任务");
  const [result, setResult] = useState<UnifiedGenerationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleModels = catalog.filter((item) => item.provider === provider);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("正在创建任务...");
    setResult(null);

    try {
      const createResponse = await fetch(`${apiBaseUrl}/generation/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {})
        },
        body: JSON.stringify({
          provider,
          model,
          task,
          prompt,
          size: "1024x1024",
          count: 1
        })
      });

      if (!createResponse.ok) {
        const errorPayload = (await createResponse.json().catch(() => undefined)) as
          | { message?: string | string[] }
          | undefined;
        const message = Array.isArray(errorPayload?.message)
          ? errorPayload?.message.join(", ")
          : errorPayload?.message ?? `创建任务失败: ${createResponse.status}`;
        throw new Error(message);
      }

      const created = (await createResponse.json()) as UnifiedGenerationResult;
      setStatus(`任务已创建：${created.id}，开始轮询状态...`);

      let current = created;
      for (let index = 0; index < 20; index += 1) {
        const pollResponse = await fetch(`${apiBaseUrl}/generation/tasks/${created.id}`, {
          cache: "no-store"
        });

        if (!pollResponse.ok) {
          throw new Error(`轮询失败: ${pollResponse.status}`);
        }

        current = (await pollResponse.json()) as UnifiedGenerationResult;
        setResult(current);

        if (current.status === "succeeded" || current.status === "failed") {
          setStatus(
            current.status === "succeeded"
              ? "任务已完成"
              : `任务失败：${current.error ?? "未知错误"}`
          );
          onTaskFinished?.();
          return;
        }

        setStatus(`任务状态：${current.status}，继续轮询中...`);
        await new Promise((resolve) => {
          window.setTimeout(resolve, 800);
        });
      }

      setStatus("轮询已超时，你可以稍后继续查询这个任务。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "请求失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="consoleGrid">
      <article className="panel">
        <h3>联调控制台</h3>
        <form className="consoleForm" onSubmit={handleSubmit}>
          <label>
            <span>Provider</span>
            <select
              value={provider}
              onChange={(event) => {
                const nextProvider = event.target.value as typeof provider;
                setProvider(nextProvider);
                const firstModel = catalog.find((item) => item.provider === nextProvider);
                if (firstModel) {
                  setModel(firstModel.id.split("/")[1] ?? firstModel.label);
                  setTask(firstModel.task[0]);
                }
              }}
            >
              {providers.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label} {item.configured ? "· ready" : "· needs config"}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Model</span>
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              {visibleModels.map((item) => (
                <option key={item.id} value={item.id.split("/")[1] ?? item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Task</span>
            <select
              value={task}
              onChange={(event) =>
                setTask(event.target.value as "text_to_image" | "image_to_image" | "inpaint")
              }
            >
              <option value="text_to_image">text_to_image</option>
              <option value="image_to_image">image_to_image</option>
              <option value="inpaint">inpaint</option>
            </select>
          </label>

          <label>
            <span>Prompt</span>
            <textarea
              rows={5}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>

          <button disabled={isSubmitting} type="submit">
            <PlayCircle aria-hidden="true" size={18} />
            {isSubmitting ? "提交中..." : "创建任务"}
          </button>
        </form>
      </article>

      <article className="panel">
        <h3>任务结果</h3>
        <p className="status">{status}</p>
        {result ? (
          <div className="resultBlock">
            <pre>{JSON.stringify(result, null, 2)}</pre>
            {result.images[0] ? (
              <img alt="generation result" className="previewImage" src={result.images[0].url} />
            ) : null}
          </div>
        ) : (
          <div className="footer">API 启动后，这里会显示统一任务结果和首张预览图。</div>
        )}
      </article>
    </section>
  );
}
