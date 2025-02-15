import { Router } from 'express';
import { getDashboardStats, getAllDashboardStats } from '../controllers/dashboard.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, getDashboardStats);
router.get('/all', authenticateJWT, getAllDashboardStats);

export default router; 