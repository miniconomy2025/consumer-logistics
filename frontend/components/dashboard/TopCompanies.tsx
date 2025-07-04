// Top Companies Component

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTopPerformers } from "@/lib/hooks/useDashboard";
import { formatCurrency, formatNumber, formatGrowth, getGrowthColor, formatDate } from "@/lib/utils/formatters";
import { Users, TrendingUp, TrendingDown, Crown, AlertTriangle } from "lucide-react";
import { AnalyticsQueryParams } from "@/lib/types/api";

interface TopCompaniesProps {
  limit?: number;
  dateRange?: AnalyticsQueryParams;
}

export function TopCompanies({ limit = 5, dateRange }: TopCompaniesProps) {
  const { data: companies, loading, error, refetch } = useTopPerformers({
    limit,
    dateFrom: dateRange?.dateFrom,
    dateTo: dateRange?.dateTo,
  });

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Performing Companies
          </CardTitle>
          <CardDescription>Companies ranked by revenue performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                    <div className="h-3 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-20"></div>
                  <div className="h-3 bg-slate-200 rounded w-16"></div>
                </div>
              </div>
            ))}
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
            <Users className="h-5 w-5" />
            Top Performing Companies
          </CardTitle>
          <CardDescription>Companies ranked by revenue performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-sm text-red-600">Failed to load companies: {error}</p>
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

  // Ensure companies is an array before proceeding
  const companiesArray = Array.isArray(companies) ? companies : [];

  if (!companiesArray || companiesArray.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Performing Companies
          </CardTitle>
          <CardDescription>Companies ranked by revenue performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <Users className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-500">No company data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Top Performing Companies
        </CardTitle>
        <CardDescription>
          Top {companiesArray.length} companies ranked by revenue performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {companiesArray.map((company, index) => {
            const isTopPerformer = index === 0;
            const GrowthIcon = company.revenueGrowth >= 0 ? TrendingUp : TrendingDown;
            const growthColor = getGrowthColor(company.revenueGrowth);

            return (
              <div
                key={company.companyId}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-slate-50 ${
                  isTopPerformer ? 'border-yellow-200 bg-yellow-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    isTopPerformer 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isTopPerformer ? <Crown className="h-4 w-4" /> : company.rank}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">
                        {company.companyName}
                      </h4>
                      {isTopPerformer && (
                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                          Top Performer
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{formatNumber(company.totalPickups)} pickups</span>
                      <span>•</span>
                      <span>{formatCurrency(company.averageOrderValue)} avg</span>
                      {company.lastPickupDate && (
                        <>
                          <span>•</span>
                          <span>Last: {formatDate(company.lastPickupDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(company.totalRevenue)}
                  </p>
                  <div className={`flex items-center gap-1 text-xs ${growthColor}`}>
                    <GrowthIcon className="h-3 w-3" />
                    <span>{formatGrowth(company.revenueGrowth)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function TopCompaniesCompact({ limit = 3, dateRange }: TopCompaniesProps) {
  const { data: companies, loading, error } = useTopPerformers({
    limit,
    dateFrom: dateRange?.dateFrom,
    dateTo: dateRange?.dateTo,
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  // Ensure companies is an array before proceeding
  const companiesArray = Array.isArray(companies) ? companies : [];

  if (error || !companiesArray || companiesArray.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-center border rounded-lg">
        <div className="space-y-2">
          <Users className="h-6 w-6 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-500">
            {error ? 'Failed to load' : 'No company data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {companiesArray.map((company, index) => {
        const isTopPerformer = index === 0;
        const GrowthIcon = company.revenueGrowth >= 0 ? TrendingUp : TrendingDown;
        const growthColor = getGrowthColor(company.revenueGrowth);

        return (
          <div
            key={company.companyId}
            className={`flex items-center justify-between p-3 border rounded-lg transition-colors hover:bg-slate-50 ${
              isTopPerformer ? 'border-yellow-200 bg-yellow-50' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                isTopPerformer 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {isTopPerformer ? <Crown className="h-3 w-3" /> : company.rank}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {company.companyName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatNumber(company.totalPickups)} pickups
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(company.totalRevenue)}
              </p>
              <div className={`flex items-center gap-1 text-xs ${growthColor}`}>
                <GrowthIcon className="h-3 w-3" />
                <span>{formatGrowth(company.revenueGrowth)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
