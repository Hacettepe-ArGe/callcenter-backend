import prisma from '../config/prisma'
import { DashboardStats, AnalyticsStats } from '../types/dashboard.types'

export class DashboardService {
  async getMonthlyStats(companyId: number): Promise<AnalyticsStats> {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

    // Get current month's emissions
    const currentMonthEmissions = await prisma.emission.groupBy({
      by: ['category'],
      where: {
        companyId,
        date: { 
          gte: startOfMonth ,
          lte: today
        }
      },
      _sum: {
        carbonValue: true
      }
    })

    // Get previous month's emissions
    const previousMonthEmissions = await prisma.emission.groupBy({
      by: ['category'],
      where: {
        companyId,
        date: { 
          gte: startOfPreviousMonth,
          lte: startOfMonth
        }
      },
      _sum: {
        carbonValue: true
      }
    })

    return {
      currentMonth: {
        breakdown: currentMonthEmissions.map(e => ({
          source: e.category,
          value: Number(e._sum.carbonValue) || 0
        })),
        month: startOfMonth.toISOString()
      },
      previousMonth: {
        breakdown: previousMonthEmissions.map(e => ({
          source: e.category,
          value: Number(e._sum.carbonValue) || 0
        })),
        month: startOfPreviousMonth.toISOString()
      }
    }
  }

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
        date: { gte: startOfDay, lte: today }
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
        date: { gte: startOfMonth, lte: today }
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
        date: { gte: startOfYear, lte: today}
      },
      _sum: {
        carbonValue: true
      }
    })

    // Process yearly data into monthly breakdown
    const monthlyData = Array.from({ length: 12 }, (_, month) => {
      const monthEmissions = yearlyEmissions.filter(e => 
        new Date(e.date).getMonth() === month && new Date(e.date).getFullYear() === today.getFullYear()
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

   async getAnalysis(): Promise<any> {
    const emissions = await prisma.emission.findMany();
    const companies: any = {};
    for (const emission of emissions) {
      if (emission.companyId) {
        if(!companies[emission.companyId]){
          companies[emission.companyId] = {
            company: emission.companyId,
            totalCarbon: Number(emission.carbonValue),
            company_expense: emission.scope === 'SIRKET' ? Number(emission.carbonValue) : 0
          }
        } else {
          if(emission.scope === 'CALISAN'){
            companies[emission.companyId].totalCarbon += Number(emission.carbonValue);
          } else {
            companies[emission.companyId].company_expense = Number(emission.carbonValue);
            companies[emission.companyId].totalCarbon += Number(emission.carbonValue);
          }
        }
      }
    }
    return Object.values(companies).map((company: any) => ({
      company: company.company,
      totalCarbonWeighted: company.totalCarbon * 0.75 + company.company_expense * 0.25,
    }));
  }
  async getEmissionsForCompany(companyId: number,): Promise<any> {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const emissions = await prisma.emission.findMany({
      where: {
        companyId,
        date: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      }
    });
    return emissions;
  }
} 