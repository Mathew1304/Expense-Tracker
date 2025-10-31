export interface Notification {
  id: string;
  admin_id: string;
  user_id: string;
  project_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'phase_added'
  | 'phase_updated'
  | 'phase_deleted'
  | 'material_added'
  | 'material_updated'
  | 'material_deleted'
  | 'project_updated'
  | 'project_created'
  | 'user_joined'
  | 'user_updated'
  | 'income_added'
  | 'income_updated'
  | 'income_deleted';

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  clearNotifications: () => void;
}




