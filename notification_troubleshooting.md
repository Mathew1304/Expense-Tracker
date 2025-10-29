# 🔔 Notification System Troubleshooting Guide

## Issue: Admin not receiving notifications when users add expenses

### Step 1: Check Database Setup

**First, verify the notifications table exists:**

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run this query to check if the table exists:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'notifications';
```

**If the table doesn't exist, run the setup script:**

```sql
-- Copy and paste the entire contents of notifications_setup.sql
-- This will create the notifications table with proper RLS policies
```

### Step 2: Test the System

**Add debug logging to see what's happening:**

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Add an expense as a user (non-admin)
4. Look for debug messages starting with 🔔, 🧪, ✅, or ❌

### Step 3: Common Issues & Solutions

#### Issue 1: "Notifications table does not exist"
**Solution:** Run the `notifications_setup.sql` script in Supabase

#### Issue 2: "Admin not found for project"
**Possible causes:**
- Project doesn't have a `created_by` field set
- Project ID is incorrect
- Project doesn't exist

**Check:**
```sql
SELECT id, name, created_by FROM projects WHERE id = 'your-project-id';
```

#### Issue 3: "Cannot find user"
**Possible causes:**
- User ID from auth doesn't match user ID in users table
- User doesn't exist in users table

**Check:**
```sql
SELECT id, name, email FROM users WHERE id = 'your-user-id';
```

#### Issue 4: "Permission denied" or RLS errors
**Solution:** Ensure RLS policies are properly set up by running the setup script

### Step 4: Manual Test

**Test notification creation manually:**

1. Go to Supabase SQL Editor
2. Run this test query (replace with actual IDs):

```sql
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
  'admin-user-id',
  'user-id', 
  'project-id',
  'expense_added',
  'Test Notification',
  'This is a test notification',
  '{"test": true}',
  false
);
```

### Step 5: Check Real-time Subscriptions

**Verify the admin is subscribed to notifications:**

1. Check browser console for subscription messages
2. Look for "New notification received" messages
3. Ensure the admin user role is correctly set to 'Admin'

### Step 6: Debug Information

**The debug system will show you:**

- ✅ Whether the notifications table exists
- ✅ Whether the project admin can be found
- ✅ Whether the user can be found
- ✅ Whether a test notification can be created
- ✅ Detailed error messages for any failures

### Quick Fix Checklist

- [ ] Notifications table exists in database
- [ ] RLS policies are set up correctly
- [ ] Project has a `created_by` field set
- [ ] User exists in the users table
- [ ] Admin user role is set to 'Admin'
- [ ] Real-time subscriptions are working
- [ ] No console errors in browser

### Still Having Issues?

If you're still having problems, check the browser console for the debug messages. The system will tell you exactly what's failing and why.

**Common debug messages to look for:**
- 🔔 = Notification system activity
- 🧪 = Debug tests running
- ✅ = Success
- ❌ = Error/failure

