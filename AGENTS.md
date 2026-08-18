# AGENTS.md

本文件是本仓库后续由 Agent 或开发者执行实现、重构、审查时的项目约束。所有实现必须以 [独立站设计与建站平台开发设计文档.md](./独立站设计与建站平台开发设计文档.md) 为主设计来源；当本文与设计文档冲突时，先暂停并更新设计决策，不要直接扩大实现范围。

## 1. 当前产品边界

### 1.1 MVP 做什么

- 建站优先：完成页面管理、Page Builder、预览、发布、媒体、SEO 和生产部署闭环。
- 页面范围：Landing / 首页 / 活动页、隐私政策、服务条款、404。
- 核心组件：Hero、RichText、ImageGallery、CTA、FAQ、SpecTable。
- 视觉还原：核心区块基于已有 Figma 或其他设计稿达到约 95% 视觉还原。
- 双端适配：Desktop / Mobile 独立配置，不用单套响应式规则强行压缩。
- 部署：前台优先 Vercel，媒体 Cloudflare R2，API 为独立 Node.js 服务。
- 首期市场：海外英语 / 美元，默认 Market=`us`、Locale=`en-US`、Currency=`USD`。
- 电商：MVP 只做接口级预留，不开放完整交易闭环。
- 多语言：MVP 只启用默认 `en-US`，但 Market / Locale / Translation 做接口级预留。

### 1.2 MVP 不做什么

- 不自建完整 Figma / Webflow 式自由设计工具。
- 不实现完整 Figma Plugin 自动导入，放到 Phase 3。
- 不开放前台购物车、结账、支付和订单履约。
- 不接入真实 Stripe 支付流程，除非明确进入 Phase 2 并更新设计文档。
- 不做 Marketplace、多商户入驻、复杂 ERP / WMS 深度集成、原生 App。
- 不首发多市场同步上线，只保留可扩展模型。
- 不因为“长期达到 Shopify 级能力”而扩大 MVP；Shopify 级目标只能按设计文档 Phase 6+ 逐步实现。

### 1.3 长期 Shopify 级目标边界

- Shopify 级目标指能力成熟度对标，不代表兼容 Shopify API、Liquid Theme、Checkout Extension API 或 App Store。
- 任何 Theme Package、Checkout 扩展、Markets 完整运营、App / Extension Platform 的实现都必须先进入对应 Phase，并更新设计文档。
- 后续实现应优先做自有 Page Schema、Theme System、API Scope 和 Extension Slot，不引入 Shopify 运行时依赖。
- 对标 Shopify 官方能力时，只提取主题、结账、多市场、多语言、Webhook、App 扩展等抽象能力，不复制其界面、协议或商业生态。
- 启动长期平台化能力前，必须阅读设计文档第 32-37 章：领域边界、Theme System、API Contract、二次开发兼容、数据迁移、测试发布治理。

## 2. 技术边界

### 2.1 Monorepo 结构

目标结构如下，新增代码时应优先落在对应目录：

```text
apps/web              # Next.js 前台站点
apps/admin            # React + Vite 后台
apps/figma-plugin     # Phase 3 Figma 插件
packages/schema       # Page Schema 类型与校验
packages/renderer     # 前台与 Admin Preview 共享渲染器
packages/design-tokens
packages/analytics
packages/ui           # 前台渲染组件
packages/admin-theme  # Ant Design 主题
services/api          # NestJS API
infra                 # Docker / CI / Terraform 等
docs                  # 补充文档
```

### 2.2 前台技术边界

- 使用 Next.js App Router、React、TypeScript、Tailwind CSS、next-intl。
- 前台不得使用 Ant Design；前台 UI 通过 Tailwind、`packages/ui`、`packages/renderer` 实现。
- 前台页面不得直接拼 HTML 字符串，必须通过 Page Schema + Renderer 渲染。
- ISR / SSR / SSG 策略按设计文档区分，结账、账户等未来个性化页面必须使用 no-store 或等价安全策略。
- 媒体资源通过 `media://` 或统一 MediaAsset 引用解析到 CDN URL，不在组件中硬编码 R2 URL。

### 2.3 后台技术边界

- 使用 React + Vite + TypeScript。
- 后台基础 UI 组件只使用 Ant Design 和 `@ant-design/icons`。
- 不新增第二套后台 UI 组件库，不自建 Button、Modal、Table、Form 等基础组件。
- 后台主题通过 `packages/admin-theme` 和 Ant Design `ConfigProvider` 管理。
- Page Builder MVP 是高还原受控编辑器：区块排序、属性面板、Desktop / Mobile 切换、实时预览、Undo / Redo。
- 可按需使用 overlay / 辅助线做对齐和差异检查，但不要把 MVP 扩成完整自由画布产品。

### 2.4 后端技术边界

- API 使用 NestJS + TypeScript。
- 数据访问使用 Prisma，禁止手写拼接 SQL。
- 主数据库 PostgreSQL，缓存 / 会话 / 队列使用 Redis。
- 异步任务使用 BullMQ 或设计文档指定的队列机制。
- API 统一 RESTful，版本前缀 `/api/v1/`。
- 写操作支持 `Idempotency-Key`，尤其是未来订单、支付、Webhook 等流程。
- API 与前台 Vercel 部署解耦，保持为独立 Node.js 服务。

### 2.5 Schema 与渲染边界

- Page Schema 是页面结构和内容的唯一存储格式，不保存生成后的 HTML 作为源数据。
- Schema 变更必须同步更新类型、校验、示例和 Renderer。
- Breaking Schema 变更必须提供迁移策略。
- Admin Preview 与 Website 必须共用 `packages/renderer`，避免预览与线上不一致。
- Desktop / Mobile 布局数据独立存储，允许不同尺寸、间距、字体、图片和区块顺序。

### 2.6 电商预留边界

- `COMMERCE_ENABLED=false` 是 MVP 默认值。
- Product / Variant / Price / Inventory 可做后台基础 API 预留。
- Order / Payment 在 MVP 可提供只读或空列表接口。
- 前台 `cart`、`checkout` 在关闭状态必须返回 `COMMERCE_DISABLED`，不能静默创建订单。
- Stripe Webhook 路由可部署占位，但不能在未启用电商时处理真实支付事件。

### 2.7 多语言接口预留边界

- `MULTI_LOCALE_ENABLED=false` 是 MVP 默认值。
- 默认值必须为 Market=`us`、Locale=`en-US`、Currency=`USD`、Fallback Locale=`en-US`。
- Market / Locale / Translation 的基础 API 需要先预留，并走后端鉴权和 Tenant 隔离。
- `GET /api/v1/locales` 在 MVP 返回默认 `en-US`。
- `GET /api/v1/translations` 在 MVP 只返回默认 Locale 的翻译条目。
- 创建或发布非默认 Locale 时，如果 `MULTI_LOCALE_ENABLED=false`，必须返回 `MULTI_LOCALE_DISABLED`。
- 前台请求非默认 Locale 时，MVP 必须回退到 `en-US`，并在响应元信息中标记 `isFallback=true`。
- Page Schema 文案字段优先支持 `i18nKey` + 默认值，避免后续多语言迁移时重写页面。
- 不接入自动翻译、机器翻译、人工翻译工作流或第三方 TMS，除非设计文档明确进入对应阶段。

### 2.8 二次开发兼容边界

- 客户二开优先级必须为：配置 -> Theme / Template -> 自定义组件 -> 集成 Adapter -> 自定义后端模块 -> 核心 Fork。
- 新增前台能力优先放在 `packages/custom-components` 或 `apps/web/src/custom`。
- 新增后台能力优先放在 `packages/custom-admin` 或 `apps/admin/src/custom`。
- 新增后端能力优先放在 `services/api/src/custom`，并通过 Module Manifest 注册。
- 新增外部系统集成优先放在 `packages/integration-adapters`，通过统一 Adapter 接口接入。
- 自定义代码不得绕过 Identity、Publish、Payment、Order 等核心领域服务直接写核心表。
- 自定义组件不得读取 Admin Token、Draft Schema、敏感环境变量或跨租户数据。
- 二开必须提供 API Contract、权限 Scope、Feature Flag、Migration、测试和交付说明。
- 核心 Fork 必须明确标记，不承诺无冲突升级。

### 2.9 文件与功能模块化边界

目标：随功能增加按职责拆文件，禁止把一个领域的校验、映射、业务、响应全部堆进单个文件。拆分按职责进行，不为凑文件数而切碎。

#### 2.9.1 体积阈值

| 对象 | 建议上限 | 必须拆分 |
|------|----------|----------|
| `.ts` / `.tsx` 实现文件 | 300 行 | 400 行 |
| NestJS Controller / Service | 300 行 | 400 行 |
| React 组件（含 JSX） | 250 行 | 350 行 |
| 单个函数 / 方法 | 80 行 | 120 行 |
| 测试文件 | 400 行 | 500 行 |

例外：Prisma `schema.prisma`、生成代码、lockfile、纯 re-export 的 `index.ts`、与实现对齐的大型 snapshot。新增实现不得以“先写进一个文件以后再拆”为由突破必须拆分阈值。

#### 2.9.2 拆分原则

- 一个文件只承担一个主职责；文件名必须能看出该职责（如 `pages.mapper.ts`、`use-page-editor.ts`）。
- 新增能力优先新建文件或子目录，禁止向已接近或超过阈值的文件继续追加逻辑。
- 本次改动触及已超阈值文件时，必须先拆出相关职责再改需求，不得只在末尾追加。
- 按用例、组件、校验、映射、常量、类型拆分，禁止按“上半段 / 下半段”机械切文件。
- 禁止出现杂物袋文件：`utils.ts`、`helpers.ts`、`common.ts`、`misc.ts` 只能存放明确主题的共享逻辑，主题不同必须分文件。
- `index.ts` / `index.tsx` 只做 re-export 或极薄注册，不写业务逻辑、不堆组件实现。
- 不要过拆：紧密耦合且合计约 40 行以内的逻辑保持同文件，避免 5～10 行碎片文件满天飞。
- 共享代码必须有稳定职责边界后再抽取；禁止为了复用 3 行而提升抽象，也禁止复制出近重复大文件。

#### 2.9.3 后端模块结构（NestJS）

领域代码落在 `services/api/src/modules/<domain>/`，按文件职责拆分：

```text
services/api/src/modules/<domain>/
  <domain>.module.ts
  <domain>.controller.ts       # 路由、守卫、入参绑定，不写业务
  <domain>.service.ts          # 用例编排与事务边界，不堆校验/映射细节
  <domain>.mapper.ts           # 持久化模型 <-> API 响应 / 领域对象
  <domain>.validation.ts       # Zod / DTO
  <domain>.responses.ts        # 响应装配（可选）
  <domain>.constants.ts
  <domain>.types.ts
```

当一个领域包含多个独立用例（如 list / create / publish / rollback），且 Service 接近阈值时，必须再按用例拆分：

```text
modules/pages/
  pages.module.ts
  pages.controller.ts
  pages.service.ts             # 门面，委托到 use-cases，自身保持编排
  use-cases/
    list-pages.ts
    create-page.ts
    publish-page.ts
    rollback-page.ts
```

- Controller 禁止直接访问 Prisma 或拼接复杂查询。
- 跨领域调用只通过对方 Module 导出的公开 Service，禁止 import 对方 `use-cases/`、`mapper` 等内部文件。
- 自定义后端模块仍落在 `services/api/src/custom`，同样遵守本节约文件职责，不得把二开逻辑写进核心领域大文件。

#### 2.9.4 前台与后台结构

后台 `apps/admin` 按功能目录拆分，不把列表、编辑器、设置塞进单个页面文件：

```text
apps/admin/src/
  pages/<feature>/             # 路由页，只做组合
  features/<feature>/
    components/                # 每个区块 / 面板一个文件
    hooks/
    api.ts                     # 该功能的 API 调用
    types.ts
    constants.ts
```

- 一个文件只导出一个页面级或区块级组件。
- Hook、类型、常量、纯函数分别落文件；Page Builder 的每个区块编辑器、属性面板分区必须独立文件。
- 禁止所有区块实现挤在 `Editor.tsx` / `App.tsx`。
- 后台基础 UI 仍只使用 Ant Design，不自建 Button、Modal、Table、Form。

前台 `apps/web`：

- 路由页（`page.tsx`）只做数据获取、Locale / Market 解析和 Renderer 调用，不在页面文件内堆区块 JSX。
- 可复用渲染组件放 `packages/ui`，每个组件一个文件。
- 页面结构与内容仍只来自 Page Schema，不在多个页面文件里复制同一套区块实现。

#### 2.9.5 packages 结构

- `packages/schema`：按实体 / 组件拆类型与校验，禁止全部写入单个 `index.ts`。
- `packages/renderer`：每个区块一个渲染文件，另设注册表；Admin Preview 与 Website 继续共用，不得各写一份。
- `packages/ui`：一个组件一个文件，禁止把 Hero、FAQ、CTA 等塞进同一个实现文件。
- Schema 变更必须同步类型、校验、示例和 Renderer，且各自落在对应文件，不把四者写进同一文件凑合。

#### 2.9.6 禁止事项

- 禁止把校验、映射、业务编排、响应组装、常量长期堆在同一个 Service / 组件文件并持续追加。
- 禁止用“先实现后重构”跳过必须拆分阈值。
- 禁止跨层塞代码：前端组件文件不定义后端 DTO；后端 Service 不放展示文案拼装；Prisma 查询不写进 React 文件。
- 禁止为通过阈值而把一个函数拆成无意义的 `part1` / `part2`，或把私有细节提升成宽泛公共 API。

## 3. 安全边界

### 3.1 租户与权限

- 所有业务数据必须带 Tenant Context；涉及业务数据的表应包含 `tenant_id` 或能通过上级实体追溯到 Tenant。
- API 层必须强制租户隔离，不能只依赖前端传参。
- 普通用户不得跨 Tenant 访问任何资源。
- RBAC 权限必须在后端校验，前端隐藏菜单只作为体验优化。
- 敏感操作包括发布、回滚、退款、权限变更、密钥配置，必须写审计日志。

### 3.2 认证与会话

- Admin 使用 Email + Password + JWT，按设计文档采用 Access Token + Refresh Token。
- 密码使用 bcrypt，成本参数不低于设计文档要求。
- Refresh Token 必须支持轮换和失效。
- Preview Token 必须短期有效，不得复用 Admin 登录态替代。
- 服务间调用使用 API Key + HMAC 或等价签名机制。

### 3.3 输入与内容安全

- 所有 API 输入必须经过 Zod / DTO / class-validator 等结构化校验。
- RichText 必须做 XSS 清洗，不能直接渲染未净化 HTML。
- URL、跳转地址、媒体地址必须做白名单或协议校验。
- 错误响应不得泄露堆栈、SQL、密钥、内部路径。
- 文件名、slug、locale、market code 必须有格式约束。

### 3.4 上传与媒体安全

- 上传必须使用 Presigned URL 或服务端受控上传流程。
- 文件类型使用白名单，不信任客户端 MIME。
- 限制文件大小、扩展名和数量。
- R2 原始对象默认不公开，公开访问通过 CDN 或签名策略控制。
- 图片应生成必要元数据，避免在前台使用超大原图。

### 3.5 支付与 Webhook 安全

- MVP 不启用真实支付；任何支付创建请求在 `COMMERCE_ENABLED=false` 时必须拒绝。
- Stripe Secret、Webhook Secret 不得提交到仓库。
- Webhook 必须验证签名，先落库 `webhook_events` 再幂等处理。
- Webhook 重放不得重复更新订单。
- 订单金额、币种、商品价格必须以后端快照为准，不能信任前端传入金额。

### 3.6 隐私与分析

- GA4、GTM、Clarity 等脚本必须通过配置启用。
- Cookie Consent 启用前，不应加载需要同意的营销或分析脚本。
- 不在 Analytics 事件中发送明文邮箱、手机号、地址等 PII。
- 日志中不得记录密钥、Token、支付完整载荷或用户敏感信息。

### 3.7 密钥与环境变量

- 所有密钥只通过环境变量或密钥管理服务注入。
- `.env`、`.env.local`、密钥 JSON、私钥文件不得提交。
- 环境变量清单需要同步维护到设计文档附录。
- 生产环境必须显式设置 `COMMERCE_ENABLED=false`，直到进入 Phase 2。
- 生产环境必须显式设置 `MULTI_LOCALE_ENABLED=false`，直到确认启用多语言运营。

## 4. 需要明确批准的变更

以下变更不能由 Agent 自行决定，必须先更新设计文档并获得明确确认：

- 启用真实购物车、结账、支付或订单履约。
- 改变部署策略，例如从 Vercel + R2 改为全量 ECS / K8s。
- 引入新的前台或后台 UI 组件库。
- 改变认证方式、Token 策略或 RBAC 模型。
- 引入新的数据库、ORM、消息队列或支付服务商。
- 对 Page Schema 做不兼容变更。
- 改变领域边界、数据所有权、跨领域调用方式或领域事件结构。
- 改变 API 版本策略、权限 Scope、响应格式或错误码规范。
- 执行不可逆数据库、Page Schema、Theme Schema 或 Translation Key 迁移。
- 将二开从扩展点升级为核心 Fork。
- 修改 `packages/renderer`、Identity、Publish、Payment、Order 等核心模块以满足单一客户定制。
- 删除或破坏公开 Extension Point、Adapter 接口、Module Manifest 或 Custom 目录结构。
- 将 Figma 自动导入提前到 MVP。
- 将首期市场从 `us / en-US / USD` 改为其他市场或多市场首发。
- 启用非默认 Locale 的前台发布、SEO Sitemap、hreflang 或自动语言识别。
- 启动 Phase 6+ 的 Theme Package、Checkout 扩展、App / Extension Platform 或平台治理专项。
- 增加任何 Shopify API、Liquid Theme、App Store、Checkout Extension 的兼容层。

## 5. 实现验收要求

每个功能完成前至少满足：

- TypeScript 类型检查通过。
- 关键 Schema、权限、Feature Flag 和 API 错误分支有测试。
- Page Builder 改动需要同时验证 Desktop 和 Mobile。
- 前台页面需要验证生产构建和基础性能预算。
- 涉及安全边界的改动需要覆盖未授权、跨租户、非法输入、关闭 Feature Flag 等场景。
- 涉及多语言接口的改动需要覆盖默认 `en-US`、非默认 Locale 回退、`MULTI_LOCALE_ENABLED=false` 和跨租户 Translation Key 隔离。
- 涉及二次开发扩展点的改动需要提供示例扩展、兼容性说明、升级影响和契约测试。
- 涉及部署的改动需要更新环境变量清单和 Smoke Test。
- 新增或修改的实现文件必须符合 2.9 模块化阈值与目录职责；超过必须拆分阈值的文件不得视为完成。
- 改动触及已超阈值的文件时，需要把相关职责拆到独立文件后再提交功能改动。

## 6. Agent 工作规则

- 开始实现前先阅读本文件和设计文档相关章节。
- 优先按现有设计文档补齐代码，不主动扩大产品范围。
- 修改范围、阶段、架构、安全策略时，同时更新设计文档。
- 新增功能落到对应模块目录和职责文件，禁止向已有大文件继续堆叠校验、映射、业务或 UI。
- 实现前先判断目标文件行数与职责；已接近或超过 2.9 阈值时，先拆文件再写新逻辑。
- 不覆盖用户已有改动，不执行破坏性 Git 操作。
- 不把示例密钥、真实密钥、Token、账号信息写入代码或文档。
- 遇到产品边界不清时，先提出选择题式问题，再落文档。
