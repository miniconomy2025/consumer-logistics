// KPI Analytics Component - Detailed Key Performance Indicators

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useKPIAnalytics } from "@/lib/hooks/useDashboard";
import { formatCurrency, formatNumber, formatGrowth, getGrowthColor, formatPercentage } from "@/lib/utils/formatters";
import { AnalyticsQueryParams } from "@/lib/types/api";

interface KPIAnalyticsProps {
  dateRange?: AnalyticsQueryParams;
}

export function KPIAnalytics({ dateRange }: KPIAnalyticsProps) {
  const { data: kpis, loading, error } = useKPIAnalytics(dateRange);

  if (loading) {
    return <KPIAnalyticsSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load KPI data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Revenue KPIs */}
      <RevenueKPIs kpis={kpis} />
      
      {/* Pickup KPIs */}
      <PickupKPIs kpis={kpis} />
      
      {/* Company KPIs */}
      <CompanyKPIs kpis={kpis} />
      
      {/* Performance KPIs */}
      <PerformanceKPIs kpis={kpis} />
      
      {/* Period Information */}
      <PeriodInformation kpis={kpis} />
    </div>
  );
}

// Revenue KPIs Component
function RevenueKPIs({ kpis }: { kpis: any }) {
  const revenueMetrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(kpis.totalRevenue),
      growth: kpis.revenueGrowthRate,
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(kpis.monthlyRevenue),
      growth: 0, // Not provided
      icon: BarChart3,
      color: "blue",
    },
    {
      title: "Average Order Value",
      value: formatCurrency(kpis.averageOrderValue),
      growth: 0, // Not provided
      icon: Activity,
      color: "purple",
    },
  ];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Revenue Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {revenueMetrics.map((metric, index) => (
            <KPICard key={index} metric={metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Pickup KPIs Component
function PickupKPIs({ kpis }: { kpis: any }) {
  const pickupMetrics = [
    {
      title: "Total Pickups",
      value: formatNumber(kpis.totalPickups),
      growth: kpis.pickupGrowthRate,
      icon: Package,
      color: "blue",
    },
    {
      title: "Monthly Pickups",
      value: formatNumber(kpis.monthlyPickups),
      growth: 0, // Not provided
      icon: BarChart3,
      color: "indigo",
    },
    {
      title: "Avg Pickups/Company",
      value: formatNumber(kpis.averagePickupsPerCompany, 1),
      growth: 0, // Not provided
      icon: Target,
      color: "orange",
    },
  ];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          Pickup Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {pickupMetrics.map((metric, index) => (
            <KPICard key={index} metric={metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Company KPIs Component
function CompanyKPIs({ kpis }: { kpis: any }) {
  const companyMetrics = [
    {
      title: "Total Companies",
      value: formatNumber(kpis.totalCompanies),
      growth: 0, // Not provided
      icon: Users,
      color: "purple",
    },
    {
      title: "Active Companies",
      value: formatNumber(kpis.activeCompanies),
      growth: 0, // Not provided
      icon: Activity,
      color: "green",
    },
    {
      title: "New Companies",
      value: formatNumber(kpis.newCompanies),
      growth: 0, // Not provided
      icon: TrendingUp,
      color: "blue",
    },
    {
      title: "Retention Rate",
      value: formatPercentage(kpis.companyRetentionRate),
      growth: 0, // Not provided
      icon: Target,
      color: "orange",
    },
  ];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          Company Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {companyMetrics.map((metric, index) => (
            <KPICard key={index} metric={metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Performance KPIs Component
function PerformanceKPIs({ kpis }: { kpis: any }) {
  const performanceMetrics = [
    {
      title: "Avg Processing Time",
      value: `${formatNumber(kpis.averageProcessingTime, 1)} days`,
      growth: 0, // Not provided
      icon: Clock,
      color: "yellow",
    },
    {
      title: "Completion Rate",
      value: formatPercentage(kpis.completionRate),
      growth: 0, // Not provided
      icon: Target,
      color: "green",
    },
    {
      title: "Pending Ratio",
      value: formatPercentage(kpis.pendingPickupsRatio),
      growth: 0, // Not provided
      icon: PieChart,
      color: "orange",
    },
  ];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {performanceMetrics.map((metric, index) => (
            <KPICard key={index} metric={metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Period Information Component
function PeriodInformation({ kpis }: { kpis: any }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Period Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Current Period</h4>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Start:</span> {kpis.periodStart || 'Not specified'}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">End:</span> {kpis.periodEnd || 'Not specified'}
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-slate-900 mb-2">Comparison Period</h4>
            <div className="space-y-1">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Start:</span> {kpis.comparisonPeriodStart || 'Not specified'}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">End:</span> {kpis.comparisonPeriodEnd || 'Not specified'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Reusable KPI Card Component
function KPICard({ metric }: { metric: any }) {
  const Icon = metric.icon;
  const growthColor = getGrowthColor(metric.growth);
  const GrowthIcon = metric.growth >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 bg-${metric.color}-100 rounded-lg`}>
          <Icon className={`h-4 w-4 text-${metric.color}-600`} />
        </div>
        {metric.growth !== 0 && (
          <div className={`flex items-center gap-1 text-xs ${growthColor}`}>
            <GrowthIcon className="h-3 w-3" />
            <span>{formatGrowth(metric.growth)}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {metric.title}
        </p>
        <p className="text-lg font-semibold text-slate-900 mt-1">
          {metric.value}
        </p>
      </div>
    </div>
  );
}

// Loading Skeleton Component
function KPIAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-slate-200 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
