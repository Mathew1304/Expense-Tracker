-- Quick fix for notification system
-- Run this in your Supabase SQL Editor

-- 1. First, let's disable RLS temporarily to test
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 2. Test if we can insert a notification now
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
    'Test Notification - RLS Disabled',
    'This is a test notification with RLS disabled',
    '{"test": true, "rls_disabled": true}',
    false
);

-- 3. Check if the notification was inserted
SELECT * FROM notifications WHERE title = 'Test Notification - RLS Disabled';

-- 4. If that works, let's create a simple RLS policy
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create a simple policy that allows all authenticated users to insert
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON public.notifications;
CREATE POLICY "Allow authenticated users to insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Create a simple policy for reading notifications
DROP POLICY IF EXISTS "Allow admins to read their notifications" ON public.notifications;
CREATE POLICY "Allow admins to read their notifications" ON public.notifications
    FOR SELECT USING (admin_id = auth.uid());

-- 7. Test insertion again with RLS enabled
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
    '9fd6b917-7c2e-4bc5-b6e5-727536af010a',
    'cf5d0bc9-ee55-4aa0-9fd1-9987c807ab9c',
    '2c2e894a-a527-46db-a237-6804d4ee6021',
    'expense_added',
    'Test Notification - RLS Enabled',
    'This is a test notification with RLS enabled',
    '{"test": true, "rls_enabled": true}',
    false
);

-- 8. Check if the notification was inserted
SELECT * FROM notifications WHERE title LIKE 'Test Notification%';

-- 9. Clean up test data
DELETE FROM notifications WHERE title LIKE 'Test Notification%';

