import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    console.log('Request body:', requestBody)

    // Get Razorpay credentials from environment
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials not found')
      return new Response(
        JSON.stringify({ success: false, error: 'Razorpay credentials not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Create Razorpay payment link
    const paymentLinkData = {
      amount: requestBody.amount,
      currency: requestBody.currency || 'INR',
      accept_partial: false,
      description: requestBody.description,
      customer: requestBody.customer,
      notify: requestBody.notify,
      reminder_enable: requestBody.reminder_enable,
      notes: requestBody.notes,
      callback_url: requestBody.callback_url,
      callback_method: requestBody.callback_method || 'get'
    }

    console.log('Creating payment link with data:', paymentLinkData)

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`
      },
      body: JSON.stringify(paymentLinkData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Razorpay API error:', response.status, errorText)
      return new Response(
        JSON.stringify({ success: false, error: `Razorpay API error: ${response.status}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: response.status 
        }
      )
    }

    const paymentLink = await response.json()
    console.log('Payment link created:', paymentLink)

    return new Response(
      JSON.stringify({ success: true, payment_link: paymentLink }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error creating payment link:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})