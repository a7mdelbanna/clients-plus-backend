import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export class ClientCategoryController {

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const where: any = {
        companyId: req.user.companyId,
      };

      if (req.query.active !== undefined) {
        where.active = req.query.active === 'true';
      }

      if (req.query.branchId) {
        where.OR = [
          { branchId: req.query.branchId as string },
          { branchId: null },
        ];
      }

      if (req.query.search) {
        const search = req.query.search as string;
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { nameAr: { contains: search, mode: 'insensitive' } },
        ];
      }

      const categories = await prisma.clientCategory.findMany({
        where,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });

      res.json({
        success: true,
        data: categories,
        message: 'Client categories retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting client categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve client categories',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const category = await prisma.clientCategory.create({
        data: {
          ...req.body,
          companyId: req.user.companyId,
          createdBy: req.user.userId,
        },
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Client category created successfully',
      });
    } catch (error) {
      logger.error('Error creating client category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create client category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const existing = await prisma.clientCategory.findFirst({
        where: { id, companyId: req.user.companyId },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }

      const category = await prisma.clientCategory.update({
        where: { id },
        data: req.body,
      });

      res.json({
        success: true,
        data: category,
        message: 'Client category updated successfully',
      });
    } catch (error) {
      logger.error('Error updating client category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update client category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const existing = await prisma.clientCategory.findFirst({
        where: { id, companyId: req.user.companyId },
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Category not found' });
        return;
      }

      // Soft delete
      await prisma.clientCategory.update({
        where: { id },
        data: { active: false },
      });

      res.json({
        success: true,
        message: 'Client category deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting client category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete client category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const clientCategoryController = new ClientCategoryController();
