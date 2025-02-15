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