-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'expense_added', 'expense_updated', 'phase_added', 'phase_updated', 'material_added', 'material_updated', 'project_updated', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb, -- Additional data like old/new values, amounts, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON public.notifications(admin_id);
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

CREATE TRIGGER update_notifications_timestamp_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_timestamp();

-- Enable RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admins can see notifications for their projects
CREATE POLICY "Admins can view their notifications" ON public.notifications
    FOR SELECT USING (
        admin_id = auth.uid()
    );

-- Users can see notifications about their activities
CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Only system can insert notifications (via service role)
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Only system can update notifications (via service role)
CREATE POLICY "System can update notifications" ON public.notifications
    FOR UPDATE USING (true);

-- Only system can delete notifications (via service role)
CREATE POLICY "System can delete notifications" ON public.notifications
    FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

