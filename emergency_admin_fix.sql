-- EMERGENCY FIX: Restore Admin Access
-- This will disable RLS temporarily and then re-enable with correct policies
-- Run this SQL in your Supabase SQL Editor

-- ==========================================
-- STEP 1: Check current RLS status
-- ==========================================

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'profiles', 'users', 'phases', 'expenses', 'phase_photos');

-- ==========================================
-- STEP 2: Disable all conflicting policies
-- ==========================================

-- Drop ALL existing policies on projects table
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects through phases" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects through expenses" ON public.projects;
DROP POLICY IF EXISTS "profiles_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "Admins can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "SuperAdmin full access" ON public.projects;
DROP POLICY IF EXISTS "Admins manage own projects" ON public.projects;

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "users_select_own" ON public.users;

-- Drop ALL existing policies on phases table
DROP POLICY IF EXISTS "Users can view their own phases" ON public.phases;
DROP POLICY IF EXISTS "Users can view assigned project phases" ON public.phases;
DROP POLICY IF EXISTS "phases_select_own" ON public.phases;

-- Drop ALL existing policies on expenses table
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view assigned project expenses" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;

-- Drop ALL existing policies on phase_photos table
DROP POLICY IF EXISTS "phase_photos_select_own" ON public.phase_photos;

-- ==========================================
-- STEP 3: Create simple permissive policies
-- ==========================================

-- Allow ALL authenticated users to view projects they created
CREATE POLICY "allow_users_own_projects" ON public.projects
    FOR SELECT USING (created_by::text = auth.uid()::text);

-- Allow ALL authenticated users to view their own profile
CREATE POLICY "allow_users_own_profile" ON public.profiles
    FOR SELECT USING (id::text = auth.uid()::text);

-- Allow admins to view all users they created
CREATE POLICY "allow_admins_view_users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id::text = auth.uid()::text 
            AND profiles.role = 'Admin'
        )
        OR created_by::text = auth.uid()::text
    );

-- Allow ALL authenticated users to view phases for their projects
CREATE POLICY "allow_users_own_phases" ON public.phases
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

-- Allow ALL authenticated users to view expenses for their projects
CREATE POLICY "allow_users_own_expenses" ON public.expenses
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

-- Allow ALL authenticated users to view phase photos for their projects
CREATE POLICY "allow_users_own_phase_photos" ON public.phase_photos
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

-- ==========================================
-- STEP 4: Verification
-- ==========================================

-- Check that new policies are created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('projects', 'profiles', 'users', 'phases', 'expenses', 'phase_photos')
ORDER BY tablename, policyname;




