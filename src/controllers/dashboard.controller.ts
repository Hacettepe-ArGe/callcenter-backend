import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const dashboardService = new DashboardService();

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stats = await dashboardService.getStats(companyId);
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // if (!req.user?.isAdmin) {
    //   res.status(403).json({ error: 'Forbidden' });
    //   return;
    // }

    const stats = await dashboardService.getAllStats();
    res.json(stats);
  } catch (error) {
    console.error('All dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 