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
        // Get the authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }

        // Create a Supabase client with the Auth context of the logged in user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // Verify the user is authenticated
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('User not authenticated')
        }

        console.log('🔐 Authenticated user:', user.id)

        // Parse request body
        const { authUserId, profileData } = await req.json()

        console.log('📝 Update request:', { authUserId, profileData })

        if (!authUserId || !profileData) {
            throw new Error('Missing required fields: authUserId and profileData')
        }

        // Verify the requesting user has admin permissions
        // Check if user exists in users table and has appropriate role
        const { data: requestingUser, error: userCheckError } = await supabaseClient
            .from('users')
            .select('id, role_id, roles!inner(role_name)')
            .eq('auth_user_id', user.id)
            .single()

        if (userCheckError || !requestingUser) {
            console.error('❌ User check failed:', userCheckError)
            throw new Error(`User not found in users table: ${userCheckError?.message || 'Unknown error'}`)
        }

        console.log('👤 Requesting user:', JSON.stringify(requestingUser, null, 2))

        // Check if user has admin role (roles is returned as an object when using !inner)
        const roleName = requestingUser.roles?.role_name
        const isAdmin = roleName === 'Admin' || roleName === 'Super Admin'

        console.log('🔍 Role name:', roleName, 'Is admin:', isAdmin)

        if (!isAdmin) {
            console.error('❌ Permission denied: User is not an admin')
            throw new Error(`Permission denied: Admin role required (current role: ${roleName})`)
        }

        console.log('✅ Admin permission verified')

        // Create a service role client to bypass RLS
        const supabaseServiceRole = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Prepare the profile payload
        const profilePayload = {
            id: authUserId,
            full_name: profileData.full_name,
            email: profileData.email,
            phone: profileData.phone || null,
            role: profileData.role || null,
            status: profileData.status || 'active',
            updated_at: new Date().toISOString(),
        }

        console.log('🔄 Upserting profile:', profilePayload)

        // Upsert the profile using service role (bypasses RLS)
        const { data: updatedProfile, error: profileError } = await supabaseServiceRole
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' })
            .select('id, full_name, email, phone, role, created_at, updated_at')
            .single()

        if (profileError) {
            console.error('❌ Profile upsert failed:', profileError)
            throw new Error(`Failed to update profile: ${profileError.message}`)
        }

        console.log('✅ Profile updated successfully:', updatedProfile)

        return new Response(
            JSON.stringify({
                success: true,
                data: updatedProfile,
                message: 'Profile updated successfully'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('❌ Error in update-user-profile function:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'An unexpected error occurred'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
