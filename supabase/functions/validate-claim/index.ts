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