import prisma from '../config/prisma'
import { DashboardStats } from '../types/dashboard.types'

export class DashboardService {
  async getStats(companyId: number): Promise<DashboardStats> {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    // Get daily emissions
    const dailyEmissions = await prisma.emission.groupBy({
      by: ['category'],
      where: {
        companyId,
        date: { gte: startOfDay }
      },
      _sum: {
        carbonValue: true
      }
    })

    // Get monthly emissions
    const monthlyEmissions = await prisma.emission.groupBy({
      by: ['category'],
      where: {
        companyId,
        date: { gte: startOfMonth }
      },
      _sum: {
        carbonValue: true
      }
    })

    // Get yearly data grouped by month and category
    const yearlyEmissions = await prisma.emission.groupBy({
      by: ['category', 'date'],
      where: {
        companyId,
        date: { gte: startOfYear }
      },
      _sum: {
        carbonValue: true
      }
    })

    // Process yearly data into monthly breakdown
    const monthlyData = Array.from({ length: 12 }, (_, month) => {
      const monthEmissions = yearlyEmissions.filter(e => 
        new Date(e.date).getMonth() === month
      )

      return {
        month: month + 1,
        electricity: this.sumCategory(monthEmissions, 'elektrik'),
        naturalGas: this.sumCategory(monthEmissions, 'dogalgaz'),
        vehicles: this.sumCategory(monthEmissions, 'dizel_otomobil'),
        waste: this.sumCategory(monthEmissions, 'su'),
        other: this.sumOtherCategories(monthEmissions, ['elektrik', 'dogalgaz', 'dizel_otomobil', 'su']),
        total: monthEmissions.reduce((sum, e) => sum + Number(e._sum.carbonValue || 0), 0)
      }
    })

    return {
      daily: {
        breakdown: dailyEmissions.map(e => ({
          source: e.category,
          value: Number(e._sum.carbonValue) || 0
        })),
        date: startOfDay.toISOString()
      },
      monthly: {
        breakdown: monthlyEmissions.map(e => ({
          source: e.category,
          value: Number(e._sum.carbonValue) || 0
        })),
        month: startOfMonth.toISOString()
      },
      yearly: {
        monthlyData,
        year: startOfYear.toISOString()
      }
    }
  }

  private sumCategory(emissions: any[], category: string): number {
    return emissions
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + Number(e._sum.carbonValue || 0), 0)
  }

  private sumOtherCategories(emissions: any[], excludeCategories: string[]): number {
    return emissions
      .filter(e => !excludeCategories.includes(e.category))
      .reduce((sum, e) => sum + Number(e._sum.carbonValue || 0), 0)
  }

  async getAllStats(): Promise<{ 
    [companyId: number]: { 
      name: string;
      totalCarbon: number;
      monthlyAverage: number;
      lastMonthChange: number;
    } 
  }> {
    const companies = await prisma.company.findMany();
    const stats: { [key: number]: any } = {};

    for (const company of companies) {
      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      const [thisMonthTotal, lastMonthTotal] = await Promise.all([
        prisma.emission.groupBy({
          by: ['companyId'],
          where: {
            companyId: company.id,
            date: { gte: thisMonth }
          },
          _sum: { carbonValue: true }
        }),
        prisma.emission.groupBy({
          by: ['companyId'],
          where: {
            companyId: company.id,
            date: {
              gte: lastMonth,
              lt: thisMonth
            }
          },
          _sum: { carbonValue: true }
        })
      ]);

      const thisMonthValue = Number(thisMonthTotal[0]?._sum.carbonValue || 0);
      const lastMonthValue = Number(lastMonthTotal[0]?._sum.carbonValue || 0);
      
      stats[company.id] = {
        name: company.name,
        totalCarbon: Number(company.totalCarbon),
        monthlyAverage: Number(company.totalCarbon) / 12,
        lastMonthChange: lastMonthValue ? 
          ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100 : 0
      };
    }

    return stats;
  }
} 