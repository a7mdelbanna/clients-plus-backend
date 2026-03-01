import { Router } from 'express';
import { body, param } from 'express-validator';
import { clientCategoryController } from '../controllers/client-category.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', clientCategoryController.getCategories);

router.post('/',
  [
    body('name').isString().isLength({ min: 1, max: 255 }),
    body('nameAr').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('color').optional().isString().matches(/^#[0-9A-Fa-f]{6}$/),
    body('icon').optional().isString().isLength({ max: 100 }),
    body('order').optional().isInt({ min: 0 }),
    body('active').optional().isBoolean(),
    body('branchId').optional().isString(),
  ],
  clientCategoryController.createCategory
);

router.put('/:id',
  [
    param('id').isString().isLength({ min: 1 }),
    body('name').optional().isString().isLength({ min: 1, max: 255 }),
    body('nameAr').optional().isString().isLength({ max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('color').optional().isString().matches(/^#[0-9A-Fa-f]{6}$/),
    body('icon').optional().isString().isLength({ max: 100 }),
    body('order').optional().isInt({ min: 0 }),
    body('active').optional().isBoolean(),
  ],
  clientCategoryController.updateCategory
);

router.delete('/:id',
  [
    param('id').isString().isLength({ min: 1 }),
  ],
  clientCategoryController.deleteCategory
);

export default router;
