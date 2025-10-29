-- Fix RLS policies for notifications system
-- Run this in your Supabase SQL Editor

-- First, let's check the current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('notifications', 'users', 'projects')
ORDER BY tablename, policyname;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admins can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can delete notifications" ON public.notifications;

-- Create proper RLS policies for notifications table
-- Allow admins to see notifications for their projects
CREATE POLICY "Admins can view their notifications" ON public.notifications
    FOR SELECT USING (
        admin_id = auth.uid()
    );

-- Allow users to see notifications about their activities
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Allow authenticated users to insert notifications (for the notification service)
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to update notifications
CREATE POLICY "Authenticated users can update notifications" ON public.notifications
    FOR UPDATE USING (
        auth.role() = 'authenticated'
    );

-- Allow authenticated users to delete notifications
CREATE POLICY "Authenticated users can delete notifications" ON public.notifications
    FOR DELETE USING (
        auth.role() = 'authenticated'
    );

-- Check if users table has proper RLS policies
-- First, let's see what policies exist on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- If users table has restrictive RLS, we might need to adjust it
-- Let's create a policy that allows users to read their own data
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (
        id = auth.uid() OR 
        created_by = auth.uid() OR
        auth.role() = 'service_role'
    );

-- Also allow users to view other users' basic info for notifications
CREATE POLICY "Users can view basic user info" ON public.users
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Check the notifications table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test if we can insert a notification
-- This should work after the RLS policies are fixed
INSERT INTO notifications (
    admin_id, 
    user_id, 
    project_id, 
    type, 
    title, 
    message, 
    data, 
    is_read
) VALUES (
    '9fd6b917-7c2e-4bc5-b6e5-727536af010a', -- admin_id from your logs
    'cf5d0bc9-ee55-4aa0-9fd1-9987c807ab9c', -- user_id from your logs
    '2c2e894a-a527-46db-a237-6804d4ee6021', -- project_id from your logs
    'expense_added',
    'Test Notification',
    'This is a test notification',
    '{"test": true}',
    false
);

-- Check if the test notification was inserted
SELECT * FROM notifications WHERE title = 'Test Notification';

-- Clean up test data
DELETE FROM notifications WHERE title = 'Test Notification';

