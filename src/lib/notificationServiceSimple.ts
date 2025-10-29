import { supabase } from './supabase';

export class NotificationServiceSimple {
  // Create a notification for admin when user makes changes
  static async createNotification(params: {
    adminId: string;
    userId: string;
    projectId?: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }) {
    console.log('🔔 [Simple] Creating notification with params:', params);
    
    try {
      const notificationData = {
        admin_id: params.adminId,
        user_id: params.userId,
        project_id: params.projectId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || {},
        is_read: false
      };
      
      console.log('🔔 [Simple] Inserting notification data:', notificationData);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) {
        console.error('❌ [Simple] Error creating notification:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [Simple] Notification created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ [Simple] Exception creating notification:', error);
      return { success: false, error: 'Failed to create notification' };
    }
  }

  // Helper method to get admin ID for a project
  static async getProjectAdminId(projectId: string): Promise<string | null> {
    console.log('🔍 [Simple] Looking up admin for project:', projectId);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        console.error('❌ [Simple] Error fetching project admin:', error);
        return null;
      }

      console.log('✅ [Simple] Found project admin:', data.created_by);
      return data.created_by;
    } catch (error) {
      console.error('❌ [Simple] Exception fetching project admin:', error);
      return null;
    }
  }

  // Helper method to get user name
  static async getUserName(userId: string): Promise<string> {
    console.log('🔍 [Simple] Looking up user name for auth user ID:', userId);
    
    try {
      // First try to find by auth_user_id in users table (admin-created users)
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('auth_user_id', userId)
        .single();

      if (error || !data) {
        console.log('🔍 [Simple] No user found by auth_user_id in users table, trying by id:', userId);
        // Fallback: try by id in case the userId is actually the users table id
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('users')
          .select('name')
          .eq('id', userId)
          .single();

        if (fallbackError || !fallbackData) {
          console.log('🔍 [Simple] No user found in users table, trying profiles table:', userId);
          // Final fallback: try profiles table (self-registered users)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

          if (profileError || !profileData) {
            console.error('❌ [Simple] Error fetching user name from all sources:', error || fallbackError || profileError);
            return `User ${userId.substring(0, 8)}...`;
          }

          console.log('✅ [Simple] Found user name in profiles table:', profileData.full_name);
          return profileData.full_name;
        }

        console.log('✅ [Simple] Found user name by id in users table:', fallbackData.name);
        return fallbackData.name;
      }

      console.log('✅ [Simple] Found user name by auth_user_id in users table:', data.name);
      return data.name;
    } catch (error) {
      console.error('❌ [Simple] Exception fetching user name:', error);
      return `User ${userId.substring(0, 8)}...`;
    }
  }

  // Helper method to get project name
  static async getProjectName(projectId: string): Promise<string> {
    console.log('🔍 [Simple] Looking up project name for ID:', projectId);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        console.error('❌ [Simple] Error fetching project name:', error);
        return `Project ${projectId.substring(0, 8)}...`;
      }

      console.log('✅ [Simple] Found project name:', data.name);
      return data.name;
    } catch (error) {
      console.error('❌ [Simple] Exception fetching project name:', error);
      return `Project ${projectId.substring(0, 8)}...`;
    }
  }

  // Create expense notification (simplified version)
  static async createExpenseNotification(
    userId: string,
    projectId: string,
    type: 'expense_added' | 'expense_updated' | 'expense_deleted' | 'income_added' | 'income_updated' | 'income_deleted',
    expenseData: { amount: number; category: string; description?: string }
  ) {
    console.log('🔔 [Simple] Creating expense notification:', { userId, projectId, type, expenseData });
    
    const adminId = await this.getProjectAdminId(projectId);
    console.log('🔔 [Simple] Project admin ID:', adminId);
    
    if (!adminId) {
      console.error('❌ [Simple] Admin not found for project:', projectId);
      return { success: false, error: 'Admin not found' };
    }

    // Get actual user and project names
    const userName = await this.getUserName(userId);
    const projectName = await this.getProjectName(projectId);

    const isIncome = type.includes('income');
    const actionText = type.includes('added') ? 'added' : 
                     type.includes('updated') ? 'updated' : 'deleted';

    const title = `${isIncome ? 'Income' : 'Expense'} ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`;
    const message = `${userName} ${actionText} ${isIncome ? 'income' : 'an expense'} of ₹${expenseData.amount}`;

    console.log('🔔 [Simple] Notification details:', { adminId, userId, projectId, type, title, message });

    const result = await this.createNotification({
      adminId,
      userId,
      projectId,
      type,
      title,
      message,
      data: {
        amount: expenseData.amount,
        category: expenseData.category,
        description: expenseData.description,
        projectName,
        userName
      }
    });

    console.log('🔔 [Simple] Notification creation result:', result);
    return result;
  }
}

