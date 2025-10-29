import { supabase } from './supabase';

export interface SMSNotificationData {
  action: 'add' | 'edit' | 'delete';
  materialName: string;
  userName: string;
  userEmail: string;
  projectName?: string;
  quantity?: number;
  unitCost?: number;
  timestamp: string;
}

export interface AdminPhoneNumber {
  id: string;
  phone_number: string;
  name: string;
}

/**
 * Send SMS notification to admin about material changes via Edge Function
 */
export async function sendMaterialNotificationSMS(
  adminPhoneNumbers: AdminPhoneNumber[],
  notificationData: SMSNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-sms-notification', {
      body: { notificationData }
    });

    if (error) {
      console.error('Error calling SMS Edge Function:', error);
      return { success: false, error: error.message };
    }

    if (data?.success) {
      console.log('SMS notifications sent successfully:', data.summary);
      return { success: true };
    } else {
      console.error('SMS Edge Function returned error:', data?.error);
      return { success: false, error: data?.error || 'Unknown error' };
    }

  } catch (error) {
    console.error('Error sending SMS notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get admin phone numbers from database
 */
export async function getAdminPhoneNumbers(): Promise<AdminPhoneNumber[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone_number')
      .eq('role', 'Admin')
      .not('phone_number', 'is', null);

    if (error) {
      console.error('Error fetching admin phone numbers:', error);
      return [];
    }

    return data?.map(admin => ({
      id: admin.id,
      phone_number: admin.phone_number,
      name: admin.full_name || 'Admin'
    })) || [];

  } catch (error) {
    console.error('Error getting admin phone numbers:', error);
    return [];
  }
}

/**
 * Test SMS service configuration via Edge Function
 */
export async function testSMSService(testPhoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Create test notification data
    const testNotificationData: SMSNotificationData = {
      action: 'add',
      materialName: 'Test Material',
      userName: 'Test User',
      userEmail: 'test@example.com',
      projectName: 'Test Project',
      quantity: 1,
      unitCost: 100,
      timestamp: new Date().toISOString()
    };

    // Temporarily override admin phone numbers for testing
    const testAdminPhoneNumbers = [{
      id: 'test',
      phone_number: testPhoneNumber,
      name: 'Test Admin'
    }];

    // Call the Edge Function with test data
    const { data, error } = await supabase.functions.invoke('send-sms-notification', {
      body: { 
        notificationData: testNotificationData,
        testMode: true,
        testPhoneNumber: testPhoneNumber
      }
    });

    if (error) {
      console.error('Test SMS failed:', error);
      return { success: false, error: error.message };
    }

    if (data?.success) {
      console.log('Test SMS sent successfully');
      return { success: true };
    } else {
      return { success: false, error: data?.error || 'Unknown error' };
    }

  } catch (error) {
    console.error('Test SMS failed:', error);
    return { success: false, error: error.message };
  }
}
