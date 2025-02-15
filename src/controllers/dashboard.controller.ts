import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateEmissionDate } from '../utils/dateValidation';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const companyId = req.body.companyId;
    const requestDate = req.query.date ? new Date(req.query.date as string) : new Date();

    // Validate request date
    const dateValidation = validateEmissionDate(requestDate);
    if (!dateValidation.isValid) {
      res.status(400).json({ error: dateValidation.message });
      return;
    }

    if (!companyId) {
      res.status(400).json({ error: 'Company ID is required' });
      return;
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: parseInt(companyId) }
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Get daily emissions breakdown by category
    const dailyBreakdown = await prisma.emission.groupBy({
      by: ['category'],
      where: {
        companyId: parseInt(companyId),
        date: {
          gte: startOfDay,
        },
      },
      _sum: {
        carbonValue: true,
      },
    });

    // Get monthly emissions breakdown by category
    const monthlyBreakdown = await prisma.emission.groupBy({
      by: ['category'],
      where: {
        companyId: parseInt(companyId),
        date: {
          gte: startOfMonth,
        },
      },
      _sum: {
        carbonValue: true,
      },
    });

    // Get yearly breakdown by month
    const yearlyBreakdown = await prisma.yearlyEmissionBreakdown.findMany({
      where: {
        companyId: parseInt(companyId),
        year: today.getFullYear(),
      },
      orderBy: {
        month: 'asc',
      },
    });

    const dashboardStats = {
      daily: {
        breakdown: dailyBreakdown.map(item => ({
          source: item.category,
          value: item._sum?.carbonValue || 0,
        })),
        date: startOfDay.toISOString(),
      },
      monthly: {
        breakdown: monthlyBreakdown.map(item => ({
          source: item.category,
          value: item._sum?.carbonValue || 0,
        })),
        month: startOfMonth.toISOString(),
      },
      yearly: {
        monthlyData: Array.from({ length: 12 }, (_, i) => {
          const monthData = yearlyBreakdown.find(b => b.month === i + 1);
          return {
            month: i + 1,
            electricity: monthData?.electricity || 0,
            naturalGas: monthData?.naturalGas || 0,
            vehicles: monthData?.vehicles || 0,
            waste: monthData?.waste || 0,
            other: monthData?.other || 0,
            total: monthData?.total || 0,
          };
        }),
        year: startOfYear.toISOString(),
      },
    };

    res.json(dashboardStats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 