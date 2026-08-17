# app-starter

独立站设计与建站平台项目。

当前目标不是一次性复制 Shopify 全量能力，而是先完成一个可长期演进的建站平台工程基础：前台渲染、后台管理壳、API 服务、Page Schema、共享 Renderer、数据库模型、二次开发入口和后续电商/多语言能力预留。

> 当前日期：2026-08-17
> 当前阶段：工程脚手架 + 本地数据库初始化完成，准备进入后台功能一期。

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

### 当前还没有完成

- 后台登录与权限系统。
- 站点管理。
- 页面列表与页面 CRUD。
- 可视化 Page Builder。
- 页面发布流程。
- 媒体库上传与 Cloudflare R2 对接。
- 数据库真实读写 API。
- 前台读取已发布页面。
- 多语言运营后台。
- 真实电商购物车、结账、支付、订单能力。

当前后台只是工程壳子，用来承载后续功能开发，不是完整后台系统。

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
- Redis：当前阶段未强制使用，后续队列/缓存启用时需要

检查版本：

```powershell
node -v
pnpm -v
```

## 6. 数据库配置

### 方案 A：使用本地 PostgreSQL 18

你当前使用的是：

```text
C:\Program Files\PostgreSQL\18
```

这是 PostgreSQL 安装目录，不是项目配置值。项目配置的是连接字符串 `DATABASE_URL`。

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

本地 PostgreSQL 示例：

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
```

如果你的 PostgreSQL 密码就是 `postgres`：

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_starter?schema=public
```

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

同步数据库表：

```powershell
pnpm --filter @app-starter/api exec prisma db push --schema prisma/schema.prisma
```

成功后应看到：

```text
Your database is now in sync with your Prisma schema.
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

## 11. 当前 API 占位接口

```text
GET  /api/v1/health
GET  /api/v1/public/config
GET  /api/v1/public/pages/:slug
GET  /api/v1/public/translations/:locale

GET  /api/v1/markets
GET  /api/v1/locales
GET  /api/v1/translations
POST /api/v1/locales

GET  /api/v1/products
GET  /api/v1/orders
POST /api/v1/public/cart
POST /api/v1/public/checkout
```

当前 `cart` 和 `checkout` 会返回 `COMMERCE_DISABLED`，这是预期行为。

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

## 13. 当前后台说明

当前后台页面只是 Phase 1 Admin Shell。

已经有：

- Ant Design 布局。
- 左侧菜单占位。
- 后台主题入口。
- 自定义后台模块扩展入口。
- 后续页面管理、媒体库、多语言、设置页的承载位置。

还没有：

- 登录。
- 用户权限。
- 数据库联动。
- 页面列表。
- 页面编辑器。
- 发布按钮。
- 媒体库。

下一阶段应优先做后台最小闭环：

```text
站点列表
页面列表
新建页面
编辑 Page Schema
预览页面
发布页面
前台读取已发布页面
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

Phase 1 后台功能一期：

1. API 接入 Prisma Service。
2. Tenant / Site 初始化种子数据。
3. 页面列表接口。
4. 页面创建接口。
5. PageVersion 保存接口。
6. 发布接口。
7. Admin 页面列表。
8. Admin 简易 Page Schema 编辑。
9. Admin 预览。
10. Web 读取已发布页面。

完成以上内容后，项目才算进入可用建站平台 MVP。
