# WebSocket Frontend Integration Guide

This guide shows how to integrate real-time WebSocket functionality into your frontend application.

## Installation

```bash
npm install socket.io-client
```

## Basic Setup

### 1. Create WebSocket Service

```typescript
// services/websocket/realtime.service.ts
import { createRealtimeClient, RealtimeClient } from '@clients-plus/websocket-sdk';

class RealtimeService {
  private client: RealtimeClient | null = null;
  private token: string | null = null;

  public async connect(authToken: string): Promise<void> {
    this.token = authToken;
    
    this.client = createRealtimeClient({
      url: process.env.REACT_APP_WS_URL || 'http://localhost:3000',
      token: authToken,
      autoReconnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    await this.client.connect();
    this.setupGlobalListeners();
  }

  public disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  public getClient(): RealtimeClient | null {
    return this.client;
  }

  private setupGlobalListeners(): void {
    if (!this.client) return;

    this.client.on('connection:established', (data) => {
      console.log('✅ WebSocket connected:', data);
    });

    this.client.on('connection:lost', (data) => {
      console.warn('⚠️ WebSocket disconnected:', data);
    });

    this.client.on('connection:error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    this.client.on('connection:restored', (data) => {
      console.log('🔄 WebSocket reconnected:', data);
    });
  }
}

export const realtimeService = new RealtimeService();
```

### 2. React Hook for Real-time Data

```typescript
// hooks/useRealtime.ts
import { useEffect, useState, useCallback } from 'react';
import { realtimeService } from '../services/websocket/realtime.service';
import { Client, Appointment, Staff, Notification } from '@clients-plus/websocket-sdk';

// Hook for real-time appointments
export function useRealtimeAppointments(filters = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const client = realtimeService.getClient();

  useEffect(() => {
    if (!client) return;

    // Subscribe to appointment updates
    client.subscribeToAppointments(filters);

    // Set up event listeners
    const handleCreated = (appointment: Appointment) => {
      setAppointments(prev => [...prev, appointment]);
    };

    const handleUpdated = (appointment: Appointment) => {
      setAppointments(prev => 
        prev.map(a => a.id === appointment.id ? appointment : a)
      );
    };

    const handleCancelled = (data: any) => {
      setAppointments(prev => 
        prev.map(a => a.id === data.id ? { ...a, status: 'CANCELLED' } : a)
      );
    };

    const handleStatusChanged = (data: any) => {
      setAppointments(prev => 
        prev.map(a => a.id === data.id ? { ...a, status: data.status } : a)
      );
    };

    client.onAppointmentCreated(handleCreated);
    client.onAppointmentUpdated(handleUpdated);
    client.onAppointmentCancelled(handleCancelled);
    client.onAppointmentStatusChanged(handleStatusChanged);

    setLoading(false);

    // Cleanup
    return () => {
      client.unsubscribeFromAppointments();
      client.off('appointment:created', handleCreated);
      client.off('appointment:updated', handleUpdated);
      client.off('appointment:cancelled', handleCancelled);
      client.off('appointment:status-changed', handleStatusChanged);
    };
  }, [client, JSON.stringify(filters)]);

  return { appointments, loading };
}

// Hook for real-time clients
export function useRealtimeClients(filters = {}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const client = realtimeService.getClient();

  useEffect(() => {
    if (!client) return;

    client.subscribeToClients(filters);

    const handleCreated = (newClient: Client) => {
      setClients(prev => [...prev, newClient]);
    };

    const handleUpdated = (updatedClient: Client) => {
      setClients(prev => 
        prev.map(c => c.id === updatedClient.id ? updatedClient : c)
      );
    };

    const handleDeleted = (data: any) => {
      setClients(prev => prev.filter(c => c.id !== data.id));
    };

    const handleCheckedIn = (data: any) => {
      setClients(prev => 
        prev.map(c => c.id === data.id ? { ...c, status: 'CHECKED_IN' } : c)
      );
    };

    client.onClientCreated(handleCreated);
    client.onClientUpdated(handleUpdated);
    client.onClientDeleted(handleDeleted);
    client.onClientCheckedIn(handleCheckedIn);

    setLoading(false);

    return () => {
      client.unsubscribeFromClients();
      client.off('client:created', handleCreated);
      client.off('client:updated', handleUpdated);
      client.off('client:deleted', handleDeleted);
      client.off('client:checked-in', handleCheckedIn);
    };
  }, [client, JSON.stringify(filters)]);

  return { clients, loading };
}

// Hook for real-time staff
export function useRealtimeStaff(filters = {}) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const client = realtimeService.getClient();

  useEffect(() => {
    if (!client) return;

    client.subscribeToStaff(filters);

    const handleCreated = (newStaff: Staff) => {
      setStaff(prev => [...prev, newStaff]);
    };

    const handleUpdated = (updatedStaff: Staff) => {
      setStaff(prev => 
        prev.map(s => s.id === updatedStaff.id ? updatedStaff : s)
      );
    };

    const handleStatusChanged = (data: any) => {
      setStaff(prev => 
        prev.map(s => s.id === data.id ? { ...s, currentStatus: data.currentStatus } : s)
      );
    };

    const handleCheckedIn = (data: any) => {
      setStaff(prev => 
        prev.map(s => s.id === data.id ? { ...s, currentStatus: 'AVAILABLE' } : s)
      );
    };

    client.onStaffCreated(handleCreated);
    client.onStaffUpdated(handleUpdated);
    client.onStaffStatusChanged(handleStatusChanged);
    client.onStaffCheckedIn(handleCheckedIn);

    setLoading(false);

    return () => {
      client.unsubscribeFromStaff();
      client.off('staff:created', handleCreated);
      client.off('staff:updated', handleUpdated);
      client.off('staff:status-changed', handleStatusChanged);
      client.off('staff:checked-in', handleCheckedIn);
    };
  }, [client, JSON.stringify(filters)]);

  return { staff, loading };
}

// Hook for real-time notifications
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const client = realtimeService.getClient();

  useEffect(() => {
    if (!client) return;

    client.subscribeToNotifications();

    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      if (!notification.isRead) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleNotificationRead = (data: any) => {
      setNotifications(prev => 
        prev.map(n => n.id === data.notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleBulkNotifications = (data: any) => {
      setNotifications(prev => [...data.notifications, ...prev]);
      const unreadInBatch = data.notifications.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(prev => prev + unreadInBatch);
    };

    client.onNotification(handleNotification);
    client.onNotificationRead(handleNotificationRead);
    client.onBulkNotifications(handleBulkNotifications);

    return () => {
      client.off('notification:new', handleNotification);
      client.off('notification:marked-read', handleNotificationRead);
      client.off('notifications:bulk', handleBulkNotifications);
    };
  }, [client]);

  const markAsRead = useCallback((notificationId: string) => {
    if (client) {
      client.markNotificationAsRead(notificationId);
    }
  }, [client]);

  return { 
    notifications, 
    unreadCount, 
    markAsRead 
  };
}
```

### 3. React Components

```typescript
// components/RealtimeDashboard.tsx
import React from 'react';
import { 
  useRealtimeAppointments, 
  useRealtimeClients, 
  useRealtimeStaff,
  useRealtimeNotifications 
} from '../hooks/useRealtime';

const RealtimeDashboard: React.FC = () => {
  const { appointments, loading: appointmentsLoading } = useRealtimeAppointments({
    dateRange: {
      start: new Date(),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
    }
  });

  const { clients, loading: clientsLoading } = useRealtimeClients({
    status: ['ACTIVE']
  });

  const { staff, loading: staffLoading } = useRealtimeStaff({
    status: ['ACTIVE']
  });

  const { notifications, unreadCount, markAsRead } = useRealtimeNotifications();

  if (appointmentsLoading || clientsLoading || staffLoading) {
    return <div>Loading real-time data...</div>;
  }

  return (
    <div className="realtime-dashboard">
      <div className="dashboard-header">
        <h1>Live Dashboard</h1>
        <div className="notification-indicator">
          {unreadCount > 0 && (
            <span className="badge">{unreadCount}</span>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Live Appointments */}
        <div className="dashboard-card">
          <h2>Today's Appointments ({appointments.length})</h2>
          <div className="appointments-list">
            {appointments.map(appointment => (
              <div key={appointment.id} className="appointment-item">
                <div className="appointment-time">
                  {appointment.startTime} - {appointment.endTime}
                </div>
                <div className="appointment-client">
                  {appointment.client?.firstName} {appointment.client?.lastName}
                </div>
                <div className={`appointment-status status-${appointment.status.toLowerCase()}`}>
                  {appointment.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Staff Status */}
        <div className="dashboard-card">
          <h2>Staff Status ({staff.length})</h2>
          <div className="staff-list">
            {staff.map(member => (
              <div key={member.id} className="staff-item">
                <div className="staff-name">
                  {member.firstName} {member.lastName}
                </div>
                <div className={`staff-status status-${member.currentStatus?.toLowerCase()}`}>
                  {member.currentStatus || 'OFF_DUTY'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Clients */}
        <div className="dashboard-card">
          <h2>Recent Clients ({clients.length})</h2>
          <div className="clients-list">
            {clients.slice(0, 10).map(client => (
              <div key={client.id} className="client-item">
                <div className="client-name">
                  {client.firstName} {client.lastName}
                </div>
                <div className="client-info">
                  Last visit: {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'Never'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Notifications */}
        <div className="dashboard-card">
          <h2>Notifications</h2>
          <div className="notifications-list">
            {notifications.slice(0, 5).map(notification => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">
                  {new Date(notification.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeDashboard;
```

### 4. App Integration

```typescript
// App.tsx
import React, { useEffect, useState } from 'react';
import { realtimeService } from './services/websocket/realtime.service';
import { useAuth } from './hooks/useAuth';
import RealtimeDashboard from './components/RealtimeDashboard';

const App: React.FC = () => {
  const { user, token } = useAuth();
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    if (token && user) {
      // Connect to WebSocket when user is authenticated
      realtimeService.connect(token)
        .then(() => {
          console.log('WebSocket connected');
          setWsConnected(true);
        })
        .catch(error => {
          console.error('Failed to connect WebSocket:', error);
        });

      // Disconnect on unmount
      return () => {
        realtimeService.disconnect();
        setWsConnected(false);
      };
    }
  }, [token, user]);

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="connection-status">
          <span className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
            {wsConnected ? '🟢 Live' : '🔴 Offline'}
          </span>
        </div>
      </header>
      
      <main className="app-main">
        <RealtimeDashboard />
      </main>
    </div>
  );
};

export default App;
```

### 5. Advanced Features

#### Push Notifications

```typescript
// components/PushNotificationHandler.tsx
import React, { useEffect } from 'react';
import { realtimeService } from '../services/websocket/realtime.service';

const PushNotificationHandler: React.FC = () => {
  useEffect(() => {
    const client = realtimeService.getClient();
    if (!client) return;

    const handlePushNotification = (data: any) => {
      // Check if browser supports notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          data: data.data,
          requireInteraction: data.priority === 'high',
        });
      }
      
      // Play notification sound
      if (data.sound && data.priority === 'high') {
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(console.error);
      }
    };

    client.onPushNotification(handlePushNotification);

    return () => {
      client.off('push-notification', handlePushNotification);
    };
  }, []);

  return null;
};

export default PushNotificationHandler;
```

#### Room Management

```typescript
// hooks/useRoom.ts
import { useEffect } from 'react';
import { realtimeService } from '../services/websocket/realtime.service';

export function useRoom(roomId: string) {
  const client = realtimeService.getClient();

  useEffect(() => {
    if (!client || !roomId) return;

    // Join room
    client.joinRoom(roomId);

    // Handle room events
    const handleRoomJoined = (data: any) => {
      console.log(`Joined room: ${data.room}`);
    };

    const handleRoomLeft = (data: any) => {
      console.log(`Left room: ${data.room}`);
    };

    client.on('room:joined', handleRoomJoined);
    client.on('room:left', handleRoomLeft);

    // Leave room on cleanup
    return () => {
      client.leaveRoom(roomId);
      client.off('room:joined', handleRoomJoined);
      client.off('room:left', handleRoomLeft);
    };
  }, [client, roomId]);
}
```

## CSS Styles

```css
/* dashboard.css */
.realtime-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.notification-indicator {
  position: relative;
}

.badge {
  background: #ff4444;
  color: white;
  border-radius: 50%;
  padding: 4px 8px;
  font-size: 12px;
  min-width: 20px;
  text-align: center;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.dashboard-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-scheduled { color: #007bff; }
.status-confirmed { color: #28a745; }
.status-cancelled { color: #dc3545; }
.status-completed { color: #6c757d; }

.status-available { color: #28a745; }
.status-busy { color: #ffc107; }
.status-on_break { color: #17a2b8; }
.status-off_duty { color: #6c757d; }

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  font-size: 14px;
  font-weight: 500;
}

.notification-item.unread {
  background: #f8f9fa;
  border-left: 4px solid #007bff;
}

.notification-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.notification-item:hover {
  background: #f5f5f5;
}
```

This integration provides:

1. **Real-time data synchronization** - Automatic updates without page refresh
2. **Connection management** - Automatic reconnection and error handling
3. **Event-driven updates** - Efficient updates only when data changes
4. **Push notifications** - Browser notifications for important events
5. **Room-based subscriptions** - Targeted updates based on user context
6. **Performance optimized** - Minimal re-renders using React hooks

The WebSocket implementation replaces Firebase's onSnapshot listeners with a more robust, scalable real-time solution tailored for the Clients+ application.