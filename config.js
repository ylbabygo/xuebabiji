/**
 * 51Talk 活动页配置文件
 *
 * 请将此文件复制并重命名为 config.local.js
 * 然后填写您的实际 Supabase 凭据
 */

// 生产环境配置
const SUPABASE_CONFIG = {
  // 🔑 请在此处填写您的 Supabase 项目 URL
  // 格式：https://your-project-id.supabase.co
  PROJECT_URL: 'YOUR_SUPABASE_URL',

  // 🔑 请在此处填写您的 Supabase 匿名密钥
  // 格式：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};

// 开发环境配置（可选）
const DEV_CONFIG = {
  // 是否启用开发模式
  ENABLE_DEV_MODE: false,

  // 开发模式下的模拟延迟（毫秒）
  DEV_DELAY: 1000
};

// 自动导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPABASE_CONFIG, DEV_CONFIG };
}