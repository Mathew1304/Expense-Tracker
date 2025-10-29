-- Remove the non-admin policy that broke admin access
-- Run this SQL in your Supabase SQL Editor

-- Drop the policy that broke admin access
DROP POLICY IF EXISTS "non_admin_view_assigned_project" ON public.projects;

-- Verify it's removed
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'projects'
    AND policyname LIKE '%non_admin%'
ORDER BY policyname;

-- This should return 0 rows


