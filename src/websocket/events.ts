// WebSocket Event Types and Interfaces

export enum SocketEvents {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  
  // Authentication
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTHENTICATION_ERROR = 'authentication_error',
  
  // Room management
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  ROOM_JOINED = 'room_joined',
  ROOM_LEFT = 'room_left',
  
  // Appointment events
  APPOINTMENT_CREATED = 'appointment:created',
  APPOINTMENT_UPDATED = 'appointment:updated',
  APPOINTMENT_CANCELLED = 'appointment:cancelled',
  APPOINTMENT_REMINDER = 'appointment:reminder',
  
  // Client events
  CLIENT_CREATED = 'client:created',
  CLIENT_UPDATED = 'client:updated',
  CLIENT_CHECKIN = 'client:checkin',
  CLIENT_CHECKOUT = 'client:checkout',
  
  // Staff events
  STAFF_STATUS_CHANGED = 'staff:status_changed',
  STAFF_BREAK_STARTED = 'staff:break_started',
  STAFF_BREAK_ENDED = 'staff:break_ended',
  STAFF_SHIFT_STARTED = 'staff:shift_started',
  STAFF_SHIFT_ENDED = 'staff:shift_ended',
  
  // Inventory events
  INVENTORY_LOW_STOCK = 'inventory:low_stock',
  INVENTORY_OUT_OF_STOCK = 'inventory:out_of_stock',
  INVENTORY_RESTOCKED = 'inventory:restocked',
  INVENTORY_MOVEMENT = 'inventory:movement',
  
  // Sales events
  SALE_COMPLETED = 'sale:completed',
  SALE_REFUNDED = 'sale:refunded',
  REGISTER_OPENED = 'register:opened',
  REGISTER_CLOSED = 'register:closed',
  
  // Financial events
  PAYMENT_RECEIVED = 'payment:received',
  EXPENSE_CREATED = 'expense:created',
  INVOICE_CREATED = 'invoice:created',
  INVOICE_PAID = 'invoice:paid',
  
  // Notification events
  NOTIFICATION_SENT = 'notification:sent',
  NOTIFICATION_READ = 'notification:read',
  SYSTEM_ALERT = 'system:alert',
  
  // Real-time collaboration
  USER_TYPING = 'user:typing',
  USER_STOPPED_TYPING = 'user:stopped_typing',
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
}

// Authentication payload
export interface AuthenticatePayload {
  token: string;
}

// Room management
export interface JoinRoomPayload {
  roomType: 'company' | 'branch' | 'user';
  roomId: string;
}

// Appointment payloads
export interface AppointmentEventPayload {
  appointmentId: string;
  appointment: any; // Replace with actual Appointment type
  userId: string;
  timestamp: Date;
}

// Client payloads
export interface ClientEventPayload {
  clientId: string;
  client: any; // Replace with actual Client type
  userId: string;
  timestamp: Date;
}

// Staff payloads
export interface StaffStatusPayload {
  staffId: string;
  status: 'available' | 'busy' | 'break' | 'offline';
  branchId?: string;
  timestamp: Date;
}

// Inventory payloads
export interface InventoryAlertPayload {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  branchId: string;
  timestamp: Date;
}

// Sale payloads
export interface SaleEventPayload {
  saleId: string;
  sale: any; // Replace with actual Sale type
  branchId: string;
  staffId?: string;
  timestamp: Date;
}

// Financial payloads
export interface PaymentEventPayload {
  paymentId: string;
  amount: number;
  currency: string;
  clientId?: string;
  invoiceId?: string;
  method: string;
  timestamp: Date;
}

// Notification payloads
export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: any;
  timestamp: Date;
}

// User activity payloads
export interface UserActivityPayload {
  userId: string;
  userName: string;
  action: string;
  context?: string;
  timestamp: Date;
}

// Socket user interface
export interface SocketUser {
  id: string;
  companyId: string;
  branchIds: string[];
  role: string;
  permissions: string[];
}

// Room interface
export interface Room {
  id: string;
  type: 'company' | 'branch' | 'user';
  members: Set<string>;
  createdAt: Date;
}