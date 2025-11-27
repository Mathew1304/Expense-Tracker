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

// Function to create user without email confirmation (for UserFirstLogin flow)
export const createUserWithoutEmailConfirmation = async (
  email: string,
  password: string,
  fullName: string,
  role: string,
  permissions: string[] = []
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    // Call server function to create user with admin privileges
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-without-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        role,
        permissions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server function error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create user');
    }

    console.log('Auth user created without email confirmation:', result.user.id);

    return {
      success: true,
      user: result.user,
    };
  } catch (error) {
    console.error('Error creating user without email confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

// Send project notification email
export const sendProjectNotificationEmail = async (
  projectId: string,
  projectName: string,
  projectDescription?: string,
  projectLocation?: string,
  createdBy: string,
  creatorName: string,
  creatorEmail: string,
  status: string = 'pending'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-project-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        project_name: projectName,
        project_description: projectDescription,
        project_location: projectLocation,
        created_by: createdBy,
        creator_name: creatorName,
        creator_email: creatorEmail,
        status,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Project notification API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📬 Project notification response:', result);
    
    return { 
      success: result.success,
      error: result.success ? undefined : result.error 
    };
  } catch (error) {
    console.error('Project notification service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Send phase notification email
export const sendPhaseNotificationEmail = async (
  phaseId: string,
  phaseName: string,
  projectId: string,
  projectName: string,
  startDate?: string,
  endDate?: string,
  status: string = 'Not Started',
  estimatedCost?: number,
  contractorName?: string,
  createdBy: string,
  creatorName: string,
  creatorEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-phase-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        phase_id: phaseId,
        phase_name: phaseName,
        project_id: projectId,
        project_name: projectName,
        start_date: startDate,
        end_date: endDate,
        status,
        estimated_cost: estimatedCost,
        contractor_name: contractorName,
        created_by: createdBy,
        creator_name: creatorName,
        creator_email: creatorEmail,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Phase notification API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📬 Phase notification response:', result);
    
    return { 
      success: result.success,
      error: result.success ? undefined : result.error 
    };
  } catch (error) {
    console.error('Phase notification service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Send email change notification
export const sendEmailChangeNotification = async (
  userId: string,
  oldEmail: string,
  newEmail: string,
  userName: string,
  confirmLink?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-change-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: userId,
        old_email: oldEmail,
        new_email: newEmail,
        user_name: userName,
        confirm_link: confirmLink,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Email change notification API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📬 Email change notification response:', result);
    
    return { 
      success: result.success,
      error: result.success ? undefined : result.error 
    };
  } catch (error) {
    console.error('Email change notification service error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};