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
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useDashboardAnalytics } from "@/lib/hooks/useAnalytics";
import { formatCurrency, formatNumber, formatGrowth, getGrowthColor } from "@/lib/utils/formatters";
import { AnalyticsQueryParams, DashboardAnalyticsResponse } from "@/lib/types/analytics";

interface AnalyticsDashboardProps {
  dateRange?: AnalyticsQueryParams;
  data?: DashboardAnalyticsResponse | null;
  loading?: boolean;
  error?: string | null;
}

export function AnalyticsDashboard({ dateRange, data: propData, loading: propLoading, error: propError }: AnalyticsDashboardProps) {
  // Use prop data if provided, otherwise fetch data
  const hookResult = useDashboardAnalytics(propData ? undefined : dateRange);

  const analytics = propData ?? hookResult.data;
  const loading = propLoading ?? hookResult.loading;
  const error = propError ?? hookResult.error;

  if (loading) {
    return <AnalyticsDashboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-medium">Failed to load analytics data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Main KPI Cards */}
      <AnalyticsKPICards analytics={analytics} />
      
      {/* Secondary Metrics */}
      <AnalyticsSecondaryMetrics analytics={analytics} />
      
      {/* Recent Activity and Top Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPickupsCard pickups={analytics.recentPickups} />
        <TopCompaniesCard companies={analytics.topCompanies} />
      </div>
      
      {/* Status Distribution */}
      <StatusDistributionCard statusData={analytics.statusDistribution} />
    </div>
  );
}

// Color mappings for KPI cards
const kpiColorClasses = {
  green: {
    background: "bg-green-100",
    icon: "text-green-600",
  },
  blue: {
    background: "bg-blue-100",
    icon: "text-blue-600",
  },
  purple: {
    background: "bg-purple-100",
    icon: "text-purple-600",
  },
  orange: {
    background: "bg-orange-100",
    icon: "text-orange-600",
  },
} as const;

type KpiColor = keyof typeof kpiColorClasses;

// KPI Cards Component
function AnalyticsKPICards({ analytics }: { analytics: DashboardAnalyticsResponse }) {
  const kpiCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(analytics.totalRevenue),
      growth: analytics.revenueGrowth,
      icon: DollarSign,
      color: "green" as KpiColor,
    },
    {
      title: "Total Pickups",
      value: formatNumber(analytics.totalPickups),
      growth: analytics.pickupGrowth,
      icon: Package,
      color: "blue" as KpiColor,
    },
    {
      title: "Average Order Value",
      value: formatCurrency(analytics.averageOrderValue),
      growth: 0, // Not provided by backend
      icon: Activity,
      color: "purple" as KpiColor,
    },
    {
      title: "Total Companies",
      value: formatNumber(analytics.totalCompanies),
      growth: analytics.companyGrowth,
      icon: Users,
      color: "orange" as KpiColor,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        const growthColor = getGrowthColor(kpi.growth);
        const GrowthIcon = kpi.growth >= 0 ? TrendingUp : TrendingDown;
        const colorClasses = kpiColorClasses[kpi.color];

        return (
          <Card key={index} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">
                    {kpi.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {kpi.value}
                  </p>
                  {kpi.growth !== 0 && (
                    <div className={`flex items-center gap-1 text-sm ${growthColor}`}>
                      <GrowthIcon className="h-4 w-4" />
                      <span>{formatGrowth(kpi.growth)}</span>
                    </div>
                  )}
                </div>
                <div className={`p-3 ${colorClasses.background} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Color mappings for secondary metrics
const secondaryMetricColorClasses = {
  yellow: {
    background: "bg-yellow-100",
    icon: "text-yellow-600",
  },
  green: {
    background: "bg-green-100",
    icon: "text-green-600",
  },
  blue: {
    background: "bg-blue-100",
    icon: "text-blue-600",
  },
} as const;

type SecondaryMetricColor = keyof typeof secondaryMetricColorClasses;

// Secondary Metrics Component
function AnalyticsSecondaryMetrics({ analytics }: { analytics: DashboardAnalyticsResponse }) {
  const secondaryMetrics = [
    {
      title: "Pending Pickups",
      value: formatNumber(analytics.pendingPickups),
      icon: Clock,
      color: "yellow" as SecondaryMetricColor,
    },
    {
      title: "Completed Pickups",
      value: formatNumber(analytics.completedPickups),
      icon: CheckCircle,
      color: "green" as SecondaryMetricColor,
    },
    {
      title: "Active Companies",
      value: formatNumber(analytics.activeCompanies),
      icon: Users,
      color: "blue" as SecondaryMetricColor,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {secondaryMetrics.map((metric, index) => {
        const Icon = metric.icon;
        const colorClasses = secondaryMetricColorClasses[metric.color];

        return (
          <Card key={index} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${colorClasses.background} rounded-lg`}>
                  <Icon className={`h-5 w-5 ${colorClasses.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {metric.title}
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    {metric.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Recent Pickups Card Component
function RecentPickupsCard({ pickups }: { pickups: DashboardAnalyticsResponse['recentPickups'] }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Pickups</CardTitle>
      </CardHeader>
      <CardContent>
        {pickups.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No recent pickups</p>
        ) : (
          <div className="space-y-3">
            {pickups.slice(0, 5).map((pickup, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{pickup.customer}</p>
                  <p className="text-sm text-slate-500">{pickup.companyName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">{formatCurrency(pickup.amount)}</p>
                  <Badge variant="secondary" className="text-xs">
                    {pickup.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Top Companies Card Component
function TopCompaniesCard({ companies }: { companies: DashboardAnalyticsResponse['topCompanies'] }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top Companies</CardTitle>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No company data</p>
        ) : (
          <div className="space-y-3">
            {companies.slice(0, 5).map((company, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{company.companyName}</p>
                  <p className="text-sm text-slate-500">{formatNumber(company.totalPickups)} pickups</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">{formatCurrency(company.totalRevenue)}</p>
                  <p className="text-sm text-slate-500">{formatCurrency(company.averageOrderValue)} avg</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Status Distribution Card Component
function StatusDistributionCard({ statusData }: { statusData: DashboardAnalyticsResponse['statusDistribution'] }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Pickup Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {statusData.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No status data</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusData.map((status, index) => (
              <div key={index} className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{formatNumber(status.count)}</p>
                <p className="text-sm font-medium text-slate-500">{status.statusName}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton Component
function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Secondary Metrics Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="border-slate-200 shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
