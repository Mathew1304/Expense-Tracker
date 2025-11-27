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

interface ProjectNotificationData {
  project_id: string;
  project_name: string;
  project_description?: string;
  project_location?: string;
  created_by: string;
  creator_name: string;
  creator_email: string;
  status: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: ProjectNotificationData = await req.json();

    if (!data.project_id || !data.project_name || !data.created_by) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("📧 Sending project notification email via Resend");

    // Get all admin users to notify them
    const { data: adminUsers, error: adminError } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("role", "Admin")
      .eq("status", "active");

    if (adminError) throw adminError;

    if (!adminUsers || adminUsers.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Always include the project creator in the notification list
    // Filter to ensure the creator is an admin and included
    const uniqueAdminUsers = adminUsers.filter((admin: any) => 
      admin.id === data.created_by || true // Include all admins, but ensure creator is included
    );

    // If creator is not in the admin list but is an admin, add them
    const creatorIsAdmin = adminUsers.some((admin: any) => admin.id === data.created_by);
    if (!creatorIsAdmin && data.created_by) {
      // Check if creator is actually an admin
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("email, full_name, role")
        .eq("id", data.created_by)
        .eq("role", "Admin")
        .eq("status", "active")
        .single();
      
      if (creatorProfile) {
        uniqueAdminUsers.push(creatorProfile);
      }
    }

    const fromEmail = "BuildMyHomes <no-reply@buildmyhomes.in>";
    const subject = `🏗️ New Project Created: ${data.project_name}`;

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; font-weight: bold; color: #10b981;">🏗️</span>
              </div>
              <h1 style="color: white; margin: 0;">New Project Created</h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0;">BuildMyHomes Construction Management</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello Admin!</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                A new project has been created in the BuildMyHomes system by <strong>${data.creator_name}</strong>.
              </p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📋 Project Details</h3>
                <div style="space-y: 10px;">
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Project Name:</strong> <span style="color: #1f2937;">${data.project_name}</span></p>
                  ${data.project_description ? `<p style="margin: 8px 0;"><strong style="color: #374151;">Description:</strong> <span style="color: #1f2937;">${data.project_description}</span></p>` : ''}
                  ${data.project_location ? `<p style="margin: 8px 0;"><strong style="color: #374151;">Location:</strong> <span style="color: #1f2937;">${data.project_location}</span></p>` : ''}
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Status:</strong> 
                    <span style="background: ${data.status === 'active' ? '#10b981' : '#f59e0b'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                    </span>
                  </p>
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Created by:</strong> <span style="color: #1f2937;">${data.creator_name} (${data.creator_email})</span></p>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SITE_URL") || "http://localhost:5173"}/projects" style="background:#10b981;color:white;
                   padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;
                   font-weight:600;font-size:16px;">
                   📊 View Project Details
                </a>
              </div>
              
              <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #065f46; margin: 0; font-size: 14px;">
                  <strong>📌 Quick Actions:</strong> You can now assign team members, create phases, and track expenses for this project.
                </p>
              </div>
              
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

    // Send email to all admin users (including creator)
    const emailPromises = uniqueAdminUsers.map((user: any) => 
      resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject,
        html,
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r: any) => r.status === 'fulfilled').length;
    const failed = results.filter((r: any) => r.status === 'rejected').length;

    console.log(`✅ Project notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Project notification sent to ${successful} admin(s)`,
        notifiedAdmins: successful,
        failedAdmins: failed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error sending project notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
