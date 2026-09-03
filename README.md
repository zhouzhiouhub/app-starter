# app-starter

独立站设计与建站平台项目。

当前目标不是一次性复制 Shopify 全量能力，而是先完成一个可长期演进的建站平台工程基础：前台渲染、后台管理壳、API 服务、Page Schema、共享 Renderer、数据库模型、二次开发入口和后续电商/多语言能力预留。

> 状态更新时间：2026-09-02
> 当前阶段：建站 MVP 本地实现范围已落地，项目处于 MVP release verification。`pnpm project:status -- --summary` 当前结论为 `Release ready: no`，原因是 release evidence 仍待补齐：Production Smoke artifact 缺失，Page Builder Visual 还缺 12 张真实设计参考 PNG，当前 `0/12` viewport accepted。`pnpm release:requests` 已刷新本地证据请求、`artifacts/release/release-requests-manifest.json`、`artifacts/release/project-status.json`、`artifacts/release/project-status.md`、缺失参考图路径清单、参考图导出任务表、设计 handoff 包/README 和 Production Smoke dispatch 输入模板/TSV 输入表/JSON 输入清单。下一步需要补齐 `docs/visual/page-builder-references` 下的真实设计参考并完成视觉验收，最后用最新 Page Builder Visual artifact 触发生产 `Production Smoke` workflow 并归档报告。

## 1. 当前进度

### 发布门禁状态（2026-09-02）

- 本地 MVP 范围：`implemented`。
- 发布结论：`not-ready`，不能视为项目已完成或可发布。
- 生产 Smoke：缺 retained `production-smoke-report-<run_number>`、`release-preflight-<run_number>`、`release-evidence-check-<run_number>` 和 `project-status-<run_number>` artifacts。
- Page Builder Visual：fixture artifact 已完整生成，但真实设计参考图缺失，当前 `0/12` viewport accepted；首个缺失文件为 `docs/visual/page-builder-references/hero-banner-desktop.png`。
- 权威检查入口：`pnpm project:status -- --summary` 查看当前结论，`pnpm project:status -- --all-actions` 查看完整下一步命令；发布协同时可先运行 `pnpm release:requests` 一次刷新统一证据请求、`artifacts/release/release-requests-manifest.json`、`artifacts/release/project-status.json`、`artifacts/release/project-status.md`、设计参考图请求、缺失参考图路径清单、参考图导出任务表、设计 handoff 包/README、生产 Smoke 请求、dispatch 输入模板、TSV 输入表和 JSON 输入清单。
- 证据请求摘要：`pnpm smoke:request`、`pnpm release:evidence-request`、`pnpm release:requests` 和 `pnpm project:status -- --summary` 会在 Production Smoke 输入仍有 placeholder 时显示第一条缺失 input 的替换原因；`pnpm release:evidence-request` 和 `pnpm release:requests` 还会在摘要里显示第一条缺失视觉参考图、缺失原因及对应预览截图摘要。

### 已完成

- pnpm monorepo 工程结构。
- Next.js 前台应用：`apps/web`。
- React + Vite + Ant Design 后台壳：`apps/admin`。
- NestJS API 服务：`services/api`。
- Prisma + PostgreSQL 数据模型：`services/api/prisma/schema.prisma`。
- Page Schema 与默认示例页面：`packages/schema`。
- 前台/后台预览共享 Renderer：`packages/renderer`。
- 前台基础组件包：`packages/ui`。
- 设计 Token、Analytics、后台主题、扩展 SDK、集成适配器等基础包。
- 二次开发预留目录：
  - `packages/custom-components`
  - `packages/custom-admin`
  - `services/api/src/custom`
  - `apps/web/src/custom`
  - `apps/admin/src/custom`
  - `extensions/custom-apps`
  - `themes/custom`
- 本地 PostgreSQL 已成功创建 `app_starter` 数据库。
- Prisma 已完成本地 `db push`，并已提交初始 Prisma Migration 与 Commerce 预留迁移；当前数据库表：
  - `Tenant`
  - `Site`
  - `Page`
  - `PageVersion`
  - `Translation`
  - `MediaAsset`
  - `Market`
  - `Product`
  - `Variant`
  - `Price`
  - `Inventory`
  - `Order`
  - `OrderLine`
  - `Payment`
  - `WebhookEvent`
  - `User`
  - `Role`
  - `UserRole`
  - `RefreshToken`
  - `IdempotencyRecord`
  - `AuditLog`
- NestJS 已接入 Prisma Service，页面读写走 PostgreSQL，不再使用本地 JSON 文件。
- 种子数据会创建默认 Tenant / Site，以及已发布的 `home` 示例页。
- 页面管理 API：列表、创建、保存草稿、按 ID 发布。
- 前台 `GET /api/v1/public/pages/:slug` 读取已发布 `PageVersion`。
- 前台 `sitemap.xml` 和 `robots.txt` 已接入已发布页面清单。
- 页面 SEO 支持 `noIndex`，前台 metadata 会输出 robots，sitemap 会排除 noIndex 和 404 系统页。
- 前台未知路径会返回 404，并优先渲染已发布的 `404` 系统页。
- 现有后台 Publish 仍走 `POST /api/v1/admin/pages/:slug/publish`，底层已改为写入数据库。
- Admin 登录：Email + Password + JWT（Access Token + Refresh Token 轮换）。
- Refresh Token 以数据库哈希记录保存并原子轮换；检测到重放或并发轮换冲突时会撤销该用户仍有效的刷新令牌。
- 后台管理接口校验 Bearer Token 与权限 Scope，并按登录租户隔离页面数据。
- 种子数据会创建默认 Tenant Admin（`admin@example.com` / `ChangeMe123!`），并发布 Home、Privacy Policy、Terms of Service 和 404 四个 MVP 起始页面。
- 后台 Pages 列表、新建页面、按页面 ID 打开编辑器。
- 编辑器可保存草稿（`PUT /api/v1/pages/:id/schema`）或发布（`POST /api/v1/pages/:id/publish`）。
- 编辑器可生成短期 Preview Token，并通过前台 `/preview?token=` 渲染草稿。
- Preview Token 签发会写入只追加的 AuditLog，且不记录 token 明文。
- 页面发布和回滚会写入只追加的 AuditLog，记录 actor、tenant、page、site、slug 和版本 ID。
- 后台可通过 Audit Logs 页面或 `GET /api/v1/audit-logs` 只读查询当前 Tenant 的审计日志，入口需要 `audit:read`。
- Page Builder 已具备区块库、区块排序、属性面板、Desktop / Mobile 布局编辑、Undo / Redo、双端视觉布局发布前检查和核心区块视觉验收记录清单。
- 媒体库已具备列表、登记外部媒体、上传目标生成、归档和 `media://` 引用解析；Page Builder 会提示缺失或非图片媒体引用并阻断发布。
- Settings 已具备默认站点名称与域名管理，并展示 MVP 默认市场、Locale、Currency、功能开关和 Analytics 配置。
- Localization 已具备默认 Market / Locale / Translation fallback 检查视图，支持默认 `en-US` 翻译条目保存、按 ID 更新、分页列表、URL 筛选条件保留、筛选、缺失 key 分组检查、缺失 key 一键回填、缺失 key 修复队列、缺失 key 修复保存自动推进、修复队列跨刷新状态同步、长列表缺失 key 分页、缺失 key 分页页码记忆、缺失 key 分页与筛选联动提示、缺失 key 队列跨筛选恢复提示、键名补全与 context 辅助、修复进度提示、缺失 key 修复定位刷新、缺失 key 修复入口 loading / disabled 状态、保存后的成功定位提示、完成后缺失 key 刷新提示、缺失 key 批量导入草稿、缺失 key 批量草稿与当前筛选差异提示、批量草稿筛选后的定位提示、批量草稿预览后的差异定位、批量编辑模板提示、导入草稿空状态校验说明、导入草稿空结果预览保护、缺失 key 批量修复校验摘要、导入模板引导、批量导入后的列表定位、成功导入后的修复进度聚焦、批量导入成功后的多 key 跳转、导入结果按 action 筛选、导入结果批量选择和选择保留、导入结果历史保留、导入历史结果清理入口、导入历史清理确认、导入历史与修复队列键级操作提示、导入历史结果回放说明、导入历史与当前筛选定位校准、导入历史详情筛选、导入历史筛选空态操作提示、导入历史详情批量生成草稿、从导入结果生成二次修复草稿、二次修复草稿预览提示、导入预览结果批量修复草稿入口、导入 / 缺失队列状态联动、缺失队列完成态反馈、修复队列空态操作收口、批量修复完成确认、批量修复后服务端确认聚焦、批量修复历史回放定位、批量修复历史回放后的确认清理、批量修复后的历史保留策略说明、批量修复确认后的自动清理建议、批量修复成功后的草稿清空提示、异常重试提示、重复保存提示、批量导入/导出预览报告、默认 Locale 批量导入写入、Admin 导入前确认、默认 Locale 导入前最终确认摘要、导入确认后的成功 / 失败分支复盘、导入执行结果展示、导入失败行定位、导入预览问题行逐项修复提示、导入预览问题行草稿定位细节、历史修复草稿重复键清理、错误详情面板、Admin 默认 Locale JSON 下载、默认 Locale 导入 / 导出审计回看入口、导入 / 导出审计结果筛选回跳、审计回跳后的上下文提示和默认 Locale 长列表批量操作确认；非默认 Locale 会明确显示回退到 `en-US` 的关闭态，并展示 Locale 创建/更新禁用、Translation 空态和批量导入关闭态错误提示。

### 当前还没有完成

- 发布证据闭环：真实 Page Builder 设计参考图、视觉差异指标、accepted 视觉验收和生产 Production Smoke artifact 仍未归档。
- 生产环境 R2 凭据、CDN 域名和真实上传链路验收仍需通过 Production Smoke 证据证明。
- 高还原差异检测和完整 Figma 自动导入。
- 完整多语言运营后台（非默认 Locale 创建、翻译条目管理、发布和工作流）。
- 真实电商购物车、结账、支付、订单能力。

当前后台已能列出页面、创建页面，并按页面 ID 编辑 Chrome / Schema、区块内容、布局、SEO、媒体引用、保存草稿、发布和回滚。

## 2. 项目定位

本项目长期方向是独立站建站平台，后期能力成熟度希望对标 Shopify，但当前 MVP 只做建站闭环。

MVP 优先级：

1. 站点与页面管理。
2. Page Schema 存储。
3. 前后台共享 Renderer。
4. 页面预览。
5. 页面发布。
6. 前台读取发布内容。
7. 媒体、SEO、多语言接口预留。
8. 电商接口预留，但默认关闭。

当前默认边界：

```env
COMMERCE_ENABLED=false
MULTI_LOCALE_ENABLED=false
DEFAULT_MARKET=us
DEFAULT_LOCALE=en-US
DEFAULT_CURRENCY=USD
FALLBACK_LOCALE=en-US
```

运行时布尔开关只接受 `true`/`false`、`1`/`0`、`yes`/`no`、`on`/`off`，拼写错误会直接失败，避免误改 Feature Flag 和 Analytics gate 边界。
Stripe 的 `STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET` 在 MVP 可留空；如果生产 smoke 环境里配置了这些值，诊断只记录配置状态、格式安全性和 issue code，不记录密钥明文，并会拒绝测试 key、占位值、控制字符或首尾空白。

完整产品与架构约束见：

- [独立站设计与建站平台开发设计文档](./独立站设计与建站平台开发设计文档.md)
- [AGENTS.md](./AGENTS.md)

## 3. 技术栈

### 前台

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Page Schema + Renderer

前台不使用 Ant Design。

### 后台

- React
- Vite
- TypeScript
- Ant Design
- `@ant-design/icons`

后台基础 UI 统一使用 Ant Design。

### API

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis / BullMQ 预留

### 工程

- pnpm workspace
- ESLint
- TypeScript project config
- GitHub Actions CI

## 4. 目录结构

```text
apps/web                  # Next.js 前台站点
apps/admin                # React + Vite 后台
apps/figma-plugin         # Phase 3 Figma 插件占位

services/api              # NestJS API 服务
services/api/prisma       # Prisma Schema
services/api/src/custom   # 后端二次开发入口

packages/schema           # Page Schema、API 响应、错误码
packages/renderer         # 前台与 Admin Preview 共享渲染器
packages/ui               # 前台基础组件
packages/design-tokens    # 设计 Token
packages/analytics        # dataLayer SDK
packages/admin-theme      # Ant Design 后台主题
packages/custom-components # 前台自定义组件二开入口
packages/custom-admin     # 后台自定义模块二开入口
packages/extension-sdk    # 扩展 SDK 与权限 Scope 类型
packages/integration-adapters # 外部系统集成适配器

themes/custom             # 自定义主题预留
extensions/custom-apps    # 自定义扩展应用预留
infra                     # Docker / 基础设施配置
docs/development          # 开发补充文档
```

## 5. 本地环境要求

- Node.js：`>=20.18.0`
- pnpm：`>=9.0.0`
- PostgreSQL：本地已使用 PostgreSQL 18
- Redis：当前阶段未强制使用；Refresh Token 重放防护已落在 PostgreSQL，后续队列/缓存启用时需要

检查版本：

```powershell
node -v
pnpm -v
```

## 6. 数据库配置

### 本地开发与线上部署边界

本地开发数据库：

- 当前本地开发使用 PostgreSQL。
- 可以使用本机 PostgreSQL 18，也可以使用 `infra/docker-compose.yml` 里的 Docker PostgreSQL。
- 本地连接地址通常是 `localhost:5432`。
- 本地数据库名使用 `app_starter`。
- `C:\Program Files\PostgreSQL\18` 只是 PostgreSQL 安装目录，不是数据库连接地址。

线上部署数据库：

- 上线后不能继续使用本机 PostgreSQL、Docker 本地卷或 `localhost:5432`。
- 上线后必须使用云端托管数据库，并把云端连接串配置到部署平台的环境变量里。
- 生产主数据库应继续使用 PostgreSQL 类型，避免上线后更换数据库类型导致 Prisma Schema、迁移、事务和 JSON 字段行为不一致。
- 可选云端 PostgreSQL 形态包括 Neon、Supabase、AWS RDS、Google Cloud SQL、Azure Database for PostgreSQL、Railway、Render 等。
- 如果 API 部署为 Serverless 或边缘函数，需要优先使用数据库连接池地址，避免连接数被打满。
- Redis 本地开发可以用 `localhost:6379`，上线后也应换成云端托管 Redis。
- Vercel 文件系统不能作为数据库存储位置，生产数据必须放在云数据库里。

当前项目约定：

```text
本地开发：PostgreSQL 18 或 Docker PostgreSQL
线上部署：云端 PostgreSQL
本地 Redis：localhost:6379
线上 Redis：云端 Redis
本地 Prisma 同步：prisma db push
线上 Prisma 迁移：prisma migrate deploy
```

### 方案 A：使用本地 PostgreSQL 18

你当前使用的是：

```text
C:\Program Files\PostgreSQL\18
```

这是 PostgreSQL 安装目录，只用于找到 `psql.exe` 等命令行工具。项目配置里不填写这个路径，项目只填写连接字符串 `DATABASE_URL`。

确认 PostgreSQL 服务：

```powershell
Get-Service *postgres*
```

启动服务：

```powershell
Start-Service postgresql-x64-18
```

连接数据库：

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432
```

创建数据库：

```sql
CREATE DATABASE app_starter;
```

退出：

```sql
\q
```

也可以直接在 PowerShell 里创建：

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE app_starter;"
```

### 方案 B：使用 Docker PostgreSQL

如果本机没有 PostgreSQL，可以使用 Docker：

```powershell
docker compose -f infra/docker-compose.yml up -d
```

默认数据库配置：

```text
database: app_starter
user: postgres
password: postgres
port: 5432
```

## 7. 环境变量

根目录创建 `.env`：

```powershell
Copy-Item .env.example .env
```

本地开发 `.env` 示例：

```env
DATABASE_URL=postgresql://postgres:你的PostgreSQL密码@localhost:5432/app_starter?schema=public
REDIS_URL=redis://localhost:6379

COMMERCE_ENABLED=false
MULTI_LOCALE_ENABLED=false
DEFAULT_MARKET=us
DEFAULT_LOCALE=en-US
DEFAULT_CURRENCY=USD
FALLBACK_LOCALE=en-US

WEB_URL=http://localhost:3000
ADMIN_URL=http://localhost:5173
API_URL=http://localhost:4000

STOREFRONT_REVALIDATE_SECRET=local-revalidate-secret
STOREFRONT_REVALIDATE_URL=http://localhost:3000/api/revalidate
STOREFRONT_REVALIDATE_TIMEOUT_MS=5000

PREVIEW_TOKEN_SECRET=
PREVIEW_TOKEN_PREVIOUS_SECRET=
PREVIEW_TOKEN_TTL_SECONDS=3600

ANALYTICS_ENABLED=false
ANALYTICS_CONSENT_GRANTED=false
GTM_CONTAINER_ID=
GA4_MEASUREMENT_ID=
CLARITY_PROJECT_ID=

ENABLE_VISUAL_ACCEPTANCE_FIXTURE=false
```

如果你的 PostgreSQL 密码就是 `postgres`：

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_starter?schema=public
```

线上部署 `.env` 示例：

```env
DATABASE_URL=postgresql://USER:PASSWORD@CLOUD_POSTGRES_HOST:5432/app_starter?schema=public&sslmode=require
REDIS_URL=rediss://USER:PASSWORD@CLOUD_REDIS_HOST:6379

COMMERCE_ENABLED=false
MULTI_LOCALE_ENABLED=false
DEFAULT_MARKET=us
DEFAULT_LOCALE=en-US
DEFAULT_CURRENCY=USD
FALLBACK_LOCALE=en-US

WEB_URL=https://your-storefront.example.com
ADMIN_URL=https://your-admin.example.com
API_URL=https://your-api.example.com

STOREFRONT_REVALIDATE_SECRET=use-a-secret-value
STOREFRONT_REVALIDATE_URL=https://your-storefront.example.com/api/revalidate
STOREFRONT_REVALIDATE_TIMEOUT_MS=5000

PREVIEW_TOKEN_SECRET=use-a-preview-secret-at-least-32-chars
PREVIEW_TOKEN_PREVIOUS_SECRET=
PREVIEW_TOKEN_TTL_SECONDS=3600

R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=your-media-bucket
R2_REGION=auto
MEDIA_CDN_BASE_URL=https://cdn.your-storefront.example.com
MEDIA_EXTERNAL_URL_HOSTS=

ANALYTICS_ENABLED=false
ANALYTICS_CONSENT_GRANTED=false
GTM_CONTAINER_ID=GTM-XXXXXXX
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
CLARITY_PROJECT_ID=xxxxxxxxxx

ENABLE_VISUAL_ACCEPTANCE_FIXTURE=false
```

线上注意事项：

- 不要把线上 `DATABASE_URL` 写成 `localhost`，也不要带首尾空白或控制字符。
- 不要把线上 `REDIS_URL` 写成 `localhost` 或未加密的 `redis://`，也不要带首尾空白或控制字符；生产 smoke readiness 期望使用云端 `rediss://` Redis。
- 不要把本机 PostgreSQL 密码用于生产环境。
- 不要把生产数据库连接串提交到 Git。
- 生产运行时和 smoke readiness 都会拒绝带首尾空白、账号密码、query、fragment、控制字符或异常路径的 `API_URL`、`WEB_URL`、`ADMIN_URL`；`API_URL` 只允许 API origin 或精确的 `/api/v1` base，`WEB_URL` / `ADMIN_URL` 只允许 origin。
- Analytics 脚本只有在 `ANALYTICS_ENABLED=true` 且 `ANALYTICS_CONSENT_GRANTED=true` 时才会加载；未接入 Consent 机制前保持关闭。
- `ENABLE_VISUAL_ACCEPTANCE_FIXTURE` 只用于本地 Page Builder 截图验收，必须精确设置为 `true` 才会开放 `/visual-acceptance`；生产和公开环境保持 `false`。
- `GTM_CONTAINER_ID`、`GA4_MEASUREMENT_ID`、`CLARITY_PROJECT_ID` 必须精确匹配对应厂商格式、最多 64 字符，不能带首尾空白或控制字符；无效值会被运行时忽略，并被生产 smoke readiness 标记为待修复。
- R2 生产配置必须使用 DNS 安全的 `R2_ACCOUNT_ID`、3 到 63 字符的安全 bucket 名称，以及不含空白或控制字符的凭据和 region；生产 smoke readiness 会把格式错误的 R2 变量判定为 `invalid-config`。
- 生产 `PREVIEW_TOKEN_SECRET` 必须是 32 到 1024 字符、不包含控制字符且不带首尾空白的签名密钥；如果配置 `PREVIEW_TOKEN_PREVIOUS_SECRET` 做轮换，也必须满足同样边界。
- `PREVIEW_TOKEN_TTL_SECONDS` 只接受 1 到 3600 秒，非法或更长配置会回退到 3600 秒，保持预览链接 1 小时有效。
- `STOREFRONT_REVALIDATE_SECRET` 必须是不超过 1024 字符、不包含控制字符且不带首尾空白的非空值；生产 smoke readiness 会把超长、含控制字符或首尾空白的值判定为不安全配置。
- `STOREFRONT_REVALIDATE_URL` 必须是前台 origin 或精确的 `/api/revalidate` endpoint，不能带首尾空白、账号密码、query、fragment 或控制字符。
- `STOREFRONT_REVALIDATE_TIMEOUT_MS` 只接受 1 到 30000 毫秒，非法或更长配置会回退到 5000 毫秒，避免发布请求被异常超时值拖住。
- 轮换 Preview Token 密钥时，先把旧值放入 `PREVIEW_TOKEN_PREVIOUS_SECRET`，再更新 `PREVIEW_TOKEN_SECRET`；等待超过 `PREVIEW_TOKEN_TTL_SECONDS` 后再移除旧值。
- 如果数据库服务商提供 pooled connection string 和 direct connection string，API 运行时优先使用 pooled connection string，数据库迁移任务按服务商要求使用 direct connection string。

当前 Prisma CLI 会在 `services/api` 包目录下运行，因此建议同时创建：

```powershell
notepad services\api\.env
```

内容至少包含：

```env
DATABASE_URL=postgresql://postgres:你的PostgreSQL密码@localhost:5432/app_starter?schema=public
```

注意：

- `.env` 和 `services/api/.env` 不要提交到 Git。
- 不要把真实密钥、Token、Stripe Secret、R2 Secret 写入文档或提交记录。

## 8. 安装依赖

```powershell
pnpm install
```

如果已经安装过依赖，可以跳过。

## 9. 初始化 Prisma

生成 Prisma Client：

```powershell
pnpm --filter @app-starter/api run prisma:generate
```

该脚本会在生成前比较 `services/api/prisma/schema.prisma` 与已生成 Prisma Client 的 schema，并确认 query engine 文件已存在；已经一致且文件完整时会跳过，避免本地 `pnpm dev` 正在运行时反复覆盖 Windows query engine DLL。需要强制重建时运行 `pnpm --filter @app-starter/api run prisma:generate:force`。

本地开发同步数据库表：

```powershell
pnpm --filter @app-starter/api exec prisma db push --schema prisma/schema.prisma
```

成功后应看到：

```text
Your database is now in sync with your Prisma schema.
```

写入默认租户、站点和首页：

```powershell
pnpm --filter @app-starter/api run prisma:seed
```

确认表：

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -d app_starter -c "\dt"
```

当前应看到 21 张业务表：

```text
Tenant
Site
Page
PageVersion
Translation
MediaAsset
Market
Product
Variant
Price
Inventory
Order
OrderLine
Payment
WebhookEvent
User
Role
UserRole
RefreshToken
IdempotencyRecord
AuditLog
```

不要因为 Prisma CLI 提示有大版本更新就直接升级到 Prisma 7。当前项目锁定在 Prisma 5.x，后续升级需要单独评估。

生产环境不要直接使用 `prisma db push` 更新数据库结构。仓库已提交初始 Prisma Migration，生产部署应使用：

```powershell
pnpm --filter @app-starter/api exec prisma migrate deploy --schema prisma/schema.prisma
```

生产 smoke readiness 会检查 `services/api/prisma/migrations`、`migration_lock.toml` 和至少一份 `migration.sql`，避免 `DATABASE_URL` 已经指向云端但数据库结构没有可审计迁移工件。

## 10. 启动开发环境

```powershell
pnpm dev
```

`pnpm dev` 会先运行：

```powershell
node scripts/check-install.mjs
pnpm run build:api-packages
```

然后启动：

- `@app-starter/web`
- `@app-starter/admin`
- `@app-starter/api`
- `@app-starter/schema` watch
- `@app-starter/extension-sdk` watch

本地访问地址：

```text
前台 Web:   http://localhost:3000
后台 Admin: http://localhost:5173
API Health: http://localhost:4000/api/v1/health
```

后台登录请打开 Admin 页面（例如 `http://localhost:5173/login`），不要在浏览器地址栏打开 `/api/v1/auth/login`。登录接口只接受 `POST`；开发环境后台请求走 Admin 同源 `/api/v1`，由 Vite 代理到 API。

登录后打开 `http://localhost:5173/pages` 管理页面；`/pages/:id` 是 Page Builder。草稿保存和发布分别调用 `PUT /api/v1/pages/:id/schema` 与 `POST /api/v1/pages/:id/publish`。前台首页是 `/en`，新建页按 slug 访问，例如 `faq` 对应 `http://localhost:3000/en/faq`。

## 11. 当前 API 接口

```text
GET  /api/v1/health
GET  /api/v1/public/config
GET  /api/v1/public/pages
GET  /api/v1/public/pages/:slug
GET  /api/v1/public/preview/:token
GET  /api/v1/public/translations/:locale

GET  /api/v1/auth/login          # 浏览器打开时返回用法说明，真正登录请 POST
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me

GET  /api/v1/pages
POST /api/v1/pages
GET  /api/v1/pages/:id
PUT  /api/v1/pages/:id/schema
POST /api/v1/pages/:id/publish
POST /api/v1/pages/:id/rollback
POST /api/v1/admin/pages/:slug/publish

GET  /api/v1/audit-logs

GET  /api/v1/markets
GET  /api/v1/locales
GET  /api/v1/translations
POST /api/v1/translations
PATCH /api/v1/translations/:id
POST /api/v1/translations/import/preview
POST /api/v1/translations/export/preview
POST /api/v1/translations/export
POST /api/v1/translations/import
POST /api/v1/locales
PATCH /api/v1/locales/:id

GET  /api/v1/products
POST /api/v1/products
GET  /api/v1/products/:id
GET  /api/v1/products/:id/variants
GET  /api/v1/products/:id/prices
GET  /api/v1/products/:id/inventory
PATCH /api/v1/products/:id
GET  /api/v1/orders
GET  /api/v1/orders/:id
GET  /api/v1/payments
GET  /api/v1/payments/:id
GET  /api/v1/public/products/:slug
POST /api/v1/public/cart
POST /api/v1/public/checkout
POST /api/v1/webhooks/stripe
```

说明：

- 后台页面、Localization 和 Commerce 占位接口需要 `Authorization: Bearer {accessToken}`。
- `POST /api/v1/pages`、`PUT /api/v1/pages/:id/schema`、发布接口需要 `Idempotency-Key`。
- `GET /api/v1/audit-logs` 需要 `audit:read`，只返回当前登录 Tenant 的审计日志，支持按 action、actorId、targetType、targetId 过滤。
- `GET /api/v1/translations` 需要 `translation:read`，按当前登录 Tenant 读取默认 Locale 翻译条目，支持 `page` / `limit` 分页、`namespace` 前缀和 `q` 搜索筛选；响应 meta 返回 `{ total, page, limit }`，并基于当前 Tenant 页面最新草稿与已发布版本报告缺失默认 Locale 翻译 key；`MULTI_LOCALE_ENABLED=false` 时请求非默认 Locale 会回退到默认 Locale，并在 meta 标记 `isFallback=true`。
- `POST /api/v1/translations` 需要 `translation:write` 和 `Idempotency-Key`；MVP 只允许保存默认 Locale 条目，并在 meta 返回 `writeMode=created|updated`，非默认 Locale 在 `MULTI_LOCALE_ENABLED=false` 时返回 `MULTI_LOCALE_DISABLED`。
- `PATCH /api/v1/translations/:id` 需要 `translation:write` 和 `Idempotency-Key`；MVP 只允许更新当前 Tenant 下已存在的默认 Locale 条目，审计日志只记录 key、locale 和字段变化标记，不记录翻译正文。
- `POST /api/v1/locales` 需要 `locale:write`；`MULTI_LOCALE_ENABLED=false` 时返回 `MULTI_LOCALE_DISABLED`，后续打开 Feature Flag 时仍会先走 Idempotency-Key 和 Locale code 校验，再进入真实持久化阶段。
- `PATCH /api/v1/locales/:id` 需要 `locale:write`；`MULTI_LOCALE_ENABLED=false` 时返回 `MULTI_LOCALE_DISABLED` 且不回显请求体或 Locale ID，后续打开 Feature Flag 后在真实 Locale 持久化完成前返回受保护占位 `CONFLICT`。
- `POST /api/v1/translations/import/preview` 需要 `translation:write`，只做导入前校验和差异预览，按行返回 `create` / `update` / `duplicate` / `error` / `blocked` 与 summary，不写入数据。
- `POST /api/v1/translations/export/preview` 需要 `translation:read`，只返回当前筛选下的可导出数量、样例 key 和缺失 key 摘要，不生成文件。
- `POST /api/v1/translations/export` 需要 `translation:read`；MVP 返回当前 Tenant、当前筛选条件下的默认 Locale JSON 导出 payload，非默认 Locale 请求仍回退默认 Locale，审计日志只记录条目数量、筛选条件和缺失 key 数量，不记录翻译正文。
- `POST /api/v1/translations/import` 需要 `translation:write` 和 `Idempotency-Key`；MVP 只允许批量导入默认 Locale 条目，导入前复用预览契约校验重复、非法和非默认 Locale 行，审计日志只记录 create / update 数量，不记录翻译正文。
- 服务端测试会扫描 Controller，除登录 / 刷新 / 登出、Stripe Webhook、Translation preview / export 这类显式例外外，`POST` / `PUT` / `PATCH` / `DELETE` 业务写入口必须绑定并校验 `Idempotency-Key`。
- `GET /api/v1/products`、`GET /api/v1/orders` 和 `GET /api/v1/payments` 是后台 Commerce 只读占位契约，MVP 返回空列表，并在 meta 标记 `commerceEnabled`、默认 `market` / `currency`、`writable=false`、`writeDisabledCode=COMMERCE_DISABLED` 和 `reservedPhase=phase-2`。
- `POST /api/v1/products` 和 `PATCH /api/v1/products/:id` 是受保护的商品写入占位契约，需要 `product:write` 与 `Idempotency-Key`，MVP 返回 `COMMERCE_DISABLED`，并在安全 `details` 标记 `resource=product`、`action=create|update`、`writable=false`、`writeDisabledCode=COMMERCE_DISABLED` 和 `reservedPhase=phase-2`，且不回显请求体或商品 ID。
- `GET /api/v1/products/:id` 是受保护的后台商品详情占位契约，MVP 返回 `NOT_FOUND`，并在安全 `details` 标记 `resource=product`、`surface=admin`、`action=read`、`available=false`、`writable=false`、`readUnavailableCode=NOT_FOUND` 和 `reservedPhase=phase-2`，且不回显商品 ID。
- `GET /api/v1/products/:id/variants`、`GET /api/v1/products/:id/prices` 和 `GET /api/v1/products/:id/inventory` 是受保护的商品子资源只读占位契约，MVP 返回空列表和关闭态 meta，不回显商品 ID。
- `GET /api/v1/orders/:id` 和 `GET /api/v1/payments/:id` 是受保护的后台订单 / 支付详情占位契约，MVP 返回 `NOT_FOUND`，并在安全 `details` 标记 `resource=order|payment`、`surface=admin`、`action=read`、`available=false`、`writable=false`、`readUnavailableCode=NOT_FOUND` 和 `reservedPhase=phase-2`，且不回显资源 ID。
- `GET /api/v1/public/pages` 返回已发布页面摘要，用于前台 sitemap。
- `GET /api/v1/public/pages/:slug` 只返回已发布版本；未发布或不存在时返回 `NOT_FOUND`。
- `GET /api/v1/public/products/:slug` 是前台商品详情占位契约，MVP 显式返回 `NOT_FOUND`、request id 和安全 `details`，不回显商品 slug。
- `GET /api/v1/public/translations/:locale` 按公开店面域名解析 Tenant，返回对应 Tenant 的安全翻译消息包；多语言关闭时非默认 Locale 会回退默认 Locale。
- `GET /api/v1/public/preview/:token` 返回短期预览 Token 对应的草稿 Schema，并显式设置 `Cache-Control: no-store`。
- 前台只渲染已发布页面；未发布或不存在的 slug 进入 404 页面。
- 当前 `cart`、`checkout` 和 Stripe Webhook 占位路由会返回 `COMMERCE_DISABLED`，这是预期行为；前台 `cart` / `checkout` 会先要求 UUID 格式 `Idempotency-Key`，再返回关闭态响应。关闭态 `details` 会标记 `resource`、`action`、`writable=false`、`writeDisabledCode=COMMERCE_DISABLED` 和 `reservedPhase=phase-2`，但不会回显请求体、商品 ID、payload 或签名。Webhook 占位仅对 `POST /api/v1/webhooks/stripe` 捕获原始 JSON body，并识别 `stripe-signature` 是否包含可用于 Phase 2 验签的非空 `v1` 与数字 `t`，不验签、不落库、不处理事件。
- Stripe Webhook 关闭态 `details.webhookVerification` 只返回 raw body 是否捕获、byte 数、签名 timestamp / `v1` 形状和 `readyForSignatureVerification` 等安全布尔值，并固定 `signatureVerified=false`、`webhookEventPersisted=false`、`eventProcessed=false`。
- 本地默认管理员：`admin@example.com` / `ChangeMe123!`（可通过 `SEED_ADMIN_EMAIL`、`SEED_ADMIN_PASSWORD` 覆盖）；邮箱必须是有效邮箱，密码必须为 8 到 128 字符且不含控制字符，生产环境不能使用文档默认值。Seed 会幂等发布 Home、Privacy Policy、Terms of Service 和 404 四个 MVP 起始页面。

## 12. 常用验证命令

完整本地验收矩阵（安装依赖后按顺序运行，并生成 `tmp/project-status.json` 与 `tmp/project-status-handoff.md`）：

```powershell
pnpm run verify:local
```

类型检查：

```powershell
pnpm -r --if-present typecheck
```

Lint：

```powershell
pnpm lint
```

测试：

```powershell
pnpm test
```

构建：

```powershell
pnpm --filter @app-starter/admin build
pnpm --filter @app-starter/web build
pnpm --filter @app-starter/api build
pnpm --filter @app-starter/renderer build
```

发布链路 Smoke Test（需要 API、Web 已启动，并配置 Storefront ISR revalidation secret）：

```powershell
pnpm smoke:publish
```

该脚本会登录默认管理员，先验证 `COMMERCE_ENABLED=false`、`MULTI_LOCALE_ENABLED=false` 的关闭态，包括默认 Market / Locale / Translation 预留读接口、默认 Locale JSON 导出、非默认 Translation 导入关闭态、Locale 创建/更新关闭态、Products / Orders / Payments 空列表、商品子资源空列表、订单 / 支付详情 404 占位、前台商品详情 404 占位、商品写入 / 带 `Idempotency-Key` 的 cart / checkout / Stripe Webhook 的关闭态 details 和 Stripe Webhook 占位路由，再生成媒体上传目标、确认媒体入库并校验 CDN URL，保存草稿、生成 Preview Token、验证公共预览 API 与前台 `/preview?token=`，随后发布一个唯一 slug 的测试页，验证回滚、Preview Token / 页面发布 / 回滚审计日志、公共页面 API、默认 Home / Privacy Policy / Terms of Service / 404 起始页公开 API、Home / Privacy Policy / Terms of Service 前台 HTML、`robots.txt`、`sitemap.xml` 和 404/noindex 是否读取到同一份已发布内容并满足 SEO 发布门禁。执行账号需要 `audit:read`；设置 `SMOKE_REPORT_PATH=tmp/smoke-report.json` 可输出 JSON 验收报告。Stripe Webhook 在 MVP 只验证占位路由关闭态、共享 details 和敏感值不回显；raw body 与 `stripe-signature` 只作为 Phase 2 前置契约保留。Stripe 密钥在 MVP 可留空；如果配置了 `STRIPE_SECRET_KEY` 或 `STRIPE_WEBHOOK_SECRET`，生产 readiness 会验证它们不是测试 key、占位值、控制字符或首尾空白，且不会把明文写入报告。生产环境如果要强制验证 R2 Presigned URL、真实 PUT 上传和生产 CDN URL，可设置 `SMOKE_REQUIRE_R2_UPLOAD=true`；如果要把 Admin 静态托管也纳入部署验收，可设置 `SMOKE_REQUIRE_ADMIN_APP=true` 并配置 `ADMIN_URL`。生产 CDN URL 不能继续使用 `cdn.example.com` 或任何 `example` / `test` / `invalid` / 本地 / 私网 / 保留网段域名或 IP；这些会被 smoke 诊断判定为非生产可用。若只想验证发布与前台读取、暂不强制 ISR 回调，可临时设置：

`API_URL` 必须是 API origin 或精确的 `/api/v1` base，`WEB_URL` 必须是前台 origin，`ADMIN_URL` 必须是后台静态应用 origin；Smoke Runner 会在发起登录、发布或 Admin 静态页请求前拒绝首尾空白、嵌入账号密码、query、fragment、异常路径和非 HTTP(S) 协议，并且登录请求会禁用自动重定向，避免管理员凭据被错误代理或旧域名跳转带走。
前台页面、robots、sitemap 和 404 smoke 请求会禁用自动重定向；如果生产托管返回 30x，会在报告里记录脱敏后的 `Location` 并提示检查 `WEB_URL`、店面域名路由和托管 rewrite 规则。
Admin 静态页 smoke 还会校验入口 `type="module"` 脚本、`modulepreload` chunks 和已声明的 stylesheet 都解析到同一个 `ADMIN_URL` origin，且脚本/chunk 返回 JavaScript、样式返回 CSS，避免生产 shell 误依赖外部域资源或漏部署静态产物。
生产 smoke 在 `NODE_ENV`、`APP_ENV` 或 `VERCEL_ENV` 为 `production` 时会拒绝文档里的本地默认管理员邮箱或密码；生产验收请显式设置非默认 `SMOKE_ADMIN_EMAIL` 和 `SMOKE_ADMIN_PASSWORD`。Smoke 登录配置会在发起请求前校验：邮箱必须有效，密码必须为 8 到 128 字符且不含控制字符，`SMOKE_TENANT_SLUG` 必须是小写字母、数字和连字符组成且不能以连字符开头或结尾。
`SMOKE_PAGE_SLUG`、`SMOKE_LOCALE`、`SMOKE_MARKET` 也会在创建测试页前按 Page Schema 上下文格式校验。
布尔 smoke 开关只接受 `true`/`false`、`1`/`0`、`yes`/`no`、`on`/`off`，拼写错误会直接失败。
`SMOKE_RETRY_ATTEMPTS` 必须为 1-60，`SMOKE_RETRY_DELAY_MS` 必须为 1-60000 毫秒。
`SMOKE_REPORT_PATH` 必须是 `tmp/`、`reports/`、`artifacts/` 或 `.tmp/` 下的相对 `.json` 路径，避免报告写到源码或系统目录；生产 readiness 必须设置该路径，确保验收报告可归档。`pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json` 可从同一份 JSON 写出 Markdown 回看清单，输出路径同样必须留在安全归档目录内。
Smoke 报告 details 与失败消息会在写入报告或打印到 CLI 前脱敏 Preview Token、敏感 query、JSON 凭据字段、R2 签名参数和 Bearer Token，非 `Error` 异常也会提取 `message` 或使用稳定兜底消息；报告顶层带有 `schemaVersion` 和 `summary`，当前结构版本为 `smoke-report.v3`，便于归档脚本识别结构版本、直接读取检查数量、失败项、结构化失败详情和生产就绪结论，失败数量按失败检查条目统计，缺失名称的失败项会使用稳定占位名，落盘前会校验关键字段完整性、标准 ISO 开始/完成时间线、检查条目状态白名单、通过/失败时间、失败错误消息和摘要新鲜度；失败报告也会保留实际请求的 `storefrontRequestUrl` 与公开访问的 `storefrontUrl`，便于区分本地代理请求和生产店面域名。CLI 也会打印这份摘要并区分 Smoke 检查是否通过与生产门禁是否满足；`pnpm smoke:report` 会在 `tmp/`、`reports/`、`artifacts/` 和 `.tmp/` 下读取最近归档或指定报告，输出 R2 / CDN、Admin 静态托管和发布链路的 traceability 摘要、失败详情与修复建议，也可通过 `--markdown-output` 生成同内容的生产 Smoke 回看 Markdown；`pnpm smoke:release-check` 会对指定或最近归档报告做硬门禁校验，只有报告具备可信开始/完成时间线、`config.source` 里的 commit / repository / run id / workflow run URL、Smoke 全通过、生产 readiness 通过、R2 上传 / Admin 静态托管 / ISR 重验证都被强制启用，且 R2 / CDN、Admin 静态应用、发布回滚、公共页面和 SEO traceability 均具备通过证据时才会以 0 退出；`environment.deployment` 会标记 API / Web / Admin URL 是否仍为本地、占位域名、非 HTTPS 或异常路径；Identity 诊断只记录 JWT 私钥/公钥是否配置、是否能解析为 PEM、是否能完成 RS256 配对验签，不记录密钥内容；`productionReadiness` 会汇总生产上线 blocker 和 `nextActions` 操作清单，只有 API / Web / Admin、DATABASE_URL、REDIS_URL、analytics config、MVP disabled feature flags、JWT key pair、R2 / CDN、Preview Token secret、ISR revalidation 和 `SMOKE_REPORT_PATH` 归档门禁都被证明时才会返回 `productionReady=true`，CLI 也会在 smoke 通过后直接打印 blocked / ready 结论。

归档报告可直接回看：

```powershell
pnpm smoke:report
pnpm smoke:report -- --list --limit=10
pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json
pnpm smoke:report -- reports/production/smoke-report.json
pnpm smoke:release-check -- artifacts/production-smoke/smoke-report.json
pnpm smoke:dispatch
pnpm smoke:request
pnpm release:preflight
pnpm release:check
pnpm release:evidence-request
pnpm release:requests
pnpm release:check -- --checklist
pnpm release:check -- --checklist --all-visual-tasks
pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json
pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture
pnpm release:check -- --json
pnpm release:check -- --output artifacts/release/release-check.json
pnpm release:check -- --markdown-output artifacts/release/release-check.md
pnpm project:status
pnpm project:status -- --all-actions
pnpm project:status -- --require-ready
pnpm project:status -- --json
pnpm project:status -- --output artifacts/release/project-status.json
pnpm project:status -- --markdown-output artifacts/release/project-status.md
pnpm release:handoff
pnpm release:handoff -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture
pnpm release:handoff -- --require-ready
pnpm release:notes -- --release-tag v0.1.0 --workflow-run-url https://github.com/zhouzhiouhub/app-starter/actions/runs/123 --local-verification-run-url https://github.com/zhouzhiouhub/app-starter/actions/runs/122 --local-verification-artifact local-verification-122 --smoke-artifact production-smoke-report-123 --preflight-artifact release-preflight-123 --release-artifact release-evidence-check-123 --project-status artifacts/release/project-status.json --project-status-artifact project-status-123 --visual-artifact page-builder-visual-fixture-123 --storefront-url https://store.brand.com --rollback-target main@abcdef1 --output docs/releases/v0.1.0.md
```

Page Builder 核心区块视觉验收记录可单独检查：

```powershell
pnpm visual:acceptance
pnpm visual:acceptance -- --checklist
pnpm visual:acceptance -- --checklist --output reports/visual/page-builder-fixture/visual-acceptance-report.json
pnpm visual:acceptance -- --markdown-output reports/visual/page-builder-fixture/visual-acceptance-report.md
pnpm visual:acceptance -- --require-accepted
pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture
pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture
pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture --output reports/visual/page-builder-fixture/visual-artifact-check-report.json --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md
pnpm visual:capture
pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest
pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete
pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete
pnpm visual:references:request
pnpm visual:references:handoff
pnpm visual:references:check
pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete
pnpm visual:acceptance -- --require-accepted reports/visual/page-builder-fixture/page-builder-visual-acceptance.json
```

最终签收时，`designReference` 需要指向 `docs/`、`artifacts/visual/` 或 `reports/visual/` 下的图片；`previewScreenshot` 需要指向 `artifacts/visual/` 或 `reports/visual/` 下的浏览器截图。所有已接受证据路径都必须对应仓库或发布 artifact 内的非空文件；Page Builder Visual artifact 内的截图还必须是可解码 PNG，并匹配 capture 视口尺寸。

本地截图可临时设置 `ENABLE_VISUAL_ACCEPTANCE_FIXTURE=true` 并启动 Web，然后访问 `/visual-acceptance?viewport=desktop` 与 `/visual-acceptance?viewport=mobile`；需要组件级证据时追加 `&component=<hero-banner|rich-text|image-gallery|cta-bar|faq|spec-table>`，或运行 `pnpm visual:capture` 一次性刷新 manifest 引用的 12 张组件截图。也可以直接运行 `pnpm visual:capture:fixture` 完成本地 build、启动 gated fixture、截图和停服务流程。

需要生成和 CI 上传形态一致的完整 fixture artifact 包时，运行 `pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture`，它会复制 manifest、捕获 12 张截图、写出 capture report、参考图接入 JSON / Markdown、acceptance report、视觉验收 Markdown 和 artifact check JSON / Markdown，并执行 artifact check。将真实设计参考 PNG 放到 `docs/visual/page-builder-references` 前，可运行 `pnpm visual:references:request` 生成 `artifacts/visual/page-builder-reference-request.md` 交给设计侧导出，并同步写出 `artifacts/visual/page-builder-missing-references.txt` 作为一行一个路径的缺失 PNG 清单、`artifacts/visual/page-builder-reference-export-table.tsv` 作为带组件、视口、`file_name`、尺寸、目标路径和预览路径的导出任务表、`artifacts/visual/page-builder-reference-export-manifest.json` 作为机器可读导出清单；需要把请求文件和预览截图放进同一个目录交接时，可运行 `pnpm visual:references:handoff` 写出 `artifacts/visual/page-builder-reference-handoff`，其中的 handoff README 会汇总包状态、预览图和交付后命令，handoff manifest 会记录每张复制后预览截图的尺寸、字节数和 sha256，便于发现空文件、错图或旧截图；该包不生成参考图也不标记验收通过。该命令的终端摘要和 Markdown 状态行会同时记录 `First missing reference` 与对应 `First missing preview`，方便从第一张缺失 PNG 和预览尺寸开始补图。补图后可运行 `pnpm visual:references:check` 先留存参考图接入报告，再运行 `pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete` 自动写入 `designReference` 并重置旧指标。

然后运行 `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete` 写回 `visualMatchPercent`、`maxLayoutDeltaPx` 和 `maxColorDeltaE`。设计评审通过后，运行 `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete` 标记通过的 viewport 为 `accepted`。可用 `pnpm visual:acceptance -- --checklist` 查看 6 个核心区块 Desktop / Mobile 还缺哪些签收证据，也可加 `--markdown-output reports/visual/page-builder-fixture/visual-acceptance-report.md` 留存人工交接清单；checklist 会列出每个 viewport 的目标参考图路径、保留截图路径和导入/截图/测量/签收/验收命令。截图完成后关闭该环境变量，最终验收仍需真实设计参考、差异指标和最终 `pnpm visual:acceptance -- --require-accepted`。

GitHub Actions 里新增了 `Page Builder Visual` workflow，会在相关 PR、main 推送、`docs/visual/page-builder-references/**` 变更或手动触发时运行 `pnpm test:visual`，再运行 `pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture` 并上传 `page-builder-visual-fixture-<run_number>` artifact；artifact 缺失会让上传步骤失败而不是只留下 warning。该 artifact 带有 fixture 截图、带截图路径的 artifact manifest、`visual-capture-report.json` 截图清单、`visual-reference-import-report.json` / `visual-reference-import-report.md` 参考图接入清单、`visual-acceptance-report.json` 结构化验收状态、`visual-acceptance-report.md` 人工交接清单和 `visual-artifact-check-report.json` / `visual-artifact-check-report.md` 完整性检查清单；artifact check 会校验截图可解码且尺寸匹配 capture 视口，并确认参考图接入 JSON / Markdown 和视觉验收 Markdown 都已留存且绑定到 artifact-local manifest；源 manifest 不会被 CI 改写。该 artifact 只证明 fixture 截图链路可持续回归，不替代真实设计参考、差异指标和 `pnpm visual:acceptance -- --require-accepted` 最终签收。

GitHub Actions 里新增了手动触发的 `Production Smoke` workflow，会把报告写到 `artifacts/production-smoke/smoke-report.json`，同时从该 JSON 写出 `artifacts/production-smoke/smoke-report.md` 回看清单，并把本次运行的 commit、repository、run id 和 workflow run URL 写入 `config.source`；workflow 会先运行 `pnpm release:preflight -- --json-output "$RELEASE_PREFLIGHT_REPORT_PATH" --markdown-output "$RELEASE_PREFLIGHT_MARKDOWN_PATH"` 校验 Smoke 报告、组合门禁和项目状态 artifact 的安全 JSON 输出路径、Smoke / 组合门禁 / 项目状态 / 发布记录 Markdown 输出路径、上传 artifact 名称、可选 `SMOKE_STOREFRONT_HOST`、smoke 布尔开关、`SMOKE_ADMIN_EMAIL`、`SMOKE_ADMIN_PASSWORD`、`SMOKE_TENANT_SLUG`、`SMOKE_LOCALE`、`SMOKE_MARKET`、`SMOKE_PAGE_SLUG`、`SMOKE_RETRY_ATTEMPTS`、`SMOKE_RETRY_DELAY_MS`，以及可选发布证据输入，包含主 CI 的 `local_verification_run_url` 和 `local-verification-*` artifact；当 `NODE_ENV`、`APP_ENV` 或 `VERCEL_ENV` 为 `production` 时，还会在发出 smoke 请求前检查生产 API/Web/Admin URL、SMOKE_ADMIN_EMAIL、SMOKE_ADMIN_PASSWORD、DATABASE_URL、REDIS_URL、MVP 关闭态 feature flags、JWT keys、R2/CDN、Preview Token secret、ISR revalidation、`SMOKE_REPORT_PATH` 和强制 smoke gates 是否生产就绪，并把成功或失败的预检摘要（含归一化的 workflow artifact 路径与 artifact 名称，不含密钥）上传为 `release-preflight-<run_number>`。失败或成功都会执行 `pnpm smoke:report -- --markdown-output "$SMOKE_REPORT_MARKDOWN_PATH" "$SMOKE_REPORT_PATH"`、`pnpm smoke:release-check` 和 `pnpm release:handoff -- --require-ready --smoke-report "$SMOKE_REPORT_PATH" --release-check-output "$RELEASE_CHECK_ARTIFACT_PATH" --release-check-markdown "$RELEASE_CHECK_MARKDOWN_PATH" --project-status-output "$PROJECT_STATUS_ARTIFACT_PATH" --project-status-markdown "$PROJECT_STATUS_MARKDOWN_PATH"`，用同一次 release gate 读取结果写出 release evidence 与 project status 的 JSON/Markdown 交接包，并上传 `production-smoke-report-<run_number>`、`release-preflight-<run_number>`、`release-evidence-check-<run_number>` 与 `project-status-<run_number>` artifact，关键证据文件缺失时上传步骤会失败；当填写 `visual_artifact_name` 和 `visual_artifact_run_id` 时，会先把 Page Builder Visual artifact 下载到 `reports/visual/page-builder-fixture`，运行 `pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture --output reports/visual/page-builder-fixture/visual-artifact-check-report.json --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md`，再给 `release:handoff` 追加 `--visual-artifact-dir reports/visual/page-builder-fixture`，让 `release-evidence-check.v1` 记录 artifact 完整性和 `smoke.source`，让 `project-status.v1` 记录完整 next actions；当填写 `release_tag`、`rollback_target`、`local_verification_run_url`、`local_verification_artifact_name`、`visual_artifact_name` 和 `visual_artifact_run_id` 时，还会把生成的 preflight、project status artifact 名称和主 CI 本地验收 artifact 信息传给 `pnpm release:notes` 并上传 `release-notes-<run_number>` artifact。`allow_blocked_release_notes` 默认关闭，正式发布仍要求 ready evidence；仅在失败复盘时打开它，生成带 blocker 的 `--allow-blocked` 草稿。发布证据按 [Release Checklist](./docs/development/release-checklist.md) 留存。

最终发布前可运行 `pnpm project:status` 获取“当前阶段、完成度摘要、完成度清单、已完成里程碑、本地验证矩阵、release gate 和下一步动作”的项目状态摘要；默认只展示前 8 个 next actions，交接排期时加 `--all-actions` 展开全部动作并保留完整命令行，视觉任务会在 Preview 步骤旁显示目标截图尺寸；需要机器可读状态时加 `--json`，需要可贴进发布工单的交接清单时加 `--markdown-output artifacts/release/project-status.md`，Markdown 会同时列出 `completionChecklist`、生产 Smoke、Smoke preflight、Page Builder Visual、视觉参考图接入、视觉 artifact check、release check、project status 和 release notes 的推荐归档路径与刷新命令；需要把它当完成度门禁时加 `--require-ready`。当默认 Page Builder Visual artifact 已完整存在时，project status 会在 release gate 摘要中显示 `artifact complete` 及 artifact 路径、文件/截图计数；如果已有测量指标低于阈值，还会显示失败 viewport/指标计数和首个失败指标，并在 JSON 中记录 `releaseGate.visual.failedMeasurementCount`、`releaseGate.visual.failedMeasurementViewportCount`、`releaseGate.visual.firstFailedMeasurement` 与 `releaseGate.visual.artifactCheck`；`completionChecklist.items[].nextSteps` 会把未完成证据项对应的 structured steps 一并保留。主 CI 在 `check:file-size`、`typecheck`、`lint`、`test` 和 `build` 全部通过后，会生成 `tmp/project-status.json` 与 `tmp/project-status-handoff.md`，并上传 `local-verification-<run_number>` artifact，作为本地验收矩阵已通过的交接证据；`project-status.v1` 的 `localVerification` 会同步记录 `pnpm run verify:local` 快捷命令和这两个 handoff 输出路径；它不替代生产 Smoke。当 release gate 已 ready 时，project status 的下一步会把最终 `pnpm release:notes` 命令、evidence args、review args、输入证据、`docs/releases/<tag>.md` 输出、`release-notes-<run_number>` artifact 和正式发布禁止 `--allow-blocked` 的要求展开成 structured steps。也可运行 `pnpm release:check -- --checklist --smoke-report artifacts/production-smoke/smoke-report.json` 查看生产 Smoke、Page Builder 视觉证据和 release notes 的准备状态；checklist 默认显示前几个视觉 viewport 的目标证据路径、预览截图尺寸和导入/截图/测量/签收/验收命令，发布评审需要完整清单和完整命令行时加 `--all-visual-tasks`。如果使用下载下来的 Page Builder Visual artifact，再追加 `--visual-artifact-dir reports/visual/page-builder-fixture`。去掉 `--checklist` 后同一命令可作为统一门禁，它会同时校验生产 Smoke 发布证据、Page Builder 视觉 accepted 证据，以及可选视觉 artifact 的本地 manifest、capture report、acceptance report、参考图接入 JSON / Markdown、视觉验收 Markdown 和 12 张可解码且尺寸匹配的截图；普通文本摘要和 `readinessChecklist` 视觉条目都会显示视觉测量失败计数、首个失败指标、visual artifact 路径、文件/截图计数，ready 时还会打印最终 release notes handoff steps。需要归档时追加 `--json` 输出机器可读结果，或追加 `--output artifacts/release/release-check.json` 写入 `release-evidence-check.v1` JSON artifact；追加 `--markdown-output artifacts/release/release-check.md` 会同步写出可读的组合门禁报告；artifact 内含结构化 `readinessChecklist`、`smoke.source`、`visual.failedMeasurementCount`、`visual.failedMeasurementViewportCount`、`visual.firstFailedMeasurement`、`visual.checklist.pendingTasks` 和可选 `visual.artifactCheck`，可直接归档 blocked / ready 任务。当前缺真实设计参考和生产 smoke artifact 时，该命令会阻塞发布。

Page Builder Visual artifact check 还会要求 `visual-reference-import-report.json` 与 `visual-reference-import-report.md` 同时保留，并校验 JSON schema、artifact-local manifest 路径、默认参考图目录、`sourceDirStatus`、状态、missing/update 计数、MVP 组件/视口、重复项、`missing[].expectedPath`、`updates[].designReference`、`requiredReferenceCount` / `requiredReferences[]` 完整交接清单和 Markdown 的 12 项 `Required Source Files` 清单一致；运行时可追加 `--output reports/visual/page-builder-fixture/visual-artifact-check-report.json` 留存机器可读完整性检查结果。

`visual-reference-import-report.json` 会保留 `requiredReferenceCount` 和完整的 `requiredReferences[]` 交接清单，逐项列出 12 个 Page Builder 组件/视口源 PNG 的目标路径、状态、预览截图路径和解码后的 PNG 尺寸；`visual-reference-import-report.md` 会在 `Required Source Files` 小节显示同一套人工可读清单，并标记 `missing`、`ready`、`would-update` 或 `updated` 状态，方便补齐真实设计参考图时逐项核对。

`pnpm smoke:request` 会写出 `artifacts/production-smoke/production-smoke-request.md`、`artifacts/production-smoke/production-smoke-dispatch-inputs.txt`、`artifacts/production-smoke/production-smoke-dispatch-inputs.tsv` 和 `artifacts/production-smoke/production-smoke-dispatch-inputs.json`，把 Production Smoke 手动触发入口、待替换的 workflow_dispatch 输入、每个证据输入的来源、`Missing inputs` 状态、`First missing input` 替换原因、`pnpm smoke:dispatch -- --inputs-json artifacts/production-smoke/production-smoke-dispatch-inputs.json --require-complete` 校验命令、`gh workflow run` 模板和必须归档的 artifact 放进同一份生产验收请求，并把 workflow_dispatch 输入另存为一行一个 `name=value` 的文本模板、带来源、`missing_reason`、`release_evidence_required` / `workflow_required` 必填状态的 TSV 输入表和保留 `releaseEvidenceRequired` / placeholder `missingReason` 的机器可读 JSON 输入清单；JSON 清单保留 `workflowFile`、`ref` 和 `dispatchManifestContext`，其中 `dispatchManifestContext.inheritedFields` 标明 `workflowFile` / `ref` / `inputs` 会被 `--inputs-json` 继承，`dispatchManifestContext.overridePolicy` 标明显式 CLI 参数仍可覆盖 manifest 值；填完 JSON 后可直接用 `--inputs-json` 继承 manifest 中的 `workflowFile`、`ref` 和输入值，校验并生成最终 dispatch 命令；它不运行 smoke，也不替代真实生产证据。

`pnpm release:evidence-request` 会写出 `artifacts/release/release-evidence-request.md`，把当前 release gate 快照、`artifacts/release/release-requests-manifest.json` 路径、Project Status handoff 命令和 JSON/Markdown 路径、Page Builder 设计参考图导出请求、参考图导出任务表路径、参考图导出 JSON manifest 路径、设计 handoff 包/README 路径、Production Smoke 请求、dispatch 输入模板路径、dispatch 输入 TSV 表路径、dispatch 输入 JSON 清单路径、`First missing visual reference`、`First missing visual preview`、`Missing Production Smoke inputs`、`First missing Production Smoke input` 替换原因、缺失证据清单和最终 `release:handoff -- --require-ready` 门禁放在同一份发布证据交接里；如果请求包写到自定义位置，传 `--requests-manifest-output <path>`、`--project-status-output <path>`、`--project-status-markdown <path>`、`--visual-output <path>`、`--visual-missing-output <path>`、`--visual-table-output <path>`、`--visual-json-output <path>`、`--visual-handoff-output <dir>`、`--smoke-output <path>`、`--smoke-inputs-output <path>`、`--smoke-inputs-table-output <path>` 和 `--smoke-inputs-json-output <path>` 可让总交接里的刷新命令、输出摘要和嵌入请求路径保持一致。它只用于协调设计侧和发布执行侧，不导入参考图、不运行 smoke、不生成发布记录，也不把 blocked 状态标记为 ready。

`pnpm release:requests` 会一次刷新本地证据请求和辅助清单：`artifacts/release/release-evidence-request.md`、`artifacts/release/release-requests-manifest.json`、`artifacts/release/project-status.json`、`artifacts/release/project-status.md`、`artifacts/visual/page-builder-reference-request.md`、`artifacts/visual/page-builder-missing-references.txt`、`artifacts/visual/page-builder-reference-export-table.tsv`、`artifacts/visual/page-builder-reference-export-manifest.json`、`artifacts/visual/page-builder-reference-handoff`、`artifacts/visual/page-builder-reference-handoff/README.md`、`artifacts/production-smoke/production-smoke-request.md`、`artifacts/production-smoke/production-smoke-dispatch-inputs.txt`、`artifacts/production-smoke/production-smoke-dispatch-inputs.tsv` 和 `artifacts/production-smoke/production-smoke-dispatch-inputs.json`；bundle manifest 会记录 release gate 状态、`projectCompletion.completionChecklist`、`projectCompletion.completionChecklist.items[].nextSteps`、`projectCompletion.nextActionPreview`、`projectCompletion.projectStatusHandoff`、完整缺失视觉参考路径清单、`pageBuilderVisual.firstMissingReferenceReason`、首张缺失图预览截图摘要、视觉测量失败计数和首个失败指标、视觉参考图接入命令、设计 handoff README 路径、Production Smoke 缺失输入、workflow inputs、input sources、required evidence、`productionSmoke.inputs[].releaseEvidenceRequired`、`productionSmoke.inputs[].missingReason`、dispatch template、`productionSmoke.workflowFile`、`productionSmoke.ref`、`productionSmoke.dispatchManifestContext` 和 `--inputs-json` 校验命令，并在写入前校验 schemaVersion、ready 状态和关键计数自洽。终端摘要会打印 `Project completion`、release decision、release evidence 状态、next action preview 计数、Project Status handoff Markdown 路径、视觉测量失败摘要、首张缺失视觉参考图、缺失原因及其预览摘要和第一条 next action，便于发布执行者不用打开 JSON 也能看到当前卡点。它接受和单独请求命令一致的视觉 manifest/source 参数、`--requests-manifest-output <path>`、`--project-status-output <path>`、`--project-status-markdown <path>`、`--visual-handoff-output <dir>` 以及 Production Smoke 证据输入，但仍不导入参考图、不运行 smoke、不上传 artifact、不生成发布记录，也不把 blocked 状态标记为 ready。

`release-check.md` 和 `project-status.md` 在缺生产 Smoke 时都会新增 `Missing Production Smoke Evidence` 小节，列出 `pnpm smoke:request` 请求命令、dispatch 输入模板输出、dispatch 输入 TSV 表输出、dispatch 输入 JSON 清单输出、`pnpm smoke:dispatch` 校验命令、`gh` dispatch template、手动触发入口、workflow、Smoke JSON / Markdown、preflight、release evidence 和 project status artifact，并在 `Production Smoke Dispatch Input Replacements` 小节列出每个 placeholder 的替换原因，在 `Production Smoke Workflow Inputs` 小节列出 `workflow_dispatch` 需要填写的输入名、默认值和用途，在 `Production Smoke Evidence Input Sources` 小节列出 visual artifact、主 CI 本地验收、release tag、rollback target 和 storefront URL 应从哪里取；blocked JSON 同步在 `smoke.missingEvidence` 和 `releaseGate.smoke.missingEvidence` 保留 `requiredEvidence[]` / `dispatchInputs[]` / placeholder `missingReason` / `workflowInputs[]` / `releaseEvidenceRequired` / `inputSources[]` 机器可读清单；`visual.artifactCheck.referenceImport.missingReferences` 会保留缺失参考图路径清单，并同步保留 `requiredReferenceCount`、`requiredReferenceEntryCount`、`requiredReferenceStatusCounts`、首张缺失图原因和预览摘要；终端摘要预览第一条缺失路径、缺失原因和对应预览图，`release-check.md` 和 `project-status.md` 在缺图时都会新增 `Missing Visual References` 小节，Markdown 报告列出可读路径、首张缺失图原因、预览和 required source reference 可用数，并在 `Visual Reference Intake Commands` 小节给出 design request、reference report、import、capture、measure、accept 和 verify 命令，完整明细仍以 `visual-reference-import-report.json` 为准。

需要一次性生成本地交接包时，可运行 `pnpm release:handoff -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture`。它会从同一次 handoff 运行写出 `artifacts/release/preflight.json`、`artifacts/release/preflight.md`、`artifacts/release/release-check.json`、`artifacts/release/release-check.md`、`artifacts/release/project-status.json` 和 `artifacts/release/project-status.md`；终端摘要会先打印 Production Smoke、Page Builder Visual 和 Visual artifact 状态、路径和计数；当 visual artifact 带 reference import 结果时，同一行还会显示 reference-import 状态、missing/update 计数、required source reference 可用数、first missing reference path、first missing reason 和对应 first missing preview。然后打印 first two next actions，并在可用时直接展开它们的 structured steps，缺 Production Smoke 时会同时给出 `pnpm smoke:request` 请求命令、dispatch 输入模板输出、dispatch 输入 TSV 表输出、dispatch 输入 JSON 清单输出、`pnpm smoke:dispatch` 校验命令、`gh` dispatch template 和手动触发入口；如果前两条没有 steps，才预览第一条隐藏的 structured next action，并把剩余动作指向 `artifacts/release/project-status.md` 的完整清单；证据 blocked 时仍会写出交接材料，只有 release evidence 与 preflight 都 ready 时，加 `--require-ready` 才会放行。

组合门禁 ready 后，可运行 `pnpm release:notes` 生成最终发布记录 Markdown；命令会强制填写 release tag、workflow run URL、主 CI 本地验收 run URL、`local-verification-*` artifact、Production Smoke / preflight / release evidence / project status / visual artifact 名称、公开 storefront URL 和 rollback target。默认读取 `artifacts/release/release-check.json` 和 `artifacts/release/project-status.json`，只有 `release-evidence-check.v1` 为 ready 且 `project-status.v1` 的 ready 状态和门禁摘要一致时才生成正式发布记录；发布记录会同步写出 `readinessChecklist`、`completionChecklist` / `Project Completion Checklist`、主 CI 本地验收 run 与 artifact、production smoke source、preflight artifact、project status artifact 和 project status source，如果组合门禁记录了 `visual.artifactCheck`，还会写出视觉 artifact 的路径、完整性、文件数、截图数和 artifact issue 摘要。失败复盘模式 `--allow-blocked` 还会把 `Missing Production Smoke Evidence`、`Missing Visual References`、`Project Completion Checklist`、`Project Next Actions` 和 `visual.checklist.pendingTasks` 摘要写入 Markdown，保留待补证据路径和命令。

当 `release-evidence-check.v1` 记录了 `smoke.source` 时，`pnpm release:notes` 还会校验 `--workflow-run-url` 匹配 `smoke.source.workflowRunUrl`，并校验 `--smoke-artifact`、`--preflight-artifact` 与 `--project-status-artifact` 分别匹配 `production-smoke-report-<runNumber>`、`release-preflight-<runNumber>` 和 `project-status-<runNumber>`，避免发布记录指向错误的 Actions run 或证据 artifact。主 CI 本地验收 run URL 独立记录，`--local-verification-artifact` 必须使用 `local-verification-<run_number>` 命名。

```powershell
$env:SMOKE_REQUIRE_REVALIDATION="false"; pnpm smoke:publish
```

当前已验证通过：

- `pnpm run verify:local`
- `pnpm run predev`
- `pnpm --filter @app-starter/admin build`
- `pnpm --filter @app-starter/web build`
- `pnpm --filter @app-starter/api build`
- `pnpm --filter @app-starter/renderer build`
- `pnpm -r --if-present typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:release`
- `pnpm visual:acceptance`
- `git diff --check`

本地数据库初始化后，还需执行一次种子数据，前台和后台才能读到默认 `home` 页。

需要快速判断项目是否可发布时，可运行 `pnpm project:status -- --summary`。它只打印阶段、ready 结论、Production Smoke、Page Builder Visual、blocker 数和前三条下一步，其中第三条给出 `pnpm release:requests` 本地请求包刷新入口；完整交接、全部命令和可归档 Markdown 仍使用 `pnpm project:status`、`--all-actions` 或 `--markdown-output`。

补 Page Builder 视觉参考图时，默认目录是 `docs/visual/page-builder-references`；直接运行 `pnpm visual:references` 会读取该目录，只有检查其他归档目录时才需要显式传 `--source-dir`。使用 `pnpm --silent visual:references:missing` 可以一行一个路径打印当前缺失的参考 PNG；使用 `pnpm visual:references:request` 可以生成带预览截图路径和后续命令的 Markdown 导出请求，并同步写出 `artifacts/visual/page-builder-missing-references.txt`、`artifacts/visual/page-builder-reference-export-table.tsv` 与 `artifacts/visual/page-builder-reference-export-manifest.json`，同时在终端和 Markdown 中打印 `First missing reference` 与可用的 `First missing preview`；使用 `pnpm visual:references:handoff` 可以把请求文件、导出清单和复制后的预览截图整理到 `artifacts/visual/page-builder-reference-handoff`，其中 handoff README 给设计侧一眼可读的包状态、预览图和交付后命令，manifest 保留复制后预览图的尺寸、字节数和 sha256，仅用于设计导出协作；使用 `pnpm visual:references:check` 可按 release fixture 默认路径写出 JSON / Markdown 接入清单并要求 12 张参考图齐全。

## 13. 当前后台说明

当前后台仍是早期 Page Builder 原型，不是完整运营后台。

已经有：

- Ant Design 布局。
- Admin 登录页与 JWT 会话。
- 页面 Chrome 编辑、Desktop / Mobile 预览。
- 页面列表、新建页面、保存草稿、发布和回滚。
- 短期 Preview Token 与前台 `/preview?token=` 草稿预览。
- Preview Token 签发审计日志。
- 页面发布 / 回滚审计日志。
- Audit Logs 后台页面、审计日志只读查询 API 与 `audit:read` 权限。
- 区块库、区块排序、区块属性面板、Undo / Redo，Desktop / Mobile 画布溢出、左侧裁切和纵向压缩风险发布前检查，以及核心区块视觉验收记录清单 / CLI。
- 媒体库列表、上传目标、外部媒体登记、归档、`media://` 选择，以及 Page Builder 缺失 / 非图片媒体引用异常态。
- 生产 smoke 报告 `SMOKE_REPORT_PATH` 归档、`smoke-report.v3` 摘要、失败详情脱敏、`pnpm smoke:report` 最近归档 / 指定报告回看入口、Smoke Markdown 回看清单、`pnpm smoke:release-check` 发布证据强校验，以及 GitHub Actions `Production Smoke` artifact 留存、Release Checklist 和 `infra/README.md` 生产部署 / 回滚 runbook 与环境变量矩阵。
- Localization 默认 Market / Locale / Translation fallback 视图、默认 Locale 翻译保存、按 ID 更新、分页列表、URL 筛选保留、列表筛选、缺失 key 分组检查、缺失 key 一键回填、缺失 key 修复队列、缺失 key 修复保存自动推进、修复队列跨刷新状态同步、长列表缺失 key 分页、缺失 key 分页页码记忆、缺失 key 分页与筛选联动提示、缺失 key 队列跨筛选恢复提示、键名补全与 context 辅助、修复进度提示、缺失 key 修复定位刷新、缺失 key 修复入口 loading / disabled 状态、保存后的成功定位提示、完成后缺失 key 刷新提示、缺失 key 批量导入草稿、缺失 key 批量草稿与当前筛选差异提示、批量编辑模板提示、导入草稿空状态校验说明、导入草稿空结果预览保护、缺失 key 批量修复校验摘要、导入模板引导、批量导入后的列表定位、成功导入后的修复进度聚焦、批量导入成功后的多 key 跳转、导入结果按 action 筛选、导入结果批量选择和选择保留、导入结果历史保留、导入历史结果清理入口、导入历史结果回放说明、导入历史详情筛选、导入历史筛选空态操作提示、导入历史详情批量生成草稿、从导入结果生成二次修复草稿、二次修复草稿预览提示、导入预览问题行逐项修复提示、导入预览问题行草稿定位细节、历史修复草稿重复键清理、导入 / 缺失队列状态联动、缺失队列完成态反馈、批量修复完成确认、批量修复后服务端确认聚焦、批量修复历史回放定位、批量修复历史回放后的确认清理、批量修复后的历史保留策略说明、批量修复确认后的自动清理建议、批量修复成功后的草稿清空提示、异常重试提示、重复保存提示、写入关闭态、Translation 空态、批量导入/导出预览报告、默认 Locale 批量导入写入、Admin 导入执行结果展示、Admin 默认 Locale JSON 下载、默认 Locale 导入 / 导出审计回看入口、导入 / 导出审计结果筛选回跳、审计回跳后的上下文提示和默认 Locale 长列表批量操作确认。
- Commerce 已补齐 Product / Variant / Price / Inventory / Order / Payment / WebhookEvent 数据库预留迁移；Products / Orders / Payments 只读空列表占位响应 meta 会明确关闭态、默认市场/币种、不可写和 Phase 2 预留；后台商品创建/更新、前台 cart / checkout 与 Stripe Webhook 写入关闭态会返回共享 Schema 定义的安全 details，其中前台 cart / checkout 会先校验 UUID 格式 `Idempotency-Key`；后台商品详情、订单 / 支付详情和前台商品详情 404 占位也会返回共享 Schema 定义的安全 reserved details；商品子资源、Stripe 可选密钥安全诊断和 Stripe Webhook raw body / 可验签签名形状预留均为显式占位。
- Settings 默认站点名称、域名与 Analytics 配置展示页。
- Publish 按钮，发布结果写入 PostgreSQL。
- 启动时尝试加载已发布的 `home` 页面。
- 自定义后台模块扩展入口。

还没有：

- 发布 ready 所需的真实 Page Builder 设计参考图、accepted 视觉验收和 Production Smoke release evidence。
- 生产 R2 上传链路的真实环境验收。
- 完整多语言运营后台（非默认 Locale 创建、翻译条目管理、发布和工作流）。

下一阶段应优先补齐 release evidence：

```text
补齐 docs/visual/page-builder-references 下的 12 张真实设计参考 PNG
运行 Page Builder Visual 验收命令并保留 page-builder-visual-fixture-<run_number> artifact
用最新视觉 artifact 触发 Production Smoke workflow 并归档 release evidence
```

## 14. 二次开发规则

优先使用预留扩展点，不要直接修改核心模块。

推荐顺序：

1. 配置。
2. Theme / Template。
3. `packages/custom-components`。
4. `packages/custom-admin`。
5. `packages/integration-adapters`。
6. `services/api/src/custom`。
7. 核心 Fork。

二次开发不要绕过：

- Tenant 隔离。
- RBAC 权限。
- Publish 流程。
- Payment / Order 安全边界。
- Page Schema 版本治理。
- API Contract。

## 15. 下一阶段计划

优先做上线前验收和生产化收口：

1. 先运行 `pnpm release:requests` 一次刷新统一发布证据交接、`artifacts/release/release-requests-manifest.json`、`artifacts/release/project-status.json`、`artifacts/release/project-status.md`、设计参考图请求、缺失参考图路径清单、参考图导出任务表、设计 handoff 包/README、生产 Smoke 请求、dispatch 输入模板、TSV 输入表和 JSON 输入清单，再从批准的设计源导出 12 张真实 Page Builder 参考 PNG，放入 `docs/visual/page-builder-references`；需要单独的设计交接清单时运行 `pnpm visual:references:request`、`pnpm visual:references:handoff` 或 `pnpm --silent visual:references:missing`，然后运行 `pnpm visual:references:check` 和 `pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete`。
2. 做 Page Builder 视觉验收：保留最新 `Page Builder Visual` workflow 的 `page-builder-visual-fixture-<run_number>` artifact，补真实浏览器截图留档，在 `reports/visual/page-builder-fixture/page-builder-visual-acceptance.json` 中写入差异指标，并用 `pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete` 将六个核心区块的 Desktop / Mobile 证据从 `needs-evidence` 推进到 `accepted`。
3. 在真实 R2 / CDN 环境配置 `MEDIA_CDN_BASE_URL`、R2 凭据和 CDN 域名，确认不是 `example` / `test` / `invalid` / 本地 / 私网域名，并按 `infra/README.md` 准备前台 Vercel、API 独立 Node 服务、Admin 静态托管、Redis 生产连接、环境变量清单和回滚步骤。
4. 运行 `pnpm smoke:request` 生成生产验收请求 Markdown、workflow_dispatch 输入模板、含 `missing_reason` / `release_evidence_required` / `workflow_required` 的 TSV 输入表和含 `releaseEvidenceRequired` / placeholder `missingReason` 的 JSON 输入清单，替换 `artifacts/production-smoke/production-smoke-dispatch-inputs.json` 里的占位值，并检查其中的 `dispatchManifestContext` 是否仍声明 `workflowFile`、`ref`、`inputs` 会被继承；再运行 `pnpm smoke:dispatch -- --inputs-json artifacts/production-smoke/production-smoke-dispatch-inputs.json --require-complete` 继承 JSON 里的 `workflowFile`、`ref` 和输入值，生成并校验 Production Smoke dispatch 命令，确认没有 `<...>` 占位值后，在真实生产配置下触发 GitHub Actions `Production Smoke`，传入主 CI `local_verification_run_url` / `local_verification_artifact_name`、Page Builder Visual artifact 名称和 run id，把 smoke、preflight、Smoke Markdown 回看清单、release evidence JSON / Markdown、project status、本地验收和 visual artifact、`pnpm smoke:report` 输出、`pnpm smoke:release-check`、带 `--visual-artifact-dir` 的 `pnpm release:handoff -- --require-ready` 结果和回滚目标写入 `pnpm release:notes` 生成的发布记录。
5. 保持 Commerce 关闭态，继续强化订单 / 支付关闭态分支和 Phase 2 Webhook 验签设计；不进入真实交易。
