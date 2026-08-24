# app-starter

独立站设计与建站平台项目。

当前目标不是一次性复制 Shopify 全量能力，而是先完成一个可长期演进的建站平台工程基础：前台渲染、后台管理壳、API 服务、Page Schema、共享 Renderer、数据库模型、二次开发入口和后续电商/多语言能力预留。

> 当前日期：2026-08-20
> 当前阶段：建站 MVP 的页面管理、站点设置、Page Builder、媒体、SEO、预览令牌、发布历史、回滚、审计日志、前台 ISR 刷新链路与发布 smoke 报告已逐步落地；下一步是在真实生产 R2 / CDN 环境执行验收并归档报告。

## 1. 当前进度

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
- Prisma 已完成 `db push`，当前数据库表：
  - `Tenant`
  - `Site`
  - `Page`
  - `PageVersion`
  - `Translation`
  - `MediaAsset`
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
- 种子数据会创建默认 Tenant Admin（`admin@example.com` / `ChangeMe123!`）。
- 后台 Pages 列表、新建页面、按页面 ID 打开编辑器。
- 编辑器可保存草稿（`PUT /api/v1/pages/:id/schema`）或发布（`POST /api/v1/pages/:id/publish`）。
- 编辑器可生成短期 Preview Token，并通过前台 `/preview?token=` 渲染草稿。
- Preview Token 签发会写入只追加的 AuditLog，且不记录 token 明文。
- 页面发布和回滚会写入只追加的 AuditLog，记录 actor、tenant、page、site、slug 和版本 ID。
- 后台可通过 Audit Logs 页面或 `GET /api/v1/audit-logs` 只读查询当前 Tenant 的审计日志，入口需要 `audit:read`。
- Page Builder 已具备区块库、区块排序、属性面板、Desktop / Mobile 布局编辑、Undo / Redo。
- 媒体库已具备列表、登记外部媒体、上传目标生成、归档和 `media://` 引用解析。
- Settings 已具备默认站点名称与域名管理，并展示 MVP 默认市场、Locale、Currency、功能开关和 Analytics 配置。

### 当前还没有完成

- 生产环境 R2 凭据、CDN 域名和真实上传链路验收。
- 高还原差异检测和完整 Figma 自动导入。
- 多语言运营后台。
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

PREVIEW_TOKEN_SECRET=use-a-different-secret-value
PREVIEW_TOKEN_PREVIOUS_SECRET=
PREVIEW_TOKEN_TTL_SECONDS=3600

ANALYTICS_ENABLED=false
ANALYTICS_CONSENT_GRANTED=false
GTM_CONTAINER_ID=GTM-XXXXXXX
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
CLARITY_PROJECT_ID=xxxxxxxxxx
```

线上注意事项：

- 不要把线上 `DATABASE_URL` 写成 `localhost`。
- 不要把线上 `REDIS_URL` 写成 `localhost` 或未加密的 `redis://`；生产 smoke readiness 期望使用云端 `rediss://` Redis。
- 不要把本机 PostgreSQL 密码用于生产环境。
- 不要把生产数据库连接串提交到 Git。
- Analytics 脚本只有在 `ANALYTICS_ENABLED=true` 且 `ANALYTICS_CONSENT_GRANTED=true` 时才会加载；未接入 Consent 机制前保持关闭。
- `PREVIEW_TOKEN_TTL_SECONDS` 只接受 1 到 3600 秒，非法或更长配置会回退到 3600 秒，保持预览链接 1 小时有效。
- `STOREFRONT_REVALIDATE_SECRET` 必须是不超过 1024 字符且不包含控制字符的非空值；生产 smoke readiness 会把超长或含控制字符的值判定为不安全配置。
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
pnpm --filter @app-starter/api exec prisma generate --schema prisma/schema.prisma
```

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

当前应看到 6 张表：

```text
MediaAsset
Page
PageVersion
Site
Tenant
Translation
```

不要因为 Prisma CLI 提示有大版本更新就直接升级到 Prisma 7。当前项目锁定在 Prisma 5.x，后续升级需要单独评估。

生产环境不要直接使用 `prisma db push` 更新数据库结构。上线后应引入 Prisma Migration，并使用：

```powershell
pnpm --filter @app-starter/api exec prisma migrate deploy --schema prisma/schema.prisma
```

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
POST /api/v1/locales

GET  /api/v1/products
GET  /api/v1/orders
POST /api/v1/public/cart
POST /api/v1/public/checkout
```

说明：

- 后台页面、Localization 和商品/订单列表接口需要 `Authorization: Bearer {accessToken}`。
- `POST /api/v1/pages`、`PUT /api/v1/pages/:id/schema`、发布接口需要 `Idempotency-Key`。
- `GET /api/v1/audit-logs` 需要 `audit:read`，只返回当前登录 Tenant 的审计日志，支持按 action、actorId、targetType、targetId 过滤。
- `GET /api/v1/public/pages` 返回已发布页面摘要，用于前台 sitemap。
- `GET /api/v1/public/pages/:slug` 只返回已发布版本；未发布或不存在时返回 `NOT_FOUND`。
- `GET /api/v1/public/preview/:token` 返回短期预览 Token 对应的草稿 Schema，并显式设置 `Cache-Control: no-store`。
- 前台只渲染已发布页面；未发布或不存在的 slug 进入 404 页面。
- 当前 `cart` 和 `checkout` 会返回 `COMMERCE_DISABLED`，这是预期行为。
- 本地默认管理员：`admin@example.com` / `ChangeMe123!`（可通过 `SEED_ADMIN_EMAIL`、`SEED_ADMIN_PASSWORD` 覆盖）。

## 12. 常用验证命令

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

该脚本会登录默认管理员，先验证 `COMMERCE_ENABLED=false`、`MULTI_LOCALE_ENABLED=false` 的关闭态，生成媒体上传目标、确认媒体入库并校验 CDN URL，再保存草稿、生成 Preview Token、验证公共预览 API 与前台 `/preview?token=`，随后发布一个唯一 slug 的测试页，验证回滚、Preview Token / 页面发布 / 回滚审计日志、公共页面 API、前台 HTML、`robots.txt`、`sitemap.xml` 和 404/noindex 是否读取到同一份已发布内容并满足 SEO 发布门禁。执行账号需要 `audit:read`；设置 `SMOKE_REPORT_PATH=tmp/smoke-report.json` 可输出 JSON 验收报告。生产环境如果要强制验证 R2 Presigned URL、真实 PUT 上传和生产 CDN URL，可设置 `SMOKE_REQUIRE_R2_UPLOAD=true`；如果要把 Admin 静态托管也纳入部署验收，可设置 `SMOKE_REQUIRE_ADMIN_APP=true` 并配置 `ADMIN_URL`。生产 CDN URL 不能继续使用 `cdn.example.com` 或任何 `example` / `test` / `invalid` / 本地 / 私网 / 保留网段域名或 IP；这些会被 smoke 诊断判定为非生产可用。若只想验证发布与前台读取、暂不强制 ISR 回调，可临时设置：

`API_URL` 必须是 API origin 或精确的 `/api/v1` base，`WEB_URL` 必须是前台 origin，`ADMIN_URL` 必须是后台静态应用 origin；Smoke Runner 会在发起登录、发布或 Admin 静态页请求前拒绝嵌入账号密码、query、fragment、异常路径和非 HTTP(S) 协议。
Admin 静态页 smoke 还会校验入口 `type="module"` 脚本和已声明的 stylesheet 都解析到同一个 `ADMIN_URL` origin，且脚本返回 JavaScript、样式返回 CSS，避免生产 shell 误依赖外部域资源或漏部署样式产物。
生产 smoke 在 `NODE_ENV`、`APP_ENV` 或 `VERCEL_ENV` 为 `production` 时会拒绝文档里的本地默认管理员邮箱或密码；生产验收请显式设置非默认 `SMOKE_ADMIN_EMAIL` 和 `SMOKE_ADMIN_PASSWORD`。
`SMOKE_PAGE_SLUG`、`SMOKE_LOCALE`、`SMOKE_MARKET` 也会在创建测试页前按 Page Schema 上下文格式校验。
布尔 smoke 开关只接受 `true`/`false`、`1`/`0`、`yes`/`no`、`on`/`off`，拼写错误会直接失败。
`SMOKE_RETRY_ATTEMPTS` 必须为 1-60，`SMOKE_RETRY_DELAY_MS` 必须为 1-60000 毫秒。
`SMOKE_REPORT_PATH` 必须是 `tmp/`、`reports/`、`artifacts/` 或 `.tmp/` 下的相对 `.json` 路径，避免报告写到源码或系统目录；生产 readiness 必须设置该路径，确保验收报告可归档。
Smoke 报告 details 与失败消息会在写入报告或打印到 CLI 前脱敏 Preview Token、敏感 query、JSON 凭据字段、R2 签名参数和 Bearer Token，非 `Error` 异常也会提取 `message` 或使用稳定兜底消息；报告顶层带有 `schemaVersion` 和 `summary`，当前结构版本为 `smoke-report.v3`，便于归档脚本识别结构版本、直接读取检查数量、失败项、结构化失败详情和生产就绪结论，失败数量按失败检查条目统计，缺失名称的失败项会使用稳定占位名，落盘前会校验关键字段完整性、检查条目状态白名单、通过/失败时间、失败错误消息和摘要新鲜度；失败报告也会保留实际请求的 `storefrontRequestUrl` 与公开访问的 `storefrontUrl`，便于区分本地代理请求和生产店面域名。CLI 也会打印这份摘要并区分 Smoke 检查是否通过与生产门禁是否满足；`environment.deployment` 会标记 API / Web / Admin URL 是否仍为本地、占位域名、非 HTTPS 或异常路径；`productionReadiness` 会汇总生产上线 blocker 和 `nextActions` 操作清单，只有 API / Web / Admin、DATABASE_URL、REDIS_URL、analytics config、MVP disabled feature flags、JWT key pair、R2 / CDN、Preview Token secret、ISR revalidation 和 `SMOKE_REPORT_PATH` 归档门禁都被证明时才会返回 `productionReady=true`，CLI 也会在 smoke 通过后直接打印 blocked / ready 结论。

```powershell
$env:SMOKE_REQUIRE_REVALIDATION="false"; pnpm smoke:publish
```

当前已验证通过：

- `pnpm run predev`
- `pnpm --filter @app-starter/admin build`
- `pnpm --filter @app-starter/web build`
- `pnpm --filter @app-starter/api build`
- `pnpm --filter @app-starter/renderer build`
- `pnpm -r --if-present typecheck`
- `pnpm lint`
- `pnpm test`
- `git diff --check`

本地数据库初始化后，还需执行一次种子数据，前台和后台才能读到默认 `home` 页。

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
- 区块库、区块排序、区块属性面板、Undo / Redo。
- 媒体库列表、上传目标、外部媒体登记、归档和 `media://` 选择。
- Settings 默认站点名称、域名与 Analytics 配置展示页。
- Publish 按钮，发布结果写入 PostgreSQL。
- 启动时尝试加载已发布的 `home` 页面。
- 自定义后台模块扩展入口。

还没有：

- 生产 R2 上传链路的真实环境验收。
- 多语言运营后台。

下一阶段应优先做生产上线前的站点与部署验收：

```text
生产 R2 / CDN 配置验收
真实生产环境执行 pnpm smoke:publish 并归档 SMOKE_REPORT_PATH 报告
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

1. 在真实 R2 / CDN 环境配置 `MEDIA_CDN_BASE_URL`、R2 凭据和 CDN 域名，确认不是 `example` / `test` / `invalid` / 本地 / 私网域名，执行 `pnpm smoke:publish` 并归档 `SMOKE_REPORT_PATH`。
2. 补齐部署 Smoke Test：前台 Vercel、API 独立 Node 服务、Admin 静态托管、Redis 生产连接、环境变量清单和回滚步骤。
3. 做 Page Builder 视觉验收：Desktop / Mobile 双端检查、核心区块与设计稿差异记录、媒体解析异常态。
4. 补多语言运营后台前的最小闭环：只读 Locale / Translation 视图、非默认 Locale 关闭态提示与权限测试。
5. 保持 Commerce 关闭态，只继续完善 Products / Orders 空列表和 `COMMERCE_DISABLED` 错误分支测试；不进入真实交易。
