# app-starter

独立站设计与建站平台项目。

## 项目文档

- [设计文档](./独立站设计与建站平台开发设计文档.md)
- [Agent 执行约束](./AGENTS.md)

## 工程状态

当前处于工程脚手架阶段，已建立 pnpm monorepo、前台 Web、后台 Admin、独立 API 服务、共享 Schema / Renderer / UI 包，以及二次开发扩展目录。

## 快速开始

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm dev
```

默认端口：

- Web: http://localhost:3000
- Admin: http://localhost:5173
- API: http://localhost:4000/api/v1/health

## 目录

```text
apps/web                  # Next.js 前台
apps/admin                # React + Vite 后台
apps/figma-plugin         # Phase 3 占位
services/api              # NestJS API
packages/schema           # Page Schema、API 响应、错误码
packages/renderer         # 前后台共享 Renderer
packages/ui               # 前台核心组件
packages/design-tokens    # Design Token
packages/analytics        # dataLayer SDK
packages/admin-theme      # Ant Design 主题
packages/custom-components
packages/custom-admin
packages/extension-sdk
packages/integration-adapters
infra
docs/development
```
