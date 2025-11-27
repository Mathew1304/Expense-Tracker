import { supabase } from './supabase';
import { NotificationType } from '../types/notifications';

interface CreateNotificationParams {
  adminId: string;
  userId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  // Create a notification for admin when user makes changes
  static async createNotification(params: CreateNotificationParams) {
    console.log('🔔 Creating notification with params:', params);
    
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
      
      console.log('🔔 Inserting notification data:', notificationData);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating notification:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Notification created successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Exception creating notification:', error);
      return { success: false, error: 'Failed to create notification' };
    }
  }

  // Helper method to get admin ID for a project
  static async getProjectAdminId(projectId: string): Promise<string | null> {
    console.log('🔍 Looking up admin for project:', projectId);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        console.error('❌ Error fetching project admin:', error);
        return null;
      }

      console.log('✅ Found project admin:', data.created_by);
      return data.created_by;
    } catch (error) {
      console.error('❌ Exception fetching project admin:', error);
      return null;
    }
  }

  // Helper method to get user name
  static async getUserName(userId: string): Promise<string> {
    console.log('🔍 Looking up user name for auth user ID:', userId);
    
    try {
      // First try to find by auth_user_id in users table (admin-created users)
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('auth_user_id', userId)
        .single();

      if (!error && data) {
        console.log('✅ Found user name in users table:', data.name);
        return data.name;
      }

      console.log('🔍 No user found by auth_user_id in users table, trying by id:', userId);
      // Fallback: try by id in case the userId is actually the users table id
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .single();

      if (!fallbackError && fallbackData) {
        console.log('✅ Found user name by id in users table:', fallbackData.name);
        return fallbackData.name;
      }
    } catch (error) {
      console.log('❌ Error querying users table:', error);
    }

    // Final fallback: try profiles table
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        console.log('✅ Found user name in profiles table:', profileData.full_name);
        return profileData.full_name;
      }
    } catch (error) {
      console.log('❌ Error querying profiles table:', error);
    }

    console.error('❌ Error fetching user name from all sources');
    return 'Unknown User';
  }

  // Helper method to get admin ID from user's created_by field
  static async getUserAdminId(userId: string): Promise<string | null> {
    console.log('🔍 Looking up admin for user:', userId);
    
    try {
      // Try to find user by auth_user_id in users table (admin-created users)
      const { data, error } = await supabase
        .from('users')
        .select('created_by')
        .eq('auth_user_id', userId)
        .single();

      if (!error && data) {
        console.log('✅ Found user admin by auth_user_id:', data.created_by);
        return data.created_by;
      }

      console.log('🔍 No user found by auth_user_id, trying by id:', userId);
      // Fallback: try by id in case the userId is actually the users table id
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select('created_by')
        .eq('id', userId)
        .single();

      if (!fallbackError && fallbackData) {
        console.log('✅ Found user admin by id:', fallbackData.created_by);
        return fallbackData.created_by;
      } else {
        console.log('❌ Users table queries failed for getUserAdminId');
      }
    } catch (error) {
      console.log('❌ Error querying users table for getUserAdminId:', error);
    }

    console.error('❌ Could not find user admin from any source');
    return null;
  }

  // Helper method to get project name
  static async getProjectName(projectId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        console.error('Error fetching project name:', error);
        return 'Unknown Project';
      }

      return data.name;
    } catch (error) {
      console.error('Error fetching project name:', error);
      return 'Unknown Project';
    }
  }

  // Create expense notification
  static async createExpenseNotification(
    userId: string,
    projectId: string,
    type: 'expense_added' | 'expense_updated' | 'expense_deleted' | 'income_added' | 'income_updated' | 'income_deleted',
    expenseData: { amount: number; category: string; description?: string }
  ) {
    console.log('🔔 Creating expense notification:', { userId, projectId, type, expenseData });
    
    const adminId = await this.getProjectAdminId(projectId);
    console.log('🔔 Project admin ID:', adminId);
    
    if (!adminId) {
      console.error('❌ Admin not found for project:', projectId);
      return { success: false, error: 'Admin not found' };
    }

    const userName = await this.getUserName(userId);
    console.log('🔔 User name:', userName);
    
    const projectName = await this.getProjectName(projectId);
    console.log('🔔 Project name:', projectName);

    const isIncome = type.includes('income');
    const actionText = type.includes('added') ? 'added' : 
                     type.includes('updated') ? 'updated' : 'deleted';

    const title = `${isIncome ? 'Income' : 'Expense'} ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`;
    const message = `${userName} ${actionText} ${isIncome ? 'income' : 'an expense'} of ₹${expenseData.amount} in ${projectName}`;

    console.log('🔔 Notification details:', { adminId, userId, projectId, type, title, message });

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

    console.log('🔔 Notification creation result:', result);
    return result;
  }

  // Create phase notification
  static async createPhaseNotification(
    userId: string,
    projectId: string,
    type: 'phase_added' | 'phase_updated' | 'phase_deleted',
    phaseData: { name: string; status?: string; estimated_cost?: number }
  ) {
    const adminId = await this.getProjectAdminId(projectId);
    if (!adminId) return { success: false, error: 'Admin not found' };

    const userName = await this.getUserName(userId);
    const projectName = await this.getProjectName(projectId);

    const actionText = type === 'phase_added' ? 'added' : 
                     type === 'phase_updated' ? 'updated' : 'deleted';

    const title = `Phase ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`;
    const message = `${userName} ${actionText} phase "${phaseData.name}" in ${projectName}`;

    return this.createNotification({
      adminId,
      userId,
      projectId,
      type,
      title,
      message,
      data: {
        phaseName: phaseData.name,
        status: phaseData.status,
        estimatedCost: phaseData.estimated_cost,
        projectName,
        userName
      }
    });
  }

  // Create material notification
  static async createMaterialNotification(
    userId: string,
    projectId: string,
    type: 'material_added' | 'material_updated' | 'material_deleted',
    materialData: { name: string; quantity?: number; unit?: string }
  ) {
    const adminId = await this.getProjectAdminId(projectId);
    if (!adminId) return { success: false, error: 'Admin not found' };

    const userName = await this.getUserName(userId);
    const projectName = await this.getProjectName(projectId);

    const actionText = type === 'material_added' ? 'added' : 
                     type === 'material_updated' ? 'updated' : 'deleted';

    const title = `Material ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`;
    const message = `${userName} ${actionText} material "${materialData.name}" in ${projectName}`;

    return this.createNotification({
      adminId,
      userId,
      projectId,
      type,
      title,
      message,
      data: {
        materialName: materialData.name,
        quantity: materialData.quantity,
        unit: materialData.unit,
        projectName,
        userName
      }
    });
  }

  // Create bulk expense upload notification
  static async createBulkExpenseUploadNotification(
    userId: string,
    expenseData: Array<{ amount: number; type: 'expense' | 'income'; project_id: string }>
  ) {
    console.log('🔔 Creating bulk expense upload notification:', { userId, count: expenseData.length });
    
    try {
      const adminId = await this.getUserAdminId(userId);
      
      if (!adminId) {
        console.error('❌ Admin not found for user:', userId);
        return { success: false, error: 'Admin not found' };
      }

      const userName = await this.getUserName(userId);
      
      // Calculate totals
      const totalAmount = expenseData.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const expenseCount = expenseData.length;
      const incomeCount = expenseData.filter(e => e.type === 'income').length;
      const expenseOnlyCount = expenseCount - incomeCount;
      const projectId = expenseData[0]?.project_id;

      const title = 'Bulk Expenses Uploaded';
      const message = `${userName} uploaded ${expenseCount} transaction${expenseCount > 1 ? 's' : ''} (${expenseOnlyCount} expense${expenseOnlyCount !== 1 ? 's' : ''}, ${incomeCount} income${incomeCount !== 1 ? 's' : ''}) totaling ₹${totalAmount.toLocaleString('en-IN')}`;

      return await this.createNotification({
        adminId,
        userId,
        projectId,
        type: 'expense_added',
        title,
        message,
        data: {
          count: expenseCount,
          expenseCount: expenseOnlyCount,
          incomeCount,
          totalAmount,
          userName,
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Exception creating bulk expense upload notification:', error);
      return { success: false, error: 'Failed to create notification' };
    }
  }

  // Create project update notification
  static async createProjectUpdateNotification(
    userId: string,
    projectId: string,
    updateData: { field: string; oldValue: any; newValue: any }
  ) {
    const adminId = await this.getProjectAdminId(projectId);
    if (!adminId) return { success: false, error: 'Admin not found' };

    const userName = await this.getUserName(userId);
    const projectName = await this.getProjectName(projectId);

    const title = 'Project Updated';
    const message = `${userName} updated ${updateData.field} in ${projectName}`;

    return this.createNotification({
      adminId,
      userId,
      projectId,
      type: 'project_updated',
      title,
      message,
      data: {
        field: updateData.field,
        oldValue: updateData.oldValue,
        newValue: updateData.newValue,
        projectName,
        userName
      }
    });
  }
}
