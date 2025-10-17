import { Resend } from "npm:resend";
import { createClient } from "npm:@supabase/supabase-js";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

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
    const { email, name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing email" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("📧 Sending confirmation email via Resend to:", email);

    // Generate confirmation link using Supabase Admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: `${Deno.env.get("SITE_URL") || "http://localhost:5173"}/login`,
      },
    });

    if (error) throw error;

    const confirmationLink = data.properties?.action_link;

    if (!confirmationLink) {
      throw new Error("Failed to generate confirmation link");
    }

    const fromEmail = "BuildMyHomes <no-reply@buildmyhomes.in>";

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; font-weight: bold; color: #667eea;">BMH</span>
              </div>
              <h1 style="color: white; margin: 0;">Confirm Your Email Address</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0;">BuildMyHomes Construction Management</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${name || "User"}!</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Thank you for registering with <strong>BuildMyHomes</strong>! We're excited to have you join our construction management platform.
              </p>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                To complete your registration and activate your account, please click the button below to confirm your email address:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationLink}" style="background:#667eea;color:white;
                   padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;
                   font-weight:600;font-size:16px;">
                   Confirm Email Address
                </a>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Important:</strong> This confirmation link will expire in 24 hours for security purposes.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0;">
                If the button doesn't work, you can copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
                ${confirmationLink}
              </p>
              
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                If you didn't create an account with BuildMyHomes, you can safely ignore this email.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
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

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Confirm your BuildMyHomes account",
      html,
    });

    if (emailError) throw emailError;

    console.log("✅ Confirmation email sent via Resend:", emailData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent successfully via Resend",
        messageId: emailData?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});