import { supabase } from './supabase';

export class NotificationDebugger {
  // Test if notifications table exists
  static async testNotificationsTable() {
    console.log('🧪 Testing notifications table...');
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Notifications table error:', error);
        return { exists: false, error: error.message };
      }

      console.log('✅ Notifications table exists');
      return { exists: true };
    } catch (error) {
      console.error('❌ Exception testing notifications table:', error);
      return { exists: false, error: 'Exception occurred' };
    }
  }

  // Test project admin lookup
  static async testProjectAdminLookup(projectId: string) {
    console.log('🧪 Testing project admin lookup for:', projectId);
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, created_by')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('❌ Project lookup error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Project found:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Exception in project lookup:', error);
      return { success: false, error: 'Exception occurred' };
    }
  }

  // Test user lookup
  static async testUserLookup(userId: string) {
    console.log('🧪 Testing user lookup for:', userId);
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ User lookup error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ User found:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Exception in user lookup:', error);
      return { success: false, error: 'Exception occurred' };
    }
  }

  // Test creating a simple notification
  static async testCreateNotification(adminId: string, userId: string, projectId: string) {
    console.log('🧪 Testing notification creation...');
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          admin_id: adminId,
          user_id: userId,
          project_id: projectId,
          type: 'expense_added',
          title: 'Test Notification',
          message: 'This is a test notification',
          data: { test: true },
          is_read: false
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Notification creation error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Test notification created:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Exception creating notification:', error);
      return { success: false, error: 'Exception occurred' };
    }
  }

  // Run all tests
  static async runAllTests(projectId: string, userId: string) {
    console.log('🧪 Running notification system tests...');
    
    // Test 1: Check if notifications table exists
    const tableTest = await this.testNotificationsTable();
    if (!tableTest.exists) {
      console.error('❌ CRITICAL: Notifications table does not exist!');
      console.log('Please run the notifications_setup.sql script in your Supabase SQL editor.');
      return;
    }

    // Test 2: Check project admin lookup
    const projectTest = await this.testProjectAdminLookup(projectId);
    if (!projectTest.success) {
      console.error('❌ CRITICAL: Cannot find project admin!');
      return;
    }

    // Test 3: Check user lookup
    const userTest = await this.testUserLookup(userId);
    if (!userTest.success) {
      console.error('❌ CRITICAL: Cannot find user!');
      return;
    }

    // Test 4: Try to create a test notification
    const notificationTest = await this.testCreateNotification(
      projectTest.data.created_by,
      userId,
      projectId
    );

    if (notificationTest.success) {
      console.log('✅ All tests passed! Notification system should work.');
    } else {
      console.error('❌ Notification creation failed:', notificationTest.error);
    }
  }
}




