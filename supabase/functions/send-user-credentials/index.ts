import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";

console.log("Edge Function 'send-user-credentials' is running...");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        { 
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { to_email, to_name, password, role, project, setup_url } = await req.json();
    
    if (!to_email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }), 
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Send setup email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not found");
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Email service not configured"
        }), 
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const resend = new Resend(resendApiKey);
    const appName = project || "Construction Tracker";

    const subject = `Welcome to ${appName} - Complete Your Account Setup`;
    const body = `
      <div style="background-color:#f9fafb; padding:40px 0; font-family:'Segoe UI', Arial, sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.05); overflow:hidden;">
          <div style="background:#1d4ed8; padding:20px; text-align:center; color:#ffffff;">
            <h2 style="margin:0; font-size:24px; font-weight:600;">${appName}</h2>
          </div>
          <div style="padding:30px; color:#333;">
            <p>Hello <strong>${to_name || "User"}</strong>,</p>
            <p>You have been invited to join our construction management platform. Complete your account setup to get started.</p>
            <p><strong>Your temporary credentials:</strong></p>
            <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin:20px 0;">
              <p style="margin:5px 0;"><strong>Email:</strong> ${to_email}</p>
              <p style="margin:5px 0;"><strong>Temporary Password:</strong> <code style="background:#e9ecef; padding:2px 6px; border-radius:4px;">${password}</code></p>
              ${role ? `<p style="margin:5px 0;"><strong>Role:</strong> ${role}</p>` : ''}
              ${project ? `<p style="margin:5px 0;"><strong>Project:</strong> ${project}</p>` : ''}
            </div>
            <div style="text-align:center; margin:30px 0;">
              <a href="${setup_url}" style="background:#1d4ed8;color:#fff;padding:15px 30px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
                🚀 Access Your Account & Complete Setup
              </a>
            </div>
            <p style="font-size:14px; color:#666;"><em>This is a one-time setup link. After completing setup, use the regular login page.</em></p>
            <p style="font-size:12px; color:#999; margin-top:20px;">If the button doesn't work, copy and paste this link: ${setup_url}</p>
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: "no-reply@buildmyhomes.in",
      to: to_email,
      subject,
      html: body,
      reply_to: "support@buildmyhomes.in",
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Setup email sent successfully."
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error in send-user-credentials:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Unknown error" 
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});