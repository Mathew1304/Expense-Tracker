import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts"

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
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      user_id,
      plan_name,
      plan_id
    } = await req.json()

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Get Razorpay credentials
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Razorpay credentials not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = createHash('sha256')
      .update(body, 'utf8')
      .update(razorpayKeySecret, 'utf8')
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payment signature' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get plan details
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('name', plan_name)
      .single()

    if (planError || !planData) {
      console.error('Plan not found:', planError)
      return new Response(
        JSON.stringify({ success: false, error: 'Plan not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Calculate subscription dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1) // 1 month subscription

    // Create subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: user_id,
        plan_id: planData.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active'
      }])

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create subscription' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    // Update user profile with subscription info
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_type: plan_name,
        plan_id: planData.id,
        subscription_start: startDate.toISOString().split('T')[0],
        subscription_end: endDate.toISOString().split('T')[0],
        status: 'active'
      })
      .eq('id', user_id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    // Log the payment
    const { error: paymentError } = await supabase
      .from('payment_logs')
      .insert([{
        user_id: user_id,
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        amount: planData.price * 100, // amount in paise
        currency: 'INR',
        status: 'success',
        plan_name: plan_name,
        created_at: new Date().toISOString()
      }])

    if (paymentError) {
      console.error('Error logging payment:', paymentError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified and subscription activated',
        subscription: {
          plan_name: plan_name,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error verifying payment:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})