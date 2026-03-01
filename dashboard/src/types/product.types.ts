// Product types
export type ProductType = 'retail' | 'professional' | 'consumable';
export type ProductStatus = 'active' | 'inactive' | 'discontinued';

// Main Product interface
export interface Product {
  id?: string;
  companyId: string;
  
  // Basic info
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  barcode?: string;
  sku?: string;
  categoryId?: string;
  type: ProductType;
  
  // Pricing
  purchasePrice: number;
  retailPrice: number;
  vatRate?: number;
  
  // Stock tracking
  trackInventory: boolean;
  lowStockThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  
  // Vendor info
  vendorId?: string;
  vendorSku?: string;
  
  // Images
  images?: string[];
  primaryImage?: string;
  
  // Branch-specific stock levels
  branchStock?: {
    [branchId: string]: BranchStock;
  };
  
  // Usage tracking
  averageUsagePerService?: number;
  linkedServices?: string[];
  
  // Metadata
  status: ProductStatus;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

// Branch stock interface
export interface BranchStock {
  quantity: number;
  reservedQuantity: number;
  availableQuantity?: number; // quantity - reservedQuantity
  location?: string;
  lastStockCheck?: any;
  lastRestockDate?: any;
}

// Product category interface
export interface ProductCategory {
  id?: string;
  companyId: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  parentId?: string; // For subcategories
  icon?: string;
  color?: string;
  sortOrder?: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Inventory transaction types
export type InventoryTransactionType = 
  | 'purchase'      // Stock purchased from vendor
  | 'sale'          // Retail sale to customer
  | 'usage'         // Used in service
  | 'adjustment'    // Manual stock adjustment
  | 'transfer_in'   // Received from another branch
  | 'transfer_out'  // Sent to another branch
  | 'return_vendor' // Returned to vendor
  | 'return_customer' // Customer return
  | 'damage'        // Damaged/expired stock
  | 'opening'       // Opening stock

// Inventory transaction interface
export interface InventoryTransaction {
  id?: string;
  companyId: string;
  branchId: string;
  productId: string;
  
  // Transaction details
  type: InventoryTransactionType;
  date: any;
  quantity: number; // Positive for in, negative for out
  
  // Stock levels
  previousQuantity: number;
  newQuantity: number;
  
  // Financial info
  unitCost?: number;
  totalCost?: number;
  unitPrice?: number;
  totalPrice?: number;
  
  // Reference info
  referenceType?: 'appointment' | 'sale' | 'purchase_order' | 'transfer' | 'manual';
  referenceId?: string;
  
  // Transfer specific
  fromBranchId?: string;
  toBranchId?: string;
  transferStatus?: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  
  // Additional info
  notes?: string;
  attachments?: string[];
  
  // Tracking
  performedBy: string;
  approvedBy?: string;
  createdAt?: any;
}

// Stock transfer interface
export interface StockTransfer {
  id?: string;
  companyId: string;
  
  // Transfer details
  fromBranchId: string;
  toBranchId: string;
  transferDate: any;
  expectedDeliveryDate?: any;
  actualDeliveryDate?: any;
  
  // Items
  items: StockTransferItem[];
  
  // Status
  status: 'draft' | 'pending' | 'in_transit' | 'completed' | 'cancelled';
  
  // Notes
  notes?: string;
  transferNumber?: string;
  
  // Tracking
  createdBy: string;
  approvedBy?: string;
  receivedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Stock transfer item
export interface StockTransferItem {
  productId: string;
  quantity: number;
  unitCost?: number;
  notes?: string;
}

// Purchase order interface
export interface PurchaseOrder {
  id?: string;
  companyId: string;
  branchId: string;
  
  // Order details
  orderNumber?: string;
  orderDate: any;
  expectedDeliveryDate?: any;
  actualDeliveryDate?: any;
  
  // Vendor
  vendorId: string;
  vendorName?: string;
  vendorInvoiceNumber?: string;
  
  // Items
  items: PurchaseOrderItem[];
  
  // Totals
  subtotal: number;
  taxAmount: number;
  shippingCost?: number;
  discount?: number;
  totalAmount: number;
  
  // Status
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  
  // Payment
  paymentStatus: 'pending' | 'partial' | 'paid';
  paymentTerms?: string;
  
  // Notes
  notes?: string;
  attachments?: string[];
  
  // Tracking
  createdBy: string;
  approvedBy?: string;
  receivedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Purchase order item
export interface PurchaseOrderItem {
  productId: string;
  productName?: string;
  productSku?: string;
  
  // Quantities
  orderedQuantity: number;
  receivedQuantity: number;
  
  // Pricing
  unitCost: number;
  totalCost: number;
  
  // Notes
  notes?: string;
}

// Vendor interface
export interface Vendor {
  id?: string;
  companyId: string;
  
  // Basic info
  name: string;
  nameAr?: string;
  code?: string;
  
  // Contact
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  
  // Address
  address?: string;
  city?: string;
  country?: string;
  
  // Financial
  taxNumber?: string;
  paymentTerms?: string;
  currency?: string;
  
  // Categories
  productCategories?: string[];
  
  // Status
  isActive: boolean;
  rating?: number;
  notes?: string;
  
  // Tracking
  createdAt?: any;
  updatedAt?: any;
}

// Stock alert interface
export interface StockAlert {
  id?: string;
  companyId: string;
  branchId: string;
  productId: string;
  
  // Alert details
  type: 'low_stock' | 'out_of_stock' | 'reorder_point' | 'expiring_soon';
  severity: 'low' | 'medium' | 'high';
  
  // Current status
  currentQuantity: number;
  threshold: number;
  
  // Alert info
  message: string;
  messageAr: string;
  
  // Status
  isRead: boolean;
  isResolved: boolean;
  resolvedAt?: any;
  resolvedBy?: string;
  
  // Tracking
  createdAt?: any;
}

// Product usage in service
export interface ProductUsage {
  productId: string;
  quantity: number;
  isOptional?: boolean;
  notes?: string;
}

// Stock take (inventory count)
export interface StockTake {
  id?: string;
  companyId: string;
  branchId: string;
  
  // Count details
  countDate: any;
  countType: 'full' | 'partial' | 'cycle';
  
  // Items counted
  items: StockTakeItem[];
  
  // Summary
  totalItems: number;
  totalDiscrepancies: number;
  totalValue?: number;
  
  // Status
  status: 'in_progress' | 'completed' | 'approved';
  
  // Notes
  notes?: string;
  
  // Tracking
  performedBy: string;
  approvedBy?: string;
  startedAt: any;
  completedAt?: any;
  createdAt?: any;
}

// Stock take item
export interface StockTakeItem {
  productId: string;
  expectedQuantity: number;
  countedQuantity: number;
  discrepancy: number; // countedQuantity - expectedQuantity
  unitCost?: number;
  notes?: string;
  countedAt: any;
  countedBy: string;
}

// Product filters for queries
export interface ProductFilters {
  search?: string;
  categoryId?: string;
  type?: ProductType;
  status?: ProductStatus;
  vendorId?: string;
  lowStock?: boolean;
  branchId?: string;
  hasBarcode?: boolean;
  trackInventory?: boolean;
  priceRange?: {
    min?: number;
    max?: number;
  };
}

// Product statistics
export interface ProductStatistics {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  categoriesCount: number;
  averagePrice: number;
  topSellingProducts?: Array<{
    productId: string;
    productName: string;
    soldQuantity: number;
    revenue: number;
  }>;
}