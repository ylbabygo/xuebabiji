# 51Talk Supabase 完整配置指南

## 📋 配置概述

本指南将帮助你完整配置 Supabase 后端，为 51Talk 活动领取页提供：
- IP 限制验证
- 数据统计存储
- 领取记录管理
- 实时数据分析

## 🚀 步骤 1: 创建 Supabase 项目

### 1.1 注册并创建项目
1. 访问 [Supabase 官网](https://supabase.com)
2. 点击 "Start your project"
3. 使用 GitHub 或邮箱注册
4. 点击 "New Project"
5. 选择你的组织（或创建新组织）
6. **项目设置**：
   - **项目名称**: `51talk-promotional-page`
   - **数据库密码**: 创建强密码（请保存好）
   - **地区**: 选择离你的用户最近的地区（如：East US (North Virginia)）
   - **Pricing Plan**: 选择 **Free** 计划
7. 点击 "Create new project"

### 1.2 获取项目信息
项目创建完成后，在项目设置中找到：
- **Project URL**: `https://your-project-id.supabase.co`
- **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **service_role key**: （保管好，不要泄露）

## 🗄️ 步骤 2: 配置数据库

### 2.1 创建领取记录表
在 Supabase Dashboard 中：

1. 进入 **SQL Editor**
2. 点击 "New query"
3. 粘贴以下 SQL 并执行：

```sql
-- 创建领取记录表
CREATE TABLE claim_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  user_agent TEXT,
  claimed_version VARCHAR(50) NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_fingerprint VARCHAR(100),
  session_id VARCHAR(100),
  user_ip_hash VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 IP 统计表
CREATE TABLE ip_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  first_claim_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_claim_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_claims INTEGER DEFAULT 1,
  claim_versions TEXT[],
  user_agents TEXT[],
  device_fingerprints TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建版本统计表
CREATE TABLE version_statistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version_name VARCHAR(50) NOT NULL UNIQUE,
  total_claims INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  unique_devices INTEGER DEFAULT 0,
  claims_by_date JSONB DEFAULT '{}',
  last_claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_claim_records_ip ON claim_records(ip_address);
CREATE INDEX idx_claim_records_version ON claim_records(claimed_version);
CREATE INDEX idx_claim_records_created_at ON claim_records(created_at);
CREATE INDEX idx_claim_records_device_fingerprint ON claim_records(device_fingerprint);
CREATE INDEX idx_ip_statistics_ip ON ip_statistics(ip_address);
CREATE INDEX idx_version_statistics_version ON version_statistics(version_name);

-- 创建 IP 限制表（30天限制）
CREATE TABLE ip_restrictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  last_claim_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claim_count INTEGER DEFAULT 1,
  is_restricted BOOLEAN DEFAULT FALSE,
  restriction_reason TEXT,
  restriction_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ip_restrictions_ip ON ip_restrictions(ip_address);
CREATE INDEX idx_ip_restrictions_expires_at ON ip_restrictions(restriction_expires_at);
```

### 2.2 启用 Row Level Security (RLS)

```sql
-- 启用 RLS
ALTER TABLE claim_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_restrictions ENABLE ROW LEVEL SECURITY;

-- 创建匿名访问策略
CREATE POLICY "Allow anonymous insert claim_records" ON claim_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read claim_records" ON claim_records
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert ip_statistics" ON ip_statistics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read ip_statistics" ON ip_statistics
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert version_statistics" ON version_statistics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read version_statistics" ON version_statistics
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert ip_restrictions" ON ip_restrictions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read ip_restrictions" ON ip_restrictions
  FOR SELECT USING (true);
```

## ⚙️ 步骤 3: 创建 Edge Functions

### 3.1 安装 Supabase CLI
```bash
# 使用 npm 安装
npm install -g supabase

# 或使用 yarn
yarn global add supabase
```

### 3.2 登录并链接项目
```bash
# 登录 Supabase
supabase login

# 链接项目
supabase link --project-ref your-project-id
```

### 3.3 创建验证函数
创建文件 `supabase/functions/validate-claim/index.ts`：

```typescript
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
    const { version, userAgent, deviceFingerprint, sessionId } = await req.json()

    // 获取客户端真实 IP
    const clientIP = req.headers.get('x-forwarded-for') ||
                   req.headers.get('x-real-ip') ||
                   req.headers.get('cf-connecting-ip') ||
                   '127.0.0.1'

    console.log(`Claim request: IP=${clientIP}, Version=${version}`)

    // 连接到数据库
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 检查 IP 限制（30天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: ipRestriction, error: ipError } = await supabaseClient
      .from('ip_restrictions')
      .select('*')
      .eq('ip_address', clientIP)
      .single()

    if (ipError && ipError.code !== 'PGRST116') {
      throw new Error(`Database error: ${ipError.message}`)
    }

    if (ipRestriction) {
      // 检查是否在限制期内
      if (ipRestriction.is_restricted && new Date(ipRestriction.restriction_expires_at) > new Date()) {
        return new Response(
          JSON.stringify({
            error: 'IP 地址已受限，请稍后再试',
            type: 'ip_restricted',
            expires_at: ipRestriction.restriction_expires_at
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429
          }
        )
      }

      // 检查 30 天内是否已经领取
      if (ipRestriction.last_claim_at && new Date(ipRestriction.last_claim_at) > thirtyDaysAgo) {
        return new Response(
          JSON.stringify({
            error: '该 IP 地址 30 天内已领取过资料',
            type: 'ip_claimed',
            last_claim_at: ipRestriction.last_claim_at,
            remaining_days: Math.ceil((new Date(ipRestriction.last_claim_at).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429
          }
        )
      }

      // 更新 IP 限制记录
      await supabaseClient
        .from('ip_restrictions')
        .upsert({
          ip_address: clientIP,
          last_claim_at: new Date().toISOString(),
          claim_count: ipRestriction.claim_count + 1,
          is_restricted: ipRestriction.claim_count >= 5, // 超过5次则限制
          restriction_expires_at: ipRestriction.claim_count >= 5 ?
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
          restriction_reason: ipRestriction.claim_count >= 5 ? 'Excessive claims' : null,
          updated_at: new Date().toISOString()
        })
    } else {
      // 创建新的 IP 限制记录
      await supabaseClient
        .from('ip_restrictions')
        .insert({
          ip_address: clientIP,
          last_claim_at: new Date().toISOString(),
          claim_count: 1
        })
    }

    // 记录领取记录
    const claimRecord = {
      ip_address: clientIP,
      user_agent: userAgent,
      claimed_version: version,
      device_fingerprint: deviceFingerprint,
      session_id: sessionId,
      user_ip_hash: await hashIP(clientIP)
    }

    const { error: insertError } = await supabaseClient
      .from('claim_records')
      .insert(claimRecord)

    if (insertError) {
      throw new Error(`Failed to record claim: ${insertError.message}`)
    }

    // 更新 IP 统计
    await upsertIPStatistics(supabaseClient, clientIP, userAgent, deviceFingerprint, version)

    // 更新版本统计
    await upsertVersionStatistics(supabaseClient, version)

    return new Response(
      JSON.stringify({
        success: true,
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
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        error: '服务器错误，请稍后再试',
        type: 'server_error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// 辅助函数：IP 哈希
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 辅助函数：更新 IP 统计
async function upsertIPStatistics(supabaseClient: any, ip: string, userAgent: string, deviceFingerprint: string, version: string) {
  const { data: existing } = await supabaseClient
    .from('ip_statistics')
    .select('*')
    .eq('ip_address', ip)
    .single()

  if (existing) {
    await supabaseClient
      .from('ip_statistics')
      .update({
        total_claims: existing.total_claims + 1,
        claim_versions: [...existing.claim_versions, version],
        user_agents: [...existing.user_agents, userAgent],
        device_fingerprints: [...existing.device_fingerprints, deviceFingerprint],
        updated_at: new Date().toISOString()
      })
      .eq('ip_address', ip)
  } else {
    await supabaseClient
      .from('ip_statistics')
      .insert({
        ip_address: ip,
        claim_versions: [version],
        user_agents: [userAgent],
        device_fingerprints: [deviceFingerprint]
      })
  }
}

// 辅助函数：更新版本统计
async function upsertVersionStatistics(supabaseClient: any, version: string) {
  const { data: existing } = await supabaseClient
    .from('version_statistics')
    .select('*')
    .eq('version_name', version)
    .single()

  if (existing) {
    const today = new Date().toISOString().split('T')[0]
    const claimsByDate = existing.claims_by_date || {}
    claimsByDate[today] = (claimsByDate[today] || 0) + 1

    await supabaseClient
      .from('version_statistics')
      .update({
        total_claims: existing.total_claims + 1,
        claims_by_date: claimsByDate,
        last_claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('version_name', version)
  } else {
    const today = new Date().toISOString().split('T')[0]
    await supabaseClient
      .from('version_statistics')
      .insert({
        version_name: version,
        total_claims: 1,
        claims_by_date: { [today]: 1 },
        last_claimed_at: new Date().toISOString()
      })
  }
}

// 创建 Supabase 客户端
function createClient(supabaseUrl: string, supabaseKey: string) {
  return {
    from: (table: string) => ({
      select: (columns = '*') => ({
        eq: (column: string, value: any) => ({
          single: () => fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }).then(res => res.json())
        })
      }),
      insert: (data: any) => fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }).then(res => res.json()),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: () => fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}`, {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          }).then(res => res.json())
        })
      }),
      upsert: (data: any) => fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(data)
      }).then(res => res.json())
    })
  }
}
```

### 3.4 部署 Edge Function
```bash
# 部署函数
supabase functions deploy validate-claim

# 查看函数日志
supabase functions logs validate-claim
```

## 🔧 步骤 4: 配置环境变量

### 4.1 在 Vercel 中添加环境变量
1. 进入 Vercel Dashboard
2. 选择你的 `xuebabiji` 项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.2 更新前端代码
更新 `index.html` 中的 `checkServerRestriction` 函数：

```javascript
async function checkServerRestriction(ip) {
    try {
        const supabaseUrl = process.env?.NEXT_PUBLIC_SUPABASE_URL || window.ENV?.SUPABASE_URL;
        const supabaseKey = process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.ENV?.SUPABASE_ANON_KEY;

        if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
            // 如果没有配置 Supabase，返回不限制
            console.log('Supabase 未配置，跳过服务器限制');
            return { restricted: false };
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/validate-claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                version: 'check', // 使用占位符版本
                userAgent: navigator.userAgent,
                deviceFingerprint: StorageManager.generateDeviceFingerprint(),
                sessionId: sessionStorage.getItem('sessionId') || generateSessionId()
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                restricted: true,
                reason: 'server_error',
                message: errorData.error || '服务器验证失败',
                details: errorData
            };
        }

        const result = await response.json();
        return {
            restricted: !result.success,
            reason: result.type || null,
            message: result.error || null,
            details: result
        };

    } catch (error) {
        console.warn('服务器限制检查失败:', error);
        // 网络错误时允许继续（降级处理）
        return { restricted: false };
    }
}
```

## 📊 步骤 5: 测试和验证

### 5.1 测试 Edge Function
```bash
# 测试函数
curl -X POST https://your-project-id.supabase.co/functions/v1/validate-claim \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "人教版·一起点",
    "userAgent": "Mozilla/5.0...",
    "deviceFingerprint": "abc123",
    "sessionId": "session_123"
  }'
```

### 5.2 验证数据库
在 Supabase Dashboard 的 **Table Editor** 中查看：
- `claim_records` 表应该有新的记录
- `ip_statistics` 表应该有 IP 统计
- `version_statistics` 表应该有版本统计

## 🎯 配置完成清单

- [x] Supabase 项目创建
- [x] 数据库表结构配置
- [x] Row Level Security 策略
- [x] Edge Function 部署
- [x] 环境变量配置
- [x] 前端代码更新
- [x] 功能测试验证

## 🔍 监控和维护

### 查看统计数据
在 Supabase Dashboard 中：
1. 进入 **Table Editor**
2. 查看 `version_statistics` 表获取版本领取统计
3. 查看 `ip_statistics` 表获取 IP 使用情况

### 定期维护
- 每月清理过期的限制记录
- 监控 Edge Function 的使用量
- 查看数据库存储使用情况

## 🚨 注意事项

1. **安全**：不要在前端暴露 service_role key
2. **限制**：免费计划有请求限制，注意用量
3. **备份**：定期导出重要数据
4. **监控**：设置用量告警

配置完成后，你的 51Talk 活动页面将具备完整的后端支持和数据分析功能！
