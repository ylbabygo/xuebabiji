/**
 * Vercel 环境变量注入脚本
 * 这个文件会被 Vercel 自动处理，将环境变量注入到 window 对象
 */

// 检查是否在浏览器环境中
if (typeof window !== 'undefined') {
  window.ENV = {
    SUPABASE_URL: process.env?.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
    APP_ENV: process.env?.NEXT_PUBLIC_APP_ENV || 'development',
    GA_ID: process.env?.NEXT_PUBLIC_GA_ID || ''
  };
}