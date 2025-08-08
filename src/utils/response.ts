import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export class ResponseHelper {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode: number = 200
  ): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    error: string,
    statusCode: number = 400,
    data?: any
  ): Response<ApiResponse> {
    return res.status(statusCode).json({
      success: false,
      error,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): Response<PaginatedResponse<T>> {
    const pages = Math.ceil(total / limit);
    
    return res.status(200).json({
      success: true,
      data,
      message,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, resource: string = 'Resource'): Response<ApiResponse> {
    return this.error(res, `${resource} not found`, 404);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): Response<ApiResponse> {
    return this.error(res, message, 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(res: Response, message: string = 'Forbidden'): Response<ApiResponse> {
    return this.error(res, message, 403);
  }

  /**
   * Send validation error response
   */
  static validationError(res: Response, errors: any): Response<ApiResponse> {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      data: errors,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send server error response
   */
  static serverError(res: Response, message: string = 'Internal server error'): Response<ApiResponse> {
    return this.error(res, message, 500);
  }
}

// Utility functions for JSON responses (not for Express Response objects)
export function successResponse<T>(data?: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(error: string, data?: any): ApiResponse {
  return {
    success: false,
    error,
    data,
    timestamp: new Date().toISOString(),
  };
}