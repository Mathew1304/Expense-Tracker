-- Test notifications table after structure fix
-- Run this in your Supabase SQL Editor

-- 1. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 3. Test inserting a notification with all required fields
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
    '9fd6b917-7c2e-4bc5-b6e5-727536af010a', -- admin_id
    'cf5d0bc9-ee55-4aa0-9fd1-9987c807ab9c', -- user_id
    '2c2e894a-a527-46db-a237-6804d4ee6021', -- project_id
    'expense_added',
    'Test Notification - Complete',
    'This is a complete test notification with all fields',
    '{"amount": 1000, "category": "Materials", "test": true}',
    false
);

-- 4. Verify the notification was created
SELECT 
    id,
    admin_id,
    user_id,
    project_id,
    type,
    title,
    message,
    data,
    is_read,
    created_at
FROM notifications 
WHERE title = 'Test Notification - Complete';

-- 5. Test updating the notification
UPDATE notifications 
SET is_read = true 
WHERE title = 'Test Notification - Complete';

-- 6. Verify the update
SELECT 
    id,
    title,
    is_read,
    updated_at
FROM notifications 
WHERE title = 'Test Notification - Complete';

-- 7. Clean up test data
DELETE FROM notifications WHERE title = 'Test Notification - Complete';

-- 8. Final verification - table should be empty of test data
SELECT COUNT(*) as remaining_test_notifications 
FROM notifications 
WHERE title LIKE 'Test Notification%';

