import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

export interface CategoryFilters {
  search?: string;
  parentId?: string | null;
  active?: boolean;
  includeChildren?: boolean;
}

export class ProductCategoryController {
  
  // ==================== Category CRUD ====================

  /**
   * Create a new product category
   */
  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const categoryData = {
        ...req.body,
        companyId: req.user.companyId,
      };

      // Validate parent category exists if parentId is provided
      if (categoryData.parentId) {
        const parentCategory = await prisma.productCategory.findFirst({
          where: {
            id: categoryData.parentId,
            companyId: req.user.companyId,
          },
        });

        if (!parentCategory) {
          res.status(400).json({
            success: false,
            message: 'Parent category not found',
          });
          return;
        }
      }

      const category = await prisma.productCategory.create({
        data: categoryData,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              active: true,
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Product category created successfully',
      });
    } catch (error) {
      logger.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all product categories with hierarchy
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const filters: CategoryFilters = {
        search: req.query.search as string,
        parentId: req.query.parentId === 'null' ? null : req.query.parentId as string,
        active: req.query.active ? req.query.active === 'true' : undefined,
        includeChildren: req.query.includeChildren === 'true',
      };

      const where: Prisma.ProductCategoryWhereInput = {
        companyId: req.user.companyId,
      };

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { nameAr: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.parentId !== undefined) {
        where.parentId = filters.parentId;
      }

      if (filters.active !== undefined) {
        where.active = filters.active;
      }

      const categories = await prisma.productCategory.findMany({
        where,
        include: {
          parent: filters.includeChildren ? {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          } : false,
          children: filters.includeChildren ? {
            where: { active: true },
            select: {
              id: true,
              name: true,
              nameAr: true,
              active: true,
              order: true,
              _count: {
                select: { products: true },
              },
            },
            orderBy: { order: 'asc' },
          } : false,
          _count: {
            select: {
              products: {
                where: { active: true },
              },
              children: {
                where: { active: true },
              },
            },
          },
        },
        orderBy: [
          { order: 'asc' },
          { name: 'asc' },
        ],
      });

      // If requesting hierarchy view (root categories with children)
      if (filters.includeChildren && filters.parentId === undefined) {
        // Filter to show only root categories (parentId: null) with their children
        const rootCategories = categories.filter(cat => cat.parentId === null);
        
        res.json({
          success: true,
          data: rootCategories,
          message: 'Product categories retrieved successfully',
        });
        return;
      }

      res.json({
        success: true,
        data: categories,
        message: 'Product categories retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a single category by ID
   */
  async getCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;

      const category = await prisma.productCategory.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              active: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },
          products: {
            where: { active: true },
            take: 10, // Limit to first 10 products
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
              active: true,
            },
            orderBy: { name: 'asc' },
          },
          _count: {
            select: {
              products: {
                where: { active: true },
              },
              children: {
                where: { active: true },
              },
            },
          },
        },
      });

      if (!category) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      res.json({
        success: true,
        data: category,
        message: 'Category retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update a category
   */
  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;

      // Check if category exists and belongs to company
      const existingCategory = await prisma.productCategory.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
      });

      if (!existingCategory) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      const updateData = { ...req.body };

      // Validate parent category if being updated
      if (updateData.parentId) {
        // Prevent setting self as parent
        if (updateData.parentId === id) {
          res.status(400).json({
            success: false,
            message: 'Category cannot be its own parent',
          });
          return;
        }

        // Check if new parent exists
        const parentCategory = await prisma.productCategory.findFirst({
          where: {
            id: updateData.parentId,
            companyId: req.user.companyId,
          },
        });

        if (!parentCategory) {
          res.status(400).json({
            success: false,
            message: 'Parent category not found',
          });
          return;
        }

        // Check for circular reference (prevent parent from being a child of this category)
        const isCircular = await this.checkCircularReference(id, updateData.parentId, req.user.companyId);
        if (isCircular) {
          res.status(400).json({
            success: false,
            message: 'Circular reference detected. Parent cannot be a descendant of this category.',
          });
          return;
        }
      }

      const category = await prisma.productCategory.update({
        where: { id },
        data: updateData,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              active: true,
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              products: true,
              children: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully',
      });
    } catch (error) {
      logger.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;

      // Check if category exists and belongs to company
      const category = await prisma.productCategory.findFirst({
        where: {
          id,
          companyId: req.user.companyId,
        },
        include: {
          products: true,
          children: true,
        },
      });

      if (!category) {
        res.status(404).json({
          success: false,
          message: 'Category not found',
        });
        return;
      }

      // Check if category has products or children
      if (category.products.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete category with existing products. Move products to another category first.',
        });
        return;
      }

      if (category.children.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete category with subcategories. Delete or move subcategories first.',
        });
        return;
      }

      await prisma.productCategory.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Category Management ====================

  /**
   * Reorder categories
   */
  async reorderCategories(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { categoryOrders } = req.body; // Array of { id, order }

      if (!Array.isArray(categoryOrders)) {
        res.status(400).json({
          success: false,
          message: 'categoryOrders must be an array',
        });
        return;
      }

      // Validate all categories belong to the company
      const categoryIds = categoryOrders.map(item => item.id);
      const existingCategories = await prisma.productCategory.findMany({
        where: {
          id: { in: categoryIds },
          companyId: req.user.companyId,
        },
      });

      if (existingCategories.length !== categoryIds.length) {
        res.status(400).json({
          success: false,
          message: 'Some categories not found or do not belong to your company',
        });
        return;
      }

      // Update orders in transaction
      await prisma.$transaction(
        categoryOrders.map(({ id, order }) =>
          prisma.productCategory.update({
            where: { id },
            data: { order },
          })
        )
      );

      res.json({
        success: true,
        message: 'Categories reordered successfully',
      });
    } catch (error) {
      logger.error('Error reordering categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder categories',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Category Statistics ====================

  /**
   * Get category statistics
   */
  async getCategoryStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const [
        totalCategories,
        activeCategories,
        rootCategories,
        categoriesWithProducts,
        avgProductsPerCategory,
        topCategories,
      ] = await Promise.all([
        prisma.productCategory.count({
          where: { companyId: req.user.companyId },
        }),
        prisma.productCategory.count({
          where: { companyId: req.user.companyId, active: true },
        }),
        prisma.productCategory.count({
          where: { companyId: req.user.companyId, parentId: null },
        }),
        prisma.productCategory.count({
          where: {
            companyId: req.user.companyId,
            products: { some: {} },
          },
        }),
        prisma.productCategory.aggregate({
          where: { companyId: req.user.companyId },
          _avg: {
            products: {
              _count: true,
            } as any,
          },
        }),
        prisma.productCategory.findMany({
          where: { companyId: req.user.companyId, active: true },
          include: {
            _count: {
              select: {
                products: { where: { active: true } },
              },
            },
          },
          orderBy: {
            products: {
              _count: 'desc',
            },
          },
          take: 5,
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalCategories,
          activeCategories,
          inactiveCategories: totalCategories - activeCategories,
          rootCategories,
          subcategories: totalCategories - rootCategories,
          categoriesWithProducts,
          emptyCategoriesCount: totalCategories - categoriesWithProducts,
          averageProductsPerCategory: Math.round(avgProductsPerCategory._avg.products || 0),
          topCategoriesByProductCount: topCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            nameAr: cat.nameAr,
            productCount: cat._count.products,
          })),
        },
        message: 'Category statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting category stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve category statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Check for circular reference in category hierarchy
   */
  private async checkCircularReference(categoryId: string, parentId: string, companyId: string): Promise<boolean> {
    const checkParent = async (currentParentId: string): Promise<boolean> => {
      if (currentParentId === categoryId) {
        return true; // Circular reference found
      }

      const parent = await prisma.productCategory.findFirst({
        where: { id: currentParentId, companyId },
        select: { parentId: true },
      });

      if (parent?.parentId) {
        return checkParent(parent.parentId);
      }

      return false;
    };

    return checkParent(parentId);
  }
}

// Export singleton instance
export const productCategoryController = new ProductCategoryController();