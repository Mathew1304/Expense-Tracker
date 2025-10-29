# How to Fix RLS Policies to Show Project Data

## Problem
The Row Level Security (RLS) policies are blocking users from accessing project data through phases and expenses tables, even though they have `project_id` assigned in the `users` table.

## Solution
Update the RLS policies to allow users to access projects through phases and expenses.

## Steps to Fix

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to the SQL Editor

### 2. Run the SQL Script
- Copy the contents of `fix_rls_policies.sql`
- Paste it into the SQL Editor
- Click "Run" to execute the script

### 3. Verify the Changes
After running the script, you should see output showing all the policies that were created:
```
schemaname | tablename | policyname | permissive | roles | cmd | qual
public     | projects  | Users can view their own projects | ... | ...
public     | projects  | Users can view assigned projects | ... | ...
public     | projects  | Users can view projects through phases | ... | ...
public     | projects  | Users can view projects through expenses | ... | ...
...
```

### 4. Test the Fix
1. Log in as the non-admin user (Accountant)
2. Go to the Projects page
3. You should now see the full project data (name, dates, location, etc.)
4. Go to the Phases page
5. You should see phases with the correct project name
6. Go to the Expenses page
7. You should see expenses with the correct project name

## What Changed

### Before
- Users could only access projects through direct `users` table lookup
- RLS was blocking access to projects through `phases` and `expenses` tables
- This caused incomplete project data to be displayed

### After
- Users can access projects through:
  1. Projects they created (Admin)
  2. Projects assigned to them (via `users` table)
  3. Projects they have phases for (via `phases` table)
  4. Projects they have expenses for (via `expenses` table)

## Additional Notes

- The policies are permissive (multiple policies can grant access)
- The policies use email matching between `auth.users` and `users` tables
- The policies check for `project_id IS NOT NULL` to avoid null errors
- The DISTINCT keyword is used to avoid duplicate results

## Troubleshooting

If the fix doesn't work:

1. **Check if policies were created**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'projects';
   ```

2. **Check if RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects';
   ```

3. **Check user's assigned project**:
   ```sql
   SELECT id, email, project_id FROM public.users WHERE email = 'user@example.com';
   ```

4. **Check if user has phases/expenses**:
   ```sql
   SELECT project_id FROM public.phases WHERE project_id = 'project-id-here';
   SELECT project_id FROM public.expenses WHERE project_id = 'project-id-here';
   ```

## Rollback

If you need to rollback these changes, run:
```sql
DROP POLICY IF EXISTS "Users can view projects through phases" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects through expenses" ON public.projects;
```




