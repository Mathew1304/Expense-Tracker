# SMS Notifications Setup

This application now includes SMS notifications for material changes using Twilio via Supabase Edge Functions.

## Setup Instructions

### 1. Create Twilio Account
1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a free account
3. Verify your phone number

### 2. Get Twilio Credentials
1. In the Twilio Console, go to Account → API Keys & Tokens
2. Copy your Account SID and Auth Token
3. Purchase a phone number from Phone Numbers → Manage → Buy a number

### 3. Supabase Environment Variables
Configure these environment variables in your Supabase project:

```bash
# In Supabase Dashboard → Settings → Edge Functions → Environment Variables
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Deploy Edge Function
The SMS notification Edge Function is already created at:
```
supabase/functions/send-sms-notification/index.ts
```

Deploy it using:
```bash
supabase functions deploy send-sms-notification
```

### 5. Database Setup
Make sure admin users have phone numbers in their profiles:

```sql
-- Add phone_number column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Update admin profiles with phone numbers
UPDATE profiles 
SET phone_number = '+1234567890' 
WHERE role = 'Admin' AND phone_number IS NULL;
```

## Features

- **Add Material**: Admins receive SMS when users add materials
- **Edit Material**: Admins receive SMS when users edit materials  
- **Delete Material**: Admins receive SMS when users delete materials
- **Server-side Processing**: SMS sending handled securely via Edge Functions
- **Test Functionality**: Test SMS sending from Settings page

## SMS Message Format

```
🔔 MATERIAL ADDED

📦 Material: Cement
👤 User: John Doe (john@example.com)
🏗️ Project: Office Building
📊 Qty: 100
💰 Cost: ₹500
⏰ Time: 15/01/2024, 2:30 PM

Construction Tracker System
```

## Testing

Use the test function in the Settings page:

1. Go to Settings → SMS Testing tab
2. Enter a phone number (include country code)
3. Click "Send Test SMS"
4. Check your phone for the test message

## Architecture

```
Client (Materials.tsx) 
    ↓
SMS Service (smsService.ts)
    ↓
Supabase Edge Function (send-sms-notification)
    ↓
Twilio API
    ↓
SMS Delivery
```

## Troubleshooting

1. **SMS not sending**: Check Supabase Edge Function logs
2. **Admin not receiving**: Ensure admin has phone_number in database
3. **Edge Function errors**: Check Twilio credentials in Supabase environment variables
4. **Rate limits**: Twilio has rate limits on free accounts
5. **International**: Ensure phone numbers include country code (+1 for US)

## Security Benefits

- **Server-side Processing**: Twilio credentials never exposed to client
- **Authentication**: Edge Functions require proper authentication
- **Rate Limiting**: Server-side rate limiting possible
- **Logging**: Centralized logging and monitoring
- **Scalability**: Edge Functions auto-scale with demand

## Cost Considerations

- Twilio charges per SMS sent
- Free trial includes $15 credit
- SMS costs vary by country (typically $0.0075 per SMS)
- Edge Functions have their own pricing (very minimal)
- Consider implementing rate limiting for production use
