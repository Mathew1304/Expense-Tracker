-- Notification System Database Check
-- Run this in your Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if notifications table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public')
    THEN '✅ Notifications table exists'
    ELSE '❌ Notifications table does NOT exist - Run notifications_setup.sql'
  END as table_status;

-- 2. Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies
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
WHERE tablename = 'notifications';

-- 4. Check if there are any existing notifications
SELECT COUNT(*) as notification_count FROM notifications;

-- 5. Check projects table structure (should have created_by field)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
AND column_name = 'created_by';

-- 6. Check users table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('id', 'name', 'email');

-- 7. Sample data check - show a few projects with their admins
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.created_by as admin_id,
  u.name as admin_name,
  u.email as admin_email
FROM projects p
LEFT JOIN users u ON p.created_by = u.id
LIMIT 5;

-- 8. Sample users check
SELECT 
  id,
  name,
  email,
  role_id,
  project_id
FROM users
LIMIT 5;

