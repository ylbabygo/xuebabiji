# Supabase Setup Guide for 51Talk Promotional Landing Page

This guide provides step-by-step instructions for setting up the Supabase backend required for the 51Talk promotional landing page.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Basic understanding of SQL and API concepts
- Node.js installed (for local development)

## Overview

The Supabase backend consists of:
1. **PostgreSQL Database** - For storing claim records with IP restrictions
2. **Edge Function** - For handling claim validation and IP tracking
3. **Row Level Security (RLS)** - For secure public access

## Step 1: Create Supabase Project

1. Log in to your Supabase dashboard
2. Click **"New Project"**
3. Enter project details:
   - **Name**: `51talk-promotional-page` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose the region closest to your target users (recommended: East Asia for China users)
4. Click **"Create new project**
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Database Setup

### 2.1 Create the Claims Table

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New query"**
3. Paste and execute the following SQL:

```sql
-- Create anonymous_claims table
CREATE TABLE anonymous_claims (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_address TEXT NOT NULL,
  claimed_version TEXT NOT NULL,
  last_claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT anonymous_claims_ip_version_unique UNIQUE (ip_address, claimed_version)
);

-- Create indexes for better query performance
CREATE INDEX idx_anonymous_claims_ip_address ON anonymous_claims(ip_address);
CREATE INDEX idx_anonymous_claims_last_claimed ON anonymous_claims(last_claimed_at);
CREATE INDEX idx_anonymous_claims_ip_expiry ON anonymous_claims(ip_address, last_claimed_at);

-- Add comments for documentation
COMMENT ON TABLE anonymous_claims IS 'Tracks anonymous user claims for promotional materials with IP-based restrictions';
COMMENT ON COLUMN anonymous_claims.ip_address IS 'Client IP address for rate limiting';
COMMENT ON COLUMN anonymous_claims.claimed_version IS 'The educational material version claimed';
COMMENT ON COLUMN anonymous_claims.last_claimed_at IS 'Timestamp of the last claim';
```

### 2.2 Enable Row Level Security (RLS)

```sql
-- Enable RLS on the table
ALTER TABLE anonymous_claims ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (claims can be made by anyone)
CREATE POLICY "Public claim access" ON anonymous_claims
  FOR ALL USING (true)
  WITH CHECK (true);
```

### 2.3 Create View for Active Claims (Optional)

```sql
-- Create a view for easily querying active claims (within 30 days)
CREATE VIEW active_claims AS
SELECT
  ip_address,
  claimed_version,
  last_claimed_at,
  last_claimed_at + INTERVAL '30 days' AS expires_at
FROM anonymous_claims
WHERE last_claimed_at > NOW() - INTERVAL '30 days';

COMMENT ON VIEW active_claims IS 'View of claims that are still within the 30-day restriction period';
```

## Step 3: API Keys Configuration

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public**: `your-anon-key`
   - **service_role**: `your-service-role-key` (keep this secret!)

3. Update your JavaScript configuration in `js/app.js`:

```javascript
// Replace the placeholder values in initApp() function
ValidationManager.init(
  'https://your-project-id.supabase.co', // Your Project URL
  'your-anon-key' // Your anon public key
);
```

## Step 4: Edge Function Setup

### 4.1 Install Supabase CLI

If you haven't already, install the Supabase CLI:

```bash
# Using npm
npm install -g supabase

# Or using other package managers
# yarn global add supabase
# pnpm add -g supabase
```

### 4.2 Link Your Project

```bash
# Link to your Supabase project
supabase link --project-ref your-project-id

# Enter your database password when prompted
```

### 4.3 Create Edge Function

Create the Edge function file structure:

```bash
# Create the function directory
mkdir -p supabase/functions/validate-claim
```

Create the function file at `supabase/functions/validate-claim/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ClaimRequest {
  version: string
  timestamp: string
  userAgent: string
}

interface ClaimResponse {
  success: boolean
  message?: string
  data?: any
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, message: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const body: ClaimRequest = await req.json()
    const { version, timestamp, userAgent } = body

    // Validate required fields
    if (!version) {
      return new Response(
        JSON.stringify({ success: false, message: 'Version is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get client IP address
    const clientIP = getClientIP(req)

    if (!clientIP) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unable to determine client IP' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check if IP has claimed in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: existingClaim, error: queryError } = await supabaseAdmin
      .from('anonymous_claims')
      .select('*')
      .eq('ip_address', clientIP)
      .gte('last_claimed_at', thirtyDaysAgo.toISOString())
      .single()

    if (queryError && queryError.code !== 'PGRST116') { // Not found error
      console.error('Database query error:', queryError)
      return new Response(
        JSON.stringify({ success: false, message: 'Database error occurred' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If claim exists within 30 days, reject
    if (existingClaim) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'IP address has already claimed materials within the last 30 days',
          type: 'ip_restricted'
        }),
        {
          status: 429, // Too Many Requests
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Record the new claim
    const { error: insertError } = await supabaseAdmin
      .from('anonymous_claims')
      .upsert({
        ip_address: clientIP,
        claimed_version: version,
        last_claimed_at: new Date().toISOString(),
        user_agent: userAgent
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to record claim' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Success response
    const response: ClaimResponse = {
      success: true,
      message: 'Claim validated successfully',
      data: {
        ip_address: clientIP,
        claimed_version: version,
        claimed_at: new Date().toISOString()
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Extract client IP address from request headers
 */
function getClientIP(req: Request): string | null {
  // Try various headers that might contain the client IP
  const headers = {
    'x-forwarded-for': req.headers.get('x-forwarded-for'),
    'x-real-ip': req.headers.get('x-real-ip'),
    'cf-connecting-ip': req.headers.get('cf-connecting-ip'),
    'x-client-ip': req.headers.get('x-client-ip'),
  }

  for (const [header, value] of Object.entries(headers)) {
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim()
      if (isValidIP(ip)) {
        return ip
      }
    }
  }

  return null
}

/**
 * Basic IP validation
 */
function isValidIP(ip: string): boolean {
  // Basic IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

  // Basic IPv6 validation (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}
```

### 4.4 Deploy Edge Function

```bash
# Deploy the function
supabase functions deploy validate-claim --no-verify-jwt
```

The `--no-verify-jwt` flag is important because this function needs to be publicly accessible without authentication.

## Step 5: Environment Variables

Set the required environment variables for your Edge Function:

```bash
# In your Supabase project dashboard, go to Edge Functions settings
# Add these environment variables:
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Or use the CLI:

```bash
supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 6: Test the Setup

### 6.1 Test Database Connection

1. Go to **SQL Editor** in Supabase
2. Run a test query:

```sql
-- Test table access
SELECT COUNT(*) as total_records FROM anonymous_claims;

-- Test the view
SELECT COUNT(*) as active_records FROM active_claims;
```

### 6.2 Test Edge Function

Use curl to test your Edge Function:

```bash
# Test with valid data
curl -X POST \
  'https://your-project-id.supabase.co/functions/v1/validate-claim' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your-anon-key' \
  -d '{
    "version": "人教版·三起点",
    "timestamp": "2024-01-01T00:00:00Z",
    "userAgent": "Test User Agent"
  }'

# Test with invalid data (missing version)
curl -X POST \
  'https://your-project-id.supabase.co/functions/v1/validate-claim' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your-anon-key' \
  -d '{
    "timestamp": "2024-01-01T00:00:00Z",
    "userAgent": "Test User Agent"
  }'
```

## Step 7: Update Frontend Configuration

1. Open `js/app.js`
2. Update the Supabase configuration with your actual values:

```javascript
// Find the initApp() function and replace:
ValidationManager.init(
  'https://your-project-id.supabase.co', // Your actual Project URL
  'your-actual-anon-key' // Your actual anon public key
);
```

## Security Considerations

1. **IP Rate Limiting**: The system implements 30-day IP-based restrictions
2. **No PII Storage**: Only IP addresses and claimed versions are stored
3. **Row Level Security**: Enabled with public access policy for anonymous claims
4. **Edge Function Security**: Uses service role key securely via environment variables
5. **CORS Headers**: Properly configured for cross-origin requests

## Monitoring and Maintenance

### Monitoring Dashboard

1. Go to **Database** → **Logs** in Supabase to monitor:
   - Edge Function invocations
   - Database queries
   - Error logs

### Regular Maintenance Tasks

```sql
-- Clean up old claims (older than 6 months)
DELETE FROM anonymous_claims
WHERE last_claimed_at < NOW() - INTERVAL '6 months';

-- View claim statistics
SELECT
  claimed_version,
  COUNT(*) as claim_count,
  MAX(last_claimed_at) as last_claim
FROM anonymous_claims
WHERE last_claimed_at > NOW() - INTERVAL '30 days'
GROUP BY claimed_version
ORDER BY claim_count DESC;
```

## Troubleshooting

### Common Issues

1. **Edge Function Returns 401/403**
   - Check that `--no-verify-jwt` flag was used during deployment
   - Verify anon key is correct

2. **Database Connection Issues**
   - Ensure RLS is properly configured
   - Check that the table exists and has correct permissions

3. **IP Detection Issues**
   - Some hosting providers may not forward real client IPs
   - Test with different network environments

### Debug Mode

Enable debug logging by adding to your Edge Function:

```typescript
// Add this line after the imports
const DEBUG = Deno.env.get('DEBUG') === 'true'

// Use throughout the function
if (DEBUG) console.log('Debug info:', { clientIP, version })
```

## Production Deployment

When deploying to production:

1. **Update Project Settings**:
   - Disable project auto-pause
   - Enable request logs
   - Set up proper backup retention

2. **Edge Function Scaling**:
   - Monitor function execution times
   - Set up alerts for high error rates
   - Consider CDN for static assets

3. **Database Optimization**:
   - Monitor query performance
   - Set up automated backups
   - Consider read replicas for scaling

## Support

For issues with:
- **Supabase Platform**: Contact Supabase support
- **Edge Function Issues**: Check Supabase documentation
- **Database Issues**: Review SQL queries and constraints

Your setup is now complete! The 51Talk promotional landing page should work with the Supabase backend for IP-based claim validation.