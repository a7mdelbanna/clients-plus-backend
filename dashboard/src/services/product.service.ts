import apiClient from '../config/api';
import type { ApiResponse } from '../config/api';
import type {
  Product,
  ProductCategory,
  ProductFilters,
  ProductStatistics,
  InventoryTransaction,
  StockTransfer,
  StockAlert,
} from '../types/product.types';

class ProductService {
  private readonly productEndpoint = '/products';
  private readonly inventoryEndpoint = '/inventory';

  // ==================== Products ====================

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(this.productEndpoint, product);
      if (!response.data.success) throw new Error(response.data.message || 'Failed to create product');
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating product:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create product');
    }
  }

  async updateProduct(companyId: string, productId: string, updates: Partial<Product>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.productEndpoint}/${productId}`, updates);
    } catch (error: any) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(companyId: string, productId: string): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.productEndpoint}/${productId}`);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async getProduct(companyId: string, productId: string): Promise<Product | null> {
    try {
      const response = await apiClient.get<ApiResponse<Product>>(`${this.productEndpoint}/${productId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async getProducts(companyId: string, filters?: ProductFilters, pageSize?: number): Promise<Product[]> {
    try {
      const params: any = {};
      if (filters?.categoryId) params.categoryId = filters.categoryId;
      if (filters?.status) params.status = filters.status;
      if (filters?.search) params.search = filters.search;
      if (filters?.branchId) params.branchId = filters.branchId;
      if (filters?.type) params.type = filters.type;
      if (pageSize) params.limit = pageSize;

      const response = await apiClient.get<ApiResponse<Product[]>>(this.productEndpoint, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  async searchByBarcode(companyId: string, barcode: string): Promise<Product | null> {
    try {
      const response = await apiClient.get<ApiResponse<Product>>(`${this.productEndpoint}/barcode/${barcode}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  async getProductStatistics(companyId: string): Promise<ProductStatistics> {
    try {
      const response = await apiClient.get<ApiResponse<ProductStatistics>>(`${this.productEndpoint}/stats/overview`);
      return response.data.data || { totalProducts: 0, activeProducts: 0, totalValue: 0, lowStockCount: 0 };
    } catch (error) {
      console.error('Error getting product stats:', error);
      return { totalProducts: 0, activeProducts: 0, totalValue: 0, lowStockCount: 0 };
    }
  }

  // ==================== Categories ====================

  async getCategories(companyId: string): Promise<ProductCategory[]> {
    try {
      const response = await apiClient.get<ApiResponse<ProductCategory[]>>(`${this.productEndpoint}/categories`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async createCategory(category: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.productEndpoint}/categories`, category);
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // ==================== Inventory ====================

  async getInventoryLevels(companyId: string, branchId?: string): Promise<any[]> {
    try {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<any[]>>(`${this.inventoryEndpoint}/levels`, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting inventory levels:', error);
      return [];
    }
  }

  async adjustStock(
    companyId: string,
    productId: string,
    branchId: string,
    quantity: number,
    reason: string,
    type: string
  ): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.inventoryEndpoint}/adjust`, {
        productId, branchId, quantity, reason, type,
      });
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }

  async transferStock(transfer: Omit<StockTransfer, 'id' | 'createdAt'>): Promise<string> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>(`${this.inventoryEndpoint}/transfer`, transfer);
      return response.data.data!.id;
    } catch (error: any) {
      console.error('Error transferring stock:', error);
      throw error;
    }
  }

  async addStock(companyId: string, productId: string, branchId: string, quantity: number, notes?: string): Promise<void> {
    await apiClient.post<ApiResponse<void>>(`${this.inventoryEndpoint}/add`, {
      productId, branchId, quantity, notes,
    });
  }

  async removeStock(companyId: string, productId: string, branchId: string, quantity: number, reason?: string): Promise<void> {
    await apiClient.post<ApiResponse<void>>(`${this.inventoryEndpoint}/remove`, {
      productId, branchId, quantity, reason,
    });
  }

  async getMovements(companyId: string, productId?: string, branchId?: string): Promise<InventoryTransaction[]> {
    try {
      const params: any = {};
      if (productId) params.productId = productId;
      if (branchId) params.branchId = branchId;
      const response = await apiClient.get<ApiResponse<InventoryTransaction[]>>(`${this.inventoryEndpoint}/movements`, { params });
      return response.data.data || [];
    } catch (error) {
      return [];
    }
  }

  async getLowStockAlerts(companyId: string): Promise<StockAlert[]> {
    try {
      const response = await apiClient.get<ApiResponse<StockAlert[]>>(`${this.inventoryEndpoint}/alerts/low-stock`);
      return response.data.data || [];
    } catch (error) {
      return [];
    }
  }

  async getInventoryValuation(companyId: string): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.inventoryEndpoint}/valuation`);
      return response.data.data || {};
    } catch (error) {
      return {};
    }
  }

  // ==================== Image Upload ====================

  async uploadProductImage(companyId: string, productId: string, file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post<ApiResponse<{ url: string }>>(
        '/upload/product-images',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data!.url;
    } catch (error: any) {
      console.error('Error uploading product image:', error);
      throw error;
    }
  }

  // ==================== Subscriptions ====================

  subscribeToProducts(
    companyId: string,
    callback: (products: Product[]) => void,
    filters?: ProductFilters,
    errorCallback?: (error: Error) => void
  ): () => void {
    this.getProducts(companyId, filters)
      .then(callback)
      .catch((error) => { if (errorCallback) errorCallback(error); });

    const interval = setInterval(() => {
      this.getProducts(companyId, filters)
        .then(callback)
        .catch((error) => { if (errorCallback) errorCallback(error); });
    }, 15000);

    return () => clearInterval(interval);
  }

  // Helper for branch stock initialization (handled server-side now)
  async initializeBranchStock(_companyId: string, _productId: string, _branchStock: any): Promise<void> {
    // Branch stock initialization is now handled by the backend during product creation
  }
}

export const productService = new ProductService();
