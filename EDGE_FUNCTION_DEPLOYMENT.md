# Deploying the update-user-profile Edge Function

## Prerequisites
- Supabase CLI installed
- Supabase project linked to your local environment

## Steps to Deploy

### 1. Install Supabase CLI (if not already installed)
```powershell
npm install -g supabase
```

### 2. Login to Supabase
```powershell
supabase login
```

### 3. Link your project (if not already linked)
```powershell
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL:
`https://app.supabase.com/project/YOUR_PROJECT_REF`

### 4. Deploy the Edge Function
```powershell
supabase functions deploy update-user-profile
```

### 5. Verify Deployment
After deployment, you can test the function in the Supabase dashboard:
1. Go to Edge Functions in your Supabase dashboard
2. Find `update-user-profile` in the list
3. Check the logs to ensure it's working correctly

## Environment Variables
The Edge Function uses the following environment variables (automatically available in Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (has full access, bypasses RLS)

These are automatically injected by Supabase when the function runs.

## Testing the Fix

### Manual Test Steps:
1. Log in as an admin user
2. Navigate to the Users page
3. Click "Edit" on any user
4. Modify the user's name, email, phone, or role
5. Click "Save"
6. Verify that:
   - The update succeeds without RLS errors
   - A success notification appears
   - The user's profile is updated in the database
   - No errors appear in the browser console

### Troubleshooting:
If you encounter errors:
1. Check the Edge Function logs in Supabase dashboard
2. Verify the function is deployed correctly
3. Ensure the user has admin permissions
4. Check browser console for detailed error messages

## Security Notes
- The Edge Function validates that the requesting user has admin permissions
- The service role key is only used server-side in the Edge Function
- The key is never exposed to the client
- All requests are authenticated via the Authorization header
