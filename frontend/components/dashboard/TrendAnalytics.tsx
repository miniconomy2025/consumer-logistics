// Trend Analytics Component - Historical trends and patterns with charts

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import { useTrendAnalytics } from "@/lib/hooks/useDashboard";
import { formatCurrency, formatNumber } from "@/lib/utils/formatters";
import { AnalyticsQueryParams } from "@/lib/types/api";

interface TrendAnalyticsProps {
  dateRange?: AnalyticsQueryParams;
}

export function TrendAnalytics({ dateRange }: TrendAnalyticsProps) {
  const { data: trends, loading, error } = useTrendAnalytics(dateRange);

  if (loading) {
    return <TrendAnalyticsSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load trend data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!trends) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Revenue Trends */}
      <RevenueTrendChart data={trends.revenueByMonth} />
      
      {/* Company Trends */}
      <CompanyTrendsChart data={trends.companyTrends} />
      
      {/* Status Trends */}
      <StatusTrendsChart data={trends.statusTrends} />
      
      {/* Seasonal Patterns */}
      <SeasonalPatternsChart data={trends.seasonalPatterns} />
    </div>
  );
}

// Revenue Trend Chart Component
function RevenueTrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Revenue Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No revenue trend data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Revenue Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis 
                dataKey="month" 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, 0)}
              />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => `Month: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Company Trends Chart Component
function CompanyTrendsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Company Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No company trend data available</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart display - show top 5 companies
  const topCompanies = data.slice(0, 5);
  const chartData = topCompanies.map(company => ({
    companyName: company.companyName,
    totalRevenue: company.monthlyData?.reduce((sum: number, month: any) => sum + month.revenue, 0) || 0,
    totalPickups: company.monthlyData?.reduce((sum: number, month: any) => sum + month.pickups, 0) || 0,
  }));

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Top Company Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis 
                dataKey="companyName" 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, 0)}
              />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name === 'totalRevenue' ? formatCurrency(value) : formatNumber(value),
                  name === 'totalRevenue' ? 'Revenue' : 'Pickups'
                ]}
                labelFormatter={(label) => `Company: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Trends Chart Component
function StatusTrendsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-purple-600" />
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No status trend data available</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for pie chart
  const pieData = data.map((status, index) => ({
    name: status.statusName,
    value: status.monthlyData?.reduce((sum: number, month: any) => sum + month.count, 0) || 0,
    color: getStatusColor(index),
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-purple-600" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [formatNumber(value), 'Count']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Seasonal Patterns Chart Component
function SeasonalPatternsChart({ data }: { data: any }) {
  if (!data || (!data.quarterlyRevenue && !data.monthlyAverages)) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Seasonal Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-center py-8">No seasonal pattern data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.quarterlyRevenue || [];

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          Quarterly Revenue Patterns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis 
                dataKey="quarter" 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-slate-600"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, 0)}
              />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => `Quarter: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: '#6366f1', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to get status colors
function getStatusColor(index: number): string {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  return colors[index % colors.length];
}

// Loading Skeleton Component
function TrendAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
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
