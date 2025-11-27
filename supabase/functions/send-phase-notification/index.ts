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

interface PhaseNotificationData {
  phase_id: string;
  phase_name: string;
  project_id: string;
  project_name: string;
  start_date?: string;
  end_date?: string;
  status: string;
  estimated_cost?: number;
  contractor_name?: string;
  created_by: string;
  creator_name: string;
  creator_email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: PhaseNotificationData = await req.json();

    if (!data.phase_id || !data.phase_name || !data.project_id || !data.created_by) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("📧 Sending phase notification email via Resend");

    // First, get the phase creator's profile to check if they're an admin
    const { data: creatorProfile, error: creatorError } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("id", data.created_by)
      .eq("status", "active")
      .single();

    if (creatorError) {
      console.log("Creator profile not found or not active:", creatorError.message);
    }

    // Get users assigned to this specific project
    const { data: projectAssignments, error: assignmentError } = await supabase
      .from("user_projects")
      .select("user_id")
      .eq("project_id", data.project_id);

    if (assignmentError) throw assignmentError;

    // Start with the creator if they're an admin
    const recipientIds: string[] = [];
    if (creatorProfile && creatorProfile.role === "Admin") {
      recipientIds.push(data.created_by);
      console.log("Added creator to notification list:", creatorProfile.email);
    }

    // Add assigned users to the list
    if (projectAssignments && projectAssignments.length > 0) {
      const assignedUserIds = projectAssignments.map((assignment: any) => assignment.user_id);
      // Add assigned users who aren't already in the list
      assignedUserIds.forEach((userId: string) => {
        if (!recipientIds.includes(userId)) {
          recipientIds.push(userId);
        }
      });
      console.log("Added assigned users to notification list:", assignedUserIds);
    }

    if (recipientIds.length === 0) {
      console.log("No valid recipients found for phase notification");
      return new Response(
        JSON.stringify({ success: true, message: "No admins found to notify" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get admin users from the recipient list
    const { data: usersToNotify, error: usersError } = await supabase
      .from("profiles")
      .select("email, full_name, role")
      .eq("role", "Admin")
      .eq("status", "active")
      .in("id", recipientIds);

    if (usersError) throw usersError;

    if (!usersToNotify || usersToNotify.length === 0) {
      console.log("No admin users found in recipient list");
      return new Response(
        JSON.stringify({ success: true, message: "No admins found to notify" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const fromEmail = "BuildMyHomes <no-reply@buildmyhomes.in>";
    const subject = `📋 New Phase Added: ${data.phase_name} in ${data.project_name}`;

    const formatDate = (dateString?: string) => {
      if (!dateString) return "Not set";
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    };

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                        padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <div style="background: white; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px; font-weight: bold; color: #3b82f6;">📋</span>
              </div>
              <h1 style="color: white; margin: 0;">New Phase Created</h1>
              <p style="color: #dbeafe; margin: 10px 0 0 0;">BuildMyHomes Construction Management</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello Admin!</h2>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                A new phase has been added to your project <strong>${data.project_name}</strong> by <strong>${data.creator_name}</strong>.
              </p>
              
              <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📊 Phase Details</h3>
                <div style="space-y: 10px;">
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Phase Name:</strong> <span style="color: #1f2937;">${data.phase_name}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Project:</strong> <span style="color: #1f2937;">${data.project_name}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Start Date:</strong> <span style="color: #1f2937;">${formatDate(data.start_date)}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #374151;">End Date:</strong> <span style="color: #1f2937;">${formatDate(data.end_date)}</span></p>
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Status:</strong> 
                    <span style="background: ${
                      data.status === 'Completed' ? '#10b981' : 
                      data.status === 'In Progress' ? '#3b82f6' : '#6b7280'
                    }; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                      ${data.status}
                    </span>
                  </p>
                  ${data.estimated_cost ? `<p style="margin: 8px 0;"><strong style="color: #374151;">Estimated Cost:</strong> <span style="color: #1f2937;">₹${data.estimated_cost.toLocaleString('en-IN')}</span></p>` : ''}
                  ${data.contractor_name ? `<p style="margin: 8px 0;"><strong style="color: #374151;">Contractor:</strong> <span style="color: #1f2937;">${data.contractor_name}</span></p>` : ''}
                  <p style="margin: 8px 0;"><strong style="color: #374151;">Created by:</strong> <span style="color: #1f2937;">${data.creator_name} (${data.creator_email})</span></p>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SITE_URL") || "http://localhost:5173"}/phases" style="background:#3b82f6;color:white;
                   padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;
                   font-weight:600;font-size:16px;">
                   📈 View Phase Details
                </a>
              </div>
              
              <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #1e40af; margin: 0; font-size: 14px;">
                  <strong>📌 Next Steps:</strong> You can now add expenses, materials, and track progress for this phase.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                This is an automated notification from BuildMyHomes Construction Management System.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Need help? Contact us at <a href="mailto:support@buildmyhomes.in" style="color: #3b82f6;">support@buildmyhomes.in</a>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
                  © 2025 BuildMyHomes. All rights reserved.<br>
                  Visit us at <a href="https://www.buildmyhomes.in" style="color: #3b82f6;">www.buildmyhomes.in</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to all admin users assigned to this project
    const emailPromises = usersToNotify.map((user: any) => 
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

    console.log(`✅ Phase notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Phase notification sent to ${successful} project admin(s)`,
        notifiedUsers: successful,
        failedUsers: failed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Error sending phase notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
