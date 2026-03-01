import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { productController } from '../controllers/product.controller';
import { productCategoryController } from '../controllers/product-category.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: Product ID
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Product name
 *         nameAr:
 *           type: string
 *           maxLength: 255
 *           description: Product name in Arabic
 *         description:
 *           type: string
 *           maxLength: 2000
 *           description: Product description
 *         descriptionAr:
 *           type: string
 *           maxLength: 2000
 *           description: Product description in Arabic
 *         sku:
 *           type: string
 *           maxLength: 100
 *           description: Stock Keeping Unit
 *         barcode:
 *           type: string
 *           maxLength: 100
 *           description: Product barcode
 *         categoryId:
 *           type: string
 *           description: Product category ID
 *         price:
 *           type: number
 *           minimum: 0
 *           description: Selling price
 *         cost:
 *           type: number
 *           minimum: 0
 *           description: Cost price
 *         taxRate:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           description: Tax rate (0-1)
 *         trackInventory:
 *           type: boolean
 *           description: Whether to track inventory for this product
 *         stock:
 *           type: integer
 *           minimum: 0
 *           description: Total stock across all branches
 *         lowStockThreshold:
 *           type: integer
 *           minimum: 0
 *           description: Low stock alert threshold
 *         variants:
 *           type: object
 *           description: Product variants (JSON)
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: Product image URLs
 *         active:
 *           type: boolean
 *           description: Product status
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             nameAr:
 *               type: string
 *         totalStock:
 *           type: integer
 *           description: Calculated total stock
 *         totalReserved:
 *           type: integer
 *           description: Calculated total reserved stock
 *         availableStock:
 *           type: integer
 *           description: Calculated available stock
 *         isLowStock:
 *           type: boolean
 *           description: Whether product has low stock
 *         isOutOfStock:
 *           type: boolean
 *           description: Whether product is out of stock
 *     
 *     CreateProductRequest:
 *       type: object
 *       required:
 *         - name
 *         - price
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         nameAr:
 *           type: string
 *           maxLength: 255
 *         description:
 *           type: string
 *           maxLength: 2000
 *         descriptionAr:
 *           type: string
 *           maxLength: 2000
 *         sku:
 *           type: string
 *           maxLength: 100
 *         barcode:
 *           type: string
 *           maxLength: 100
 *         categoryId:
 *           type: string
 *         price:
 *           type: number
 *           minimum: 0
 *         cost:
 *           type: number
 *           minimum: 0
 *         taxRate:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0
 *         trackInventory:
 *           type: boolean
 *           default: true
 *         stock:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         lowStockThreshold:
 *           type: integer
 *           minimum: 0
 *         variants:
 *           type: object
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         active:
 *           type: boolean
 *           default: true
 */

// ==================== Product Statistics (must be before /:id) ====================

/**
 * @swagger
 * /products/stats/overview:
 *   get:
 *     summary: Get product statistics
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product statistics retrieved successfully
 */
router.get('/stats/overview',
  productController.getProductStats
);

// Product categories (frontend expects /products/categories)
router.get('/categories', productCategoryController.getCategories);
router.post('/categories', productCategoryController.createCategory);

// ==================== Barcode Management (must be before /:id) ====================

/**
 * @swagger
 * /products/barcode/{barcode}:
 *   get:
 *     summary: Search product by barcode
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product found by barcode
 *       404:
 *         description: Product not found with this barcode
 */
router.get('/barcode/:barcode',
  [
    param('barcode').isString().isLength({ min: 1 }),
  ],
  productController.searchByBarcode
);

// ==================== Product CRUD ====================

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     description: Create a new product in the inventory system
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or duplicate SKU/barcode
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 */
router.post('/',
  [
    body('name').isString().isLength({ min: 1, max: 255 }),
    body('nameAr').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('descriptionAr').optional().isString().isLength({ max: 2000 }),
    body('sku').optional().isString().isLength({ max: 100 }),
    body('barcode').optional().isString().isLength({ max: 100 }),
    body('categoryId').optional().isString(),
    body('price').isFloat({ min: 0 }),
    body('cost').optional().isFloat({ min: 0 }),
    body('taxRate').optional().isFloat({ min: 0, max: 1 }),
    body('trackInventory').optional().isBoolean(),
    body('stock').optional().isInt({ min: 0 }),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
    body('variants').optional().isObject(),
    body('images').optional().isArray(),
    body('images.*').optional().isURL(),
    body('active').optional().isBoolean(),
  ],
  productController.createProduct
);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     description: Get all products with filtering, searching, and pagination
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, nameAr, sku, or barcode
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: trackInventory
 *         schema:
 *           type: boolean
 *         description: Filter by inventory tracking
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Show only low stock products
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 message:
 *                   type: string
 */
router.get('/',
  [
    query('search').optional().isString(),
    query('categoryId').optional().isString(),
    query('active').optional().isBoolean(),
    query('trackInventory').optional().isBoolean(),
    query('lowStock').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  productController.getProducts
);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     description: Get detailed information about a specific product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Product'
 *                     - type: object
 *                       properties:
 *                         inventories:
 *                           type: array
 *                           items:
 *                             type: object
 *                         movements:
 *                           type: array
 *                           items:
 *                             type: object
 *                 message:
 *                   type: string
 *       404:
 *         description: Product not found
 */
router.get('/:id',
  [
    param('id').isString().isLength({ min: 1 }),
  ],
  productController.getProduct
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     description: Update product information
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *                 message:
 *                   type: string
 *       404:
 *         description: Product not found
 *       400:
 *         description: Validation error or duplicate SKU/barcode
 */
router.put('/:id',
  [
    param('id').isString().isLength({ min: 1 }),
    body('name').optional().isString().isLength({ min: 1, max: 255 }),
    body('nameAr').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('descriptionAr').optional().isString().isLength({ max: 2000 }),
    body('sku').optional().isString().isLength({ max: 100 }),
    body('barcode').optional().isString().isLength({ max: 100 }),
    body('categoryId').optional().isString(),
    body('price').optional().isFloat({ min: 0 }),
    body('cost').optional().isFloat({ min: 0 }),
    body('taxRate').optional().isFloat({ min: 0, max: 1 }),
    body('trackInventory').optional().isBoolean(),
    body('stock').optional().isInt({ min: 0 }),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
    body('variants').optional().isObject(),
    body('images').optional().isArray(),
    body('images.*').optional().isURL(),
    body('active').optional().isBoolean(),
  ],
  productController.updateProduct
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Delete a product (only if no inventory or movement history exists)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Product not found
 *       400:
 *         description: Cannot delete product with existing inventory
 */
router.delete('/:id',
  [
    param('id').isString().isLength({ min: 1 }),
  ],
  productController.deleteProduct
);

export default router;