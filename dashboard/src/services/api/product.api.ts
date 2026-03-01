import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// =========================== INTERFACES ===========================

export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  category?: ProductCategory;
  price: number;
  cost?: number;
  taxRate: number;
  trackInventory: boolean;
  stock: number; // Total stock across all branches
  lowStockThreshold?: number;
  variants?: any; // JSON field for product variants
  attributes?: any; // JSON field for product attributes
  images?: string[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  active: boolean;
  featured: boolean;
  tags?: string[];
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  parentId?: string;
  parent?: ProductCategory;
  children?: ProductCategory[];
  order: number;
  color?: string;
  icon?: string;
  active: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  productsCount?: number;
}

export interface InventoryLevel {
  productId: string;
  productName: string;
  productSku?: string;
  branchId: string;
  branchName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold?: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastRestocked?: string;
  lastCountDate?: string;
}

export interface StockAdjustment {
  productId: string;
  branchId: string;
  newQuantity: number;
  reason: string;
  notes?: string;
}

export interface StockTransfer {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
  notes?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  branchId: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  unitCost?: number;
  reference?: string;
  referenceType?: string;
  notes?: string;
  performedBy?: string;
  createdAt: string;
  product?: {
    name: string;
    sku?: string;
  };
  branch?: {
    name: string;
  };
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  productSku?: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  threshold: number;
  severity: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
}

export interface InventoryValuation {
  totalValue: number;
  totalQuantity: number;
  averageCostPerUnit: number;
  itemsCount: number;
}

export interface ProductFilters {
  categoryId?: string;
  branchId?: string;
  active?: boolean;
  trackInventory?: boolean;
  searchTerm?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  stockRange?: {
    min?: number;
    max?: number;
  };
  lowStock?: boolean;
  outOfStock?: boolean;
  featured?: boolean;
  tags?: string[];
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

export interface ProductPaginationOptions {
  page?: number;
  limit?: number;
}

export interface CreateProductDto {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  price: number;
  cost?: number;
  taxRate?: number;
  trackInventory?: boolean;
  lowStockThreshold?: number;
  variants?: any;
  attributes?: any;
  images?: string[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  active?: boolean;
  featured?: boolean;
  tags?: string[];
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface CreateCategoryDto {
  name: string;
  nameAr?: string;
  description?: string;
  parentId?: string;
  order?: number;
  color?: string;
  icon?: string;
  active?: boolean;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface PaginatedProductResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface InventoryMovementFilters {
  productId?: string;
  branchId?: string;
  type?: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedMovementResponse {
  movements: InventoryMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =========================== PRODUCT API CLASS ===========================

export class ProductAPI {

  // ==================== Product CRUD Operations ====================

  /**
   * Get all products with filtering and pagination
   */
  async getProducts(
    filters?: ProductFilters,
    pagination?: ProductPaginationOptions
  ): Promise<PaginatedProductResponse> {
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.limit) params.append('limit', pagination.limit.toString());
    
    // Add filter parameters
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.trackInventory !== undefined) params.append('trackInventory', filters.trackInventory.toString());
    if (filters?.searchTerm) params.append('search', filters.searchTerm);
    if (filters?.priceRange?.min) params.append('minPrice', filters.priceRange.min.toString());
    if (filters?.priceRange?.max) params.append('maxPrice', filters.priceRange.max.toString());
    if (filters?.stockRange?.min) params.append('minStock', filters.stockRange.min.toString());
    if (filters?.stockRange?.max) params.append('maxStock', filters.stockRange.max.toString());
    if (filters?.lowStock !== undefined) params.append('lowStock', filters.lowStock.toString());
    if (filters?.outOfStock !== undefined) params.append('outOfStock', filters.outOfStock.toString());
    if (filters?.featured !== undefined) params.append('featured', filters.featured.toString());
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortDirection) params.append('sortDirection', filters.sortDirection);

    const response = await apiClient.get<ApiResponse<Product[]>>(`/products?${params.toString()}`);
    
    return {
      data: response.data.data || [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Product not found');
    }
    
    return response.data.data;
  }

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductDto): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>('/products', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create product');
    }
    
    return response.data.data;
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
    const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update product');
    }
    
    return response.data.data;
  }

  /**
   * Delete a product (soft delete)
   */
  async deleteProduct(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/products/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete product');
    }
  }

  // ==================== Product Categories ====================

  /**
   * Get all product categories
   */
  async getCategories(): Promise<ProductCategory[]> {
    const response = await apiClient.get<ApiResponse<ProductCategory[]>>('/products/categories');
    return response.data.data || [];
  }

  /**
   * Create a new product category
   */
  async createCategory(data: CreateCategoryDto): Promise<ProductCategory> {
    const response = await apiClient.post<ApiResponse<ProductCategory>>('/products/categories', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create category');
    }
    
    return response.data.data;
  }

  /**
   * Update a product category
   */
  async updateCategory(id: string, data: UpdateCategoryDto): Promise<ProductCategory> {
    const response = await apiClient.put<ApiResponse<ProductCategory>>(`/products/categories/${id}`, data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update category');
    }
    
    return response.data.data;
  }

  /**
   * Delete a product category
   */
  async deleteCategory(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/products/categories/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete category');
    }
  }

  // ==================== Inventory Management ====================

  /**
   * Get inventory levels across branches
   */
  async getInventory(productId?: string, branchId?: string): Promise<InventoryLevel[]> {
    const params = new URLSearchParams();
    if (productId) params.append('productId', productId);
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<InventoryLevel[]>>(`/inventory?${params.toString()}`);
    return response.data.data || [];
  }

  /**
   * Get inventory for a specific product
   */
  async getProductInventory(productId: string): Promise<InventoryLevel[]> {
    const response = await apiClient.get<ApiResponse<InventoryLevel[]>>(`/inventory/product/${productId}`);
    return response.data.data || [];
  }

  /**
   * Adjust stock levels
   */
  async adjustStock(data: StockAdjustment): Promise<InventoryMovement> {
    const response = await apiClient.post<ApiResponse<InventoryMovement>>('/inventory/adjust', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to adjust stock');
    }
    
    return response.data.data;
  }

  /**
   * Transfer stock between branches
   */
  async transferStock(data: StockTransfer): Promise<{
    outMovement: InventoryMovement;
    inMovement: InventoryMovement;
  }> {
    const response = await apiClient.post<ApiResponse<{
      outMovement: InventoryMovement;
      inMovement: InventoryMovement;
    }>>('/inventory/transfer', data);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to transfer stock');
    }
    
    return response.data.data;
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(branchId?: string): Promise<LowStockAlert[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<LowStockAlert[]>>(`/inventory/low-stock?${params.toString()}`);
    return response.data.data || [];
  }

  /**
   * Get inventory movements/history
   */
  async getMovements(filters?: InventoryMovementFilters): Promise<PaginatedMovementResponse> {
    const params = new URLSearchParams();
    
    if (filters?.productId) params.append('productId', filters.productId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get<ApiResponse<PaginatedMovementResponse>>(`/inventory/movements?${params.toString()}`);
    return response.data.data || {
      movements: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    };
  }

  /**
   * Get inventory valuation
   */
  async getInventoryValuation(branchId?: string): Promise<InventoryValuation> {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const response = await apiClient.get<ApiResponse<InventoryValuation>>(`/inventory/valuation?${params.toString()}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to get inventory valuation');
    }
    
    return response.data.data;
  }

  /**
   * Check product availability in a branch
   */
  async checkAvailability(
    productId: string,
    branchId: string,
    requestedQuantity: number
  ): Promise<{
    available: boolean;
    currentStock: number;
    reservedQuantity: number;
    availableQuantity: number;
    message?: string;
  }> {
    const response = await apiClient.get<ApiResponse<{
      available: boolean;
      currentStock: number;
      reservedQuantity: number;
      availableQuantity: number;
      message?: string;
    }>>(`/inventory/availability/${productId}/${branchId}?quantity=${requestedQuantity}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to check availability');
    }
    
    return response.data.data;
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(
    productId: string,
    branchId: string,
    quantity: number,
    reference?: string
  ): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/inventory/reserve', {
      productId,
      branchId,
      quantity,
      reference,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to reserve stock');
    }
  }

  /**
   * Release stock reservation
   */
  async releaseReservation(
    productId: string,
    branchId: string,
    quantity: number
  ): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>('/inventory/release', {
      productId,
      branchId,
      quantity,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to release reservation');
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Calculate profit margin for a product
   */
  static calculateProfitMargin(product: Product): number {
    if (!product.cost) return 0;
    return ((product.price - Number(product.cost)) / product.price) * 100;
  }

  /**
   * Calculate markup percentage
   */
  static calculateMarkup(product: Product): number {
    if (!product.cost) return 0;
    return ((product.price - Number(product.cost)) / Number(product.cost)) * 100;
  }

  /**
   * Format price with currency
   */
  static formatPrice(price: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  }

  /**
   * Generate SKU from product name and id
   */
  static generateSKU(name: string, id: string): string {
    const namePrefix = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();
    const idSuffix = id.substring(0, 4).toUpperCase();
    return `${namePrefix}-${idSuffix}`;
  }

  /**
   * Check if product is low in stock
   */
  static isLowStock(product: Product): boolean {
    if (!product.trackInventory || !product.lowStockThreshold) return false;
    return product.stock <= product.lowStockThreshold;
  }

  /**
   * Check if product is out of stock
   */
  static isOutOfStock(product: Product): boolean {
    if (!product.trackInventory) return false;
    return product.stock <= 0;
  }

  /**
   * Get stock status for display
   */
  static getStockStatus(product: Product): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NOT_TRACKED' {
    if (!product.trackInventory) return 'NOT_TRACKED';
    if (product.stock <= 0) return 'OUT_OF_STOCK';
    if (product.lowStockThreshold && product.stock <= product.lowStockThreshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  /**
   * Calculate total product value
   */
  static calculateProductValue(product: Product, useCostPrice = false): number {
    const price = useCostPrice ? Number(product.cost || product.price) : product.price;
    return price * product.stock;
  }

  /**
   * Search products by name or SKU
   */
  async searchProducts(
    searchTerm: string,
    filters?: Omit<ProductFilters, 'searchTerm'>,
    pagination?: ProductPaginationOptions
  ): Promise<PaginatedProductResponse> {
    return this.getProducts(
      { ...filters, searchTerm },
      pagination
    );
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(): Promise<Product[]> {
    const response = await this.getProducts({ featured: true }, { limit: 20 });
    return response.data;
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(
    productIds: string[],
    updates: Partial<UpdateProductDto>
  ): Promise<void> {
    const response = await apiClient.put<ApiResponse<void>>('/products/bulk-update', {
      productIds,
      updates,
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to bulk update products');
    }
  }
}

// Create and export singleton instance
export const productAPI = new ProductAPI();
export default productAPI;