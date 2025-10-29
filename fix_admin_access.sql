-- Fix Admin Access Issues
-- This will ensure admin users can access all their data
-- Run this SQL in your Supabase SQL Editor

-- ==========================================
-- CHECK CURRENT POLICIES
-- ==========================================

-- First, let's see what policies exist
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('profiles', 'projects', 'users', 'phases', 'expenses', 'phase_photos')
ORDER BY tablename, policyname;

-- ==========================================
-- FIX PROFILES TABLE ACCESS
-- ==========================================

-- Ensure admins can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid()::text = id::text);

-- ==========================================
-- FIX PROJECTS TABLE ACCESS
-- ==========================================

-- Ensure admins can view their own projects
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
CREATE POLICY "projects_select_own" ON public.projects
    FOR SELECT USING (created_by::text = auth.uid()::text);

-- ==========================================
-- FIX USERS TABLE ACCESS
-- ==========================================

-- Ensure admins can view users they created
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id::text = auth.uid()::text 
            AND profiles.role = 'Admin'
        )
        OR created_by::text = auth.uid()::text
    );

-- ==========================================
-- FIX PHASES TABLE ACCESS
-- ==========================================

-- Ensure admins can view phases for their projects
DROP POLICY IF EXISTS "phases_select_own" ON public.phases;
CREATE POLICY "phases_select_own" ON public.phases
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

-- ==========================================
-- FIX EXPENSES TABLE ACCESS
-- ==========================================

-- Ensure admins can view expenses for their projects
DROP POLICY IF EXISTS "expenses_select_own" ON public.expenses;
CREATE POLICY "expenses_select_own" ON public.expenses
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

-- ==========================================
-- FIX PHASE_PHOTOS TABLE ACCESS
-- ==========================================

-- Ensure admins can view phase photos for their projects
DROP POLICY IF EXISTS "phase_photos_select_own" ON public.phase_photos;
CREATE POLICY "phase_photos_select_own" ON public.phase_photos
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check that the new policies are created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE policyname LIKE '%_select_own'
ORDER BY tablename, policyname;

