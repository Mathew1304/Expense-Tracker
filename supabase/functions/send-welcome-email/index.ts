// supabase/functions/send-welcome-email/index.ts

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
    const { to, name, password, role, project, is_confirmation } = await req.json();

    if (!to || !name || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, name",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("📧 Sending welcome email via Resend to:", to);

    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173";
    const fromEmail = "BuildMyHomes <no-reply@buildmyhomes.in>";

    // Different email content based on whether it's a confirmation or admin creation
    const isConfirmationEmail = is_confirmation === true;
    const emailTitle = isConfirmationEmail ? "Welcome to BuildMyHomes!" : "Welcome to BuildMyHomes";
    const emailSubject = isConfirmationEmail ? "Welcome to BuildMyHomes - Account Confirmed!" : "Welcome to BuildMyHomes - Your Account is Ready!";

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; font-weight: bold; color: #667eea;">BMH</span>
              </div>
              <h1 style="color: white; margin: 0;">${emailTitle}</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0;">Construction Management Platform</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${name}!</h2>
              ${isConfirmationEmail ? `
                <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                  Congratulations! Your email has been confirmed and your BuildMyHomes account is now fully activated. You can now access all features of our construction management platform.
                </p>
              ` : `
                <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                  Welcome to BuildMyHomes! Your account has been created successfully and you now have access to our construction management platform.
                </p>
              `}
              
              <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Your Account Details:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${to}</td>
                  </tr>
                  ${!isConfirmationEmail && password !== 'Your account is now confirmed and ready to use!' ? `
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Temporary Password:</td>
                      <td style="padding: 8px 0; color: #1f2937; font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${password}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Role:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${role || "User"}</td>
                  </tr>
                  ${!isConfirmationEmail ? `
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Project:</td>
                      <td style="padding: 8px 0; color: #1f2937;">${project || "Not Assigned"}</td>
                    </tr>
                  ` : ''}
                </table>
              </div>
              
              ${!isConfirmationEmail && password !== 'Your account is now confirmed and ready to use!' ? `
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>Important:</strong> Please change your password after your first login for security purposes.
                  </p>
                </div>
              ` : `
                <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="color: #15803d; margin: 0; font-size: 14px;">
                    <strong>Account Confirmed!</strong> Your email has been verified and you can now access all platform features.
                  </p>
                </div>
              `}
              
              <a href="${siteUrl}/login" style="background:#667eea;color:white;
                 padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;
                 font-weight:600;margin:20px 0;">
                 ${isConfirmationEmail ? 'Start Using BuildMyHomes' : 'Access Your Account'}
              </a>
              
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

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: emailSubject,
      html,
    });

    if (error) throw error;

    console.log("✅ Email sent via Resend:", data);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${isConfirmationEmail ? 'Confirmation' : 'Welcome'} email sent successfully via Resend`,
        messageId: data?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
