-- Simple Revert - Just Remove the New Policies
-- This will only remove the new policies we added and leave everything else intact
-- Run this SQL in your Supabase SQL Editor

-- ==========================================
-- REMOVE ONLY THE NEW POLICIES WE ADDED
-- ==========================================

-- Remove the new "Users can view projects through phases" policy
DROP POLICY IF EXISTS "Users can view projects through phases" ON public.projects;

-- Remove the new "Users can view projects through expenses" policy
DROP POLICY IF EXISTS "Users can view projects through expenses" ON public.projects;

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check that the new policies are removed
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'projects'
    AND (policyname LIKE '%through phases%' OR policyname LIKE '%through expenses%')
ORDER BY policyname;

-- This should return 0 rows if the policies were successfully removed




