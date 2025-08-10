import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { productCategoryController } from '../controllers/product-category.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductCategory:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: Category ID
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Category name
 *         nameAr:
 *           type: string
 *           maxLength: 255
 *           description: Category name in Arabic
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Category description
 *         parentId:
 *           type: string
 *           nullable: true
 *           description: Parent category ID for hierarchical structure
 *         order:
 *           type: integer
 *           default: 0
 *           description: Display order
 *         color:
 *           type: string
 *           maxLength: 7
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *           description: Category color (hex code)
 *         icon:
 *           type: string
 *           maxLength: 100
 *           description: Icon identifier or class name
 *         active:
 *           type: boolean
 *           default: true
 *           description: Category status
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         parent:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             nameAr:
 *               type: string
 *         children:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               active:
 *                 type: boolean
 *               order:
 *                 type: integer
 *         _count:
 *           type: object
 *           properties:
 *             products:
 *               type: integer
 *             children:
 *               type: integer
 *     
 *     CreateCategoryRequest:
 *       type: object
 *       required:
 *         - name
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
 *           maxLength: 1000
 *         parentId:
 *           type: string
 *           nullable: true
 *         order:
 *           type: integer
 *           default: 0
 *         color:
 *           type: string
 *           maxLength: 7
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *         icon:
 *           type: string
 *           maxLength: 100
 *         active:
 *           type: boolean
 *           default: true
 *     
 *     CategoryOrder:
 *       type: object
 *       required:
 *         - id
 *         - order
 *       properties:
 *         id:
 *           type: string
 *         order:
 *           type: integer
 */

// ==================== Category CRUD ====================

/**
 * @swagger
 * /product-categories:
 *   post:
 *     summary: Create a new product category
 *     description: Create a new product category with optional parent for hierarchical structure
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProductCategory'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or parent category not found
 */
router.post('/',
  [
    body('name').isString().isLength({ min: 1, max: 255 }),
    body('nameAr').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('parentId').optional().isString(),
    body('order').optional().isInt({ min: 0 }),
    body('color').optional().isString().matches(/^#[0-9A-Fa-f]{6}$/),
    body('icon').optional().isString().isLength({ max: 100 }),
    body('active').optional().isBoolean(),
  ],
  productCategoryController.createCategory
);

/**
 * @swagger
 * /product-categories:
 *   get:
 *     summary: Get all product categories
 *     description: Get all product categories with filtering and optional hierarchical structure
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, nameAr, or description
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: Filter by parent category (use "null" for root categories)
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: includeChildren
 *         schema:
 *           type: boolean
 *         description: Include children in the response for hierarchical view
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                     $ref: '#/components/schemas/ProductCategory'
 *                 message:
 *                   type: string
 */
router.get('/',
  [
    query('search').optional().isString(),
    query('parentId').optional().isString(),
    query('active').optional().isBoolean(),
    query('includeChildren').optional().isBoolean(),
  ],
  productCategoryController.getCategories
);

/**
 * @swagger
 * /product-categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     description: Get detailed information about a specific category including products
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/ProductCategory'
 *                     - type: object
 *                       properties:
 *                         products:
 *                           type: array
 *                           items:
 *                             type: object
 *                 message:
 *                   type: string
 *       404:
 *         description: Category not found
 */
router.get('/:id',
  [
    param('id').isString().isLength({ min: 1 }),
  ],
  productCategoryController.getCategory
);

/**
 * @swagger
 * /product-categories/{id}:
 *   put:
 *     summary: Update a category
 *     description: Update category information including parent relationship
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProductCategory'
 *                 message:
 *                   type: string
 *       404:
 *         description: Category not found
 *       400:
 *         description: Validation error, circular reference, or parent not found
 */
router.put('/:id',
  [
    param('id').isString().isLength({ min: 1 }),
    body('name').optional().isString().isLength({ min: 1, max: 255 }),
    body('nameAr').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('parentId').optional().isString(),
    body('order').optional().isInt({ min: 0 }),
    body('color').optional().isString().matches(/^#[0-9A-Fa-f]{6}$/),
    body('icon').optional().isString().isLength({ max: 100 }),
    body('active').optional().isBoolean(),
  ],
  productCategoryController.updateCategory
);

/**
 * @swagger
 * /product-categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     description: Delete a category (only if no products or subcategories exist)
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
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
 *         description: Category not found
 *       400:
 *         description: Cannot delete category with existing products or subcategories
 */
router.delete('/:id',
  [
    param('id').isString().isLength({ min: 1 }),
  ],
  productCategoryController.deleteCategory
);

// ==================== Category Management ====================

/**
 * @swagger
 * /product-categories/reorder:
 *   put:
 *     summary: Reorder categories
 *     description: Update the display order of multiple categories
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryOrders
 *             properties:
 *               categoryOrders:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/CategoryOrder'
 *                 description: Array of category IDs with their new order values
 *     responses:
 *       200:
 *         description: Categories reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or categories not found
 */
router.put('/reorder',
  [
    body('categoryOrders').isArray({ min: 1 }),
    body('categoryOrders.*.id').isString().isLength({ min: 1 }),
    body('categoryOrders.*.order').isInt({ min: 0 }),
  ],
  productCategoryController.reorderCategories
);

// ==================== Category Statistics ====================

/**
 * @swagger
 * /product-categories/stats/overview:
 *   get:
 *     summary: Get category statistics
 *     description: Get overview statistics for product categories
 *     tags: [Product Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCategories:
 *                       type: integer
 *                     activeCategories:
 *                       type: integer
 *                     inactiveCategories:
 *                       type: integer
 *                     rootCategories:
 *                       type: integer
 *                     subcategories:
 *                       type: integer
 *                     categoriesWithProducts:
 *                       type: integer
 *                     emptyCategoriesCount:
 *                       type: integer
 *                     averageProductsPerCategory:
 *                       type: integer
 *                     topCategoriesByProductCount:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           nameAr:
 *                             type: string
 *                           productCount:
 *                             type: integer
 *                 message:
 *                   type: string
 */
router.get('/stats/overview',
  productCategoryController.getCategoryStats
);

export default router;