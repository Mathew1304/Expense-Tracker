import { supabase } from './supabase';

export interface WelcomeEmailData {
  email: string;
  name: string;
  password: string;
  role?: string;
  project?: string;
}

export interface PasswordResetEmailData {
  email: string;
  resetUrl: string;
}

export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<boolean> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to: data.email,
        name: data.name,
        password: data.password,
        role: data.role,
        project: data.project,
        is_confirmation: false,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('Welcome email failed:', result.error);
      return false;
    }

    console.log('Welcome email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

// Send custom confirmation email via Resend
export const sendConfirmationEmail = async (email: string, name: string): Promise<boolean> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-confirmation-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: email,
        name: name,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('Confirmation email failed:', result.error);
      return false;
    }

    console.log('Confirmation email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (data: PasswordResetEmailData): Promise<boolean> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email: data.email,
        resetUrl: data.resetUrl,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('Password reset email failed:', result.error);
      return false;
    }

    console.log('Password reset email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

// Utility function to generate a secure temporary password
export const generateTemporaryPassword = (): string => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special char
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Fallback function for when email service is unavailable
export const sendCredentialsEmailFallback = async (emailParams: {
  to_email: string;
  to_name: string;
  password: string;
  role: string;
  project?: string;
}): Promise<string> => {
  // Return a message with the credentials since email failed
  return `Please provide the following credentials manually: Email: ${emailParams.to_email}, Password: ${emailParams.password}, Role: ${emailParams.role}${emailParams.project ? `, Project: ${emailParams.project}` : ''}`;
};

// ✅ FIXED: Function for sending user credentials email (used by Users.tsx)
export const sendUserCredentialsEmail = async (emailParams: {
  to_email: string;
  to_name: string;
  password: string;
  role: string;
  project?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    // ✅ FIXED: Changed from /user-setup to /first-login
    const setupUrl = `${window.location.origin}/first-login?email=${encodeURIComponent(emailParams.to_email)}`;
    
    console.log('📧 Generated setup URL:', setupUrl);
    console.log('📤 Sending email to:', emailParams.to_email);
    
    // Send custom email with setup link
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to_email: emailParams.to_email,
        to_name: emailParams.to_name,
        password: emailParams.password,
        role: emailParams.role,
        project: emailParams.project,
        setup_url: setupUrl, // This is the correct URL now
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Email API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📬 Email service response:', result);
    
    return { 
      success: result.success,
      error: result.success ? undefined : result.error 
    };
  } catch (error) {
    console.error('Email service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Function to be called when creating new admin users
export const createAdminWithWelcomeEmail = async (
  email: string,
  fullName: string,
  role: string = 'Admin',
  projectName?: string
): Promise<{ success: boolean; password?: string; error?: string }> => {
  try {
    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: role,
        setup_completed: false,
      },
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user data returned');
    }

    // Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          full_name: fullName,
          email: email,
          role: role,
          status: 'active',
          setup_completed: false,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

    if (profileError) {
      console.error('Profile creation failed:', profileError);
      // Don't throw here as user is already created
    }

    // Send welcome email
    const emailSent = await sendWelcomeEmail({
      email,
      name: fullName,
      password: temporaryPassword,
      role,
      project: projectName,
    });

    // ✅ FIXED: Changed from /user-setup to /first-login
    const setupUrl = `${window.location.origin}/first-login?email=${encodeURIComponent(email)}`;
    console.log('User setup URL:', setupUrl);
    
    if (!emailSent) {
      console.warn('Welcome email failed to send, but user was created successfully');
    }

    return {
      success: true,
      password: temporaryPassword,
    };
  } catch (error) {
    console.error('Error creating admin with welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};