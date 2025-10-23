"use client";

import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecentOrders } from "@/lib/api/analytics";
import { getAccountSummary, getLoanStatus } from "@/lib/api/finance";
import { useApi } from "@/lib/hooks/useApi";
import { formatCurrency } from "@/lib/utils/formatters";
import { Activity } from "lucide-react";

function usePolling(refetch: (background?: boolean) => Promise<void>, intervalMs: number) {
  useEffect(() => {
    const id = setInterval(() => refetch(true), intervalMs);
    return () => clearInterval(id);
  }, [refetch, intervalMs]);
}

export function OrdersFeed() {
  const orders = useApi(() => getRecentOrders(200), []);
  const account = useApi(() => getAccountSummary(), []);
  const loan = useApi(() => getLoanStatus(), []);

  // Poll every 10s for orders, 30s for finance
  usePolling(orders.refetch, 10000);
  usePolling(account.refetch, 30000);
  usePolling(loan.refetch, 30000);

  const balance = useMemo(() => {
    return account.data?.net_balance ?? null;
  }, [account.data]);

  const outstanding = useMemo(() => {
    if (loan.data?.total_outstanding_amount != null) return loan.data.total_outstanding_amount;
    if (loan.data?.loans?.length) {
      return loan.data.loans.reduce((sum, l) => sum + (Number(l.outstanding_amount) || 0), 0);
    }
    return null;
  }, [loan.data]);

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-500">Bank Balance</div>
              {account.loading ? (
                <Skeleton className="h-6 w-32 mt-2" />
              ) : (
                <div className="text-xl font-semibold mt-1">
                  {balance !== null ? formatCurrency(Number(balance) || 0) : 'Not available'}
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-500">Outstanding Loan</div>
              {loan.loading ? (
                <Skeleton className="h-6 w-32 mt-2" />
              ) : (
                <div className="text-xl font-semibold mt-1">
                  {outstanding !== null ? formatCurrency(Number(outstanding) || 0) : 'Not available'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : orders.error ? (
            <div className="text-red-600">{orders.error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pr-4">Order ID</th>
                    <th className="py-2 pr-4">Company</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders.data?.items || []).map((o) => (
                    <tr key={o.pickupId} className="border-t border-slate-200">
                      <td className="py-2 pr-4">{o.pickupId}</td>
                      <td className="py-2 pr-4">{o.companyName}</td>
                      <td className="py-2 pr-4">{o.customer}</td>
                      <td className="py-2 pr-4">{formatCurrency(o.amount)}</td>
                      <td className="py-2 pr-4">{o.status}</td>
                      <td className="py-2 pr-4">{o.date ? new Date(o.date).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
