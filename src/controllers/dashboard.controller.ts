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

export const getMonthlyDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Company not found' });
      return;
    }
    const stats = await dashboardService.getMonthlyStats(companyId);
    const currentTotal = stats.currentMonth.breakdown.reduce((acc, curr) => acc + curr.value, 0);
    const previousTotal = stats.previousMonth.breakdown.reduce((acc, curr) => acc + curr.value, 0);
    const difference = currentTotal - previousTotal;
    res.json({
      currentMonth: currentTotal,
      previousMonth: previousTotal,
      difference: difference,
      currentMonthDate: stats.currentMonth.month,
      previousMonthDate: stats.previousMonth.month
    });
  } catch (error) {
    console.error('Monthly dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmissionsForCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Company not found' });
      return;
    }
    const emissions = await dashboardService.getEmissionsForCompany(companyId);
    res.json(emissions);
  } catch (error) {
    console.error('Monthly dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {  
  try {
    const analysis = await dashboardService.getAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leaderboard = await dashboardService.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
