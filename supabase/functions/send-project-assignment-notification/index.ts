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

interface ProjectAssignmentData {
  user_id: string;
  user_email: string;
  user_name: string;
  project_names: string[];
  assigned_by: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: ProjectAssignmentData = await req.json();

    if (!data.user_id || !data.user_email || !data.user_name || !data.project_names || data.project_names.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("📧 Sending project assignment notification email via Resend");

    const fromEmail = "BuildMyHomes <no-reply@buildmyhomes.in>";
    const subject = `🏗️ Project Assignment Update - ${data.project_names.length} Project(s) Assigned`;

    const projectListHtml = data.project_names.map(projectName => 
      `<li style="margin: 8px 0; padding: 8px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
        <strong style="color: #0c4a6e;">📍 ${projectName}</strong>
      </li>`
    ).join('');

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                        padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; font-weight: bold; color: #0ea5e9;">🏗️</span>
              </div>
              <h1 style="color: white; margin: 0;">Project Assignment Update</h1>
              <p style="color: #e0f2fe; margin: 10px 0 0 0;">BuildMyHomes Construction Management</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${data.user_name}!</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                You have been assigned to <strong>${data.project_names.length}</strong> new project(s) in the BuildMyHomes system by <strong>${data.assigned_by}</strong>.
              </p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📋 Assigned Projects</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  ${projectListHtml}
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SITE_URL") || "http://localhost:5173"}/projects" style="background:#0ea5e9;color:white;
                   padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;
                   font-weight:600;font-size:16px;">
                   📊 View Your Projects
                </a>
              </div>
              
              <div style="background: #eff6ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #1e40af; margin: 0; font-size: 14px;">
                  <strong>📌 What's Next?</strong> You can now view project details, track progress, manage materials, and collaborate with your team members.
                </p>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>💡 Tip:</strong> Check your dashboard regularly for updates on your assigned projects and pending tasks.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                This is an automated notification from BuildMyHomes Construction Management System.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Need help? Contact us at <a href="mailto:support@buildmyhomes.in" style="color: #0ea5e9;">support@buildmyhomes.in</a>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
                  © 2025 BuildMyHomes. All rights reserved.<br>
                  Visit us at <a href="https://www.buildmyhomes.in" style="color: #0ea5e9;">www.buildmyhomes.in</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to the assigned user
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: data.user_email,
      subject,
      html,
    });

    if (emailError) {
      console.error("❌ Error sending project assignment email:", emailError);
      throw emailError;
    }

    console.log("✅ Project assignment notification sent successfully:", emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Project assignment notification sent to ${data.user_name}`,
        messageId: emailResult?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error sending project assignment notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
