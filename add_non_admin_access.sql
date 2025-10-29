-- Add RLS Policies for Non-Admin Users to View Assigned Projects
-- Run this SQL in your Supabase SQL Editor

-- ==========================================
-- ADD POLICY FOR NON-ADMIN USERS TO VIEW ASSIGNED PROJECTS
-- ==========================================

-- Allow non-admin users to view their assigned project
CREATE POLICY "non_admin_view_assigned_project" ON public.projects
    FOR SELECT USING (
        id IN (
            SELECT project_id FROM public.users 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND project_id IS NOT NULL
        )
    );

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check that the policy is created
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'projects'
    AND policyname LIKE '%non_admin%'
ORDER BY policyname;




