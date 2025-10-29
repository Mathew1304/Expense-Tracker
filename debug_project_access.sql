-- Debug Project Access Issues
-- Run this in Supabase SQL Editor to diagnose RLS policy problems

-- 1. Check if the project exists
SELECT 'Project exists check' as check_type, id, name, created_by 
FROM public.projects 
WHERE id = 'e042ccd6-66e9-463f-8791-1502fdcaf59a';

-- 2. Check current user context
SELECT 'Current user context' as check_type, 
       auth.uid() as current_user_id,
       auth.email() as current_user_email;

-- 3. Check if user exists in users table
SELECT 'User in users table' as check_type, 
       u.*,
       p.email as auth_email
FROM public.users u
LEFT JOIN auth.users p ON p.email = u.email
WHERE u.email = auth.email();

-- 4. Check RLS policies on projects table
SELECT 'RLS Policies on projects' as check_type,
       schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname;

-- 5. Test RLS policy evaluation
-- This will show what the RLS policies see
SELECT 'RLS Policy Test' as check_type,
       id,
       name,
       created_by,
       -- Test each policy condition
       (created_by::text = auth.uid()::text) as policy1_own_projects,
       (id IN (
           SELECT project_id FROM public.users 
           WHERE email = auth.email()
           AND project_id IS NOT NULL
       )) as policy2_assigned_projects,
       (id IN (
           SELECT DISTINCT project_id FROM public.phases
           WHERE project_id IN (
               SELECT project_id FROM public.users 
               WHERE email = auth.email()
               AND project_id IS NOT NULL
           )
       )) as policy3_phases_access,
       (id IN (
           SELECT DISTINCT project_id FROM public.expenses
           WHERE project_id IN (
               SELECT project_id FROM public.users 
               WHERE email = auth.email()
               AND project_id IS NOT NULL
           )
       )) as policy4_expenses_access
FROM public.projects 
WHERE id = 'e042ccd6-66e9-463f-8791-1502fdcaf59a';

-- 6. Check if RLS is enabled on projects table
SELECT 'RLS Status' as check_type,
       schemaname,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'projects';

-- 7. If user is not in users table, show how to add them
SELECT 'Fix suggestion' as check_type,
       CASE 
           WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE email = auth.email()) 
           THEN 'User not found in users table. Add them with: INSERT INTO public.users (email, name, project_id) VALUES (''' || auth.email() || ''', ''User Name'', ''e042ccd6-66e9-463f-8791-1502fdcaf59a'');'
           ELSE 'User exists in users table'
       END as suggestion;
