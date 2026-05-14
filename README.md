# AI Image Studio Pro Web

企业级 AI 视觉中台 — 网页端 SaaS 系统

## 技术架构

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS + React Router |
| 后端 | Cloudflare Pages Functions (TypeScript) |
| 数据库 | Cloudflare D1 (SQLite) |
| 存储 | Cloudflare R2 |
| 部署 | Cloudflare Pages + GitHub |

## 项目结构

```
web/
  functions/api/[[path]].ts     # API 主路由
  functions/api/lib/
    db.ts                        # D1 数据库工具
    auth.ts                      # JWT 认证
    models.ts                    # AI 模型调用代理
  src/
    App.tsx                      # 路由与认证上下文
    api.ts                       # 前端 API 客户端
    components/
      Sidebar.tsx                # 侧边栏导航
      TopBar.tsx                 # 顶部栏
    pages/
      Login.tsx                  # 登录页
      Hub.tsx                    # AI Hub 首页
      Generate.tsx               # 图像生成
      Edit.tsx                   # 图像编辑
      Chat.tsx                   # AI 对话
      Multimodal.tsx             # 多模态分析
      Gallery.tsx                # 作品画廊
      admin/
        AdminLayout.tsx          # 管理后台布局
        Dashboard.tsx            # 管理仪表盘
        Users.tsx                # 用户管理
        Models.tsx               # 模型管理
        Agents.tsx               # Agent / GPT / Gem 管理
  wrangler.toml                  # Cloudflare 配置
  schema.sql                     # D1 数据库 Schema
  .dev.vars                      # 本地环境变量
```

## 快速开始

### 1. 安装依赖

```bash
cd web
npm install
```

### 2. 配置环境变量

复制 `.dev.vars` 并根据实际情况填写 API Key：

```bash
# .dev.vars
JWT_SECRET=your-super-secret-jwt-key
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key
NANO_BANANA_API_KEY=your-nano-banana-key
NANO_BANANA_BASE_URL=https://api.nano-banana.com/v1
```

**注意：`.dev.vars` 不要提交到 Git。**

### 3. 创建 D1 数据库

```bash
npx wrangler d1 create ai-studio-db
# 将返回的 database_id 填入 wrangler.toml
```

### 4. 初始化数据库

```bash
npx wrangler d1 execute ai-studio-db --file=./schema.sql
```

### 5. 本地开发

```bash
# 同时启动前端 Vite dev server 和 Pages Functions
npm run dev
```

访问 http://localhost:5173

管理员账号：yangle / leo0417

### 6. 构建与部署

```bash
# 构建前端
npm run build

# 部署到 Cloudflare Pages
npm run deploy
```

部署后，在 Cloudflare Dashboard 设置环境变量：
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `NANO_BANANA_API_KEY`
- `NANO_BANANA_BASE_URL`

## P0 功能清单

| 功能 | 状态 |
|------|------|
| 登录与权限系统 (JWT) | 完成 |
| 角色: Super Admin / Admin / Designer / Operator | 完成 |
| 模型统一管理 (后台配置) | 完成 |
| 图像生成 (GPT Image 2 / DALL-E 3 / Nano Banana) | 完成 |
| 图像编辑 (重绘/扩图/放大/抠图) | 完成 |
| AI 对话 (GPT-4o / GPT-4 / Gemini / Claude) | 完成 |
| 多模态分析 (Gemini Vision / GPT-4o Vision) | 完成 |
| 作品画廊 | 完成 |
| 管理后台 (仪表盘/用户/模型/Agent) | 完成 |
| 用量统计与额度控制 | 完成 |
| API 代理层 (后端调用模型) | 完成 |
| Cloudflare + GitHub 可部署 | 完成 |

## 安全特性

- API Key 只存在于后端环境变量，前端不可见
- 系统提示词 / SOP / 知识库只对管理员可见
- JWT Token 认证，24 小时过期
- 角色权限控制 (RBAC)
- 每日/每月用量额度限制
- 所有请求经过后端代理，记录审计日志
- Prompt 拼接顺序保护（安全规则 > Agent Prompt > SOP > 知识库 > 用户输入）

## 管理员操作

### 新增用户
1. 登录管理员账号 (yangle / leo0417)
2. 进入「管理后台 → 用户管理」
3. 点击「新增用户」

### 新增模型
1. 进入「管理后台 → 模型管理」
2. 点击「新增模型」
3. 填写 model_id、供应商、API Key 环境变量名等

### 新增 GPT / Gem / Agent
1. 进入「管理后台 → Agent 管理」
2. 点击「新增」
3. 填写标识、名称、类型、系统提示词、SOP
4. 普通用户只能看到可见描述，无法查看隐藏 Prompt

## 后续扩展 (P1 / P2)

- 视频生成中心
- 知识库绑定
- 子 Agent / 工作流编排
- 批量任务队列
- R2 图片存储
- 更细粒度的成本中心
- 项目管理系统
