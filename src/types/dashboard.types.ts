export interface EmissionBreakdown {
  source: string;
  value: number;
}

export interface MonthlyData {
  month: number;
  electricity: number;
  naturalGas: number;
  vehicles: number;
  waste: number;
  other: number;
  total: number;
}

export interface DashboardStats {
  daily: {
    breakdown: EmissionBreakdown[];
    date: string;
  };
  monthly: {
    breakdown: EmissionBreakdown[];
    month: string;
  };
  yearly: {
    monthlyData: MonthlyData[];
    year: string;
  };
} 

export interface AnalyticsStats {
  currentMonth: {
    breakdown: {
      source: string;
      value: number;
    }[];
    month: string;
  };
  previousMonth: {
    breakdown: {
      source: string;
      value: number;
    }[];
    month: string;
  };
}