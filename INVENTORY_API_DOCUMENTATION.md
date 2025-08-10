# Inventory Management API Documentation

## Overview

This document provides comprehensive documentation for the Inventory Management API endpoints that have been implemented for the Clients+ backend system. The API includes complete CRUD operations for products, categories, and inventory management with advanced features for product-based businesses.

## Architecture Overview

The inventory system follows a multi-tenant architecture with the following key components:

### Database Models (Prisma Schema)
- **Product**: Core product information with pricing, SKU, barcode, and variants
- **ProductCategory**: Hierarchical category system with parent-child relationships  
- **Inventory**: Branch-specific stock levels with quantity and reserved amounts
- **InventoryMovement**: Complete audit trail of all stock movements with types (IN, OUT, TRANSFER, ADJUSTMENT)

### Service Layer
- **InventoryService**: Core business logic for stock operations, reservations, and movement tracking
- **ProductController**: CRUD operations for products with search, filtering, and barcode support
- **ProductCategoryController**: Hierarchical category management with reordering capabilities
- **InventoryController**: Stock operations, transfers, adjustments, and reporting

## API Endpoints

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Product Management Endpoints

### Products (`/products`)

#### Create Product
```http
POST /api/v1/products
Content-Type: application/json

{
  "name": "iPhone 15",
  "nameAr": "آيفون 15",
  "description": "Latest iPhone model",
  "sku": "IPH15-001",
  "barcode": "123456789012",
  "categoryId": "cat_123",
  "price": 999.99,
  "cost": 750.00,
  "taxRate": 0.14,
  "trackInventory": true,
  "lowStockThreshold": 5,
  "variants": {
    "colors": ["black", "white"],
    "storage": ["128GB", "256GB"]
  },
  "images": ["https://example.com/image1.jpg"],
  "active": true
}
```

#### Get All Products
```http
GET /api/v1/products?search=iPhone&categoryId=cat_123&active=true&page=1&limit=50
```

Query Parameters:
- `search`: Search in name, nameAr, sku, or barcode
- `categoryId`: Filter by category
- `active`: Filter by active status
- `trackInventory`: Filter by inventory tracking
- `lowStock`: Show only low stock products
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

#### Get Product by ID
```http
GET /api/v1/products/{productId}
```

#### Update Product
```http
PUT /api/v1/products/{productId}
Content-Type: application/json

{
  "name": "iPhone 15 Pro",
  "price": 1099.99
}
```

#### Delete Product
```http
DELETE /api/v1/products/{productId}
```
*Note: Only allowed if product has no inventory or movement history*

#### Search by Barcode
```http
GET /api/v1/products/barcode/{barcode}
```

#### Product Statistics
```http
GET /api/v1/products/stats/overview
```

Response:
```json
{
  "success": true,
  "data": {
    "totalProducts": 150,
    "activeProducts": 140,
    "inactiveProducts": 10,
    "trackedProducts": 120,
    "untrackedProducts": 20,
    "categoriesCount": 25,
    "totalStockUnits": 5000,
    "lowStockCount": 8,
    "outOfStockCount": 3,
    "stockHealthPercentage": 92
  }
}
```

## Product Categories (`/product-categories`)

#### Create Category
```http
POST /api/v1/product-categories
Content-Type: application/json

{
  "name": "Electronics",
  "nameAr": "إلكترونيات",
  "description": "Electronic devices and accessories",
  "parentId": null,
  "order": 1,
  "color": "#007bff",
  "icon": "electronics-icon",
  "active": true
}
```

#### Get Categories
```http
GET /api/v1/product-categories?includeChildren=true&active=true
```

#### Hierarchical Category Structure
Categories support parent-child relationships for unlimited nesting:
- Root categories: `parentId = null`
- Subcategories: `parentId = parentCategoryId`
- Circular reference protection included

#### Reorder Categories
```http
PUT /api/v1/product-categories/reorder
Content-Type: application/json

{
  "categoryOrders": [
    {"id": "cat_1", "order": 1},
    {"id": "cat_2", "order": 2},
    {"id": "cat_3", "order": 3}
  ]
}
```

#### Category Statistics
```http
GET /api/v1/product-categories/stats/overview
```

## Inventory Management (`/inventory`)

### Inventory Levels

#### Get Inventory Levels
```http
GET /api/v1/inventory/levels?branchId=branch_123&lowStockOnly=false
```

Response includes:
- Current quantity
- Reserved quantity  
- Available quantity
- Low stock and out-of-stock flags
- Last restocked date
- Last count date

#### Product Availability Check
```http
GET /api/v1/inventory/availability/{productId}/{branchId}?quantity=10
```

Response:
```json
{
  "success": true,
  "data": {
    "available": true,
    "currentStock": 50,
    "reservedQuantity": 5,
    "availableQuantity": 45,
    "message": null
  }
}
```

### Stock Operations

#### Add Stock (Receiving)
```http
POST /api/v1/inventory/add
Content-Type: application/json

{
  "productId": "prod_123",
  "branchId": "branch_123",
  "quantity": 100,
  "unitCost": 50.00,
  "reference": "PO-2024-001",
  "notes": "Purchase order received"
}
```

#### Remove Stock (Sale/Consumption)
```http
POST /api/v1/inventory/remove
Content-Type: application/json

{
  "productId": "prod_123",
  "branchId": "branch_123", 
  "quantity": 2,
  "reference": "SALE-2024-001",
  "notes": "Sold to customer"
}
```

#### Stock Adjustment
```http
POST /api/v1/inventory/adjust
Content-Type: application/json

{
  "productId": "prod_123",
  "branchId": "branch_123",
  "newQuantity": 47,
  "reason": "Physical count adjustment",
  "notes": "Inventory count performed"
}
```

#### Stock Transfer Between Branches
```http
POST /api/v1/inventory/transfer
Content-Type: application/json

{
  "productId": "prod_123",
  "fromBranchId": "branch_123", 
  "toBranchId": "branch_456",
  "quantity": 10,
  "notes": "Transfer to main store"
}
```

### Stock Reservations

#### Reserve Stock
```http
POST /api/v1/inventory/reserve
Content-Type: application/json

{
  "productId": "prod_123",
  "branchId": "branch_123",
  "quantity": 2,
  "reference": "ORDER-2024-001"
}
```

#### Release Reservation
```http
POST /api/v1/inventory/release
Content-Type: application/json

{
  "productId": "prod_123",
  "branchId": "branch_123", 
  "quantity": 2
}
```

### Movement History

#### Get Stock Movements
```http
GET /api/v1/inventory/movements?productId=prod_123&type=IN&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=50
```

Query Parameters:
- `productId`: Filter by product
- `branchId`: Filter by branch
- `type`: Filter by movement type (IN, OUT, TRANSFER, ADJUSTMENT)
- `startDate`: Start date filter (YYYY-MM-DD)
- `endDate`: End date filter (YYYY-MM-DD)
- `page`: Page number
- `limit`: Items per page

Movement Types:
- **IN**: Stock received (purchases, returns)
- **OUT**: Stock sold/consumed (sales, waste)
- **TRANSFER**: Inter-branch transfers
- **ADJUSTMENT**: Manual adjustments (counts, corrections)

### Alerts & Reports

#### Low Stock Alerts
```http
GET /api/v1/inventory/alerts/low-stock?branchId=branch_123
```

#### Inventory Valuation
```http
GET /api/v1/inventory/valuation?branchId=branch_123
```

Response:
```json
{
  "success": true,
  "data": {
    "totalValue": 125000.50,
    "totalQuantity": 2500,
    "averageCostPerUnit": 50.00,
    "itemsCount": 150
  }
}
```

## Advanced Features

### Multi-Branch Support
- Each inventory record is branch-specific
- Stock levels tracked separately per branch
- Inter-branch transfers supported
- Branch-specific reporting and alerts

### Real-time Stock Tracking
- Atomic transactions for stock operations
- Automatic stock level updates
- Reserved quantity tracking for pending orders
- Comprehensive movement audit trail

### Product Variants
- JSON-based variant system (color, size, etc.)
- Flexible attribute structure
- Support for complex product configurations

### Barcode Integration
- Unique barcode validation per company
- Fast barcode-based product lookup
- Integration ready for POS systems

### Cost Tracking Methods
- FIFO (First In, First Out)
- LIFO (Last In, First Out) 
- Average cost methods
- Unit cost tracking per movement

### Low Stock Management
- Configurable thresholds per product
- Automated low stock alerts
- Out-of-stock notifications
- Reorder point tracking

### Integration Points

#### With Sales/POS System
```javascript
// Example: Process sale and update inventory
const sale = await processSale({
  productId: 'prod_123',
  branchId: 'branch_123',
  quantity: 2,
  salePrice: 199.99
});

// Automatically removes stock
await inventoryService.removeStock(
  companyId,
  'prod_123', 
  'branch_123',
  2,
  sale.id,
  'Sale transaction'
);
```

#### With Supplier Management
```javascript
// Example: Receive purchase order
const po = await receivePurchaseOrder({
  supplierId: 'supplier_123',
  items: [
    {
      productId: 'prod_123',
      quantity: 100,
      unitCost: 45.00
    }
  ]
});

// Automatically adds stock
await inventoryService.addStock(
  companyId,
  'prod_123',
  'branch_123', 
  100,
  45.00,
  po.id,
  'Purchase order received'
);
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be greater than 0"
    }
  ]
}
```

Common error scenarios:
- **400**: Validation errors, business rule violations
- **401**: Authentication required
- **403**: Insufficient permissions
- **404**: Resource not found
- **409**: Conflict (duplicate SKU/barcode)
- **500**: Server errors

## Testing

A comprehensive test suite has been created to validate all endpoints:

```bash
# Run the test suite
node test-inventory-endpoints.js
```

The test covers:
- Product CRUD operations
- Category management
- Stock operations
- Barcode search
- Statistical reports
- Error handling

## API Documentation

Interactive API documentation is available via Swagger UI:
```
http://localhost:3001/api-docs
```

The documentation includes:
- Complete endpoint definitions
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Error code definitions

## Performance Considerations

### Database Optimizations
- Indexed fields for fast lookups (SKU, barcode, category)
- Optimized queries with proper joins
- Pagination for large datasets
- Efficient movement history queries

### Caching Strategy
- Redis caching for frequently accessed data
- Category hierarchy caching
- Product lookup caching
- Inventory level caching with TTL

### Scalability
- Multi-tenant architecture
- Horizontal scaling support
- Database sharding ready
- Microservice-compatible design

## Security Features

### Data Protection
- Multi-tenant isolation
- Company-scoped data access
- Input validation and sanitization
- SQL injection prevention

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- API rate limiting
- Audit logging

## Migration & Deployment

### Database Migration
- Prisma-based schema management
- Automated migration scripts
- Data integrity validation
- Rollback procedures

### Environment Configuration
- Environment-specific settings
- Database connection pooling
- Redis configuration
- Logging configuration

## Support & Maintenance

### Monitoring
- Health check endpoints
- Performance metrics
- Error tracking
- Usage analytics

### Logging
- Structured logging
- Operation audit trails
- Error logging with context
- Performance logging

## Future Enhancements

Planned features for future releases:
- Advanced reporting and analytics
- Bulk operations via CSV import/export
- Advanced product bundling
- Serial number tracking
- Expiry date management
- Advanced cost accounting methods
- Mobile app API optimizations
- Real-time notifications via WebSockets

---

## Files Created/Modified

### Controllers
- `/src/controllers/inventory.controller.ts` - Inventory operations controller
- `/src/controllers/product.controller.ts` - Product management controller  
- `/src/controllers/product-category.controller.ts` - Category management controller

### Routes  
- `/src/routes/inventory.routes.ts` - Inventory API endpoints
- `/src/routes/product.routes.ts` - Product API endpoints
- `/src/routes/product-category.routes.ts` - Category API endpoints

### Services
- `/src/services/inventory.service.ts` - Enhanced with advanced features

### Configuration
- `/src/app.ts` - Updated with new route registrations

### Testing
- `/test-inventory-endpoints.js` - Comprehensive endpoint testing script

### Database Schema
- Existing Prisma schema already included all necessary models:
  - Product, ProductCategory, Inventory, InventoryMovement
  - Multi-tenant architecture with Company relations
  - Comprehensive indexing for performance

This implementation provides a complete, production-ready inventory management system that scales with business growth and integrates seamlessly with existing POS, sales, and financial systems.