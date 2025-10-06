import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";

console.log("Edge Function 'send-user-credentials' is running...");

serve(async (req) => {
  // ✅ Handle preflight (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const { to_email, password, project, role, to_name } = await req.json();

    if (!to_email || !password) {
      return new Response(JSON.stringify({ error: "Missing email or password" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY secret" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const resend = new Resend(resendApiKey);

    const appName = project || "Construction Tracker";
    const subject = `Your ${appName} Account Credentials`;

    // ✅ Professional, mobile-friendly HTML template
    const body = `
      <div style="background-color:#f9fafb; padding:40px 0; font-family:'Segoe UI', Arial, sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.05); overflow:hidden;">
          <div style="background:#1d4ed8; padding:20px; text-align:center; color:#ffffff;">
            <h2 style="margin:0; font-size:24px; font-weight:600;">${appName}</h2>
            <p style="margin:5px 0 0; font-size:14px; opacity:0.9;">Your trusted platform</p>
          </div>

          <div style="padding:30px;">
            <p style="font-size:16px; color:#333333;">Hello <strong>${to_name || "User"}</strong>,</p>
            <p style="font-size:15px; line-height:1.6; color:#555;">
              Welcome to <strong>${appName}</strong>! Your account has been successfully created.  
              Below are your login credentials:
            </p>

            <div style="background:#f3f4f6; padding:15px 20px; border-radius:8px; margin:20px 0;">
              <p style="margin:8px 0; font-size:15px;"><strong>Email:</strong> ${to_email}</p>
              <p style="margin:8px 0; font-size:15px;"><strong>Password:</strong> ${password}</p>
              <p style="margin:8px 0; font-size:15px;"><strong>Role:</strong> ${role || "User"}</p>
            </div>

            <p style="font-size:15px; line-height:1.6; color:#555;">
              You can log in anytime using the button below:
            </p>

            <div style="text-align:center; margin:25px 0;">
              <a href="https://www.buildmyhomes.in" target="_blank" 
                style="display:inline-block; background:#1d4ed8; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-size:15px;">
                Go to Dashboard
              </a>
            </div>

            <p style="font-size:14px; color:#666;">
              <em>We recommend changing your password after your first login for security purposes.</em>
            </p>
          </div>

          <div style="background:#f3f4f6; padding:15px; text-align:center; font-size:13px; color:#777;">
            <p style="margin:0;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            <p style="margin:5px 0 0;">Need help? Contact 
              <a href="mailto:support@buildmyhomes.in" style="color:#1d4ed8; text-decoration:none;">support@buildmyhomes.in</a>
            </p>
          </div>
        </div>
      </div>
    `;

    const data = await resend.emails.send({
      from: "no-reply@buildmyhomes.in",
      to: to_email,
      subject,
      html: body,
      reply_to: "support@buildmyhomes.in",
    });

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", data }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-user-credentials:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
