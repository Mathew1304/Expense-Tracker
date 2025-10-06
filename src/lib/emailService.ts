import { supabase } from './supabase';

interface SendCredentialsEmailParams {
  to_email: string;
  to_name: string;
  password: string;
  role: string;
  project?: string;
}

export async function sendUserCredentialsEmail(params: SendCredentialsEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: 'No active session' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/send-user-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge function error:', errorData);

      return {
        success: false,
        error: errorData.error || `Failed to send email: ${response.statusText}`,
      };
    }

    const result = await response.json();
    return { success: true };
  } catch (error) {
    console.error('Email service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function sendCredentialsEmailFallback(params: SendCredentialsEmailParams): Promise<string> {
  const emailContent = `
Subject: Welcome to BuildMyHomes - Your Account is Ready!

Hello ${params.to_name}!

Welcome to BuildMyHomes! Your account has been created successfully.

Login Details:
Email: ${params.to_email}
Password: ${params.password}
Role: ${params.role}
${params.project ? `Project: ${params.project}` : ''}

Login URL: ${window.location.origin}/login

IMPORTANT: Please change your password after your first login for security.

Best regards,
BuildMyHomes Team
  `;

  try {
    await navigator.clipboard.writeText(emailContent);
    return 'Email content copied to clipboard! Please send this manually to the user.';
  } catch (err) {
    return emailContent;
  }
}
