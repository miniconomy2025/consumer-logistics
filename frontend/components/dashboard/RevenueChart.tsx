// Revenue Chart Component

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useRevenueTrends } from "@/lib/hooks/useDashboard";
import { formatCurrency } from "@/lib/utils/formatters";
import { chartColors } from "@/lib/utils/charts";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { AnalyticsQueryParams } from "@/lib/types/api";

interface RevenueChartProps {
  dateRange?: AnalyticsQueryParams;
  period?: 'daily' | 'weekly' | 'monthly';
  height?: number;
}

export function RevenueChart({
  dateRange,
  period = 'monthly'
}: RevenueChartProps) {
  const { data: trends, loading, error, refetch } = useRevenueTrends({
    dateFrom: dateRange?.dateFrom,
    dateTo: dateRange?.dateTo,
    period,
  });

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trends
          </CardTitle>
          <CardDescription>Revenue performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trends
          </CardTitle>
          <CardDescription>Revenue performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-sm text-red-600">Failed to load revenue data: {error}</p>
              <button
                onClick={() => refetch()}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ensure trends is an array before proceeding
  const trendsArray = Array.isArray(trends) ? trends : [];

  if (!trendsArray || trendsArray.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trends
          </CardTitle>
          <CardDescription>Revenue performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <TrendingUp className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-500">No revenue data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = trendsArray.map(trend => ({
    period: trend.period,
    revenue: trend.value, // TrendData uses 'value' property for revenue
    growth: trend.growth,
  }));

  // Calculate total revenue and average growth
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const averageGrowth = chartData.reduce((sum, item) => sum + item.growth, 0) / chartData.length;

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue Trends
        </CardTitle>
        <CardDescription>
          Revenue performance over time • {formatCurrency(totalRevenue)} total • {averageGrowth.toFixed(1)}% avg growth
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            revenue: {
              label: "Revenue",
              color: chartColors.primary,
            },
          }}
          className="h-64"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="period" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(value) => formatCurrency(value).replace('ZAR', 'R')}
              />
              <ChartTooltip
                content={(props: Record<string, unknown>) => {
                  const { active, payload, label } = props;
                  const payloadArray = payload as Array<{ payload: { revenue: number; growth: number } }>;
                  if (active && payloadArray && payloadArray.length) {
                    const data = payloadArray[0].payload;
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                        <p className="font-medium text-slate-900">{String(label)}</p>
                        <div className="space-y-1 mt-2">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-slate-600">Revenue:</span>
                            <span className="font-medium">{formatCurrency(data.revenue)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-slate-600">Growth:</span>
                            <span className={`font-medium ${data.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={chartColors.primary}
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: chartColors.primary, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function RevenueChartCompact({ 
  dateRange, 
  period = 'monthly',
  height = 200 
}: RevenueChartProps) {
  const { data: trends, loading, error } = useRevenueTrends({
    dateFrom: dateRange?.dateFrom,
    dateTo: dateRange?.dateTo,
    period,
  });

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className={`bg-slate-200 rounded`} style={{ height }}></div>
      </div>
    );
  }

  // Ensure trends is an array before proceeding
  const trendsArray = Array.isArray(trends) ? trends : [];

  if (error || !trendsArray || trendsArray.length === 0) {
    return (
      <div className="flex items-center justify-center border rounded-lg" style={{ height }}>
        <div className="text-center">
          <TrendingUp className="h-6 w-6 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">
            {error ? 'Failed to load' : 'No data available'}
          </p>
        </div>
      </div>
    );
  }

  const chartData = trendsArray.map(trend => ({
    period: trend.period,
    revenue: trend.value, // TrendData uses 'value' property for revenue
  }));

  return (
    <ChartContainer
      config={{
        revenue: {
          label: "Revenue",
          color: chartColors.primary,
        },
      }}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGradientCompact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={chartColors.primary}
            strokeWidth={2}
            fill="url(#revenueGradientCompact)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
