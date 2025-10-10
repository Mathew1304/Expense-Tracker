/*
  # Create base database schema

  1. New Tables
    - `roles` - User roles (admin, manager, user, etc.)
    - `profiles` - User profile information
    - `projects` - Construction projects
    - `phases` - Project phases
    - `expenses` - Project expenses and income
    - `materials` - Project materials
    - `phase_photos` - Photos for project phases
    - `phase_comments` - Comments on phases
    - `calendar_events` - Calendar events for projects
    - `users` - Team members assigned to projects
    - `project_shares` - Shareable project links with view tracking

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for authenticated users
    - Public read access for active project shares

  3. Indexes
    - Add indexes on foreign keys and commonly queried fields

  4. Important Notes
    - project_shares uses 8-character IDs for shorter URLs
    - View count tracking included for shared links
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  role_id uuid REFERENCES roles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  status text DEFAULT 'pending',
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create phases table
CREATE TABLE IF NOT EXISTS phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text DEFAULT 'pending',
  start_date date,
  end_date date,
  estimated_cost numeric,
  contractor_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expenses table (handles both expenses and income)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES phases(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  category text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  date date,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit_cost numeric DEFAULT 0,
  qty_required numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create phase_photos table
CREATE TABLE IF NOT EXISTS phase_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES phases(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create phase_comments table
CREATE TABLE IF NOT EXISTS phase_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  color text DEFAULT '#3b82f6',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table (for team members)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role_id uuid REFERENCES roles(id),
  status text DEFAULT 'pending',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_shares table with short IDs
CREATE TABLE IF NOT EXISTS project_shares (
  id text PRIMARY KEY DEFAULT substring(md5(random()::text || clock_timestamp()::text) from 1 for 8),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  share_type text NOT NULL CHECK (share_type IN ('public', 'private')),
  password text,
  expires_at timestamptz NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  share_options jsonb NOT NULL DEFAULT '{
    "expenseDetails": false,
    "phaseDetails": false,
    "materialsDetails": false,
    "incomeDetails": false,
    "phasePhotos": false,
    "teamMembers": false
  }'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_phases_project_id ON phases(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_phase_id ON expenses(phase_id);
CREATE INDEX IF NOT EXISTS idx_materials_project_id ON materials(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_photos_project_id ON phase_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_photos_phase_id ON phase_photos(phase_id);
CREATE INDEX IF NOT EXISTS idx_phase_comments_phase_id ON phase_comments(phase_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_id ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_users_project_id ON users(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_expires_at ON project_shares(expires_at);

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- Policies for roles (readable by all authenticated users)
CREATE POLICY "Roles are viewable by authenticated users"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies for projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Policies for phases
CREATE POLICY "Users can view phases of own projects"
  ON phases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = phases.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create phases for own projects"
  ON phases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = phases.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update phases of own projects"
  ON phases FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = phases.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = phases.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete phases of own projects"
  ON phases FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = phases.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Policies for expenses
CREATE POLICY "Users can view expenses of own projects"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = expenses.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create expenses for own projects"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = expenses.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses of own projects"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = expenses.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = expenses.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses of own projects"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = expenses.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Similar policies for materials, phase_photos, phase_comments, calendar_events, and users tables
CREATE POLICY "Users can manage materials of own projects"
  ON materials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = materials.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = materials.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage phase_photos of own projects"
  ON phase_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = phase_photos.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = phase_photos.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage phase_comments of own projects"
  ON phase_comments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM phases
      JOIN projects ON projects.id = phases.project_id
      WHERE phases.id = phase_comments.phase_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM phases
      JOIN projects ON projects.id = phases.project_id
      WHERE phases.id = phase_comments.phase_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage calendar_events of own projects"
  ON calendar_events FOR ALL
  TO authenticated
  USING (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = calendar_events.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = calendar_events.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage team members of own projects"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = users.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = users.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Policies for project_shares
CREATE POLICY "Users can view shares for own projects"
  ON project_shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_shares.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Public can view active shares"
  ON project_shares FOR SELECT
  TO anon
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create shares for own projects"
  ON project_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_shares.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update shares for own projects"
  ON project_shares FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_shares.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_shares.project_id
      AND projects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete shares for own projects"
  ON project_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_shares.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_share_view_count(share_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE project_shares
  SET view_count = view_count + 1
  WHERE id = share_id
    AND is_active = true
    AND expires_at > now();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_share_view_count(text) TO anon, authenticated;

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('manager', 'Project manager with limited admin access'),
  ('user', 'Regular user')
ON CONFLICT (name) DO NOTHING;