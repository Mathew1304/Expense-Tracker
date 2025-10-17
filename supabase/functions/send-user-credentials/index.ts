import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@1.1.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Edge Function 'send-user-credentials' is running...");

// Supabase service client (bypasses RLS)
const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const { to_email, password, project, role, to_name, phone, company } = await req.json();
    if (!to_email) return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });

    // Generate password if not provided
    const userPassword = password || Math.random().toString(36).slice(-8) + "A1!";

    // 1️⃣ Create user in Supabase Auth
    const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
      email: to_email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name: to_name, role, phone, company },
    });
    if (createUserError) throw createUserError;

    const authUserId = userData.user.id;

    // 2️⃣ Insert user into profiles table
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: authUserId,
        email: to_email,
        full_name: to_name || null,
        role: role || "user",
        phone: phone || null,
        company: company || null,
        status: "pending",
        created_at: new Date(),
      },
    ]);
    if (profileError) throw profileError;

    // 3️⃣ Send credentials email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("Missing RESEND_API_KEY secret");

    const resend = new Resend(resendApiKey);
    const appName = project || "Construction Tracker";

    const subject = `Your ${appName} Account Credentials`;
    const body = `
      <div style="background-color:#f9fafb; padding:40px 0; font-family:'Segoe UI', Arial, sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 15px rgba(0,0,0,0.05); overflow:hidden;">
          <div style="background:#1d4ed8; padding:20px; text-align:center; color:#ffffff;">
            <h2 style="margin:0; font-size:24px; font-weight:600;">${appName}</h2>
          </div>
          <div style="padding:30px; color:#333;">
            <p>Hello <strong>${to_name || "User"}</strong>,</p>
            <p>Your account has been successfully created. Login credentials:</p>
            <p><strong>Email:</strong> ${to_email}</p>
            <p><strong>Password:</strong> ${userPassword}</p>
            <p><strong>Role:</strong> ${role || "User"}</p>
            <p><a href="https://www.buildmyhomes.in" style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Go to Dashboard</a></p>
            <p style="font-size:14px; color:#666;"><em>We recommend changing your password after first login.</em></p>
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

    return new Response(JSON.stringify({ success: true, message: "User created, profile saved, email sent." }), { status: 200 });

  } catch (error) {
    console.error("Error in send-user-credentials:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), { status: 500 });
  }
});
