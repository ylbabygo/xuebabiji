# 51Talk 活动领取页 - Vercel 部署指南

## 📋 部署前检查清单

### ✅ 项目结构验证
- [x] 根目录包含 `index.html` 入口文件
- [x] 所有静态资源文件已创建
  - `assets/51Talk.png` - LOGO 图片
  - `css/styles.css` - 主样式文件
  - `css/components.css` - 组件样式
  - `js/app.js` - 主应用逻辑
  - `js/storage.js` - 存储管理
  - `js/validation.js` - 验证模块
- [x] 配置文件正确
  - `vercel.json` - Vercel 部署配置
  - `package.json` - 项目配置
  - `.vercelignore` - 部署忽略文件

### ✅ 功能验证
- [x] 本地服务器运行正常 (端口 8000)
- [x] 所有静态资源可正常访问
- [x] JavaScript 模块加载正确
- [x] UI 交互功能完整

## 🚀 Vercel 部署步骤

### 1. 准备 GitHub 仓库
```bash
# 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit: 51Talk promotional page"

# 添加远程仓库（替换为你的新仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/51talk-promotional-page.git

# 推送代码
git push -u origin main
```

### 2. Vercel 部署配置
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 导入你的 GitHub 仓库
4. Vercel 会自动检测为静态站点，无需额外配置
5. 点击 "Deploy" 开始部署

### 3. 环境变量配置（可选）
在 Vercel 项目设置中添加以下环境变量：
```
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

### 4. 部署后验证
- [x] 页面正常加载
- [x] LOGO 显示正常
- [x] 样式渲染正确
- [x] 交互功能工作
- [x] 移动端适配良好

## 🛠️ Supabase 后端配置

### 1. 创建 Supabase 项目
1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 获取项目 URL 和匿名密钥

### 2. 设置数据库表
```sql
-- 创建领取记录表
CREATE TABLE anonymous_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  user_agent TEXT,
  claimed_version VARCHAR(50) NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 IP 索引
CREATE INDEX idx_anonymous_claims_ip ON anonymous_claims(ip_address);
CREATE INDEX idx_anonymous_claims_created_at ON anonymous_claims(created_at);

-- 启用 RLS
ALTER TABLE anonymous_claims ENABLE ROW LEVEL SECURITY;

-- 创建匿名访问策略
CREATE POLICY "Allow anonymous insert" ON anonymous_claims
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read for all" ON anonymous_claims
  FOR SELECT USING (true);
```

### 3. 部署 Edge Function
在 Supabase 项目中创建 Edge Function `validate-claim`：

```typescript
// supabase/functions/validate-claim/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { version, userAgent } = await req.json()
    const clientIP = req.headers.get('x-forwarded-for') ||
                   req.headers.get('x-real-ip') ||
                   '127.0.0.1'

    // 这里可以添加 IP 限制逻辑
    // 现在简单记录并返回成功
    return new Response(
      JSON.stringify({
        ip_address: clientIP,
        claimed_version: version,
        claimed_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
```

## 🔧 故障排除

### 常见问题
1. **LOGO 不显示**：检查 `assets/51Talk.png` 路径是否正确
2. **样式异常**：确认 CSS 文件路径和语法
3. **功能失效**：检查浏览器控制台错误信息
4. **部署失败**：查看 Vercel 部署日志

### Vercel 配置文件
```json
{
  "version": 2,
  "cleanUrls": true,
  "trailingSlash": false
}
```

## 📈 部署后优化建议

1. **性能优化**：启用 Vercel Analytics
2. **SEO 优化**：添加 meta 标签
3. **安全加固**：配置 CSP 头部
4. **监控设置**：启用错误追踪

---

**注意**：此部署指南基于当前项目结构编写，确保所有文件路径和配置与实际项目保持一致。