-- Diagnostic Script for RLS Policies Issue
-- Run this to check what's happening with the profiles table policies

-- ==========================================
-- CHECK RLS STATUS
-- ==========================================

-- Check if RLS is enabled on profiles table
SELECT 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- ==========================================
-- CHECK EXISTING POLICIES
-- ==========================================

-- Check what policies exist on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ==========================================
-- CHECK AUTH CONTEXT
-- ==========================================

-- Check current auth context (run this while logged in as the user)
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email,
    auth.role() as current_user_role;

-- ==========================================
-- TEST POLICY MANUALLY
-- ==========================================

-- Test if we can insert a profile (this should work if policies are correct)
-- Replace 'test-user-id' with an actual user ID from auth.users
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user ID: %', test_user_id;
        
        -- Try to insert a test profile
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role, status, setup_completed)
            VALUES (test_user_id, 'test@example.com', 'Test User', 'User', 'active', true);
            RAISE NOTICE 'SUCCESS: Profile insert worked!';
            
            -- Clean up
            DELETE FROM public.profiles WHERE id = test_user_id;
            RAISE NOTICE 'Test profile cleaned up.';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Profile insert failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$;

-- ==========================================
-- CHECK PROFILES TABLE STRUCTURE
-- ==========================================

-- Check the profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ==========================================
-- RECREATE POLICIES (if needed)
-- ==========================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate policies with explicit permissions
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT 
    USING (id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT 
    WITH CHECK (id::text = auth.uid()::text);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE 
    USING (id::text = auth.uid()::text)
    WITH CHECK (id::text = auth.uid()::text);

-- ==========================================
-- VERIFY POLICIES WERE CREATED
-- ==========================================

-- Check policies again
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

