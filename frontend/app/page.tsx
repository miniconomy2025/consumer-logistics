"use client";

import { useState } from 'react';
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  BarChart3,
  AlertCircle,
} from "lucide-react";

// Import analytics components
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { KPIAnalytics } from "@/components/dashboard/KPIAnalytics";
import { OrdersFeed } from "@/components/orders/OrdersFeed";

// Import hooks
import { useEffect } from 'react';
import { useAnalyticsHealth, useDashboardAnalyticsWithRefresh, useKPIAnalyticsWithRefresh } from "@/lib/hooks/useAnalytics";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Analytics data with refresh capability (all-time stats)
  const dashboardAnalytics = useDashboardAnalyticsWithRefresh();
  const kpiAnalytics = useKPIAnalyticsWithRefresh();

  // Health monitoring
  const { data: health, error: healthError } = useAnalyticsHealth();

  // Polling for smooth UX without manual refresh
  const POLL_INTERVAL_MS = 15000; // 15s realistic interval
  useEffect(() => {
    const id = setInterval(() => {
      // Background refetch to avoid skeleton flicker
      dashboardAnalytics.refetch(true);
      kpiAnalytics.refetch(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dashboardAnalytics.refetch, kpiAnalytics.refetch]);

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
            
            {/* Date range removed: always showing all-time stats */}
                  
            {/* Auto-refresh enabled (15s). Manual button removed for simplicity. */}
          </div>
        </header>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3">
            <TabsTrigger value="dashboard" className="flex-1 flex items-center justify-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="kpis" className="flex-1 flex items-center justify-center gap-2">
              <Activity className="h-4 w-4" />
              KPIs
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 flex items-center justify-center gap-2">
              <Activity className="h-4 w-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <ErrorBoundary>
              <AnalyticsDashboard
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
                data={kpiAnalytics.data}
                loading={kpiAnalytics.loading}
                error={kpiAnalytics.error}
              />
            </ErrorBoundary>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <ErrorBoundary>
              <OrdersFeed />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
