// Recent Pickups Component

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRecentPickups } from "@/lib/hooks/useDashboard";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/formatters";
import { Package, Clock, AlertTriangle } from "lucide-react";

interface RecentPickupsProps {
  limit?: number;
}

export function RecentPickups({ limit = 10 }: RecentPickupsProps) {
  const { data: pickups, loading, error, refetch } = useRecentPickups(limit);

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Pickups
          </CardTitle>
          <CardDescription>Latest pickup activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-200 rounded w-24"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
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
            <Package className="h-5 w-5" />
            Recent Pickups
          </CardTitle>
          <CardDescription>Latest pickup activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-sm text-red-600">Failed to load pickups: {error}</p>
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

  if (!pickups || pickups.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Pickups
          </CardTitle>
          <CardDescription>Latest pickup activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div className="space-y-2">
              <Package className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-500">No recent pickups found</p>
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
          <Package className="h-5 w-5" />
          Recent Pickups
        </CardTitle>
        <CardDescription>
          Latest {pickups.length} pickup activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pickup ID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pickups.map((pickup) => (
                <TableRow key={pickup.pickupId}>
                  <TableCell className="font-medium">
                    #{pickup.pickupId}
                  </TableCell>
                  <TableCell>
                    {pickup.company?.companyName || 'Unknown Company'}
                  </TableCell>
                  <TableCell>
                    {pickup.phoneUnits}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(pickup.totalValue)}
                  </TableCell>
                  <TableCell>
                    {formatDate(pickup.pickupDate)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(pickup.pickupStatus?.pickStatusName || 'Unknown')}
                    >
                      {pickup.pickupStatus?.pickStatusName || 'Unknown'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function RecentPickupsCompact({ limit = 5 }: RecentPickupsProps) {
  const { data: pickups, loading, error } = useRecentPickups(limit);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="h-3 bg-slate-200 rounded w-24"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !pickups || pickups.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-center border rounded-lg">
        <div className="space-y-2">
          <Package className="h-6 w-6 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-500">
            {error ? 'Failed to load' : 'No recent pickups'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pickups.map((pickup) => (
        <div key={pickup.pickupId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">#{pickup.pickupId}</span>
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusColor(pickup.pickupStatus?.pickStatusName || 'Unknown')}`}
              >
                {pickup.pickupStatus?.pickStatusName || 'Unknown'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {pickup.company?.companyName || 'Unknown Company'}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              {formatDate(pickup.pickupDate)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">
              {formatCurrency(pickup.totalValue)}
            </p>
            <p className="text-xs text-slate-500">
              {pickup.phoneUnits} units
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
