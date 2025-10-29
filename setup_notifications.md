# Notifications System Setup

## Database Setup

Run the following SQL script to set up the notifications table:

```sql
-- Run the contents of notifications_setup.sql in your Supabase SQL editor
```

Or execute the SQL file directly in your Supabase dashboard.

## Features Implemented

### 1. **Real-time Notifications**
- Admin users receive instant notifications when users make changes to projects
- Notifications appear in the header with a bell icon and unread count
- Real-time updates using Supabase subscriptions

### 2. **Notification Types**
- **Expense Activities**: Add, Update, Delete expenses
- **Income Activities**: Add, Update, Delete income
- **Phase Activities**: Add, Update, Delete phases
- **Material Activities**: Add, Update, Delete materials (ready for implementation)
- **Project Updates**: Any changes to project details

### 3. **Notification Features**
- **Unread Count**: Shows number of unread notifications
- **Mark as Read**: Click to mark individual notifications as read
- **Mark All as Read**: Bulk action to mark all notifications as read
- **Real-time Updates**: New notifications appear instantly
- **Rich Data**: Notifications include project names, amounts, user names
- **Time Stamps**: Shows relative time (e.g., "2h ago", "1d ago")

### 4. **Admin Dashboard Integration**
- Notification bell icon in header (only visible to Admin users)
- Dropdown panel with notification list
- Visual indicators for unread notifications
- Responsive design for mobile and desktop

### 5. **User Activity Tracking**
- Automatically tracks user activities in:
  - Expenses page (add/edit/delete expenses and income)
  - Phases page (add/edit/delete phases)
  - Materials page (ready for implementation)
  - Projects page (ready for implementation)

## How It Works

1. **User Action**: When a user (non-admin) performs an action (add/edit/delete)
2. **Notification Creation**: System creates a notification record in the database
3. **Real-time Delivery**: Admin receives the notification instantly via Supabase subscriptions
4. **Visual Alert**: Notification bell shows unread count and highlights new notifications
5. **Admin Review**: Admin can view, mark as read, or mark all as read

## Database Schema

The notifications table includes:
- `id`: Unique identifier
- `admin_id`: ID of the admin who should receive the notification
- `user_id`: ID of the user who performed the action
- `project_id`: ID of the project being modified
- `type`: Type of notification (expense_added, phase_updated, etc.)
- `title`: Notification title
- `message`: Detailed notification message
- `data`: Additional JSON data (amounts, project names, etc.)
- `is_read`: Boolean flag for read status
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Security

- Row Level Security (RLS) enabled
- Admins can only see notifications for their projects
- Users can only see notifications about their own activities
- System can create notifications via service role

## Future Enhancements

- Email notifications
- Push notifications
- Notification preferences
- Notification categories/filtering
- Bulk notification management
- Notification history/archiving

