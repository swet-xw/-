# Image Platform MVP

这是一个面向“多模型生图平台”的最小可扩展骨架，目标是先把统一协议、适配器、任务模型和前后端边界搭稳，再逐步接入更多供应商与自托管工作流。

## 当前能力

- 统一的生图请求结构，兼容 `text_to_image` / `image_to_image` / `inpaint`
- Provider 适配层：`mock`、`openai`、`stability`、`custom-http`
- 统一的任务状态模型：`queued / running / succeeded / failed`
- 异步任务队列：有 `REDIS_URL` 时走 `BullMQ + Redis`，没有 Redis 时自动使用本地后台执行
- 任务持久化：有 `DATABASE_URL` 时走 `PostgreSQL + Prisma`，没有数据库时自动使用内存存储
- Next.js 工作台：生图控制台、配额、成本、价格、API Key 和用量台账
- NestJS API 骨架，可直接作为网关层继续扩展
- `openai` 已实现真实文本生图调用，`custom-http` 已实现通用上游响应归一化

## 目录结构

```text
apps/
  api/          NestJS 统一网关
  web/          Next.js 控制台前端
packages/
  shared/       前后端共用类型
```

## 快速开始

开始前请确认本机已安装 Node.js 20+ 与 npm 10+。当前这个工作区环境里没有 `npm` 命令，所以依赖安装和运行校验需要在具备 Node 环境的机器上执行。

### 最快本地启动

当前工作区已经在 `.runtime/` 下准备好了本地 Node/npm。可以直接执行：

```bash
scripts/start-local.sh
```

也可以只跑构建检查：

```bash
scripts/build-local.sh
```

如果你本机有 Docker，可以不依赖本机 Node/npm，直接执行：

```bash
docker compose --profile app up dev
```

如果你本机有 Node/npm 和 Docker，也可以执行：

```bash
npm run setup:local
npm run dev
```

前端默认运行在 `http://localhost:3000`，API 默认运行在 `http://localhost:3001`。

## 发布上线

推荐按“Vercel 前端 + Render API + PostgreSQL + Redis/Key Value”的方式发布。
部署清单、生产脚本和环境变量说明见 `docs/deployment.md`。

### 分步启动

1. 安装依赖

```bash
npm install
```

2. 复制环境变量

```bash
cp .env.example .env
```

如果你想直接使用本地 Postgres 和 Redis，可以先启动基础设施：

```bash
npm run infra:up
```

然后设置：

```bash
DATABASE_URL=postgresql://image_platform:image_platform_dev@localhost:5432/image_platform?schema=public
REDIS_URL=redis://localhost:6379
GENERATION_WORKER_CONCURRENCY=3
DEV_OWNER_EMAIL=owner@example.com
DEV_MONTHLY_IMAGE_QUOTA=1000
```

推送 Prisma schema：

```bash
npm run db:generate
npm run db:push
```

如果暂时没有数据库或 Redis，可以先留空 `DATABASE_URL` 和 `REDIS_URL`，API 会自动使用内存任务存储和本进程后台执行。

3. 启动 API

```bash
npm run dev:api
```

4. 启动前端

```bash
npm run dev:web
```

## API 设计

### 创建任务

`POST /generation/tasks`

```json
{
  "provider": "mock",
  "model": "demo-cinematic-v1",
  "task": "text_to_image",
  "prompt": "a cinematic portrait of a traveler in rainy neon streets",
  "size": "1024x1024",
  "count": 1,
  "extra": {
    "stylePreset": "cinematic"
  }
}
```

### 响应

```json
{
  "id": "task_xxx",
  "status": "succeeded",
  "provider": "mock",
  "model": "demo-cinematic-v1",
  "images": [
    {
      "url": "https://placehold.co/1024x1024/png?text=demo-cinematic-v1",
      "mimeType": "image/png"
    }
  ],
  "meta": {
    "providerRequestId": "mock_xxx"
  }
}
```

## Provider 接入说明

### `openai`

- 当前已接通 `POST https://api.openai.com/v1/images/generations`
- 这版优先实现了 `text_to_image`
- 需要环境变量：`OPENAI_API_KEY`
- 当前会把上游返回的 `url` 或 `b64_json` 统一成平台结果；如果是 `b64_json`，会直接转成 data URL 返回

### `custom-http`

- 当前会把统一请求包装成：

```json
{
  "taskId": "task_xxx",
  "request": {
    "provider": "custom-http",
    "model": "your-model",
    "task": "text_to_image",
    "prompt": "..."
  }
}
```

- 支持这些常见返回格式：
  - `{ "images": [{ "url": "https://..." }] }`
  - `{ "data": [{ "b64_json": "..." }] }`
  - `{ "image": { "url": "https://..." } }`
  - `{ "url": "https://..." }`
- 可选环境变量：`CUSTOM_PROVIDER_TOKEN`，会以 `Bearer` 方式发出

### `stability`

- 当前已接通 Stable Image REST v2beta 文本生图
- 支持 `stable-image-ultra` 和 `stable-image-core` 这类模型名映射
- 需要环境变量：`STABILITY_API_KEY`

## 模型目录与配置状态

- `GET /generation/providers`：返回 provider 能力、是否已配置、接入备注
- `GET /generation/catalog`：返回建议展示的模型目录，便于前端做模型选择器和后台做可见性控制
- `catalog` 会根据当前环境变量把 `needs-config` 自动提升为 `ready`

## 运营接口

- `GET /operations/dashboard`：返回默认项目、API Key 列表、模型价格和最近用量
- `POST /operations/api-keys`：创建 API Key，返回值里的 `apiKey` 只展示一次
- `POST /generation/tasks` 支持 `x-api-key` 请求头；本地开发不传也会使用默认项目
- `DEV_API_KEY` 可配置一个固定开发密钥，适合外部脚本联调
- `DEV_MONTHLY_IMAGE_QUOTA` 控制默认项目的月图片配额

## 队列模式

- `REDIS_URL` 为空：任务创建后由 API 进程里的本地后台执行器处理，适合本地开发和快速演示
- `REDIS_URL` 有值：任务会进入 `generation` BullMQ 队列，worker 并发数由 `GENERATION_WORKER_CONCURRENCY` 控制
- 默认重试：失败任务最多尝试 3 次，使用指数退避

## 持久化模式

- `DATABASE_URL` 为空：任务状态保存在内存里，适合本地演示
- `DATABASE_URL` 有值：任务状态写入 PostgreSQL，schema 位于 `apps/api/prisma/schema.prisma`
- 当前已持久化任务状态、provider、model、prompt、输入参数、图片结果、错误信息、上游 meta、API Key、模型价格和用量台账

## 下一步建议

- 新增 `fal`、`Replicate`、`ComfyUI` provider adapter
- 把 provider、模型、价格、限流、可见性放进后台配置中心
- 增加审核、配额、重试和供应商熔断
