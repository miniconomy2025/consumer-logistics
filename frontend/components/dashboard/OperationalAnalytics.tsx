// Operational Analytics Component - Operational efficiency metrics

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Clock,
  Activity,
  MapPin,
  Target,
  BarChart3,
  TrendingUp,
  Users,
} from "lucide-react";
import { useOperationalAnalytics } from "@/lib/hooks/useDashboard";
import { formatCurrency, formatNumber } from "@/lib/utils/formatters";
import { AnalyticsQueryParams } from "@/lib/types/api";

interface OperationalAnalyticsProps {
  dateRange?: AnalyticsQueryParams;
}

export function OperationalAnalytics({ dateRange }: OperationalAnalyticsProps) {
  const { data: operational, loading, error } = useOperationalAnalytics(dateRange);

  if (loading) {
    return <OperationalAnalyticsSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load operational data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!operational) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Key Operational Metrics */}
      <OperationalKPIs operational={operational} />
      
      {/* Processing Time Analysis */}
      <ProcessingTimeChart data={operational.processingTimeByStatus} />
      
      {/* Daily Volume Trends */}
      <DailyVolumeChart data={operational.dailyVolume} />
      
      {/* Company Distribution */}
      <CompanyDistributionCharts data={operational.companyDistribution} />
      
      {/* Geographic Distribution */}
      <GeographicDistributionChart data={operational.geographicDistribution} />
      
      {/* Benchmarks */}
      <BenchmarksCard benchmarks={operational.benchmarks} />
    </div>
  );
}

// Operational KPIs Component
function OperationalKPIs({ operational }: { operational: any }) {
  const kpis = [
    {
      title: "Avg Processing Time",
      value: `${formatNumber(operational.averageProcessingTime, 1)} days`,
      icon: Clock,
      color: "blue",
    },
    {
      title: "Performance Rating",
      value: operational.benchmarks?.ourPerformanceRating || "N/A",
      icon: Target,
      color: "green",
    },
    {
      title: "Geographic Regions",
      value: formatNumber(operational.geographicDistribution?.length || 0),
      icon: MapPin,
      color: "purple",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        
        return (
          <Card key={index} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 bg-${kpi.color}-100 rounded-lg`}>
                  <Icon className={`h-6 w-6 text-${kpi.color}-600`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {kpi.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {kpi.value}
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

// Processing Time Chart Component
function ProcessingTimeChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Processing Time by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No processing time data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Processing Time by Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis 
                dataKey="statusName" 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
                label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: any) => [`${formatNumber(value, 1)} days`, 'Avg Time']}
                labelFormatter={(label) => `Status: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="averageTime" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Daily Volume Chart Component
function DailyVolumeChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Daily Volume Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No daily volume data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-600" />
          Daily Volume Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis 
                dataKey="date" 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="pickups"
                className="text-slate-600"
                tick={{ fontSize: 12 }}
                label={{ value: 'Pickups', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="revenue"
                orientation="right"
                className="text-slate-600"
                tick={{ fontSize: 12 }}
                label={{ value: 'Revenue', angle: 90, position: 'insideRight' }}
                tickFormatter={(value) => formatCurrency(value, 0)}
              />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                  name === 'revenue' ? 'Revenue' : 'Pickups'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Line
                yAxisId="pickups"
                type="monotone"
                dataKey="pickups"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Company Distribution Charts Component
function CompanyDistributionCharts({ data }: { data: any }) {
  if (!data || (!data.byRevenue && !data.byPickupCount)) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Company Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No company distribution data available</p>
        </CardContent>
      </Card>
    );
  }

  const revenueData = data.byRevenue?.slice(0, 5) || [];
  const pickupData = data.byPickupCount?.slice(0, 5) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Distribution */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Top Companies by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {revenueData.map((company: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{company.companyName}</p>
                  <p className="text-sm text-slate-500">{formatNumber(company.percentage, 1)}% of total</p>
                </div>
                <p className="font-semibold text-slate-900">{formatCurrency(company.revenue)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pickup Count Distribution */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Top Companies by Pickup Count</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pickupData.map((company: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{company.companyName}</p>
                  <p className="text-sm text-slate-500">{formatNumber(company.percentage, 1)}% of total</p>
                </div>
                <p className="font-semibold text-slate-900">{formatNumber(company.pickups)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Geographic Distribution Chart Component
function GeographicDistributionChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            Geographic Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No geographic data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-600" />
          Geographic Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((region: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">{region.region}</p>
                <p className="text-sm text-slate-500">{formatNumber(region.pickups)} pickups</p>
              </div>
              <p className="font-semibold text-slate-900">{formatCurrency(region.revenue)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Benchmarks Card Component
function BenchmarksCard({ benchmarks }: { benchmarks: any }) {
  if (!benchmarks) {
    return null;
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-orange-600" />
          Industry Benchmarks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(benchmarks.industryAverageOrderValue)}
            </p>
            <p className="text-sm font-medium text-slate-500">Industry Avg Order Value</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {formatNumber(benchmarks.industryAverageProcessingTime, 1)} days
            </p>
            <p className="text-sm font-medium text-slate-500">Industry Avg Processing Time</p>
          </div>
          <div className="text-center">
            <Badge 
              variant={benchmarks.ourPerformanceRating === 'good' ? 'default' : 'secondary'}
              className="text-lg px-4 py-2"
            >
              {benchmarks.ourPerformanceRating}
            </Badge>
            <p className="text-sm font-medium text-slate-500 mt-2">Our Performance Rating</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton Component
function OperationalAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPIs Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Charts Skeleton */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-slate-200 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
