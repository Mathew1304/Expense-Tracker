# How to Fix RLS Policies for User Profile Creation

## Problem
Users are getting a **401 Unauthorized** error when trying to create their profile during first login:
```
Profile insert error: {code: '42501', details: null, hint: null, message: 'new row violates row-level security policy (USING expression) for table "profiles"'}
```

This happens because the `profiles` table has Row Level Security (RLS) enabled but no policies allowing users to create/update their own profiles.

## Solution
Add RLS policies to allow users to create and update their own profiles.

## Steps to Fix

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to the SQL Editor

### 2. Run the SQL Script
- Copy the contents of `fix_profiles_rls_policies.sql`
- Paste it into the SQL Editor
- Click "Run" to execute the script

### 3. Verify the Changes
After running the script, you should see output showing the policies that were created:
```
schemaname | tablename | policyname | permissive | roles | cmd | qual
public     | profiles  | Users can view their own profile | ... | ... | ...
public     | profiles  | Users can insert their own profile | ... | ... | ...
public     | profiles  | Users can update their own profile | ... | ... | ...
public     | users     | Users can view their own user record | ... | ... | ...
public     | users     | Users can update their own user record | ... | ... | ...
```

### 4. Test the Fix
1. Try creating a new user account from the admin email
2. Complete the profile setup form
3. The profile should be created successfully without RLS errors
4. User should be redirected to the dashboard

## What the Policies Do

### Profiles Table Policies
- **SELECT**: Users can view their own profile (`id = auth.uid()`)
- **INSERT**: Users can create their own profile (for first login)
- **UPDATE**: Users can update their own profile

### Users Table Policies
- **SELECT**: Users can view their own user record (by email or auth_user_id)
- **UPDATE**: Users can update their own user record

## Why This Happens

1. **RLS Enabled**: The `profiles` table has Row Level Security enabled
2. **No Policies**: There were no policies allowing users to create profiles
3. **First Login**: During first login, users need to create their profile
4. **Policy Violation**: Without proper policies, the insert operation fails

## Troubleshooting

If the fix doesn't work:

1. **Check if policies were created**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

2. **Check if RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles';
   ```

3. **Check user authentication**:
   ```sql
   SELECT auth.uid(), auth.email();
   ```

4. **Test policy manually**:
   ```sql
   -- This should work after the fix
   INSERT INTO public.profiles (id, email, full_name, role) 
   VALUES (auth.uid(), auth.email(), 'Test User', 'User');
   ```

## Rollback

If you need to rollback these changes:
```sql
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own user record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own user record" ON public.users;
```

## Additional Notes

- The policies use `auth.uid()` to match the authenticated user's ID
- The policies are permissive (multiple policies can grant access)
- The policies handle both email-based and ID-based matching for the users table
- This fix ensures users can complete their profile setup during first login

