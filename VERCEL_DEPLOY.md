# Vercel + Supabase 完整部署指南

## 🎯 部署概览

本指南将帮助您将 51Talk 活动页部署到 Vercel（前端）并连接到 Supabase（后端）。

## 📋 前置要求

1. **Supabase 项目**（已完成设置）
   - 参考 `SUPABASE_SETUP.md` 完成后端配置
   - 获取 Project URL 和 anon key

2. **Vercel 账号**
   - 访问 [vercel.com](https://vercel.com) 注册账号
   - 推荐使用 GitHub、GitLab 或 Bitbucket 登录

3. **Git 仓库**
   - GitHub、GitLab 或 Bitbucket 仓库
   - 将项目代码推送到仓库

## 🚀 部署步骤

### 第1步：准备 Git 仓库

```bash
# 初始化 Git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "🚀 Initial commit: 51Talk promotional landing page"

# 添加远程仓库（替换为您的仓库地址）
git remote add origin https://github.com/yourusername/51talk-landing-page.git

# 推送代码
git push -u origin main
```

### 第2步：部署到 Vercel

#### 方法A：通过 Vercel 网站部署（推荐）

1. **登录 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "Continue with GitHub"（或其他 Git 服务）

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择您的 GitHub 仓库
   - 点击 "Import"

3. **配置项目**
   - **Project Name**: `51talk-landing-page`（可自定义）
   - **Framework Preset**: `Other`
   - **Root Directory**: `./`（保持默认）
   - **Build Command**: 留空（静态站点不需要）
   - **Output Directory**: 留空（默认输出根目录）

4. **添加环境变量**
   - 在 "Environment Variables" 部分点击 "Add New"
   - 添加以下环境变量：

   ```
   Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://your-project-id.supabase.co
   Environment: Production, Preview, Development

   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Environment: Production, Preview, Development
   ```

5. **部署**
   - 点击 "Deploy"
   - 等待部署完成（通常需要1-2分钟）

#### 方法B：使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 在项目目录中运行
vercel

# 按照提示操作：
# - Set up and deploy "~/your-project"? [Y/n] y
# - Which scope do you want to deploy to? Your Name
# - Link to existing project? [y/N] n
# - What's your project's name? 51talk-landing-page
# - In which directory is your code located? ./
# - Want to override the settings? [y/N] n

# 添加环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# 重新部署
vercel --prod
```

### 第3步：配置 Supabase Edge Function

1. **安装 Supabase CLI**
```bash
npm install -g supabase
```

2. **链接到您的 Supabase 项目**
```bash
supabase link --project-ref your-project-id
```

3. **部署 Edge Function**
```bash
supabase functions deploy validate-claim --no-verify-jwt
```

### 第4步：配置 Supabase CORS

在 Supabase Dashboard 中：

1. 进入您的项目
2. 点击 **Settings** → **API**
3. 在 "Restrict API requests to specific URLs" 中添加：
   - `https://your-vercel-domain.vercel.app`
   - `http://localhost:3000`（本地开发）

## 🔧 验证部署

### 功能测试清单

部署完成后，访问您的 Vercel 域名并测试：

- [ ] 页面正常加载，没有控制台错误
- [ ] 51Talk Logo 正常显示
- [ ] 9 个教材版本卡片可以点击
- [ ] 选择版本后领取按钮激活
- [ ] 点击领取显示加载状态
- [ ] 成功弹窗显示正确的百度网盘链接
- [ ] 复制功能正常工作
- [ ] 设备限制功能正常（30天内同一设备只能领取一次）

### 网络请求测试

打开浏览器开发者工具（F12），检查：

1. **Console 标签**：
   - 没有环境变量错误警告
   - 没有 Supabase 连接错误

2. **Network 标签**：
   - 领取时成功调用 Supabase Edge Function
   - 状态码为 200

## 🛠️ 本地开发

### 设置本地环境变量

创建 `.env.local` 文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_ENV=development
```

### 本地运行

```bash
# 使用 Node.js
npm run dev

# 或直接使用 Python
python -m http.server 8000
```

## 📊 监控和分析

### Vercel Analytics

1. 在 Vercel Dashboard 中启用 Analytics
2. 查看页面访问量、用户地理分布等

### Google Analytics（可选）

1. 在 Vercel 中添加环境变量：
   ```
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

2. 在 `index.html` 的 `<head>` 中添加：
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=process.env.NEXT_PUBLIC_GA_ID"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', process.env.NEXT_PUBLIC_GA_ID);
   </script>
   ```

## 🔒 安全配置

### 1. Supabase RLS 设置

确保您的 Supabase 表有正确的 Row Level Security：

```sql
-- 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'anonymous_claims';
```

### 2. API 密钥安全

- ✅ 匿名密钥可以安全地暴露在前端
- ❌ 不要将 service_role_key 暴露在前端
- ✅ 定期更换 API 密钥

### 3. HTTPS 配置

Vercel 自动提供 HTTPS，确保：
- [ ] 所有资源都通过 HTTPS 加载
- [ ] 没有 Mixed Content 错误

## 🚨 故障排除

### 常见问题及解决方案

#### 问题1：环境变量未生效

**症状**: 控制台显示 "Using placeholder Supabase credentials"

**解决方案**:
1. 检查 Vercel 环境变量名称是否正确（必须是 NEXT_PUBLIC_ 开头）
2. 重新部署项目：`vercel --prod`
3. 清除浏览器缓存

#### 问题2：CORS 错误

**症状**: 网络请求被阻止

**解决方案**:
1. 在 Supabase Dashboard 中添加您的 Vercel 域名到 CORS 白名单
2. 检查 Supabase Edge Function 是否正确部署

#### 问题3：Edge Function 404 错误

**症状**: API 调用返回 404

**解决方案**:
1. 重新部署 Edge Function：`supabase functions deploy validate-claim --no-verify-jwt`
2. 检查 Supabase 项目 ID 是否正确

#### 问题4：样式加载问题

**症状**: 页面样式异常

**解决方案**:
1. 检查 CSS 文件路径是否正确
2. 确认 `vercel.json` 路由配置正确

## 📱 域名配置（可选）

### 使用自定义域名

1. **在 Vercel 中添加域名**：
   - 进入项目设置 → Domains
   - 添加您的域名（如 `activity.51talk.com`）

2. **配置 DNS**：
   - 添加 CNAME 记录指向 `cname.vercel-dns.com`

3. **SSL 证书**：
   - Vercel 会自动配置 SSL 证书

## 🎉 部署成功！

完成以上步骤后，您的 51Talk 活动页就正式上线了！

### 最终检查清单

- [ ] 页面在 Vercel 域名正常访问
- [ ] Supabase 连接正常
- [ ] 所有功能测试通过
- [ ] 移动端显示正常
- [ ] 性能优化（图片压缩、缓存策略）
- [ ] 监控和分析配置完成

### 🚀 项目地址

部署成功后，您将获得：
- **生产域名**: `https://your-project.vercel.app`
- **预览域名**: 每次推送到 GitHub 都会生成新的预览链接

恭喜！您的 51Talk 活动页现在正式运行了！🎊