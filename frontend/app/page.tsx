"use client";

import { useState } from 'react';
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Activity,
  RefreshCw,
  BarChart3,
  AlertCircle,
} from "lucide-react";

// Import analytics components
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { KPIAnalytics } from "@/components/dashboard/KPIAnalytics";
import { ClientOnly } from "@/components/common/ClientOnly";

// Import hooks
import { useDashboardDateRange, useAnalyticsHealth, useDashboardAnalyticsWithRefresh, useKPIAnalyticsWithRefresh } from "@/lib/hooks/useAnalytics";
import { analyticsRangeOptions } from "@/lib/api/analytics";
import { AnalyticsDateRange } from "@/lib/types/analytics";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Date range management using predefined ranges
  const { range, setRange, analyticsParams } = useDashboardDateRange();

  // Analytics data with refresh capability
  const dashboardAnalytics = useDashboardAnalyticsWithRefresh(analyticsParams);
  const kpiAnalytics = useKPIAnalyticsWithRefresh(analyticsParams);

  // Health monitoring
  const { data: health, error: healthError } = useAnalyticsHealth();

  // Combined refresh function
  const handleRefresh = async () => {
    await Promise.all([
      dashboardAnalytics.refresh(),
      kpiAnalytics.refresh()
    ]);
  };

  const isRefreshing = dashboardAnalytics.isRefreshing || kpiAnalytics.isRefreshing;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Analytics Dashboard
            </h1>
            <p className="text-slate-600">Comprehensive business intelligence and insights</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Health Status */}
            {health && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-700">System Healthy</span>
              </div>
            )}
            
            {healthError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">System Issues</span>
              </div>
            )}
            
            {/* Date Range Selector */}
            <ClientOnly fallback={<div className="w-40 h-10 bg-slate-200 rounded animate-pulse"></div>}>
              <Select onValueChange={(value) => setRange(value as AnalyticsDateRange)} defaultValue={range}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {analyticsRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ClientOnly>
                  
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2">
            <TabsTrigger value="dashboard" className="flex-1 flex items-center justify-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="kpis" className="flex-1 flex items-center justify-center gap-2">
              <Activity className="h-4 w-4" />
              KPIs
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <ErrorBoundary>
              <AnalyticsDashboard
                dateRange={analyticsParams}
                data={dashboardAnalytics.data}
                loading={dashboardAnalytics.loading}
                error={dashboardAnalytics.error}
              />
            </ErrorBoundary>
          </TabsContent>

          {/* KPIs Tab */}
          <TabsContent value="kpis" className="space-y-6">
            <ErrorBoundary>
              <KPIAnalytics
                dateRange={analyticsParams}
                data={kpiAnalytics.data}
                loading={kpiAnalytics.loading}
                error={kpiAnalytics.error}
              />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
