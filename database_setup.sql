-- Add comments column to existing project_shares table
ALTER TABLE public.project_shares 
ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.project_shares 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance on comments queries
CREATE INDEX IF NOT EXISTS idx_project_shares_comments ON public.project_shares USING gin (comments) TABLESPACE pg_default;

-- Update the existing trigger function to handle the updated_at column properly
CREATE OR REPLACE FUNCTION update_project_shares_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
