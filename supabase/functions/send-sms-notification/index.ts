import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSNotificationData {
  action: 'add' | 'edit' | 'delete';
  materialName: string;
  userName: string;
  userEmail: string;
  projectName?: string;
  quantity?: number;
  unitCost?: number;
  timestamp: string;
}

interface AdminPhoneNumber {
  id: string;
  phone_number: string;
  name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the request body
    const { notificationData, testMode, testPhoneNumber } = await req.json()

    if (!notificationData) {
      return new Response(
        JSON.stringify({ error: 'Notification data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get admin phone numbers from database (or use test phone number)
    let adminData;
    if (testMode && testPhoneNumber) {
      // Test mode - use the provided test phone number
      adminData = [{
        id: 'test',
        full_name: 'Test Admin',
        phone_number: testPhoneNumber
      }];
    } else {
      // Normal mode - get admin phone numbers from database
      const { data, error: adminError } = await supabaseClient
        .from('profiles')
        .select('id, full_name, phone_number')
        .eq('role', 'Admin')
        .not('phone_number', 'is', null)

      if (adminError) {
        console.error('Error fetching admin phone numbers:', adminError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch admin phone numbers' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      adminData = data;
    }

    if (!adminData || adminData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No admin phone numbers found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send SMS notifications using Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Twilio configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create SMS message
    const message = testMode 
      ? '🔔 Test SMS from Construction Tracker System - SMS notifications are working!'
      : createMaterialNotificationMessage(notificationData)

    // Send SMS to all admin phone numbers
    const results = []
    for (const admin of adminData) {
      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioPhoneNumber,
              To: admin.phone_number,
              Body: message,
            }),
          }
        )

        const result = await response.json()
        
        if (response.ok) {
          console.log(`SMS sent to ${admin.full_name} (${admin.phone_number}): ${result.sid}`)
          results.push({ success: true, adminId: admin.id, messageId: result.sid })
        } else {
          console.error(`Failed to send SMS to ${admin.full_name}:`, result)
          results.push({ success: false, adminId: admin.id, error: result.message })
        }
      } catch (error) {
        console.error(`Error sending SMS to ${admin.full_name}:`, error)
        results.push({ success: false, adminId: admin.id, error: error.message })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`SMS notifications sent: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({ 
        success: successful > 0, 
        results,
        summary: { successful, failed }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in SMS notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Create formatted SMS message for material notifications
 */
function createMaterialNotificationMessage(data: SMSNotificationData): string {
  const actionText = {
    add: 'ADDED',
    edit: 'UPDATED', 
    delete: 'DELETED'
  }[data.action]

  const timestamp = new Date(data.timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'short',
    timeStyle: 'short'
  })

  let message = `🔔 MATERIAL ${actionText}\n\n`
  message += `📦 Material: ${data.materialName}\n`
  message += `👤 User: ${data.userName} (${data.userEmail})\n`
  
  if (data.projectName) {
    message += `🏗️ Project: ${data.projectName}\n`
  }
  
  if (data.action !== 'delete' && data.quantity && data.unitCost) {
    message += `📊 Qty: ${data.quantity}\n`
    message += `💰 Cost: ₹${data.unitCost.toLocaleString('en-IN')}\n`
  }
  
  message += `⏰ Time: ${timestamp}\n\n`
  message += `Construction Tracker System`

  return message
}
