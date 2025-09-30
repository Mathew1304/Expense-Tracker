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
    const { amount, currency, receipt, notes } = await req.json()

    // Validate required fields
    if (!amount || !currency) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Get Razorpay credentials from environment
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Razorpay credentials not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Create Razorpay order
    const orderData = {
      amount: amount, // amount in paise
      currency: currency,
      receipt: receipt || `order_${Date.now()}`,
      notes: notes || {}
    }

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`
      },
      body: JSON.stringify(orderData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Razorpay API error:', errorData)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create Razorpay order' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    const order = await response.json()

    return new Response(
      JSON.stringify({ success: true, order }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})