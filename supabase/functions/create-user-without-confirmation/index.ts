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

    const { email, password, fullName, role, permissions } = await req.json()

    console.log('📧 Creating user without email confirmation:', email)

    // Validate required fields
    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, password, fullName' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // First, check if user already exists in Supabase Auth
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers()
    
    let existingUser = null
    if (!listError && existingUsers?.users) {
      existingUser = existingUsers.users.find(user => user.email === email)
    }

    let authData
    let authError

    if (existingUser) {
      console.log('👤 User already exists in auth system:', existingUser.id)
      
      // Check if user has a profile in the database
      const { data: profileData, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, setup_completed')
        .eq('id', existingUser.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Error checking existing profile:', profileError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to check existing user profile' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (profileData && profileData.setup_completed) {
        console.log('❌ User already has completed profile setup')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'User with this email already has a completed profile. Please sign in instead.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // User exists in auth but no profile or incomplete setup - update password and metadata
      console.log('🔄 Updating existing user password and metadata')
      const { data: updateData, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password: password,
          user_metadata: {
            full_name: fullName,
            role: role || 'User',
            setup_completed: false,
          },
        }
      )

      if (updateError) {
        console.error('❌ Failed to update existing user:', updateError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to update existing user: ${updateError.message}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      authData = { user: updateData.user }
      console.log('✅ Existing user updated successfully:', existingUser.id)
    } else {
      // Create new user in Supabase Auth with email confirmation disabled
      console.log('🆕 Creating new user in auth system')
      const createResult = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          full_name: fullName,
          role: role || 'User',
          setup_completed: false,
        },
      })

      authData = createResult.data
      authError = createResult.error

      if (authError) {
        console.error('❌ Auth user creation failed:', authError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create auth user: ${authError.message}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!authData.user) {
        console.error('❌ No user data returned from auth creation')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'User creation failed - no user data returned' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ New auth user created successfully:', authData.user.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          created_at: authData.user.created_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in create-user-without-confirmation function:', error)
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
