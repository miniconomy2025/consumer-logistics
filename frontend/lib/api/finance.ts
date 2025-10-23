import { api } from './client';

export interface AccountSummaryResponse {
  success: boolean;
  account_number: string;
  net_balance: number;
  notification_url: string;
}

export interface LoanStatusItem {
  loan_number: string;
  initial_amount: number;
  interest_rate: number;
  started_at: string; // timestamp string
  write_off: boolean;
  outstanding_amount: number;
}

export interface LoanStatusResponse {
  success: boolean;
  total_outstanding_amount: number;
  loans: LoanStatusItem[];
}

export async function getAccountSummary(): Promise<AccountSummaryResponse> {
  return api.get<AccountSummaryResponse>('/finance/account');
}

export async function getLoanStatus(): Promise<LoanStatusResponse> {
  return api.get<LoanStatusResponse>('/finance/loan');
}
