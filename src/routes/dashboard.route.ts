import { Router } from 'express';
import { getDashboardStats, getAllDashboardStats, getMonthlyDashboardStats } from '../controllers/dashboard.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, getDashboardStats);
router.get('/all', authenticateJWT, getAllDashboardStats);
router.get('/monthly', authenticateJWT, getMonthlyDashboardStats);
export default router; 