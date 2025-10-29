-- Fix notifications table structure to match our notification service
-- Run this in your Supabase SQL Editor

-- First, let's see the current table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns to the existing notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT 'Notification',
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remove the action column if it exists (we don't need it)
ALTER TABLE public.notifications DROP COLUMN IF EXISTS action;

-- Update the type column to be more specific
ALTER TABLE public.notifications ALTER COLUMN type TYPE VARCHAR(50);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON public.notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_notifications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_notifications_timestamp_trigger ON public.notifications;

-- Create the trigger
CREATE TRIGGER update_notifications_timestamp_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_timestamp();

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow admins to read their notifications" ON public.notifications;

-- Create new RLS policies
CREATE POLICY "Admins can view their notifications" ON public.notifications
    FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notifications" ON public.notifications
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notifications" ON public.notifications
    FOR DELETE USING (auth.role() = 'authenticated');

-- Test the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test inserting a notification
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
    'This is a test notification after table structure fix',
    '{"test": true, "table_fixed": true}',
    false
);

-- Check if the notification was inserted successfully
SELECT * FROM notifications WHERE title = 'Test Notification';

-- Clean up test data
DELETE FROM notifications WHERE title = 'Test Notification';

