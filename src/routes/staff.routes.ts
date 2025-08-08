import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Temporarily disabled staff routes due to compilation errors
// TODO: Fix staff controller compilation issues and restore routes

export default router;