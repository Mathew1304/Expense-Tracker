-- Fix RLS Policies to Allow Users to Access Projects Through Phases and Expenses
-- Run this SQL in your Supabase SQL Editor

-- ==========================================
-- PROJECTS TABLE POLICIES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects through phases" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects through expenses" ON public.projects;

-- Policy 1: Users can view projects they created
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (created_by::text = auth.uid()::text);

-- Policy 2: Users can view projects they are assigned to (via users table)
CREATE POLICY "Users can view assigned projects" ON public.projects
    FOR SELECT USING (
        id IN (
            SELECT project_id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND project_id IS NOT NULL
        )
    );

-- Policy 3: Users can view projects through phases (NEW)
CREATE POLICY "Users can view projects through phases" ON public.projects
    FOR SELECT USING (
        id IN (
            SELECT DISTINCT project_id FROM public.phases
            WHERE project_id IN (
                SELECT project_id FROM public.users 
                WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
                AND project_id IS NOT NULL
            )
        )
    );

-- Policy 4: Users can view projects through expenses (NEW)
CREATE POLICY "Users can view projects through expenses" ON public.projects
    FOR SELECT USING (
        id IN (
            SELECT DISTINCT project_id FROM public.expenses
            WHERE project_id IN (
                SELECT project_id FROM public.users 
                WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
                AND project_id IS NOT NULL
            )
        )
    );

-- ==========================================
-- PHASES TABLE POLICIES (Update if needed)
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own phases" ON public.phases;
DROP POLICY IF EXISTS "Users can view assigned project phases" ON public.phases;

-- Policy 1: Users can view phases for projects they created
CREATE POLICY "Users can view their own phases" ON public.phases
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

-- Policy 2: Users can view phases for projects they are assigned to
CREATE POLICY "Users can view assigned project phases" ON public.phases
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND project_id IS NOT NULL
        )
    );

-- ==========================================
-- EXPENSES TABLE POLICIES (Update if needed)
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view assigned project expenses" ON public.expenses;

-- Policy 1: Users can view expenses for projects they created
CREATE POLICY "Users can view their own expenses" ON public.expenses
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

-- Policy 2: Users can view expenses for projects they are assigned to
CREATE POLICY "Users can view assigned project expenses" ON public.expenses
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND project_id IS NOT NULL
        )
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
WHERE tablename IN ('projects', 'phases', 'expenses')
ORDER BY tablename, policyname;

