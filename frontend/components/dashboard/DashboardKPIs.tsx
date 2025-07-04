// Dashboard KPI Cards Component

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Package,
  Truck,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { useDashboardKPIs } from "@/lib/hooks/useDashboard";
import { formatCurrency, formatNumber, formatGrowth, getGrowthColor } from "@/lib/utils/formatters";
import { AnalyticsQueryParams } from "@/lib/types/api";

interface DashboardKPIsProps {
  dateRange?: AnalyticsQueryParams;
}

export function DashboardKPIs({ dateRange }: DashboardKPIsProps) {
  const { data: kpis, loading, error } = useDashboardKPIs(dateRange);

  if (loading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-slate-200 shadow-sm animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-16"></div>
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                </div>
                <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="mt-2 h-4 bg-slate-200 rounded w-12"></div>
            </CardContent>
          </Card>
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card className="col-span-full border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-red-600">Failed to load KPI data: {error}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!kpis) {
    return null;
  }

  const kpiCards = [
    {
      title: "Revenue",
      value: formatCurrency(kpis.pickups.totalRevenue),
      growth: kpis.trends.revenueGrowth,
      icon: DollarSign,
      color: "slate",
    },
    {
      title: "Pickups",
      value: formatNumber(kpis.pickups.totalPickups),
      growth: kpis.trends.pickupGrowth,
      icon: Package,
      color: "slate",
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(kpis.pickups.averageOrderValue),
      growth: 0, // Calculate this if needed
      icon: Activity,
      color: "slate",
    },
    {
      title: "Fleet Size",
      value: formatNumber(kpis.fleet.totalTrucks),
      growth: kpis.trends.fleetGrowth,
      icon: Truck,
      color: "slate",
    },
    {
      title: "Fleet Capacity",
      value: formatNumber(kpis.fleet.totalCapacity),
      growth: 0, // Calculate this if needed
      icon: Activity,
      color: "slate",
    },
    {
      title: "Companies",
      value: formatNumber(kpis.companies.totalCompanies),
      growth: 0, // Calculate this if needed
      icon: Users,
      color: "slate",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;
        const growthColor = getGrowthColor(kpi.growth);
        const GrowthIcon = kpi.growth >= 0 ? TrendingUp : TrendingDown;

        return (
          <Card key={index} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {kpi.title}
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    {kpi.value}
                  </p>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Icon className="h-4 w-4 text-slate-600" />
                </div>
              </div>
              {kpi.growth !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${growthColor}`}>
                  <GrowthIcon className="h-3 w-3" />
                  <span>{formatGrowth(kpi.growth)}</span>
                  <span className="text-slate-500">vs last period</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

// Additional KPI components for specific metrics

export function RevenueKPI({ dateRange }: DashboardKPIsProps) {
  const { data: kpis, loading, error } = useDashboardKPIs(dateRange);

  if (loading || error || !kpis) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(kpis.pickups.totalRevenue)}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {formatGrowth(kpis.trends.revenueGrowth)}
              </Badge>
              <span className="text-xs text-slate-500">vs last period</span>
            </div>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FleetKPI({ dateRange }: DashboardKPIsProps) {
  const { data: kpis, loading, error } = useDashboardKPIs(dateRange);

  if (loading || error || !kpis) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">Fleet Utilization</p>
            <p className="text-3xl font-bold text-slate-900">
              {kpis.fleet.utilizationRate.toFixed(1)}%
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {kpis.fleet.totalTrucks} trucks
              </Badge>
              <span className="text-xs text-slate-500">
                {formatCurrency(kpis.fleet.averageDailyCost)} avg cost
              </span>
            </div>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <Truck className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PickupsKPI({ dateRange }: DashboardKPIsProps) {
  const { data: kpis, loading, error } = useDashboardKPIs(dateRange);

  if (loading || error || !kpis) return null;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">Total Pickups</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatNumber(kpis.pickups.totalPickups)}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {kpis.pickups.pendingPickups} pending
              </Badge>
              <span className="text-xs text-slate-500">
                {formatCurrency(kpis.pickups.averageOrderValue)} avg value
              </span>
            </div>
          </div>
          <div className="p-3 bg-orange-100 rounded-lg">
            <Package className="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
