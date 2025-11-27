import { Resend } from "npm:resend";
import { createClient } from "npm:@supabase/supabase-js";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

interface EmailChangeNotificationData {
  user_id: string;
  old_email: string;
  new_email: string;
  user_name: string;
  confirm_link?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: EmailChangeNotificationData = await req.json();

    if (!data.user_id || !data.old_email || !data.new_email || !data.user_name) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("📧 Sending email change notification via Resend");

    const fromEmail = "BuildMyHomes <no-reply@buildmyhomes.in>";
    const subject = "🔔 Email Address Change Request - BuildMyHomes";

    // Send notification to old email address
    const oldEmailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                        padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; font-weight: bold; color: #f59e0b;">🔔</span>
              </div>
              <h1 style="color: white; margin: 0;">Email Change Requested</h1>
              <p style="color: #fef3c7; margin: 10px 0 0 0;">BuildMyHomes Construction Management</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${data.user_name}!</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                We're writing to confirm that you recently requested to change your email address for your BuildMyHomes account.
              </p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📧 Email Change Details</h3>
                <div style="space-y: 10px;">
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Previous Email:</strong> <span style="color: #1f2937;">${data.old_email}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #374151;">New Email:</strong> <span style="color: #1f2937;">${data.new_email}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Request Time:</strong> <span style="color: #1f2937;">${new Date().toLocaleString('en-IN')}</span></p>
                </div>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>🔒 Security Notice:</strong> If you didn't request this change, please contact our support team immediately at <a href="mailto:support@buildmyhomes.in" style="color: #d97706;">support@buildmyhomes.in</a>
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                This is an automated notification from BuildMyHomes Construction Management System.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Need help? Contact us at <a href="mailto:support@buildmyhomes.in" style="color: #f59e0b;">support@buildmyhomes.in</a>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
                  © 2025 BuildMyHomes. All rights reserved.<br>
                  Visit us at <a href="https://www.buildmyhomes.in" style="color: #f59e0b;">www.buildmyhomes.in</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send confirmation to new email address
    const newEmailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; font-weight: bold; color: #10b981;">✉️</span>
              </div>
              <h1 style="color: white; margin: 0;">Confirm Your New Email</h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0;">BuildMyHomes Construction Management</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${data.user_name}!</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                You've requested to change your BuildMyHomes account email to this address. Please confirm this change by clicking the button below.
              </p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📧 Email Update Summary</h3>
                <div style="space-y: 10px;">
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Previous Email:</strong> <span style="color: #1f2937;">${data.old_email}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #374151;">New Email:</strong> <span style="color: #1f2937;">${data.new_email}</span></p>
                </div>
              </div>
              
              ${data.confirm_link ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.confirm_link}" style="background:#10b981;color:white;
                   padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;
                   font-weight:600;font-size:16px;">
                   ✅ Confirm Email Change
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0;">
                If the button doesn't work, you can copy and paste this link into your browser:
              </p>
              <p style="color: #10b981; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
                ${data.confirm_link}
              </p>
              ` : `
              <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #065f46; margin: 0; font-size: 14px;">
                  <strong>✅ Confirmation:</strong> Your email change has been processed successfully. You can now use this email address to login to your BuildMyHomes account.
                </p>
              </div>
              `}
              
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                This is an automated notification from BuildMyHomes Construction Management System.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Need help? Contact us at <a href="mailto:support@buildmyhomes.in" style="color: #10b981;">support@buildmyhomes.in</a>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
                  © 2025 BuildMyHomes. All rights reserved.<br>
                  Visit us at <a href="https://www.buildmyhomes.in" style="color: #10b981;">www.buildmyhomes.in</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails
    const emailPromises = [
      // Notification to old email
      resend.emails.send({
        from: fromEmail,
        to: data.old_email,
        subject,
        html: oldEmailHtml,
      }),
      // Confirmation to new email
      resend.emails.send({
        from: fromEmail,
        to: data.new_email,
        subject: "✅ Confirm Your New Email Address - BuildMyHomes",
        html: newEmailHtml,
      })
    ];

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r: any) => r.status === 'fulfilled').length;
    const failed = results.filter((r: any) => r.status === 'rejected').length;

    console.log(`✅ Email change notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email change notifications sent successfully`,
        sentEmails: successful,
        failedEmails: failed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error sending email change notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
