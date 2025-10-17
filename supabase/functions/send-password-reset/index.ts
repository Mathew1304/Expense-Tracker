import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, resetUrl } = await req.json();

    if (!email || !resetUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: email, resetUrl",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("📧 Sending password reset email via Resend to:", email);

    const fromEmail = "BuildMyHomes <no-reply@buildmyhomes.in>";

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <img src="https://www.buildmyhomes.in/logo.png" alt="BuildMyHomes" style="height: 60px; margin-bottom: 20px;" />
              <h1 style="color: white; margin: 0;">Password Reset Request</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0;">BuildMyHomes Construction Management</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Reset Your Password</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                We received a request to reset your password for your BuildMyHomes account. If you didn't make this request, you can safely ignore this email.
              </p>
              
              <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #1f2937; margin: 0 0 15px 0;">
                  <strong>Account Email:</strong> ${email}
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Click the button below to reset your password. This link will expire in 1 hour for security purposes.
                </p>
              </div>
              
              <a href="${resetUrl}" style="background:#dc2626;color:white;
                 padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;
                 font-weight:600;margin:20px 0;">
                 Reset Password
              </a>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Security Note:</strong> If you didn't request this password reset, please contact our support team immediately.
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #667eea; font-size: 12px; word-break: break-all; margin: 10px 0;">
                  ${resetUrl}
                </p>
                <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                  Need help? Contact us at <a href="mailto:support@buildmyhomes.in" style="color: #667eea;">support@buildmyhomes.in</a>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
                  © 2025 BuildMyHomes. All rights reserved.<br>
                  Visit us at <a href="https://www.buildmyhomes.in" style="color: #667eea;">www.buildmyhomes.in</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset Your BuildMyHomes Password",
      html,
    });

    if (error) throw error;

    console.log("✅ Password reset email sent via Resend:", data);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password reset email sent successfully via Resend",
        messageId: data?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});