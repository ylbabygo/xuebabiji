# 51Talk 活动页部署指南

## 🚀 部署前准备

在部署到生产环境之前，您需要完成以下步骤：

### 1. Supabase 项目设置

如果还没有设置，请先参考 `SUPABASE_SETUP.md` 完成后端配置。

### 2. 配置 API 凭据

#### 步骤 1：获取 Supabase 凭据
1. 登录您的 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 **Settings** → **API**
4. 复制以下两个值：
   - **Project URL**：类似 `https://your-project-id.supabase.co`
   - **anon public**：类似 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 步骤 2：更新配置文件
编辑 `js/app.js` 文件，找到第 52-55 行：

```javascript
// REPLACE THESE VALUES WITH YOUR SUPABASE PROJECT CREDENTIALS
ValidationManager.init(
  'YOUR_SUPABASE_URL',         // Replace: https://your-project-id.supabase.co
  'YOUR_SUPABASE_ANON_KEY'     // Replace: your-project-anon-key
);
```

将占位符替换为您的真实凭据：

```javascript
ValidationManager.init(
  'https://your-project-id.supabase.co',  // 您的实际项目URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // 您的实际匿名密钥
);
```

#### 步骤 3：部署 Edge Function
如果您还没有部署 Edge Function，请执行：

```bash
# 安装 Supabase CLI（如果还没有）
npm install -g supabase

# 链接到您的项目
supabase link --project-ref your-project-id

# 部署 Edge Function
supabase functions deploy validate-claim --no-verify-jwt
```

## 📁 文件上传

将以下文件上传到您的 Web 服务器：

### 必需文件
```
index.html                           # 主页面
css/
├── styles.css                       # 主要样式
└── components.css                   # 组件样式
js/
├── app.js                          # 主应用逻辑
├── storage.js                      # 本地存储管理
└── validation.js                   # API 验证逻辑
assets/
└── 51Talk.png                      # 51Talk Logo
```

### 可选文件
```
README.md                           # 项目说明
CLAUDE.md                           # AI 助手文档
DEPLOYMENT.md                      # 本部署文档
SUPABASE_SETUP.md                  # 后端设置说明
supabase/                          # Supabase 源码（可选）
└── functions/
    └── validate-claim/
        └── index.ts
```

## 🌐 部署选项

### 选项 1：静态网站托管
推荐使用以下服务：
- **Vercel** (推荐)
- **Netlify**
- **GitHub Pages**
- **阿里云 OSS**
- **腾讯云 COS**

### 选项 2：自己的服务器
上传到您的 Web 服务器根目录：
- Apache: `/var/www/html/`
- Nginx: `/usr/share/nginx/html/`

### 选项 3：CDN 加速
建议使用 CDN 加速静态资源：
- **阿里云 CDN**
- **腾讯云 CDN**
- **又拍云 CDN**
- **CloudFlare**

## 🔧 部署后检查清单

### 功能测试
- [ ] 页面正常加载
- [ ] 51Talk Logo 显示正常
- [ ] 9 个教材版本可以点击选择
- [ ] 领取按钮状态正常（未选择时禁用，选择后激活）
- [ ] 点击领取后显示加载状态
- [ ] 成功弹窗正常显示，包含正确的百度网盘链接
- [ ] 自动复制功能正常工作
- [ ] 在新标签页打开百度网盘链接
- [ ] Footer 信息正常显示

### 限制功能测试
- [ ] 设备限制：同一设备 30 天内只能领取一次
- [ ] IP 限制：同一 IP 30 天内只能领取一次（需要不同设备测试）
- [ ] 错误处理：网络错误、验证失败的提示正常

### 响应式测试
- [ ] 手机端（320px+）显示正常
- [ ] 平板端（768px+）显示正常
- [ ] 桌面端（1200px+）显示正常

## 🐛 常见问题

### 问题 1：领取时显示"网络连接失败"
**解决方案：**
1. 检查 Supabase URL 和 API Key 是否正确配置
2. 确认 Edge Function 已成功部署
3. 检查 Supabase 项目是否正常运行

### 问题 2：页面加载时 Logo 不显示
**解决方案：**
1. 确认 `assets/51Talk.png` 文件已上传
2. 检查文件路径是否正确
3. 确认图片文件没有损坏

### 问题 3：设备限制不生效
**解决方案：**
1. 检查浏览器是否支持 LocalStorage
2. 清除浏览器缓存重试
3. 检查浏览器控制台是否有错误信息

### 问题 4：移动端显示异常
**解决方案：**
1. 检查 CSS 文件是否完整上传
2. 确认没有 CSS 语法错误
3. 测试不同的移动浏览器

## 📊 监控建议

### Google Analytics（可选）
在 `index.html` 的 `<head>` 中添加：

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 自定义事件跟踪
在 `js/app.js` 中的以下函数中添加您的分析代码：

```javascript
function trackClaimSuccess(version) {
  // gtag('event', 'claim_success', {
  //   'version': version,
  //   'user_agent': navigator.userAgent
  // });
}

function trackClaimError(error, type) {
  // gtag('event', 'claim_error', {
  //   'error_type': type,
  //   'error_message': error
  // });
}
```

## 🔒 安全建议

1. **API Key 安全**：
   - 匿名密钥可以暴露在前端
   - 不要泄露 service_role_key

2. **HTTPS 部署**：
   - 务必使用 HTTPS 协议
   - 配置 SSL 证书

3. **CORS 配置**：
   - 确保只允许您的域名访问
   - 在 Supabase 中配置 CORS 白名单

## 📞 技术支持

如果在部署过程中遇到问题：

1. **检查浏览器控制台**：F12 → Console 查看错误信息
2. **查看网络请求**：F12 → Network 检查 API 调用
3. **参考 Supabase 日志**：在 Supabase Dashboard 中查看 Edge Function 日志

## 🎉 部署成功！

部署完成后，您的活动页就正式上线了！用户可以：

- 浏览精美的活动页面
- 选择适合的教材版本
- 免费领取学霸笔记
- 自动获取百度网盘链接

祝您的活动获得圆满成功！🚀