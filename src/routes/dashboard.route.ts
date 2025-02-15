import { Router } from 'express';
import { getDashboardStats, getAllDashboardStats, getMonthlyDashboardStats, getAnalysis, getEmissionsForCompany } from '../controllers/dashboard.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
const router = Router();

router.get('/', authenticateJWT, getDashboardStats);
router.get('/all', authenticateJWT, getAllDashboardStats);
router.get('/monthly', authenticateJWT, getMonthlyDashboardStats); // Returns the current and previous month's emissions
router.get('/analysis', authenticateJWT, getAnalysis); // Returns the carbonWeighted analysis for all companies
router.get('/company-emissions', authenticateJWT, getEmissionsForCompany); // Returns the emissions for the current month
export default router; 