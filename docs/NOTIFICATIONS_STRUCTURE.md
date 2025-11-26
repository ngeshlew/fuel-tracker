# Notifications System Structure Documentation

This document describes the notifications system that was removed from the fuel tracker application. The structure is preserved here for potential future re-implementation.

## Overview

The notifications system provided a comprehensive alert and notification management system with:
- Real-time notification display
- Category-based filtering
- User-configurable settings
- Push notification support
- Quiet hours functionality
- Alert thresholds

## Component Structure

### 1. NotificationsLayout (`src/components/notifications/NotificationsLayout.tsx`)

Main layout component that wraps the notifications page with sidebar and header.

**Structure:**
- Uses `SidebarProvider` for layout
- Includes `AppSidebar` and `Header` components
- Contains tabbed interface with two tabs:
  - Notification Center
  - Settings

**Key Features:**
- Tab-based navigation between notification center and settings
- Responsive layout with max-width container

### 2. NotificationCenter (`src/components/notifications/NotificationCenter.tsx`)

Main component for displaying and managing notifications.

**Features:**
- Filter notifications by category (all, unread, consumption, cost, system, reminder)
- Mark individual notifications as read
- Mark all notifications as read
- Remove individual notifications
- Clear all notifications
- Display notification count badges
- Show relative timestamps using `date-fns`

**Notification Types:**
- `info` - Informational notifications
- `warning` - Warning alerts
- `error` - Error messages
- `success` - Success confirmations
- `consumption` - Energy consumption alerts
- `cost` - Cost-related alerts
- `system` - System notifications
- `reminder` - Reminder notifications

**UI Elements:**
- Tab-based filtering with badge counts
- Scrollable notification list
- Empty state with helpful message
- Action buttons for each notification (mark as read, remove)
- Optional action buttons for notifications with `actionUrl` and `actionText`

### 3. NotificationSettings (`src/components/notifications/NotificationSettings.tsx`)

Comprehensive settings panel for configuring notification preferences.

**Settings Categories:**

#### General Settings
- Email Notifications (toggle)
- Push Notifications (toggle)
- In-App Notifications (toggle)

#### Alert Categories
- Consumption Alerts (toggle)
- Cost Alerts (toggle)
- System Alerts (toggle)
- Reminder Alerts (toggle)

#### Alert Thresholds
- High Usage Threshold (kWh/day) - number input
- High Cost Threshold (£/day) - number input

#### Reminder Settings
- Reminder Frequency - dropdown (daily, weekly, monthly)

#### Quiet Hours
- Enable Quiet Hours (toggle)
- Start Time - time input
- End Time - time input

**Features:**
- Local state management for unsaved changes
- Save/Reset functionality
- Reset to defaults option
- Visual feedback for unsaved changes

### 4. NotificationBell (`src/components/notifications/NotificationBell.tsx`)

Dropdown notification bell component for the header.

**Features:**
- Badge showing unread count
- Dropdown menu with recent notifications (max 5)
- Quick actions (mark as read, remove)
- Link to full notifications page
- Empty state when no notifications

**Usage:**
- Displayed in header when user is authenticated
- Hidden on mobile (sm breakpoint and below)
- Shows unread count badge when count > 0

## Store Structure

### useNotificationStore (`src/store/useNotificationStore.ts`)

Zustand store with persistence for managing notifications state.

**State:**
```typescript
interface NotificationState {
  notifications: Notification[];
  settings: NotificationSettings;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}
```

**Notification Interface:**
```typescript
interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
  persistent: boolean;
  category: 'consumption' | 'cost' | 'system' | 'reminder' | 'alert';
}
```

**Settings Interface:**
```typescript
interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  consumptionAlerts: boolean;
  costAlerts: boolean;
  systemAlerts: boolean;
  reminderAlerts: boolean;
  highUsageThreshold: number; // kWh
  highCostThreshold: number; // £
  reminderFrequency: 'daily' | 'weekly' | 'monthly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}
```

**Actions:**
- `addNotification` - Add a new notification
- `markAsRead` - Mark a notification as read
- `markAllAsRead` - Mark all notifications as read
- `removeNotification` - Remove a notification
- `clearAllNotifications` - Clear all notifications
- `updateSettings` - Update notification settings
- `resetSettings` - Reset settings to defaults
- `checkConsumptionAlerts` - Check and trigger consumption alerts
- `checkCostAlerts` - Check and trigger cost alerts
- `generateReminders` - Generate reminder notifications based on frequency
- `clearError` - Clear error state

**Persistence:**
- Uses Zustand persist middleware
- Custom storage handler to properly serialize/deserialize Date objects
- Stored in localStorage with key: `electricity-tracker-notifications`

## Integration Points

### Header Component
- Displays `NotificationBell` component when authenticated
- Hidden on mobile viewports (sm and below)

### Mobile Navigation
- Shows notification count in mobile menu
- Displays recent notifications in mobile drawer
- Link to notifications page

### App Sidebar
- Navigation item for notifications page
- Route: `/notifications`

### App Routes
- Route: `/notifications` → `NotificationsLayout` (protected)

## Icon Mapping

Notification types map to icons:
- `info` → `info`
- `warning` → `alert-error`
- `error` → `alert-error`
- `success` → `check-circle-2`
- `consumption` → `lightning-energy`
- `cost` → `dollar-currency`
- `system` → `adjust-settings-horizontal`
- `reminder` → `clock-time`
- `alert` → `alert-error`

## Color Mapping

Notification types map to colors:
- `info` → `text-blue-500`
- `warning` → `text-yellow-500`
- `error` → `text-red-500`
- `success` → `text-green-500`

## Default Settings

```typescript
{
  email: true,
  push: true,
  inApp: true,
  consumptionAlerts: true,
  costAlerts: true,
  systemAlerts: true,
  reminderAlerts: true,
  highUsageThreshold: 50, // kWh per day
  highCostThreshold: 10, // £ per day
  reminderFrequency: 'weekly',
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00'
  }
}
```

## Smart Notification Features

### Consumption Alerts
- Automatically checks consumption against threshold
- Triggers warning notification when exceeded
- Links to analytics page

### Cost Alerts
- Automatically checks cost against threshold
- Triggers warning notification when exceeded
- Links to analytics page

### Reminders
- Generates reminders based on configured frequency
- Uses localStorage to track last reminder time
- Provides action link to add reading

## Push Notification Support

The system includes browser push notification support:
- Requests permission when push notifications are enabled
- Creates browser notifications for new alerts
- Uses notification title and message
- Includes icon and tag for notification management

## Future Considerations

If re-implementing this system, consider:
1. Backend API integration for persistent notifications
2. Real-time updates via WebSocket
3. Email notification service integration
4. Mobile push notification support (PWA)
5. Notification grouping and batching
6. Notification templates
7. User preference sync across devices
8. Notification history and archiving

