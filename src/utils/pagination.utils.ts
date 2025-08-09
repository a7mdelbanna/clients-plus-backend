import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FieldSelection {
  select?: Record<string, boolean>;
  include?: Record<string, any>;
}

// Extract pagination parameters from request
export function extractPagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)); // Max 100 items per page
  const offset = (page - 1) * limit;
  const sort = req.query.sort as string;
  const order = (req.query.order as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  return { page, limit, offset, sort, order };
}

// Create pagination response
export function createPaginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const pages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    }
  };
}

// Extract field selection from request
export function extractFieldSelection(req: Request): FieldSelection {
  const fieldsParam = req.query.fields as string;
  const includeParam = req.query.include as string;
  
  const result: FieldSelection = {};

  // Handle field selection (select specific fields)
  if (fieldsParam) {
    const fields = fieldsParam.split(',').map(field => field.trim());
    result.select = {};
    
    fields.forEach(field => {
      if (field && result.select) {
        result.select[field] = true;
      }
    });
  }

  // Handle include relationships
  if (includeParam) {
    const includes = includeParam.split(',').map(inc => inc.trim());
    result.include = {};
    
    includes.forEach(inc => {
      if (inc && result.include) {
        // Handle nested includes like 'user.profile'
        const parts = inc.split('.');
        let current = result.include;
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (i === parts.length - 1) {
            current[part] = true;
          } else {
            if (!current[part]) {
              current[part] = { include: {} };
            }
            current = current[part].include;
          }
        }
      }
    });
  }

  return result;
}

// Parse sort parameters
export function parseSortParams(sort?: string, order?: string): Record<string, 'asc' | 'desc'> | undefined {
  if (!sort) return undefined;

  const sortFields = sort.split(',').map(field => field.trim());
  const orderFields = order ? order.split(',').map(o => o.trim()) : [];
  
  const sortObject: Record<string, 'asc' | 'desc'> = {};
  
  sortFields.forEach((field, index) => {
    if (field) {
      const sortOrder = orderFields[index]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
      // Handle nested sort like 'user.name'
      const parts = field.split('.');
      if (parts.length === 1) {
        sortObject[field] = sortOrder;
      } else {
        // For nested sorts, create nested object structure
        let current = sortObject;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part] as any;
        }
        current[parts[parts.length - 1]] = sortOrder;
      }
    }
  });

  return Object.keys(sortObject).length > 0 ? sortObject : undefined;
}

// Parse filter parameters
export function parseFilterParams(req: Request): Record<string, any> {
  const filters: Record<string, any> = {};
  
  Object.keys(req.query).forEach(key => {
    // Skip pagination and special params
    if (['page', 'limit', 'sort', 'order', 'fields', 'include'].includes(key)) {
      return;
    }

    const value = req.query[key] as string;
    
    // Handle different filter operators
    if (key.endsWith('_like')) {
      const field = key.replace('_like', '');
      filters[field] = {
        contains: value,
        mode: 'insensitive'
      };
    } else if (key.endsWith('_in')) {
      const field = key.replace('_in', '');
      filters[field] = {
        in: value.split(',').map(v => v.trim())
      };
    } else if (key.endsWith('_gt')) {
      const field = key.replace('_gt', '');
      filters[field] = {
        gt: isNaN(Number(value)) ? new Date(value) : Number(value)
      };
    } else if (key.endsWith('_gte')) {
      const field = key.replace('_gte', '');
      filters[field] = {
        gte: isNaN(Number(value)) ? new Date(value) : Number(value)
      };
    } else if (key.endsWith('_lt')) {
      const field = key.replace('_lt', '');
      filters[field] = {
        lt: isNaN(Number(value)) ? new Date(value) : Number(value)
      };
    } else if (key.endsWith('_lte')) {
      const field = key.replace('_lte', '');
      filters[field] = {
        lte: isNaN(Number(value)) ? new Date(value) : Number(value)
      };
    } else if (key.endsWith('_not')) {
      const field = key.replace('_not', '');
      filters[field] = {
        not: value
      };
    } else {
      // Direct equality filter
      filters[key] = value;
    }
  });

  return filters;
}

// Enhanced pagination service
export class PaginationService {
  static paginate<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T> {
    return createPaginationResponse(data, total, page, limit);
  }

  static getPrismaQuery(req: Request, baseWhere: any = {}) {
    const { page, limit, sort, order } = extractPagination(req);
    const { select, include } = extractFieldSelection(req);
    const filters = parseFilterParams(req);
    const sortParams = parseSortParams(sort, order);

    return {
      where: { ...baseWhere, ...filters },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: sortParams || { createdAt: 'desc' },
      ...(select && { select }),
      ...(include && { include }),
      pagination: { page, limit }
    };
  }

  static async executePaginatedQuery<T>(
    model: any,
    req: Request,
    baseWhere: any = {}
  ): Promise<PaginationResult<T>> {
    const query = this.getPrismaQuery(req, baseWhere);
    const { pagination, ...queryParams } = query;

    const [data, total] = await Promise.all([
      model.findMany(queryParams),
      model.count({ where: query.where })
    ]);

    return this.paginate(data, total, pagination.page, pagination.limit);
  }
}

// Cursor-based pagination for large datasets
export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasNext: boolean;
  hasPrev: boolean;
}

export function extractCursorPagination(req: Request): CursorPaginationParams {
  const cursor = req.query.cursor as string;
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const direction = (req.query.direction as string) === 'backward' ? 'backward' : 'forward';

  return { cursor, limit, direction };
}

export function createCursorResponse<T>(
  data: T[],
  getCursor: (item: T) => string,
  limit: number,
  direction: 'forward' | 'backward'
): CursorPaginationResult<T> {
  const hasNext = data.length === limit + 1;
  const hasPrev = direction === 'backward' || Boolean(data.length > 0);
  
  // Remove extra item used for hasNext detection
  const resultData = hasNext ? data.slice(0, -1) : data;
  
  let nextCursor: string | undefined;
  let prevCursor: string | undefined;

  if (resultData.length > 0) {
    nextCursor = hasNext ? getCursor(resultData[resultData.length - 1]) : undefined;
    prevCursor = hasPrev ? getCursor(resultData[0]) : undefined;
  }

  return {
    data: resultData,
    nextCursor,
    prevCursor,
    hasNext: hasNext && direction === 'forward',
    hasPrev: hasPrev && direction === 'backward'
  };
}