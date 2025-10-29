import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🧹 Starting cleanup of orphaned auth users...')

    // Get all auth users
    const { data: authUsers, error: listError } = await supabaseClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Failed to list auth users:', listError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to list auth users: ${listError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authUsers?.users) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No auth users found',
          cleaned: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📊 Found ${authUsers.users.length} auth users`)

    // Get all profile IDs
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')

    if (profileError) {
      console.error('❌ Failed to fetch profiles:', profileError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch profiles: ${profileError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const profileIds = new Set(profiles?.map(p => p.id) || [])
    console.log(`📊 Found ${profileIds.size} profiles`)

    // Find orphaned users (exist in auth but not in profiles)
    const orphanedUsers = authUsers.users.filter(user => !profileIds.has(user.id))
    
    console.log(`🔍 Found ${orphanedUsers.length} orphaned users`)

    if (orphanedUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No orphaned users found',
          cleaned: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Delete orphaned users
    let cleanedCount = 0
    const errors = []

    for (const user of orphanedUsers) {
      try {
        console.log(`🗑️ Deleting orphaned user: ${user.email} (${user.id})`)
        
        const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.error(`❌ Failed to delete user ${user.email}:`, deleteError)
          errors.push(`${user.email}: ${deleteError.message}`)
        } else {
          console.log(`✅ Deleted user: ${user.email}`)
          cleanedCount++
        }
      } catch (error) {
        console.error(`❌ Error deleting user ${user.email}:`, error)
        errors.push(`${user.email}: ${error.message}`)
      }
    }

    console.log(`✅ Cleanup completed. Deleted ${cleanedCount} users`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleanup completed. Deleted ${cleanedCount} orphaned users`,
        cleaned: cleanedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in cleanup-orphaned-users function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
