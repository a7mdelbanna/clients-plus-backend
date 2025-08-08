// Common types used throughout the application
import { UserRole } from '@prisma/client';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuthUser {
  userId: string;
  email: string;
  companyId: string;
  role: UserRole;
  permissions?: string[];
}

export interface JwtPayload {
  userId: string;
  email: string;
  companyId: string;
  role: UserRole;
  permissions?: string[];
  type: 'access' | 'refresh';
}

// Request extensions
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Database types
export interface DatabaseError extends Error {
  code?: string;
  meta?: any;
}

// File upload types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

// Email types
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer;
  contentType?: string;
}