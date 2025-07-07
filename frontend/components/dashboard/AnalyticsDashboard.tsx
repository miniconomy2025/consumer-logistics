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
import { useDashboardAnalytics } from "@/lib/hooks/useDashboard";
import { formatCurrency, formatNumber, formatGrowth, getGrowthColor } from "@/lib/utils/formatters";
import { AnalyticsQueryParams, DashboardAnalyticsResponse, RecentPickupItem, TopCompanyItem, StatusDistributionItem } from "@/lib/types/api";

interface AnalyticsDashboardProps {
  dateRange?: AnalyticsQueryParams;
}

export function AnalyticsDashboard({ dateRange }: AnalyticsDashboardProps) {
  const { data: analytics, loading, error } = useDashboardAnalytics(dateRange);

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

// KPI Cards Component
function AnalyticsKPICards({ analytics }: { analytics: DashboardAnalyticsResponse }) {
  const kpiCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(analytics.totalRevenue),
      growth: analytics.revenueGrowth,
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Total Pickups",
      value: formatNumber(analytics.totalPickups),
      growth: analytics.pickupGrowth,
      icon: Package,
      color: "blue",
    },
    {
      title: "Average Order Value",
      value: formatCurrency(analytics.averageOrderValue),
      growth: 0, // Not provided by backend
      icon: Activity,
      color: "purple",
    },
    {
      title: "Total Companies",
      value: formatNumber(analytics.totalCompanies),
      growth: analytics.companyGrowth,
      icon: Users,
      color: "orange",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        const growthColor = getGrowthColor(kpi.growth);
        const GrowthIcon = kpi.growth >= 0 ? TrendingUp : TrendingDown;

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
                <div className={`p-3 bg-${kpi.color}-100 rounded-lg`}>
                  <Icon className={`h-6 w-6 text-${kpi.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Secondary Metrics Component
function AnalyticsSecondaryMetrics({ analytics }: { analytics: DashboardAnalyticsResponse }) {
  const secondaryMetrics = [
    {
      title: "Pending Pickups",
      value: formatNumber(analytics.pendingPickups),
      icon: Clock,
      color: "yellow",
    },
    {
      title: "Completed Pickups",
      value: formatNumber(analytics.completedPickups),
      icon: CheckCircle,
      color: "green",
    },
    {
      title: "Active Companies",
      value: formatNumber(analytics.activeCompanies),
      icon: Users,
      color: "blue",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {secondaryMetrics.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <Card key={index} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${metric.color}-100 rounded-lg`}>
                  <Icon className={`h-5 w-5 text-${metric.color}-600`} />
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
function RecentPickupsCard({ pickups }: { pickups: RecentPickupItem[] }) {
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
                    {pickup.statusName}
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
function TopCompaniesCard({ companies }: { companies: TopCompanyItem[] }) {
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
function StatusDistributionCard({ statusData }: { statusData: StatusDistributionItem[] }) {
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
