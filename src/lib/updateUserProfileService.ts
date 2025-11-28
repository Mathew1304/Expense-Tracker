import { supabase } from './supabase';

interface UpdateProfileParams {
    authUserId: string;
    profileData: {
        full_name: string;
        email: string;
        phone?: string;
        role?: string;
        status?: string;
    };
}

interface UpdateProfileResponse {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
}

/**
 * Updates a user's profile using the Edge Function with service role
 * This bypasses RLS policies and should only be called by admins
 */
export async function updateUserProfile(
    params: UpdateProfileParams
): Promise<UpdateProfileResponse> {
    try {
        console.log('🔄 Calling update-user-profile Edge Function:', params);

        // Get the current session to include auth token
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return {
                success: false,
                error: 'No active session found',
            };
        }

        // Call the Edge Function
        const { data, error } = await supabase.functions.invoke('update-user-profile', {
            body: params,
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        if (error) {
            console.error('❌ Edge Function error:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            return {
                success: false,
                error: error.message || 'Failed to update profile',
            };
        }

        console.log('✅ Edge Function response:', data);

        // The Edge Function returns the response in the data object
        if (data && data.success) {
            return {
                success: true,
                data: data.data,
                message: data.message,
            };
        } else if (data && data.error) {
            // Edge Function returned an error in the response body
            console.error('❌ Edge Function returned error:', data.error);
            return {
                success: false,
                error: data.error || 'Failed to update profile',
            };
        } else {
            return {
                success: false,
                error: 'Unexpected response from Edge Function',
            };
        }
    } catch (error) {
        console.error('❌ Exception calling Edge Function:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}
