// Use Deno's built-in serve function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, name, password, role, project } = await req.json()

    // Validate required fields
    if (!to || !name || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, name, password' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log('=== EMAIL FUNCTION CALLED ===')
    console.log(`To: ${to}`)
    console.log(`Name: ${name}`)
    console.log(`Password: ${password}`)
    console.log(`Role: ${role}`)
    console.log(`Project: ${project}`)

    const emailContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to BuildMyHomes</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
              <h2 style="color: #495057; margin-top: 0;">Hello ${name}!</h2>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Welcome to BuildMyHomes! Your account has been created successfully. Here are your login details:
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #495057;">Your Account Details:</h3>
                <p><strong>Email:</strong> ${to}</p>
                <p><strong>Password:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
                <p><strong>Role:</strong> ${role || 'User'}</p>
                <p><strong>Assigned Project:</strong> ${project || 'Not Assigned'}</p>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/login" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Login to Your Account
                </a>
              </div>
              
              <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
              
              <p style="color: #6c757d; font-size: 12px; text-align: center; margin: 0;">
                © 2025 BuildMyHomes.in — All Rights Reserved<br>
                This is an automated message, please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Get Gmail SMTP credentials from environment variables
    const GMAIL_USER = Deno.env.get('GMAIL_USER')
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')
    
    console.log('Gmail credentials available:', !!GMAIL_USER, !!GMAIL_APP_PASSWORD)
    
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      console.log('Attempting to send email via Gmail SMTP...')
      
      try {
        // Create the email message in RFC 2822 format
        const emailMessage = [
          `From: BuildMyHomes <${GMAIL_USER}>`,
          `To: ${to}`,
          `Subject: Welcome to BuildMyHomes - Your Account is Ready!`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          ``,
          emailContent
        ].join('\r\n')

        // Base64 encode the email message
        const encodedMessage = btoa(emailMessage)

        // Use Gmail API to send email
        const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getGmailAccessToken(GMAIL_USER, GMAIL_APP_PASSWORD)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: encodedMessage
          }),
        })

        if (!gmailResponse.ok) {
          const errorData = await gmailResponse.text()
          console.error('Gmail API error:', errorData)
          throw new Error(`Gmail API error: ${errorData}`)
        }

        const result = await gmailResponse.json()
        console.log('Email sent successfully via Gmail:', result)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Welcome email sent successfully via Gmail',
            messageId: result.id 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )

      } catch (gmailError) {
        console.error('Gmail SMTP error:', gmailError)
        
        // Fallback: Try using a simpler SMTP approach
        try {
          console.log('Trying alternative SMTP method...')
          
          // Use a third-party SMTP service or direct SMTP connection
          const smtpResponse = await sendViaDirectSMTP(to, name, password, role, project, emailContent, GMAIL_USER, GMAIL_APP_PASSWORD)
          
          if (smtpResponse.success) {
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Welcome email sent successfully via SMTP',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              },
            )
          } else {
            throw new Error(smtpResponse.error)
          }
          
        } catch (smtpError) {
          console.error('SMTP fallback failed:', smtpError)
          
          // Final fallback: Log to console for development
          console.log('=== EMAIL FALLBACK (Gmail service unavailable) ===')
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'User created successfully. Email service temporarily unavailable - credentials logged to console.',
              password: password,
              emailError: gmailError.message
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }
      }
    } else {
      // No Gmail credentials configured - development mode
      console.log('=== EMAIL WOULD BE SENT (No Gmail credentials configured) ===')
      console.log(`To: ${to}`)
      console.log(`Subject: Welcome to BuildMyHomes - Your Account is Ready!`)
      console.log(`Password: ${password}`)
      console.log('=== END EMAIL ===')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email logged to console (no Gmail credentials configured)',
          password: password // Return password for development
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

  } catch (error) {
    console.error('Error in send-welcome-email function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Helper function to get Gmail access token (simplified version)
async function getGmailAccessToken(email: string, appPassword: string): Promise<string> {
  // For Gmail API, you would typically use OAuth2
  // This is a simplified version - in production, you'd want proper OAuth2 flow
  // For now, we'll use the app password directly with SMTP
  throw new Error('Gmail API requires OAuth2 setup - falling back to SMTP')
}

// Helper function for direct SMTP sending
async function sendViaDirectSMTP(
  to: string, 
  name: string, 
  password: string, 
  role: string, 
  project: string, 
  emailContent: string,
  gmailUser: string,
  gmailPassword: string
): Promise<{success: boolean, error?: string}> {
  
  try {
    // Use a third-party email service API that accepts SMTP credentials
    // For example, using EmailJS or similar service
    
    // Alternative: Use a webhook service like Zapier or Make.com
    // that can handle SMTP sending
    
    const webhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL')
    
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          from: gmailUser,
          subject: 'Welcome to BuildMyHomes - Your Account is Ready!',
          html: emailContent,
          credentials: {
            user: gmailUser,
            password: gmailPassword
          }
        }),
      })
      
      if (response.ok) {
        return { success: true }
      } else {
        const errorText = await response.text()
        return { success: false, error: `Webhook error: ${errorText}` }
      }
    }
    
    // If no webhook URL, return error
    return { 
      success: false, 
      error: 'No SMTP service configured. Please set up EMAIL_WEBHOOK_URL or use a different email service.' 
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: `SMTP error: ${error.message}` 
    }
  }
}