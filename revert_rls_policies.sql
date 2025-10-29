-- Revert RLS Policies to Original State
-- Run this SQL in your Supabase SQL Editor

-- ==========================================
-- DROP NEW POLICIES THAT WERE ADDED
-- ==========================================

-- Drop the new policies we added
DROP POLICY IF EXISTS "Users can view projects through phases" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects through expenses" ON public.projects;

-- ==========================================
-- RESTORE ORIGINAL PROJECTS POLICIES
-- ==========================================

-- Drop the modified policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view assigned projects" ON public.projects;

-- Recreate original policies
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (created_by::text = auth.uid()::text);

CREATE POLICY "Users can view assigned projects" ON public.projects
    FOR SELECT USING (
        id IN (
            SELECT project_id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- ==========================================
-- RESTORE ORIGINAL PHASES POLICIES
-- ==========================================

-- Drop the modified policies
DROP POLICY IF EXISTS "Users can view their own phases" ON public.phases;
DROP POLICY IF EXISTS "Users can view assigned project phases" ON public.phases;

-- Recreate original policies
CREATE POLICY "Users can view their own phases" ON public.phases
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can view assigned project phases" ON public.phases
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- ==========================================
-- RESTORE ORIGINAL EXPENSES POLICIES
-- ==========================================

-- Drop the modified policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view assigned project expenses" ON public.expenses;

-- Recreate original policies
CREATE POLICY "Users can view their own expenses" ON public.expenses
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects 
            WHERE created_by::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can view assigned project expenses" ON public.expenses
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check the restored policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('projects', 'phases', 'expenses')
    AND policyname LIKE 'Users can%'
ORDER BY tablename, policyname;

