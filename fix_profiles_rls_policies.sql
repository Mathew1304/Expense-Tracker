-- Fix RLS Policies for Profiles Table
-- This allows users to create and update their own profiles during first login

-- ==========================================
-- PROFILES TABLE POLICIES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id::text = auth.uid()::text);

-- Policy 2: Users can insert their own profile (for first login)
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (id::text = auth.uid()::text);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id::text = auth.uid()::text);

-- ==========================================
-- USERS TABLE POLICIES (if needed)
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own user record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own user record" ON public.users;

-- Policy 1: Users can view their own user record
CREATE POLICY "Users can view their own user record" ON public.users
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR auth_user_id::text = auth.uid()::text
    );

-- Policy 2: Users can update their own user record
CREATE POLICY "Users can update their own user record" ON public.users
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR auth_user_id::text = auth.uid()::text
    );

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check if policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'users')
ORDER BY tablename, policyname;

-- Check if RLS is enabled
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'users');

